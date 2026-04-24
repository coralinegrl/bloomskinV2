const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { getPool, sql } = require('../config/db');
const { requireAdminAuth, requireClientAuth } = require('../middleware/auth');
const { normalizeEmail, isValidEmail, validateCustomerPayload, validatePassword } = require('../lib/validation');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

function createMailer() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function getStoreBaseUrl(req) {
  return process.env.STORE_BASE_URL
    || process.env.PUBLIC_APP_URL
    || `${req.protocol}://${req.get('host').replace(/:\d+$/, ':5173')}`;
}

async function sendWelcomeEmail(req, cliente) {
  const transporter = createMailer();
  if (!transporter || !cliente?.email) return false;

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const storeUrl = getStoreBaseUrl(req).replace(/\/$/, '');
  const accountUrl = `${storeUrl}/mi-cuenta`;

  await transporter.sendMail({
    from,
    to: cliente.email,
    subject: 'Bienvenida a Bloomskin',
    text: [
      `Hola ${cliente.nombre || 'clienta'},`,
      '',
      'Tu cuenta Bloomskin ya esta lista.',
      'Desde ahora puedes guardar favoritos, revisar tus pedidos y comprar mas rapido en tu proxima visita.',
      '',
      `Entra aqui cuando quieras: ${accountUrl}`,
      '',
      'Gracias por ser parte de Bloomskin.',
    ].join('\n'),
    html: `
      <div style="margin:0;padding:32px 16px;background:#f8eef2;">
        <div style="max-width:620px;margin:0 auto;background:#fffafc;border:1px solid rgba(191,84,122,.16);border-radius:28px;overflow:hidden;box-shadow:0 18px 40px rgba(139,63,85,.08);font-family:Arial,sans-serif;color:#4a3240;">
          <div style="padding:32px 36px;background:linear-gradient(135deg,#fff3f7 0%,#f7e9ef 55%,#f0dde4 100%);border-bottom:1px solid rgba(191,84,122,.12);">
            <div style="font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#bf547a;font-weight:700;">Bloomskin</div>
            <h1 style="margin:12px 0 10px;font-family:Georgia,serif;font-size:40px;line-height:1;color:#3d2833;font-weight:500;">
              Bienvenida a tu ritual de K-Beauty
            </h1>
            <p style="margin:0;font-size:15px;line-height:1.8;color:#6e5560;">
              Hola ${cliente.nombre || 'clienta'}, tu cuenta ya está lista para guardar favoritos, revisar tus compras y volver a comprar más rápido.
            </p>
          </div>

          <div style="padding:32px 36px 20px;">
            <div style="display:grid;gap:14px;">
              <div style="padding:16px 18px;border-radius:20px;background:#fff;border:1px solid rgba(191,84,122,.10);">
                <strong style="display:block;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#bf547a;">Desde tu cuenta podrás</strong>
                <p style="margin:10px 0 0;font-size:15px;line-height:1.8;color:#4a3240;">
                  Guardar productos, seguir el estado de tus pedidos y tener tus datos listos para un checkout más simple.
                </p>
              </div>

              <div style="padding:16px 18px;border-radius:20px;background:#f7fbf8;border:1px solid rgba(168,199,179,.45);">
                <strong style="display:block;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#50745f;">Tu acceso directo</strong>
                <p style="margin:10px 0 0;font-size:15px;line-height:1.8;color:#4a3240;">
                  Cuando quieras volver, entra a tu cuenta y retoma tu rutina donde la dejaste.
                </p>
              </div>
            </div>

            <div style="margin:28px 0 22px;text-align:center;">
              <a href="${accountUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#bf547a;color:#fff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;">
                Ir a mi cuenta
              </a>
            </div>

            <p style="margin:0 0 12px;font-size:14px;line-height:1.8;color:#6e5560;text-align:center;">
              Gracias por ser parte de Bloomskin.
            </p>
          </div>
        </div>
      </div>
    `,
  });

  return true;
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
      await sendWelcomeEmail(req, cliente);
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
      subject: 'Recupera tu contrasena Bloomskin',
      text: [
        `Hola ${cliente.nombre || 'clienta'},`,
        '',
        'Recibimos una solicitud para restablecer tu contrasena de Bloomskin.',
        `Usa este enlace dentro de la proxima hora: ${resetUrl}`,
        '',
        'Si no pediste este cambio, puedes ignorar este correo.',
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#4a3240">
          <p>Hola ${cliente.nombre || 'clienta'},</p>
          <p>Recibimos una solicitud para restablecer tu contrasena de Bloomskin.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#bf547a;color:#fff;text-decoration:none;">
              Restablecer contrasena
            </a>
          </p>
          <p>Este enlace vence en 1 hora.</p>
          <p>Si no pediste este cambio, puedes ignorar este correo.</p>
        </div>
      `,
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
