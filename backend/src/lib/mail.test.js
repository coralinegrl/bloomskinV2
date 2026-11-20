const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { storeBaseUrl } = require('./publicUrl');
const { messageOptions } = require('./mail');
const { customerOrderContent, adminOrderContent } = require('./orderMessages');
const { sanitizeAlertSettings, readAlertSettings, writeAlertSettings } = require('./orderAlerts');

test('production store URLs cannot send customers or Flow callbacks to localhost', t => {
  const original = { NODE_ENV: process.env.NODE_ENV, STORE_BASE_URL: process.env.STORE_BASE_URL, PUBLIC_APP_URL: process.env.PUBLIC_APP_URL };
  t.after(() => { for (const [key, value] of Object.entries(original)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  process.env.NODE_ENV = 'production';
  for (const value of ['http://localhost:5173/', 'https://127.0.0.1', 'https://[::1]', 'https://shop.local', 'https://localhost', 'not a URL', 'javascript:alert(1)', 'https://user:secret@bloomskin.cl']) {
    process.env.STORE_BASE_URL = value;
    assert.equal(storeBaseUrl(), 'https://bloomskin.cl');
  }
  process.env.STORE_BASE_URL = 'https://bloomskin.cl/';
  assert.equal(storeBaseUrl(), 'https://bloomskin.cl');
  process.env.NODE_ENV = 'test'; process.env.STORE_BASE_URL = 'http://127.0.0.1:5174/';
  assert.equal(storeBaseUrl(), 'http://127.0.0.1:5174');
});

test('emails include a real PNG via CID, matching HTML and text, without external logo downloads', async () => {
  const options = messageOptions({ to: 'qa@example.invalid', subject: 'QA', title: 'Pedido <seguro>', name: 'QA',
    actionUrl: 'https://bloomskin.cl/catalogo', actionLabel: 'Ver catálogo' });
  assert.match(options.html, /src="cid:bloomskin-logo@bloomskin.cl"/);
  assert.equal(options.attachments[0].cid, 'bloomskin-logo@bloomskin.cl');
  assert.deepEqual(fs.readFileSync(options.attachments[0].path).subarray(0, 8), Buffer.from([137,80,78,71,13,10,26,10]));
  const mailer = require('nodemailer').createTransport({ streamTransport: true, buffer: true });
  const result = await mailer.sendMail({ ...options, from: 'qa@example.invalid' });
  const mime = result.message.toString();
  assert.match(mime, /Content-ID: <bloomskin-logo@bloomskin.cl>/);
  assert.match(mime, /Content-Type: image\/png/);
  assert.match(options.html, /Pedido &lt;seguro&gt;/);
  assert.match(options.text, /https:\/\/bloomskin.cl\/catalogo/);
});

test('reserved orders distinguish payment methods and give the actual Chilean deadline', () => {
  const order = { id: 27, cliente_nombre: 'QA', total_clp: 7990, metodo_pago: 'flow', metodo_envio: 'store_pickup', comprobante_limite_en: '2026-11-20T02:00:00Z' };
  const content = customerOrderContent(order, 'pending_payment', 'https://bloomskin.cl/pedido/27');
  assert.match(content.paragraphs.join(' '), /todavía no está pagado/);
  assert.match(content.paragraphs.join(' '), /Flow/);
  assert(!content.paragraphs.join(' ').includes('sube el comprobante'));
  assert.match(content.details.find(([key]) => key === 'Paga antes de')[1], /hora de Chile/);
  assert.match(customerOrderContent({ ...order, metodo_pago: 'bank_transfer' }, 'pending_payment', '').paragraphs.join(' '), /sube el comprobante/);
  assert.match(customerOrderContent(order, 'payment_submitted', '').paragraphs[0], /no confirma el pago/);
});

test('owner alerts separate paid orders, proof review and late payments', () => {
  const order = { id: 27, total_clp: 7990, metodo_pago: 'flow', metodo_envio: 'store_pickup' };
  assert.match(adminOrderContent(order, 'paid').title, /preparar pedido/);
  assert.match(adminOrderContent(order, 'pending_payment').paragraphs[0], /No prepares/);
  assert.match(adminOrderContent(order, 'payment_submitted').paragraphs[0], /verifica el abono/);
  assert.match(adminOrderContent(order, 'manual_review').paragraphs[0], /No prepares/);
  assert.match(adminOrderContent(order, 'paid', [{ nombre: '<Producto>', cantidad: 1, tono_seleccionado: 'Rosa' }]).paragraphs[1], /Rosa/);
});

test('notification recipient is validated and kept in private settings, with paid/proof defaults', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bloomskin-alert-settings-'));
  const previous = process.env.DATA_DIR;
  process.env.DATA_DIR = dir;
  t.after(() => { if (previous === undefined) delete process.env.DATA_DIR; else process.env.DATA_DIR = previous; });
  assert.throws(() => sanitizeAlertSettings({ enabled: true, email: 'invalid' }), { code: 'INVALID_ALERT_SETTINGS' });
  assert.throws(() => sanitizeAlertSettings({ enabled: true, email: 'qa@example.com\r\nBcc:other@example.com' }), { code: 'INVALID_ALERT_SETTINGS' });
  const settings = writeAlertSettings({ enabled: true, email: 'OWNER@example.com' });
  assert.deepEqual(settings, { enabled: true, email: 'owner@example.com', paid: true, payment_submitted: true, pending_payment: false });
  assert.deepEqual(readAlertSettings(), settings);
  assert.equal(writeAlertSettings({ ...settings, enabled: false }).enabled, false);
});
