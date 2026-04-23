require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path = require('path');
const { getPool } = require('./config/db');

const app = express();
const uploadsRoot = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(__dirname, '../uploads');
const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsRoot));

// ── Rutas ───────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/pedidos',   require('./routes/pedidos'));
app.use('/api/clientes',  require('./routes/clientes'));
app.use('/api/mensajes',  require('./routes/mensajes'));
app.use('/api/news',      require('./routes/news'));
app.use('/api/settings',  require('./routes/settings'));

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV }));

// ── 404 ─────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// ── Error global ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ── Iniciar ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
getPool()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🌸 Bloomskin API corriendo en http://localhost:${PORT}`);
      console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
    });
  })
  .catch(err => {
    console.error('✗ No se pudo conectar a la base de datos:', err.message);
    process.exit(1);
  });
