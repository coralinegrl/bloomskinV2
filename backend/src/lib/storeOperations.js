const defaults = {
  accepting_orders: true, pause_message: 'Estamos preparando novedades. Vuelve pronto.',
  pickup_enabled: true, pickup_address: 'Oficina Lina 210', pickup_city: 'Antofagasta',
  pickup_hours: 'Retiro previa coordinación', delivery_enabled: true, national_enabled: true,
  national_carrier: 'Blue Express', national_fee: 3990, free_shipping_enabled: true,
  free_shipping_threshold: 49990, low_stock_threshold: 3,
  local_tiers: [{ km: 1.6, fee: 1000 }, { km: 2, fee: 1500 }, { km: 7, fee: 2000 }, { km: 10, fee: 2500 }, { km: 15, fee: 3500 }],
};
function invalid(message) { const error = new Error(message); error.code = 'INVALID_SITE_SETTINGS'; throw error; }
function text(value, fallback, max) { return String(value ?? fallback).trim().slice(0, max); }
function integer(value, fallback, max = 10000000) {
  const number = Number(value ?? fallback);
  if (!Number.isSafeInteger(number) || number < 0 || number > max) invalid('Las tarifas y los mínimos deben ser números enteros positivos o cero.');
  return number;
}
function sanitizeOperations(input = {}) {
  if(!input || typeof input!=='object' || Array.isArray(input)) invalid('La configuración de la tienda debe ser un objeto válido.');
  const result = {};
  for (const key of ['accepting_orders', 'pickup_enabled', 'delivery_enabled', 'national_enabled', 'free_shipping_enabled']) {
    if (input[key] !== undefined && typeof input[key] !== 'boolean') invalid('Los estados de la tienda deben ser activados o desactivados.');
    result[key] = input[key] ?? defaults[key];
  }
  for (const [key, max] of [['pickup_address', 200], ['pickup_city', 100], ['pickup_hours', 300], ['pause_message', 400], ['national_carrier', 80]]) {
    result[key] = text(input[key], defaults[key], max);
    if (!result[key]) invalid('Completa la dirección, ciudad, horario, transportista y mensaje de la tienda.');
  }
  for (const key of ['national_fee', 'free_shipping_threshold', 'low_stock_threshold']) result[key] = integer(input[key], defaults[key], key === 'low_stock_threshold' ? 1000 : 10000000);
  if (!result.delivery_enabled && !result.pickup_enabled && result.accepting_orders) invalid('Activa al menos una forma de entrega o pausa las compras.');
  const tiers = input.local_tiers ?? defaults.local_tiers;
  if (!Array.isArray(tiers) || !tiers.length || tiers.length > 10) invalid('Configura entre 1 y 10 tramos de despacho local.');
  result.local_tiers = tiers.map(tier => ({ km: Number(tier.km), fee: integer(tier.fee, 0) })).sort((a, b) => a.km - b.km);
  if (result.local_tiers.some((tier, i) => !Number.isFinite(tier.km) || tier.km <= 0 || tier.km > 500 || (i && tier.km === result.local_tiers[i - 1].km))) invalid('Las distancias deben ser distintas y estar entre 0 y 500 km.');
  return result;
}
function pickupLabel(config) { return `${config.pickup_address}, ${config.pickup_city}`; }
module.exports = { defaults, sanitizeOperations, pickupLabel };
