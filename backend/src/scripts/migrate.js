require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getPool } = require('../config/db');

async function run() {
  const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(name => name.endsWith('.sql'))
    .sort();

  const pool = await getPool();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const batches = sql
      .split(/^\s*GO\s*$/gim)
      .map(batch => batch.trim())
      .filter(Boolean);
    console.log(`Aplicando ${file}...`);
    for (const batch of batches) {
      await pool.batch(batch);
    }
  }

  console.log(`Migraciones aplicadas: ${files.length}`);
  process.exit(0);
}

run().catch(err => {
  console.error('No se pudieron aplicar las migraciones:', err);
  process.exit(1);
});
