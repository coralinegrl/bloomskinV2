const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');
const { requireClientAuth } = require('../middleware/auth');
const { validateCustomerPayload } = require('./validation');
const { storeBaseUrl } = require('./publicUrl');

async function ensureCheckoutSchema(pool) {
  await pool.request().batch(`
    IF COL_LENGTH('clientes', 'es_invitado') IS NULL
      ALTER TABLE clientes ADD es_invitado BIT NOT NULL CONSTRAINT DF_clientes_es_invitado DEFAULT 0;
    IF COL_LENGTH('clientes', 'invitado_email') IS NULL
      ALTER TABLE clientes ADD invitado_email NVARCHAR(150) NULL;
  `);
}

function readAccess(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
  try { return jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
}

async function requireCheckoutAuth(req, res, next) {
  const access = readAccess(req);
  if (access?.tipo !== 'checkout_guest') return requireClientAuth(req, res, next);
  try {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, access.id)
      .query('SELECT id, activo, es_invitado FROM clientes WHERE id = @id');
    if (!result.recordset[0]?.activo || !result.recordset[0]?.es_invitado) return res.status(401).json({ error: 'La sesión de compra venció. Revisa tus datos para continuar.' });
    req.user = access;
    next();
  } catch { res.status(503).json({ error: 'No pudimos validar la compra. Intenta nuevamente.' }); }
}

function orderAccessToken(pedidoId) {
  return jwt.sign({ tipo: 'order_access', pedido_id: Number(pedidoId) }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function orderAccessUrl(pedidoId) {
  const base = storeBaseUrl();
  return `${base}/pedido/${pedidoId}#access=${encodeURIComponent(orderAccessToken(pedidoId))}`;
}

function requireOrderAccess(req, res, next) {
  const access = readAccess(req);
  if (access?.tipo === 'order_access' && access.pedido_id === Number(req.params.id)) {
    req.orderAccess = access;
    return next();
  }
  return requireCheckoutAuth(req, res, next);
}

async function createGuestSession(req, res) {
  const { errors, sanitized } = validateCustomerPayload(req.body, { requirePassword: false, requireAddress: false });
  if (errors.length) return res.status(400).json({ error: errors[0], errors });
  if (sanitized.nombre.length > 150 || sanitized.email.length > 150 || sanitized.telefono.length > 20) return res.status(400).json({ error: 'Revisa el largo del nombre, correo y teléfono.' });
  try {
    const pool = await getPool();
    const access = readAccess(req);
    const request = pool.request()
      .input('nombre', sql.NVarChar, sanitized.nombre).input('contact_email', sql.NVarChar, sanitized.email)
      .input('rut', sql.NVarChar, sanitized.rut).input('telefono', sql.NVarChar, sanitized.telefono);
    let result;
    if (access?.tipo === 'checkout_guest') {
      result = await request.input('id', sql.Int, access.id).query(`
        UPDATE clientes SET nombre=@nombre, invitado_email=@contact_email, rut=@rut, telefono=@telefono
        OUTPUT INSERTED.id WHERE id=@id AND es_invitado=1 AND activo=1
      `);
    } else {
      result = await request.input('internal_email', sql.NVarChar, `${crypto.randomUUID()}@checkout.bloomskin.invalid`).query(`
        INSERT INTO clientes (nombre, email, invitado_email, rut, telefono, es_invitado, activo)
        OUTPUT INSERTED.id VALUES (@nombre, @internal_email, @contact_email, @rut, @telefono, 1, 1)
      `);
    }
    const id = result.recordset[0]?.id;
    if (!id) return res.status(401).json({ error: 'La sesión de compra ya no está activa.' });
    const token = access?.tipo === 'checkout_guest' ? req.headers.authorization.slice(7)
      : jwt.sign({ tipo: 'checkout_guest', id }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token });
  } catch (error) {
    console.error('No se pudo preparar compra invitada:', error.message);
    res.status(503).json({ error: 'No pudimos preparar tu compra. Intenta nuevamente.' });
  }
}

module.exports = { ensureCheckoutSchema, requireCheckoutAuth, requireOrderAccess, readAccess, orderAccessToken, orderAccessUrl, createGuestSession };
