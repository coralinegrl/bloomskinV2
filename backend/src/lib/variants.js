function normalizeVariantMeta(value, tones) {
  function invalid(message) { const error = new Error(message); error.code = 'INVALID_VARIANT'; throw error; }
  let data = value || {};
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch { data = {}; } }
  return Object.fromEntries(tones.map(tone => {
    const meta = data?.[tone] || {};
    const image = String(meta.imagen_url || '').trim();
    const price = meta.precio_clp === '' || meta.precio_clp == null ? null : Number(meta.precio_clp);
    const localImage = image.startsWith('/uploads/productos/') || image.startsWith('/catalogo/');
    if (image && !localImage && !/^https?:\/\/[^\s]+$/i.test(image)) invalid('La foto de cada tipo debe ser una URL de imagen válida.');
    if (price !== null && (!Number.isSafeInteger(price) || price < 1 || price > 10000000)) invalid('El precio de cada tipo debe ser un entero positivo en CLP.');
    return [tone, { imagen_url: image.slice(0, 1500), precio_clp: price }];
  }));
}

function variantPrice(product, tone) {
  let meta = {};
  try { meta = typeof product.variant_meta_json === 'string' ? JSON.parse(product.variant_meta_json) : product.variant_meta || {}; } catch (_) {}
  const price = Number(meta?.[tone]?.precio_clp);
  return Number.isSafeInteger(price) && price > 0 ? price : Number(product.precio_clp);
}
module.exports = { normalizeVariantMeta, variantPrice };
