const useMsNodeSql = process.env.DB_DRIVER === 'msnodesqlv8' || process.env.DB_TRUSTED_CONNECTION === 'true';
const sql = useMsNodeSql ? require('mssql/msnodesqlv8') : require('mssql');

const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'bloomskin',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

if (useMsNodeSql) {
  config.driver = 'msnodesqlv8';
  config.options.trustedConnection = true;
  config.connectionString =
    `Driver={ODBC Driver 17 for SQL Server};` +
    `Server=${config.server};` +
    `Database=${config.database};` +
    `Trusted_Connection=Yes;`;
} else {
  config.port = parseInt(process.env.DB_PORT) || 1433;
  config.user = process.env.DB_USER || 'sa';
  config.password = process.env.DB_PASSWORD || '';

  if (process.env.DB_INSTANCE) {
    config.options.instanceName = process.env.DB_INSTANCE;
    delete config.port;
  }
}

let pool = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
    console.log(`✓ Conectado a SQL Server (${process.env.DB_INSTANCE || `${config.server}:${config.port}`}) - ${config.database}`);
  }
  return pool;
}

module.exports = { getPool, sql };
