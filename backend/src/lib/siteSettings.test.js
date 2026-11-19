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
