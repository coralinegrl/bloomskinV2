const router = require('express').Router();
const { getPool, sql } = require('../config/db');
const { requireAdminAuth, requireClientAuth } = require('../middleware/auth');
const { normalizeEmail, validateCustomerPayload, validateRequiredText } = require('../lib/validation');

function normalizeToneOptions(value) {
  try {
    const raw = Array.isArray(value) ? value : JSON.parse(String(value || '[]'));
    return [...new Set(raw.map(entry => String(entry || '').trim()).filter(Boolean))].slice(0, 40);
  } catch {
    return [];
  }
}

function normalizeToneStock(value, tones = [], fallbackStock = 0) {
  let parsed = {};
  try {
    parsed = value ? JSON.parse(String(value)) : {};
  } catch {
    parsed = {};
  }
  const clean = {};
  const hasExplicit = tones.some(tone => Object.prototype.hasOwnProperty.call(parsed, tone));
  for (const tone of tones) clean[tone] = Math.max(0, Math.floor(Number(parsed?.[tone] || 0)));
  if (!hasExplicit && tones.length) {
    const total = Math.max(0, Math.floor(Number(fallbackStock || 0)));
    const base = Math.floor(total / tones.length);
    let remainder = total % tones.length;
    for (const tone of tones) {
      clean[tone] = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
    }
  }
  return clean;
}

async function fetchWishlistByClientId(clienteId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('cliente_id', sql.Int, clienteId)
    .query(`
      SELECT
        pr.id, pr.marca, pr.nombre, pr.descripcion, pr.categoria,
        pr.precio_usd, pr.precio_clp, pr.precio_oferta_clp, pr.oferta_hasta, pr.stock,
        pr.badge, pr.estrellas, pr.resenas, pr.img_clase, pr.imagen_url,
        pr.usa_tonos, pr.tonos_json, pr.tonos_stock_json,
        cw.creado_en AS wishlisted_en
      FROM cliente_wishlist cw
      JOIN productos pr ON pr.id = cw.producto_id
      WHERE cw.cliente_id = @cliente_id AND pr.activo = 1
      ORDER BY cw.creado_en DESC
    `);

  return result.recordset.map(product => {
    const tones = normalizeToneOptions(product.tonos_json);
    const usesTones = Boolean(product.usa_tonos && tones.length);
    const toneStock = usesTones ? normalizeToneStock(product.tonos_stock_json, tones, product.stock) : {};
    return {
      ...product,
      usa_tonos: usesTones,
      tonos: tones,
      tonos_stock: toneStock,
      stock: usesTones ? Object.values(toneStock).reduce((sum, value) => sum + Number(value || 0), 0) : product.stock,
    };
  });
}

router.get('/', requireAdminAuth, async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT c.id, c.nombre, c.email, c.rut, c.telefono, c.direccion, c.ciudad, c.region, c.tipo_piel, c.notas, c.activo, c.creado_en,
        COUNT(CASE WHEN p.estado IN ('paid', 'shipped', 'delivered') THEN 1 END) AS total_pedidos,
        COALESCE(SUM(CASE WHEN p.estado IN ('paid', 'shipped', 'delivered') THEN p.total_clp ELSE 0 END), 0) AS total_comprado
      FROM clientes c
      LEFT JOIN pedidos p ON p.cliente_id = c.id AND p.eliminado_en IS NULL
      GROUP BY c.id, c.nombre, c.email, c.rut, c.telefono, c.direccion, c.ciudad, c.region, c.tipo_piel, c.notas, c.activo, c.creado_en
      ORDER BY c.activo DESC, c.creado_en DESC, total_comprado DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

router.post('/', async (req, res) => {
  const { errors, sanitized } = validateCustomerPayload(req.body, { requirePassword: false });
  if (errors.length) return res.status(400).json({ error: errors[0], errors });

  try {
    const pool = await getPool();
    const existing = await pool.request()
      .input('email', sql.NVarChar, sanitized.email)
      .query('SELECT * FROM clientes WHERE email = @email');

    if (existing.recordset[0]) {
      return res.json(existing.recordset[0]);
    }

    const result = await pool.request()
      .input('nombre', sql.NVarChar, sanitized.nombre)
      .input('email', sql.NVarChar, sanitized.email)
      .input('rut', sql.NVarChar, sanitized.rut)
      .input('telefono', sql.NVarChar, sanitized.telefono)
      .input('direccion', sql.NVarChar, sanitized.direccion)
      .input('ciudad', sql.NVarChar, sanitized.ciudad)
      .input('region', sql.NVarChar, sanitized.region)
      .input('tipo_piel', sql.NVarChar, sanitized.tipo_piel)
      .query(`
        INSERT INTO clientes (nombre, email, rut, telefono, direccion, ciudad, region, tipo_piel)
        OUTPUT INSERTED.*
        VALUES (@nombre, @email, @rut, @telefono, @direccion, @ciudad, @region, @tipo_piel)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

router.put('/:id', requireAdminAuth, async (req, res) => {
  const validation = validateCustomerPayload({
    nombre: req.body?.nombre,
    email: req.body?.email,
    rut: req.body?.rut,
    telefono: req.body?.telefono,
    direccion: req.body?.direccion,
    ciudad: req.body?.ciudad,
    region: req.body?.region,
    tipo_piel: req.body?.tipo_piel,
  }, { requirePassword: false });
  const notasError = req.body?.notas ? validateRequiredText(req.body.notas, 'Notas', 3) : null;
  if (validation.errors.length || notasError) {
    const errors = [...validation.errors];
    if (notasError) errors.push(notasError);
    return res.status(400).json({ error: errors[0], errors });
  }

  const { nombre, email, rut, telefono, direccion, ciudad, region, tipo_piel } = validation.sanitized;
  const notas = req.body?.notas ? String(req.body.notas).trim() : null;
  try {
    const pool = await getPool();
    const duplicateEmail = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('email', sql.NVarChar, email)
      .query('SELECT id FROM clientes WHERE email = @email AND id <> @id');

    if (duplicateEmail.recordset[0]) {
      return res.status(409).json({ error: 'Ya existe otra clienta con ese email.' });
    }

    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('nombre', sql.NVarChar, nombre)
      .input('email', sql.NVarChar, email)
      .input('rut', sql.NVarChar, rut || null)
      .input('telefono', sql.NVarChar, telefono || null)
      .input('direccion', sql.NVarChar, direccion || null)
      .input('ciudad', sql.NVarChar, ciudad || null)
      .input('region', sql.NVarChar, region || null)
      .input('tipo_piel', sql.NVarChar, tipo_piel || null)
      .input('notas', sql.NVarChar, notas || null)
      .query(`
        UPDATE clientes
        SET nombre=@nombre, email=@email, rut=@rut, telefono=@telefono, direccion=@direccion, ciudad=@ciudad, region=@region, tipo_piel=@tipo_piel, notas=@notas
        OUTPUT INSERTED.*
        WHERE id=@id
      `);
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

router.delete('/:id', requireAdminAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        UPDATE clientes
        SET activo = 0,
            password_hash = NULL
        OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.email, INSERTED.activo
        WHERE id = @id AND activo = 1
      `);

    if (!result.recordset[0]) {
      return res.status(404).json({ error: 'La clienta no existe o ya estaba desactivada.' });
    }

    res.json({ ok: true, cliente: result.recordset[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo desactivar la clienta.' });
  }
});

router.put('/me/profile', requireClientAuth, async (req, res) => {
  const payload = {
    nombre: req.body?.nombre,
    email: normalizeEmail(req.user?.email),
    rut: req.body?.rut,
    telefono: req.body?.telefono,
    direccion: req.body?.direccion,
    ciudad: req.body?.ciudad,
    region: req.body?.region,
    tipo_piel: req.body?.tipo_piel,
  };
  const { errors, sanitized } = validateCustomerPayload(payload, {
    requirePassword: false,
    requireAddress: req.body?.skip_address_validation !== true,
  });
  if (errors.length) {
    return res.status(400).json({ error: errors[0], errors });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .input('nombre', sql.NVarChar, sanitized.nombre || req.user.nombre)
      .input('rut', sql.NVarChar, sanitized.rut)
      .input('telefono', sql.NVarChar, sanitized.telefono)
      .input('direccion', sql.NVarChar, sanitized.direccion)
      .input('ciudad', sql.NVarChar, sanitized.ciudad)
      .input('region', sql.NVarChar, sanitized.region)
      .input('tipo_piel', sql.NVarChar, sanitized.tipo_piel)
      .query(`
        UPDATE clientes
        SET nombre=@nombre, rut=@rut, telefono=@telefono, direccion=@direccion, ciudad=@ciudad, region=@region, tipo_piel=@tipo_piel
        OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.email, INSERTED.rut, INSERTED.telefono, INSERTED.direccion, INSERTED.ciudad, INSERTED.region, INSERTED.tipo_piel
        WHERE id=@id AND activo = 1
      `);

    if (!result.recordset[0]) {
      return res.status(404).json({ error: 'Tu cuenta ya no esta activa. Debes registrarte nuevamente.' });
    }

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
