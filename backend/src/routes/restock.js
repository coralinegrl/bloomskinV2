const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const { getPool, sql } = require('../config/db');
const { normalizeEmail, isValidEmail } = require('../lib/validation');
const { storeBaseUrl } = require('../lib/publicUrl');
function stock(product, variant) {
  if (!product.usa_tonos) return Number(product.stock || 0);
  try { return Number(JSON.parse(product.tonos_stock_json || '{}')[variant] || 0); } catch { return 0; }
}
router.post('/',rateLimit({windowMs:3600000,limit:12,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Demasiadas solicitudes. Intenta más tarde.'}}),async(req,res)=>{
  const id=Number(req.body.producto_id), email=normalizeEmail(req.body.email), variant=String(req.body.variant || '').trim();
  if(!Number.isSafeInteger(id) || id<1 || !isValidEmail(email) || req.body.consent !== true || variant.length>120) return res.status(400).json({error:'Indica un correo válido y acepta recibir el aviso de reposición.'});
  try {
    const pool=await getPool(); const product=(await pool.request().input('id',sql.Int,id).query("SELECT * FROM productos WHERE id=@id AND activo=1 AND publication_status='published'")).recordset[0];
    if(!product) return res.status(404).json({error:'Producto no disponible.'});
    const tones=JSON.parse(product.tonos_json || '[]');
    if(product.usa_tonos ? !tones.includes(variant) : Boolean(variant)) return res.status(400).json({error:'Elige el tipo que quieres que vuelva.'});
    if(stock(product,variant)>0) return res.status(409).json({error:'Este producto ya tiene stock. Actualiza la página para comprarlo.'});
    await pool.request().input('id',sql.Int,id).input('variant',sql.NVarChar,variant).input('email',sql.NVarChar,email).query(`
      SET XACT_ABORT ON; BEGIN TRANSACTION;
      IF EXISTS(SELECT 1 FROM restock_alerts WITH(UPDLOCK,HOLDLOCK) WHERE producto_id=@id AND variant=@variant AND email=@email)
        UPDATE restock_alerts SET status='pending',attempts=0,updated_at=SYSUTCDATETIME() WHERE producto_id=@id AND variant=@variant AND email=@email;
      ELSE INSERT INTO restock_alerts(producto_id,variant,email) VALUES(@id,@variant,@email);
      COMMIT TRANSACTION;
    `);
    res.json({ok:true});
  } catch(error) {console.error('Reposición:',error.code || error.name);res.status(503).json({error:'No pudimos guardar el aviso. Intenta nuevamente.'});}
});
let notifying=false;
async function notifyAvailable(pool) {
  if(!require('../lib/siteSettings').readSettings().operations.accepting_orders) return;
  if(notifying) return; notifying=true;
  try {
    const rows=(await pool.request().query(`SELECT TOP 5 a.*,p.nombre,p.stock,p.usa_tonos,p.tonos_stock_json FROM restock_alerts a JOIN productos p ON p.id=a.producto_id WHERE a.status='pending' AND a.attempts<5 AND p.activo=1 AND p.publication_status='published' AND (a.attempts=0 OR a.updated_at<DATEADD(MINUTE,-30,SYSUTCDATETIME()))
      AND ((p.usa_tonos=0 AND p.stock>0) OR (p.usa_tonos=1 AND EXISTS(SELECT 1 FROM OPENJSON(CASE WHEN ISJSON(p.tonos_stock_json)=1 THEN p.tonos_stock_json ELSE '{}' END) j WHERE j.[key]=a.variant AND TRY_CONVERT(INT,j.[value])>0))) ORDER BY a.id`)).recordset;
    let sent=0;
    for(const row of rows) {
      if(stock(row,row.variant)<=0 || sent>=5) continue;
      await pool.request().input('id',sql.Int,row.id).query('UPDATE restock_alerts SET attempts=attempts+1,updated_at=SYSUTCDATETIME() WHERE id=@id');
      try {
        const ok=await require('../lib/mail').sendMessage({to:row.email,subject:`Volvió a Bloomskin: ${row.nombre}`,title:'Tu favorito volvió',
          paragraphs:[`${row.nombre}${row.variant ? ` (${row.variant})` : ''} vuelve a estar disponible. Este aviso no reserva unidades; el stock se confirma al comprar.`],
          actionLabel:'Ver producto',actionUrl:`${storeBaseUrl()}/producto/${row.producto_id}`});
        if(ok) { await pool.request().input('id',sql.Int,row.id).query("UPDATE restock_alerts SET status='sent',updated_at=SYSUTCDATETIME() WHERE id=@id"); sent++; }
      } catch(error) {console.error('Aviso de reposición:',error.code || error.name);}
    }
  } finally {notifying=false;}
}
module.exports=router; module.exports.notifyAvailable=notifyAvailable; module.exports.stock=stock;
