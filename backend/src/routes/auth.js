const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');
const { requireAdminAuth, requireClientAuth } = require('../middleware/auth');
const { normalizeEmail, isValidEmail, validateCustomerPayload, validatePassword } = require('../lib/validation');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

function createMailer() { return require('../lib/mail').createMailer(); }

function getStoreBaseUrl() { return require('../lib/mail').storeBaseUrl(); }

async function sendWelcomeEmail(_req, cliente) {
  return require('../lib/mail').sendMessage({ to: cliente.email, subject: 'Bienvenida a Bloomskin',
    title: 'Tu cuenta Bloomskin ya está lista', name: cliente.nombre,
    paragraphs: ['Gracias por ser parte de Bloomskin. Ya puedes guardar favoritos, consultar tus pedidos y volver a comprar con tus datos guardados.'],
    actionLabel: 'Ir a mi cuenta', actionUrl: require('../lib/mail').storeBaseUrl() + '/mi-cuenta',
  });
}

router.post('/admin/login', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contrasena requeridos' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Ingresa un email valido' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM usuarios WHERE email = @email AND activo = 1');

    const user = result.recordset[0];
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });
    if (!user.password_hash || typeof user.password_hash !== 'string') {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = signToken({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      tipo: 'admin',
    });

    res.json({
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, tipo: 'admin' },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/admin/me', requireAdminAuth, (req, res) => {
  res.json({ user: req.user });
});

router.post('/client/register', async (req, res) => {
  const { errors, sanitized } = validateCustomerPayload(req.body, { requirePassword: true });
  const password = String(req.body?.password || '');
  if (errors.length) {
    return res.status(400).json({ error: errors[0], errors });
  }

  try {
    const pool = await getPool();
    const existing = await pool.request()
      .input('email', sql.NVarChar, sanitized.email)
      .query('SELECT * FROM clientes WHERE email = @email');

    const passwordHash = await bcrypt.hash(password, 10);
    let cliente;

    if (existing.recordset[0]) {
      const current = existing.recordset[0];
      if (current.password_hash && current.activo) {
        return res.status(409).json({ error: 'Ya existe una cuenta con este email' });
      }

      const update = await pool.request()
        .input('id', sql.Int, current.id)
        .input('nombre', sql.NVarChar, sanitized.nombre)
        .input('rut', sql.NVarChar, sanitized.rut)
        .input('telefono', sql.NVarChar, sanitized.telefono)
        .input('direccion', sql.NVarChar, sanitized.direccion)
        .input('ciudad', sql.NVarChar, sanitized.ciudad)
        .input('region', sql.NVarChar, sanitized.region)
        .input('tipo_piel', sql.NVarChar, sanitized.tipo_piel)
        .input('password_hash', sql.NVarChar, passwordHash)
        .input('activo', sql.Bit, 1)
        .query(`
          UPDATE clientes
          SET nombre = @nombre,
              rut = @rut,
              telefono = @telefono,
              direccion = @direccion,
              ciudad = @ciudad,
              region = @region,
              tipo_piel = @tipo_piel,
              password_hash = @password_hash,
              activo = @activo
          OUTPUT INSERTED.*
          WHERE id = @id
        `);
      cliente = update.recordset[0];
    } else {
      const insert = await pool.request()
        .input('nombre', sql.NVarChar, sanitized.nombre)
        .input('email', sql.NVarChar, sanitized.email)
        .input('rut', sql.NVarChar, sanitized.rut)
        .input('telefono', sql.NVarChar, sanitized.telefono)
        .input('direccion', sql.NVarChar, sanitized.direccion)
        .input('ciudad', sql.NVarChar, sanitized.ciudad)
        .input('region', sql.NVarChar, sanitized.region)
        .input('tipo_piel', sql.NVarChar, sanitized.tipo_piel)
        .input('password_hash', sql.NVarChar, passwordHash)
        .query(`
          INSERT INTO clientes (nombre, email, rut, telefono, direccion, ciudad, region, tipo_piel, password_hash, activo)
          OUTPUT INSERTED.*
          VALUES (@nombre, @email, @rut, @telefono, @direccion, @ciudad, @region, @tipo_piel, @password_hash, 1)
        `);
      cliente = insert.recordset[0];
    }

    const token = signToken({
      id: cliente.id,
      nombre: cliente.nombre,
      email: cliente.email,
      tipo: 'cliente',
    });

    try {
      void sendWelcomeEmail(req, cliente).catch(error => console.error('Correo de bienvenida:', error.code || 'SMTP_ERROR'));
    } catch (mailError) {
      console.error('No se pudo enviar el correo de bienvenida', mailError);
    }

    res.status(201).json({
      token,
      user: {
        id: cliente.id,
        nombre: cliente.nombre,
        email: cliente.email,
        rut: cliente.rut,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
        ciudad: cliente.ciudad,
        region: cliente.region,
        tipo_piel: cliente.tipo_piel,
        tipo: 'cliente',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la cuenta' });
  }
});

router.post('/client/login', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contrasena requeridos' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Ingresa un email valido' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM clientes WHERE email = @email AND activo = 1');

    const cliente = result.recordset[0];
    if (!cliente?.password_hash) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const valid = await bcrypt.compare(password, cliente.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = signToken({
      id: cliente.id,
      nombre: cliente.nombre,
      email: cliente.email,
      tipo: 'cliente',
    });

    res.json({
      token,
      user: {
        id: cliente.id,
        nombre: cliente.nombre,
        email: cliente.email,
        rut: cliente.rut,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
        ciudad: cliente.ciudad,
        region: cliente.region,
        tipo_piel: cliente.tipo_piel,
        tipo: 'cliente',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/client/request-password-reset', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Ingresa un email valido.' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id, nombre, email FROM clientes WHERE email = @email AND password_hash IS NOT NULL AND activo = 1');

    const cliente = result.recordset[0];
    if (!cliente) {
      return res.json({ ok: true });
    }

    const transporter = createMailer();
    if (!transporter) {
      return res.status(400).json({ error: 'Falta configurar SMTP para recuperar contrasena.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await pool.request()
      .input('cliente_id', sql.Int, cliente.id)
      .query('UPDATE password_reset_tokens SET used_at = GETDATE() WHERE cliente_id = @cliente_id AND used_at IS NULL');

    await pool.request()
      .input('cliente_id', sql.Int, cliente.id)
      .input('token_hash', sql.NVarChar, tokenHash)
      .input('expires_at', sql.DateTime2, expiresAt)
      .query(`
        INSERT INTO password_reset_tokens (cliente_id, token_hash, expires_at)
        VALUES (@cliente_id, @token_hash, @expires_at)
      `);

    const resetUrl = `${getStoreBaseUrl(req).replace(/\/$/, '')}/recuperar-contrasena?token=${rawToken}&email=${encodeURIComponent(cliente.email)}`;
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
      from,
      to: cliente.email,
      subject: 'Restablece tu contraseña Bloomskin',
      ...require('../lib/mail').renderMessage({ title: 'Restablece tu contraseña', name: cliente.nombre,
        paragraphs: ['Recibimos una solicitud para cambiar tu contraseña. El enlace vence en una hora.', 'Si no lo solicitaste, ignora este correo: tu contraseña no cambiará.'],
        actionLabel: 'Crear nueva contraseña', actionUrl: resetUrl }),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo iniciar la recuperacion de contrasena.' });
  }
});

router.post('/client/reset-password', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const token = String(req.body?.token || '').trim();
  const password = String(req.body?.password || '');
  const passwordError = validatePassword(password);

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Ingresa un email valido.' });
  }
  if (!token) {
    return res.status(400).json({ error: 'Token de recuperacion invalido.' });
  }
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT TOP 1 prt.id, prt.token_hash, prt.expires_at, prt.used_at, c.id AS cliente_id
        FROM password_reset_tokens prt
        JOIN clientes c ON c.id = prt.cliente_id
        WHERE c.email = @email
        ORDER BY prt.created_at DESC
      `);

    const reset = result.recordset[0];
    if (!reset || reset.used_at || new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ error: 'El enlace de recuperacion ya no es valido.' });
    }

    const tokenMatches = await bcrypt.compare(token, reset.token_hash);
    if (!tokenMatches) {
      return res.status(400).json({ error: 'El enlace de recuperacion ya no es valido.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.request()
      .input('cliente_id', sql.Int, reset.cliente_id)
      .input('password_hash', sql.NVarChar, passwordHash)
      .query('UPDATE clientes SET password_hash = @password_hash WHERE id = @cliente_id');

    await pool.request()
      .input('id', sql.Int, reset.id)
      .query('UPDATE password_reset_tokens SET used_at = GETDATE() WHERE id = @id');

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo restablecer la contrasena.' });
  }
});

router.get('/client/me', requireClientAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`
        SELECT id, nombre, email, rut, telefono, direccion, ciudad, region, tipo_piel
        FROM clientes
        WHERE id = @id
          AND activo = 1
      `);

    if (!result.recordset[0]) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({
      user: { ...result.recordset[0], tipo: 'cliente' },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
