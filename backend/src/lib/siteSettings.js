const fs = require('fs');
const path = require('path');

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '../../data');
const settingsFile = process.env.SITE_SETTINGS_FILE
  ? path.resolve(process.env.SITE_SETTINGS_FILE)
  : path.join(dataDir, 'site-settings.json');

function normalizePromoIcon(value, fallback = 'sparkle') {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');

  const map = {
    truck: 'truck',
    camion: 'truck',
    'camión': 'truck',
    shipping: 'truck',
    delivery: 'truck',
    envio: 'truck',
    'envío': 'truck',
    '🚚': 'truck',
    gift: 'gift',
    regalo: 'gift',
    muestras: 'gift',
    sample: 'gift',
    samples: 'gift',
    '🎁': 'gift',
    whatsapp: 'whatsapp',
    wa: 'whatsapp',
    chat: 'whatsapp',
    ayuda: 'whatsapp',
    asesoria: 'whatsapp',
    'asesoría': 'whatsapp',
    soporte: 'whatsapp',
    '💬': 'whatsapp',
    'flag-kr': 'flag-kr',
    flagkr: 'flag-kr',
    kr: 'flag-kr',
    korea: 'flag-kr',
    'south-korea': 'flag-kr',
    'korean-flag': 'flag-kr',
    'korea-flag': 'flag-kr',
    '🇰🇷': 'flag-kr',
  };

  return map[raw] || fallback;
}

const defaultSettings = {
  home: {
    hero: {
      tag: 'Glow diario, ritual coreano',
      title: 'Descubre tu rutina de',
      emphasis: 'skincare coreano',
      description: 'Una selección curada de fórmulas coreanas para limpiar, hidratar, proteger y tratar tu piel con textura ligera, ingredientes nobles y resultados visibles.',
      primary_cta_label: 'Explorar favoritos',
      secondary_cta_label: 'Ver catálogo',
    },
    categoryTiles: [
      { category: 'Serums', label: 'Serums', image_url: '' },
      { category: 'Hidratantes', label: 'Hidratantes', image_url: '' },
      { category: 'Limpiadores', label: 'Limpiadores', image_url: '' },
      { category: 'Proteccion Solar', label: 'Proteccion Solar', image_url: '' },
    ],
    promoItems: [
      { icon: 'truck', title: 'Envío gratis', copy: 'Sobre $49.990 en compras seleccionadas' },
      { icon: 'flag-kr', title: 'Originales de Corea', copy: 'Selección auténtica de K-Beauty' },
      { icon: 'gift', title: 'Hallazgos y favoritos', copy: 'Curaduría pensada para cada rutina' },
      { icon: 'whatsapp', title: 'Asesoría por WhatsApp', copy: 'Te ayudamos a elegir según tu piel' },
    ],
    bestSellers: {
      tag: 'Best Sellers',
      title: 'Favoritos Bloomskin',
      copy: 'Los esenciales que más buscan nuestras clientas para una rutina simple, efectiva y rica de usar.',
      link_label: 'Ver catálogo',
    },
    editorial: {
      tag: 'Descubre por necesidad',
      title: 'Explora la tienda como una rutina',
      copy: 'Explora por necesidad y encuentra texturas, beneficios e ingredientes que sí hacen sentido para tu piel.',
      cards: [
        {
          kicker: 'Rutina base',
          title: 'Empieza por una limpieza suave',
          copy: 'Espumas, geles y básicos suaves para empezar una rutina coreana sin complicarte.',
          link_label: 'Explorar limpiadores →',
          category: 'Limpiadores',
          tone: 'rose',
        },
        {
          kicker: 'Uso diario',
          title: 'Protección solar que sí vas a querer usar',
          copy: 'Filtros ligeros, cómodos y amables con el maquillaje para todos los días.',
          link_label: 'Ver solares →',
          category: 'Proteccion Solar',
          tone: 'sage',
        },
        {
          kicker: 'Tratamiento',
          title: 'Serums para brillo, textura y manchas',
          copy: 'Serums para hidratación, luminosidad, textura y manchas con una selección más clara y útil.',
          link_label: 'Ir a serums →',
          category: 'Serums',
          tone: 'cream',
        },
      ],
    },
    newIn: {
      tag: 'New In',
      title: 'Novedades y hallazgos',
      copy: 'Novedades, lanzamientos y fórmulas que están marcando tendencia en el universo K-Beauty.',
      link_label: 'Ver novedades',
    },
    catalogCta: {
      tag: 'Catálogo completo',
      title: 'Explora todo el universo Bloomskin',
      copy: 'Filtra por categoría, marca, precio, stock y promociones para encontrar lo que tu rutina necesita.',
      button_label: 'Abrir catálogo',
    },
    newsletter: {
      tag: 'Únete a Bloomskin',
      title: 'Tips de K-Beauty y',
      emphasis: 'novedades exclusivas',
      copy: 'Suscríbete para recibir lanzamientos, rituales, favoritos coreanos y ofertas especiales.',
      placeholder: 'tu@email.com',
      button_label: 'Suscribirme',
    },
  },
  footer: {
    brand_sub: 'K-Beauty - Chile',
    copy: 'Skincare coreano curado para Chile, con productos originales, ayuda real y compra simple.',
    instagram_url: 'https://www.instagram.com/bloomskin__cl',
    whatsapp_url: 'https://wa.me/569948418523',
    email: 'bloomskincl1@gmail.com',
    instagram_handle: '@bloomskin__cl',
    whatsapp_label: '+56 9 9484 1853',
    bottom_left: '(c) 2026 Bloomskin - Antofagasta, Chile',
    bottom_right: 'Originales de Corea del Sur',
  },
  payment: {
    bank_name: 'Banco por definir',
    account_type: 'Cuenta corriente',
    account_number: '',
    account_holder: 'Bloomskin',
    account_rut: '',
    transfer_email: '',
    instructions: 'Transfiere el total exacto del pedido y usa el numero de pedido como asunto o referencia. Luego sube tu comprobante para validarlo en Bloomskin.',
  },
  seo: {
    site_name: 'Bloomskin',
    title_suffix: 'Bloomskin - K-Beauty Chile',
    default_title: 'Bloomskin - K-Beauty coreano en Chile',
    default_description: 'Skincare coreano original en Chile. Compra serums, limpiadores, hidratantes y proteccion solar con envio a todo Chile.',
    og_image: '/brand/bloomskin-logo.png',
    favicon: '/brand/bloomskin-logo.png',
    ga_measurement_id: '',
  },
  contact: {
    heading: 'Hablemos de tu rutina',
    intro: 'Si tienes dudas de compra, despacho o productos, puedes escribirnos y te ayudamos.',
    whatsapp_cta_label: 'Hablar por WhatsApp',
    email_cta_label: 'Escribir por correo',
  },
  legal: {
    shipping_policy: {
      title: 'Tiempos y condiciones de envio',
      intro: 'Despachamos desde Antofagasta y coordinamos cada pedido segun destino y disponibilidad.',
      body: 'Antofagasta se calcula por distancia desde Bloomskin. Fuera de Antofagasta usamos Blue Express. Sobre $49.990 el envio es gratis cuando corresponda segun configuracion vigente. Los tiempos pueden variar en dias de alta demanda.',
    },
    returns_policy: {
      title: 'Cambios y devoluciones',
      intro: 'Si tu pedido llega con algun problema, escribenos para revisarlo caso a caso.',
      body: 'Aceptamos revisiones por productos dañados, errores de preparacion o incidencias de transporte. Para evaluar un caso necesitaremos numero de pedido, fotos y contacto dentro del plazo informado por Bloomskin.',
    },
    shipping_conditions: {
      title: 'Condiciones de despacho',
      intro: 'Estas condiciones resumen como operan nuestros envios dentro de Chile.',
      body: 'La clienta debe ingresar datos correctos y completos para evitar retrasos. Si el courier no logra entregar por direccion incompleta o ausencia reiterada, el pedido puede requerir coordinacion adicional.',
    },
  },
};

function ensureSettingsFile() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(settingsFile, JSON.stringify(defaultSettings, null, 2), 'utf8');
  }
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
    icon: normalizePromoIcon(item?.icon, defaultSettings.home.promoItems[index]?.icon || ''),
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

function sanitizeSeoSettings(seo = {}) {
  return {
    site_name: sanitizeString(seo.site_name, defaultSettings.seo.site_name),
    title_suffix: sanitizeString(seo.title_suffix, defaultSettings.seo.title_suffix),
    default_title: sanitizeString(seo.default_title, defaultSettings.seo.default_title),
    default_description: sanitizeString(seo.default_description, defaultSettings.seo.default_description),
    og_image: sanitizeString(seo.og_image, defaultSettings.seo.og_image),
    favicon: sanitizeString(seo.favicon, defaultSettings.seo.favicon),
    ga_measurement_id: sanitizeString(seo.ga_measurement_id, defaultSettings.seo.ga_measurement_id),
  };
}

function sanitizeContactSettings(contact = {}) {
  return {
    heading: sanitizeString(contact.heading, defaultSettings.contact.heading),
    intro: sanitizeString(contact.intro, defaultSettings.contact.intro),
    whatsapp_cta_label: sanitizeString(contact.whatsapp_cta_label, defaultSettings.contact.whatsapp_cta_label),
    email_cta_label: sanitizeString(contact.email_cta_label, defaultSettings.contact.email_cta_label),
  };
}

function sanitizeLegalPage(page = {}, fallback) {
  return {
    title: sanitizeString(page.title, fallback.title),
    intro: sanitizeString(page.intro, fallback.intro),
    body: sanitizeString(page.body, fallback.body),
  };
}

function sanitizeLegalSettings(legal = {}) {
  return {
    shipping_policy: sanitizeLegalPage(legal.shipping_policy, defaultSettings.legal.shipping_policy),
    returns_policy: sanitizeLegalPage(legal.returns_policy, defaultSettings.legal.returns_policy),
    shipping_conditions: sanitizeLegalPage(legal.shipping_conditions, defaultSettings.legal.shipping_conditions),
  };
}

function sanitizeSiteSettings(site = {}) {
  return {
    home: sanitizeHomeSettings(site.home),
    footer: sanitizeFooterSettings(site.footer),
    payment: sanitizePaymentSettings(site.payment),
    seo: sanitizeSeoSettings(site.seo),
    contact: sanitizeContactSettings(site.contact),
    legal: sanitizeLegalSettings(site.legal),
  };
}

function readSettings() {
  ensureSettingsFile();
  const raw = fs.readFileSync(settingsFile, 'utf8');
  const parsed = JSON.parse(raw);
  return sanitizeSiteSettings({
    ...defaultSettings,
    ...parsed,
    home: { ...defaultSettings.home, ...(parsed.home || {}) },
    footer: { ...defaultSettings.footer, ...(parsed.footer || {}) },
    payment: { ...defaultSettings.payment, ...(parsed.payment || {}) },
    seo: { ...defaultSettings.seo, ...(parsed.seo || {}) },
    contact: { ...defaultSettings.contact, ...(parsed.contact || {}) },
    legal: { ...defaultSettings.legal, ...(parsed.legal || {}) },
  });
}

function writeSettings(nextSettings) {
  ensureSettingsFile();
  fs.writeFileSync(settingsFile, JSON.stringify(sanitizeSiteSettings(nextSettings), null, 2), 'utf8');
}

module.exports = {
  defaultSettings,
  readSettings,
  writeSettings,
  sanitizeHomeSettings,
  sanitizeSiteSettings,
};
