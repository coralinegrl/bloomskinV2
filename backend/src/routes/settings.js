const router = require('express').Router();
const { requireAdminAuth } = require('../middleware/auth');
const { readSettings, writeSettings, sanitizeHomeSettings, sanitizeSiteSettings } = require('../lib/siteSettings');

router.get('/site', (_req, res) => {
  res.json(readSettings());
});

router.get('/home', (_req, res) => {
  const settings = readSettings();
  res.json(settings.home);
});

router.put('/site', requireAdminAuth, (req, res) => {
  try {
    const site = sanitizeSiteSettings(req.body || {});
    writeSettings(site);
    res.json({ ok: true, site });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo guardar la configuracion del sitio' });
  }
});

router.put('/home', requireAdminAuth, (req, res) => {
  try {
    const settings = readSettings();
    settings.home = sanitizeHomeSettings(req.body || {});
    writeSettings(settings);
    res.json({ ok: true, home: settings.home });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo guardar la configuracion del home' });
  }
});

module.exports = router;
