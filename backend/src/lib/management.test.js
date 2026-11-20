const {test,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'bloomskin-management-unit-'));
process.env.DATA_DIR=directory;process.env.SITE_SETTINGS_FILE=path.join(directory,'site.json');
after(()=>fs.rmSync(directory,{recursive:true,force:true}));
const {sanitizeOperations}=require('./storeOperations');
test('store operation defaults preserve existing rates and reject unsafe configuration',()=>{
 const config=sanitizeOperations();assert.equal(config.pickup_address,'Oficina Lina 210');assert.equal(config.national_fee,3990);assert.equal(config.free_shipping_threshold,49990);
 assert.throws(()=>sanitizeOperations({national_fee:-1}));assert.throws(()=>sanitizeOperations({national_fee:1.5}));assert.throws(()=>sanitizeOperations({accepting_orders:'false'}));
 assert.throws(()=>sanitizeOperations({pickup_enabled:false,delivery_enabled:false}));assert.equal(sanitizeOperations({accepting_orders:false,pickup_enabled:false,delivery_enabled:false}).accepting_orders,false);
 assert.throws(()=>sanitizeOperations({local_tiers:[{km:2,fee:100},{km:2,fee:200}]}));assert.throws(()=>sanitizeOperations({local_tiers:[{km:0,fee:0}]}));
 assert.deepEqual(sanitizeOperations({local_tiers:[{km:5,fee:500},{km:1,fee:100}]}).local_tiers,[{km:1,fee:100},{km:5,fee:500}]);
});
test('drafts can be incomplete, but explicit publication requires a valid sale price, photo and category',()=>{
 const {validatePublication}=require('./productPublication');validatePublication({nombre:'Borrador',publication_status:'draft'});
 assert.throws(()=>validatePublication({nombre:'Producto',publication_status:'published',precio_clp:1000}));
 assert.throws(()=>validatePublication({nombre:'Producto',publication_status:'draft',stock:-1}));
 assert.throws(()=>validatePublication({nombre:'Producto',precio_clp:NaN}));
 validatePublication({nombre:'Producto',marca:'Marca',categoria:'Serums',imagen_url:'/catalogo/image.jpg',precio_clp:1000,publication_status:'published'});
});
test('content revisions are bounded, retain settings, and use opaque IDs',()=>{
 const files=require('./adminFiles');for(let i=0;i<35;i++)files.saveRevision({about:{founder_name:`QA${i}`}},1);
 const revisions=files.revisions();assert.equal(revisions.length,30);assert.equal(revisions[0].settings.about.founder_name,'QA34');assert.match(revisions[0].id,/^[a-f0-9-]+$/);
 assert.throws(()=>files.backupPath('../.env'));assert.throws(()=>files.backupPath('backup-../../uploads'));
});
test('custom email text is escaped; disabled customer events never disable owner content',()=>{
 const {writeCustomization}=require('./mailCustomization');const {customerOrderContent,adminOrderContent}=require('./orderMessages');const {renderMessage}=require('./mail');
 writeCustomization({paid:{enabled:true,note:'Gracias <img onerror="evil()">'}});
 const order={id:1,cliente_nombre:'QA',metodo_pago:'flow',direccion_envio:'Retiro QA',total_clp:10000};
 const content=customerOrderContent(order,'paid','https://example.com');assert(content.paragraphs.at(-1).includes('<img'));
 assert(!renderMessage(content).html.includes('<img onerror'));assert(renderMessage(content).html.includes('&lt;img'));
 writeCustomization({paid:{enabled:false}});assert.equal(customerOrderContent(order,'paid','https://example.com'),null);assert(adminOrderContent(order,'paid'));
});
