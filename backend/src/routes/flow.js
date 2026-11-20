const router = require('express').Router();
const { getPool, sql } = require('../config/db');
const { requireOrderAccess } = require('../lib/checkoutAccess');
const { flowConfig, flowRequest, validatePayment } = require('../lib/flow');
const { storeBaseUrl } = require('../lib/publicUrl');

async function ensureFlowSchema(pool) {
  await pool.request().batch(`
    IF OBJECT_ID('dbo.flow_payments', 'U') IS NULL CREATE TABLE flow_payments (
      pedido_id INT PRIMARY KEY REFERENCES pedidos(id), token NVARCHAR(150) NULL,
      redirect_url NVARCHAR(500) NULL, status INT NOT NULL DEFAULT 1,
      actualizado_en DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    IF COL_LENGTH('flow_payments', 'requiere_revision') IS NULL
      ALTER TABLE flow_payments ADD requiere_revision BIT NOT NULL DEFAULT 0;
    IF OBJECT_ID('dbo.flow_payment_attempts', 'U') IS NULL CREATE TABLE flow_payment_attempts (
      token NVARCHAR(150) PRIMARY KEY, pedido_id INT NOT NULL REFERENCES pedidos(id),
      status INT NOT NULL, actualizado_en DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    INSERT INTO flow_payment_attempts(token,pedido_id,status)
      SELECT f.token,f.pedido_id,f.status FROM flow_payments f
      WHERE f.token IS NOT NULL AND NOT EXISTS(SELECT 1 FROM flow_payment_attempts a WHERE a.token=f.token);
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
    const existing = (await pool.request().input('id', sql.Int, order.id).query('SELECT token, redirect_url, status, requiere_revision FROM flow_payments WHERE pedido_id=@id')).recordset[0];
    if (existing?.requiere_revision) return res.status(409).json({ error: 'Este pago requiere revisión de Bloomskin. No realices otro pago.' });
    let verifiedPrevious;
    if (existing?.token && existing.redirect_url && Number(existing.status) === 1) {
      // A shopper may return before Flow's notification arrives, or close that page entirely.
      verifiedPrevious = await flowRequest('payment/getStatus', { token: existing.token });
      if (!validatePayment(verifiedPrevious, order)) throw new Error('El pago anterior no coincide con el pedido.');
      if (Number(verifiedPrevious.status) === 2) {
        await confirmPayment(existing.token);
        return res.status(409).json({ error: 'El pago ya fue confirmado. Actualiza el estado del pedido; no vuelvas a pagar.' });
      }
      if ([3,4].includes(Number(verifiedPrevious.status))) {
        await pool.request().input('id',sql.Int,order.id).input('token',sql.NVarChar,existing.token).input('status',sql.Int,Number(verifiedPrevious.status))
          .query('UPDATE flow_payments SET status=@status WHERE pedido_id=@id AND token=@token AND status=1');
        existing.status = Number(verifiedPrevious.status);
      }
    }
    const retry = existing?.token && [3,4].includes(Number(existing.status));
    if (existing?.redirect_url && !retry) return res.json({ url: existing.redirect_url });
    if (retry) {
      const previous = verifiedPrevious || await flowRequest('payment/getStatus', { token: existing.token });
      if (!validatePayment(previous, order) || ![3,4].includes(Number(previous.status))) return res.status(409).json({ error: 'El intento anterior requiere revisión. No realices otro pago.' });
      // Claim the next attempt atomically; older tokens remain in the attempt ledger.
      const claimed = await pool.request().input('id',sql.Int,order.id).input('token',sql.NVarChar,existing.token)
        .query('UPDATE flow_payments SET token=NULL,redirect_url=NULL,status=1 WHERE pedido_id=@id AND token=@token AND status IN (3,4)');
      if (!claimed.rowsAffected[0]) return res.status(409).json({ error: 'Ya estamos preparando un intento de pago. Espera un momento.' });
    } else {
      if (existing) return res.status(409).json({ error: 'El pago se está preparando o requiere revisión. No realices un segundo pago; contacta a Bloomskin.' });
      await pool.request().input('id', sql.Int, order.id).query('INSERT INTO flow_payments (pedido_id) VALUES (@id)');
    }
    const base = storeBaseUrl();
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
      .input('url', sql.NVarChar, redirect.toString()).query(`
        SET XACT_ABORT ON; BEGIN TRANSACTION;
        UPDATE flow_payments SET token=@token, redirect_url=@url WHERE pedido_id=@id;
        INSERT INTO flow_payment_attempts(token,pedido_id,status) VALUES(@token,@id,1);
        COMMIT TRANSACTION;
      `);
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
  const order = (await pool.request().input('id', sql.Int, Number(match[1])).input('token',sql.NVarChar,token).query(`
    SELECT p.id, p.total_clp, p.estado, f.token FROM pedidos p
    JOIN flow_payments f ON f.pedido_id=p.id
    JOIN flow_payment_attempts a ON a.pedido_id=p.id AND a.token=@token
    WHERE p.id=@id AND p.metodo_pago='flow'
  `)).recordset[0];
  if (!order || !validatePayment(status, order)) throw new Error('El pago no coincide con el pedido.');
  const result = await pool.request().input('id', sql.Int, order.id).input('status', sql.Int, Number(status.status))
    .input('token', sql.NVarChar, token).query(`
      SET XACT_ABORT ON; BEGIN TRANSACTION;
      UPDATE flow_payment_attempts SET status=CASE WHEN status=2 THEN 2 ELSE @status END,
        actualizado_en=SYSUTCDATETIME() WHERE token=@token AND pedido_id=@id;
      UPDATE flow_payments SET status=CASE WHEN status=2 THEN 2 ELSE @status END,
        actualizado_en=SYSUTCDATETIME() WHERE pedido_id=@id AND token=@token;
      UPDATE pedidos SET estado='paid', comprobante_limite_en=NULL, actualizado_en=GETDATE()
      OUTPUT INSERTED.id, INSERTED.cliente_nombre, INSERTED.cliente_email, INSERTED.total_clp
      WHERE id=@id AND @status=2 AND estado='pending_payment' AND stock_comprometido=1 AND eliminado_en IS NULL
        AND EXISTS(SELECT 1 FROM flow_payments WHERE pedido_id=@id AND token=@token);
      UPDATE flow_payments SET requiere_revision=1 WHERE pedido_id=@id AND @status=2
        AND (token IS NULL OR token<>@token OR EXISTS(SELECT 1 FROM pedidos WHERE id=@id AND (estado='cancelled' OR stock_comprometido=0 OR eliminado_en IS NOT NULL)));
      COMMIT TRANSACTION;
    `);
  if (Number(status.status) === 2) {
    // Retried callbacks can recover mail registration after the payment commit.
    await require('../lib/orderMail').sendOrderMail({ pedidoId: order.id, estado: 'paid' });
    await require('../lib/orderAlerts').sendAdminOrderAlert({ pedidoId: order.id, estado: 'manual_review' });
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

async function reconcilePendingPayments(pool) {
  if (!flowConfig().ready || (flowConfig().sandbox && process.env.NODE_ENV === 'production')) return;
  const rows = (await pool.request().query(`SELECT TOP 5 f.token FROM flow_payments f JOIN pedidos p ON p.id=f.pedido_id
    WHERE f.token IS NOT NULL AND f.status=1 AND f.requiere_revision=0 AND p.metodo_pago='flow'
      AND (p.estado='pending_payment' OR (p.estado='cancelled' AND p.actualizado_en>=DATEADD(DAY,-1,GETDATE())))
    ORDER BY f.actualizado_en`)).recordset;
  for (const row of rows) {
    try { await confirmPayment(row.token); }
    catch (error) { console.error('No se pudo conciliar un pago Flow:', error.code || error.name); }
  }
}

router.ensureFlowSchema = ensureFlowSchema;
router.reconcilePendingPayments = reconcilePendingPayments;
module.exports = router;
