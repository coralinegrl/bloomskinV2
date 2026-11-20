const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { promisify } = require('node:util');
const gzip = promisify(zlib.gzip), gunzip = promisify(zlib.gunzip);
const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '../../data'));
const revisionsFile = path.join(dataDir, 'content-revisions.json');
const backupRoot = path.join(dataDir, 'backups');
let backupJob = { running: false, error: '', last_success: null };
const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
function atomicJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2));
  fs.renameSync(temporary, file);
}
function revisions() {
  if (!fs.existsSync(revisionsFile)) return [];
  return JSON.parse(fs.readFileSync(revisionsFile, 'utf8'));
}
function saveRevision(settings, adminId) {
  const rows = revisions();
  rows.unshift({ id: crypto.randomUUID(), created_at: new Date().toISOString(), admin_id: adminId || null, settings });
  atomicJson(revisionsFile, rows.slice(0,30));
}
function listBackups() {
  if (!fs.existsSync(backupRoot)) return [];
  return fs.readdirSync(backupRoot).filter(name => /^backup-[a-f0-9-]+$/.test(name)).flatMap(name => {
    const file = path.join(backupRoot,name,'manifest.json');
    if (!fs.existsSync(file)) return [];
    try {
      const manifest = JSON.parse(fs.readFileSync(file,'utf8'));
      if(typeof manifest.created_at!=='string' || !Array.isArray(manifest.files)) throw new Error('Invalid manifest');
      return [{ id: name, created_at: manifest.created_at, bytes: manifest.bytes, files: manifest.files.length, verified: manifest.verified }];
    } catch {return [{id:name,created_at:fs.statSync(file).mtime.toISOString(),bytes:0,files:0,verified:false}];}
  }).sort((a,b) => b.created_at.localeCompare(a.created_at));
}
function backupPath(id) {
  if (!/^backup-[a-f0-9-]+$/.test(String(id))) throw new Error('Respaldo inválido.');
  return path.join(backupRoot,id);
}
async function copyTree(source, destination, records, prefix) {
  if (!fs.existsSync(source)) return;
  await fs.promises.mkdir(destination,{ recursive:true });
  for (const entry of await fs.promises.readdir(source,{ withFileTypes:true })) {
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) await copyTree(path.join(source,entry.name),path.join(destination,entry.name),records,`${prefix}/${entry.name}`);
    else if (entry.isFile()) {
      const buffer = await fs.promises.readFile(path.join(source,entry.name));
      const target = path.join(destination,entry.name);
      await fs.promises.writeFile(target,buffer);
      if (hash(await fs.promises.readFile(target)) !== hash(buffer)) throw new Error('Una imagen no pasó la verificación.');
      records.push({ path:`${prefix}/${entry.name}`, bytes:buffer.length, sha256:hash(buffer) });
    }
  }
}
async function createBackup(pool) {
  if (backupJob.running) return;
  backupJob = { ...backupJob, running:true, error:'' };
  let directory;
  try {
    const id = `backup-${crypto.randomUUID()}`; directory = backupPath(id);
    await fs.promises.mkdir(directory,{ recursive:true });
    const transaction = new (require('../config/db').sql.Transaction)(pool);
    const tables = {};
    // A serializable read transaction makes related orders, items and stock consistent.
    await transaction.begin(require('../config/db').sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      const names = (await new (require('../config/db').sql.Request)(transaction).query("SELECT name FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo') ORDER BY name")).recordset;
      for (const { name } of names) tables[name] = (await new (require('../config/db').sql.Request)(transaction).query(`SELECT * FROM dbo.[${name.replace(/]/g,']]')}]`)).recordset;
      await transaction.commit();
    } catch (error) { try { await transaction.rollback(); } catch {} throw error; }
    const settings = require('./siteSettings').readSettings();
    const privateConfig = {};
    for (const name of ['order-alerts.json','mail-customization.json','content-revisions.json']) {
      const file = path.join(dataDir,name);
      if (fs.existsSync(file)) privateConfig[name] = JSON.parse(await fs.promises.readFile(file,'utf8'));
    }
    const snapshot = Buffer.from(JSON.stringify({ version:1, created_at:new Date().toISOString(), tables, settings, private_config:privateConfig }));
    const compressed = await gzip(snapshot);
    const target = path.join(directory,'database.json.gz');
    await fs.promises.writeFile(target,compressed);
    if (hash(await gunzip(await fs.promises.readFile(target))) !== hash(snapshot)) throw new Error('El respaldo no pasó la verificación.');
    const records = [];
    const uploads = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname,'../../uploads'));
    await copyTree(uploads,path.join(directory,'uploads'),records,'uploads');
    atomicJson(path.join(directory,'manifest.json'),{ id, created_at:new Date().toISOString(), bytes:compressed.length, verified:true, database_sha256:hash(compressed), files:records });
    backupJob.last_success = new Date().toISOString();
    // Retention only touches UUID directories inside the dedicated backup root.
    for (const old of listBackups().slice(7)) await fs.promises.rm(backupPath(old.id),{ recursive:true, force:true });
  } catch (error) {
    backupJob.error = 'No se pudo completar el respaldo. Revisa espacio y conexión a la base de datos.'; console.error('Backup:',error.code || error.name);
    if(directory && path.dirname(directory)===backupRoot && !fs.existsSync(path.join(directory,'manifest.json'))) await fs.promises.rm(directory,{recursive:true,force:true}).catch(()=>{});
  }
  finally { backupJob.running = false; }
}
async function dailyBackup(pool) {
  const latest = listBackups()[0];
  if (!latest || Date.now()-Date.parse(latest.created_at) > 24*3600000) await createBackup(pool);
}
module.exports = { atomicJson, dataDir, revisions, saveRevision, listBackups, backupPath, createBackup, dailyBackup, backupStatus:() => ({ ...backupJob }) };
