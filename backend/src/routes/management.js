const router = require('express').Router();
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { getPool, sql } = require('../config/db');
const { requireAdminAuth } = require('../middleware/auth');
const files = require('../lib/adminFiles');
const { readSettings, writeSettings, sanitizeSiteSettings } = require('../lib/siteSettings');
const { readCustomization, writeCustomization, states } = require('../lib/mailCustomization');
router.use(requireAdminAuth);
router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
const positiveId = value => Number.isSafeInteger(Number(value)) && Number(value)>0 ? Number(value) : null;
function fail(res,error) { if(!error.status || error.status>=500) console.error('Gestión:',error.code || error.name); return res.status(error.status || 500).json({ error:error.status ? error.message : 'No pudimos completar la operación. Intenta nuevamente.' }); }
function invalid(message,status=400) { const error = new Error(message); error.status=status; throw error; }
function parse(value,fallback=[]) { try { return JSON.parse(value || JSON.stringify(fallback)); } catch { return fallback; } }
function trackingUrl(value) {
  const input=String(value || '').trim();
  if (!input) return '';
  try { const url=new URL(input); if (url.protocol==='https:' && !url.username && !url.password && !url.port && !/^(localhost|127\.|0\.|10\.|192\.168\.|\[)/i.test(url.hostname)) return url.href.slice(0,1200); } catch {}
  invalid('El enlace de seguimiento debe ser una dirección pública https válida.');
}
async function publicFulfillment(pool,id) {
  const row=(await pool.request().input('id',sql.Int,id).query('SELECT carrier,tracking_number,tracking_url FROM order_fulfillment WHERE pedido_id=@id')).recordset[0];
  return row || null;
}
router.get('/inventory',async (_req,res) => {
  try {
    const pool=await getPool();
    const products=(await pool.request().query(`SELECT id,nombre,marca,stock,usa_tonos,tonos_stock_json,tonos_json,imagen_url,activo,publication_status FROM productos WHERE activo=1 ORDER BY marca,nombre`)).recordset;
    const quantities=(await pool.request().query(`
      SELECT i.producto_id,ISNULL(i.tono_seleccionado,'') variant,
        SUM(CASE WHEN p.estado IN ('pending_payment','payment_submitted') AND p.stock_comprometido=1 THEN i.cantidad ELSE 0 END) reserved,
        SUM(CASE WHEN p.estado IN ('paid','shipped','delivered') THEN i.cantidad ELSE 0 END) sold
      FROM pedido_items i JOIN pedidos p ON p.id=i.pedido_id WHERE p.eliminado_en IS NULL GROUP BY i.producto_id,i.tono_seleccionado;
      SELECT i.producto_id,ISNULL(i.tono_seleccionado,'') variant,SUM(i.cantidad) reserved
      FROM checkout_reservation_items i JOIN checkout_reservations r ON r.id=i.reservation_id GROUP BY i.producto_id,i.tono_seleccionado;
    `));
    const rows=products.flatMap(p => {
      const tones=parse(p.tonos_json), stock=parse(p.tonos_stock_json,{});
      return (p.usa_tonos ? tones : ['']).map(variant => {
        const order=quantities.recordsets[0].find(q=>q.producto_id===p.id && q.variant===variant);
        const checkout=quantities.recordsets[1].find(q=>q.producto_id===p.id && q.variant===variant);
        const available=p.usa_tonos ? Number(stock[variant] || 0) : p.stock;
        const reserved=Number(order?.reserved || 0)+Number(checkout?.reserved || 0);
        return { producto_id:p.id,nombre:p.nombre,marca:p.marca,variant,available,reserved,on_hand:available+reserved,sold:Number(order?.sold || 0),publication_status:p.publication_status };
      });
    });
    const alerts=(await pool.request().query("SELECT producto_id,variant,COUNT(*) requests FROM restock_alerts WHERE status='pending' GROUP BY producto_id,variant")).recordset;
    res.json({ rows:rows.map(row=>({...row,requests:alerts.find(a=>a.producto_id===row.producto_id && a.variant===row.variant)?.requests || 0})), low_stock_threshold:readSettings().operations.low_stock_threshold });
  } catch(error) { fail(res,error); }
});
router.get('/inventory/history',async(req,res)=>{
  try {
    const id=positiveId(req.query.producto_id); const pool=await getPool();
    res.json((await pool.request().input('id',sql.Int,id).query(`SELECT TOP 150 m.*,p.nombre FROM inventory_movements m LEFT JOIN productos p ON p.id=m.producto_id WHERE @id IS NULL OR m.producto_id=@id ORDER BY m.id DESC`)).recordset);
  } catch(error) { fail(res,error); }
});
router.post('/inventory/adjust',async(req,res)=>{
  let transaction;
  try {
    const id=positiveId(req.body.producto_id), amount=Number(req.body.amount), reason=String(req.body.reason || '').trim();
    const variant=String(req.body.variant || '');
    if (!id || !Number.isSafeInteger(amount) || amount===0 || Math.abs(amount)>100000 || reason.length<3 || reason.length>250) invalid('Indica una cantidad entera distinta de cero y el motivo del ajuste.');
    const pool=await getPool(); transaction=new sql.Transaction(pool); await transaction.begin();
    const p=(await new sql.Request(transaction).input('id',sql.Int,id).query('SELECT * FROM productos WITH(UPDLOCK,HOLDLOCK) WHERE id=@id AND activo=1')).recordset[0];
    if (!p) invalid('Producto no disponible.',404);
    const tones=parse(p.tonos_json), stocks=parse(p.tonos_stock_json,{});
    if (p.usa_tonos && !tones.includes(variant)) invalid('Selecciona un tipo válido.');
    if (!p.usa_tonos && variant) invalid('Este producto no tiene variantes.');
    const before=p.usa_tonos ? Number(stocks[variant] || 0) : p.stock;
    if (before+amount<0) invalid('No puedes retirar más unidades que las disponibles.');
    stocks[variant]=before+amount;
    const total=p.usa_tonos ? tones.reduce((sum,tone)=>sum+Number(stocks[tone] || 0),0) : before+amount;
    await new sql.Request(transaction).input('id',sql.Int,id).input('stock',sql.Int,total).input('tones',sql.NVarChar(sql.MAX),JSON.stringify(stocks)).input('reason',sql.NVarChar,reason).query(`
      DECLARE @last INT=(SELECT ISNULL(MAX(id),0) FROM inventory_movements WHERE producto_id=@id);
      UPDATE productos SET stock=@stock,tonos_stock_json=CASE WHEN usa_tonos=1 THEN @tones ELSE tonos_stock_json END,actualizado_en=GETDATE() WHERE id=@id;
      UPDATE inventory_movements SET reason=@reason WHERE producto_id=@id AND id>@last;
    `);
    await transaction.commit(); transaction=null; res.json({ ok:true,available:before+amount });
  } catch(error) { if(transaction) try { await transaction.rollback(); } catch {} fail(res,error); }
});
router.get('/orders/:id/fulfillment',async(req,res)=>{
  try {
    const id=positiveId(req.params.id); if(!id) invalid('Pedido inválido.'); const pool=await getPool();
    const order=(await pool.request().input('id',sql.Int,id).query('SELECT id FROM pedidos WHERE id=@id AND eliminado_en IS NULL')).recordset[0];
    if(!order) invalid('Pedido no encontrado.',404);
    const row=(await pool.request().input('id',sql.Int,id).query('SELECT * FROM order_fulfillment WHERE pedido_id=@id')).recordset[0];
    res.json({ ...row,checked:parse(row?.checked_json) });
  } catch(error) { fail(res,error); }
});
router.put('/orders/:id/fulfillment',async(req,res)=>{
  let transaction;
  try {
    const id=positiveId(req.params.id); if(!id) invalid('Pedido inválido.'); const pool=await getPool();
    const checked=req.body.checked; if(!Array.isArray(checked) || checked.length>100 || checked.some(v=>typeof v!=='string' || v.length>160)) invalid('La lista de preparación no es válida.');
    const url=trackingUrl(req.body.tracking_url);
    transaction=new sql.Transaction(pool); await transaction.begin();
    const order=(await new sql.Request(transaction).input('id',sql.Int,id).query('SELECT estado FROM pedidos WITH(UPDLOCK,HOLDLOCK) WHERE id=@id AND eliminado_en IS NULL')).recordset[0];
    if(!order || !['paid','shipped','delivered'].includes(order.estado)) invalid('Solo puedes preparar pedidos con pago confirmado.',409);
    const items=(await new sql.Request(transaction).input('id',sql.Int,id).query('SELECT producto_id,tono_seleccionado FROM pedido_items WHERE pedido_id=@id')).recordset;
    const valid=new Set(items.map(i=>`${i.producto_id}:${i.tono_seleccionado || ''}`));
    if(checked.some(key=>!valid.has(key))) invalid('La lista contiene productos que no pertenecen al pedido.');
    await new sql.Request(transaction).input('id',sql.Int,id).input('checked',sql.NVarChar(sql.MAX),JSON.stringify([...new Set(checked)]))
      .input('carrier',sql.NVarChar,String(req.body.carrier || '').trim().slice(0,80)).input('number',sql.NVarChar,String(req.body.tracking_number || '').trim().slice(0,100))
      .input('url',sql.NVarChar,url).input('note',sql.NVarChar,String(req.body.admin_note || '').trim().slice(0,1000)).query(`
        IF NOT EXISTS(SELECT 1 FROM order_fulfillment WHERE pedido_id=@id) INSERT INTO order_fulfillment(pedido_id) VALUES(@id);
        UPDATE order_fulfillment SET checked_json=@checked,carrier=@carrier,tracking_number=@number,tracking_url=@url,admin_note=@note,updated_at=SYSUTCDATETIME() WHERE pedido_id=@id;
      `);
    await transaction.commit(); transaction=null; res.json({ ok:true });
  } catch(error) { if(transaction) try { await transaction.rollback(); } catch {} fail(res,error); }
});
router.get('/activity',async(_req,res)=>{try { const pool=await getPool(); res.json((await pool.request().query('SELECT TOP 100 a.*,u.nombre admin_name FROM admin_activity a LEFT JOIN usuarios u ON u.id=a.admin_id ORDER BY a.id DESC')).recordset); } catch(error) {fail(res,error);} });
router.get('/revisions',(_req,res)=>{try {res.json(files.revisions().map(({settings,...row})=>row));} catch(error){fail(res,error);} });
router.get('/revisions/:id',(req,res)=>{ const revision=files.revisions().find(row=>row.id===req.params.id); if(!revision) return res.status(404).json({error:'Versión no encontrada.'}); res.json(revision.settings); });
router.post('/revisions/:id/restore',(req,res)=>{
  try { const revision=files.revisions().find(row=>row.id===req.params.id); if(!revision) invalid('Versión no encontrada.',404); const site=sanitizeSiteSettings(revision.settings); files.saveRevision(readSettings(),req.user.id); writeSettings(site); res.json({ok:true,site}); } catch(error){fail(res,error);} });
router.get('/backups',(_req,res)=>{try{res.json({ ...files.backupStatus(),backups:files.listBackups() });}catch(error){fail(res,error);} });
router.post('/backups',async(_req,res)=>{ try { if(files.backupStatus().running) return res.status(409).json({error:'Ya hay un respaldo en curso.'}); const pool=await getPool(); void files.createBackup(pool); res.status(202).json({ok:true}); } catch(error) {fail(res,error);} });
router.get('/backups/:id/download',(req,res)=>{try {const directory=files.backupPath(req.params.id); if(!fs.existsSync(path.join(directory,'manifest.json'))) invalid('Respaldo no encontrado.',404); const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8')),file=path.join(directory,'database.json.gz');if(!manifest.verified || crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==manifest.database_sha256)invalid('El respaldo no pasó la verificación. Crea uno nuevo antes de descargar.',409);res.download(file,'bloomskin-datos.json.gz');}catch(error){fail(res,error);} });
router.get('/mail',async(_req,res)=>{
  try { const pool=await getPool(); const events=(await pool.request().query(`SELECT TOP 60 e.id,e.pedido_id,e.estado,e.enviado,e.intentos,e.ultimo_error,e.actualizado_en,p.estado current_state FROM order_mail_events e JOIN pedidos p ON p.id=e.pedido_id WHERE p.eliminado_en IS NULL ORDER BY e.actualizado_en DESC`)).recordset; res.json({ customization:readCustomization(),events }); } catch(error){fail(res,error);} });
router.put('/mail',(req,res)=>{ try{res.json(writeCustomization(req.body));}catch(error){fail(res,error);} });
router.post('/mail/preview',(req,res)=>{
  try { if(!states.includes(req.body.state)) invalid('Elige un evento de correo.'); const {customerOrderContent}=require('../lib/orderMessages');
    const content=customerOrderContent({id:0,cliente_nombre:'Clienta de ejemplo',total_clp:24990,metodo_pago:'flow',metodo_envio:'store_pickup',direccion_envio:`Retiro en ${readSettings().operations.pickup_address}`,comprobante_limite_en:new Date(Date.now()+3600000)},req.body.state,'https://bloomskin.cl/mi-cuenta');
    const note=String(req.body.note ?? '').trim().slice(0,800);
    const preview=content || {title:'Evento desactivado',name:'Clienta de ejemplo',paragraphs:[],details:[]};
    const savedNote=readCustomization()[req.body.state]?.note;
    if(savedNote && preview.paragraphs?.at(-1)===savedNote) preview.paragraphs.pop();
    if(note) preview.paragraphs.push(note);
    res.json(require('../lib/mail').renderMessage(preview));
  } catch(error){fail(res,error);} });
router.post('/mail/:id/retry',async(req,res)=>{
  try {const id=positiveId(req.params.id);if(!id) invalid('Correo inválido.');const pool=await getPool();
    const event=(await pool.request().input('id',sql.Int,id).query(`UPDATE e SET intentos=0,actualizado_en=DATEADD(MINUTE,-6,SYSUTCDATETIME()) OUTPUT INSERTED.* FROM order_mail_events e JOIN pedidos p ON p.id=e.pedido_id WHERE e.id=@id AND e.enviado=0 AND e.actualizado_en<DATEADD(MINUTE,-1,SYSUTCDATETIME()) AND p.eliminado_en IS NULL AND (p.estado=e.estado OR (e.estado='pickup_ready' AND p.estado='shipped'))`)).recordset[0];
    if(!event) invalid('Este correo ya se envió, está en proceso o ya no corresponde al estado del pedido.',409);
    const state=event.estado==='pickup_ready' ? 'shipped' : event.estado;
    const sent=await require('../lib/orderMail').sendOrderMail({pedidoId:event.pedido_id,estado:state});
    if(!sent) invalid('El correo no se pudo enviar. Revisa su estado y la configuración de envío.',503);
    res.json({ok:true});
  }catch(error){fail(res,error);} });
module.exports = { router, publicFulfillment, trackingUrl };
