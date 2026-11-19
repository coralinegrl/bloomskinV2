const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('node:assert/strict');
const fixture=JSON.parse(fs.readFileSync(path.join(os.tmpdir(),'bloomskin-commerce-fixture.json'),'utf8'));
const base=process.env.BLOOMSKIN_QA_URL || 'http://127.0.0.1:5174';
const out=path.join(os.tmpdir(),'bloomskin-commerce-screenshots');fs.mkdirSync(out,{recursive:true});
let checks=0;
async function layout(page,name) {
  const sizes=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(sizes.scroll<=sizes.width+1,`${name}: overflow ${JSON.stringify(sizes)}`);
  await page.screenshot({path:path.join(out,`${name}.png`)});checks++;
}
async function shopper(browser,name,width) {
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'}), page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/news/**',r=>r.fulfill({json:{items:[]}}));
  await page.goto(base,{waitUntil:'networkidle'});await layout(page,`${name}-${width}-home`);
  await page.goto(`${base}/catalogo?q=piel%20sensible`,{waitUntil:'networkidle'});
  assert.equal(await page.locator('.product-card').count(),1,'Search should match product description without accents');
  await layout(page,`${name}-${width}-catalog`);
  await page.locator('.wishlist-btn').click();
  await page.locator('.add-to-cart').click();
  assert.equal(await page.locator('.drawer').count(),0,'Adding should not interrupt catalog browsing');
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.wishlist-btn').getAttribute('aria-pressed'),'true','Guest favorite survives reload');
  await page.getByRole('button',{name:'Carrito',exact:true}).filter({visible:true}).click();
  await page.locator('.cart-item').waitFor();assert.equal(await page.locator('.cart-item').count(),1,'Cart survives reload');
  await page.locator('.drawer').getByRole('button',{name:/Checkout|Continuar/}).last().click();
  await page.getByRole('radiogroup',{name:'Forma de entrega'}).waitFor();
  await page.getByRole('radio',{name:/Retiro en Oficina/}).click();
  assert(await page.getByText('Compra como invitada',{exact:true}).isVisible());
  await layout(page,`${name}-${width}-checkout`);
  if(name==='chrome' && width===390) {
    await page.locator('input[placeholder="Nombre completo"]').fill('Compradora Movil');
    await page.locator('input[autocomplete=email]').fill('mobile@example.invalid');
    await page.locator('input[placeholder="12.345.678-5"]').fill('12.345.678-5');
    await page.locator('input[placeholder="+56 9 1234 5678"]').fill('+56912345678');
    await page.getByRole('button',{name:'Crear pedido por transferencia',exact:true}).click();
    await page.getByRole('link',{name:'Ver y continuar mi pedido'}).waitFor({timeout:25000});
    await layout(page,`${name}-${width}-created`);
    const href=await page.getByRole('link',{name:'Ver y continuar mi pedido'}).getAttribute('href');
    assert(href.startsWith(base),'QA order link must not go to production');
    await page.goto(href,{waitUntil:'networkidle'});await page.getByText('Pago por transferencia',{exact:true}).waitFor();
    assert(!new URL(page.url()).hash,'Private token must be removed from browser address after reading');
    await layout(page,`${name}-${width}-order`);
  } else { await page.locator('.drawer-close').click(); }
  await page.goto(`${base}/producto/${fixture.variant.id}`,{waitUntil:'networkidle'});
  await page.locator('.tone-chip').first().click();
  assert((await page.locator('.detail-price-row').innerText()).includes('15.000'),'Selected variant price is visible');
  await layout(page,`${name}-${width}-detail`);
  await page.goto(`${base}/favoritos`,{waitUntil:'networkidle'});await layout(page,`${name}-${width}-favorites`);
  assert.equal(await page.locator('.product-card').count(),1);
  await page.goto(base,{waitUntil:'networkidle'});assert(await page.getByRole('heading',{name:'Vistos recientemente'}).isVisible());
  assert.deepEqual(errors,[],`${name} runtime errors`);await context.close();
}
async function admin(browser,name,width) {
  const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({token})=>{localStorage.setItem('bs_admin_token',token);localStorage.setItem('bs_admin_user',JSON.stringify({id:1,nombre:'QA Admin'}));},{token:fixture.adminToken});
  await page.goto(`${base}/admin`,{waitUntil:'networkidle'});await page.locator('.admin-main').waitFor();await layout(page,`${name}-${width}-admin`);
  async function section(label) { if(width<=640) await page.getByRole('button',{name:'Secciones',exact:true}).click();await page.locator('#admin-navigation').getByRole('button',{name:label,exact:false}).click();await page.waitForTimeout(400); }
  await section('Catálogo');await layout(page,`${name}-${width}-admin-products`);
  if(width<=640) assert(await page.locator('.mobile-product-row').first().isVisible());
  await section('Ventas');await layout(page,`${name}-${width}-admin-orders`);
  if(width<=640) { assert(await page.locator('.mobile-order-row select').first().isVisible()); await page.locator('.mobile-order-row').first().getByRole('button',{name:'Ver detalle'}).click();await page.waitForTimeout(400);assert((await page.locator('.order-detail-anchor').boundingBox()).y<200); }
  await section('Correos y pagos');await page.getByRole('heading',{name:'Flow',exact:true}).waitFor();await layout(page,`${name}-${width}-admin-email`);
  assert.deepEqual(errors,[],`${name} admin runtime errors`);await context.close();
}
(async()=>{
  const browsers=[];
  try {
    const chrome=await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});browsers.push(chrome);
    for(const width of [320,390,768,1440]) await shopper(chrome,'chrome',width);
    for(const width of [390,1440]) await admin(chrome,'chrome',width);
    const edge=await chromium.launch({executablePath:process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});browsers.push(edge);await shopper(edge,'edge',390);await admin(edge,'edge',390);
    const safari=await webkit.launch();browsers.push(safari);await shopper(safari,'webkit',390);await admin(safari,'webkit',390);
    console.log(`PASS: ${checks} responsive screenshots and commerce/admin assertions. Screenshots: ${out}`);
  } finally {for(const browser of browsers) await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
