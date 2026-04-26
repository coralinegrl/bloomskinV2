const { sql } = require('../config/db');

function normalizeDiscountCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function startOfDay(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date;
}

function buildDiscountResult(row, subtotalClp) {
  const subtotal = Math.max(0, Math.round(Number(subtotalClp || 0)));
  const percent = Math.max(0, Math.min(100, Math.round(Number(row?.discount_percent || 0))));
  const discountClp = Math.min(subtotal, Math.round(subtotal * (percent / 100)));
  const subtotalAfterDiscount = Math.max(0, subtotal - discountClp);

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    discount_percent: percent,
    discount_clp: discountClp,
    subtotal_after_discount_clp: subtotalAfterDiscount,
    max_uses: row.max_uses,
    used_count: row.used_count,
    remaining_uses: row.max_uses === null || row.max_uses === undefined
      ? null
      : Math.max(0, Number(row.max_uses) - Number(row.used_count || 0)),
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    min_subtotal_clp: row.min_subtotal_clp,
    active: Boolean(row.active),
  };
}

function validateDiscountRow(row, subtotalClp, now = new Date()) {
  if (!row) return { ok: false, error: 'Ese codigo no existe o ya no esta disponible.' };

  const subtotal = Math.max(0, Math.round(Number(subtotalClp || 0)));
  if (!row.active) {
    return { ok: false, error: 'Ese codigo no esta activo en este momento.' };
  }

  const startsAt = row.starts_at ? new Date(row.starts_at) : null;
  const endsAt = row.ends_at ? new Date(row.ends_at) : null;

  if (startsAt && now < startsAt) {
    return { ok: false, error: 'Ese codigo aun no comienza su vigencia.' };
  }

  if (endsAt && now > endsAt) {
    return { ok: false, error: 'Ese codigo ya vencio.' };
  }

  if (row.max_uses !== null && row.max_uses !== undefined && Number(row.used_count || 0) >= Number(row.max_uses)) {
    return { ok: false, error: 'Ese codigo ya alcanzo su limite de usos.' };
  }

  if (row.min_subtotal_clp !== null && row.min_subtotal_clp !== undefined && subtotal < Number(row.min_subtotal_clp)) {
    return {
      ok: false,
      error: `Este codigo requiere un subtotal minimo de $${Number(row.min_subtotal_clp).toLocaleString('es-CL')}.`,
    };
  }

  const result = buildDiscountResult(row, subtotal);
  if (result.discount_percent <= 0 || result.discount_clp <= 0) {
    return { ok: false, error: 'Ese codigo no genera descuento para este pedido.' };
  }

  return { ok: true, discount: result };
}

async function ensureDiscountSchema(pool) {
  await pool.request().query(`
    IF OBJECT_ID(N'dbo.discount_codes', N'U') IS NULL
    BEGIN
      CREATE TABLE discount_codes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        code NVARCHAR(50) NOT NULL,
        name NVARCHAR(120) NOT NULL,
        description NVARCHAR(500) NULL,
        discount_percent INT NOT NULL,
        max_uses INT NULL,
        used_count INT NOT NULL CONSTRAINT DF_discount_codes_used_count DEFAULT 0,
        starts_at DATETIME2 NULL,
        ends_at DATETIME2 NULL,
        min_subtotal_clp INT NULL,
        active BIT NOT NULL CONSTRAINT DF_discount_codes_active DEFAULT 1,
        created_en DATETIME2 NOT NULL CONSTRAINT DF_discount_codes_created_en DEFAULT GETDATE(),
        updated_en DATETIME2 NOT NULL CONSTRAINT DF_discount_codes_updated_en DEFAULT GETDATE()
      );
    END;
  `);

  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_discount_codes_code' AND object_id = OBJECT_ID('discount_codes'))
      CREATE UNIQUE INDEX UX_discount_codes_code ON discount_codes(code);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_discount_codes_active' AND object_id = OBJECT_ID('discount_codes'))
      CREATE INDEX IX_discount_codes_active ON discount_codes(active, starts_at, ends_at);
  `);

  await pool.request().query(`
    IF COL_LENGTH('pedidos', 'descuento_codigo') IS NULL
      ALTER TABLE pedidos ADD descuento_codigo NVARCHAR(50) NULL;
  `);

  await pool.request().query(`
    IF COL_LENGTH('pedidos', 'descuento_porcentaje') IS NULL
      ALTER TABLE pedidos ADD descuento_porcentaje INT NULL;
  `);

  await pool.request().query(`
    IF COL_LENGTH('pedidos', 'descuento_clp') IS NULL
      ALTER TABLE pedidos ADD descuento_clp INT NOT NULL CONSTRAINT DF_pedidos_descuento_clp DEFAULT 0;
  `);

  await pool.request().query(`
    IF COL_LENGTH('pedidos', 'subtotal_pagado_clp') IS NULL
      ALTER TABLE pedidos ADD subtotal_pagado_clp INT NULL;
  `);

  await pool.request().query(`
    IF COL_LENGTH('pedidos', 'subtotal_pagado_clp') IS NOT NULL
    BEGIN
      UPDATE pedidos
      SET subtotal_pagado_clp = CASE
        WHEN subtotal_pagado_clp IS NULL THEN ISNULL(subtotal_clp, 0) - ISNULL(descuento_clp, 0)
        ELSE subtotal_pagado_clp
      END;
    END
  `);
}

async function findDiscountByCode(request, code) {
  const normalized = normalizeDiscountCode(code);
  if (!normalized) return null;

  const result = await request
    .input('code', sql.NVarChar, normalized)
    .query(`
      SELECT id, code, name, description, discount_percent, max_uses, used_count,
             starts_at, ends_at, min_subtotal_clp, active, created_en, updated_en
      FROM discount_codes
      WHERE code = @code
    `);

  return result.recordset[0] || null;
}

function sanitizeDiscountPayload(payload = {}) {
  const code = normalizeDiscountCode(payload.code);
  const name = String(payload.name || '').trim();
  const description = String(payload.description || '').trim();
  const discountPercent = Math.round(Number(payload.discount_percent || 0));
  const maxUsesRaw = payload.max_uses === '' || payload.max_uses === null || payload.max_uses === undefined
    ? null
    : Math.round(Number(payload.max_uses));
  const minSubtotalRaw = payload.min_subtotal_clp === '' || payload.min_subtotal_clp === null || payload.min_subtotal_clp === undefined
    ? null
    : Math.round(Number(payload.min_subtotal_clp));
  const startsAt = payload.starts_at ? startOfDay(payload.starts_at) : null;
  const endsAt = payload.ends_at ? endOfDay(payload.ends_at) : null;
  const active = payload.active === false ? false : true;

  const errors = [];
  if (!code) errors.push('Debes indicar un codigo.');
  if (!name) errors.push('Debes indicar un nombre interno para la promocion.');
  if (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100) {
    errors.push('El porcentaje de descuento debe estar entre 1 y 100.');
  }
  if (maxUsesRaw !== null && (!Number.isInteger(maxUsesRaw) || maxUsesRaw < 1)) {
    errors.push('La cantidad maxima de usos debe ser un numero mayor o igual a 1.');
  }
  if (minSubtotalRaw !== null && (!Number.isInteger(minSubtotalRaw) || minSubtotalRaw < 0)) {
    errors.push('El subtotal minimo debe ser un numero valido.');
  }
  if (startsAt && endsAt && startsAt > endsAt) {
    errors.push('La fecha de inicio no puede ser posterior a la fecha de termino.');
  }

  return {
    errors,
    values: {
      code,
      name,
      description: description || null,
      discount_percent: discountPercent,
      max_uses: maxUsesRaw,
      starts_at: startsAt,
      ends_at: endsAt,
      min_subtotal_clp: minSubtotalRaw,
      active,
    },
  };
}

module.exports = {
  normalizeDiscountCode,
  validateDiscountRow,
  buildDiscountResult,
  ensureDiscountSchema,
  findDiscountByCode,
  sanitizeDiscountPayload,
};
