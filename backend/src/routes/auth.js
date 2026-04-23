const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');
const { requireAdminAuth, requireClientAuth } = require('../middleware/auth');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
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
  const { nombre, email, password, telefono, ciudad, tipo_piel } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
  }

  try {
    const pool = await getPool();
    const existing = await pool.request()
      .input('email', sql.NVarChar, email)
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
        .input('nombre', sql.NVarChar, nombre)
        .input('telefono', sql.NVarChar, telefono || current.telefono || null)
        .input('ciudad', sql.NVarChar, ciudad || current.ciudad || null)
        .input('tipo_piel', sql.NVarChar, tipo_piel || current.tipo_piel || null)
        .input('password_hash', sql.NVarChar, passwordHash)
        .query(`
          UPDATE clientes
          SET nombre = @nombre,
              telefono = @telefono,
              ciudad = @ciudad,
              tipo_piel = @tipo_piel,
              password_hash = @password_hash
          OUTPUT INSERTED.*
          WHERE id = @id
        `);
      cliente = update.recordset[0];
    } else {
      const insert = await pool.request()
        .input('nombre', sql.NVarChar, nombre)
        .input('email', sql.NVarChar, email)
        .input('telefono', sql.NVarChar, telefono || null)
        .input('ciudad', sql.NVarChar, ciudad || null)
        .input('tipo_piel', sql.NVarChar, tipo_piel || null)
        .input('password_hash', sql.NVarChar, passwordHash)
        .query(`
          INSERT INTO clientes (nombre, email, telefono, ciudad, tipo_piel, password_hash)
          OUTPUT INSERTED.*
          VALUES (@nombre, @email, @telefono, @ciudad, @tipo_piel, @password_hash)
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
        telefono: cliente.telefono,
        ciudad: cliente.ciudad,
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
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
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
        telefono: cliente.telefono,
        ciudad: cliente.ciudad,
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
        SELECT id, nombre, email, telefono, ciudad, tipo_piel
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
