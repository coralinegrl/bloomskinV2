const assert = require('node:assert/strict')
const path = require('node:path')
const os = require('node:os')
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4185'
const product = { id: 990001, nombre: 'Producto QA', marca: 'Bloomskin', categoria: 'Serums',
  precio_clp: 7990, stock: 5, usa_tonos: false, tonos: [], tonos_stock: {}, variant_meta: {}, cantidad: 1 }

async function scenario(browser, viewport, mode) {
  const context = await browser.newContext({ viewport })
  const requests = [], errors = []
  const deadline = new Date(Date.now() + 3600000).toISOString()
  let state = 'pending_payment', accessReads = 0
  const order = { id: 990001, codigo: 'BS-QA', cliente_nombre: 'Cliente QA', metodo_pago: 'flow',
    metodo_envio: 'store_pickup', comprobante_limite_en: deadline, subtotal_clp: 7990,
    envio_clp: 0, total_clp: 7990, items: [{ ...product, precio_unitario_clp: 7990 }],
    access_token: 'qa-token', access_url: `${base}/pedido/990001#access=qa-token` }
  try {
    // All API traffic is fulfilled here, including writes: no real order or charge.
    await context.route(url => url.pathname.startsWith('/api/'), async route => {
      const req = route.request(), url = new URL(req.url()), method = req.method()
      requests.push(`${method} ${url.pathname}`)
      let body = [], status = 200
      if (url.pathname === '/api/productos') body = [product]
      else if (url.pathname === '/api/settings/site') body = {}
      else if (url.pathname === '/api/flow/config') body = { enabled: true, sandbox: true }
      else if (url.pathname === '/api/pedidos/payment-config') body = { transfer: { is_complete: true } }
      else if (url.pathname === '/api/checkout/session') body = { token: 'qa-checkout' }
      else if (url.pathname.startsWith('/api/pedidos/reservation')) body = { reservation: { expires_en: deadline, items: [] } }
      else if (url.pathname === '/api/pedidos' && method === 'POST') body = order
      else if (url.pathname === '/api/pedidos/990001/access') { accessReads++; body = { ...order, estado: state } }
      else if (url.pathname === '/api/flow/990001/create') {
        await new Promise(resolve => setTimeout(resolve, 150))
        status = mode.includes('error') ? 503 : 200
        body = status === 200 ? { url: 'https://www.flow.cl/qa-new-tab' } : { error: 'No pudimos preparar el pago de prueba.' }
      }
      await route.fulfill({ status, json: body })
    })
    await context.route('https://www.flow.cl/**', route => route.fulfill({
      contentType: 'text/html', body: '<title>Flow QA</title><h1>Pago de prueba sin cobro</h1>' }))
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(({ product, blocked }) => {
      localStorage.setItem('bs_cart', JSON.stringify([product]))
      if (blocked) window.open = () => null
    }, { product, blocked: mode.includes('blocked') })
    const checkout = mode.startsWith('checkout')
    if (checkout) {
      await page.goto(`${base}/catalogo`, { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: 'Carrito', exact: true }).filter({ visible: true }).click()
      await page.getByRole('button', { name: 'Continuar compra', exact: true }).click()
      const drawer = page.getByRole('dialog', { name: 'Carrito de compras' })
      await drawer.getByRole('radio', { name: /Retiro en Oficina Lina 210/ }).click()
      await drawer.getByPlaceholder('Nombre completo', { exact: true }).fill('Cliente QA')
      await drawer.locator('input[type=email]').fill('qa@example.com')
      await drawer.getByPlaceholder('12.345.678-5', { exact: true }).fill('12345678-5')
      await drawer.getByPlaceholder('+56 9 1234 5678', { exact: true }).fill('+56912345678')
      await drawer.getByRole('radio', { name: 'Débito / crédito y otros medios con Flow' }).check()
      await drawer.getByRole('button', { name: 'Continuar a Flow', exact: true }).click()
      await page.waitForURL('**/pedido/990001?flow=*')
    } else {
      await page.goto(`${base}/pedido/990001#access=qa-token`, { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: 'Pagar con Flow', exact: true }).click()
    }
    const success = !mode.includes('blocked') && !mode.includes('error')
    if (success) {
      await page.getByText(/Flow se abri[oó] en otra pesta/).waitFor()
      await assertEventually(async () => context.pages().some(p => p.url().startsWith('https://www.flow.cl/')))
      const flow = context.pages().find(p => p.url().startsWith('https://www.flow.cl/'))
      assert.equal(await flow.evaluate(() => window.opener === null), true)
      assert.match(page.url(), /\/pedido\/990001/)
      const readsBefore = accessReads
      state = 'paid'
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await page.getByText('Pago confirmado', { exact: true }).waitFor()
      assert.ok(accessReads > readsBefore)
      assert.equal(await page.getByRole('button', { name: 'Pagar con Flow', exact: true }).count(), 0)
    } else if (mode.includes('blocked') && !checkout) {
      const link = page.getByRole('link', { name: 'Abrir Flow en otra pestaña', exact: true })
      await link.waitFor()
      assert.equal(await link.getAttribute('target'), '_blank')
      assert.match(await link.getAttribute('rel'), /noopener/)
      // The plain link still works when scripted windows are blocked, without another API call.
      await link.click()
      await assertEventually(async () => context.pages().some(p => p.url().startsWith('https://www.flow.cl/')))
    } else {
      await page.getByRole('button', { name: 'Pagar con Flow', exact: true }).waitFor()
      await assertEventually(async () => context.pages().length === 1)
    }
    const expectedCreates = checkout && mode.includes('blocked') ? 0 : 1
    assert.equal(requests.filter(r => r === 'POST /api/flow/990001/create').length, expectedCreates)
    assert.equal(requests.filter(r => r === 'POST /api/pedidos').length, checkout ? 1 : 0)
    assert.deepEqual(errors, [])
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    if (mode === 'order-blocked') await page.screenshot({ path: path.join(os.tmpdir(), `bloomskin-flow-tabs-${viewport.width}.png`), fullPage: true })
    console.log(`PASS ${viewport.width} ${mode}`)
  } finally { await context.close() }
}

async function assertEventually(check) {
  for (let i = 0; i < 50; i++) {
    if (await check()) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert.fail('Expected browser state was not reached')
}

;(async () => {
  const engines = process.env.QA_WEBKIT_ONLY ? [[webkit, {}]] : [
    [chromium, { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' }],
    [chromium, { executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' }],
    [webkit, {}],
  ]
  for (const [engine, options] of engines) {
    const browser = await engine.launch({ ...options, headless: true })
    try {
      for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 900 }]) {
        for (const mode of ['checkout-success', 'checkout-blocked', 'checkout-error', 'order-success', 'order-blocked', 'order-error']) {
          await scenario(browser, viewport, mode)
        }
      }
    } finally { await browser.close() }
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
