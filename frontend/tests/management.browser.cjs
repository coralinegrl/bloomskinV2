const assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os')
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const base=process.env.QA_BASE_URL || 'http://127.0.0.1:4185'
const product={id:9901,nombre:'Labial de prueba QA',marca:'Marca QA',categoria:'Maquillaje',precio_clp:12000,stock:1,activo:true,publication_status:'published',usa_tonos:true,tonos:['Rosa','Rojo'],tonos_stock:{Rosa:1,Rojo:0},tonos_stock_json:'{"Rosa":1,"Rojo":0}',variant_meta:{},imagen_url:'/brand/bloomskin-logo.png',tipos_piel:[],necesidades:[]}
const order={id:9901,codigo:'BS-QA',estado:'paid',cliente_nombre:'Clienta QA',cliente_email:'qa@example.invalid',cliente_telefono:'+56912345678',total_clp:12000,metodo_envio:'blue_express',direccion_envio:'Direccion QA',creado_en:new Date().toISOString(),items:[{producto_id:9901,producto_nombre:product.nombre,producto_marca:product.marca,cantidad:1,tono_seleccionado:'Rosa',precio_unitario_clp:12000}]}
;(async()=>{
 const initial=await fetch(`${base}/api/settings/site`).then(r=>r.json())
 const engines=process.env.QA_WEBKIT_ONLY ? [[webkit,{}]] : [[chromium,{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}],[webkit,{}]]
 for(const [engine,options] of engines){const browser=await engine.launch({...options,headless:true});try{for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900}});const errors=[],writes=[];let settings=structuredClone(initial),products=[structuredClone(product)],rows=[{producto_id:9901,nombre:product.nombre,marca:product.marca,variant:'Rosa',available:1,reserved:1,on_hand:2,sold:3,requests:0},{producto_id:9901,nombre:product.nombre,marca:product.marca,variant:'Rojo',available:0,reserved:0,on_hand:0,sold:2,requests:1}],fulfillment={checked:[],carrier:'',tracking_number:'',tracking_url:'',admin_note:''},savedMail={},adjusted=false
  try{
   settings.operations={accepting_orders:true,pickup_enabled:true,pickup_address:'Oficina Lina 210',pickup_city:'Antofagasta',pickup_hours:'Retiro previa coordinacion',delivery_enabled:true,national_enabled:true,national_carrier:'Blue Express',national_fee:3990,free_shipping_enabled:true,free_shipping_threshold:49990,low_stock_threshold:3,pause_message:'Tienda pausada QA',local_tiers:[{km:2,fee:1500},{km:7,fee:2000}]};settings.seo.ga_measurement_id=''
   const customization=Object.fromEntries(['pending_payment','payment_submitted','paid','shipped','pickup_ready','delivered','cancelled'].map(state=>[state,{enabled:true,note:''}]))
   await context.route(url=>url.pathname.startsWith('/api/'),async route=>{
    const request=route.request(),url=new URL(request.url()),p=url.pathname,method=request.method();let body=[],status=200
    if(!['GET','HEAD'].includes(method))writes.push({path:p,body:request.postDataJSON()})
    if(p==='/api/settings/site'){if(method==='PUT'){settings=request.postDataJSON();body={ok:true,site:settings}}else body=settings}
    else if(p==='/api/productos/admin')body=products
    else if(p==='/api/productos'&&method==='POST'){const data=request.postDataJSON();products.push({...data,id:9902,activo:true});body=products.at(-1);status=201}
    else if(p==='/api/productos')body=products.filter(p=>p.publication_status!=='draft')
    else if(p==='/api/productos/9901')body=product
    else if(p==='/api/pedidos')body=[order]
    else if(p==='/api/pedidos/9901/access')body={...order,items:order.items.map(i=>({...i,cantidad:3,precio_unitario_clp:100,nombre:i.producto_nombre})),fulfillment:{carrier:fulfillment.carrier,tracking_number:fulfillment.tracking_number,tracking_url:fulfillment.tracking_url}}
    else if(p==='/api/pedidos/stats')body={ventas_mes:12000}
    else if(p==='/api/management/inventory')body={rows,low_stock_threshold:3}
    else if(p==='/api/management/inventory/adjust'){const data=request.postDataJSON();rows=rows.map(row=>row.variant===data.variant?{...row,available:row.available+data.amount}:row);adjusted=true;body={ok:true}}
    else if(p==='/api/management/inventory/history')body=[{id:1,variant:'Rosa',before_qty:1,after_qty:3,reason:'Reposicion QA',created_at:new Date().toISOString()}]
    else if(p==='/api/management/orders/9901/fulfillment'){if(method==='PUT'){fulfillment=request.postDataJSON();body={ok:true}}else body=fulfillment}
    else if(p==='/api/management/mail'){if(method==='PUT'){savedMail=request.postDataJSON();body=savedMail}else body={customization,events:[]}}
    else if(p==='/api/management/mail/preview')body={html:'<!doctype html><html><body><h1>Correo QA</h1></body></html>'}
    else if(p==='/api/management/backups')body={running:false,backups:[{id:'backup-qa',created_at:new Date().toISOString(),verified:true,files:4}]}
    else if(p==='/api/management/revisions')body=[]
    else if(p==='/api/management/activity')body=[]
    else if(p==='/api/mensajes/email/status')body={connected:true,configured:true,from:'QA',events:[],admin_events:[],notifications:{enabled:true,email:'owner@example.invalid'},flow:{enabled:true,sandbox:true}}
    else if(p==='/api/restock')body={ok:true}
    await route.fulfill({status,json:body})
   })
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept())
   await page.addInitScript(()=>{if(window.top!==window)return;localStorage.setItem('bs_admin_token','qa-no-real-token');localStorage.setItem('bs_admin_user',JSON.stringify({nombre:'Admin QA'}));sessionStorage.setItem('bs_admin_section','dashboard')})
   await page.goto(`${base}/admin`,{waitUntil:'networkidle'})
   await page.getByRole('heading',{name:'Tu día en Bloomskin',exact:true}).waitFor()
   await noOverflow(page)
   await page.screenshot({path:path.join(os.tmpdir(),`bloomskin-management-daily-${engine.name()}-${width}.png`),fullPage:true})
   async function section(name){const nav=page.locator('#admin-navigation');if(!(await nav.isVisible()))await page.locator('.mobile-admin-bar button').click();await nav.getByRole('button',{name,exact:true}).click()}
   await section('Inventario');await page.getByRole('heading',{name:'Inventario',exact:true}).waitFor();await page.getByRole('button',{name:'Ajustar',exact:true}).first().click()
   const dialog=page.getByRole('dialog',{name:'Ajustar inventario'});await dialog.getByLabel('Cantidad',{exact:true}).fill('2');await dialog.getByLabel('Nota del ajuste',{exact:true}).fill('Prueba de reposicion');await dialog.getByRole('button',{name:'Guardar ajuste',exact:true}).click();await page.getByText('Inventario actualizado.',{exact:true}).waitFor();assert(adjusted)
   await page.getByRole('button',{name:'Historial',exact:true}).first().click();await page.getByRole('dialog').getByText('Reposicion QA',{exact:true}).waitFor();await page.getByRole('button',{name:'Cerrar historial',exact:true}).click();await noOverflow(page)
   await section('Mi tienda');await page.getByLabel('Dirección de retiro',{exact:true}).fill('Nueva direccion QA');await page.getByLabel('Compra mínima para envío gratis (CLP)',{exact:true}).fill('60000');await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByText('Sin cambios pendientes',{exact:true}).waitFor();assert.equal(settings.operations.pickup_address,'Nueva direccion QA');assert.equal(settings.operations.free_shipping_threshold,60000);await noOverflow(page)
   await section('Contenido');await page.getByLabel('Qué quieres editar',{exact:true}).selectOption('nosotros');await page.getByLabel('Tu nombre o apodo',{exact:true}).waitFor();assert.equal(await page.locator('.home-tile-card:visible').count(),1);await noOverflow(page)
   await page.getByLabel('Tu nombre o apodo',{exact:true}).fill('Nombre solo en vista previa QA');const popupEvent=context.waitForEvent('page');await page.getByRole('button',{name:'Vista previa sin publicar',exact:true}).click();const popup=await popupEvent;await popup.waitForLoadState('networkidle');await popup.getByRole('heading',{name:'Nombre solo en vista previa QA',exact:true}).waitFor();assert.notEqual(settings.about.founder_name,'Nombre solo en vista previa QA');assert.equal(await popup.evaluate(()=>window.opener===null),true);await popup.close();await page.getByRole('button',{name:'Descartar',exact:true}).click()
   await section('Catálogo');const duplicate=width<=720 ? page.locator('.mobile-product-row').first().getByRole('button',{name:'Duplicar',exact:true}) : page.getByTitle('Duplicar producto como borrador').first();await duplicate.click();await page.getByLabel('Publicación',{exact:true}).waitFor();assert.equal(await page.getByLabel('Publicación',{exact:true}).inputValue(),'draft');await page.getByRole('button',{name:'Guardar borrador',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.modal-overlay'));assert.equal(products.length,2);assert.equal(products[1].stock,0);assert.equal(products[1].publication_status,'draft');await noOverflow(page)
   await section('Resumen');await page.locator('.daily-order').first().click();await page.getByRole('heading',{name:'Preparar y entregar',exact:true}).waitFor();await page.locator('.packing-list input').check();await page.getByLabel('Transportista',{exact:true}).fill('Courier QA');await page.getByLabel('Número de seguimiento',{exact:true}).fill('QA123');await page.getByLabel('Enlace de seguimiento',{exact:true}).fill('https://example.com/QA123');await page.getByRole('button',{name:'Guardar preparación',exact:true}).click();await page.getByText('Preparación guardada.',{exact:true}).waitFor();assert.deepEqual(fulfillment.checked,['9901:Rosa']);assert.equal(fulfillment.tracking_number,'QA123');await noOverflow(page)
   await section('Correos y pagos');await page.getByLabel('Mensaje adicional',{exact:true}).fill('Gracias por apoyar Bloomskin QA');await page.getByRole('button',{name:'Vista previa',exact:true}).click();await page.locator('iframe.mail-preview').waitFor();await page.getByRole('button',{name:'Guardar correos',exact:true}).click();await page.getByText('Correos actualizados.',{exact:true}).waitFor();assert.equal(savedMail.paid.note,'Gracias por apoyar Bloomskin QA');await noOverflow(page)
   await section('Historial y respaldos');await page.getByRole('button',{name:'Descargar datos',exact:true}).waitFor();await noOverflow(page)
   await page.screenshot({path:path.join(os.tmpdir(),`bloomskin-management-recovery-${engine.name()}-${width}.png`),fullPage:true})
   await page.goto(`${base}/producto/9901`,{waitUntil:'networkidle'});const restock=page.locator('.restock-alert');await restock.getByLabel('Tu correo',{exact:true}).fill('qa@example.invalid');await restock.locator('input[type=checkbox]').check();await restock.getByRole('button',{name:'Avísame cuando vuelva',exact:true}).click();await restock.getByRole('status').waitFor();assert.equal(writes.at(-1).body.variant,'Rojo');await noOverflow(page)
   await page.goto(`${base}/pedido/9901#access=qa-token`,{waitUntil:'networkidle'});await page.getByRole('link',{name:'Seguir envío',exact:false}).waitFor();await page.getByRole('button',{name:'Volver a comprar',exact:true}).click();await page.getByRole('dialog',{name:'Carrito de compras'}).waitFor();const bag=await page.evaluate(()=>JSON.parse(localStorage.getItem('bs_cart')));assert.equal(bag.length,1);assert.equal(bag[0].precio_clp,12000);assert.equal(bag[0].cantidad,1);assert.equal(bag[0].tono_seleccionado,'Rosa');await noOverflow(page)
   assert.deepEqual(errors,[]);console.log(`PASS ${engine.name()} ${width}: mobile admin navigation, daily tasks, inventory adjustment/history, settings, organized content, duplicate draft, packing/tracking, email preview/save, backups, restock`)
  }finally{await context.close()}
 }}finally{await browser.close()}}
})().catch(e=>{console.error(e);process.exitCode=1})
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Horizontal overflow at ${page.url()}`)}
