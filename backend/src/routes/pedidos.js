const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const ExcelJS = require('exceljs');
const { getPool, sql } = require('../config/db');
const { requireAdminAuth, requireClientAuth } = require('../middleware/auth');
const { quoteShipping } = require('../lib/shipping');
const { readSettings } = require('../lib/siteSettings');
const { normalizeDiscountCode, validateDiscountRow, findDiscountByCode, ensureDiscountSchema } = require('../lib/discounts');
const {
  cleanString,
  normalizeEmail,
  normalizePhone,
  normalizeRut,
  isValidEmail,
  isValidChileanPhone,
  isValidChileanRut,
  validateRequiredText,
} = require('../lib/validation');

const uploadsRoot = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(__dirname, '../../uploads');
const proofUploadsDir = path.join(uploadsRoot, 'comprobantes');
fs.mkdirSync(proofUploadsDir, { recursive: true });

const ORDER_STATUS_COPY = {
  pending_payment: {
    subject: 'Tu pedido Bloomskin está esperando transferencia',
    title: 'Tu pedido está esperando transferencia',
    body: 'Tu pedido ya fue creado y quedó a la espera de tu transferencia bancaria. Cuando subas el comprobante, nuestro equipo podrá revisarlo.',
  },
  payment_submitted: {
    subject: 'Recibimos tu comprobante en Bloomskin',
    title: 'Tu comprobante quedó en revisión',
    body: 'Ya recibimos tu comprobante y tu pedido quedó a la espera de confirmación. Te avisaremos por correo apenas revisemos el pago.',
  },
  paid: {
    subject: 'Tu pago fue confirmado en Bloomskin',
    title: 'Tu pago ya fue validado',
    body: 'Confirmamos tu transferencia y tu pedido ya sigue al siguiente paso de preparación y despacho.',
  },
  shipped: {
    subject: 'Tu pedido Bloomskin va en camino',
    title: 'Tu pedido ya fue despachado',
    body: 'Tu pedido ya salió o está en preparación final para entrega. Puedes seguir revisando su estado desde tu cuenta.',
  },
  delivered: {
    subject: 'Tu pedido Bloomskin fue entregado',
    title: 'Tu pedido fue marcado como entregado',
    body: 'Tu pedido ya aparece como entregado. Esperamos que disfrutes tu compra y tu rutina K-Beauty.',
  },
  cancelled: {
    subject: 'Tu pedido Bloomskin fue cancelado',
    title: 'Tu pedido fue cancelado',
    body: 'Tu pedido fue cancelado. Si necesitas ayuda o quieres revisar una nueva compra, escríbenos y te acompañamos.',
  },
};

const INVENTORY_COMMITTED_STATES = new Set(['paid', 'shipped', 'delivered']);
const MANUAL_SALES_CLIENT_EMAIL = 'ventas-manuales@bloomskin.local';
const CHECKOUT_RESERVATION_MINUTES = 20;
const PAYMENT_PROOF_WINDOW_MINUTES = 60;
const MAX_PROOF_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROOF_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/bmp',
  'image/tiff',
]);
const ALLOWED_PROOF_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.bmp', '.tif', '.tiff']);

const proofStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, proofUploadsDir),
  filename: (_req, file, cb) => {
    const safeBase = path.basename(file.originalname, path.extname(file.originalname))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'comprobante';
    cb(null, `${Date.now()}-${safeBase}${path.extname(file.originalname).toLowerCase() || '.png'}`);
  },
});

const uploadProof = multer({
  storage: proofStorage,
  limits: { fileSize: MAX_PROOF_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    const mimetype = String(file.mimetype || '').toLowerCase();
    const extension = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_PROOF_MIME_TYPES.has(mimetype) || !ALLOWED_PROOF_EXTENSIONS.has(extension)) {
      cb(new Error('El comprobante debe ser una imagen JPG, PNG, WebP, HEIC, BMP o TIFF. No se permiten videos, GIF ni PDF.'));
      return;
    }
    cb(null, true);
  },
});

function handleProofUpload(req, res, next) {
  uploadProof.single('comprobante')(req, res, err => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El comprobante no puede pesar más de 5 MB.' });
    }

    return res.status(400).json({
      error: err.message || 'No pudimos leer el comprobante. Sube una imagen válida.',
    });
  });
}

function getTransferConfig() {
  const settings = readSettings();
  const configuredTransfer = settings.payment || {};
  const transfer = {
    bank_name: configuredTransfer.bank_name || process.env.BANK_NAME || 'Banco por definir',
    account_type: configuredTransfer.account_type || process.env.BANK_ACCOUNT_TYPE || 'Cuenta corriente',
    account_number: configuredTransfer.account_number || process.env.BANK_ACCOUNT_NUMBER || '',
    account_holder: configuredTransfer.account_holder || process.env.BANK_ACCOUNT_HOLDER || 'Bloomskin',
    account_rut: configuredTransfer.account_rut || process.env.BANK_ACCOUNT_RUT || '',
    transfer_email: configuredTransfer.transfer_email || process.env.BANK_TRANSFER_EMAIL || process.env.SMTP_FROM || '',
    instructions: configuredTransfer.instructions || process.env.BANK_TRANSFER_INSTRUCTIONS || 'Transfiere el total exacto del pedido y usa el numero de pedido como asunto o referencia. Luego sube tu comprobante para validarlo en Bloomskin.',
  };
  const missing_fields = [
    !cleanString(transfer.bank_name) || transfer.bank_name === 'Banco por definir' ? 'bank_name' : null,
    !cleanString(transfer.account_number) ? 'account_number' : null,
    !cleanString(transfer.account_rut) ? 'account_rut' : null,
    !normalizeEmail(transfer.transfer_email) || !isValidEmail(transfer.transfer_email) ? 'transfer_email' : null,
  ].filter(Boolean);

  return {
    ...transfer,
    is_complete: missing_fields.length === 0,
    missing_fields,
  };
}

function orderCodeFromId(id) {
  return 'BS-' + String(id).padStart(4, '0');
}

function normalizeToneOptions(value) {
  try {
    const raw = Array.isArray(value) ? value : JSON.parse(String(value || '[]'));
    return [...new Set(raw.map(entry => cleanString(entry)).filter(Boolean))].slice(0, 40);
  } catch {
    return [];
  }
}

function normalizeToneStock(value, tones = [], fallbackStock = 0) {
  let parsed = {};
  if (value) {
    try {
      parsed = typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      parsed = {};
    }
  }
  const clean = {};
  for (const tone of tones) {
    clean[tone] = Math.max(0, Math.floor(Number(parsed?.[tone] || 0)));
  }
  const hasExplicitStock = tones.some(tone => Object.prototype.hasOwnProperty.call(parsed || {}, tone));
  if (!hasExplicitStock && tones.length) {
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

function sumToneStock(toneStock) {
  return Object.values(toneStock || {}).reduce((sum, value) => sum + Math.max(0, Math.floor(Number(value || 0))), 0);
}

function normalizeToneSelection(value) {
  return cleanString(value) || null;
}

async function adjustProductStock(transaction, { productoId, cantidad, tonoSeleccionado = null, direction }) {
  const delta = Number(direction) * Number(cantidad);
  const productResult = await new sql.Request(transaction)
    .input('producto_id', sql.Int, productoId)
    .query(`
      SELECT id, nombre, stock, usa_tonos, tonos_json, tonos_stock_json
      FROM productos WITH (UPDLOCK, ROWLOCK)
      WHERE id = @producto_id
    `);

  const product = productResult.recordset[0];
  if (!product) {
    return { ok: false, error: `Producto ${productoId} no encontrado.` };
  }

  const tones = normalizeToneOptions(product.tonos_json);
  if (product.usa_tonos && tones.length) {
    if (!tonoSeleccionado) {
      return { ok: false, error: `Debes elegir un tipo para ${product.nombre}.` };
    }
    if (!tones.includes(tonoSeleccionado)) {
      return { ok: false, error: `El tipo seleccionado para ${product.nombre} ya no está disponible.` };
    }

    const toneStock = normalizeToneStock(product.tonos_stock_json, tones, product.stock);
    const currentToneStock = Number(toneStock[tonoSeleccionado] || 0);
    if (delta < 0 && currentToneStock < Math.abs(delta)) {
      return { ok: false, error: `No hay stock suficiente para ${product.nombre} en ${tonoSeleccionado}.` };
    }

    toneStock[tonoSeleccionado] = Math.max(0, currentToneStock + delta);
    const totalStock = sumToneStock(toneStock);
    await new sql.Request(transaction)
      .input('producto_id', sql.Int, productoId)
      .input('stock', sql.Int, totalStock)
      .input('tonos_stock_json', sql.NVarChar(sql.MAX), JSON.stringify(toneStock))
      .query(`
        UPDATE productos
        SET stock = @stock,
            tonos_stock_json = @tonos_stock_json,
            actualizado_en = GETDATE()
        WHERE id = @producto_id
      `);
    return { ok: true, product: { ...product, stock: totalStock, tonos_stock: toneStock } };
  }

  const currentStock = Number(product.stock || 0);
  if (delta < 0 && currentStock < Math.abs(delta)) {
    return { ok: false, error: `No hay stock suficiente para ${product.nombre}.` };
  }

  await new sql.Request(transaction)
    .input('producto_id', sql.Int, productoId)
    .input('stock', sql.Int, Math.max(0, currentStock + delta))
    .query(`
      UPDATE productos
      SET stock = @stock,
          actualizado_en = GETDATE()
      WHERE id = @producto_id
    `);

  return { ok: true, product };
}

async function ensurePedidosSchema(pool) {
  await ensureDiscountSchema(pool);
  await pool.request().batch(`
    IF COL_LENGTH('pedidos', 'origen') IS NULL
    BEGIN
      ALTER TABLE pedidos
      ADD origen NVARCHAR(20) NOT NULL
        CONSTRAINT DF_pedidos_origen DEFAULT 'store';
    END;

    IF COL_LENGTH('pedidos', 'stock_comprometido') IS NULL
    BEGIN
      ALTER TABLE pedidos
      ADD stock_comprometido BIT NOT NULL
        CONSTRAINT DF_pedidos_stock_comprometido DEFAULT 0;
    END;

    IF COL_LENGTH('pedidos', 'reserva_expira_en') IS NULL
      ALTER TABLE pedidos ADD reserva_expira_en DATETIME2 NULL;

    IF COL_LENGTH('pedidos', 'comprobante_limite_en') IS NULL
      ALTER TABLE pedidos ADD comprobante_limite_en DATETIME2 NULL;

    IF COL_LENGTH('pedidos', 'eliminado_en') IS NULL
      ALTER TABLE pedidos ADD eliminado_en DATETIME2 NULL;

    IF OBJECT_ID(N'dbo.checkout_reservations', N'U') IS NULL
    BEGIN
      CREATE TABLE checkout_reservations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        expires_en DATETIME2 NOT NULL,
        created_en DATETIME2 NOT NULL CONSTRAINT DF_checkout_reservations_created_en DEFAULT SYSUTCDATETIME(),
        updated_en DATETIME2 NOT NULL CONSTRAINT DF_checkout_reservations_updated_en DEFAULT SYSUTCDATETIME()
      );

      CREATE UNIQUE INDEX UX_checkout_reservations_cliente_id ON checkout_reservations(cliente_id);
      CREATE INDEX IX_checkout_reservations_expires_en ON checkout_reservations(expires_en);
    END;

    IF OBJECT_ID(N'dbo.checkout_reservation_items', N'U') IS NULL
    BEGIN
      CREATE TABLE checkout_reservation_items (
        id INT IDENTITY(1,1) PRIMARY KEY,
        reservation_id INT NOT NULL REFERENCES checkout_reservations(id) ON DELETE CASCADE,
        producto_id INT NOT NULL REFERENCES productos(id),
        cantidad INT NOT NULL,
        tono_seleccionado NVARCHAR(120) NULL
      );

      CREATE INDEX IX_checkout_reservation_items_reservation_id ON checkout_reservation_items(reservation_id);
    END;

    IF COL_LENGTH('checkout_reservation_items', 'tono_seleccionado') IS NULL
      ALTER TABLE checkout_reservation_items ADD tono_seleccionado NVARCHAR(120) NULL;

    IF COL_LENGTH('pedido_items', 'tono_seleccionado') IS NULL
      ALTER TABLE pedido_items ADD tono_seleccionado NVARCHAR(120) NULL;

    IF COL_LENGTH('productos', 'tonos_stock_json') IS NULL
      ALTER TABLE productos ADD tonos_stock_json NVARCHAR(MAX) NULL;
  `);
}

async function getOrCreateManualSalesClient(transaction) {
  const lookup = await new sql.Request(transaction)
    .input('email', sql.NVarChar, MANUAL_SALES_CLIENT_EMAIL)
    .query(`
      SELECT TOP 1 id
      FROM clientes
      WHERE email = @email
    `);

  if (lookup.recordset[0]?.id) {
    return lookup.recordset[0].id;
  }

  const insert = await new sql.Request(transaction)
    .input('nombre', sql.NVarChar, 'Ventas manuales Bloomskin')
    .input('email', sql.NVarChar, MANUAL_SALES_CLIENT_EMAIL)
    .query(`
      INSERT INTO clientes (nombre, email, password_hash, notas)
      OUTPUT INSERTED.id
      VALUES (@nombre, @email, NULL, 'Cliente tecnico para registrar ventas externas desde admin')
    `);

  return insert.recordset[0].id;
}

function normalizeManualSaleDate(value) {
  if (!value) return null;
  const candidate = new Date(String(value));
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}

async function getActiveReservation(transaction, clienteId) {
  const reservationResult = await new sql.Request(transaction)
    .input('cliente_id', sql.Int, clienteId)
    .query(`
      SELECT TOP 1 id, cliente_id, expires_en, created_en, updated_en
      FROM checkout_reservations
      WHERE cliente_id = @cliente_id
      ORDER BY id DESC
    `);

  const reservation = reservationResult.recordset[0];
  if (!reservation) return null;

  const itemsResult = await new sql.Request(transaction)
    .input('reservation_id', sql.Int, reservation.id)
    .query(`
      SELECT ri.producto_id, ri.cantidad, p.nombre, p.marca
           , ri.tono_seleccionado
      FROM checkout_reservation_items ri
      JOIN productos p ON p.id = ri.producto_id
      WHERE ri.reservation_id = @reservation_id
      ORDER BY ri.id ASC
    `);

  reservation.items = itemsResult.recordset;
  return reservation;
}

async function releaseReservation(transaction, reservationId) {
  const itemsResult = await new sql.Request(transaction)
    .input('reservation_id', sql.Int, reservationId)
    .query(`
      SELECT producto_id, cantidad, tono_seleccionado
      FROM checkout_reservation_items
      WHERE reservation_id = @reservation_id
    `);

  for (const item of itemsResult.recordset) {
    await adjustProductStock(transaction, {
      productoId: item.producto_id,
      cantidad: item.cantidad,
      tonoSeleccionado: item.tono_seleccionado,
      direction: 1,
    });
  }

  await new sql.Request(transaction)
    .input('reservation_id', sql.Int, reservationId)
    .query(`
      DELETE FROM checkout_reservation_items WHERE reservation_id = @reservation_id;
      DELETE FROM checkout_reservations WHERE id = @reservation_id;
    `);
}

function normalizeReservationItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map(item => ({
      producto_id: Number(item?.producto_id),
      cantidad: Number(item?.cantidad),
      tono_seleccionado: normalizeToneSelection(item?.tono_seleccionado),
    }))
    .filter(item => Number.isInteger(item.producto_id) && Number.isInteger(item.cantidad) && item.cantidad > 0);
}

function sameReservationItems(leftItems, rightItems) {
  const normalize = list => [...list]
    .map(item => `${Number(item.producto_id)}:${Number(item.cantidad)}:${normalizeToneSelection(item.tono_seleccionado) || ''}`)
    .sort();
  const left = normalize(leftItems || []);
  const right = normalize(rightItems || []);
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function formatReservationPayload(reservation) {
  if (!reservation) return null;
  return {
    id: reservation.id,
    cliente_id: reservation.cliente_id,
    expires_en: reservation.expires_en,
    expires_in_seconds: Math.max(0, Math.floor((new Date(reservation.expires_en).getTime() - Date.now()) / 1000)),
    items: reservation.items || [],
  };
}

async function cleanupExpiredReservations(pool) {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const expired = await new sql.Request(transaction).query(`
      SELECT id
      FROM checkout_reservations
      WHERE expires_en <= SYSUTCDATETIME()
    `);

    for (const reservation of expired.recordset) {
      await releaseReservation(transaction, reservation.id);
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

async function cleanupExpiredPendingOrders(pool) {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const expiredOrders = await new sql.Request(transaction).query(`
      SELECT id, cliente_nombre, cliente_email, total_clp
      FROM pedidos
      WHERE estado = 'pending_payment'
        AND stock_comprometido = 1
        AND comprobante_url IS NULL
        AND comprobante_limite_en IS NOT NULL
        AND comprobante_limite_en <= SYSUTCDATETIME()
    `);

    for (const order of expiredOrders.recordset) {
      const itemsResult = await new sql.Request(transaction)
        .input('pedido_id', sql.Int, order.id)
        .query(`
          SELECT producto_id, cantidad, tono_seleccionado
          FROM pedido_items
          WHERE pedido_id = @pedido_id
        `);

      for (const item of itemsResult.recordset) {
        await adjustProductStock(transaction, {
          productoId: item.producto_id,
          cantidad: item.cantidad,
          tonoSeleccionado: item.tono_seleccionado,
          direction: 1,
        });
      }

      await new sql.Request(transaction)
        .input('pedido_id', sql.Int, order.id)
        .query(`
          UPDATE pedidos
          SET estado = 'cancelled',
              stock_comprometido = 0,
              actualizado_en = GETDATE(),
              notas = CONCAT(ISNULL(notas, ''), CASE WHEN notas IS NULL OR notas = '' THEN '' ELSE CHAR(10) END, 'Cancelado automaticamente por no subir comprobante dentro de 1 hora.')
          WHERE id = @pedido_id
        `);
    }

    await transaction.commit();
    return expiredOrders.recordset;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

async function runOrderMaintenance() {
  const pool = await getPool();
  await ensurePedidosSchema(pool);
  await cleanupExpiredReservations(pool);
  const cancelledOrders = await cleanupExpiredPendingOrders(pool);

  for (const order of cancelledOrders) {
    try {
      await sendOrderStatusEmail({
        pedidoId: Number(order.id),
        codigo: orderCodeFromId(order.id),
        clienteNombre: order.cliente_nombre,
        clienteEmail: order.cliente_email,
        estado: 'cancelled',
        totalClp: order.total_clp,
      });
    } catch (mailError) {
      console.error('No se pudo enviar el correo de cancelacion automatica', mailError);
    }
  }
}

function parseMonthRange(monthParam) {
  const match = String(monthParam || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { year, month, start, end };
}

function excelDate(value) {
  if (!value) return '';
  return new Date(value);
}

function createMailer() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function getStoreBaseUrl() {
  return String(
    process.env.STORE_BASE_URL
    || process.env.PUBLIC_APP_URL
    || 'https://www.bloomskin.cl'
  ).replace(/\/$/, '');
}

async function sendOrderStatusEmail({ pedidoId, codigo, clienteNombre, clienteEmail, estado, totalClp }) {
  const mailer = createMailer();
  const copy = ORDER_STATUS_COPY[estado];
  const email = normalizeEmail(clienteEmail);
  if (!mailer || !copy || !isValidEmail(email)) return false;

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const accountUrl = `${getStoreBaseUrl()}/mi-cuenta#mis-pedidos`;
  const safeName = cleanString(clienteNombre) || 'clienta';
  const amount = '$' + Number(totalClp || 0).toLocaleString('es-CL');

  await mailer.sendMail({
    from,
    to: email,
    subject: copy.subject,
    text: [
      `Hola ${safeName},`,
      '',
      `${copy.title}.`,
      copy.body,
      '',
      `Pedido: ${codigo || orderCodeFromId(pedidoId)}`,
      `Total: ${amount}`,
      `Revisa tu cuenta aquí: ${accountUrl}`,
    ].join('\n'),
    html: `
      <div style="margin:0;padding:28px 14px;background:#f8eef2;">
        <div style="max-width:620px;margin:0 auto;background:#fffafc;border:1px solid rgba(191,84,122,.14);border-radius:26px;overflow:hidden;font-family:Arial,sans-serif;color:#4a3240;">
          <div style="padding:28px 30px;background:linear-gradient(135deg,#fff3f7 0%,#f7e9ef 55%,#f0dde4 100%);border-bottom:1px solid rgba(191,84,122,.12);">
            <div style="font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#bf547a;font-weight:700;">Bloomskin</div>
            <h1 style="margin:12px 0 8px;font-family:Georgia,serif;font-size:38px;line-height:1;color:#3d2833;font-weight:500;">${copy.title}</h1>
            <p style="margin:0;font-size:15px;line-height:1.8;color:#6e5560;">Hola ${safeName}, ${copy.body}</p>
          </div>
          <div style="padding:26px 30px 30px;">
            <div style="display:grid;gap:10px;padding:18px;border-radius:20px;background:#fff;border:1px solid rgba(191,84,122,.1);">
              <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#bf547a;font-weight:700;">Resumen del pedido</div>
              <div style="font-size:15px;color:#4a3240;"><strong>Código:</strong> ${codigo || orderCodeFromId(pedidoId)}</div>
              <div style="font-size:15px;color:#4a3240;"><strong>Total:</strong> ${amount}</div>
            </div>
            <div style="margin-top:22px;text-align:center;">
              <a href="${accountUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#bf547a;color:#fff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;">Ver mis pedidos</a>
            </div>
          </div>
        </div>
      </div>
    `,
  });

  return true;
}

router.get('/', requireAdminAuth, async (_req, res) => {
  try {
    const pool = await getPool();
    await ensurePedidosSchema(pool);
    const result = await pool.request().query(`
      SELECT p.id, p.subtotal_clp, p.subtotal_pagado_clp, p.descuento_codigo, p.descuento_porcentaje, p.descuento_clp,
             p.envio_clp, p.total_clp, p.metodo_pago, p.metodo_envio,
             p.cliente_nombre, p.cliente_email, p.cliente_rut, p.cliente_telefono,
             p.region_envio, p.ciudad_envio, p.direccion_envio, p.referencia_envio, p.distancia_envio_km,
             p.estado, p.comprobante_url, p.notas, p.origen,
             p.creado_en, p.actualizado_en,
             c.nombre AS cliente_nombre_actual, c.email AS cliente_email_actual,
             c.rut AS cliente_rut_actual, c.telefono AS cliente_telefono_actual,
             c.direccion AS cliente_direccion_actual, c.ciudad AS cliente_ciudad_actual,
             c.region AS cliente_region_actual
      FROM pedidos p
      JOIN clientes c ON c.id = p.cliente_id
      WHERE p.eliminado_en IS NULL
      ORDER BY p.creado_en DESC
    `);

    const pedidos = result.recordset;
    for (const ped of pedidos) {
      const items = await pool.request()
        .input('pedido_id', sql.Int, ped.id)
        .query(`
          SELECT pi.producto_id, pi.cantidad, pi.precio_unitario_clp, pi.tono_seleccionado,
                 pr.nombre AS producto_nombre, pr.marca AS producto_marca
          FROM pedido_items pi
          JOIN productos pr ON pr.id = pi.producto_id
          WHERE pi.pedido_id = @pedido_id
        `);
      ped.items = items.recordset;
      ped.codigo = orderCodeFromId(ped.id);
    }

    res.json(pedidos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

router.get('/stats', requireAdminAuth, async (_req, res) => {
  try {
    const pool = await getPool();
    await ensurePedidosSchema(pool);
    const result = await pool.request().query(`
      SELECT
        COUNT(CASE WHEN estado <> 'cancelled' THEN 1 END) AS total_pedidos,
        COALESCE(SUM(CASE WHEN estado IN ('paid', 'shipped', 'delivered') THEN total_clp ELSE 0 END), 0) AS ventas_totales,
        COALESCE(SUM(CASE WHEN estado IN ('paid', 'shipped', 'delivered')
                          AND MONTH(creado_en) = MONTH(GETDATE())
                          AND YEAR(creado_en) = YEAR(GETDATE())
                          THEN total_clp ELSE 0 END), 0) AS ventas_mes,
        COUNT(CASE WHEN estado = 'pending_payment' THEN 1 END) AS pendientes_pago,
        COUNT(CASE WHEN estado = 'payment_submitted' THEN 1 END) AS pagos_por_validar,
        COUNT(CASE WHEN estado = 'paid' THEN 1 END) AS pagados,
        COUNT(CASE WHEN estado = 'shipped' THEN 1 END) AS enviados,
        COUNT(CASE WHEN estado = 'delivered' THEN 1 END) AS entregados,
        COUNT(CASE WHEN estado = 'cancelled' THEN 1 END) AS cancelados
      FROM pedidos
      WHERE eliminado_en IS NULL
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener stats' });
  }
});

router.get('/export/monthly', requireAdminAuth, async (req, res) => {
  const range = parseMonthRange(req.query.month);
  if (!range) {
    return res.status(400).json({ error: 'Debes indicar el mes en formato YYYY-MM.' });
  }

  try {
    const pool = await getPool();
    await ensurePedidosSchema(pool);
    const ordersResult = await pool.request()
      .input('start_date', sql.DateTime2, range.start)
      .input('end_date', sql.DateTime2, range.end)
      .query(`
        SELECT p.id, p.subtotal_clp, p.subtotal_pagado_clp, p.descuento_codigo, p.descuento_porcentaje, p.descuento_clp, p.origen,
               p.envio_clp, p.total_clp, p.metodo_pago, p.metodo_envio,
               p.cliente_nombre, p.cliente_email, p.cliente_rut, p.cliente_telefono,
               p.region_envio, p.ciudad_envio, p.direccion_envio, p.referencia_envio, p.distancia_envio_km,
               p.estado, p.comprobante_url, p.comprobante_limite_en, p.notas, p.creado_en, p.actualizado_en
        FROM pedidos p
        WHERE p.creado_en >= @start_date
          AND p.creado_en < @end_date
          AND p.eliminado_en IS NULL
          AND p.estado IN ('paid', 'shipped', 'delivered')
        ORDER BY p.creado_en ASC, p.id ASC
      `);

    const orders = ordersResult.recordset;
    for (const order of orders) {
      const items = await pool.request()
        .input('pedido_id', sql.Int, order.id)
        .query(`
          SELECT pi.producto_id, pi.cantidad, pi.precio_unitario_clp, pi.tono_seleccionado,
                 pr.nombre AS producto_nombre, pr.marca AS producto_marca
          FROM pedido_items pi
          JOIN productos pr ON pr.id = pi.producto_id
          WHERE pi.pedido_id = @pedido_id
          ORDER BY pr.marca, pr.nombre
        `);
      order.items = items.recordset;
      order.codigo = orderCodeFromId(order.id);
    }

    const summary = orders.reduce((acc, order) => {
      acc.totalPedidos += 1;
      acc.totalVentas += Number(order.total_clp || 0);
      acc.totalEnvio += Number(order.envio_clp || 0);
      acc.totalSubtotal += Number(order.subtotal_clp || 0);
      acc.byStatus[order.estado] = (acc.byStatus[order.estado] || 0) + 1;
      return acc;
    }, {
      totalPedidos: 0,
      totalVentas: 0,
      totalEnvio: 0,
      totalSubtotal: 0,
      byStatus: {},
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Bloomskin';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('Resumen mensual');
    summarySheet.columns = [
      { header: 'Métrica', key: 'metric', width: 32 },
      { header: 'Valor', key: 'value', width: 22 },
    ];
    summarySheet.addRows([
      { metric: 'Mes', value: `${range.year}-${String(range.month).padStart(2, '0')}` },
      { metric: 'Pedidos', value: summary.totalPedidos },
      { metric: 'Subtotal vendido', value: summary.totalSubtotal },
      { metric: 'Cobrado por envío', value: summary.totalEnvio },
      { metric: 'Ventas totales', value: summary.totalVentas },
      { metric: 'Ventas web', value: orders.filter(order => (order.origen || 'store') === 'store').length },
      { metric: 'Ventas externas', value: orders.filter(order => order.origen === 'manual').length },
      { metric: 'Esperando transferencia', value: summary.byStatus.pending_payment || 0 },
      { metric: 'Comprobante recibido', value: summary.byStatus.payment_submitted || 0 },
      { metric: 'Pago validado', value: summary.byStatus.paid || 0 },
      { metric: 'Enviado', value: summary.byStatus.shipped || 0 },
      { metric: 'Entregado', value: summary.byStatus.delivered || 0 },
      { metric: 'Cancelado', value: summary.byStatus.cancelled || 0 },
    ]);

    const ordersSheet = workbook.addWorksheet('Pedidos');
    ordersSheet.columns = [
      { header: 'Código', key: 'codigo', width: 14 },
      { header: 'Origen', key: 'origen_label', width: 18 },
      { header: 'Fecha', key: 'creado_en', width: 20 },
      { header: 'Cliente', key: 'cliente_nombre', width: 24 },
      { header: 'Email', key: 'cliente_email', width: 28 },
      { header: 'Teléfono', key: 'cliente_telefono', width: 18 },
      { header: 'Estado', key: 'estado', width: 20 },
      { header: 'Subtotal', key: 'subtotal_clp', width: 14 },
      { header: 'Envío', key: 'envio_clp', width: 14 },
      { header: 'Total', key: 'total_clp', width: 14 },
      { header: 'Pago', key: 'metodo_pago', width: 18 },
      { header: 'Despacho', key: 'metodo_envio', width: 18 },
      { header: 'Ciudad', key: 'ciudad_envio', width: 18 },
      { header: 'Región', key: 'region_envio', width: 18 },
      { header: 'Dirección', key: 'direccion_envio', width: 32 },
      { header: 'Referencia', key: 'referencia_envio', width: 24 },
      { header: 'KM', key: 'distancia_envio_km', width: 10 },
      { header: 'Comprobante', key: 'comprobante_url', width: 30 },
      { header: 'Notas', key: 'notas', width: 28 },
    ];

    orders.forEach(order => {
      ordersSheet.addRow({
        ...order,
        origen_label: order.origen === 'manual' ? 'Venta externa' : 'Tienda web',
        creado_en: excelDate(order.creado_en),
      });
    });

    const itemsSheet = workbook.addWorksheet('Productos por pedido');
    itemsSheet.columns = [
      { header: 'Código pedido', key: 'codigo', width: 14 },
      { header: 'Fecha', key: 'creado_en', width: 20 },
      { header: 'Cliente', key: 'cliente_nombre', width: 24 },
      { header: 'Marca', key: 'producto_marca', width: 20 },
      { header: 'Producto', key: 'producto_nombre', width: 36 },
      { header: 'Tipo', key: 'tono_seleccionado', width: 20 },
      { header: 'Cantidad', key: 'cantidad', width: 12 },
      { header: 'Precio unitario', key: 'precio_unitario_clp', width: 16 },
      { header: 'Total línea', key: 'line_total', width: 16 },
    ];

    orders.forEach(order => {
      (order.items || []).forEach(item => {
        itemsSheet.addRow({
          codigo: order.codigo,
          creado_en: excelDate(order.creado_en),
          cliente_nombre: order.cliente_nombre,
          producto_marca: item.producto_marca,
          producto_nombre: item.producto_nombre,
          tono_seleccionado: item.tono_seleccionado || '',
          cantidad: item.cantidad,
          precio_unitario_clp: item.precio_unitario_clp,
          line_total: Number(item.cantidad || 0) * Number(item.precio_unitario_clp || 0),
        });
      });
    });

    [ordersSheet, itemsSheet].forEach(sheet => {
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
      if (sheet === ordersSheet) {
        ['H', 'I', 'J'].forEach(column => {
          sheet.getColumn(column).numFmt = '"$"#,##0';
        });
      }
      if (sheet === itemsSheet) {
        sheet.getColumn('H').numFmt = '"$"#,##0';
        sheet.getColumn('I').numFmt = '"$"#,##0';
      }
      if (sheet.getColumn('B')) {
        sheet.getColumn('B').numFmt = 'dd-mm-yyyy hh:mm';
      }
    });
    summarySheet.getRow(1).font = { bold: true };

    const filename = `bloomskin-ventas-${range.year}-${String(range.month).padStart(2, '0')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo exportar el reporte mensual.' });
  }
});

router.get('/mine', requireClientAuth, async (req, res) => {
  try {
    const pool = await getPool();
    await ensurePedidosSchema(pool);
    const result = await pool.request()
      .input('cliente_id', sql.Int, req.user.id)
      .query(`
        SELECT p.id, p.subtotal_clp, p.subtotal_pagado_clp, p.descuento_codigo, p.descuento_porcentaje, p.descuento_clp,
               p.envio_clp, p.total_clp, p.metodo_pago, p.metodo_envio,
               p.cliente_nombre, p.cliente_email, p.cliente_rut, p.cliente_telefono,
               p.region_envio, p.ciudad_envio, p.direccion_envio, p.referencia_envio, p.distancia_envio_km,
               p.estado, p.comprobante_url, p.notas, p.creado_en, p.actualizado_en
        FROM pedidos p
        WHERE p.cliente_id = @cliente_id
        ORDER BY p.creado_en DESC
      `);

    const pedidos = result.recordset;
    for (const pedido of pedidos) {
      const items = await pool.request()
        .input('pedido_id', sql.Int, pedido.id)
        .query(`
          SELECT pi.producto_id, pi.cantidad, pi.precio_unitario_clp, pi.tono_seleccionado,
                 pr.nombre AS producto_nombre, pr.marca AS producto_marca
          FROM pedido_items pi
          JOIN productos pr ON pr.id = pi.producto_id
          WHERE pi.pedido_id = @pedido_id
        `);
      pedido.items = items.recordset;
      pedido.codigo = orderCodeFromId(pedido.id);
    }

    res.json(pedidos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener tus pedidos' });
  }
});

router.get('/reservation/current', requireClientAuth, async (req, res) => {
  try {
    const pool = await getPool();
    await ensurePedidosSchema(pool);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    const reservation = await getActiveReservation(transaction, req.user.id);
    if (!reservation) {
      await transaction.commit();
      return res.json({ reservation: null });
    }

    if (new Date(reservation.expires_en).getTime() <= Date.now()) {
      await releaseReservation(transaction, reservation.id);
      await transaction.commit();
      return res.json({ reservation: null });
    }

    await transaction.commit();
    res.json({ reservation: formatReservationPayload(reservation) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo obtener la reserva activa.' });
  }
});

router.post('/reservation', requireClientAuth, async (req, res) => {
  const items = normalizeReservationItems(req.body?.items);
  if (!items.length) {
    return res.status(400).json({ error: 'Debes indicar al menos un producto para reservar.' });
  }

  let transaction;
  let transactionClosed = false;
  try {
    const pool = await getPool();
    await ensurePedidosSchema(pool);
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const existingReservation = await getActiveReservation(transaction, req.user.id);
    if (existingReservation) {
      if (new Date(existingReservation.expires_en).getTime() <= Date.now()) {
        await releaseReservation(transaction, existingReservation.id);
      } else if (sameReservationItems(existingReservation.items, items)) {
        await transaction.commit();
        transactionClosed = true;
        return res.status(200).json({ reservation: formatReservationPayload(existingReservation) });
      } else {
        await releaseReservation(transaction, existingReservation.id);
      }
    }

    const reservationResult = await new sql.Request(transaction)
      .input('cliente_id', sql.Int, req.user.id)
      .query(`
        INSERT INTO checkout_reservations (cliente_id, expires_en, created_en, updated_en)
        OUTPUT INSERTED.id, INSERTED.cliente_id, INSERTED.expires_en
        VALUES (@cliente_id, DATEADD(MINUTE, ${CHECKOUT_RESERVATION_MINUTES}, SYSUTCDATETIME()), SYSUTCDATETIME(), SYSUTCDATETIME())
      `);

    const reservation = reservationResult.recordset[0];

    for (const item of items) {
      const productResult = await new sql.Request(transaction)
        .input('producto_id', sql.Int, item.producto_id)
        .query(`
          SELECT id, nombre, marca, stock, usa_tonos, tonos_json, tonos_stock_json
          FROM productos WITH (UPDLOCK, ROWLOCK)
          WHERE id = @producto_id AND activo = 1
        `);

      const product = productResult.recordset[0];
      if (!product) {
        await transaction.rollback();
        transactionClosed = true;
        return res.status(400).json({ error: `Producto ${item.producto_id} no encontrado.` });
      }

      const availableTones = normalizeToneOptions(product.tonos_json);
      if (product.usa_tonos && !item.tono_seleccionado) {
        await transaction.rollback();
        transactionClosed = true;
        return res.status(400).json({ error: `Debes elegir un tipo para ${product.nombre}.` });
      }
      if (item.tono_seleccionado && product.usa_tonos && !availableTones.includes(item.tono_seleccionado)) {
        await transaction.rollback();
        transactionClosed = true;
        return res.status(400).json({ error: `El tipo seleccionado para ${product.nombre} ya no está disponible.` });
      }
      if (!product.usa_tonos) {
        item.tono_seleccionado = null;
      }

      const toneStock = normalizeToneStock(product.tonos_stock_json, availableTones, product.stock);
      const availableStock = product.usa_tonos ? Number(toneStock[item.tono_seleccionado] || 0) : Number(product.stock || 0);
      if (availableStock < item.cantidad) {
        await transaction.rollback();
        transactionClosed = true;
        return res.status(409).json({ error: product.usa_tonos ? `No hay stock suficiente para ${product.nombre} en ${item.tono_seleccionado}.` : `No hay stock suficiente para ${product.nombre}.` });
      }

      await new sql.Request(transaction)
        .input('reservation_id', sql.Int, reservation.id)
        .input('producto_id', sql.Int, item.producto_id)
        .input('cantidad', sql.Int, item.cantidad)
        .input('tono_seleccionado', sql.NVarChar, item.tono_seleccionado)
        .query(`
          INSERT INTO checkout_reservation_items (reservation_id, producto_id, cantidad, tono_seleccionado)
          VALUES (@reservation_id, @producto_id, @cantidad, @tono_seleccionado)
        `);

      const stockUpdate = await adjustProductStock(transaction, {
        productoId: item.producto_id,
        cantidad: item.cantidad,
        tonoSeleccionado: item.tono_seleccionado,
        direction: -1,
      });
      if (!stockUpdate.ok) {
        await transaction.rollback();
        transactionClosed = true;
        return res.status(409).json({ error: stockUpdate.error });
      }
    }

    reservation.items = items;
    await transaction.commit();
    transactionClosed = true;
    res.status(201).json({ reservation: formatReservationPayload(reservation) });
  } catch (err) {
    if (transaction && !transactionClosed) {
      try {
        await transaction.rollback();
      } catch (_) {}
    }
    console.error(err);
    res.status(500).json({ error: 'No se pudo reservar tu carrito.' });
  }
});

router.delete('/reservation/current', requireClientAuth, async (req, res) => {
  try {
    const pool = await getPool();
    await ensurePedidosSchema(pool);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    const reservation = await getActiveReservation(transaction, req.user.id);
    if (reservation) {
      await releaseReservation(transaction, reservation.id);
    }
    await transaction.commit();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo liberar la reserva.' });
  }
});

router.get('/payment-config', async (_req, res) => {
  res.json({
    method: 'bank_transfer',
    transfer: getTransferConfig(),
  });
});

router.post('/shipping-quote', async (req, res) => {
  try {
    const ciudad = cleanString(req.body?.ciudad);
    const direccion = cleanString(req.body?.direccion);
    const subtotalClp = Number(req.body?.subtotal_clp || 0);
    const ciudadError = validateRequiredText(ciudad, 'Ciudad', 2);
    const direccionError = validateRequiredText(direccion, 'Dirección', 6);
    if (ciudadError || direccionError || subtotalClp < 0) {
      return res.status(400).json({ error: ciudadError || direccionError || 'Subtotal inválido' });
    }

    const quote = await quoteShipping({
      ciudad,
      direccion,
      subtotal_clp: subtotalClp,
    });
    res.json(quote);
  } catch (err) {
    res.status(400).json({ error: err.message || 'No se pudo calcular el envío' });
  }
});

router.post('/', requireClientAuth, async (req, res) => {
  const {
    items,
    notas,
    metodo_pago,
    delivery_mode,
    discount_code,
    ciudad_envio,
    direccion_envio,
    referencia_envio,
    region_envio,
  } = req.body;
  const resolvedClienteId = req.user.id;
  const deliveryMode = cleanString(delivery_mode) === 'pickup' ? 'pickup' : 'delivery';
  const region = cleanString(region_envio);
  const ciudad = cleanString(ciudad_envio);
  const direccion = cleanString(direccion_envio);
  const referencia = cleanString(referencia_envio);

  if (!resolvedClienteId || !items?.length) {
    return res.status(400).json({ error: 'Items requeridos' });
  }
  if ((metodo_pago || 'bank_transfer') !== 'bank_transfer') {
    return res.status(400).json({ error: 'Por ahora solo aceptamos transferencia bancaria' });
  }
  if (deliveryMode === 'delivery') {
    const regionError = validateRequiredText(region, 'Región', 2);
    const ciudadError = validateRequiredText(ciudad, 'Ciudad', 2);
    const direccionError = validateRequiredText(direccion, 'Dirección', 6);
    if (regionError || ciudadError || direccionError) {
      return res.status(400).json({ error: regionError || ciudadError || direccionError });
    }
  }

  let transaction;
  let transactionClosed = false;

  try {
    const pool = await getPool();
    await ensurePedidosSchema(pool);
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const clienteResult = await new sql.Request(transaction)
      .input('cliente_id', sql.Int, resolvedClienteId)
      .query(`
        SELECT id, nombre, email, rut, telefono, direccion, ciudad, region
        FROM clientes
        WHERE id = @cliente_id
      `);

    const cliente = clienteResult.recordset[0];
    if (!cliente) {
      await transaction.rollback();
      transactionClosed = true;
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const clienteNombre = cleanString(cliente.nombre);
    const clienteEmail = normalizeEmail(cliente.email);
    const clienteRut = normalizeRut(cliente.rut);
    const clienteTelefono = normalizePhone(cliente.telefono);

    const customerValidationError =
      validateRequiredText(clienteNombre, 'Nombre', 3)
      || (!clienteEmail ? 'Email es requerido.' : null)
      || (!isValidEmail(clienteEmail) ? 'Email inválido en el perfil.' : null)
      || (!clienteRut ? 'RUT es requerido.' : null)
      || (!isValidChileanRut(clienteRut) ? 'RUT inválido en el perfil.' : null)
      || (!clienteTelefono ? 'Teléfono es requerido.' : null)
      || (!isValidChileanPhone(clienteTelefono) ? 'Teléfono inválido en el perfil.' : null);
    const transferConfig = getTransferConfig();

    if (customerValidationError) {
      await transaction.rollback();
      transactionClosed = true;
      return res.status(400).json({ error: customerValidationError });
    }
    if (!transferConfig.is_complete) {
      await transaction.rollback();
      transactionClosed = true;
      return res.status(400).json({ error: 'La configuracion de transferencia esta incompleta. Completa los datos bancarios en admin antes de recibir pedidos.' });
    }

    const activeReservation = await getActiveReservation(transaction, resolvedClienteId);
    if (!activeReservation) {
      await transaction.rollback();
      transactionClosed = true;
      return res.status(409).json({ error: 'Tu reserva ya no esta activa. Vuelve a checkout para reservar el stock otra vez.' });
    }

    if (new Date(activeReservation.expires_en).getTime() <= Date.now()) {
      await releaseReservation(transaction, activeReservation.id);
      await transaction.rollback();
      transactionClosed = true;
      return res.status(409).json({ error: 'Tu reserva de 20 minutos vencio. Vuelve a checkout para continuar.' });
    }

    const normalizedItems = normalizeReservationItems(items);
    if (!sameReservationItems(activeReservation.items, normalizedItems)) {
      await transaction.rollback();
      transactionClosed = true;
      return res.status(409).json({ error: 'Tu carrito cambio desde la reserva. Revisa el checkout para sincronizarlo.' });
    }

    let subtotal = 0;
    const itemsProcesados = [];

    for (const item of normalizedItems) {
      const prod = await new sql.Request(transaction)
        .input('id', sql.Int, item.producto_id)
        .query(`
          SELECT nombre, precio_clp, stock, usa_tonos, tonos_json
          FROM productos
          WHERE id = @id AND activo = 1
        `);

      if (!prod.recordset[0]) {
        await transaction.rollback();
        transactionClosed = true;
        return res.status(400).json({ error: `Producto ${item.producto_id} no encontrado` });
      }

      const product = prod.recordset[0];
      const availableTones = normalizeToneOptions(product.tonos_json);
      if (product.usa_tonos && !item.tono_seleccionado) {
        await transaction.rollback();
        transactionClosed = true;
        return res.status(400).json({ error: `Debes elegir un tipo para ${product.nombre}.` });
      }
      if (item.tono_seleccionado && product.usa_tonos && !availableTones.includes(item.tono_seleccionado)) {
        await transaction.rollback();
        transactionClosed = true;
        return res.status(400).json({ error: `El tipo seleccionado para ${product.nombre} ya no está disponible.` });
      }

      const precioUnitario = product.precio_clp;
      itemsProcesados.push({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario_clp: precioUnitario,
        tono_seleccionado: product.usa_tonos ? item.tono_seleccionado : null,
      });
      subtotal += precioUnitario * item.cantidad;
    }

    let appliedDiscount = null;
    const normalizedDiscountCode = normalizeDiscountCode(discount_code);

    if (normalizedDiscountCode) {
      const discountRow = await findDiscountByCode(new sql.Request(transaction), normalizedDiscountCode);
      const discountValidation = validateDiscountRow(discountRow, subtotal);
      if (!discountValidation.ok) {
        await transaction.rollback();
        transactionClosed = true;
        return res.status(400).json({ error: discountValidation.error });
      }
      appliedDiscount = discountValidation.discount;
    }

    const subtotalPagado = Math.max(0, subtotal - Number(appliedDiscount?.discount_clp || 0));

    const shippingQuote = deliveryMode === 'pickup'
      ? {
          method: 'store_pickup',
          provider: 'Bloomskin',
          fee_clp: 0,
          distance_km: null,
          tier_label: 'Retiro en domicilio',
        }
      : await quoteShipping({
          ciudad,
          direccion,
          subtotal_clp: subtotalPagado,
        });
    const envioClp = shippingQuote.fee_clp;
    const total = subtotalPagado + envioClp;

    const pedResult = await new sql.Request(transaction)
      .input('cliente_id', sql.Int, resolvedClienteId)
      .input('cliente_nombre', sql.NVarChar, clienteNombre)
      .input('cliente_email', sql.NVarChar, clienteEmail)
      .input('cliente_rut', sql.NVarChar, clienteRut)
      .input('cliente_telefono', sql.NVarChar, clienteTelefono)
      .input('subtotal_clp', sql.Int, subtotal)
      .input('subtotal_pagado_clp', sql.Int, subtotalPagado)
      .input('descuento_codigo', sql.NVarChar, appliedDiscount?.code || null)
      .input('descuento_porcentaje', sql.Int, appliedDiscount?.discount_percent || null)
      .input('descuento_clp', sql.Int, appliedDiscount?.discount_clp || 0)
      .input('envio_clp', sql.Int, envioClp)
      .input('total_clp', sql.Int, total)
      .input('metodo_pago', sql.NVarChar, 'bank_transfer')
      .input('metodo_envio', sql.NVarChar, shippingQuote.method)
      .input('region_envio', sql.NVarChar, deliveryMode === 'pickup' ? null : region)
      .input('ciudad_envio', sql.NVarChar, deliveryMode === 'pickup' ? 'Antofagasta' : ciudad)
      .input('direccion_envio', sql.NVarChar, deliveryMode === 'pickup' ? 'Retiro coordinado en domicilio' : direccion)
      .input('referencia_envio', sql.NVarChar, deliveryMode === 'pickup' ? null : (referencia || null))
      .input('distancia_envio_km', sql.Decimal(8, 2), shippingQuote.distance_km)
      .input('notas', sql.NVarChar, notas || null)
      .input('reserva_expira_en', sql.DateTime2, activeReservation.expires_en)
      .input('comprobante_limite_en', sql.DateTime2, new Date(Date.now() + (PAYMENT_PROOF_WINDOW_MINUTES * 60 * 1000)))
      .query(`
        INSERT INTO pedidos (
          cliente_id, cliente_nombre, cliente_email, cliente_rut, cliente_telefono,
          subtotal_clp, subtotal_pagado_clp, descuento_codigo, descuento_porcentaje, descuento_clp,
          envio_clp, total_clp, metodo_pago, metodo_envio,
          region_envio, ciudad_envio, direccion_envio, referencia_envio, distancia_envio_km, notas, estado,
          origen, stock_comprometido, reserva_expira_en, comprobante_limite_en
        )
        OUTPUT INSERTED.id
        VALUES (
          @cliente_id, @cliente_nombre, @cliente_email, @cliente_rut, @cliente_telefono,
          @subtotal_clp, @subtotal_pagado_clp, @descuento_codigo, @descuento_porcentaje, @descuento_clp,
          @envio_clp, @total_clp, @metodo_pago, @metodo_envio,
          @region_envio, @ciudad_envio, @direccion_envio, @referencia_envio, @distancia_envio_km, @notas, 'pending_payment',
          'store', 1, @reserva_expira_en, @comprobante_limite_en
        )
      `);
    const pedidoId = pedResult.recordset[0].id;

    for (const item of itemsProcesados) {
      await new sql.Request(transaction)
        .input('pedido_id', sql.Int, pedidoId)
        .input('producto_id', sql.Int, item.producto_id)
        .input('cantidad', sql.Int, item.cantidad)
        .input('precio_unitario_clp', sql.Int, item.precio_unitario_clp)
        .input('tono_seleccionado', sql.NVarChar, item.tono_seleccionado)
        .query(`
          INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario_clp, tono_seleccionado)
          VALUES (@pedido_id, @producto_id, @cantidad, @precio_unitario_clp, @tono_seleccionado)
        `);
    }

    await new sql.Request(transaction)
      .input('reservation_id', sql.Int, activeReservation.id)
      .query(`
        DELETE FROM checkout_reservation_items WHERE reservation_id = @reservation_id;
        DELETE FROM checkout_reservations WHERE id = @reservation_id;
      `);

    if (appliedDiscount?.id) {
      const discountUpdate = await new sql.Request(transaction)
        .input('id', sql.Int, appliedDiscount.id)
        .query(`
          UPDATE discount_codes
          SET used_count = used_count + 1,
              updated_en = GETDATE()
          WHERE id = @id
            AND active = 1
            AND (max_uses IS NULL OR used_count < max_uses)
        `);

      if (discountUpdate.rowsAffected[0] !== 1) {
        await transaction.rollback();
        transactionClosed = true;
        return res.status(409).json({ error: 'No alcanzamos a reservar ese código de descuento. Intenta otra vez.' });
      }
    }

    await transaction.commit();
    transactionClosed = true;
    res.status(201).json({
      id: pedidoId,
      codigo: orderCodeFromId(pedidoId),
      subtotal_clp: subtotal,
      subtotal_pagado_clp: subtotalPagado,
      descuento_codigo: appliedDiscount?.code || null,
      descuento_porcentaje: appliedDiscount?.discount_percent || null,
      descuento_clp: appliedDiscount?.discount_clp || 0,
      envio_clp: envioClp,
      total_clp: total,
      metodo_pago: 'bank_transfer',
      metodo_envio: shippingQuote.method,
      comprobante_limite_en: new Date(Date.now() + (PAYMENT_PROOF_WINDOW_MINUTES * 60 * 1000)),
      shipping_quote: shippingQuote,
      transfer: getTransferConfig(),
    });
  } catch (err) {
    if (transaction && !transactionClosed) {
      try {
        await transaction.rollback();
      } catch (_) {
        // ignore rollback errors
      }
    }
    console.error(err);
    res.status(500).json({ error: 'Error al crear pedido' });
  }
});

router.post('/manual', requireAdminAuth, async (req, res) => {
  const {
    cliente_nombre,
    cliente_email,
    cliente_rut,
    cliente_telefono,
    metodo_pago,
    estado,
    notas,
    fecha_venta,
    items,
  } = req.body || {};

  const allowedEstados = ['paid', 'shipped', 'delivered'];
  const normalizedEstado = allowedEstados.includes(estado) ? estado : 'delivered';
  const normalizedMetodoPago = cleanString(metodo_pago) || 'manual';
  const normalizedNombre = cleanString(cliente_nombre) || 'Venta externa';
  const normalizedEmail = normalizeEmail(cliente_email || '');
  const normalizedRut = normalizeRut(cliente_rut || '');
  const normalizedTelefono = normalizePhone(cliente_telefono || '');
  const saleDate = normalizeManualSaleDate(fecha_venta) || new Date();

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Debes agregar al menos un producto a la venta externa.' });
  }

  let transaction;
  let transactionClosed = false;

  try {
    const pool = await getPool();
    await ensurePedidosSchema(pool);
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const manualClientId = await getOrCreateManualSalesClient(transaction);
    const itemsProcesados = [];
    let subtotal = 0;

    for (const rawItem of items) {
      const productoId = Number(rawItem?.producto_id);
      const cantidad = Number(rawItem?.cantidad);

      if (!productoId || !Number.isInteger(cantidad) || cantidad <= 0) {
        await transaction.rollback();
        transactionClosed = true;
        return res.status(400).json({ error: 'Cada producto debe tener una cantidad valida.' });
      }

      const prod = await new sql.Request(transaction)
        .input('id', sql.Int, productoId)
        .query(`
          SELECT id, nombre, stock, precio_clp, usa_tonos
          FROM productos
          WHERE id = @id AND activo = 1
        `);

      const producto = prod.recordset[0];
      if (!producto) {
        await transaction.rollback();
        transactionClosed = true;
        return res.status(400).json({ error: `Producto ${productoId} no encontrado.` });
      }

      if (producto.usa_tonos) {
        await transaction.rollback();
        transactionClosed = true;
        return res.status(400).json({ error: `La venta externa de ${producto.nombre} debe registrarse desde la tienda o agregando soporte de tipo en venta manual.` });
      }

      if (Number(producto.stock || 0) < cantidad) {
        await transaction.rollback();
        transactionClosed = true;
        return res.status(400).json({ error: `Stock insuficiente para ${producto.nombre}.` });
      }

      itemsProcesados.push({
        producto_id: producto.id,
        cantidad,
        precio_unitario_clp: Number(producto.precio_clp || 0),
      });
      subtotal += Number(producto.precio_clp || 0) * cantidad;
    }

    const pedResult = await new sql.Request(transaction)
      .input('cliente_id', sql.Int, manualClientId)
      .input('cliente_nombre', sql.NVarChar, normalizedNombre)
      .input('cliente_email', sql.NVarChar, normalizedEmail || null)
      .input('cliente_rut', sql.NVarChar, normalizedRut || null)
      .input('cliente_telefono', sql.NVarChar, normalizedTelefono || null)
      .input('subtotal_clp', sql.Int, subtotal)
      .input('subtotal_pagado_clp', sql.Int, subtotal)
      .input('descuento_codigo', sql.NVarChar, null)
      .input('descuento_porcentaje', sql.Int, null)
      .input('descuento_clp', sql.Int, 0)
      .input('envio_clp', sql.Int, 0)
      .input('total_clp', sql.Int, subtotal)
      .input('metodo_pago', sql.NVarChar, normalizedMetodoPago)
      .input('metodo_envio', sql.NVarChar, 'external_sale')
      .input('region_envio', sql.NVarChar, 'Venta externa')
      .input('ciudad_envio', sql.NVarChar, 'Venta externa')
      .input('direccion_envio', sql.NVarChar, 'Venta registrada desde admin')
      .input('referencia_envio', sql.NVarChar, null)
      .input('distancia_envio_km', sql.Decimal(8, 2), null)
      .input('notas', sql.NVarChar, notas || null)
      .input('estado', sql.NVarChar, normalizedEstado)
      .input('origen', sql.NVarChar, 'manual')
      .input('stock_comprometido', sql.Bit, 1)
      .input('created_at', sql.DateTime2, saleDate)
      .query(`
        INSERT INTO pedidos (
          cliente_id, cliente_nombre, cliente_email, cliente_rut, cliente_telefono,
          subtotal_clp, subtotal_pagado_clp, descuento_codigo, descuento_porcentaje, descuento_clp,
          envio_clp, total_clp, metodo_pago, metodo_envio,
          region_envio, ciudad_envio, direccion_envio, referencia_envio, distancia_envio_km, notas, estado, origen, stock_comprometido,
          creado_en, actualizado_en
        )
        OUTPUT INSERTED.id
        VALUES (
          @cliente_id, @cliente_nombre, @cliente_email, @cliente_rut, @cliente_telefono,
          @subtotal_clp, @subtotal_pagado_clp, @descuento_codigo, @descuento_porcentaje, @descuento_clp,
          @envio_clp, @total_clp, @metodo_pago, @metodo_envio,
          @region_envio, @ciudad_envio, @direccion_envio, @referencia_envio, @distancia_envio_km, @notas, @estado, @origen, @stock_comprometido,
          @created_at, @created_at
        )
      `);

    const pedidoId = pedResult.recordset[0].id;

    for (const item of itemsProcesados) {
      await new sql.Request(transaction)
        .input('pedido_id', sql.Int, pedidoId)
        .input('producto_id', sql.Int, item.producto_id)
        .input('cantidad', sql.Int, item.cantidad)
        .input('precio_unitario_clp', sql.Int, item.precio_unitario_clp)
        .query(`
          INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario_clp)
          VALUES (@pedido_id, @producto_id, @cantidad, @precio_unitario_clp)
        `);

      const stockUpdate = await new sql.Request(transaction)
        .input('producto_id', sql.Int, item.producto_id)
        .input('cantidad', sql.Int, item.cantidad)
        .query(`
          UPDATE productos
          SET stock = stock - @cantidad
          WHERE id = @producto_id AND stock >= @cantidad
        `);

      if (stockUpdate.rowsAffected[0] !== 1) {
        await transaction.rollback();
        transactionClosed = true;
        return res.status(409).json({ error: 'No se pudo descontar stock para la venta externa.' });
      }
    }

    await transaction.commit();
    transactionClosed = true;
    res.status(201).json({
      ok: true,
      id: pedidoId,
      codigo: orderCodeFromId(pedidoId),
      total_clp: subtotal,
      origen: 'manual',
      estado: normalizedEstado,
    });
  } catch (err) {
    if (transaction && !transactionClosed) {
      try {
        await transaction.rollback();
      } catch (_) {
        // ignore rollback errors
      }
    }
    console.error(err);
    res.status(500).json({ error: 'No se pudo registrar la venta externa.' });
  }
});

router.post('/:id/comprobante', requireClientAuth, handleProofUpload, async (req, res) => {
  const pedidoId = Number(req.params.id);

  if (!req.file) {
    return res.status(400).json({ error: 'Debes adjuntar un comprobante' });
  }

  if (!pedidoId) {
    return res.status(400).json({ error: 'Pedido invalido' });
  }

  try {
    const pool = await getPool();
    const lookup = await pool.request()
      .input('id', sql.Int, pedidoId)
      .query(`
        SELECT p.id, p.cliente_id, p.total_clp, p.cliente_nombre, c.email
        FROM pedidos p
        JOIN clientes c ON c.id = p.cliente_id
        WHERE p.id = @id
      `);

    const pedido = lookup.recordset[0];
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const requesterMatchesClient = req.user.id === pedido.cliente_id;

    if (!requesterMatchesClient) {
      return res.status(403).json({ error: 'No pudimos validar ese pedido para subir el comprobante' });
    }

    const fileUrl = `/uploads/comprobantes/${req.file.filename}`;
    await pool.request()
      .input('id', sql.Int, pedidoId)
      .input('comprobante_url', sql.NVarChar, fileUrl)
      .query(`
        UPDATE pedidos
        SET comprobante_url = @comprobante_url,
            estado = CASE
              WHEN estado = 'pending_payment' THEN 'payment_submitted'
              ELSE estado
            END,
            comprobante_limite_en = NULL,
            actualizado_en = GETDATE()
        WHERE id = @id
      `);

    try {
      await sendOrderStatusEmail({
        pedidoId,
        codigo: orderCodeFromId(pedidoId),
        clienteNombre: pedido.cliente_nombre,
        clienteEmail: pedido.email,
        estado: 'payment_submitted',
        totalClp: pedido.total_clp,
      });
    } catch (mailError) {
      console.error('No se pudo enviar el correo de comprobante recibido', mailError);
    }

    res.status(201).json({ ok: true, comprobante_url: fileUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo subir el comprobante' });
  }
});

router.patch('/:id/estado', requireAdminAuth, async (req, res) => {
  const { estado } = req.body;
  const estados = ['pending_payment', 'payment_submitted', 'paid', 'shipped', 'delivered', 'cancelled'];
  if (!estados.includes(estado)) {
    return res.status(400).json({ error: 'Estado invalido' });
  }

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    const pedidoLookup = await new sql.Request(transaction)
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT id, estado, cliente_nombre, cliente_email, total_clp, stock_comprometido
        FROM pedidos
        WHERE id = @id
      `);

    const pedido = pedidoLookup.recordset[0];
    if (!pedido) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    if (pedido.estado === 'cancelled' && estado !== 'cancelled') {
      await transaction.rollback();
      return res.status(400).json({ error: 'No se puede reactivar un pedido cancelado desde admin.' });
    }

    const stockWasCommitted = Boolean(pedido.stock_comprometido);
    const stockWillBeCommitted = INVENTORY_COMMITTED_STATES.has(estado);
    const nextStockCommitted = stockWasCommitted ? estado !== 'cancelled' : stockWillBeCommitted;

    if (!stockWasCommitted && stockWillBeCommitted) {
      const itemsResult = await new sql.Request(transaction)
        .input('pedido_id', sql.Int, req.params.id)
        .query(`
          SELECT pi.producto_id, pi.cantidad, pi.tono_seleccionado, p.nombre
          FROM pedido_items pi
          JOIN productos p ON p.id = pi.producto_id
          WHERE pi.pedido_id = @pedido_id
        `);

      for (const item of itemsResult.recordset) {
        const stockUpdate = await adjustProductStock(transaction, {
          productoId: item.producto_id,
          cantidad: item.cantidad,
          tonoSeleccionado: item.tono_seleccionado,
          direction: -1,
        });

        if (!stockUpdate.ok) {
          await transaction.rollback();
          return res.status(409).json({
            error: stockUpdate.error || `No hay stock suficiente para validar este pedido. Revisa el producto "${item.nombre}".`,
          });
        }
      }
    }

    if (stockWasCommitted && !stockWillBeCommitted) {
      const itemsResult = await new sql.Request(transaction)
        .input('pedido_id', sql.Int, req.params.id)
        .query(`
          SELECT producto_id, cantidad, tono_seleccionado
          FROM pedido_items
          WHERE pedido_id = @pedido_id
        `);

      for (const item of itemsResult.recordset) {
        await adjustProductStock(transaction, {
          productoId: item.producto_id,
          cantidad: item.cantidad,
          tonoSeleccionado: item.tono_seleccionado,
          direction: 1,
        });
      }
    }

      await new sql.Request(transaction)
        .input('id', sql.Int, req.params.id)
        .input('estado', sql.NVarChar, estado)
        .input('stock_comprometido', sql.Bit, nextStockCommitted ? 1 : 0)
      .query(`
        UPDATE pedidos
        SET estado=@estado,
            stock_comprometido=@stock_comprometido,
            actualizado_en=GETDATE()
        WHERE id=@id
      `);

    await transaction.commit();

    try {
      await sendOrderStatusEmail({
        pedidoId: Number(req.params.id),
        codigo: orderCodeFromId(req.params.id),
        clienteNombre: pedido.cliente_nombre,
        clienteEmail: pedido.cliente_email,
        estado,
        totalClp: pedido.total_clp,
      });
    } catch (mailError) {
      console.error('No se pudo enviar el correo de cambio de estado', mailError);
    }

    res.json({ ok: true, estado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

router.delete('/:id', requireAdminAuth, async (req, res) => {
  const pedidoId = Number(req.params.id);
  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    return res.status(400).json({ error: 'Pedido invalido.' });
  }

  try {
    const pool = await getPool();
    await ensurePedidosSchema(pool);

    const lookup = await pool.request()
      .input('id', sql.Int, pedidoId)
      .query(`
        SELECT id, estado, eliminado_en
        FROM pedidos
        WHERE id = @id
      `);

    const pedido = lookup.recordset[0];
    if (!pedido || pedido.eliminado_en) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }

    if (pedido.estado !== 'cancelled') {
      return res.status(409).json({ error: 'Solo puedes ocultar ventas canceladas.' });
    }

    await pool.request()
      .input('id', sql.Int, pedidoId)
      .query(`
        UPDATE pedidos
        SET eliminado_en = SYSUTCDATETIME(),
            actualizado_en = GETDATE()
        WHERE id = @id
      `);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo ocultar la venta.' });
  }
});

module.exports = router;
module.exports.ensurePedidosSchema = ensurePedidosSchema;
module.exports.runOrderMaintenance = runOrderMaintenance;
