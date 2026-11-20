const router = require('express').Router();
const { getPool, sql } = require('../config/db');
const { requireAdminAuth } = require('../middleware/auth');

// GET /api/mensajes — privado
router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT m.*, c.nombre AS cliente_nombre
      FROM mensajes m
      LEFT JOIN clientes c ON c.id = m.cliente_id
      ORDER BY m.creado_en DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

// POST /api/mensajes — público (cliente envía consulta)
router.post('/', async (req, res) => {
  const { nombre, email, tipo, contenido, cliente_id } = req.body;
  if (!nombre || !email || !contenido)
    return res.status(400).json({ error: 'Nombre, email y contenido requeridos' });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('cliente_id', sql.Int,      cliente_id || null)
      .input('nombre',     sql.NVarChar, nombre)
      .input('email',      sql.NVarChar, email)
      .input('tipo',       sql.NVarChar, tipo || 'consult')
      .input('contenido',  sql.NVarChar, contenido)
      .query(`INSERT INTO mensajes (cliente_id,nombre,email,tipo,contenido)
              OUTPUT INSERTED.* VALUES (@cliente_id,@nombre,@email,@tipo,@contenido)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

// PATCH /api/mensajes/:id/leido — privado
router.patch('/:id/leido', requireAdminAuth, async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('UPDATE mensajes SET leido=1 WHERE id=@id');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

// PATCH /api/mensajes/:id/respondido — privado
router.patch('/:id/respondido', requireAdminAuth, async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('UPDATE mensajes SET respondido=1, leido=1 WHERE id=@id');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

// POST /api/suscriptores — público
router.post('/suscribir', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Ingresa un email válido' });
  try {
    const pool = await getPool();
    await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`
        IF EXISTS (SELECT 1 FROM suscriptores WHERE email=@email)
          UPDATE suscriptores SET activo=1 WHERE email=@email
        ELSE
          INSERT INTO suscriptores (email) VALUES (@email)
      `);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al suscribirse' });
  }
});

router.get('/suscriptores', requireAdminAuth, async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, email, activo, creado_en
      FROM suscriptores
      ORDER BY creado_en DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener suscriptores' });
  }
});

router.post('/newsletter/enviar', requireAdminAuth, async (req, res) => {
  const subject = String(req.body?.subject || '').trim();
  const headline = String(req.body?.headline || '').trim();
  const body = String(req.body?.body || '').trim();
  const ctaLabel = String(req.body?.ctaLabel || '').trim();
  let ctaUrl = String(req.body?.ctaUrl || '').trim();
  const previewText = String(req.body?.previewText || '').trim();

  if (!subject || !headline || !body) {
    return res.status(400).json({ error: 'Asunto, titular y contenido son obligatorios' });
  }

  if (ctaUrl) {
    try {
      const url = new URL(ctaUrl, require('../lib/mail').storeBaseUrl());
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
          (process.env.NODE_ENV === 'production' && (url.protocol !== 'https:' || url.hostname === 'localhost' || /^\d+\.\d+\.\d+\./.test(url.hostname)))) throw new Error('INVALID_URL');
      ctaUrl = url.href;
    } catch { return res.status(400).json({ error: 'El enlace del botón debe ser una dirección pública válida, con https.' }); }
  }

  const transporter = createMailer();
  if (!transporter) {
    return res.status(400).json({ error: 'Falta configurar SMTP en el backend para poder enviar newsletters' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT email
      FROM suscriptores
      WHERE activo=1
      ORDER BY creado_en DESC
    `);

    const recipients = result.recordset
      .map(row => normalizeEmail(row.email))
      .filter(isValidEmail);

    if (!recipients.length) {
      return res.status(400).json({ error: 'No hay suscriptores activos para enviar esta campaña' });
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const { html, attachments } = renderNewsletterTemplate({ headline, body, ctaLabel, ctaUrl, previewText });
    const text = renderNewsletterText({ headline, body, ctaLabel, ctaUrl });

    const batches = chunk(recipients, 40);
    for (const batch of batches) {
      await transporter.sendMail({
        from,
        to: from,
        bcc: batch,
        subject,
        html,
        text,
        attachments,
      });
    }

    res.json({ ok: true, sent: recipients.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo enviar el newsletter' });
  }
});

function createMailer() {
  return require('../lib/mail').createMailer();
}

router.get('/email/status', requireAdminAuth, async (_req, res) => {
  const transporter = createMailer();
  let connected = false;
  if (transporter) { try { connected = await transporter.verify(); } catch (_) {} }
  try {
    const pool = await getPool();
    const events = await pool.request().query('SELECT TOP 15 pedido_id, estado, enviado, intentos, ultimo_error, actualizado_en FROM order_mail_events ORDER BY actualizado_en DESC');
    const reviews = await pool.request().query('SELECT pedido_id FROM flow_payments WHERE requiere_revision=1');
    const alerts = await pool.request().query('SELECT TOP 15 pedido_id,estado,enviado,intentos,ultimo_error,actualizado_en FROM order_admin_mail_events ORDER BY actualizado_en DESC');
    res.json({ configured: Boolean(transporter), connected, from: process.env.SMTP_FROM || '', events: events.recordset,
      store_url: require('../lib/mail').storeBaseUrl(), notifications: require('../lib/orderAlerts').readAlertSettings(), admin_events: alerts.recordset,
      flow: { enabled: require('../lib/flow').flowConfig().ready, sandbox: require('../lib/flow').flowConfig().sandbox, review_orders: reviews.recordset.map(p => p.pedido_id) } });
  } catch { res.status(503).json({ error: 'No pudimos revisar el estado de los correos.' }); }
});

router.post('/email/test', requireAdminAuth, async (req, res) => {
  if (!isValidEmail(req.body?.email)) return res.status(400).json({ error: 'Ingresa un correo válido para la prueba.' });
  try {
    const sent = await require('../lib/mail').sendMessage({ to: normalizeEmail(req.body.email), subject: 'Prueba de correo · Bloomskin', title: 'Tu correo Bloomskin está funcionando',
      paragraphs: ['Este es un mensaje de prueba enviado desde el panel de administración. No corresponde a una compra ni genera un pedido.'] });
    if (!sent) return res.status(503).json({ error: 'El correo no fue aceptado por el servidor SMTP.' });
    res.json({ ok: true });
  } catch { res.status(503).json({ error: 'No se pudo enviar la prueba. Revisa el estado de la conexión SMTP.' }); }
});

router.put('/email/notifications', requireAdminAuth, (req, res) => {
  try { res.json(require('../lib/orderAlerts').writeAlertSettings(req.body || {})); }
  catch (error) {
    if (error.code === 'INVALID_ALERT_SETTINGS') return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'No pudimos guardar los avisos del comercio.' });
  }

});

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
}

function chunk(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function renderNewsletterTemplate({ headline, body, ctaLabel, ctaUrl, previewText }) {
  const { html, attachments } = require('../lib/mail').messageOptions({
    title: headline, name: 'clienta', previewText,
    paragraphs: [
      ...body.split(/\r?\n\r?\n/).map(value => value.trim()).filter(Boolean),
      'Recibes este correo porque te suscribiste a Bloomskin. Si prefieres no recibir novedades, responde este mensaje para solicitar tu baja.',
    ],
    actionLabel: ctaLabel || 'Ver catálogo', actionUrl: ctaUrl,
  });
  return { html, attachments };
}

function renderNewsletterText({ headline, body, ctaLabel, ctaUrl }) {
  return [
    `Bloomskin`,
    `Tips, novedades y favoritos de K-Beauty`,
    ``,
    headline,
    ``,
    body,
    ctaLabel && ctaUrl ? `` : null,
    ctaLabel && ctaUrl ? `${ctaLabel}: ${ctaUrl}` : null,
  ].filter(Boolean).join('\n');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = router;
