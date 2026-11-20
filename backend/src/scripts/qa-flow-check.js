require('dotenv').config();
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('node:assert/strict');
const fixturePath=path.join(os.tmpdir(),'bloomskin-flow-sandbox-fixture.json');
const fixture=JSON.parse(fs.readFileSync(fixturePath,'utf8'));
assert.match(fixture.dbName,/^bloomskin_qa_\d+$/);
process.env.DB_NAME=fixture.dbName;
process.env.FLOW_ENV='sandbox';process.env.FLOW_ENABLED='true';
process.env.FLOW_API_KEY=process.env.FLOW_SANDBOX_API_KEY;process.env.FLOW_SECRET_KEY=process.env.FLOW_SANDBOX_SECRET_KEY;
const {getPool,sql}=require('../config/db');
const {flowRequest}=require('../lib/flow');
async function api(route,body,token,method=body?'POST':'GET') {
  const r=await fetch(fixture.local+'/api'+route,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
  const data=await r.json();assert(r.ok,`${route}: HTTP ${r.status} ${data.error||''}`);return data;
}
async function run(){
  const pool=await getPool();
  assert.equal((await pool.request().query('SELECT DB_NAME() AS name')).recordset[0].name,fixture.dbName);
  const action=process.argv[2] || 'audit';
  const current=await api(`/pedidos/${fixture.order.id}/access`,null,fixture.order.access_token);
  const token=new URL(fixture.payment.url).searchParams.get('token');
  const provider=await flowRequest('payment/getStatus',{token});
  if(action==='audit') {
    assert.equal(current.estado,'paid');assert.equal(Number(provider.status),2);
    const before=(await pool.request().input('id',sql.Int,fixture.productId).query('SELECT stock,tonos_stock_json FROM productos WHERE id=@id')).recordset[0];
    for(let i=0;i<2;i++) {
      const r=await fetch(fixture.publicUrl+'/api/flow/confirm',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token})});assert.equal(r.status,200);
    }
    const after=(await pool.request().input('id',sql.Int,fixture.productId).query('SELECT stock,tonos_stock_json FROM productos WHERE id=@id')).recordset[0];
    assert.deepEqual(after,before);assert.equal(JSON.parse(after.tonos_stock_json).Rosa,0);assert.equal(after.stock,2);
    const event=(await pool.request().input('id',sql.Int,fixture.order.id).query("SELECT COUNT(*) AS n FROM order_mail_events WHERE pedido_id=@id AND estado='paid'")).recordset[0];assert.equal(event.n,1);
    assert.equal((await fetch(fixture.publicUrl+'/admin')).status,404);
    assert.equal((await fetch(fixture.publicUrl+'/api/pedidos')).status,404);
    assert.equal((await(await fetch('https://bloomskin.cl/api/flow/config')).json()).enabled,false);
    const report={approved:true,browserReturned:fixture.browserUrl?.startsWith(fixture.publicUrl+'/pedido/'),duplicateCallbacksSafe:true,stock:after,paidEmailEvents:event.n,productionFlowEnabled:false};
    fs.writeFileSync(path.join(fixture.outputDir,'approved-audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  }
  if(['create-reject','create-cancel'].includes(action)) {
    assert.equal(current.estado,'paid');
    fixture.completedOrders=[...(fixture.completedOrders||[]),{order:fixture.order,payment:fixture.payment}];
    const items=[{producto_id:fixture.productId,cantidad:1,tono_seleccionado:'Rojo'}];
    await api('/pedidos/reservation',{items},fixture.customerToken);
    const order=await api('/pedidos',{items,delivery_mode:'pickup',metodo_pago:'flow'},fixture.customerToken);
    const payment=await api(`/flow/${order.id}/create`,{},order.access_token);
    if(action==='create-cancel') await api(`/pedidos/${order.id}/estado`,{estado:'cancelled'},fixture.adminToken,'PATCH');
    Object.assign(fixture,{order,payment,browserUrl:null});fs.writeFileSync(fixturePath,JSON.stringify(fixture));
    console.log('Next payment test prepared in QA only:',action);
  }
  if(action==='audit-reject') {
    assert.notEqual(current.estado,'paid');assert.notEqual(Number(provider.status),2);
    console.log(JSON.stringify({providerStatus:Number(provider.status),orderStatus:current.estado,notMarkedPaid:true}));
    await api(`/pedidos/${fixture.order.id}/estado`,{estado:'cancelled'},fixture.adminToken,'PATCH');
    const stock=(await pool.request().input('id',sql.Int,fixture.productId).query('SELECT stock,tonos_stock_json FROM productos WHERE id=@id')).recordset[0];
    assert.equal(stock.stock,2);assert.equal(JSON.parse(stock.tonos_stock_json).Rojo,2);
    const count=(await pool.request().input('id',sql.Int,fixture.order.id).query("SELECT COUNT(*) AS n FROM order_mail_events WHERE pedido_id=@id AND estado='paid'")).recordset[0].n;assert.equal(count,0);
    fs.writeFileSync(path.join(fixture.outputDir,'rejected-audit.json'),JSON.stringify({providerStatus:Number(provider.status),notMarkedPaid:true,stockRestored:true,noPaidEmail:true},null,2));
    console.log('PASS: rejection does not confirm a sale; cancellation restores only the reserved variant.');
  }
  if(action==='create-retry') {
    assert.equal(Number(provider.status),3);assert.equal(current.estado,'pending_payment');
    const before=(await pool.request().input('id',sql.Int,fixture.productId).query('SELECT stock FROM productos WHERE id=@id')).recordset[0].stock;
    const payment=await api(`/flow/${fixture.order.id}/create`,{},fixture.order.access_token);
    assert.notEqual(payment.url,fixture.payment.url,'A rejected attempt must get a fresh Flow token');
    assert.equal((await api(`/flow/${fixture.order.id}/create`,{},fixture.order.access_token)).url,payment.url);
    fixture.previousPayment=fixture.payment;fixture.payment=payment;fixture.browserUrl=null;
    fs.writeFileSync(fixturePath,JSON.stringify(fixture));
    const after=(await pool.request().input('id',sql.Int,fixture.productId).query('SELECT stock FROM productos WHERE id=@id')).recordset[0].stock;
    assert.equal(before,after);console.log('PASS: retry creates one new Flow attempt without changing order or stock.');
  }
  if(action==='audit-retry') {
    assert.equal(current.estado,'paid');assert.equal(Number(provider.status),2);
    const oldToken=new URL(fixture.previousPayment.url).searchParams.get('token');
    const r=await fetch(fixture.publicUrl+'/api/flow/confirm',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:oldToken})});assert.equal(r.status,200);
    const payment=(await pool.request().input('id',sql.Int,fixture.order.id).query('SELECT status,requiere_revision FROM flow_payments WHERE pedido_id=@id')).recordset[0];
    assert.equal(payment.status,2);assert.equal(payment.requiere_revision,false);
    const attempts=(await pool.request().input('id',sql.Int,fixture.order.id).query('SELECT status FROM flow_payment_attempts WHERE pedido_id=@id')).recordset;
    assert.equal(attempts.length,2);assert(attempts.some(a=>a.status===3));assert(attempts.some(a=>a.status===2));
    const stock=(await pool.request().input('id',sql.Int,fixture.productId).query('SELECT stock FROM productos WHERE id=@id')).recordset[0].stock;assert.equal(stock,1);
    const count=(await pool.request().input('id',sql.Int,fixture.order.id).query("SELECT COUNT(*) AS n FROM order_mail_events WHERE pedido_id=@id AND estado='paid'")).recordset[0].n;assert.equal(count,1);
    fs.writeFileSync(path.join(fixture.outputDir,'retry-audit.json'),JSON.stringify({approved:true,attempts:attempts.length,lateRejectedCallbackSafe:true,noExtraStockDeduction:true,paidEmailEvents:count},null,2));
    console.log('PASS: rejected-then-approved payment, attempt history, old callback isolation and single stock deduction.');
  }
  if(action==='audit-late') {
    assert.equal(current.estado,'cancelled');assert.equal(Number(provider.status),2);
    const payment=(await pool.request().input('id',sql.Int,fixture.order.id).query('SELECT requiere_revision FROM flow_payments WHERE pedido_id=@id')).recordset[0];assert.equal(payment.requiere_revision,true);
    const stock=(await pool.request().input('id',sql.Int,fixture.productId).query('SELECT stock,tonos_stock_json FROM productos WHERE id=@id')).recordset[0];assert.equal(stock.stock,1);assert.equal(JSON.parse(stock.tonos_stock_json).Rojo,1);
    const count=(await pool.request().input('id',sql.Int,fixture.order.id).query("SELECT COUNT(*) AS n FROM order_mail_events WHERE pedido_id=@id AND estado='paid'")).recordset[0].n;assert.equal(count,0);
    const diagnostics=await api('/mensajes/email/status',null,fixture.adminToken);assert(diagnostics.flow.review_orders.includes(fixture.order.id));
    const stats=await api('/pedidos/stats',null,fixture.adminToken);assert.equal(stats.ventas_totales,2000);assert.equal(stats.total_pedidos,2);
    fs.writeFileSync(path.join(fixture.outputDir,'late-audit.json'),JSON.stringify({orderStillCancelled:true,manualReviewVisible:true,noStockDeduction:true,noPaidEmail:true},null,2));
    console.log('PASS: actual Sandbox late payment is flagged for reconciliation, without reviving the cancelled sale, consuming stock or inflating sales totals.');
  }
}
run().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>require('../config/db').sql.close());
