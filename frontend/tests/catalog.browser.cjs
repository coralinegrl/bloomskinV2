const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

const baseUrl = process.env.CATALOG_QA_URL || 'http://127.0.0.1:4181';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bloomskin-catalog-'));
const product = { marca: 'Marca A', categoria: 'Hidratantes', precio_clp: 15000, stock: 3, imagen_url: '/catalogo/catalogo-001.png', estrellas: '*****', resenas: 0 };
let products = [
  { ...product, id: 1, nombre: 'Producto etiquetado', tipos_piel: ['Seca', 'Sensible'], necesidades: ['Hidratacion'] },
  { ...product, id: 2, nombre: 'Producto sin etiquetas' },
  { ...product, id: 3, nombre: 'Producto agotado', stock: 0, tipos_piel: ['Grasa'], necesidades: ['Limpieza'] },
];
let saved;
let savedBulk;
let failCatalog = false;

async function mockApi(route) {
  const request = route.request();
  const pathname = new URL(request.url()).pathname;
  if (!pathname.startsWith('/api/')) return route.continue();
  let json = [];
  if (pathname === '/api/productos' || pathname === '/api/productos/admin') {
    if (failCatalog) return route.fulfill({ status: 500, json: { error: 'Test' } });
    json = products;
  } else if (pathname === '/api/productos/atributos' && request.method() === 'PATCH') {
    savedBulk = request.postDataJSON();
    assert.deepEqual(Object.keys(savedBulk).sort(), ['ids', 'necesidades', 'tipos_piel']);
    products = products.map(p => savedBulk.ids.includes(p.id) ? { ...p,
      tipos_piel: [...new Set([...(p.tipos_piel || []), ...savedBulk.tipos_piel])],
      necesidades: [...new Set([...(p.necesidades || []), ...savedBulk.necesidades])],
    } : p);
    json = { products: products.filter(p => savedBulk.ids.includes(p.id)).map(({ id, tipos_piel, necesidades }) => ({ id, tipos_piel, necesidades })) };
  } else if (/\/api\/productos\/\d+$/.test(pathname) && request.method() === 'PUT') {
    saved = request.postDataJSON();
    products = products.map(p => p.id === 1 ? { ...p, ...saved } : p);
    json = products[0];
  } else if (pathname === '/api/pedidos/stats') json = {};
  else if (pathname === '/api/settings/site') json = { site: {} };
  else if (pathname === '/api/settings/home') json = {};
  return route.fulfill({ json });
}

async function noOverflow(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow');
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.route('**/api/**', mockApi);
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.setDefaultNavigationTimeout(15000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${baseUrl}/catalogo`);
      await page.locator('.product-card').nth(2).waitFor();
      if (width < 721) await page.getByRole('button', { name: /Filtros y orden/ }).click();
      await page.getByLabel(/^Tipo de piel/).selectOption('seca');
      await page.waitForURL('**/catalogo?skin=seca');
      assert.equal(await page.locator('.product-card').count(), 1);
      await page.getByLabel(/^Necesidad/).selectOption('hidratacion');
      await page.waitForURL('**/catalogo?skin=seca&need=hidratacion');
      await page.getByLabel(/^Marca/).selectOption('Marca A');
      await page.getByLabel(/^Stock/).selectOption('in');
      await page.getByLabel(/^Precio/).selectOption('under-15000');
      await page.waitForURL(url => url.searchParams.get('price') === 'under-15000');
      assert.equal(await page.locator('.product-card').count(), 1);
      await page.reload();
      await page.locator('.product-card').waitFor();
      if (width < 721) await page.getByRole('button', { name: /Filtros y orden/ }).click();
      assert.equal(await page.getByLabel(/^Tipo de piel/).inputValue(), 'seca');
      assert.equal(await page.getByLabel(/^Necesidad/).inputValue(), 'hidratacion');
      assert.equal(await page.getByLabel(/^Marca/).inputValue(), 'Marca A');
      assert.equal(await page.getByLabel(/^Stock/).inputValue(), 'in');
      assert.equal(await page.getByLabel(/^Precio/).inputValue(), 'under-15000');
      await noOverflow(page);
      await page.screenshot({ path: path.join(output, `catalog-${width}.png`), fullPage: true });
      await page.getByLabel(/^Necesidad/).selectOption('limpieza');
      await page.getByText('No encontramos productos con esa combinación.').waitFor();
      await page.getByRole('button', { name: 'Quitar Necesidad: Limpieza', exact: true }).click();
      await page.locator('.product-card').waitFor();
      await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
      await page.waitForURL('**/catalogo');
      assert.equal(await page.locator('.product-card').count(), 3);
      await page.goto(`${baseUrl}/catalogo?skin=retirada`);
      await page.getByText('No encontramos productos con esa combinación.').waitFor();
      if (width < 721) await page.getByRole('button', { name: /Filtros y orden/ }).click();
      assert.equal(await page.getByLabel(/^Tipo de piel/).inputValue(), 'retirada');
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`Catalog ${width}px: combined filters, URL reload, chips, reset, empty state and layout OK`);
    }

    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route('**/api/**', mockApi);
    await context.addInitScript(() => {
      localStorage.setItem('bs_admin_token', 'local-test-only');
      localStorage.setItem('bs_admin_user', JSON.stringify({ nombre: 'QA' }));
      sessionStorage.setItem('bs_admin_section', 'productos');
    });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/admin`);
    await page.locator('.mobile-product-row').first().getByRole('button', { name: 'Editar producto', exact: true }).click();
    const modal = page.locator('.modal');
    await modal.getByRole('checkbox', { name: 'Seca', exact: true }).uncheck();
    await modal.getByRole('textbox', { name: 'Nueva etiqueta: Tipo de piel', exact: true }).fill('Mixta');
    await modal.getByRole('button', { name: 'Agregar etiqueta: Tipo de piel', exact: true }).click();
    await modal.getByRole('textbox', { name: 'Nueva etiqueta: Necesidad', exact: true }).fill('Textura uniforme');
    await modal.getByRole('textbox', { name: 'Nueva etiqueta: Necesidad', exact: true }).press('Enter');
    await modal.getByRole('checkbox', { name: 'Mixta', exact: true }).waitFor();
    await noOverflow(page);
    await page.screenshot({ path: path.join(output, 'admin-mobile.png'), fullPage: true });
    await modal.getByRole('button', { name: 'Guardar producto', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });
    assert.deepEqual(saved.tipos_piel, ['Sensible', 'Mixta']);
    assert.deepEqual(saved.necesidades, ['Hidratacion', 'Textura uniforme']);
    await page.locator('.mobile-product-row').first().getByRole('button', { name: 'Editar producto', exact: true }).click();
    assert(await modal.getByRole('checkbox', { name: 'Mixta', exact: true }).isChecked());
    await modal.getByRole('button', { name: 'Quitar todas: Tipo de piel', exact: true }).click();
    await modal.getByRole('button', { name: 'Guardar producto', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });
    assert.deepEqual(saved.tipos_piel, []);
    await page.locator('.mobile-product-row').nth(1).getByRole('button', { name: 'Editar producto', exact: true }).click();
    assert.equal(await modal.locator('input[type=checkbox]:checked').count(), 0);
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Seleccionar Producto etiquetado', exact: true }).filter({ visible: true }).check();
    await page.getByRole('checkbox', { name: 'Seleccionar Producto sin etiquetas', exact: true }).filter({ visible: true }).check();
    await page.getByRole('button', { name: 'Añadir etiquetas', exact: true }).click();
    const bulk = page.getByRole('dialog', { name: 'Añadir etiquetas a 2 productos', exact: true });
    await bulk.getByRole('checkbox', { name: 'Mixta', exact: true }).check();
    await bulk.getByRole('button', { name: 'Añadir etiquetas', exact: true }).click();
    await bulk.waitFor({ state: 'hidden' });
    assert.deepEqual(savedBulk.ids, [1, 2]);
    assert.deepEqual(savedBulk.tipos_piel, ['Mixta']);
    assert.deepEqual(products[0].necesidades, ['Hidratacion', 'Textura uniforme']);
    assert.equal(products[0].stock, 3);
    await context.close();
    console.log('Mobile admin: add, uncheck, save, reload, clear labels and untagged products OK');

    const errorContext = await browser.newContext();
    await errorContext.route('**/api/**', mockApi);
    failCatalog = true;
    const errorPage = await errorContext.newPage();
    await errorPage.goto(`${baseUrl}/catalogo`);
    await errorPage.getByText('No pudimos cargar los productos.', { exact: true }).waitFor();
    failCatalog = false;
    await errorPage.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await errorPage.locator('.product-card').nth(2).waitFor();
    await errorContext.close();
    console.log(`Error/retry OK. Screenshots: ${output}`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
