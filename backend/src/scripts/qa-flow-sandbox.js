// Uses real Flow Sandbox credentials, a fresh QA database and a temporary callback gateway.
require('dotenv').config();
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const { createQaDatabase } = require('./lib/qaDatabase');
const backendPort = 3171, gatewayPort = 3172;
const local = `http://127.0.0.1:${backendPort}`;
let database, gateway, tunnel, backend;
const callbacks = [];
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'bloomskin-flow-sandbox-'));

async function run() {
  assert(process.env.FLOW_SANDBOX_API_KEY && process.env.FLOW_SANDBOX_SECRET_KEY, 'Sandbox keys are missing');
  assert.notEqual(process.env.FLOW_SANDBOX_API_KEY, process.env.FLOW_API_KEY, 'Sandbox and production keys must differ');
  const addressParser = require('nodemailer/lib/addressparser');
  const testEmail = process.env.FLOW_SANDBOX_TEST_EMAIL || addressParser(process.env.SMTP_FROM || '')[0]?.address;
  assert(testEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail), 'Set FLOW_SANDBOX_TEST_EMAIL to an email owned by the merchant');
  const executable = process.env.CLOUDFLARED_PATH || path.join(os.tmpdir(), 'cloudflared-bloomskin-qa.exe');
  assert(fs.existsSync(executable), 'Set CLOUDFLARED_PATH to the official cloudflared executable');
  const probe = http.createServer();
  await new Promise((resolve,reject) => { probe.once('error',reject); probe.listen(backendPort,'127.0.0.1',resolve); });
  await new Promise(resolve => probe.close(resolve));
  gateway = http.createServer((req,res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const callback = req.method === 'POST' && ['/api/flow/confirm','/api/flow/return'].includes(pathname);
    const read = req.method === 'GET' && (/^\/pedido\/\d+$/.test(pathname) || /^\/api\/pedidos\/\d+\/access$/.test(pathname)
      || ['/api/health','/api/settings/site'].includes(pathname) || ['/assets/','/brand/','/catalogo/'].some(prefix=>pathname.startsWith(prefix)));
    if (!callback && !read) { res.writeHead(404); return res.end('Not available in QA'); }
    const upstream = http.request(local + req.url, { method:req.method, headers:{ ...req.headers, host:`127.0.0.1:${backendPort}` } }, response => {
      if (callback) { callbacks.push({route:pathname,status:response.statusCode,at:new Date().toISOString()}); console.log('Sandbox callback:',pathname,response.statusCode); }
      res.writeHead(response.statusCode,response.headers); response.pipe(res);
    });
    upstream.on('error',()=>{res.writeHead(503);res.end('QA backend is starting');});req.pipe(upstream);
  });
  await new Promise((resolve,reject)=>{gateway.once('error',reject);gateway.listen(gatewayPort,'127.0.0.1',resolve);});
  tunnel = spawn(executable,['tunnel','--url',`http://127.0.0.1:${gatewayPort}`,'--protocol','http2','--no-autoupdate'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  const publicUrl = await new Promise((resolve,reject)=>{
    let output=''; const timer=setTimeout(()=>reject(new Error('Temporary tunnel did not start')),60000);
    const receive=chunk=>{ output+=chunk.toString(); const match=/https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(output); if(match){clearTimeout(timer);resolve(match[0]);} };
    tunnel.stdout.on('data',receive);tunnel.stderr.on('data',receive);
    tunnel.once('error',reject);tunnel.once('exit',()=>{clearTimeout(timer);reject(new Error('Temporary tunnel exited'));});
  });
  database = await createQaDatabase();
  const {name,qa}=database;
  const seed = Math.floor(Date.now()/1000);
  assert(seed < 2147483000);
  await qa.request().batch(`DBCC CHECKIDENT ('pedidos', RESEED, ${seed});
    INSERT INTO productos(marca,nombre,descripcion,categoria,precio_usd,precio_clp,stock,usa_tonos,tonos_json,tonos_stock_json,imagen_url)
    VALUES('Bloomskin QA','Labial prueba Sandbox','Producto ficticio. No se despacha.','Maquillaje',0,1000,3,1,'["Rosa","Rojo"]','{"Rosa":1,"Rojo":2}','/brand/bloomskin-logo.png');`);
  const secret=crypto.randomBytes(48).toString('hex');
  const hash=await require('bcryptjs').hash(crypto.randomUUID(),10);
  const admin=(await qa.request().input('hash',database.sql.NVarChar,hash)
    .query("INSERT INTO usuarios(nombre,email,password_hash) OUTPUT INSERTED.id VALUES('Sandbox QA','qa-admin@example.invalid',@hash)")).recordset[0];
  backend=spawn(process.execPath,['--require','./src/scripts/qa-flow-observe.cjs','src/server.js'],{cwd:path.resolve(__dirname,'../..'),windowsHide:true,stdio:['ignore','pipe','pipe'],env:{
    ...process.env,DB_NAME:name,PORT:String(backendPort),NODE_ENV:'test',JWT_SECRET:secret,
    SMTP_HOST:'',SMTP_USER:'',SMTP_PASS:'',FLOW_ENABLED:'true',FLOW_ENV:'sandbox',
    FLOW_API_KEY:process.env.FLOW_SANDBOX_API_KEY,FLOW_SECRET_KEY:process.env.FLOW_SANDBOX_SECRET_KEY,
    STORE_BASE_URL:publicUrl,FRONTEND_URLS:publicUrl,FRONTEND_DIST:path.resolve(__dirname,'../../../frontend/dist'),
    DATA_DIR:path.join(scratch,'data'),SITE_SETTINGS_FILE:path.join(scratch,'data','settings.json'),UPLOADS_DIR:path.join(scratch,'uploads'),
  }});
  backend.stderr.on('data',chunk=>console.error(chunk.toString().replace(/https?:\/\/\S+/g,'[url]')));
  let healthy=false;
  for(let i=0;i<80;i++){await new Promise(r=>setTimeout(r,500));try{const r=await fetch(local+'/api/health');if(r.ok){healthy=true;break;}}catch(_){}}
  assert(healthy,'QA backend did not start');
  const products=await(await fetch(local+'/api/productos')).json();
  const product=products.find(p=>p.nombre==='Labial prueba Sandbox');
  assert(product);
  async function api(route,body,token){
    const r=await fetch(local+'/api'+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
    const data=await r.json();assert(r.ok,`${route}: HTTP ${r.status} ${data.error || ''}`);return data;
  }
  const customer=await api('/checkout/session',{nombre:'Prueba Sandbox Bloomskin',email:testEmail,rut:'12.345.678-5',telefono:'+56912345678'});
  const items=[{producto_id:product.id,cantidad:1,tono_seleccionado:'Rosa'}];
  await api('/pedidos/reservation',{items},customer.token);
  const order=await api('/pedidos',{items,delivery_mode:'pickup',metodo_pago:'flow'},customer.token);
  const payment=await api(`/flow/${order.id}/create`,{},order.access_token);
  assert(new URL(payment.url).hostname.endsWith('.flow.cl'),'Unexpected payment host');
  const paymentAgain=await api(`/flow/${order.id}/create`,{},order.access_token);
  assert.equal(paymentAgain.url,payment.url,'Repeated create must reuse the same payment');
  const adminToken=require('jsonwebtoken').sign({id:admin.id,tipo:'admin'},secret,{expiresIn:'20m'});
  fs.writeFileSync(path.join(os.tmpdir(),'bloomskin-flow-sandbox-fixture.json'),JSON.stringify({local,publicUrl,dbName:name,productId:product.id,customerToken:customer.token,adminToken,order,payment,outputDir:scratch}));
  console.log('Sandbox payment ready. QA database:',name);
  console.log('Fixture:',path.join(os.tmpdir(),'bloomskin-flow-sandbox-fixture.json'));
  console.log('Only Sandbox is enabled; production settings are unchanged.');
  await new Promise(resolve=>{ const timer=setTimeout(resolve,20*60*1000);process.once('SIGINT',()=>{clearTimeout(timer);resolve();}); });
  const state=(await qa.request().input('id',database.sql.Int,order.id).query('SELECT estado,total_clp,stock_comprometido FROM pedidos WHERE id=@id')).recordset[0];
  const stock=(await qa.request().input('id',database.sql.Int,product.id).query('SELECT stock,tonos_stock_json FROM productos WHERE id=@id')).recordset[0];
  fs.writeFileSync(path.join(scratch,'result.json'),JSON.stringify({state,stock,callbacks},null,2));
  console.log('Final QA state:',JSON.stringify({state,stock,callbacks}));
}

async function cleanup(){backend?.kill();tunnel?.kill();if(gateway)await new Promise(resolve=>gateway.close(resolve));await database?.qa.close();await database?.master.close();}
run().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(cleanup);
