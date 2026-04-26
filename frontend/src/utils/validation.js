function cleanString(value) {
  return String(value || '').trim()
}

export function normalizeEmail(value) {
  return cleanString(value).toLowerCase()
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value))
}

export function validatePassword(value) {
  const password = String(value || '')
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  if (!/[A-Z]/.test(password)) return 'La contraseña debe incluir al menos una mayúscula.'
  if (!/[a-z]/.test(password)) return 'La contraseña debe incluir al menos una minúscula.'
  if (!/\d/.test(password)) return 'La contraseña debe incluir al menos un número.'
  return ''
}

export function normalizeRut(value) {
  const cleaned = cleanString(value).replace(/\./g, '').replace(/-/g, '').toUpperCase()
  if (cleaned.length < 2) return ''
  return `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}`
}

export function isValidChileanRut(value) {
  const normalized = normalizeRut(value)
  if (!/^\d{7,8}-[\dK]$/.test(normalized)) return false

  const [body, dv] = normalized.split('-')
  let sum = 0
  let multiplier = 2

  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const expected = 11 - (sum % 11)
  const expectedDv = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected)
  return expectedDv === dv
}

export function normalizePhone(value) {
  const digits = cleanString(value).replace(/\D/g, '')
  if (/^569\d{8}$/.test(digits)) return `+${digits}`
  if (/^9\d{8}$/.test(digits)) return `+56${digits}`
  return cleanString(value)
}

export function isValidChileanPhone(value) {
  return /^\+569\d{8}$/.test(normalizePhone(value))
}

export function validateRequiredText(value, label, min = 2) {
  const cleaned = cleanString(value)
  if (!cleaned) return `${label} es requerido.`
  if (cleaned.length < min) return `${label} debe tener al menos ${min} caracteres.`
  return ''
}

export function validateCustomerProfile(payload, options = {}) {
  const errors = []
  const requirePassword = options.requirePassword === true
  const requireAddress = options.requireAddress !== false

  const nombreError = validateRequiredText(payload.nombre, 'Nombre', 3)
  if (nombreError) errors.push(nombreError)

  if (!payload.email) {
    errors.push('Email es requerido.')
  } else if (!isValidEmail(payload.email)) {
    errors.push('Ingresa un email válido.')
  }

  if (requirePassword) {
    const passwordError = validatePassword(payload.password)
    if (passwordError) errors.push(passwordError)
  }

  if (!payload.rut) {
    errors.push('RUT es requerido.')
  } else if (!isValidChileanRut(payload.rut)) {
    errors.push('Ingresa un RUT chileno válido.')
  }

  if (!payload.telefono) {
    errors.push('Teléfono es requerido.')
  } else if (!isValidChileanPhone(payload.telefono)) {
    errors.push('Ingresa un teléfono chileno válido. Usa +569XXXXXXXX o 9XXXXXXXX.')
  }

  if (requireAddress) {
    const direccionError = validateRequiredText(payload.direccion, 'Dirección', 6)
    if (direccionError) errors.push(direccionError)

    const ciudadError = validateRequiredText(payload.ciudad, 'Ciudad', 2)
    if (ciudadError) errors.push(ciudadError)

    const regionError = validateRequiredText(payload.region, 'Región', 2)
    if (regionError) errors.push(regionError)
  }

  return {
    errors,
    normalized: {
      nombre: cleanString(payload.nombre),
      email: normalizeEmail(payload.email),
      password: String(payload.password || ''),
      rut: normalizeRut(payload.rut),
      telefono: normalizePhone(payload.telefono),
      direccion: cleanString(payload.direccion),
      ciudad: cleanString(payload.ciudad),
      region: cleanString(payload.region),
      tipo_piel: cleanString(payload.tipo_piel),
    },
  }
}

export function validateShippingAddress(payload) {
  const errors = []
  const regionError = validateRequiredText(payload.region, 'Región', 2)
  const ciudadError = validateRequiredText(payload.ciudad, 'Ciudad', 2)
  const direccionError = validateRequiredText(payload.direccion, 'Dirección', 6)
  if (regionError) errors.push(regionError)
  if (ciudadError) errors.push(ciudadError)
  if (direccionError) errors.push(direccionError)

  return {
    errors,
    normalized: {
      region: cleanString(payload.region),
      ciudad: cleanString(payload.ciudad),
      direccion: cleanString(payload.direccion),
      referencia: cleanString(payload.referencia),
    },
  }
}
