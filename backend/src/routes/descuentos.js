const router = require('express').Router();
const { getPool, sql } = require('../config/db');
const { requireAdminAuth } = require('../middleware/auth');
const {
  sanitizeDiscountPayload,
  validateDiscountRow,
  findDiscountByCode,
  ensureDiscountSchema,
} = require('../lib/discounts');

router.get('/', requireAdminAuth, async (_req, res) => {
  try {
    const pool = await getPool();
    await ensureDiscountSchema(pool);
    const result = await pool.request().query(`
      SELECT id, code, name, description, discount_percent, max_uses, used_count,
             starts_at, ends_at, min_subtotal_clp, active, created_en, updated_en
      FROM discount_codes
      ORDER BY created_en DESC, id DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudieron cargar los descuentos.' });
  }
});

router.post('/validate', async (req, res) => {
  const code = req.body?.code;
  const subtotalClp = Number(req.body?.subtotal_clp || 0);

  if (!code) {
    return res.status(400).json({ error: 'Debes ingresar un codigo.' });
  }

  try {
    const pool = await getPool();
    await ensureDiscountSchema(pool);
    const discount = await findDiscountByCode(pool.request(), code);
    const validation = validateDiscountRow(discount, subtotalClp);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }
    res.json(validation.discount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo validar el codigo.' });
  }
});

router.post('/', requireAdminAuth, async (req, res) => {
  const payload = sanitizeDiscountPayload(req.body || {});
  if (payload.errors.length) {
    return res.status(400).json({ error: payload.errors[0] });
  }

  try {
    const pool = await getPool();
    await ensureDiscountSchema(pool);
    const existing = await findDiscountByCode(pool.request(), payload.values.code);
    if (existing) {
      return res.status(409).json({ error: 'Ese codigo ya existe.' });
    }

    const result = await pool.request()
      .input('code', sql.NVarChar, payload.values.code)
      .input('name', sql.NVarChar, payload.values.name)
      .input('description', sql.NVarChar, payload.values.description)
      .input('discount_percent', sql.Int, payload.values.discount_percent)
      .input('max_uses', sql.Int, payload.values.max_uses)
      .input('starts_at', sql.DateTime2, payload.values.starts_at)
      .input('ends_at', sql.DateTime2, payload.values.ends_at)
      .input('min_subtotal_clp', sql.Int, payload.values.min_subtotal_clp)
      .input('active', sql.Bit, payload.values.active)
      .query(`
        INSERT INTO discount_codes (
          code, name, description, discount_percent, max_uses, starts_at, ends_at, min_subtotal_clp, active
        )
        OUTPUT INSERTED.*
        VALUES (
          @code, @name, @description, @discount_percent, @max_uses, @starts_at, @ends_at, @min_subtotal_clp, @active
        )
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo crear el descuento.' });
  }
});

router.put('/:id', requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Id invalido.' });
  }

  const payload = sanitizeDiscountPayload(req.body || {});
  if (payload.errors.length) {
    return res.status(400).json({ error: payload.errors[0] });
  }

  try {
    const pool = await getPool();
    await ensureDiscountSchema(pool);

    const duplicate = await pool.request()
      .input('id', sql.Int, id)
      .input('code', sql.NVarChar, payload.values.code)
      .query(`
        SELECT TOP 1 id
        FROM discount_codes
        WHERE code = @code AND id <> @id
      `);

    if (duplicate.recordset[0]) {
      return res.status(409).json({ error: 'Ese codigo ya existe.' });
    }

    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('code', sql.NVarChar, payload.values.code)
      .input('name', sql.NVarChar, payload.values.name)
      .input('description', sql.NVarChar, payload.values.description)
      .input('discount_percent', sql.Int, payload.values.discount_percent)
      .input('max_uses', sql.Int, payload.values.max_uses)
      .input('starts_at', sql.DateTime2, payload.values.starts_at)
      .input('ends_at', sql.DateTime2, payload.values.ends_at)
      .input('min_subtotal_clp', sql.Int, payload.values.min_subtotal_clp)
      .input('active', sql.Bit, payload.values.active)
      .query(`
        UPDATE discount_codes
        SET code = @code,
            name = @name,
            description = @description,
            discount_percent = @discount_percent,
            max_uses = @max_uses,
            starts_at = @starts_at,
            ends_at = @ends_at,
            min_subtotal_clp = @min_subtotal_clp,
            active = @active,
            updated_en = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (!result.recordset[0]) {
      return res.status(404).json({ error: 'No se encontro ese descuento.' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo actualizar el descuento.' });
  }
});

router.delete('/:id', requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Id invalido.' });
  }

  try {
    const pool = await getPool();
    await ensureDiscountSchema(pool);
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE discount_codes
        SET active = 0,
            updated_en = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (!result.recordset[0]) {
      return res.status(404).json({ error: 'No se encontro ese descuento.' });
    }

    res.json({ ok: true, discount: result.recordset[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo desactivar el descuento.' });
  }
});

module.exports = router;
