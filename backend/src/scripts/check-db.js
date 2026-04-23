require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { getPool, sql } = require('../config/db');

async function main() {
  const pool = await getPool();
  const result = await pool.request().query('SELECT DB_NAME() AS db_name, @@SERVERNAME AS server_name');
  const row = result.recordset[0];
  console.log(`DB OK: ${row.db_name} @ ${row.server_name}`);
  await sql.close();
}

main().catch(err => {
  console.error('DB check failed:', err.message);
  process.exit(1);
});
