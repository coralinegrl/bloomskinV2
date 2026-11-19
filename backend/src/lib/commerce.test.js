const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { signParameters, validatePayment, flowConfig } = require('./flow');
const { normalizeVariantMeta, variantPrice } = require('./variants');
const { renderMessage } = require('./mail');

test('Flow signature sorts parameters and ignores an existing signature', () => {
  const expected=crypto.createHmac('sha256','test').update('a1b2').digest('hex');
  assert.equal(signParameters({b:2,a:1,s:'ignored'},'test'),expected);
  assert.equal(validatePayment({currency:'CLP',amount:15000,commerceOrder:'BS-0001'},{id:1,total_clp:15000}),true);
  assert.equal(validatePayment({currency:'USD',amount:15000,commerceOrder:'BS-0001'},{id:1,total_clp:15000}),false);
  assert.equal(validatePayment({currency:'CLP',amount:1,commerceOrder:'BS-0001'},{id:1,total_clp:15000}),false);
  assert.equal(validatePayment({currency:'CLP',amount:15000,commerceOrder:'BS-0002'},{id:1,total_clp:15000}),false);
  assert.equal(typeof flowConfig().ready,'boolean');
});

test('Variant metadata validates prices, images and base-price fallbacks', () => {
  const meta=normalizeVariantMeta({Rosa:{precio_clp:15000,imagen_url:'/uploads/productos/photo.png'}},['Rosa']);
  assert.equal(meta.Rosa.precio_clp,15000);
  assert.equal(variantPrice({precio_clp:10000,variant_meta:meta},'Rosa'),15000);
  assert.equal(variantPrice({precio_clp:10000,variant_meta:meta},'Rojo'),10000);
  assert.throws(()=>normalizeVariantMeta({Rosa:{precio_clp:-1}},['Rosa']),{code:'INVALID_VARIANT'});
  assert.throws(()=>normalizeVariantMeta({Rosa:{imagen_url:'javascript:alert(1)'}},['Rosa']),{code:'INVALID_VARIANT'});
});

test('Transactional email has a text fallback and escapes customer-controlled content', () => {
  const result=renderMessage({title:'Pedido',name:'<script>alert(1)</script>',paragraphs:['<b>no HTML</b>'],details:[['Total','$10.000']],actionUrl:'https://bloomskin.cl/pedido/1#access=private',actionLabel:'Ver pedido'});
  assert(!result.html.includes('<script>'));
  assert(result.html.includes('&lt;script&gt;'));
  assert(result.html.includes('max-width:600px'));
  assert(result.text.includes('https://bloomskin.cl/pedido/1#access=private'));
});
