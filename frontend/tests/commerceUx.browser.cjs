const assert = require('node:assert/strict')
const path = require('node:path')
const os = require('node:os')
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4185'
const products = [
  { id: 9901, nombre: 'Serum QA sensible', marca: 'Bloomskin QA', categoria: 'Serums', precio_clp: 10000, stock: 4, tipos_piel: ['Sensible'], necesidades: ['Hidratación'], badge: 'hot' },
  { id: 9902, nombre: 'Crema QA grasa', marca: 'Marca QA', categoria: 'Hidratantes', precio_clp: 20000, stock: 0, tipos_piel: ['Grasa'], necesidades: ['Hidratación'], badge: null },
  { id: 9903, nombre: 'Crema QA sin etiquetas', marca: 'Bloomskin QA', categoria: 'Hidratantes', precio_clp: 30000, stock: 2, tipos_piel: [], necesidades: [], badge: 'new' },
].map(product => ({ ...product, usa_tonos: false, tonos: [], tonos_stock: {}, variant_meta: {}, imagen_url: '/brand/bloomskin-logo.png', descripcion: 'Producto ficticio de prueba', resenas: 0 }))

;(async () => {
  const settings = await fetch(`${base}/api/settings/site`).then(r => r.json())
  if (settings.seo) settings.seo.ga_measurement_id = ''
  for (const [engine, launch] of [[chromium, { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' }], [webkit, {}]]) {
    const browser = await engine.launch({ ...launch, headless: true })
    try {
      for (const width of [320, 390, 768, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 844 } })
        const errors = [], writes = []
        let notificationSettings = { enabled: true, email: 'qa-owner@example.invalid', paid: true, payment_submitted: true, pending_payment: false }
        try {
          await context.route(url => url.pathname.startsWith('/api/'), async route => {
            const req = route.request(), pathname = new URL(req.url()).pathname
            let body = []
            if (!['GET', 'HEAD'].includes(req.method())) writes.push(pathname)
            if (pathname === '/api/settings/site') body = settings
            else if (pathname === '/api/productos' || pathname === '/api/productos/admin') body = products
            else if (/^\/api\/productos\/\d+$/.test(pathname)) body = products.find(p => p.id === Number(pathname.split('/').pop()))
            else if (pathname === '/api/mensajes/email/status') body = { connected: true, configured: true, from: 'QA', events: [], admin_events: [], notifications: notificationSettings, store_url: 'https://bloomskin.cl', flow: { enabled: true, sandbox: false } }
            else if (pathname === '/api/mensajes/email/notifications') { notificationSettings = req.postDataJSON(); body = notificationSettings }
            else if (pathname === '/api/pedidos/stats') body = {}
            await route.fulfill({ json: body })
          })
          const page = await context.newPage()
          page.on('pageerror', error => errors.push(error.message))
          await page.goto(`${base}/catalogo`, { waitUntil: 'networkidle' })
          await page.locator('.products-grid .product-card').first().waitFor()
          const filterButton = page.getByRole('button', { name: /Filtros y orden/ })
          if (width <= 720) await filterButton.click()
          await page.getByLabel('Tipo de piel', { exact: true }).waitFor({ state: 'visible' })
          await page.getByLabel('Tipo de piel', { exact: true }).selectOption({ label: 'Sensible' })
          await page.waitForURL(/skin=sensible/)
          await page.waitForFunction(() => document.querySelectorAll('.products-grid .product-card').length === 1)
          assert.match(await page.locator('.products-grid').innerText(), /Serum QA sensible/)
          await page.reload({ waitUntil: 'networkidle' })
          assert.equal(await page.getByLabel('Tipo de piel', { exact: true }).inputValue(), 'sensible')
          await page.locator('.products-grid .product-card').click()
          await page.getByRole('button', { name: 'Cerrar vista rápida' }).click()
          assert.match(page.url(), /skin=sensible/)
          if (!(await page.getByLabel('Tipo de piel', { exact: true }).isVisible())) await filterButton.click()
          await page.getByLabel('Tipo de piel', { exact: true }).selectOption('all')
          await page.getByLabel('Stock', { exact: true }).selectOption('in')
          await page.waitForFunction(() => document.querySelectorAll('.products-grid .product-card').length === 2)
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
          await page.screenshot({ path: path.join(os.tmpdir(), `bloomskin-catalog-filters-${engine.name()}-${width}.png`), fullPage: true })
          await page.goto(`${base}/`, { waitUntil: 'networkidle' })
          const flag = page.locator('.promo-flag')
          await flag.waitFor()
          assert.equal(await flag.evaluate(img => img.complete && img.naturalWidth > 0 && Math.abs(img.naturalWidth / img.naturalHeight - 1.5) < 0.05), true)
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
          await page.evaluate(() => {
            localStorage.setItem('bs_admin_token', 'qa-not-a-real-token')
            localStorage.setItem('bs_admin_user', JSON.stringify({ nombre: 'Admin QA' }))
            sessionStorage.setItem('bs_admin_section', 'integraciones')
          })
          await page.goto(`${base}/admin`, { waitUntil: 'networkidle' })
          await page.getByLabel('Correo del comercio').fill('qa-new@example.invalid')
          await page.getByRole('button', { name: 'Guardar avisos', exact: true }).click()
          await page.getByText('Avisos guardados.', { exact: true }).waitFor()
          assert.equal(notificationSettings.email, 'qa-new@example.invalid')
          assert.equal(notificationSettings.pending_payment, false)
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
          await page.screenshot({ path: path.join(os.tmpdir(), `bloomskin-admin-alerts-${engine.name()}-${width}.png`), fullPage: true })
          assert.deepEqual(writes, ['/api/mensajes/email/notifications'])
          assert.deepEqual(errors, [])
          console.log(`PASS ${engine.name()} ${width}: filters, URL restore, quick view, stock, flag, private admin alerts`)
        } finally { await context.close() }
      }
    } finally { await browser.close() }
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
