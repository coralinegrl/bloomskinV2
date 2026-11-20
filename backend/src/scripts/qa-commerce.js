// All mutations are confined to a newly created, explicitly named QA database.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawn, execFileSync } = require('child_process');
const base = 'http://127.0.0.1:3001';
const qaSecret = crypto.randomBytes(48).toString('hex');
let child, qaConnection, masterConnection;
async function run() {
  const { name: dbName, qa, master, sql } = await require('./lib/qaDatabase').createQaDatabase();
  qaConnection = qa; masterConnection = master;
  await qa.request().query(`INSERT INTO productos(marca,nombre,descripcion,categoria,precio_usd,precio_clp,stock,usa_tonos,tonos_json,tonos_stock_json,imagen_url)
    VALUES ('Bloomskin QA','Serum piel sensible','Hidratacion para piel sensible','Serums',10,10000,10,0,NULL,NULL,'/brand/bloomskin-logo.png'),
    ('Bloomskin QA','Labial con tipos','Dos variantes de prueba','Labiales',10,12000,3,1,'["Rosa","Rojo"]','{"Rosa":1,"Rojo":2}','/brand/bloomskin-logo.png');`);
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'bloomskin-commerce-'));
  fs.mkdirSync(path.join(scratch, 'data'));
  fs.writeFileSync(path.join(scratch, 'data', 'site-settings.json'), JSON.stringify({ payment: {
    bank_name: 'Banco QA', account_type: 'Cuenta QA', account_number: '12345', account_holder: 'Comercio QA', account_rut: '12.345.678-5', transfer_email: 'qa@example.invalid',
  } }));
  const qaEnv = {
    ...process.env, DB_NAME: dbName, PORT: '3001', NODE_ENV: 'test', SMTP_HOST: '', FLOW_ENABLED: 'true', FLOW_ENV:'sandbox', FLOW_API_KEY:'qa-fake', FLOW_SECRET_KEY:'qa-fake-secret',
    JWT_SECRET: qaSecret, STORE_BASE_URL:'http://127.0.0.1:5174',
    DATA_DIR: path.join(scratch, 'data'), SITE_SETTINGS_FILE: path.join(scratch, 'data', 'site-settings.json'), ORDER_NOTIFICATION_EMAIL: 'qa-owner@example.invalid',
    BANK_NAME: 'Banco QA', BANK_ACCOUNT_NUMBER: '12345', BANK_ACCOUNT_RUT: '12.345.678-5', BANK_TRANSFER_EMAIL: 'qa@example.invalid',
    UPLOADS_DIR: path.join(scratch, 'uploads'), FRONTEND_DIST: process.env.QA_FRONTEND_DIST || path.join(os.tmpdir(), 'bloomskin-v3-check'),
  };
  child = spawn(process.execPath, ['--require', './src/scripts/qa-flow-mock.cjs', 'src/server.js'], { cwd: path.resolve(__dirname, '../..'), stdio: 'inherit', env: qaEnv });
  let healthy = false;
  for (let i=0;i<80;i++) { await new Promise(r => setTimeout(r,500)); try { if ((await fetch(`${base}/api/health`)).ok) { healthy=true;break; } } catch (_) {} }
  assert(healthy, 'QA server did not start');
  async function api(url, body, token, method = body ? 'POST' : 'GET') {
    const response = await fetch(base + '/api' + url, { method, headers: { ...(body ? {'Content-Type':'application/json'} : {}), ...(token ? {Authorization:`Bearer ${token}`} : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, data: await response.json() };
  }
  const products = (await api('/productos')).data;
  const all = Array.isArray(products) ? products : products.productos;
  const normal = all.find(p=>p.nombre==='Serum piel sensible'), variant = all.find(p=>p.nombre==='Labial con tipos');
  assert(normal && variant, 'QA products missing');
  await qa.request().query(`UPDATE productos SET variant_meta_json=N'{"Rosa":{"precio_clp":15000},"Rojo":{"precio_clp":17000}}' WHERE id=${variant.id}`);
  const contact = {nombre:'Compradora QA', email:'qa@example.invalid',rut:'12.345.678-5',telefono:'+56912345678'};
  const guest = await api('/checkout/session',contact); assert.equal(guest.status,200,JSON.stringify(guest.data));
  const token = guest.data.token;
  assert.equal((await api('/auth/client/me',null,token)).status,403,'Guest must not access an account');
  assert.equal((await api('/mensajes',null,token)).status,403,'Guest must not access admin');
  const tooMany = await api('/pedidos/reservation',{items:[{producto_id:variant.id,cantidad:2,tono_seleccionado:'Rosa'}]},token);
  assert(tooMany.status>=400,'Variant stock must be enforced');
  const items=[{producto_id:variant.id,cantidad:1,tono_seleccionado:'Rosa'}];
  const reserve=await api('/pedidos/reservation',{items},token); assert.equal(reserve.status,201,JSON.stringify(reserve.data));
  const again=await api('/pedidos/reservation',{items},token); assert(again.status<300);
  assert(reserve.data.reservation.expires_en);
  assert.equal(again.data.reservation.expires_en,reserve.data.reservation.expires_en,'Reservation deadline must not reset');
  const created=await api('/pedidos',{items,delivery_mode:'pickup',metodo_pago:'bank_transfer'},token);
  assert.equal(created.status,201,JSON.stringify(created.data));
  assert.equal(created.data.total_clp,15000,'Server must use variant price');
  const order=created.data;
  assert.equal((await api(`/pedidos/${order.id}/access`,null,order.access_token)).status,200);
  assert.equal((await api(`/pedidos/${order.id+1}/access`,null,order.access_token)).status,403,'Order token must be scoped');
  const second=await api('/checkout/session',contact);
  assert.equal((await api(`/pedidos/${order.id}/access`,null,second.data.token)).status,404,'Email alone cannot grant order access');
  assert.equal((await api('/pedidos',{items,delivery_mode:'pickup'},token)).status,409,'Consumed reservation cannot create duplicate order');
  const events=(await qa.request().query('SELECT * FROM order_mail_events')).recordset;
  assert.equal(events.length,0,'Invalid test recipient must not receive emails');
  const stock=(await qa.request().query(`SELECT stock,tonos_stock_json FROM productos WHERE id=${variant.id}`)).recordset[0];
  assert.equal(JSON.parse(stock.tonos_stock_json).Rosa,0);
  const jwt=require('jsonwebtoken');
  const bcrypt=require('bcryptjs');
  await qa.request().input('hash',sql.NVarChar,await bcrypt.hash('QaOnly123!',10)).query("INSERT INTO usuarios(nombre,email,password_hash) VALUES('Admin QA','admin@example.invalid',@hash)");
  const adminToken=jwt.sign({id:1,rol:'admin',tipo:'admin'},qaSecret,{expiresIn:'1h'});
  assert.equal((await api('/mensajes/email/notifications',{email:'qa@example.invalid'},token,'PUT')).status,403,'Guest cannot change private notification settings');
  assert.equal((await api('/mensajes/email/notifications',{enabled:true,email:'invalid'},adminToken,'PUT')).status,400);
  const alertSettings=await api('/mensajes/email/notifications',{enabled:true,email:'qa-owner@example.invalid'},adminToken,'PUT');
  assert.equal(alertSettings.status,200,JSON.stringify(alertSettings.data));
  assert.equal(alertSettings.data.pending_payment,false,'Unpaid reservations do not request preparation by default');
  assert(!JSON.stringify((await api('/settings/site')).data).includes('qa-owner'),'Private recipient must not leak through site settings');
  const expired=jwt.sign({tipo:'order_access',pedido_id:order.id},qaSecret,{expiresIn:-1});
  assert.equal((await api(`/pedidos/${order.id}/access`,null,expired)).status,401,'Expired link must be denied');
  const currentVariant=(await api(`/productos/${variant.id}`)).data;
  const updatedProduct=await api(`/productos/${variant.id}`,{...currentVariant,variant_meta:{Rosa:{precio_clp:15000},Rojo:{precio_clp:17000,imagen_url:'/brand/bloomskin-logo.png'}}},adminToken,'PUT');
  assert.equal(updatedProduct.status,400,'Unsupported local image path should be rejected');
  const validProduct=await api(`/productos/${variant.id}`,{...currentVariant,variant_meta:{Rosa:{precio_clp:15000},Rojo:{precio_clp:17000}}},adminToken,'PUT');
  assert.equal(validProduct.status,200,JSON.stringify(validProduct.data));
  assert.equal(validProduct.data.variant_meta.Rojo.precio_clp,17000,'Admin can persist per-variant metadata');
  const cancelled=await api(`/pedidos/${order.id}/estado`,{estado:'cancelled'},adminToken,'PATCH');
  assert.equal(cancelled.status,200,JSON.stringify(cancelled.data));
  async function upload(id, token, bytes, name='proof.png', type='image/png') {
    const form=new FormData();form.append('comprobante',new Blob([bytes],{type}),name);
    return fetch(`${base}/api/pedidos/${id}/comprobante`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form});
  }
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6ioAAAAASUVORK5CYII=','base64');
  assert.equal((await upload(order.id,order.access_token,png)).status,409,'Cancelled order cannot receive proof');
  assert.equal((await api(`/pedidos/${order.id}`,null,adminToken,'DELETE')).status,200,'Cancelled order can be hidden');
  async function buy(method,email=contact.email) {
    const g=await api('/checkout/session',{...contact,email});
    const it=[{producto_id:normal.id,cantidad:1}];
    assert.equal((await api('/pedidos/reservation',{items:it},g.data.token)).status,201);
    const p=await api('/pedidos',{items:it,delivery_mode:'pickup',metodo_pago:method},g.data.token);
    assert.equal(p.status,201,JSON.stringify(p.data));return p.data;
  }
  const proofOrder=await buy('bank_transfer');
  assert.equal((await upload(proofOrder.id,proofOrder.access_token,Buffer.from('GIF89a fake image'))).status,400,'Disguised GIF must be rejected');
  assert.equal((await upload(proofOrder.id,proofOrder.access_token,png)).status,201,'Valid PNG is accepted');
  assert.equal((await upload(proofOrder.id,proofOrder.access_token,png)).status,409,'Repeated upload must not duplicate event');
  const flowOrder=await buy('flow','qa@example.test');
  const payment=await api(`/flow/${flowOrder.id}/create`,{},flowOrder.access_token);
  assert.equal(payment.status,200,JSON.stringify(payment.data));
  assert.equal((await api(`/flow/${flowOrder.id}/create`,{},flowOrder.access_token)).status,409,'An already-approved provider payment cannot create another charge when its notification was missed');
  const flowToken=new URL(payment.data.url).searchParams.get('token');
  assert.equal((await api('/flow/confirm',{token:flowToken})).status,200);
  assert.equal((await api('/flow/confirm',{token:flowToken})).status,200);
  assert.equal((await api(`/pedidos/${flowOrder.id}/access`,null,flowOrder.access_token)).data.estado,'paid');
  const paidEvents=(await qa.request().query(`SELECT COUNT(*) AS n FROM order_mail_events WHERE pedido_id=${flowOrder.id} AND estado='paid'`)).recordset[0].n;
  assert.equal(paidEvents,1,'Repeated Flow callback cannot duplicate paid email');
  const ownerPaid=(await qa.request().query(`SELECT COUNT(*) AS n FROM order_admin_mail_events WHERE pedido_id=${flowOrder.id} AND estado='paid'`)).recordset[0].n;
  assert.equal(ownerPaid,1,'Repeated Flow callback cannot duplicate the owner alert');
  const late=await buy('flow');
  const latePayment=await api(`/flow/${late.id}/create`,{},late.access_token);
  await api(`/pedidos/${late.id}/estado`,{estado:'cancelled'},adminToken,'PATCH');
  assert.equal((await api('/flow/confirm',{token:new URL(latePayment.data.url).searchParams.get('token')})).status,200);
  assert.equal((await qa.request().query(`SELECT requiere_revision FROM flow_payments WHERE pedido_id=${late.id}`)).recordset[0].requiere_revision,true,'Late payment needs manual review');
  assert.equal((await qa.request().query(`SELECT COUNT(*) AS n FROM order_admin_mail_events WHERE pedido_id=${late.id} AND estado='manual_review'`)).recordset[0].n,1,'Late payment alerts the merchant separately');
  function maintenance() {
    execFileSync(process.execPath,['--require','./src/scripts/qa-flow-mock.cjs','-e',
      "if(!/^bloomskin_qa_\\d+$/.test(process.env.DB_NAME))throw Error('QA only');const{sql}=require('./src/config/db');require('./src/routes/pedidos').runOrderMaintenance().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>sql.close())"],
      {cwd:path.resolve(__dirname,'../..'),env:qaEnv,stdio:'pipe',timeout:60000});
  }
  const expireGuest=await api('/checkout/session',contact);
  const expireItems=[{producto_id:variant.id,cantidad:1,tono_seleccionado:'Rosa'}];
  assert.equal((await api('/pedidos/reservation',{items:expireItems},expireGuest.data.token)).status,201);
  const expiring=(await api('/pedidos',{items:expireItems,delivery_mode:'pickup',metodo_pago:'flow'},expireGuest.data.token)).data;
  await qa.request().input('id',sql.Int,expiring.id).query('UPDATE pedidos SET comprobante_limite_en=DATEADD(MINUTE,-1,SYSUTCDATETIME()) WHERE id=@id');
  maintenance();
  const expiredState=(await qa.request().input('id',sql.Int,expiring.id).query('SELECT estado,stock_comprometido FROM pedidos WHERE id=@id')).recordset[0];
  assert.equal(expiredState.estado,'cancelled'); assert.equal(expiredState.stock_comprometido,false);
  const restored=(await qa.request().query(`SELECT stock,tonos_stock_json FROM productos WHERE id=${variant.id}`)).recordset[0];
  assert.equal(JSON.parse(restored.tonos_stock_json).Rosa,1,'Expired unpaid order restores its variant');
  maintenance();
  assert.deepEqual((await qa.request().query(`SELECT stock,tonos_stock_json FROM productos WHERE id=${variant.id}`)).recordset[0],restored,'Repeated maintenance must not restore stock twice');
  const missed=await buy('flow');
  assert.equal((await api(`/flow/${missed.id}/create`,{},missed.access_token)).status,200);
  // The provider mock lives in the QA server; its scheduled worker must recover this missed callback.
  for(let i=0;i<80;i++) {
    const current=(await api(`/pedidos/${missed.id}/access`,null,missed.access_token)).data;
    if(current.estado==='paid')break;
    if(i===79)assert.fail('Scheduled reconciliation did not recover the paid order');
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  console.log('PASS: automatic expiry restores variant stock exactly once; missed Flow callback reconciles; private owner alerts are idempotent.');
  console.log('PASS: proof signature and deadlines, cancelled order hiding, mocked Flow create/verify/idempotency/late payment. No real charge or email sent.');
  const fixture={base,dbName,token,adminToken,normal,variant,order};
  fs.writeFileSync(path.join(os.tmpdir(),'bloomskin-commerce-fixture.json'),JSON.stringify(fixture));
  console.log('PASS: guest identity, token isolation, variant stock/price, reservation deadline, duplicate checkout, email suppression. QA database:',dbName);
  await qa.close(); await master.close();
  if (process.env.QA_KEEP_SERVER==='true') await new Promise(resolve=>process.once('SIGINT',resolve));
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{child?.kill(); await qaConnection?.close(); await masterConnection?.close(); await require('../config/db').sql.close();});
