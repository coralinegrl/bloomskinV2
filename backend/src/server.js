require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { getPool } = require('./config/db');
const { ensureDiscountSchema } = require('./lib/discounts');
const pedidosRouter = require('./routes/pedidos');
const resenasRouter = require('./routes/resenas');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET no esta configurado. Revisa backend/.env antes de iniciar el servidor.');
}

const app = express();
const uploadsRoot = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(__dirname, '../uploads');
const frontendDist = process.env.FRONTEND_DIST
  ? path.resolve(process.env.FRONTEND_DIST)
  : path.resolve(__dirname, '../../frontend/dist');
const frontendIndex = path.join(frontendDist, 'index.html');
const hasFrontendBuild = fs.existsSync(frontendIndex);
const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost,http://127.0.0.1,http://localhost:3000,http://127.0.0.1:3000,http://bloomskin.cl,http://www.bloomskin.cl,https://bloomskin.cl,https://www.bloomskin.cl')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin || allowedOrigins.includes(origin)) return true;

  try {
    const parsed = new URL(origin);
    const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';

    return isLocalHost && isHttp;
  } catch (_err) {
    return false;
  }
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsRoot));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/pedidos', pedidosRouter);
app.use('/api/resenas', resenasRouter);
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/mensajes', require('./routes/mensajes'));
app.use('/api/news', require('./routes/news'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/descuentos', require('./routes/descuentos'));

app.get('/api/health', (_req, res) => res.json({ ok: true, env: process.env.NODE_ENV }));

if (hasFrontendBuild) {
  app.use(express.static(frontendDist));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    return res.sendFile(frontendIndex);
  });
}

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
getPool()
  .then(async pool => {
    await ensureDiscountSchema(pool);
    await pedidosRouter.ensurePedidosSchema(pool);
    await resenasRouter.ensureReviewsSchema(pool);
    await pedidosRouter.runOrderMaintenance();
    setInterval(() => {
      pedidosRouter.runOrderMaintenance().catch(err => {
        console.error('No se pudo ejecutar el mantenimiento de pedidos:', err.message);
      });
    }, 60 * 1000);
    app.listen(PORT, () => {
      console.log(`Bloomskin API corriendo en http://localhost:${PORT}`);
      if (hasFrontendBuild) {
        console.log(`Frontend compilado servido desde ${frontendDist}`);
      }
      console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch(err => {
    console.error('No se pudo conectar a la base de datos:', err.message);
    process.exit(1);
  });
