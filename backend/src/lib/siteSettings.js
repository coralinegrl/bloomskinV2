const fs = require('fs');
const path = require('path');

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '../../data');
const settingsFile = process.env.SITE_SETTINGS_FILE
  ? path.resolve(process.env.SITE_SETTINGS_FILE)
  : path.join(dataDir, 'site-settings.json');

const defaultSettings = {
  home: {
    hero: {
      tag: 'Selección Bloomskin',
      title: 'Una home más curada, con',
      emphasis: 'lo mejor primero',
      description: 'La portada muestra selección editorial, best sellers y rutas rápidas para descubrir productos. El catálogo completo vive aparte, con filtros de compra más serios.',
      primary_cta_label: 'Ver más vendidos',
      secondary_cta_label: 'Ir al catálogo',
    },
    categoryTiles: [
      { category: 'Serums', label: 'Serums', image_url: '' },
      { category: 'Hidratantes', label: 'Hidratantes', image_url: '' },
      { category: 'Limpiadores', label: 'Limpiadores', image_url: '' },
      { category: 'Protección Solar', label: 'Protección Solar', image_url: '' },
    ],
    promoItems: [
      { icon: '🚚', title: 'Envío gratis', copy: 'Sobre $49.990' },
      { icon: 'flag-kr', title: '100% originales', copy: 'Directo desde Corea del Sur' },
      { icon: '🎁', title: 'Muestras y hallazgos', copy: 'Selección curada para descubrir favoritos' },
      { icon: '💬', title: 'Te orientamos por WhatsApp', copy: 'Ayuda rápida para elegir tu rutina' },
    ],
    bestSellers: {
      tag: 'Best Sellers',
      title: 'Los más vendidos',
      copy: 'Un bloque rápido con lo más fuerte del catálogo y mejor señal comercial.',
      link_label: 'Ver catálogo',
    },
    editorial: {
      tag: 'Descubre por necesidad',
      title: 'Explora la tienda como una rutina',
      copy: 'En vez de mostrar todo de una, te guiamos por bloques más claros y rápidos de navegar.',
      cards: [
        {
          kicker: 'Rutina base',
          title: 'Empieza por una limpieza suave',
          copy: 'Limpiadores y básicos para armar una rutina simple de día o noche.',
          link_label: 'Explorar limpiadores →',
          category: 'Limpiadores',
          tone: 'rose',
        },
        {
          kicker: 'Uso diario',
          title: 'Protección solar que sí vas a usar todos los días',
          copy: 'Solares cómodos, ligeros y fáciles de combinar con maquillaje.',
          link_label: 'Ver solares →',
          category: 'Protección Solar',
          tone: 'sage',
        },
        {
          kicker: 'Tratamiento',
          title: 'Serums para brillo, textura y manchas',
          copy: 'Una selección rápida para quienes quieren resultados sin revisar setenta fichas seguidas.',
          link_label: 'Ir a serums →',
          category: 'Serums',
          tone: 'cream',
        },
      ],
    },
    newIn: {
      tag: 'New In',
      title: 'Novedades y hallazgos',
      copy: 'Un bloque más liviano para descubrir productos nuevos y cosas en tendencia.',
      link_label: 'Ver todo',
    },
    catalogCta: {
      tag: 'Catálogo completo',
      title: 'Descubre todo el catálogo Bloomskin',
      copy: 'Entra a una vista dedicada con categorías, marcas, precios, stock, promociones y orden.',
      button_label: 'Abrir catálogo',
    },
    newsletter: {
      tag: 'Únete a la comunidad',
      title: 'Skincare tips y',
      emphasis: 'ofertas exclusivas',
      copy: 'Suscríbete y recibe novedades y lanzamientos de Bloomskin',
      placeholder: 'tu@email.com',
      button_label: 'Suscribirme',
    },
  },
  footer: {
    brand_sub: 'K-Beauty · Chile',
    copy: 'Skincare coreano curado para Chile, con productos originales, ayuda real y compra simple.',
    instagram_url: 'https://www.instagram.com/bloomskin__cl',
    whatsapp_url: 'https://wa.me/569948418523',
    email: 'bloomskincl1@gmail.com',
    instagram_handle: '@bloomskin__cl',
    whatsapp_label: '+56 9 9484 1853',
    bottom_left: '© 2026 Bloomskin · Antofagasta, Chile',
    bottom_right: 'Originales de Corea del Sur',
  },
  payment: {
    bank_name: 'Banco por definir',
    account_type: 'Cuenta corriente',
    account_number: '',
    account_holder: 'Bloomskin',
    account_rut: '',
    transfer_email: '',
    instructions: 'Transfiere el total del pedido y luego sube tu comprobante para validarlo en admin.',
  },
};

function ensureSettingsFile() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(settingsFile, JSON.stringify(defaultSettings, null, 2), 'utf8');
  }
}

function readSettings() {
  ensureSettingsFile();
  const raw = fs.readFileSync(settingsFile, 'utf8');
  const parsed = JSON.parse(raw);
  return sanitizeSiteSettings({
    ...defaultSettings,
    ...parsed,
    home: {
      ...defaultSettings.home,
      ...(parsed.home || {}),
    },
    footer: {
      ...defaultSettings.footer,
      ...(parsed.footer || {}),
    },
    payment: {
      ...defaultSettings.payment,
      ...(parsed.payment || {}),
    },
  });
}

function writeSettings(nextSettings) {
  ensureSettingsFile();
  fs.writeFileSync(settingsFile, JSON.stringify(sanitizeSiteSettings(nextSettings), null, 2), 'utf8');
}

function sanitizeString(value, fallback = '') {
  const normalized = String(value ?? fallback).trim();
  return normalized || fallback;
}

function sanitizeArray(value, fallback) {
  return Array.isArray(value) && value.length ? value : fallback;
}

function sanitizeCategoryTiles(tiles) {
  const source = sanitizeArray(tiles, defaultSettings.home.categoryTiles);
  return source.slice(0, 4).map((tile, index) => ({
    category: sanitizeString(tile?.category, defaultSettings.home.categoryTiles[index]?.category || ''),
    label: sanitizeString(tile?.label || tile?.category, defaultSettings.home.categoryTiles[index]?.label || ''),
    image_url: sanitizeString(tile?.image_url, ''),
  }));
}

function sanitizePromoItems(items) {
  const source = sanitizeArray(items, defaultSettings.home.promoItems);
  return source.slice(0, 4).map((item, index) => ({
    icon: sanitizeString(item?.icon, defaultSettings.home.promoItems[index]?.icon || ''),
    title: sanitizeString(item?.title, defaultSettings.home.promoItems[index]?.title || ''),
    copy: sanitizeString(item?.copy, defaultSettings.home.promoItems[index]?.copy || ''),
  }));
}

function sanitizeEditorialCards(cards) {
  const source = sanitizeArray(cards, defaultSettings.home.editorial.cards);
  return source.slice(0, 3).map((card, index) => ({
    kicker: sanitizeString(card?.kicker, defaultSettings.home.editorial.cards[index]?.kicker || ''),
    title: sanitizeString(card?.title, defaultSettings.home.editorial.cards[index]?.title || ''),
    copy: sanitizeString(card?.copy, defaultSettings.home.editorial.cards[index]?.copy || ''),
    link_label: sanitizeString(card?.link_label, defaultSettings.home.editorial.cards[index]?.link_label || ''),
    category: sanitizeString(card?.category, defaultSettings.home.editorial.cards[index]?.category || ''),
    tone: sanitizeString(card?.tone, defaultSettings.home.editorial.cards[index]?.tone || 'rose'),
  }));
}

function sanitizeHomeSettings(home = {}) {
  return {
    hero: {
      tag: sanitizeString(home.hero?.tag, defaultSettings.home.hero.tag),
      title: sanitizeString(home.hero?.title, defaultSettings.home.hero.title),
      emphasis: sanitizeString(home.hero?.emphasis, defaultSettings.home.hero.emphasis),
      description: sanitizeString(home.hero?.description, defaultSettings.home.hero.description),
      primary_cta_label: sanitizeString(home.hero?.primary_cta_label, defaultSettings.home.hero.primary_cta_label),
      secondary_cta_label: sanitizeString(home.hero?.secondary_cta_label, defaultSettings.home.hero.secondary_cta_label),
    },
    categoryTiles: sanitizeCategoryTiles(home.categoryTiles),
    promoItems: sanitizePromoItems(home.promoItems),
    bestSellers: {
      tag: sanitizeString(home.bestSellers?.tag, defaultSettings.home.bestSellers.tag),
      title: sanitizeString(home.bestSellers?.title, defaultSettings.home.bestSellers.title),
      copy: sanitizeString(home.bestSellers?.copy, defaultSettings.home.bestSellers.copy),
      link_label: sanitizeString(home.bestSellers?.link_label, defaultSettings.home.bestSellers.link_label),
    },
    editorial: {
      tag: sanitizeString(home.editorial?.tag, defaultSettings.home.editorial.tag),
      title: sanitizeString(home.editorial?.title, defaultSettings.home.editorial.title),
      copy: sanitizeString(home.editorial?.copy, defaultSettings.home.editorial.copy),
      cards: sanitizeEditorialCards(home.editorial?.cards),
    },
    newIn: {
      tag: sanitizeString(home.newIn?.tag, defaultSettings.home.newIn.tag),
      title: sanitizeString(home.newIn?.title, defaultSettings.home.newIn.title),
      copy: sanitizeString(home.newIn?.copy, defaultSettings.home.newIn.copy),
      link_label: sanitizeString(home.newIn?.link_label, defaultSettings.home.newIn.link_label),
    },
    catalogCta: {
      tag: sanitizeString(home.catalogCta?.tag, defaultSettings.home.catalogCta.tag),
      title: sanitizeString(home.catalogCta?.title, defaultSettings.home.catalogCta.title),
      copy: sanitizeString(home.catalogCta?.copy, defaultSettings.home.catalogCta.copy),
      button_label: sanitizeString(home.catalogCta?.button_label, defaultSettings.home.catalogCta.button_label),
    },
    newsletter: {
      tag: sanitizeString(home.newsletter?.tag, defaultSettings.home.newsletter.tag),
      title: sanitizeString(home.newsletter?.title, defaultSettings.home.newsletter.title),
      emphasis: sanitizeString(home.newsletter?.emphasis, defaultSettings.home.newsletter.emphasis),
      copy: sanitizeString(home.newsletter?.copy, defaultSettings.home.newsletter.copy),
      placeholder: sanitizeString(home.newsletter?.placeholder, defaultSettings.home.newsletter.placeholder),
      button_label: sanitizeString(home.newsletter?.button_label, defaultSettings.home.newsletter.button_label),
    },
  };
}

function sanitizeFooterSettings(footer = {}) {
  return {
    brand_sub: sanitizeString(footer.brand_sub, defaultSettings.footer.brand_sub),
    copy: sanitizeString(footer.copy, defaultSettings.footer.copy),
    instagram_url: sanitizeString(footer.instagram_url, defaultSettings.footer.instagram_url),
    whatsapp_url: sanitizeString(footer.whatsapp_url, defaultSettings.footer.whatsapp_url),
    email: sanitizeString(footer.email, defaultSettings.footer.email),
    instagram_handle: sanitizeString(footer.instagram_handle, defaultSettings.footer.instagram_handle),
    whatsapp_label: sanitizeString(footer.whatsapp_label, defaultSettings.footer.whatsapp_label),
    bottom_left: sanitizeString(footer.bottom_left, defaultSettings.footer.bottom_left),
    bottom_right: sanitizeString(footer.bottom_right, defaultSettings.footer.bottom_right),
  };
}

function sanitizePaymentSettings(payment = {}) {
  return {
    bank_name: sanitizeString(payment.bank_name, defaultSettings.payment.bank_name),
    account_type: sanitizeString(payment.account_type, defaultSettings.payment.account_type),
    account_number: sanitizeString(payment.account_number, defaultSettings.payment.account_number),
    account_holder: sanitizeString(payment.account_holder, defaultSettings.payment.account_holder),
    account_rut: sanitizeString(payment.account_rut, defaultSettings.payment.account_rut),
    transfer_email: sanitizeString(payment.transfer_email, defaultSettings.payment.transfer_email),
    instructions: sanitizeString(payment.instructions, defaultSettings.payment.instructions),
  };
}

function sanitizeSiteSettings(site = {}) {
  return {
    home: sanitizeHomeSettings(site.home),
    footer: sanitizeFooterSettings(site.footer),
    payment: sanitizePaymentSettings(site.payment),
  };
}

module.exports = {
  defaultSettings,
  readSettings,
  writeSettings,
  sanitizeHomeSettings,
  sanitizeSiteSettings,
};
