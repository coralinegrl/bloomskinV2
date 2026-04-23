const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { getPool, sql } = require('../config/db');
const { requireAdminAuth, requireClientAuth } = require('../middleware/auth');
const { quoteShipping } = require('../lib/shipping');
const { readSettings } = require('../lib/siteSettings');

const proofUploadsDir = path.resolve(__dirname, '../../uploads/comprobantes');
fs.mkdirSync(proofUploadsDir, { recursive: true });

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
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/', 'application/pdf'];
    if (!allowedTypes.some(type => file.mimetype.startsWith(type))) {
      cb(new Error('Solo se permiten imagenes o PDF'));
      return;
    }
    cb(null, true);
  },
});

function getTransferConfig() {
  const settings = readSettings();
  const configuredTransfer = settings.payment || {};
  return {
    bank_name: configuredTransfer.bank_name || process.env.BANK_NAME || 'Banco por definir',
    account_type: configuredTransfer.account_type || process.env.BANK_ACCOUNT_TYPE || 'Cuenta corriente',
    account_number: configuredTransfer.account_number || process.env.BANK_ACCOUNT_NUMBER || '',
    account_holder: configuredTransfer.account_holder || process.env.BANK_ACCOUNT_HOLDER || 'Bloomskin',
    account_rut: configuredTransfer.account_rut || process.env.BANK_ACCOUNT_RUT || '',
    transfer_email: configuredTransfer.transfer_email || process.env.BANK_TRANSFER_EMAIL || process.env.SMTP_FROM || '',
    instructions: configuredTransfer.instructions || process.env.BANK_TRANSFER_INSTRUCTIONS || 'Transfiere el total del pedido y luego sube tu comprobante para validarlo en admin.',
  };
}

function orderCodeFromId(id) {
  return 'BS-' + String(id).padStart(4, '0');
}

router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT p.id, p.subtotal_clp, p.envio_clp, p.total_clp, p.metodo_pago, p.metodo_envio,
             p.ciudad_envio, p.direccion_envio, p.referencia_envio, p.distancia_envio_km,
             p.estado, p.comprobante_url, p.notas,
             p.creado_en, p.actualizado_en,
             c.nombre AS cliente_nombre, c.email AS cliente_email,
             c.ciudad AS cliente_ciudad
      FROM pedidos p
      JOIN clientes c ON c.id = p.cliente_id
      ORDER BY p.creado_en DESC
    `);

    const pedidos = result.recordset;
    for (const ped of pedidos) {
      const items = await pool.request()
        .input('pedido_id', sql.Int, ped.id)
        .query(`
          SELECT pi.cantidad, pi.precio_unitario_clp,
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

router.get('/stats', requireAdminAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        COUNT(*) AS total_pedidos,
        COALESCE(SUM(total_clp), 0) AS ventas_totales,
        COALESCE(SUM(CASE WHEN MONTH(creado_en) = MONTH(GETDATE())
                          AND YEAR(creado_en) = YEAR(GETDATE())
                          THEN total_clp END), 0) AS ventas_mes,
        COUNT(CASE WHEN estado = 'pending_payment' THEN 1 END) AS pendientes_pago,
        COUNT(CASE WHEN estado = 'payment_submitted' THEN 1 END) AS pagos_por_validar,
        COUNT(CASE WHEN estado = 'paid' THEN 1 END) AS pagados,
        COUNT(CASE WHEN estado = 'shipped' THEN 1 END) AS enviados,
        COUNT(CASE WHEN estado = 'delivered' THEN 1 END) AS entregados
      FROM pedidos
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener stats' });
  }
});

router.get('/mine', requireClientAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('cliente_id', sql.Int, req.user.id)
      .query(`
        SELECT p.id, p.subtotal_clp, p.envio_clp, p.total_clp, p.metodo_pago, p.metodo_envio,
               p.ciudad_envio, p.direccion_envio, p.referencia_envio, p.distancia_envio_km,
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
          SELECT pi.cantidad, pi.precio_unitario_clp,
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

router.get('/payment-config', async (_req, res) => {
  res.json({
    method: 'bank_transfer',
    transfer: getTransferConfig(),
  });
});

router.post('/shipping-quote', async (req, res) => {
  try {
    const quote = await quoteShipping({
      ciudad: req.body?.ciudad,
      direccion: req.body?.direccion,
      subtotal_clp: req.body?.subtotal_clp,
    });
    res.json(quote);
  } catch (err) {
    res.status(400).json({ error: err.message || 'No se pudo calcular el envio' });
  }
});

router.post('/', requireClientAuth, async (req, res) => {
  const {
    items,
    notas,
    metodo_pago,
    ciudad_envio,
    direccion_envio,
    referencia_envio,
  } = req.body;
  const resolvedClienteId = req.user.id;

  if (!resolvedClienteId || !items?.length) {
    return res.status(400).json({ error: 'Items requeridos' });
  }
  if ((metodo_pago || 'bank_transfer') !== 'bank_transfer') {
    return res.status(400).json({ error: 'Por ahora solo aceptamos transferencia bancaria' });
  }
  if (!ciudad_envio || !direccion_envio) {
    return res.status(400).json({ error: 'Debes indicar ciudad y direccion de envio' });
  }

  let transaction;
  let transactionClosed = false;

  try {
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    let subtotal = 0;
    const itemsProcesados = [];

    for (const item of items) {
      const prod = await new sql.Request(transaction)
        .input('id', sql.Int, item.producto_id)
        .query(`
          SELECT precio_clp, stock
          FROM productos WITH (UPDLOCK, ROWLOCK)
          WHERE id = @id AND activo = 1
        `);

      if (!prod.recordset[0]) {
        await transaction.rollback();
        transactionClosed = true;
        return res.status(400).json({ error: `Producto ${item.producto_id} no encontrado` });
      }

      if (prod.recordset[0].stock < item.cantidad) {
        await transaction.rollback();
        transactionClosed = true;
        return res.status(400).json({ error: `Stock insuficiente para producto ${item.producto_id}` });
      }

      const precioUnitario = prod.recordset[0].precio_clp;
      itemsProcesados.push({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario_clp: precioUnitario,
      });
      subtotal += precioUnitario * item.cantidad;
    }

    const shippingQuote = await quoteShipping({
      ciudad: ciudad_envio,
      direccion: direccion_envio,
      subtotal_clp: subtotal,
    });
    const envioClp = shippingQuote.fee_clp;
    const total = subtotal + envioClp;

    const pedResult = await new sql.Request(transaction)
      .input('cliente_id', sql.Int, resolvedClienteId)
      .input('subtotal_clp', sql.Int, subtotal)
      .input('envio_clp', sql.Int, envioClp)
      .input('total_clp', sql.Int, total)
      .input('metodo_pago', sql.NVarChar, 'bank_transfer')
      .input('metodo_envio', sql.NVarChar, shippingQuote.method)
      .input('ciudad_envio', sql.NVarChar, ciudad_envio)
      .input('direccion_envio', sql.NVarChar, direccion_envio)
      .input('referencia_envio', sql.NVarChar, referencia_envio || null)
      .input('distancia_envio_km', sql.Decimal(8, 2), shippingQuote.distance_km)
      .input('notas', sql.NVarChar, notas || null)
      .query(`
        INSERT INTO pedidos (
          cliente_id, subtotal_clp, envio_clp, total_clp, metodo_pago, metodo_envio,
          ciudad_envio, direccion_envio, referencia_envio, distancia_envio_km, notas, estado
        )
        OUTPUT INSERTED.id
        VALUES (
          @cliente_id, @subtotal_clp, @envio_clp, @total_clp, @metodo_pago, @metodo_envio,
          @ciudad_envio, @direccion_envio, @referencia_envio, @distancia_envio_km, @notas, 'pending_payment'
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
        .input('id', sql.Int, item.producto_id)
        .input('cantidad', sql.Int, item.cantidad)
        .query(`
          UPDATE productos
          SET stock = stock - @cantidad
          WHERE id = @id AND stock >= @cantidad
        `);

      if (stockUpdate.rowsAffected[0] !== 1) {
        await transaction.rollback();
        transactionClosed = true;
        return res.status(409).json({ error: `Stock insuficiente para producto ${item.producto_id}` });
      }
    }

    await transaction.commit();
    transactionClosed = true;
    res.status(201).json({
      id: pedidoId,
      codigo: orderCodeFromId(pedidoId),
      subtotal_clp: subtotal,
      envio_clp: envioClp,
      total_clp: total,
      metodo_pago: 'bank_transfer',
      metodo_envio: shippingQuote.method,
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

router.post('/:id/comprobante', requireClientAuth, uploadProof.single('comprobante'), async (req, res) => {
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
        SELECT p.id, p.cliente_id, c.email
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
            actualizado_en = GETDATE()
        WHERE id = @id
      `);

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
    return res.status(400).json({ error: 'Estado inválido' });
  }

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    const pedidoLookup = await new sql.Request(transaction)
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT id, estado
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

    if (pedido.estado !== 'cancelled' && estado === 'cancelled') {
      const itemsResult = await new sql.Request(transaction)
        .input('pedido_id', sql.Int, req.params.id)
        .query(`
          SELECT producto_id, cantidad
          FROM pedido_items
          WHERE pedido_id = @pedido_id
        `);

      for (const item of itemsResult.recordset) {
        await new sql.Request(transaction)
          .input('producto_id', sql.Int, item.producto_id)
          .input('cantidad', sql.Int, item.cantidad)
          .query(`
            UPDATE productos
            SET stock = stock + @cantidad
            WHERE id = @producto_id
          `);
      }
    }

    await new sql.Request(transaction)
      .input('id', sql.Int, req.params.id)
      .input('estado', sql.NVarChar, estado)
      .query('UPDATE pedidos SET estado=@estado, actualizado_en=GETDATE() WHERE id=@id');

    await transaction.commit();
    res.json({ ok: true, estado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

module.exports = router;
