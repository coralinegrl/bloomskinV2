const attributeFields = ['tipos_piel', 'necesidades'];

function attributeKey(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
}

function normalizeAttributeLabels(value, field) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 20) {
    throw invalidAttribute(field);
  }
  const labels = new Map();
  for (const entry of value) {
    if (typeof entry !== 'string') throw invalidAttribute(field);
    const label = entry.trim().replace(/\s+/g, ' ');
    if (!label) continue;
    if (label.length > 60 || /[\u0000-\u001f<>]/.test(label)) throw invalidAttribute(field);
    const key = attributeKey(label);
    if (key === 'all') throw invalidAttribute(field);
    if (!labels.has(key)) labels.set(key, label);
  }
  return [...labels.values()];
}

function invalidAttribute(field) {
  return Object.assign(new Error(`${field}: usa hasta 20 etiquetas de texto de 60 caracteres, sin HTML.`), { code: 'INVALID_ATTRIBUTE' });
}

function sanitizeProductAttributes(product) {
  return Object.fromEntries(attributeFields.map(field => [field, normalizeAttributeLabels(product[field], field)]));
}

function hydrateProductAttributes(product) {
  return Object.fromEntries(attributeFields.map(field => {
    try {
      const value = product[`${field}_json`];
      return [field, normalizeAttributeLabels(value ? JSON.parse(value) : product[field], field)];
    } catch {
      // Invalid legacy metadata must never become a positive skin/need match.
      return [field, []];
    }
  }));
}

function attributeUpdateJson(body, product, field) {
  return Object.hasOwn(body, field) && body[field] != null ? JSON.stringify(product[field]) : null;
}

function validateBulkAttributes(body) {
  const ids = body?.ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    throw Object.assign(new Error('Selecciona entre 1 y 100 productos válidos.'), { code: 'INVALID_ATTRIBUTE' });
  }
  const additions = sanitizeProductAttributes(body);
  if (!attributeFields.some(field => additions[field].length)) {
    throw Object.assign(new Error('Añade al menos una etiqueta.'), { code: 'INVALID_ATTRIBUTE' });
  }
  return { ids: [...new Set(ids)], additions };
}

function mergeProductAttributes(product, additions) {
  const existing = hydrateProductAttributes(product);
  return Object.fromEntries(attributeFields.map(field => {
    const unique = new Map([...existing[field], ...additions[field]].map(label => [attributeKey(label), label]));
    return [field, normalizeAttributeLabels([...unique.values()], field)];
  }));
}

module.exports = { normalizeAttributeLabels, sanitizeProductAttributes, hydrateProductAttributes, attributeUpdateJson, validateBulkAttributes, mergeProductAttributes };
