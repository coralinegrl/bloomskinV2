const router = require('express').Router();
const { getPool, sql } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const nodemailer = require('nodemailer');

// GET /api/mensajes — privado
router.get('/', requireAuth, async (req, res) => {
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
router.patch('/:id/leido', requireAuth, async (req, res) => {
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
router.patch('/:id/respondido', requireAuth, async (req, res) => {
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

router.get('/suscriptores', requireAuth, async (_req, res) => {
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

router.post('/newsletter/enviar', requireAuth, async (req, res) => {
  const subject = String(req.body?.subject || '').trim();
  const headline = String(req.body?.headline || '').trim();
  const body = String(req.body?.body || '').trim();
  const ctaLabel = String(req.body?.ctaLabel || '').trim();
  const ctaUrl = String(req.body?.ctaUrl || '').trim();
  const previewText = String(req.body?.previewText || '').trim();

  if (!subject || !headline || !body) {
    return res.status(400).json({ error: 'Asunto, titular y contenido son obligatorios' });
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
  const safeHeadline = escapeHtml(headline);
  const safePreview = escapeHtml(previewText || headline);
  const paragraphs = body
    .split(/\r?\n\r?\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);
  const introParagraph = paragraphs[0] || '';
  const introText = introParagraph
    ? `${escapeHtml(introParagraph.slice(0, 120))}${introParagraph.length > 120 ? '...' : ''}`
    : 'Skincare coreano curado para descubrir favoritos, lanzamientos y promos.';
  const bodyRows = paragraphs
    .map((paragraph, index) => {
      const escaped = escapeHtml(paragraph).replace(/\r?\n/g, '<br>');
      return `<tr><td style="padding:${index === 0 ? '0 0 18px' : '0 0 14px'};color:${index === 0 ? '#6f4a5c' : '#7f5c6c'};font-size:${index === 0 ? '18px' : '15px'};line-height:1.8;">${escaped}</td></tr>`;
    })
    .join('');
  const ctaText = escapeHtml(ctaLabel || 'Ver catalogo');
  const ctaButton = ctaUrl
    ? `<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:17px 34px;background:#bf547a;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-size:12px;">${ctaText}</a>`
    : '';

  return {
    html: `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeHeadline}</title>
      </head>
      <body style="margin:0;background:#fff7fa;font-family:Arial,sans-serif;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreview}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff7fa;">
          <tr>
            <td align="center" style="padding:26px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;background:#ffffff;border:1px solid #f0dbe4;">
                <tr>
                  <td align="center" bgcolor="#f4d2de" style="padding:38px 34px 30px;">
                    <div style="font-size:42px;line-height:1;color:#c9587d;margin-bottom:10px;">&#10084;</div>
                    <div style="font-family:Georgia,serif;font-size:31px;line-height:1;color:#c9587d;font-style:italic;font-weight:700;margin-bottom:12px;">Bloomskin</div>
                    <div style="font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#d96d90;font-weight:700;margin-bottom:14px;">K-Beauty Chile</div>
                    <div style="font-family:Georgia,serif;font-size:44px;line-height:1.04;color:#7b3b57;font-weight:500;margin:0 0 14px;">${safeHeadline}</div>
                    <div style="max-width:430px;margin:0 auto;color:#8e6474;font-size:15px;line-height:1.75;">
                      Tu dosis semanal de K-Beauty: favoritos, rutinas lindas y hallazgos para mirar con calma.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 34px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#c8577e;">
                      <tr>
                        <td align="center" style="padding:15px 22px;color:#ffffff;font-size:12px;line-height:1.7;letter-spacing:.16em;text-transform:uppercase;font-weight:700;">
                          Edicion destacada Bloomskin
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 34px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#2d1821">
                      <tr>
                        <td width="54%" valign="top" style="padding:28px 26px 26px;">
                          <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#f2cfdb;font-weight:700;margin-bottom:12px;">Campa&ntilde;a de la semana</div>
                          <div style="font-family:Georgia,serif;font-size:32px;line-height:1.16;color:#ffffff;margin-bottom:14px;">Una vitrina m&aacute;s linda para entrar al cat&aacute;logo</div>
                          <div style="color:#e7cad5;font-size:14px;line-height:1.8;">Descubre lanzamientos, glow diario y favoritos que vale la pena mirar primero sin sentir la tienda pesada.</div>
                        </td>
                        <td width="46%" valign="top" bgcolor="#f7d8e1" style="padding:26px 22px;">
                          <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#c95d80;font-weight:700;margin-bottom:12px;">Selecci&oacute;n Bloomskin</div>
                          <div style="font-family:Georgia,serif;font-size:24px;line-height:1.28;color:#7b3b57;margin-bottom:12px;">Skincare coreano para descubrir con m&aacute;s criterio</div>
                          <div style="color:#8a6475;font-size:14px;line-height:1.8;">Rutinas suaves, promos lindas y una edici&oacute;n pensada para inspirarte.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 34px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff9fb;border:1px solid #f1dce5;">
                      <tr>
                        <td style="padding:28px 28px 8px;color:#8b6878;font-size:12px;line-height:1.7;letter-spacing:.14em;text-transform:uppercase;font-weight:700;">
                          Seleccionamos esto para ti
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 28px 28px;color:#7b3b57;font-family:Georgia,serif;font-size:28px;line-height:1.25;">
                          ${introText}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 34px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fff1f6" style="border:1px solid #f0d7e1;">
                      <tr>
                        <td style="padding:18px 20px;color:#8a5d70;font-size:14px;line-height:1.8;">
                          Una edici&oacute;n pensada para inspirarte, descubrir lanzamientos y entrar al cat&aacute;logo desde un correo m&aacute;s lindo y m&aacute;s claro.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 34px 4px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${bodyRows}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 34px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="33.33%" valign="top" style="padding-right:8px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fff7f9" style="border:1px solid #f2dce5;">
                            <tr><td align="center" style="padding:18px 14px 8px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#d96d90;font-weight:700;">Ritual diario</td></tr>
                            <tr><td align="center" style="padding:0 14px 18px;color:#7b3b57;font-size:13px;line-height:1.7;">Texturas suaves, glow y una rutina m&aacute;s simple de seguir.</td></tr>
                          </table>
                        </td>
                        <td width="33.33%" valign="top" style="padding:0 4px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fff7f9" style="border:1px solid #f2dce5;">
                            <tr><td align="center" style="padding:18px 14px 8px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#d96d90;font-weight:700;">Best sellers</td></tr>
                            <tr><td align="center" style="padding:0 14px 18px;color:#7b3b57;font-size:13px;line-height:1.7;">Favoritos y hallazgos que vale la pena mirar primero.</td></tr>
                          </table>
                        </td>
                        <td width="33.33%" valign="top" style="padding-left:8px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fff7f9" style="border:1px solid #f2dce5;">
                            <tr><td align="center" style="padding:18px 14px 8px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#d96d90;font-weight:700;">Desde Corea</td></tr>
                            <tr><td align="center" style="padding:0 14px 18px;color:#7b3b57;font-size:13px;line-height:1.7;">Selecciones curadas para comprar con m&aacute;s criterio y menos ruido.</td></tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${ctaButton ? `<tr><td align="center" style="padding:28px 34px 36px;">${ctaButton}</td></tr>` : ''}
                <tr>
                  <td style="padding:0 34px 34px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#2d1821">
                      <tr>
                        <td align="center" style="padding:24px 24px 10px;color:#ffffff;font-size:11px;line-height:1.7;letter-spacing:.18em;text-transform:uppercase;font-weight:700;">
                          Sigue la experiencia Bloomskin
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:0 24px 24px;color:#d7bcc8;font-size:13px;line-height:1.9;">
                          Recibes este correo porque te suscribiste a Bloomskin.<br />
                          Antofagasta, Chile<br />
                          <a href="https://www.instagram.com/bloomskin__cl" style="color:#f4d2de;text-decoration:none;">Instagram</a>
                          &nbsp;|&nbsp;
                          <a href="https://wa.me/569948418523" style="color:#f4d2de;text-decoration:none;">WhatsApp</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
    attachments: [],
  };
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
