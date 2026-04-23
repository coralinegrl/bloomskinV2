const jwt = require('jsonwebtoken');

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
    return res.status(401).json({ error: 'Token inválido o expirado' });
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
  requireAuth(req, res, () => {
    if (req.user?.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acceso solo para administradores' });
    }
    next();
  });
}

function requireClientAuth(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user?.tipo !== 'cliente') {
      return res.status(403).json({ error: 'Acceso solo para clientas' });
    }
    next();
  });
}

module.exports = { requireAuth, optionalAuth, requireAdminAuth, requireClientAuth };
