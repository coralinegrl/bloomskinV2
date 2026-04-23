const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');
const { requireAdminAuth, requireClientAuth } = require('../middleware/auth');
const { normalizeEmail, isValidEmail, validateCustomerPayload } = require('../lib/validation');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
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
      if (current.password_hash) {
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
        .query(`
          UPDATE clientes
          SET nombre = @nombre,
              rut = @rut,
              telefono = @telefono,
              direccion = @direccion,
              ciudad = @ciudad,
              region = @region,
              tipo_piel = @tipo_piel,
              password_hash = @password_hash
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
          INSERT INTO clientes (nombre, email, rut, telefono, direccion, ciudad, region, tipo_piel, password_hash)
          OUTPUT INSERTED.*
          VALUES (@nombre, @email, @rut, @telefono, @direccion, @ciudad, @region, @tipo_piel, @password_hash)
        `);
      cliente = insert.recordset[0];
    }

    const token = signToken({
      id: cliente.id,
      nombre: cliente.nombre,
      email: cliente.email,
      tipo: 'cliente',
    });

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
      .query('SELECT * FROM clientes WHERE email = @email');

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

router.get('/client/me', requireClientAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`
        SELECT id, nombre, email, rut, telefono, direccion, ciudad, region, tipo_piel
        FROM clientes
        WHERE id = @id
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
