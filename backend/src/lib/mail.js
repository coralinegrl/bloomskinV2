const nodemailer = require('nodemailer');
let transport;

function createMailer() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !(process.env.SMTP_FROM || process.env.SMTP_USER)) return null;
  if (!transport) transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 6000, greetingTimeout: 6000, socketTimeout: 12000,
    pool: true, maxConnections: 1, maxMessages: 40,
    tls: { minVersion: 'TLSv1.2' },
  });
  return transport;
}

function storeBaseUrl() {
  return String(process.env.STORE_BASE_URL || process.env.PUBLIC_APP_URL || 'https://bloomskin.cl').replace(/\/$/, '');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

function renderMessage({ title, name, paragraphs = [], details = [], actionLabel, actionUrl }) {
  const text = [`Hola ${name || 'clienta'},`, '', title, ...paragraphs, '', ...details.map(([key, value]) => `${key}: ${value}`), '', actionUrl || '', 'Bloomskin · K-Beauty Chile'].join('\n');
  const html = `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#fff4f7;font-family:Arial,sans-serif;color:#5f2d45">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border:1px solid #efd8df;border-radius:8px">
      <tr><td style="padding:24px;border-bottom:1px solid #efd8df"><img src="${escapeHtml(storeBaseUrl())}/brand/bloomskin-logo.png" width="48" height="48" alt="Bloomskin" style="vertical-align:middle"><span style="font-family:Georgia,serif;font-size:28px;color:#bf547a"> bloomskin</span></td></tr>
      <tr><td style="padding:24px"><h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.25;margin:0 0 20px">${escapeHtml(title)}</h1><p style="font-size:16px;line-height:1.7">Hola ${escapeHtml(name || 'clienta')},</p>
      ${paragraphs.map(p => `<p style="font-size:16px;line-height:1.7">${escapeHtml(p)}</p>`).join('')}
      <table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="font-size:15px;background:#fff8fa">${details.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td align="right"><strong>${escapeHtml(v)}</strong></td></tr>`).join('')}</table>
      ${actionUrl ? `<p style="margin:24px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#bf547a;color:white;padding:14px 20px;border-radius:6px;text-decoration:none;font-size:16px">${escapeHtml(actionLabel || 'Ver pedido')}</a></p>` : ''}
      <p style="font-size:14px;line-height:1.7;color:#866476">¿Necesitas ayuda? Responde este correo. Nunca te pediremos contraseñas ni códigos bancarios.</p></td></tr>
    </table><p style="font-size:13px;color:#866476">Bloomskin · K-Beauty Chile</p></td></tr></table></body></html>`;
  return { text, html };
}

async function sendMessage({ to, subject, ...content }) {
  const mailer = createMailer();
  if (!mailer) { console.error('Correo no enviado: configuración SMTP incompleta.'); return false; }
  const result = await mailer.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, ...renderMessage(content) });
  return Boolean(result.accepted?.length);
}

module.exports = { createMailer, storeBaseUrl, escapeHtml, renderMessage, sendMessage };
