const { sendMessage } = require('./mail');
const { orderAccessUrl } = require('./checkoutAccess');
const { getPool, sql } = require('../config/db');

const copy = {
  pending_payment: ['Recibimos tu pedido', 'Tu pedido está reservado por una hora. Si elegiste transferencia, transfiere el total exacto y sube el comprobante desde el enlace de este correo. Si elegiste Flow, continúa el pago online desde tu pedido.'],
  payment_submitted: ['Recibimos tu comprobante', 'Estamos revisando tu transferencia. Aún no es una confirmación del pago; te avisaremos cuando esté validado.'],
  paid: ['Tu pago está confirmado', 'Recibimos tu pago y comenzaremos a preparar tu pedido. No necesitas volver a pagar.'],
  shipped: ['Tu pedido está en camino', 'Tu pedido fue despachado. Puedes revisar su estado desde el enlace seguro.'],
  pickup_ready: ['Tu pedido está listo para retirar', 'Ya puedes coordinar el retiro de tu pedido en Oficina Lina 210, Antofagasta.'],
  delivered: ['Gracias por comprar en Bloomskin', 'Tu pedido fue marcado como entregado. Esperamos que lo disfrutes. Si compraste con tu cuenta, puedes compartir tu experiencia desde Mis pedidos.'],
  cancelled: ['Tu pedido fue cancelado', 'La reserva de stock fue liberada. Si alcanzaste a pagar, no vuelvas a hacerlo: responde este correo para que podamos revisar tu caso.'],
};

async function ensureMailSchema(pool) {
  await pool.request().batch(`IF OBJECT_ID('dbo.order_mail_events', 'U') IS NULL CREATE TABLE order_mail_events (
    id INT IDENTITY PRIMARY KEY, pedido_id INT NOT NULL, estado NVARCHAR(40) NOT NULL,
    enviado BIT NOT NULL DEFAULT 0, intentos INT NOT NULL DEFAULT 0, ultimo_error NVARCHAR(250) NULL,
    actualizado_en DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UX_order_mail_event UNIQUE (pedido_id, estado)
  );`);
}

async function sendOrderMail({ pedidoId, clienteNombre, clienteEmail, estado, totalClp, pickup = false }) {
  const pool = await getPool();
  if (estado === 'shipped') {
    const order = (await pool.request().input('id', sql.Int, pedidoId).query('SELECT metodo_envio FROM pedidos WHERE id=@id')).recordset[0];
    pickup = order?.metodo_envio === 'store_pickup';
  }
  const key = estado === 'shipped' && pickup ? 'pickup_ready' : estado;
  if (!copy[key] || !clienteEmail || clienteEmail.endsWith('.local') || clienteEmail.endsWith('.invalid')) return false;
  await pool.request().input('id', sql.Int, pedidoId).input('state', sql.NVarChar, key).query(`
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;
    IF NOT EXISTS(SELECT 1 FROM order_mail_events WITH (UPDLOCK,HOLDLOCK) WHERE pedido_id=@id AND estado=@state)
      INSERT INTO order_mail_events(pedido_id,estado) VALUES (@id,@state);
    COMMIT TRANSACTION;
  `);
  const claimed = await pool.request().input('id', sql.Int, pedidoId).input('state', sql.NVarChar, key).query(`
    UPDATE order_mail_events SET intentos=intentos+1, actualizado_en=SYSUTCDATETIME()
    OUTPUT INSERTED.id WHERE pedido_id=@id AND estado=@state AND enviado=0 AND intentos<5
      AND (intentos=0 OR actualizado_en<DATEADD(MINUTE,-5,SYSUTCDATETIME()));
  `);
  const event = claimed.recordset[0];
  if (!event) return false;
  try {
    const sent = await sendMessage({ to: clienteEmail, subject: `${copy[key][0]} · BS-${String(pedidoId).padStart(4, '0')}`,
      name: clienteNombre, title: copy[key][0], paragraphs: [copy[key][1]],
      details: [['Pedido', `BS-${String(pedidoId).padStart(4, '0')}`], ['Total', '$' + Number(totalClp).toLocaleString('es-CL')]],
      actionUrl: orderAccessUrl(pedidoId), actionLabel: 'Ver mi pedido',
    });
    await pool.request().input('id', sql.Int, event.id).input('sent', sql.Bit, sent)
      .query('UPDATE order_mail_events SET enviado=@sent, ultimo_error=CASE WHEN @sent=1 THEN NULL ELSE N\'SMTP no configurado o destinatario rechazado\' END WHERE id=@id');
    return sent;
  } catch (error) {
    await pool.request().input('id', sql.Int, event.id).input('error', sql.NVarChar, String(error.code || 'SMTP_ERROR').slice(0, 100))
      .query('UPDATE order_mail_events SET ultimo_error=@error WHERE id=@id');
    return false;
  }
}

async function retryOrderMail(pool) {
  const rows = (await pool.request().query(`SELECT TOP 5 p.id, p.cliente_nombre, p.cliente_email, p.total_clp, e.estado
    FROM order_mail_events e JOIN pedidos p ON p.id=e.pedido_id
    WHERE e.enviado=0 AND e.intentos<5 AND e.actualizado_en<DATEADD(MINUTE,-5,SYSUTCDATETIME())
      AND (p.estado=e.estado OR (e.estado='pickup_ready' AND p.estado='shipped')) ORDER BY e.id`)).recordset;
  for (const p of rows) await sendOrderMail({ pedidoId: p.id, clienteNombre: p.cliente_nombre, clienteEmail: p.cliente_email, totalClp: p.total_clp, estado: p.estado });
}

module.exports = { sendOrderMail, ensureMailSchema, retryOrderMail };
