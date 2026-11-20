const ANTOFAGASTA_ORIGIN_QUERY = 'Oficina Lina 210, Antofagasta, Chile';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const GOOGLE_GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const BLUE_EXPRESS_FLAT_FEE = 3990;
const FREE_SHIPPING_THRESHOLD = 49990;
const { readSettings } = require('./siteSettings');

let originCache = null;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isAntofagastaCity(city) {
  return normalizeText(city).includes('antofagasta');
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineKm(pointA, pointB) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(pointB.lat - pointA.lat);
  const lonDelta = toRadians(pointB.lon - pointA.lon);
  const startLat = toRadians(pointA.lat);
  const endLat = toRadians(pointB.lat);

  const a = Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lonDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getLocalTier(distanceKm, config) {
  const tier = config.local_tiers.find(entry => distanceKm <= entry.km);
  if (tier) return { fee: tier.fee, label: `Despacho local hasta ${tier.km.toLocaleString('es-CL')} km`, local: true };
  if (!config.national_enabled) throw new Error('Tu dirección está fuera de la cobertura local. Puedes elegir retiro.');
  return { fee: config.national_fee, label: config.national_carrier, local: false };
}

function hasGoogleMapsConfig() {
  return Boolean(String(process.env.GOOGLE_MAPS_API_KEY || '').trim());
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`No se pudo consultar el proveedor de geocodificacion (${response.status})`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function geocodeWithGoogle(query) {
  const key = String(process.env.GOOGLE_MAPS_API_KEY || '').trim();
  const url = `${GOOGLE_GEOCODING_URL}?address=${encodeURIComponent(query)}&components=country:CL&language=es&region=cl&key=${encodeURIComponent(key)}`;
  const payload = await fetchJson(url);

  if (payload.status === 'ZERO_RESULTS') {
    throw new Error('No encontramos esa direccion');
  }

  if (payload.status !== 'OK' || !Array.isArray(payload.results) || !payload.results.length) {
    throw new Error(payload.error_message || `Google Maps no pudo resolver esa direccion (${payload.status || 'UNKNOWN'})`);
  }

  const result = payload.results[0];
  return {
    lat: Number(result.geometry.location.lat),
    lon: Number(result.geometry.location.lng),
    displayName: result.formatted_address,
    provider: 'google_maps',
  };
}

async function geocodeWithNominatim(query) {
  const url = `${NOMINATIM_URL}?format=jsonv2&limit=1&countrycodes=cl&q=${encodeURIComponent(query)}`;
  const results = await fetchJson(url, {
    headers: {
      'User-Agent': 'Bloomskin/1.0 (contacto tienda)',
      'Accept-Language': 'es',
    },
  });

  if (!Array.isArray(results) || !results.length) {
    throw new Error('No encontramos esa direccion');
  }

  return {
    lat: Number(results[0].lat),
    lon: Number(results[0].lon),
    displayName: results[0].display_name,
    provider: 'nominatim',
  };
}

async function geocode(query) {
  if (hasGoogleMapsConfig()) {
    try {
      return await geocodeWithGoogle(query);
    } catch (error) {
      console.warn('[shipping] Google Maps geocoding failed, using Nominatim fallback:', error.message);
    }
  }

  return geocodeWithNominatim(query);
}

async function getOriginCoordinates(config) {
  const query = `${config.pickup_address}, ${config.pickup_city}, Chile`;
  if (!originCache || originCache.query !== query) {
    originCache = { query, promise: geocode(query) };
    originCache.promise.catch(() => { if (originCache?.query === query) originCache = null; });
  }
  return originCache.promise;
}

async function quoteShipping({ ciudad, direccion, subtotal_clp }) {
  const config = readSettings().operations;
  if (!config.delivery_enabled) throw new Error('El despacho está desactivado temporalmente. Puedes elegir retiro.');
  const city = String(ciudad || '').trim();
  const address = String(direccion || '').trim();
  const subtotal = Number(subtotal_clp || 0);

  if (!city) {
    throw new Error('Debes indicar la ciudad para calcular envío');
  }

  const local = normalizeText(city) === normalizeText(config.pickup_city);
  if (!local && !config.national_enabled) throw new Error('Por ahora solo despachamos dentro de la ciudad de retiro.');
  const free = config.free_shipping_enabled && subtotal >= config.free_shipping_threshold;
  if (free && (!local || config.national_enabled)) {
    return {
      city,
      method: 'free_shipping',
      provider: 'Despacho gratis',
      fee_clp: 0,
      distance_km: null,
      tier_label: `Envío gratis desde $${config.free_shipping_threshold.toLocaleString('es-CL')}`,
      resolved_address: address || city,
      geocoding_provider: null,
    };
  }

  if (!local) {
    return {
      city,
      method: 'blue_express',
      provider: config.national_carrier,
      fee_clp: config.national_fee,
      distance_km: null,
      tier_label: 'Despacho nacional',
      resolved_address: city,
      geocoding_provider: null,
    };
  }

  if (!address) {
    throw new Error('Debes indicar la dirección para calcular envío en Antofagasta');
  }

  const [origin, destination] = await Promise.all([
    getOriginCoordinates(config),
    geocode(`${address}, ${city}, Chile`),
  ]);
  const distanceKm = haversineKm(origin, destination);
  const tier = getLocalTier(distanceKm, config);
  const isBlueExpressFallback = !tier.local;

  return {
    city,
    method: free ? 'free_shipping' : isBlueExpressFallback ? 'blue_express' : 'local_delivery',
    provider: free ? 'Despacho gratis' : isBlueExpressFallback ? config.national_carrier : 'Despacho Bloomskin',
    fee_clp: free ? 0 : tier.fee,
    distance_km: Number(distanceKm.toFixed(2)),
    tier_label: tier.label,
    resolved_address: destination.displayName,
    geocoding_provider: destination.provider,
  };
}

module.exports = {
  ANTOFAGASTA_ORIGIN_QUERY,
  BLUE_EXPRESS_FLAT_FEE,
  FREE_SHIPPING_THRESHOLD,
  hasGoogleMapsConfig,
  quoteShipping,
};
