export function variantDisplay(product, tone) {
  if (!product) return null
  const meta = product.variant_meta?.[tone] || {}
  return { ...product, imagen_url: meta.imagen_url || product.imagen_url, precio_clp: Number(meta.precio_clp) > 0 ? Number(meta.precio_clp) : product.precio_clp }
}
