const router = require('express').Router();
const { getPool, sql } = require('../config/db');
const { requireOrderAccess } = require('../lib/checkoutAccess');
const { flowConfig, flowRequest, validatePayment } = require('../lib/flow');

async function ensureFlowSchema(pool) {
  await pool.request().batch(`
    IF OBJECT_ID('dbo.flow_payments', 'U') IS NULL CREATE TABLE flow_payments (
      pedido_id INT PRIMARY KEY REFERENCES pedidos(id), token NVARCHAR(150) NULL,
      redirect_url NVARCHAR(500) NULL, status INT NOT NULL DEFAULT 1,
      actualizado_en DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    IF COL_LENGTH('flow_payments', 'requiere_revision') IS NULL
      ALTER TABLE flow_payments ADD requiere_revision BIT NOT NULL DEFAULT 0;
  `);
}

router.get('/config', (_req, res) => res.json({ enabled: flowConfig().ready && (!flowConfig().sandbox || process.env.NODE_ENV !== 'production'), sandbox: flowConfig().sandbox }));

router.post('/:id/create', requireOrderAccess, async (req, res) => {
  if (!flowConfig().ready || (flowConfig().sandbox && process.env.NODE_ENV === 'production')) return res.status(503).json({ error: 'Flow no está habilitado. Puedes elegir transferencia.' });
  try {
    const pool = await getPool();
    const order = (await pool.request().input('id', sql.Int, Number(req.params.id)).query(`
      SELECT id, cliente_id, cliente_email, total_clp, estado, metodo_pago, comprobante_limite_en
      FROM pedidos WHERE id=@id AND eliminado_en IS NULL
    `)).recordset[0];
    if (!order || (!req.orderAccess && req.user.id !== order.cliente_id)) return res.status(404).json({ error: 'Pedido no encontrado.' });
    if (order.estado !== 'pending_payment' || order.metodo_pago !== 'flow' || new Date(order.comprobante_limite_en).getTime() <= Date.now()) return res.status(409).json({ error: 'Este pedido ya no está disponible para pagar con Flow.' });
    const existing = (await pool.request().input('id', sql.Int, order.id).query('SELECT token, redirect_url FROM flow_payments WHERE pedido_id=@id')).recordset[0];
    if (existing?.redirect_url) return res.json({ url: existing.redirect_url });
    if (existing) return res.status(409).json({ error: 'El pago se está preparando o requiere revisión. No realices un segundo pago; contacta a Bloomskin.' });
    // A unique row prevents concurrent clicks from creating multiple payment requests.
    await pool.request().input('id', sql.Int, order.id).query('INSERT INTO flow_payments (pedido_id) VALUES (@id)');
    const base = String(process.env.STORE_BASE_URL || 'https://bloomskin.cl').replace(/\/$/, '');
    const payment = await flowRequest('payment/create', {
      commerceOrder: `BS-${String(order.id).padStart(4, '0')}`, subject: `Pedido Bloomskin BS-${String(order.id).padStart(4, '0')}`,
      currency: 'CLP', amount: order.total_clp, email: order.cliente_email, paymentMethod: 9,
      urlConfirmation: `${base}/api/flow/confirm`, urlReturn: `${base}/api/flow/return`,
      timeout: Math.max(1, Math.floor((new Date(order.comprobante_limite_en).getTime() - Date.now()) / 1000) - 60),
    }, true);
    const redirect = new URL(payment.url);
    if (redirect.protocol !== 'https:' || !(redirect.hostname === 'flow.cl' || redirect.hostname.endsWith('.flow.cl'))) throw new Error('Respuesta de pago no válida.');
    redirect.searchParams.set('token', payment.token);
    await pool.request().input('id', sql.Int, order.id).input('token', sql.NVarChar, payment.token)
      .input('url', sql.NVarChar, redirect.toString()).query('UPDATE flow_payments SET token=@token, redirect_url=@url WHERE pedido_id=@id');
    res.json({ url: redirect.toString() });
  } catch (error) {
    console.error('Flow create:', error.code || error.name);
    res.status(503).json({ error: 'No pudimos preparar Flow. Contacta a Bloomskin antes de reintentar.' });
  }
});

async function confirmPayment(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{10,150}$/.test(token)) throw new Error('Token inválido.');
  const status = await flowRequest('payment/getStatus', { token });
  const match = /^BS-(\d+)$/.exec(String(status.commerceOrder));
  if (!match) throw new Error('Referencia de pago inválida.');
  const pool = await getPool();
  const order = (await pool.request().input('id', sql.Int, Number(match[1])).query(`
    SELECT p.id, p.total_clp, p.estado, f.token FROM pedidos p
    JOIN flow_payments f ON f.pedido_id=p.id WHERE p.id=@id AND p.metodo_pago='flow'
  `)).recordset[0];
  if (!order || !validatePayment(status, order) || (order.token && order.token !== token)) throw new Error('El pago no coincide con el pedido.');
  const result = await pool.request().input('id', sql.Int, order.id).input('status', sql.Int, Number(status.status))
    .input('token', sql.NVarChar, token).query(`
      BEGIN TRANSACTION;
      UPDATE flow_payments SET status=CASE WHEN status=2 THEN 2 ELSE @status END,
        token=@token, actualizado_en=SYSUTCDATETIME() WHERE pedido_id=@id;
      UPDATE pedidos SET estado='paid', comprobante_limite_en=NULL, actualizado_en=GETDATE()
      OUTPUT INSERTED.id, INSERTED.cliente_nombre, INSERTED.cliente_email, INSERTED.total_clp
      WHERE id=@id AND @status=2 AND estado='pending_payment' AND stock_comprometido=1 AND eliminado_en IS NULL;
      UPDATE flow_payments SET requiere_revision=1 WHERE pedido_id=@id AND @status=2
        AND EXISTS(SELECT 1 FROM pedidos WHERE id=@id AND (estado='cancelled' OR stock_comprometido=0 OR eliminado_en IS NOT NULL));
      COMMIT TRANSACTION;
    `);
  if (result.recordset?.[0]) {
    const p = result.recordset[0];
    await require('../lib/orderMail').sendOrderMail({ pedidoId: p.id, clienteNombre: p.cliente_nombre, clienteEmail: p.cliente_email, estado: 'paid', totalClp: p.total_clp });
  }
  return order.id;
}

router.post('/confirm', async (req, res) => {
  try { await confirmPayment(req.body?.token); res.json({ ok: true }); }
  catch { res.status(503).json({ error: 'No pudimos confirmar el pago. Flow puede volver a notificar.' }); }
});

router.post('/return', async (req, res) => {
  try {
    const id = await confirmPayment(req.body?.token);
    const { orderAccessUrl } = require('../lib/checkoutAccess');
    res.redirect(303, orderAccessUrl(id));
  } catch { res.redirect(303, '/pedido/estado'); }
});

router.ensureFlowSchema = ensureFlowSchema;
module.exports = router;
