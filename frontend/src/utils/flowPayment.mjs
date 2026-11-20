export function reserveFlowTab(browser = window) {
  let tab = null
  try {
    // Open during the click, before network requests consume user activation.
    tab = browser.open('about:blank', '_blank')
    if (tab) {
      tab.opener = null
      tab.document.title = 'Bloomskin - Preparando pago'
      tab.document.body.textContent = 'Estamos preparando tu pago seguro con Flow...'
    }
    return tab
  } catch {
    closeFlowTab(tab)
    return null
  }
}

export function flowPaymentUrl(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.port || url.username || url.password ||
      !(url.hostname === 'flow.cl' || url.hostname.endsWith('.flow.cl'))) {
    throw new Error('El enlace de pago de Flow no es valido.')
  }
  return url.href
}

export function navigateFlowTab(tab, value) {
  const url = flowPaymentUrl(value)
  if (!tab || tab.closed) return false
  try {
    tab.location.replace(url)
    return true
  } catch {
    closeFlowTab(tab)
    return false
  }
}

export function closeFlowTab(tab) {
  try { if (tab && !tab.closed) tab.close() } catch { /* The browser may have detached the tab. */ }
}
