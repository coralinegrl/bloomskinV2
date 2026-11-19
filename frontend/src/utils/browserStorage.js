export function readStoredList(key, limit = 40) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value.filter(item => Number.isSafeInteger(Number(item?.id)) && Number(item.id) > 0).slice(0, limit) : []
  } catch { return [] }
}

export function writeStoredList(key, items) {
  try { localStorage.setItem(key, JSON.stringify(items)) } catch { /* Browsing still works when storage is unavailable. */ }
}

export function normalizeSearch(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function rememberProduct(product) {
  if (!product?.id) return
  writeStoredList('bs_recent_products', [product, ...readStoredList('bs_recent_products', 8).filter(item => Number(item.id) !== Number(product.id))].slice(0, 8))
  window.dispatchEvent(new Event('bloomskin:recent-products'))
}
