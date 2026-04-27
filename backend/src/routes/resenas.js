const router = require('express').Router();
const { getPool, sql } = require('../config/db');
const { requireClientAuth } = require('../middleware/auth');

const MIN_REVIEW_LENGTH = 10;
const MAX_REVIEW_LENGTH = 700;

async function ensureReviewsSchema(pool) {
  await pool.request().batch(`
    IF OBJECT_ID('product_reviews', 'U') IS NULL
    BEGIN
      CREATE TABLE product_reviews (
        id INT IDENTITY(1,1) PRIMARY KEY,
        cliente_id INT NOT NULL REFERENCES clientes(id),
        producto_id INT NOT NULL REFERENCES productos(id),
        pedido_id INT NOT NULL REFERENCES pedidos(id),
        rating INT NOT NULL,
        contenido NVARCHAR(700) NOT NULL,
        activo BIT NOT NULL CONSTRAINT DF_product_reviews_activo DEFAULT 1,
        creado_en DATETIME2 NOT NULL CONSTRAINT DF_product_reviews_creado_en DEFAULT SYSUTCDATETIME(),
        actualizado_en DATETIME2 NOT NULL CONSTRAINT DF_product_reviews_actualizado_en DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_product_reviews_rating CHECK (rating BETWEEN 1 AND 5)
      );
    END;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_product_reviews_cliente_producto' AND object_id = OBJECT_ID('product_reviews'))
      CREATE UNIQUE INDEX UX_product_reviews_cliente_producto ON product_reviews(cliente_id, producto_id);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_product_reviews_producto_activo' AND object_id = OBJECT_ID('product_reviews'))
      CREATE INDEX IX_product_reviews_producto_activo ON product_reviews(producto_id, activo, creado_en);
  `);
}

function cleanReviewBody(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_REVIEW_LENGTH);
}

function publicReview(row) {
  return {
    id: row.id,
    producto_id: row.producto_id,
    producto_nombre: row.producto_nombre,
    producto_marca: row.producto_marca,
    rating: Number(row.rating || 0),
    contenido: row.contenido,
    cliente_nombre: row.cliente_nombre || 'Clienta Bloomskin',
    creado_en: row.creado_en,
    actualizado_en: row.actualizado_en,
  };
}

async function updateProductReviewStats(pool, productoId) {
  const stats = await pool.request()
    .input('producto_id', sql.Int, productoId)
    .query(`
      SELECT COUNT(*) AS total, AVG(CAST(rating AS FLOAT)) AS promedio
      FROM product_reviews
      WHERE producto_id = @producto_id AND activo = 1
    `);

  const row = stats.recordset[0] || {};
  const total = Number(row.total || 0);
  const promedio = total ? Number(row.promedio || 0) : 5;
  const estrellas = String(Math.round(promedio * 10) / 10);

  await pool.request()
    .input('producto_id', sql.Int, productoId)
    .input('resenas', sql.Int, total)
    .input('estrellas', sql.NVarChar(10), estrellas)
    .query(`
      UPDATE productos
      SET resenas = @resenas,
          estrellas = @estrellas,
          actualizado_en = GETDATE()
      WHERE id = @producto_id
    `);
}

router.get('/home', async (req, res) => {
  try {
    const pool = await getPool();
    await ensureReviewsSchema(pool);
    const limit = Math.max(1, Math.min(12, Number(req.query.limit || 6)));
    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          r.id, r.producto_id, r.rating, r.contenido, r.creado_en, r.actualizado_en,
          p.nombre AS producto_nombre, p.marca AS producto_marca,
          COALESCE(NULLIF(LEFT(c.nombre, CHARINDEX(' ', c.nombre + ' ') - 1), ''), 'Clienta') AS cliente_nombre
        FROM product_reviews r
        JOIN productos p ON p.id = r.producto_id
        JOIN clientes c ON c.id = r.cliente_id
        WHERE r.activo = 1 AND p.activo = 1
        ORDER BY NEWID()
      `);

    res.json(result.recordset.map(publicReview));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener resenas' });
  }
});

router.get('/product/:productoId', async (req, res) => {
  const productoId = Number(req.params.productoId);
  if (!Number.isInteger(productoId) || productoId <= 0) {
    return res.status(400).json({ error: 'Producto invalido' });
  }

  try {
    const pool = await getPool();
    await ensureReviewsSchema(pool);
    const result = await pool.request()
      .input('producto_id', sql.Int, productoId)
      .query(`
        SELECT
          r.id, r.producto_id, r.rating, r.contenido, r.creado_en, r.actualizado_en,
          p.nombre AS producto_nombre, p.marca AS producto_marca,
          COALESCE(NULLIF(LEFT(c.nombre, CHARINDEX(' ', c.nombre + ' ') - 1), ''), 'Clienta') AS cliente_nombre
        FROM product_reviews r
        JOIN productos p ON p.id = r.producto_id
        JOIN clientes c ON c.id = r.cliente_id
        WHERE r.producto_id = @producto_id AND r.activo = 1 AND p.activo = 1
        ORDER BY r.creado_en DESC
      `);

    res.json(result.recordset.map(publicReview));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener resenas del producto' });
  }
});

router.get('/mine', requireClientAuth, async (req, res) => {
  try {
    const pool = await getPool();
    await ensureReviewsSchema(pool);
    const result = await pool.request()
      .input('cliente_id', sql.Int, req.user.id)
      .query(`
        SELECT
          r.id, r.producto_id, r.pedido_id, r.rating, r.contenido, r.activo,
          r.creado_en, r.actualizado_en,
          p.nombre AS producto_nombre, p.marca AS producto_marca
        FROM product_reviews r
        JOIN productos p ON p.id = r.producto_id
        WHERE r.cliente_id = @cliente_id
        ORDER BY r.actualizado_en DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener tus resenas' });
  }
});

router.post('/', requireClientAuth, async (req, res) => {
  const pedidoId = Number(req.body?.pedido_id);
  const productoId = Number(req.body?.producto_id);
  const rating = Number(req.body?.rating);
  const contenido = cleanReviewBody(req.body?.contenido);

  if (!Number.isInteger(pedidoId) || !Number.isInteger(productoId)) {
    return res.status(400).json({ error: 'Pedido y producto son obligatorios.' });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Elige una calificacion de 1 a 5 estrellas.' });
  }

  if (contenido.length < MIN_REVIEW_LENGTH) {
    return res.status(400).json({ error: `La resena debe tener al menos ${MIN_REVIEW_LENGTH} caracteres.` });
  }

  try {
    const pool = await getPool();
    await ensureReviewsSchema(pool);

    const verifiedPurchase = await pool.request()
      .input('cliente_id', sql.Int, req.user.id)
      .input('pedido_id', sql.Int, pedidoId)
      .input('producto_id', sql.Int, productoId)
      .query(`
        SELECT TOP 1 p.id
        FROM pedidos p
        JOIN pedido_items pi ON pi.pedido_id = p.id
        WHERE p.id = @pedido_id
          AND p.cliente_id = @cliente_id
          AND p.estado = 'delivered'
          AND pi.producto_id = @producto_id
      `);

    if (!verifiedPurchase.recordset[0]) {
      return res.status(403).json({ error: 'Solo puedes resenar productos de pedidos entregados.' });
    }

    const existing = await pool.request()
      .input('cliente_id', sql.Int, req.user.id)
      .input('producto_id', sql.Int, productoId)
      .query(`
        SELECT id
        FROM product_reviews
        WHERE cliente_id = @cliente_id AND producto_id = @producto_id
      `);

    let saved;
    if (existing.recordset[0]) {
      const result = await pool.request()
        .input('id', sql.Int, existing.recordset[0].id)
        .input('pedido_id', sql.Int, pedidoId)
        .input('rating', sql.Int, rating)
        .input('contenido', sql.NVarChar(700), contenido)
        .query(`
          UPDATE product_reviews
          SET pedido_id = @pedido_id,
              rating = @rating,
              contenido = @contenido,
              activo = 1,
              actualizado_en = SYSUTCDATETIME()
          OUTPUT INSERTED.*
          WHERE id = @id
        `);
      saved = result.recordset[0];
    } else {
      const result = await pool.request()
        .input('cliente_id', sql.Int, req.user.id)
        .input('producto_id', sql.Int, productoId)
        .input('pedido_id', sql.Int, pedidoId)
        .input('rating', sql.Int, rating)
        .input('contenido', sql.NVarChar(700), contenido)
        .query(`
          INSERT INTO product_reviews (cliente_id, producto_id, pedido_id, rating, contenido)
          OUTPUT INSERTED.*
          VALUES (@cliente_id, @producto_id, @pedido_id, @rating, @contenido)
        `);
      saved = result.recordset[0];
    }

    await updateProductReviewStats(pool, productoId);

    res.status(existing.recordset[0] ? 200 : 201).json({ ok: true, review: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No pudimos guardar tu resena.' });
  }
});

module.exports = router;
module.exports.ensureReviewsSchema = ensureReviewsSchema;
