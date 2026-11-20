const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

async function createQaDatabase() {
  const name = `bloomskin_qa_${Date.now()}`;
  assert.notEqual(name, process.env.DB_NAME);
  process.env.DB_NAME = 'master';
  const { getPool, sql } = require('../../config/db');
  const master = await getPool();
  let qa;
  try {
    assert.match(name, /^bloomskin_qa_\d+$/);
    await master.request().batch(`CREATE DATABASE [${name}]`);
    qa = new sql.ConnectionPool({ ...master.config, database: name,
      connectionString: master.config.connectionString?.replace(/Database=[^;]+;/, `Database=${name};`) });
    await qa.connect();
    const root = path.resolve(__dirname, '../../../../database');
    const batches = fs.readFileSync(path.join(root, 'schema.sql'), 'utf8').split(/^\s*GO\s*$/gim).slice(2);
    for (const file of fs.readdirSync(path.join(root, 'migrations')).filter(n => n.endsWith('.sql')).sort()) {
      batches.push(...fs.readFileSync(path.join(root, 'migrations', file), 'utf8').split(/^\s*GO\s*$/gim));
    }
    for (const batch of batches) {
      const safe = batch.replace(/^\s*USE\s+bloomskin\s*;\s*$/gim, '');
      assert(!/\b(?:USE|CREATE DATABASE)\s+/i.test(safe.replace(/--[^\r\n]*/g, '')), 'Unsafe database switch');
      if (safe.trim()) await qa.request().batch(safe);
    }
    assert.equal((await qa.request().query('SELECT DB_NAME() AS name')).recordset[0].name, name);
    return { name, qa, master, sql };
  } catch (error) {
    await qa?.close();
    await master.close();
    throw error;
  }
}

module.exports = { createQaDatabase };
