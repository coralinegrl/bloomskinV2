const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');

function getTokenFromRequest(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.split(' ')[1];
}

function requireAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
}

function optionalAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    req.user = null;
  }

  next();
}

function requireAdminAuth(req, res, next) {
  requireAuth(req, res, async () => {
    if (req.user?.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acceso solo para administradores' });
    }

    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('id', sql.Int, req.user.id)
        .query('SELECT id, activo FROM usuarios WHERE id = @id');

      const admin = result.recordset[0];
      if (!admin || admin.activo !== true) {
        return res.status(401).json({ error: 'Tu sesion de admin ya no esta activa' });
      }

      next();
    } catch {
      return res.status(401).json({ error: 'No pudimos validar tu sesion de admin' });
    }
  });
}

function requireClientAuth(req, res, next) {
  requireAuth(req, res, async () => {
    if (req.user?.tipo !== 'cliente') {
      return res.status(403).json({ error: 'Acceso solo para clientas' });
    }

    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('id', sql.Int, req.user.id)
        .query('SELECT id, activo FROM clientes WHERE id = @id');

      const client = result.recordset[0];
      if (!client || client.activo !== true) {
        return res.status(401).json({ error: 'Tu cuenta ya no esta activa. Debes registrarte nuevamente.' });
      }

      next();
    } catch {
      return res.status(401).json({ error: 'No pudimos validar tu sesion de clienta' });
    }
  });
}

module.exports = { requireAuth, optionalAuth, requireAdminAuth, requireClientAuth };

