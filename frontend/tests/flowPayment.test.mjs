import test from 'node:test'
import assert from 'node:assert/strict'
import { reserveFlowTab, navigateFlowTab, closeFlowTab, flowPaymentUrl } from '../src/utils/flowPayment.mjs'

function mockTab() {
  return { opener: {}, closed: false, document: { title: '', body: {} },
    location: { replace(url) { this.url = url } }, close() { this.closed = true } }
}

test('reserves a detached tab synchronously before the payment request', () => {
  const tab = mockTab()
  assert.equal(reserveFlowTab({ open(url, target) {
    assert.equal(url, 'about:blank'); assert.equal(target, '_blank'); return tab
  } }), tab)
  assert.equal(tab.opener, null)
  assert.match(tab.document.title, /Bloomskin/)
  assert.equal(navigateFlowTab(tab, 'https://www.flow.cl/app/web/pay.php?token=test'), true)
  assert.equal(tab.location.url, 'https://www.flow.cl/app/web/pay.php?token=test')
})

test('blocked, closed or unavailable tabs allow manual continuation', () => {
  assert.equal(reserveFlowTab({ open: () => null }), null)
  assert.equal(reserveFlowTab({ open: () => { throw new Error('blocked') } }), null)
  assert.equal(navigateFlowTab(null, 'https://www.flow.cl/pay'), false)
  const tab = mockTab(); closeFlowTab(tab)
  assert.equal(navigateFlowTab(tab, 'https://www.flow.cl/pay'), false)
  closeFlowTab(null)
})

test('failed navigation closes only the unused tab', () => {
  const tab = mockTab()
  tab.location.replace = () => { throw new Error('closed') }
  assert.equal(navigateFlowTab(tab, 'https://www.flow.cl/pay'), false)
  assert.equal(tab.closed, true)
})

test('only HTTPS Flow links without credentials or nonstandard ports are accepted', () => {
  assert.equal(flowPaymentUrl('https://sandbox.flow.cl/pay'), 'https://sandbox.flow.cl/pay')
  for (const url of ['https://flow.cl.evil.test/pay', 'http://flow.cl/pay', 'javascript:alert(1)',
    'https://evilflow.cl/pay', 'https://flow.cl:8443/pay', 'https://user:secret@flow.cl/pay', '/pay']) {
    assert.throws(() => flowPaymentUrl(url))
  }
})
