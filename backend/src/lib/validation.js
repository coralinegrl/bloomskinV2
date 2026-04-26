function cleanString(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return cleanString(value).toLowerCase();
}

function isValidEmail(value) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(value) {
  const password = String(value || '');
  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'La contraseña debe incluir al menos una mayúscula.';
  }
  if (!/[a-z]/.test(password)) {
    return 'La contraseña debe incluir al menos una minúscula.';
  }
  if (!/\d/.test(password)) {
    return 'La contraseña debe incluir al menos un número.';
  }
  return null;
}

function normalizeRut(value) {
  const cleaned = cleanString(value).replace(/\./g, '').replace(/-/g, '').toUpperCase();
  if (cleaned.length < 2) return '';
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  return `${body}-${dv}`;
}

function isValidChileanRut(value) {
  const normalized = normalizeRut(value);
  if (!/^\d{7,8}-[\dK]$/.test(normalized)) return false;

  const [body, dv] = normalized.split('-');
  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expected = 11 - (sum % 11);
  const expectedDv = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected);
  return expectedDv === dv;
}

function normalizePhone(value) {
  const digits = cleanString(value).replace(/\D/g, '');
  if (/^569\d{8}$/.test(digits)) return `+${digits}`;
  if (/^9\d{8}$/.test(digits)) return `+56${digits}`;
  return cleanString(value);
}

function isValidChileanPhone(value) {
  const normalized = normalizePhone(value);
  return /^\+569\d{8}$/.test(normalized);
}

function validateRequiredText(value, label, min = 2) {
  const cleaned = cleanString(value);
  if (!cleaned) return `${label} es requerido.`;
  if (cleaned.length < min) return `${label} debe tener al menos ${min} caracteres.`;
  return null;
}

function validateCustomerPayload(payload, options = {}) {
  const requirePassword = options.requirePassword !== false;
  const requireAddress = options.requireAddress !== false;
  const errors = [];

  const nombre = cleanString(payload.nombre);
  const email = normalizeEmail(payload.email);
  const rut = normalizeRut(payload.rut);
  const telefono = normalizePhone(payload.telefono);
  const direccion = cleanString(payload.direccion);
  const ciudad = cleanString(payload.ciudad);
  const region = cleanString(payload.region);
  const tipo_piel = cleanString(payload.tipo_piel);

  const nombreError = validateRequiredText(nombre, 'Nombre', 3);
  if (nombreError) errors.push(nombreError);

  if (!email) {
    errors.push('Email es requerido.');
  } else if (!isValidEmail(email)) {
    errors.push('Ingresa un email válido.');
  }

  if (requirePassword) {
    const passwordError = validatePassword(payload.password);
    if (passwordError) errors.push(passwordError);
  }

  if (!rut) {
    errors.push('RUT es requerido.');
  } else if (!isValidChileanRut(rut)) {
    errors.push('Ingresa un RUT chileno válido.');
  }

  if (!telefono) {
    errors.push('Teléfono es requerido.');
  } else if (!isValidChileanPhone(telefono)) {
    errors.push('Ingresa un teléfono chileno válido. Usa formato +569XXXXXXXX o 9XXXXXXXX.');
  }

  if (requireAddress) {
    const direccionError = validateRequiredText(direccion, 'Dirección', 6);
    if (direccionError) errors.push(direccionError);

    const ciudadError = validateRequiredText(ciudad, 'Ciudad', 2);
    if (ciudadError) errors.push(ciudadError);

    const regionError = validateRequiredText(region, 'Región', 2);
    if (regionError) errors.push(regionError);
  }

  return {
    errors,
    sanitized: {
      nombre,
      email,
      rut,
      telefono,
      direccion,
      ciudad,
      region,
      tipo_piel: tipo_piel || null,
    },
  };
}

module.exports = {
  cleanString,
  normalizeEmail,
  isValidEmail,
  validatePassword,
  normalizeRut,
  isValidChileanRut,
  normalizePhone,
  isValidChileanPhone,
  validateRequiredText,
  validateCustomerPayload,
};
