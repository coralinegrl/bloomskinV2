const router = require('express').Router();
const { getPool, sql } = require('../config/db');
const { requireAdminAuth, requireClientAuth } = require('../middleware/auth');

async function fetchWishlistByClientId(clienteId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('cliente_id', sql.Int, clienteId)
    .query(`
      SELECT
        pr.id, pr.marca, pr.nombre, pr.descripcion, pr.categoria,
        pr.precio_usd, pr.precio_clp, pr.precio_oferta_clp, pr.stock,
        pr.badge, pr.estrellas, pr.resenas, pr.img_clase, pr.imagen_url,
        cw.creado_en AS wishlisted_en
      FROM cliente_wishlist cw
      JOIN productos pr ON pr.id = cw.producto_id
      WHERE cw.cliente_id = @cliente_id AND pr.activo = 1
      ORDER BY cw.creado_en DESC
    `);

  return result.recordset;
}

router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT c.id, c.nombre, c.email, c.telefono, c.ciudad, c.tipo_piel, c.notas, c.creado_en,
        COUNT(p.id) AS total_pedidos,
        COALESCE(SUM(p.total_clp), 0) AS total_comprado
      FROM clientes c
      LEFT JOIN pedidos p ON p.cliente_id = c.id
      GROUP BY c.id, c.nombre, c.email, c.telefono, c.ciudad, c.tipo_piel, c.notas, c.creado_en
      ORDER BY total_comprado DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

router.post('/', async (req, res) => {
  const { nombre, email, telefono, ciudad, tipo_piel } = req.body;
  if (!nombre || !email) return res.status(400).json({ error: 'Nombre y email requeridos' });

  try {
    const pool = await getPool();
    const existing = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM clientes WHERE email = @email');

    if (existing.recordset[0]) {
      return res.json(existing.recordset[0]);
    }

    const result = await pool.request()
      .input('nombre', sql.NVarChar, nombre)
      .input('email', sql.NVarChar, email)
      .input('telefono', sql.NVarChar, telefono || null)
      .input('ciudad', sql.NVarChar, ciudad || null)
      .input('tipo_piel', sql.NVarChar, tipo_piel || null)
      .query(`
        INSERT INTO clientes (nombre, email, telefono, ciudad, tipo_piel)
        OUTPUT INSERTED.*
        VALUES (@nombre, @email, @telefono, @ciudad, @tipo_piel)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

router.put('/:id', requireAdminAuth, async (req, res) => {
  const { telefono, ciudad, tipo_piel, notas } = req.body;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('telefono', sql.NVarChar, telefono || null)
      .input('ciudad', sql.NVarChar, ciudad || null)
      .input('tipo_piel', sql.NVarChar, tipo_piel || null)
      .input('notas', sql.NVarChar, notas || null)
      .query(`
        UPDATE clientes
        SET telefono=@telefono, ciudad=@ciudad, tipo_piel=@tipo_piel, notas=@notas
        OUTPUT INSERTED.*
        WHERE id=@id
      `);
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

router.put('/me/profile', requireClientAuth, async (req, res) => {
  const { nombre, telefono, ciudad, tipo_piel } = req.body;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .input('nombre', sql.NVarChar, nombre || req.user.nombre)
      .input('telefono', sql.NVarChar, telefono || null)
      .input('ciudad', sql.NVarChar, ciudad || null)
      .input('tipo_piel', sql.NVarChar, tipo_piel || null)
      .query(`
        UPDATE clientes
        SET nombre=@nombre, telefono=@telefono, ciudad=@ciudad, tipo_piel=@tipo_piel
        OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.email, INSERTED.telefono, INSERTED.ciudad, INSERTED.tipo_piel
        WHERE id=@id
      `);

    res.json({ user: { ...result.recordset[0], tipo: 'cliente' } });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

router.get('/me/wishlist', requireClientAuth, async (req, res) => {
  try {
    const items = await fetchWishlistByClientId(req.user.id);
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
});

router.post('/me/wishlist', requireClientAuth, async (req, res) => {
  const productoId = Number(req.body?.producto_id);
  if (!productoId) {
    return res.status(400).json({ error: 'Producto invalido' });
  }

  try {
    const pool = await getPool();
    const productCheck = await pool.request()
      .input('producto_id', sql.Int, productoId)
      .query('SELECT id FROM productos WHERE id = @producto_id AND activo = 1');

    if (!productCheck.recordset[0]) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await pool.request()
      .input('cliente_id', sql.Int, req.user.id)
      .input('producto_id', sql.Int, productoId)
      .query(`
        IF NOT EXISTS (
          SELECT 1
          FROM cliente_wishlist
          WHERE cliente_id = @cliente_id AND producto_id = @producto_id
        )
        BEGIN
          INSERT INTO cliente_wishlist (cliente_id, producto_id)
          VALUES (@cliente_id, @producto_id)
        END
      `);

    const items = await fetchWishlistByClientId(req.user.id);
    res.status(201).json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo guardar en favoritos' });
  }
});

router.delete('/me/wishlist/:productoId', requireClientAuth, async (req, res) => {
  const productoId = Number(req.params.productoId);
  if (!productoId) {
    return res.status(400).json({ error: 'Producto invalido' });
  }

  try {
    const pool = await getPool();
    await pool.request()
      .input('cliente_id', sql.Int, req.user.id)
      .input('producto_id', sql.Int, productoId)
      .query(`
        DELETE FROM cliente_wishlist
        WHERE cliente_id = @cliente_id AND producto_id = @producto_id
      `);

    const items = await fetchWishlistByClientId(req.user.id);
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo quitar de favoritos' });
  }
});

module.exports = router;
