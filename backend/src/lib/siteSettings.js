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
    'camiÃƒÆ’Ã‚Â³n': 'truck',
    shipping: 'truck',
    delivery: 'truck',
    envio: 'truck',
    'envÃƒÆ’Ã‚Â­o': 'truck',
    'ÃƒÂ°Ã…Â¸Ã…Â¡Ã…Â¡': 'truck',
    gift: 'gift',
    regalo: 'gift',
    muestras: 'gift',
    sample: 'gift',
    samples: 'gift',
    'ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â': 'gift',
    whatsapp: 'whatsapp',
    wa: 'whatsapp',
    chat: 'whatsapp',
    ayuda: 'whatsapp',
    asesoria: 'whatsapp',
    'asesorÃƒÆ’Ã‚Â­a': 'whatsapp',
    soporte: 'whatsapp',
    'ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â¬': 'whatsapp',
    'flag-kr': 'flag-kr',
    flagkr: 'flag-kr',
    kr: 'flag-kr',
    korea: 'flag-kr',
    'south-korea': 'flag-kr',
    'korean-flag': 'flag-kr',
    'korea-flag': 'flag-kr',
    'ÃƒÂ°Ã…Â¸Ã¢â‚¬Â¡Ã‚Â°ÃƒÂ°Ã…Â¸Ã¢â‚¬Â¡Ã‚Â·': 'flag-kr',
  };

  return map[raw] || fallback;
}

const defaultSettings = {
  home: {
    hero: {
      tag: 'K-Beauty original en Chile',
      title: 'Skincare coreano',
      emphasis: 'listo para tu rutina',
      description: 'Productos originales, stock real y asesor\\u00eda cercana para elegir limpiadores, serums, hidratantes y solares sin perderte entre mil opciones.',
      primary_cta_label: 'Ver m\\u00e1s vendidos',
      secondary_cta_label: 'Ver cat\\u00e1logo',
    },
    categoryTiles: [
      { category: 'Serums', label: 'Serums', image_url: '' },
      { category: 'Hidratantes', label: 'Hidratantes', image_url: '' },
      { category: 'Limpiadores', label: 'Limpiadores', image_url: '' },
      { category: 'Protecci\\u00f3n Solar', label: 'Protecci\\u00f3n Solar', image_url: '' },
    ],
    promoItems: [
      { icon: 'truck', title: 'Env\\u00edo gratis', copy: 'Sobre $49.990 seg\\u00fan cobertura vigente' },
      { icon: 'flag-kr', title: 'Originales de Corea', copy: 'Selecci\\u00f3n aut\\u00e9ntica de K-Beauty' },
      { icon: 'gift', title: 'Stock real', copy: 'Compras con disponibilidad actualizada' },
      { icon: 'whatsapp', title: 'Grupo de ofertas', copy: 'Drops y descuentos secretos por WhatsApp' },
    ],
    bestSellers: {
      tag: 'Best Sellers',
      title: 'Favoritos Bloomskin',
      copy: 'Los productos que m\\u00e1s se repiten en carritos y rutinas: una entrada r\\u00e1pida a lo que mejor se mueve en Bloomskin.',
      link_label: 'Ver cat\\u00e1logo',
    },
    editorial: {
      tag: 'Compra por necesidad',
      title: 'Encuentra lo que tu rutina pide',
      copy: 'Elige seg\\u00fan el momento de tu rutina y llega m\\u00e1s r\\u00e1pido al tipo de producto que est\\u00e1s buscando.',
      cards: [
        {
          kicker: 'Rutina base',
          title: 'Empieza por una limpieza suave',
          copy: 'Limpiadores y b\\u00e1sicos suaves para empezar una rutina coreana sin complicarte.',
          link_label: 'Explorar limpiadores ->',
          category: 'Limpiadores',
          tone: 'rose',
        },
        {
          kicker: 'Uso diario',
          title: 'Protecci\\u00f3n solar que s\\u00ed vas a querer usar',
          copy: 'Filtros ligeros, c\\u00f3modos y amables con el maquillaje para todos los d\\u00edas.',
          link_label: 'Ver solares ->',
          category: 'Protecci\\u00f3n Solar',
          tone: 'sage',
        },
        {
          kicker: 'Tratamiento',
          title: 'Serums para hidrataci\\u00f3n y glow',
          copy: 'Serums para hidrataci\\u00f3n, luminosidad, textura y manchas con una selecci\\u00f3n m\\u00e1s clara y \\u00fatil.',
          link_label: 'Ir a serums ->',
          category: 'Serums',
          tone: 'cream',
        },
      ],
    },
    newIn: {
      tag: 'New In',
      title: 'Novedades y hallazgos',
      copy: 'Lanzamientos, reposiciones y f\\u00f3rmulas que vale la pena mirar antes de que se agoten.',
      link_label: 'Ver novedades',
    },
    catalogCta: {
      tag: 'Cat\\u00e1logo completo',
      title: '\\u00bfQuieres verlo todo?',
      copy: 'Abre el cat\\u00e1logo completo con filtros por categor\\u00eda, marca, precio, stock y promociones.',
      button_label: 'Abrir cat\\u00e1logo',
    },
    newsletter: {
      tag: 'Correo Bloomskin',
      title: 'Lanzamientos, tips y',
      emphasis: 'cupones especiales',
      copy: 'Suscr\\u00edbete para recibir novedades, favoritos coreanos y beneficios ocasionales sin depender de redes sociales.',
      placeholder: 'tu@email.com',
      button_label: 'Suscribirme',
    },
  },
  footer: {
    brand_sub: 'K-Beauty - Chile',
    copy: 'Skincare coreano curado para Chile, con productos originales, ayuda real y compra simple.',
    instagram_url: 'https://www.instagram.com/bloomskin__cl',
    whatsapp_url: 'https://wa.me/56994841853',
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
    default_description: 'Skincare coreano original en Chile. Compra sÃƒÆ’Ã‚Â©rums, limpiadores, hidratantes y protecciÃƒÆ’Ã‚Â³n solar con envÃƒÆ’Ã‚Â­o a todo Chile.',
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
  about: {
    heading: 'QuiÃƒÆ’Ã‚Â©nes somos',
    intro: 'Bloomskin nace para acercar el skincare coreano a Chile con una seleccion curada, amable de comprar y pensada para la vida real.',
    body: 'Nos importan las fÃƒÆ’Ã‚Â³rmulas originales, las texturas que de verdad se disfrutan y una experiencia simple para descubrir productos sin sentir la tienda pesada. Curamos el catÃƒÆ’Ã‚Â¡logo, acompaÃƒÆ’Ã‚Â±amos por WhatsApp y buscamos que cada compra se sienta confiable, linda y clara de principio a fin.',
    signature: 'CuradurÃƒÆ’Ã‚Â­a real, ayuda cercana y una forma mÃƒÆ’Ã‚Â¡s humana de comprar K-Beauty.',
  },
  legal: {
    shipping_policy: {
      title: 'Tiempos y condiciones de envÃƒÆ’Ã‚Â­o',
      intro: 'Despachamos desde Antofagasta y coordinamos cada pedido segun destino y disponibilidad.',
      body: 'Antofagasta se calcula por distancia desde Oficina Lina 210. Fuera de Antofagasta usamos Blue Express. Sobre $49.990 el envÃƒÆ’Ã‚Â­o es gratis cuando corresponda segÃƒÆ’Ã‚Âºn la configuraciÃƒÆ’Ã‚Â³n vigente. Los tiempos pueden variar en dÃƒÆ’Ã‚Â­as de alta demanda.',
    },
    returns_policy: {
      title: 'Cambios y devoluciones',
      intro: 'No realizamos cambios ni devoluciones por preferencia personal, aroma, textura o expectativas de uso.',
      body: 'En Bloomskin solo revisamos casos en que el producto llegue quebrado, abierto, derramado, con falla evidente de fÃƒÆ’Ã‚Â¡brica o en mal estado al momento de la entrega. Si ocurre, escrÃƒÆ’Ã‚Â­benos apenas lo recibas con tu nÃƒÆ’Ã‚Âºmero de pedido, fotos claras del empaque y del producto, y una breve descripciÃƒÆ’Ã‚Â³n. Evaluaremos cada caso y, si corresponde, ofreceremos reposiciÃƒÆ’Ã‚Â³n, nota de crÃƒÆ’Ã‚Â©dito o soluciÃƒÆ’Ã‚Â³n equivalente segÃƒÆ’Ã‚Âºn stock y disponibilidad.',
    },
    shipping_conditions: {
      title: 'Condiciones de despacho',
      intro: 'Estas condiciones resumen cÃƒÆ’Ã‚Â³mo operan nuestros envÃƒÆ’Ã‚Â­os dentro de Chile.',
      body: 'La clienta debe ingresar datos correctos y completos para evitar retrasos. Si eliges envÃƒÆ’Ã‚Â­o, la direcciÃƒÆ’Ã‚Â³n debe estar bien escrita y con referencias ÃƒÆ’Ã‚Âºtiles. Si eliges retiro coordinado, no necesitas completar direcciÃƒÆ’Ã‚Â³n de despacho para ese pedido. Si el courier no logra entregar por direcciÃƒÆ’Ã‚Â³n incompleta o ausencia reiterada, el pedido puede requerir coordinaciÃƒÆ’Ã‚Â³n adicional.',
    },
    terms_conditions: {
      title: 'TÃƒÆ’Ã‚Â©rminos y condiciones',
      intro: 'Bloomskin opera como una tienda online de skincare coreano con stock limitado, curadurÃƒÆ’Ã‚Â­a propia y atenciÃƒÆ’Ã‚Â³n personalizada desde Chile.',
      body: 'Al comprar en Bloomskin, aceptas que la disponibilidad de productos, promociones, tiempos de preparaciÃƒÆ’Ã‚Â³n y formas de entrega pueden variar segÃƒÆ’Ã‚Âºn stock, campaÃƒÆ’Ã‚Â±as activas y volumen operativo. Los pedidos por transferencia quedan sujetos a confirmaciÃƒÆ’Ã‚Â³n una vez recibido el comprobante dentro del plazo indicado en checkout. Nos reservamos el derecho de anular pedidos con datos incompletos, pagos no acreditados, errores manifiestos de precio o falta de stock sobreviniente, informÃƒÆ’Ã‚Â¡ndolo oportunamente a la clienta y ofreciendo la soluciÃƒÆ’Ã‚Â³n correspondiente. Todo el contenido, imÃƒÆ’Ã‚Â¡genes y textos del sitio son referenciales y buscan orientar mejor tu compra, sin reemplazar la lectura de ingredientes, indicaciones y precauciones propias de cada producto.',
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

function sanitizeAboutSettings(about = {}) {
  return {
    heading: sanitizeString(about.heading, defaultSettings.about.heading),
    intro: sanitizeString(about.intro, defaultSettings.about.intro),
    body: sanitizeString(about.body, defaultSettings.about.body),
    signature: sanitizeString(about.signature, defaultSettings.about.signature),
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
    terms_conditions: sanitizeLegalPage(legal.terms_conditions, defaultSettings.legal.terms_conditions),
  };
}

function sanitizeSiteSettings(site = {}) {
  return {
    home: sanitizeHomeSettings(site.home),
    footer: sanitizeFooterSettings(site.footer),
    payment: sanitizePaymentSettings(site.payment),
    seo: sanitizeSeoSettings(site.seo),
    contact: sanitizeContactSettings(site.contact),
    about: sanitizeAboutSettings(site.about),
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
    about: { ...defaultSettings.about, ...(parsed.about || {}) },
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
