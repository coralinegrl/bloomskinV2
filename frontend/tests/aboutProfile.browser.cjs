const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4185'
// A local bitmap is only a synthetic upload fixture, never a published portrait.
const bitmap = fs.readFileSync(path.join(__dirname, '../public/brand/bloomskin-logo.png'))
const photo = '/uploads/productos/qa-portrait.png'
const emptyProfile = { founder_name: '', founder_bio: '', photo_url: '', photo_alt: '' }

;(async () => {
  const engines = process.env.QA_WEBKIT_ONLY ? [[webkit, {}]] : [[chromium, { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' }], [webkit, {}]]
  for (const [engine, options] of engines) {
    const browser = await engine.launch({ ...options, headless: true })
    try {
      for (const width of [320, 390, 768, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 900 } })
        let settings = { about: { ...emptyProfile } }, uploads = 0, saves = 0, failUpload = false
        const errors = [], writes = []
        try {
          await context.route(url => url.pathname.startsWith('/api/'), async route => {
            const request = route.request(), pathname = new URL(request.url()).pathname
            let body = [], status = 200
            if (!['GET', 'HEAD'].includes(request.method())) writes.push(pathname)
            if (pathname === '/api/settings/site') {
              if (request.method() === 'PUT') { settings = request.postDataJSON(); saves++; body = { ok: true, site: settings } }
              else body = settings
            } else if (pathname === '/api/productos/upload-image') {
              uploads++
              await new Promise(resolve => setTimeout(resolve, 100))
              status = failUpload ? 503 : 200
              body = failUpload ? { error: 'No pudimos subir la foto QA.' } : { image_url: photo }
            } else if (pathname === '/api/pedidos/stats') body = {}
            await route.fulfill({ status, json: body })
          })
          await context.route(`**${photo}`, route => route.fulfill({ contentType: 'image/png', body: bitmap }))
          const page = await context.newPage()
          page.on('pageerror', error => errors.push(error.message))
          await page.goto(`${base}/quienes-somos`, { waitUntil: 'networkidle' })
          assert.equal(await page.locator('.founder-section').count(), 0)
          await page.evaluate(() => {
            localStorage.setItem('bs_admin_token', 'qa-not-a-real-token')
            localStorage.setItem('bs_admin_user', JSON.stringify({ nombre: 'Admin QA' }))
            sessionStorage.setItem('bs_admin_section', 'home')
          })
          await page.goto(`${base}/admin`, { waitUntil: 'networkidle' })
          const input = page.getByLabel('Tu foto', { exact: true })
          await input.setInputFiles({ name: 'video.gif', mimeType: 'image/gif', buffer: bitmap })
          await page.getByRole('alert').filter({ hasText: 'hasta 5 MB' }).waitFor()
          assert.equal(uploads, 0)
          // Construct the large fixture in the browser to avoid serializing megabytes through WebKit's protocol.
          await input.evaluate(element => {
            const transfer = new DataTransfer()
            transfer.items.add(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' }))
            element.files = transfer.files
            element.dispatchEvent(new Event('change', { bubbles: true }))
          })
          assert.equal(uploads, 0)
          failUpload = true
          await input.setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: bitmap })
          await page.getByRole('alert').filter({ hasText: 'No pudimos subir la foto QA.' }).waitFor()
          failUpload = false
          await input.setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: bitmap })
          await page.locator('.founder-photo-preview').waitFor()
          await page.getByLabel('Tu nombre o apodo', { exact: true }).fill('Nombre QA')
          await page.getByLabel('Tu presentación', { exact: true }).fill('Presentacion personal de prueba.\nSegunda linea de la historia.')
          await page.getByLabel('Descripción de la foto', { exact: true }).fill('Retrato de prueba QA')
          await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
          await page.getByText('Sin cambios pendientes', { exact: true }).waitFor()
          assert.equal(saves, 1)
          assert.equal(uploads, 2)
          assert.equal(settings.about.photo_url, photo)
          assert.equal(settings.about.founder_name, 'Nombre QA')
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
          await page.getByLabel('Tu presentación', { exact: true }).scrollIntoViewIfNeeded()
          await page.screenshot({ path: path.join(os.tmpdir(), `bloomskin-founder-admin-${engine.name()}-${width}.png`) })
          await page.goto(`${base}/quienes-somos`, { waitUntil: 'networkidle' })
          await page.getByRole('heading', { name: 'Nombre QA', exact: true }).waitFor()
          const image = page.getByRole('img', { name: 'Retrato de prueba QA', exact: true })
          assert.equal(await image.evaluate(img => img.complete && img.naturalWidth > 0), true)
          assert.match(await page.locator('.founder-story').innerText(), /Segunda linea/)
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
          await page.screenshot({ path: path.join(os.tmpdir(), `bloomskin-founder-${engine.name()}-${width}.png`), fullPage: true })
          settings.about.photo_url = '/uploads/productos/missing.png'
          await context.route('**/uploads/productos/missing.png', route => route.fulfill({ status: 404, body: '' }))
          await page.reload({ waitUntil: 'networkidle' })
          assert.equal(await page.locator('.founder-portrait').count(), 0)
          await page.getByRole('heading', { name: 'Nombre QA', exact: true }).waitFor()
          settings.about.photo_url = photo
          await page.goto(`${base}/admin`, { waitUntil: 'networkidle' })
          await page.getByRole('button', { name: 'Quitar foto', exact: true }).click()
          await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
          await page.getByText('Sin cambios pendientes', { exact: true }).waitFor()
          assert.equal(settings.about.photo_url, '')
          assert.equal(settings.about.photo_alt, '')
          assert.equal(settings.about.founder_name, 'Nombre QA')
          assert.equal(saves, 2)
          assert.deepEqual(errors, [])
          assert.deepEqual(writes, ['/api/productos/upload-image', '/api/productos/upload-image', '/api/settings/site', '/api/settings/site'])
          console.log(`PASS ${engine.name()} ${width}: optional profile, upload errors, file limits, save, render, broken image, removal`)
        } finally { await context.close() }
      }
    } finally { await browser.close() }
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
