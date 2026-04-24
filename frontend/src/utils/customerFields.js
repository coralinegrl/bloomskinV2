export const CHILE_REGIONS = [
  'Arica y Parinacota',
  'Tarapaca',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaiso',
  'Metropolitana de Santiago',
  "Libertador General Bernardo O'Higgins",
  'Maule',
  'Nuble',
  'Biobio',
  'La Araucania',
  'Los Rios',
  'Los Lagos',
  'Aysen del General Carlos Ibanez del Campo',
  'Magallanes y de la Antartica Chilena',
]

function cleanString(value) {
  return String(value || '').trim()
}

export function formatRutInput(value) {
  const cleaned = cleanString(value).replace(/\./g, '').replace(/-/g, '').toUpperCase()
  if (cleaned.length < 2) return cleaned
  const body = cleaned.slice(0, -1)
  const dv = cleaned.slice(-1)
  return `${body}-${dv}`
}

export function formatPhoneInput(value) {
  const digits = cleanString(value).replace(/\D/g, '').slice(0, 11)
  let normalized = digits
  if (normalized.startsWith('56')) normalized = normalized.slice(2)
  if (normalized.startsWith('9')) {
    const part1 = normalized.slice(0, 1)
    const part2 = normalized.slice(1, 5)
    const part3 = normalized.slice(5, 9)
    return ['+56', part1, part2, part3].filter(Boolean).join(' ')
  }
  return digits ? `+${digits}` : ''
}

export function normalizePhoneForApi(value) {
  const digits = cleanString(value).replace(/\D/g, '')
  if (/^569\d{8}$/.test(digits)) return `+${digits}`
  if (/^9\d{8}$/.test(digits)) return `+56${digits}`
  return cleanString(value)
}

export function splitStoredAddress(value) {
  const raw = cleanString(value)
  if (!raw) return { street: '', number: '', apartment: '' }

  const parts = raw.split(',').map(part => part.trim()).filter(Boolean)
  const firstPart = parts[0] || ''
  const apartment = parts.slice(1).join(', ')
  const streetMatch = firstPart.match(/^(.*?)(\s+\d+[A-Za-z\-]*)$/)

  if (!streetMatch) {
    return { street: firstPart, number: '', apartment }
  }

  return {
    street: cleanString(streetMatch[1]),
    number: cleanString(streetMatch[2]),
    apartment,
  }
}

export function combineAddressParts({ street, number, apartment }) {
  const main = [cleanString(street), cleanString(number)].filter(Boolean).join(' ')
  const extra = cleanString(apartment)
  return [main, extra].filter(Boolean).join(', ')
}

export function buildProfileForm(user = {}) {
  const safeUser = user || {}
  const address = splitStoredAddress(safeUser.direccion)
  return {
    nombre: safeUser.nombre || '',
    email: safeUser.email || '',
    rut: formatRutInput(safeUser.rut || ''),
    telefono: formatPhoneInput(safeUser.telefono || ''),
    street: address.street,
    number: address.number,
    apartment: address.apartment,
    city: safeUser.ciudad || '',
    region: safeUser.region || '',
    tipo_piel: safeUser.tipo_piel || '',
  }
}

export function buildApiCustomerPayload(form) {
  return {
    nombre: cleanString(form.nombre),
    email: cleanString(form.email),
    rut: formatRutInput(form.rut),
    telefono: normalizePhoneForApi(form.telefono),
    direccion: combineAddressParts(form),
    ciudad: cleanString(form.city),
    region: cleanString(form.region),
    tipo_piel: cleanString(form.tipo_piel),
  }
}

export function buildShippingPayload(form) {
  return {
    region: cleanString(form.region),
    ciudad: cleanString(form.city),
    direccion: combineAddressParts(form),
    referencia: cleanString(form.reference),
  }
}
