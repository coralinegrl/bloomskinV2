require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { getPool, sql } = require('../config/db');
const { readCatalogFile, sanitizeProduct } = require('../lib/catalog');

async function run() {
  const products = readCatalogFile();
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    await new sql.Request(transaction).query('IF OBJECT_ID(\'product_reviews\', \'U\') IS NOT NULL DELETE FROM product_reviews; DELETE FROM pedido_items; DELETE FROM pedidos; DELETE FROM productos; DBCC CHECKIDENT (\'productos\', RESEED, 0);');

    for (const [index, rawProduct] of products.entries()) {
      const product = sanitizeProduct(rawProduct, index);
      await new sql.Request(transaction)
        .input('marca', sql.NVarChar, product.marca)
        .input('nombre', sql.NVarChar, product.nombre)
        .input('categoria', sql.NVarChar, product.categoria || null)
        .input('precio_usd', sql.Decimal(10, 2), Number(product.precio_usd || 0))
        .input('precio_clp', sql.Int, Number(product.precio_clp || 0))
        .input('precio_oferta_clp', sql.Int, product.precio_oferta_clp ? Number(product.precio_oferta_clp) : null)
        .input('stock', sql.Int, Number(product.stock || 0))
        .input('badge', sql.NVarChar, product.badge || null)
        .input('estrellas', sql.NVarChar, product.estrellas)
        .input('resenas', sql.Int, Number(product.resenas || 0))
        .input('img_clase', sql.NVarChar, product.img_clase || `p-img-${(index % 8) + 1}`)
        .input('imagen_url', sql.NVarChar, product.imagen_url || null)
        .input('descripcion', sql.NVarChar, product.descripcion || null)
        .query(`
          INSERT INTO productos
          (marca, nombre, descripcion, categoria, precio_usd, precio_clp, precio_oferta_clp, stock, badge, estrellas, resenas, img_clase, imagen_url)
          VALUES
          (@marca, @nombre, @descripcion, @categoria, @precio_usd, @precio_clp, @precio_oferta_clp, @stock, @badge, @estrellas, @resenas, @img_clase, @imagen_url)
        `);
    }

    await transaction.commit();

    const summary = products.reduce((acc, product) => {
      const key = product.categoria || 'Sin categoria';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    console.log(`Catalogo cargado: ${products.length} productos`);
    console.table(summary);
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {
      // ignore rollback errors
    }
    console.error('No se pudo cargar el catalogo:', error);
    process.exitCode = 1;
  }
}

run();
