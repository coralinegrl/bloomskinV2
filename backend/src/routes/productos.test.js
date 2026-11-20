const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

function productRouter() {
  const filename = path.join(__dirname, 'productos.js');
  const localRequire = createRequire(filename);
  const calls = [];
  const row = { id: 1, marca: 'Marca', nombre: 'Producto', stock: 3, tipos_piel_json: '["Seca"]', necesidades_json: '["Hidratacion"]' };
  const pool = { request() {
    const inputs = {};
    return {
      input(name, _type, value) { inputs[name] = value; return this; },
      async batch(query) { calls.push({ query, inputs }); },
      async query(query) {
        calls.push({ query, inputs });
        if (query.includes('SELECT DISTINCT marca')) return { recordset: [{ marca: 'Marca' }] };
        if (query.includes('WITH (UPDLOCK, HOLDLOCK)')) return { recordset: Object.values(inputs).includes(1) ? [{ ...row }] : [] };
        if (/UPDATE productos SET|INSERT INTO productos/.test(query)) {
          if (query.includes('UPDATE') && query.includes('COALESCE')) {
            assert.match(query, /tipos_piel_json=COALESCE\(@tipos_piel_json, tipos_piel_json\)/);
            assert.match(query, /necesidades_json=COALESCE\(@necesidades_json, necesidades_json\)/);
          }
          for (const field of ['tipos_piel_json', 'necesidades_json']) {
            if (inputs[field] !== null) row[field] = inputs[field];
          }
        }
        return { recordset: [{ ...row }] };
      },
    };
  } };
  const auth = (_req, _res, next) => next();
  const module = { exports: {} };
  const sql = { ...localRequire('mssql'),
    Transaction: class {
      async begin() { calls.push({ query: 'BEGIN' }); }
      async commit() { calls.push({ query: 'COMMIT' }); }
      async rollback() { calls.push({ query: 'ROLLBACK' }); }
    },
    Request: class { constructor() { return pool.request(); } },
  };
  const customRequire = name => {
    if (name === '../config/db') return { getPool: async () => pool, sql };
    if (name === '../middleware/auth') return { requireAdminAuth: auth };
    return localRequire(name);
  };
  const source = fs.readFileSync(filename, 'utf8');
  vm.runInNewContext('(function(require,module,__dirname,process,console){' + source + '\n})', {}, { filename })
    (customRequire, module, __dirname, process, { error() {} });
  const router = module.exports;
  async function invoke(method, routePath, body = {}) {
    const route = router.stack.find(layer => layer.route?.path === routePath && layer.route.methods[method]).route;
    if (method !== 'get') assert.equal(route.stack[0].handle, auth, 'writes must keep admin middleware');
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
    await route.stack.at(-1).handle({ body, params: { id: 1 } }, res);
    return res;
  }
  return { invoke, calls };
}

test('public list and detail expose explicit attribute arrays', async () => {
  const { invoke, calls } = productRouter();
  const list = await invoke('get', '/');
  assert.deepEqual(list.body[0].tipos_piel, ['Seca']);
  assert.deepEqual(list.body[0].necesidades, ['Hidratacion']);
  assert.match(calls.at(-1).query, /tipos_piel_json, necesidades_json/);
  const detail = await invoke('get', '/:id');
  assert.deepEqual(detail.body.tipos_piel, ['Seca']);
});

test('admin create persists labels with parameterized JSON', async () => {
  const { invoke, calls } = productRouter();
  const result = await invoke('post', '/', { marca: 'Marca', nombre: 'Producto', precio_clp: 15000, tipos_piel: ['Mixta'], necesidades: ['Limpieza'] });
  assert.equal(result.statusCode, 201);
  assert.equal(calls.at(-1).inputs.tipos_piel_json, '["Mixta"]');
  assert.deepEqual(result.body.necesidades, ['Limpieza']);
});

test('admin update preserves omitted labels and supports explicit removal', async () => {
  const { invoke, calls } = productRouter();
  const body = { marca: 'Marca', nombre: 'Producto', precio_clp: 15000 };
  const oldClient = await invoke('put', '/:id', body);
  assert.equal(calls.at(-1).inputs.tipos_piel_json, null);
  assert.deepEqual(oldClient.body.tipos_piel, ['Seca']);
  const nullClient = await invoke('put', '/:id', { ...body, tipos_piel: null, necesidades: null });
  assert.deepEqual(nullClient.body.tipos_piel, ['Seca']);
  assert.deepEqual(nullClient.body.necesidades, ['Hidratacion']);
  const updated = await invoke('put', '/:id', { ...body, tipos_piel: [], necesidades: ['Limpieza'] });
  assert.equal(updated.statusCode, 200);
  assert.deepEqual(updated.body.tipos_piel, []);
  assert.deepEqual(updated.body.necesidades, ['Limpieza']);
});

test('invalid labels return 400 before product writes or destructive JSON import', async () => {
  const { invoke, calls } = productRouter();
  for (const [method, routePath, body] of [
    ['post', '/', { marca: 'Marca', nombre: 'Producto', precio_clp: 15000, tipos_piel: 'Seca' }],
    ['put', '/:id', { marca: 'Marca', tipos_piel: ['<b>Seca</b>'] }],
    ['put', '/catalogo-json', { products: [{ necesidades: [5] }] }],
    ['post', '/catalogo-json/import', { products: [{ tipos_piel: Array(21).fill('Seca') }] }],
  ]) {
    const result = await invoke(method, routePath, body);
    assert.equal(result.statusCode, 400);
  }
  assert(!calls.some(call => /INSERT INTO|UPDATE productos|DELETE FROM/.test(call.query)));
});

test('bulk tagging is transactional, preserves prior labels and never writes price or stock', async () => {
  const { invoke, calls } = productRouter();
  const result = await invoke('patch', '/atributos', { ids: [1], tipos_piel: ['Mixta'] });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body.products[0].tipos_piel, ['Seca', 'Mixta']);
  assert.deepEqual(result.body.products[0].necesidades, ['Hidratacion']);
  const update = calls.find(call => call.query.includes('UPDATE productos SET'));
  assert(!/stock|precio/.test(update.query));
  assert.equal(calls.at(-1).query, 'COMMIT');
});

test('bulk tagging rejects invalid selection and rolls back if a product is missing', async () => {
  const { invoke, calls } = productRouter();
  assert.equal((await invoke('patch', '/atributos', { ids: [0], tipos_piel: ['Seca'] })).statusCode, 400);
  assert.equal((await invoke('patch', '/atributos', { ids: [9], tipos_piel: ['Seca'] })).statusCode, 404);
  assert.equal(calls.at(-1).query, 'ROLLBACK');
  assert(!calls.some(call => call.query.includes('UPDATE productos SET')));
});
