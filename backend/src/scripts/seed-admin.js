// Script para crear el usuario admin inicial
// Ejecutar: node src/scripts/seed-admin.js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt   = require('bcryptjs');
const { getPool, sql } = require('../config/db');

async function seedAdmin() {
  const email    = process.env.ADMIN_EMAIL    || 'admin@bloomskin.cl';
  const password = process.env.ADMIN_PASSWORD || 'bloomskin2025';
  const nombre   = process.env.ADMIN_NAME     || 'Cora';

  console.log('🌸 Creando usuario admin...');
  const hash = await bcrypt.hash(password, 10);

  const pool = await getPool();
  const existing = await pool.request()
    .input('email', sql.NVarChar, email)
    .query('SELECT id FROM usuarios WHERE email=@email');

  if (existing.recordset[0]) {
    await pool.request()
      .input('email', sql.NVarChar, email)
      .input('hash',  sql.NVarChar, hash)
      .query('UPDATE usuarios SET password_hash=@hash WHERE email=@email');
    console.log(`✓ Contraseña actualizada para ${email}`);
  } else {
    await pool.request()
      .input('nombre', sql.NVarChar, nombre)
      .input('email',  sql.NVarChar, email)
      .input('hash',   sql.NVarChar, hash)
      .query(`INSERT INTO usuarios (nombre,email,password_hash,rol)
              VALUES (@nombre,@email,@hash,'admin')`);
    console.log(`✓ Admin creado: ${email} / ${password}`);
  }

  console.log('   ⚠️  Recuerda cambiar la contraseña en producción.');
  process.exit(0);
}

seedAdmin().catch(err => { console.error(err); process.exit(1); });
