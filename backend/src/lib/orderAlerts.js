const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('../config/db');
const { isValidEmail, normalizeEmail } = require('./validation');
const { sendMessage } = require('./mail');
const { adminOrderContent } = require('./orderMessages');
const settingsPath = () => path.join(process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(__dirname, '../../data'), 'order-alerts.json');

function sanitizeAlertSettings(value) {
  const email = normalizeEmail(value.email);
  if (value.enabled !== false && (!isValidEmail(email) || email.length > 150 || /[\r\n]/.test(email))) {
    const error = new Error('Ingresa un correo válido para recibir los avisos.'); error.code = 'INVALID_ALERT_SETTINGS'; throw error;
  }
  return { enabled: value.enabled !== false, email,
    paid: value.paid !== false, payment_submitted: value.payment_submitted !== false, pending_payment: value.pending_payment === true };
}

function readAlertSettings() {
  const fallback = { enabled: Boolean(process.env.ORDER_NOTIFICATION_EMAIL), email: process.env.ORDER_NOTIFICATION_EMAIL || '', paid: true, payment_submitted: true, pending_payment: false };
  try { return sanitizeAlertSettings(JSON.parse(fs.readFileSync(settingsPath(), 'utf8'))); }
  catch { return fallback; }
}

function writeAlertSettings(value) {
  const settings = sanitizeAlertSettings(value), file = settingsPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify(settings, null, 2), { mode: 0o600 });
  fs.renameSync(file + '.tmp', file);
  return settings;
}

async function ensureAlertSchema(pool) {
  await pool.request().batch(`IF OBJECT_ID('dbo.order_admin_mail_events', 'U') IS NULL CREATE TABLE order_admin_mail_events (
    id INT IDENTITY PRIMARY KEY, pedido_id INT NOT NULL REFERENCES pedidos(id), estado NVARCHAR(40) NOT NULL,
    enviado BIT NOT NULL DEFAULT 0, intentos INT NOT NULL DEFAULT 0, ultimo_error NVARCHAR(250) NULL,
    actualizado_en DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UX_order_admin_mail_event UNIQUE (pedido_id, estado)
  );`);
}

async function sendAdminOrderAlert({ pedidoId, estado }) {
  const settings = readAlertSettings();
  if (!settings.enabled || !isValidEmail(settings.email) || (estado !== 'manual_review' && !settings[estado])) return false;
  const pool = await getPool();
  const order = (await pool.request().input('id', sql.Int, pedidoId).input('manual', sql.Bit, estado === 'manual_review')
    .query('SELECT * FROM pedidos WHERE id=@id AND (eliminado_en IS NULL OR @manual=1)')).recordset[0];
  if (!order) return false;
  if (estado !== 'manual_review' && order.estado !== estado) return false;
  if (estado === 'manual_review') {
    const review = (await pool.request().input('id', sql.Int, pedidoId).query('SELECT requiere_revision FROM flow_payments WHERE pedido_id=@id')).recordset[0];
    if (!review?.requiere_revision) return false;
  }
  await pool.request().input('id', sql.Int, pedidoId).input('state', sql.NVarChar, estado).query(`
    SET XACT_ABORT ON; BEGIN TRANSACTION;
    IF NOT EXISTS(SELECT 1 FROM order_admin_mail_events WITH (UPDLOCK,HOLDLOCK) WHERE pedido_id=@id AND estado=@state)
      INSERT INTO order_admin_mail_events(pedido_id,estado) VALUES(@id,@state);
    COMMIT TRANSACTION;
  `);
  const claimed = (await pool.request().input('id', sql.Int, pedidoId).input('state', sql.NVarChar, estado).query(`
    UPDATE order_admin_mail_events SET intentos=intentos+1, actualizado_en=SYSUTCDATETIME()
    OUTPUT INSERTED.id WHERE pedido_id=@id AND estado=@state AND enviado=0 AND intentos<5
      AND (intentos=0 OR actualizado_en<DATEADD(MINUTE,-5,SYSUTCDATETIME()));
  `)).recordset[0];
  if (!claimed) return false;
  let sent = false, failure = null;
  try {
    const items = (await pool.request().input('id', sql.Int, pedidoId).query('SELECT nombre,cantidad,tono_seleccionado FROM pedido_items WHERE pedido_id=@id')).recordset;
    sent = await sendMessage({ to: settings.email, ...adminOrderContent(order, estado, items) });
    if (!sent) failure = 'SMTP no configurado o destinatario rechazado';
  } catch (error) { failure = String(error.code || 'SMTP_ERROR').slice(0, 100); }
  await pool.request().input('id', sql.Int, claimed.id).input('sent', sql.Bit, sent).input('error', sql.NVarChar, failure)
    .query('UPDATE order_admin_mail_events SET enviado=@sent,ultimo_error=@error WHERE id=@id');
  return sent;
}

async function retryAdminOrderAlerts(pool) {
  const events = (await pool.request().query(`SELECT TOP 5 e.pedido_id,e.estado FROM order_admin_mail_events e
    JOIN pedidos p ON p.id=e.pedido_id WHERE e.enviado=0 AND e.intentos<5 AND (p.eliminado_en IS NULL OR e.estado='manual_review')
    AND e.actualizado_en<DATEADD(MINUTE,-5,SYSUTCDATETIME())
    AND (p.estado=e.estado OR e.estado='manual_review') ORDER BY e.id`)).recordset;
  for (const event of events) await sendAdminOrderAlert({ pedidoId: event.pedido_id, estado: event.estado });
}

module.exports = { sanitizeAlertSettings, readAlertSettings, writeAlertSettings, ensureAlertSchema, sendAdminOrderAlert, retryAdminOrderAlerts };
