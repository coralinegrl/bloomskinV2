const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { readCatalogFile, writeCatalogFile, sanitizeProduct } = require('../lib/catalog');
const { getPool, sql } = require('../config/db');
const { requireAdminAuth } = require('../middleware/auth');

const uploadsDir = path.resolve(__dirname, '../../uploads/productos');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeBase = path.basename(file.originalname, path.extname(file.originalname))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'producto';
    cb(null, `${Date.now()}-${safeBase}${path.extname(file.originalname).toLowerCase() || '.png'}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Solo se permiten imagenes'));
      return;
    }
    cb(null, true);
  },
});

function calcPrecio(usd) {
  return Math.ceil((parseFloat(usd) + 1) * 1000 * 1.19 * 1.3);
}

router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, marca, nombre, descripcion, categoria, precio_clp, precio_oferta_clp,
             stock, badge, estrellas, resenas, img_clase, imagen_url
      FROM productos
      WHERE activo = 1
      ORDER BY creado_en DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

router.get('/admin', requireAdminAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM productos ORDER BY creado_en DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

router.get('/catalogo-json', requireAdminAuth, async (req, res) => {
  try {
    res.json({ products: readCatalogFile() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo leer el catalogo JSON' });
  }
});

router.post('/upload-image', requireAdminAuth, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Debes adjuntar una imagen' });
  }

  res.status(201).json({
    ok: true,
    image_url: `/uploads/productos/${req.file.filename}`,
    filename: req.file.filename,
  });
});

router.put('/catalogo-json', requireAdminAuth, async (req, res) => {
  const products = Array.isArray(req.body?.products) ? req.body.products : null;
  if (!products) {
    return res.status(400).json({ error: 'products debe ser un arreglo JSON' });
  }

  try {
    const sanitized = products.map((product, index) => sanitizeProduct(product, index));
    writeCatalogFile(sanitized);
    res.json({ ok: true, total: sanitized.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo guardar el catalogo JSON' });
  }
});

router.post('/catalogo-json/import', requireAdminAuth, async (req, res) => {
  const products = Array.isArray(req.body?.products) ? req.body.products : readCatalogFile();
  const sanitized = products.map((product, index) => sanitizeProduct(product, index));

  let transaction;
  try {
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    await new sql.Request(transaction).query("DELETE FROM pedido_items; DELETE FROM pedidos; DELETE FROM productos; DBCC CHECKIDENT ('productos', RESEED, 0);");

    for (const [index, product] of sanitized.entries()) {
      await insertProduct(new sql.Request(transaction), product, index);
    }

    await transaction.commit();
    res.json({ ok: true, total: sanitized.length });
  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (_) {
        // ignore rollback errors
      }
    }
    console.error(err);
    res.status(500).json({ error: 'No se pudo importar el catalogo JSON a la base' });
  }
});

router.post('/', requireAdminAuth, async (req, res) => {
  const { marca, nombre, precio_usd } = req.body;

  if (!marca || !nombre || !precio_usd) {
    return res.status(400).json({ error: 'Marca, nombre y precio_usd son obligatorios' });
  }

  try {
    const pool = await getPool();
    const product = sanitizeProduct({
      ...req.body,
      precio_clp: req.body.precio_clp || calcPrecio(precio_usd),
    });

    const result = await insertProduct(pool.request(), product);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

router.put('/:id', requireAdminAuth, async (req, res) => {
  const { precio_usd } = req.body;
  const precio_clp = precio_usd ? calcPrecio(precio_usd) : req.body.precio_clp;

  try {
    const pool = await getPool();
    const product = sanitizeProduct({
      ...req.body,
      precio_clp,
    });

    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('marca', sql.NVarChar, product.marca)
      .input('nombre', sql.NVarChar, product.nombre)
      .input('descripcion', sql.NVarChar, product.descripcion)
      .input('categoria', sql.NVarChar, product.categoria)
      .input('precio_usd', sql.Decimal(10, 2), product.precio_usd)
      .input('precio_clp', sql.Int, product.precio_clp)
      .input('precio_oferta_clp', sql.Int, product.precio_oferta_clp)
      .input('stock', sql.Int, product.stock)
      .input('badge', sql.NVarChar, product.badge)
      .input('estrellas', sql.NVarChar, product.estrellas)
      .input('resenas', sql.Int, product.resenas)
      .input('img_clase', sql.NVarChar, product.img_clase)
      .input('imagen_url', sql.NVarChar, product.imagen_url)
      .input('activo', sql.Bit, req.body.activo !== undefined ? req.body.activo : 1)
      .query(`
        UPDATE productos SET
          marca=@marca,
          nombre=@nombre,
          descripcion=@descripcion,
          categoria=@categoria,
          precio_usd=@precio_usd,
          precio_clp=@precio_clp,
          precio_oferta_clp=@precio_oferta_clp,
          stock=@stock,
          badge=@badge,
          estrellas=@estrellas,
          resenas=@resenas,
          img_clase=@img_clase,
          imagen_url=@imagen_url,
          activo=@activo,
          actualizado_en=GETDATE()
        OUTPUT INSERTED.*
        WHERE id=@id
      `);

    if (!result.recordset[0]) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

router.delete('/:id', requireAdminAuth, async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('UPDATE productos SET activo = 0, actualizado_en = GETDATE() WHERE id = @id');
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

router.patch('/:id/stock', requireAdminAuth, async (req, res) => {
  const { stock } = req.body;
  if (stock === undefined) {
    return res.status(400).json({ error: 'stock requerido' });
  }

  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('stock', sql.Int, stock)
      .query('UPDATE productos SET stock = @stock, actualizado_en = GETDATE() WHERE id = @id');
    res.json({ ok: true, stock });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar stock' });
  }
});

router.get('/utils/calcular-precio', requireAdminAuth, (req, res) => {
  const usd = parseFloat(req.query.usd);
  if (Number.isNaN(usd)) {
    return res.status(400).json({ error: 'usd invalido' });
  }

  const clp = calcPrecio(usd);
  res.json({
    precio_usd: usd,
    precio_clp: clp,
    detalle: {
      base_usd: usd,
      envio_usd: 1,
      subtotal_usd: usd + 1,
      en_clp: (usd + 1) * 1000,
      con_iva: Math.round((usd + 1) * 1000 * 1.19),
      precio_final: clp,
    },
  });
});

router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM productos WHERE id = @id AND activo = 1');

    if (!result.recordset[0]) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

async function insertProduct(request, product, index = 0) {
  return request
    .input('marca', sql.NVarChar, product.marca)
    .input('nombre', sql.NVarChar, product.nombre)
    .input('descripcion', sql.NVarChar, product.descripcion)
    .input('categoria', sql.NVarChar, product.categoria)
    .input('precio_usd', sql.Decimal(10, 2), product.precio_usd)
    .input('precio_clp', sql.Int, product.precio_clp)
    .input('precio_oferta_clp', sql.Int, product.precio_oferta_clp)
    .input('stock', sql.Int, product.stock)
    .input('badge', sql.NVarChar, product.badge)
    .input('estrellas', sql.NVarChar, product.estrellas || '★★★★★')
    .input('resenas', sql.Int, product.resenas || 0)
    .input('img_clase', sql.NVarChar, product.img_clase || `p-img-${(index % 8) + 1}`)
    .input('imagen_url', sql.NVarChar, product.imagen_url || null)
    .query(`
      INSERT INTO productos
      (marca, nombre, descripcion, categoria, precio_usd, precio_clp, precio_oferta_clp, stock, badge, estrellas, resenas, img_clase, imagen_url)
      OUTPUT INSERTED.*
      VALUES
      (@marca, @nombre, @descripcion, @categoria, @precio_usd, @precio_clp, @precio_oferta_clp, @stock, @badge, @estrellas, @resenas, @img_clase, @imagen_url)
    `);
}

module.exports = router;
