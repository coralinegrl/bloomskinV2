const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeProduct } = require('./catalog');
const { normalizeAttributeLabels, hydrateProductAttributes, attributeUpdateJson, validateBulkAttributes, mergeProductAttributes } = require('./productAttributes');

test('products without labels remain untagged, regardless of brand/name', () => {
  const product = sanitizeProduct({ marca: 'COSRX', nombre: 'Crema para piel seca' });
  assert.deepEqual(product.tipos_piel, []);
  assert.deepEqual(product.necesidades, []);
  assert.deepEqual(hydrateProductAttributes({}), { tipos_piel: [], necesidades: [] });
});

test('labels normalize spacing and deduplicate accents/case while retaining display names', () => {
  assert.deepEqual(normalizeAttributeLabels(['  Seca ', 'seca', 'Hidratación', 'hidratacion', 'Doble   limpieza', ''], 'test'),
    ['Seca', 'Hidratación', 'Doble limpieza']);
});

test('invalid or excessive labels reject writes rather than silently changing metadata', () => {
  for (const value of ['Seca', {}, [1], ['x'.repeat(61)], ['<script>'], ['all'], Array(21).fill('Seca')]) {
    assert.throws(() => normalizeAttributeLabels(value, 'tipos_piel'), { code: 'INVALID_ATTRIBUTE' });
  }
});

test('JSON catalog sanitization preserves labels and hydration tolerates legacy corrupt data', () => {
  const product = sanitizeProduct({ tipos_piel: ['Mixta'], necesidades: ['Hidratación'] });
  assert.deepEqual(hydrateProductAttributes({ tipos_piel_json: JSON.stringify(product.tipos_piel), necesidades_json: JSON.stringify(product.necesidades) }),
    { tipos_piel: ['Mixta'], necesidades: ['Hidratación'] });
  for (const value of ['{broken', 'null', '{}', '"Seca"', '[5]']) {
    assert.deepEqual(hydrateProductAttributes({ tipos_piel_json: value }).tipos_piel, []);
  }
});

test('older update clients preserve omitted fields; explicit empty arrays clear labels', () => {
  const product = sanitizeProduct({ tipos_piel: [] });
  assert.equal(attributeUpdateJson({}, product, 'tipos_piel'), null);
  assert.equal(attributeUpdateJson({ tipos_piel: [] }, product, 'tipos_piel'), '[]');
  assert.equal(attributeUpdateJson({ tipos_piel: null }, product, 'tipos_piel'), null);
});

test('bulk tagging validates selection and adds labels without replacing existing metadata', () => {
  const { ids, additions } = validateBulkAttributes({ ids: [1, 2, 1], tipos_piel: ['Seca'], necesidades: ['Hidratacion'] });
  assert.deepEqual(ids, [1, 2]);
  assert.deepEqual(mergeProductAttributes({ tipos_piel_json: '["Sensible"]', necesidades_json: '["Limpieza"]' }, additions),
    { tipos_piel: ['Sensible', 'Seca'], necesidades: ['Limpieza', 'Hidratacion'] });
  for (const body of [{}, { ids: [] }, { ids: [0], tipos_piel: ['Seca'] }, { ids: ['1'], tipos_piel: ['Seca'] }, { ids: [1] }, { ids: Array(101).fill(1), tipos_piel: ['Seca'] }]) {
    assert.throws(() => validateBulkAttributes(body), { code: 'INVALID_ATTRIBUTE' });
  }
  assert.throws(() => mergeProductAttributes({ tipos_piel: Array.from({ length: 20 }, (_, i) => `Piel ${i}`) }, additions), { code: 'INVALID_ATTRIBUTE' });
});
