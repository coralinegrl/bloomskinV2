const fs = require('fs');
const path = require('path');

const catalogPath = path.resolve(__dirname, '../../../database/catalogo-2026.json');

function normalizeStars(stars) {
  if (!stars || typeof stars !== 'string') return '★★★★★';
  if (stars.includes('†')) return '★★★★☆';
  return stars;
}

function sanitizeProduct(product, index = 0) {
  return {
    marca: product.marca,
    nombre: product.nombre,
    descripcion: product.descripcion || null,
    categoria: product.categoria || null,
    precio_usd: Number(product.precio_usd || 0),
    precio_clp: Number(product.precio_clp || 0),
    precio_oferta_clp: product.precio_oferta_clp ? Number(product.precio_oferta_clp) : null,
    oferta_hasta: product.oferta_hasta || null,
    stock: Number(product.stock || 0),
    badge: product.badge || null,
    estrellas: normalizeStars(product.estrellas),
    resenas: Number(product.resenas || 0),
    img_clase: product.img_clase || `p-img-${(index % 8) + 1}`,
    imagen_url: product.imagen_url || null,
  };
}

function readCatalogFile() {
  const raw = fs.readFileSync(catalogPath, 'utf8');
  return JSON.parse(raw);
}

function writeCatalogFile(products) {
  fs.writeFileSync(catalogPath, JSON.stringify(products, null, 2), 'utf8');
}

module.exports = { catalogPath, readCatalogFile, writeCatalogFile, sanitizeProduct };
