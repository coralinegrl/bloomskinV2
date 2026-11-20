const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bloomskin-settings-test-'));
process.env.SITE_SETTINGS_FILE = path.join(directory, 'settings.json');
const { sanitizeSiteSettings, sanitizeHomeSettings, readSettings, writeSettings } = require('./siteSettings');
after(() => fs.rmSync(directory, { recursive: true, force: true }));

test('legacy settings receive community defaults without losing existing content', () => {
  const settings = sanitizeSiteSettings({ home: { hero: { title: 'Mi tienda' } } });
  assert.equal(settings.home.hero.title, 'Mi tienda');
  assert.equal(settings.home.whatsappClub.enabled, true);
  assert.match(settings.home.whatsappClub.url, /^https:\/\/chat\.whatsapp\.com\//);
});

test('community edits and disabled state survive a file save and reload', () => {
  const settings = readSettings();
  settings.home.whatsappClub = {
    enabled: false, tag: 'Club', title: 'Comunidad', copy: 'Novedades',
    button_label: 'Entrar', url: 'https://chat.whatsapp.com/NewInvitation?mode=gi_t',
  };
  writeSettings(settings);
  const stored = readSettings();
  assert.deepEqual(stored.home.whatsappClub, settings.home.whatsappClub);
  assert.deepEqual(stored.payment, settings.payment);
  assert.deepEqual(stored.footer, settings.footer);
});

test('community text has bounded lengths', () => {
  const home = sanitizeHomeSettings({ whatsappClub: { title: 'x'.repeat(300), copy: 'x'.repeat(900) } });
  assert.equal(home.whatsappClub.title.length, 160);
  assert.equal(home.whatsappClub.copy.length, 600);
});

test('section visibility defaults on and preserves explicit disabled sections', () => {
  const home = sanitizeHomeSettings({ sections: { news: false, reviews: false } });
  assert.equal(home.sections.news, false);
  assert.equal(home.sections.reviews, false);
  assert.equal(home.sections.newIn, true);
  const settings = readSettings();
  settings.home.sections = home.sections;
  writeSettings(settings);
  assert.deepEqual(readSettings().home.sections, home.sections);
});

test('community links reject scripts, unrelated hosts, credentials, and missing invitations', () => {
  for (const url of ['javascript:alert(1)', 'http://chat.whatsapp.com/abc', 'https://evil.example/abc',
    'https://chat.whatsapp.com.evil.example/abc', 'https://user@chat.whatsapp.com/abc',
    'https://chat.whatsapp.com/', 'https://chat.whatsapp.com:444/abc']) {
    assert.throws(() => sanitizeHomeSettings({ whatsappClub: { url } }), { code: 'INVALID_SITE_SETTINGS' });
  }
});

test('founder details stay optional and survive settings save without changing store content', () => {
  const legacy = sanitizeSiteSettings({ about: { heading: 'Nuestra tienda', body: 'Nuestra historia real' } });
  assert.equal(legacy.about.photo_url, '');
  assert.equal(legacy.about.founder_name, '');
  const settings = readSettings();
  const previousHome = settings.home;
  settings.about = { ...settings.about, founder_name: 'Nombre QA', founder_bio: 'Una historia propia.\nCon dos párrafos.',
    photo_url: '/uploads/productos/123-retrato.jpg', photo_alt: 'Retrato de prueba' };
  writeSettings(settings);
  assert.deepEqual(readSettings().about, settings.about);
  assert.deepEqual(readSettings().home, previousHome);
  settings.about.photo_url = ''; settings.about.founder_name = ''; settings.about.founder_bio = '';
  writeSettings(settings);
  assert.equal(readSettings().about.photo_url, '');
  assert.equal(readSettings().about.founder_bio, '');
});

test('portrait fields are bounded and unsafe or nonimage URLs cannot be published', () => {
  const about = sanitizeSiteSettings({ about: { founder_name: 'x'.repeat(200), founder_bio: 'x'.repeat(2000), photo_alt: 'x'.repeat(300) } }).about;
  assert.equal(about.founder_name.length, 100);
  assert.equal(about.founder_bio.length, 1600);
  assert.equal(about.photo_alt.length, 180);
  for (const photo_url of ['javascript:alert(1)', 'data:image/png;base64,AAA', '//evil.example/photo.jpg',
    '/uploads/comprobantes/private.png', '/uploads/productos/../secret.jpg', '/uploads/productos/file.html',
    'http://example.com/photo.jpg', 'https://user:pass@example.com/photo.png', 'https://example.com/photo.svg']) {
    assert.throws(() => sanitizeSiteSettings({ about: { photo_url } }), { code: 'INVALID_SITE_SETTINGS' });
  }
  assert.equal(sanitizeSiteSettings({ about: { photo_url: 'https://example.com/photo.jpeg?v=1' } }).about.photo_url, 'https://example.com/photo.jpeg?v=1');
});
