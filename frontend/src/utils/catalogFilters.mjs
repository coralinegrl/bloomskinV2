export function attributeKey(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
}

export function attributeLabels(value) {
  if (!Array.isArray(value)) return []
  const labels = new Map()
  for (const entry of value) {
    if (typeof entry !== 'string') continue
    const label = entry.trim().replace(/\s+/g, ' ')
    const key = attributeKey(label)
    if (key && key !== 'all' && !labels.has(key)) labels.set(key, label)
  }
  return [...labels.values()]
}

export function attributeOptions(products, field) {
  return attributeLabels(products.flatMap(product => attributeLabels(product[field])))
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map(label => ({ value: attributeKey(label), label }))
}

export function attributeFilterOptions(products, field, selected, allLabel) {
  const sources = field === 'tipos_piel' ? [{ tipos_piel: skinTypeLabels }, ...products] : products
  const options = [{ value: 'all', label: allLabel }, ...attributeOptions(sources, field)]
  // Keep saved filters visible even if their last tagged product is removed.
  if (selected !== 'all' && !options.some(option => option.value === selected)) {
    options.push({ value: selected, label: selected })
  }
  return options
}

export function matchesProductAttributes(product, skin = 'all', need = 'all') {
  const skins = attributeLabels(product.tipos_piel).map(attributeKey)
  const skinKey = attributeKey(skin)
  const matchesSkin = skin === 'all' || skins.includes(skinKey)
    || (universalSkinTypes.has(skinKey) && skins.includes('todo tipo de piel'))
  return matchesSkin && (need === 'all' || attributeLabels(product.necesidades).some(label => attributeKey(label) === attributeKey(need)))
}

export function matchesPriceFilter(price, filter) {
  if (filter === 'under-15000') return price <= 15000
  if (filter === '15000-30000') return price > 15000 && price <= 30000
  if (filter === '30000-50000') return price > 30000 && price <= 50000
  if (filter === 'over-50000') return price > 50000
  return true
}

export function catalogProductPrice(product) {
  if (!product.usa_tonos || !Array.isArray(product.tonos) || !product.tonos.length) return Number(product.precio_clp)
  return Math.min(...product.tonos.map(tone => Number(variantDisplay(product, tone).precio_clp)))
}
export const skinTypeLabels = ['Normal', 'Seca', 'Mixta', 'Grasa', 'Sensible', 'Todo tipo de piel']
const universalSkinTypes = new Set(['normal', 'seca', 'mixta', 'grasa'])
import { variantDisplay } from './productVariants.mjs'
