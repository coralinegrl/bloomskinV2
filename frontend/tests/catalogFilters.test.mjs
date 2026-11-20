import test from 'node:test'
import assert from 'node:assert/strict'
import { attributeLabels, attributeOptions, attributeFilterOptions, matchesProductAttributes, matchesPriceFilter, skinTypeLabels, catalogProductPrice } from '../src/utils/catalogFilters.mjs'

const products = [
  { id: 1, marca: 'Marca A', tipos_piel: ['Seca', 'Sensible'], necesidades: ['Hidratación'], precio_clp: 15000, stock: 3 },
  { id: 2, marca: 'Marca A', tipos_piel: ['Grasa'], necesidades: ['Limpieza'], precio_clp: 30000, stock: 0 },
  { id: 3, marca: 'Marca A', nombre: 'Crema piel seca hidratante', precio_clp: 12000, stock: 5 },
  { id: 4, marca: 'Marca B', tipos_piel: [' seca '], necesidades: ['hidratacion'], precio_clp: 16000, stock: 1 },
]

test('attribute options use only explicit labels and deduplicate accents/case/spacing', () => {
  assert.deepEqual(attributeOptions(products, 'tipos_piel'), [
    { value: 'grasa', label: 'Grasa' }, { value: 'seca', label: 'Seca' }, { value: 'sensible', label: 'Sensible' },
  ])
  assert.deepEqual(attributeLabels([' Hidratación ', 'hidratacion', '', null, '  Doble   limpieza']), ['Hidratación', 'Doble limpieza'])
  assert.deepEqual(attributeOptions([{ marca: 'Marca A' }], 'tipos_piel'), [])
})

test('skin and need intersect without inferring from brand or product descriptions', () => {
  assert.deepEqual(products.filter(p => matchesProductAttributes(p, 'seca', 'hidratacion')).map(p => p.id), [1, 4])
  assert.deepEqual(products.filter(p => matchesProductAttributes(p, 'sensible', 'limpieza')), [])
  assert.equal(matchesProductAttributes(products[2], 'seca'), false)
  assert.equal(matchesProductAttributes(products[2]), true)
  assert.equal(matchesProductAttributes({ tipos_piel: 'Seca' }, 'seca'), false)
  assert.equal(matchesProductAttributes(products[0], 'no-existe'), false)
})

test('existing brand, stock and price filters combine with explicit attributes', () => {
  const result = products.filter(p => matchesProductAttributes(p, 'seca', 'hidratacion')
    && p.marca === 'Marca A' && p.stock > 0 && matchesPriceFilter(p.precio_clp, 'under-15000'))
  assert.deepEqual(result.map(p => p.id), [1])
})

test('price bands preserve inclusive upper boundaries without gaps', () => {
  const bands = ['under-15000', '15000-30000', '30000-50000', 'over-50000']
  for (const [price, expected] of [[0, 0], [15000, 0], [15001, 1], [30000, 1], [30001, 2], [50000, 2], [50001, 3]]) {
    assert.deepEqual(bands.map(band => matchesPriceFilter(price, band)), bands.map((_, index) => index === expected))
  }
})

test('saved unknown labels stay selected and do not silently broaden results', () => {
  const options = attributeFilterOptions(products, 'tipos_piel', 'retirada', 'Todas')
  assert.equal(options.at(-1).value, 'retirada')
  assert.equal(products.filter(p => matchesProductAttributes(p, 'retirada')).length, 0)
  assert.equal(attributeFilterOptions(products, 'tipos_piel', 'seca', 'Todas').filter(o => o.value === 'seca').length, 1)
})

test('skin taxonomy is selectable before labeling, without assigning labels to products', () => {
  const untagged = [{ marca: 'Marca A', nombre: 'Crema' }]
  const options = attributeFilterOptions(untagged, 'tipos_piel', 'all', 'Todas')
  assert.equal(options.length, skinTypeLabels.length + 1)
  assert(options.some(option => option.value === 'seca'))
  assert.deepEqual(untagged.filter(product => matchesProductAttributes(product, 'seca')), [])
  assert.equal(untagged[0].tipos_piel, undefined)
})

test('universal skin label matches ordinary skin types but never implies sensitive skin', () => {
  const universal = { tipos_piel: ['Todo tipo de piel'] }
  for (const skin of ['normal', 'seca', 'mixta', 'grasa']) assert.equal(matchesProductAttributes(universal, skin), true)
  assert.equal(matchesProductAttributes(universal, 'sensible'), false)
  assert.equal(matchesProductAttributes({ tipos_piel: ['Todo tipo de piel', 'Sensible'] }, 'sensible'), true)
  assert.equal(matchesProductAttributes({}, 'seca'), false)
  assert.equal(matchesProductAttributes(universal, 'otra etiqueta'), false)
  assert.equal(matchesProductAttributes(universal, 'todo tipo de piel'), true)
  assert.equal(matchesProductAttributes({ tipos_piel: ['Seca'] }, 'todo tipo de piel'), false)
})

test('price filtering uses the same minimum variant price as product cards', () => {
  const product = { precio_clp: 40000, usa_tonos: true, tonos: ['A', 'B'], variant_meta: { A: { precio_clp: 12000 }, B: { precio_clp: 35000 } } }
  assert.equal(catalogProductPrice(product), 12000)
  assert.equal(matchesPriceFilter(catalogProductPrice(product), 'under-15000'), true)
  assert.equal(matchesPriceFilter(catalogProductPrice(product), '30000-50000'), false)
  assert.equal(catalogProductPrice({ ...product, usa_tonos: false }), 40000)
  assert.equal(catalogProductPrice({ ...product, tonos: [] }), 40000)
  assert.equal(catalogProductPrice({ ...product, variant_meta: { A: { precio_clp: -1 } } }), 40000)
  assert.equal(catalogProductPrice({ ...product, variant_meta: { A: { precio_clp: 50000 } } }), 40000)
})
