import axios from 'axios'
import {isContentPreview} from '../utils/contentPreview.js'

const adminUnauthorizedEvent = 'bloomskin:admin-unauthorized'
const clientUnauthorizedEvent = 'bloomskin:client-unauthorized'
const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '/api').trim()
const apiOrigin = apiBaseUrl.startsWith('http')
  ? apiBaseUrl.replace(/\/api\/?$/, '')
  : ''

const publicApi = axios.create({ baseURL: apiBaseUrl, timeout: 10000 })
publicApi.interceptors.response.use(response=>{
  if(isContentPreview && ['/settings/site','/settings/home'].includes(response.config.url)){
    try{const preview=JSON.parse(sessionStorage.getItem('bs_content_preview'));if(preview)response.data=response.config.url==='/settings/home' ? preview.home : preview}catch{}
  }
  return response
})
const adminApi = axios.create({ baseURL: apiBaseUrl, timeout: 10000 })
const clientApi = axios.create({ baseURL: apiBaseUrl, timeout: 10000 })
const checkoutApi = axios.create({ baseURL: apiBaseUrl, timeout: 15000 })
checkoutApi.interceptors.request.use(config => {
  const token = localStorage.getItem('bs_client_token') || sessionStorage.getItem('bs_checkout_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
export const checkoutSessionApi = {
  config: () => publicApi.get('/flow/config'),
  crear: data => checkoutApi.post('/checkout/session', data),
  pedido: (id, token) => publicApi.get(`/pedidos/${id}/access`, { headers: { Authorization: `Bearer ${token}` } }),
  pagarFlow: (id, token) => publicApi.post(`/flow/${id}/create`, {}, { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 }),
}

adminApi.interceptors.request.use(config => {
  const token = localStorage.getItem('bs_admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

clientApi.interceptors.request.use(config => {
  const token = localStorage.getItem('bs_client_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

adminApi.interceptors.response.use(res => res, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('bs_admin_token')
    localStorage.removeItem('bs_admin_user')
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(adminUnauthorizedEvent))
    }
  }
  return Promise.reject(err)
})

clientApi.interceptors.response.use(res => res, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('bs_client_token')
    localStorage.removeItem('bs_client_user')
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(clientUnauthorizedEvent))
    }
  }
  return Promise.reject(err)
})

export const adminAuthApi = {
  login: (email, password) => publicApi.post('/auth/admin/login', { email, password }),
  me: () => adminApi.get('/auth/admin/me'),
}

export const clientAuthApi = {
  register: (payload) => publicApi.post('/auth/client/register', payload),
  login: (email, password) => publicApi.post('/auth/client/login', { email, password }),
  requestPasswordReset: email => publicApi.post('/auth/client/request-password-reset', { email }, { timeout: 20000 }),
  resetPassword: payload => publicApi.post('/auth/client/reset-password', payload),
  me: () => clientApi.get('/auth/client/me'),
}

export const productosApi = {
  listar: () => publicApi.get('/productos'),
  obtener: id => publicApi.get(`/productos/${id}`),
  listarAdmin: () => adminApi.get('/productos/admin'),
  obtenerCatalogoJson: () => adminApi.get('/productos/catalogo-json'),
  guardarCatalogoJson: products => adminApi.put('/productos/catalogo-json', { products }),
  importarCatalogoJson: products => adminApi.post('/productos/catalogo-json/import', products ? { products } : {}),
  subirImagen: file => {
    const formData = new FormData()
    formData.append('image', file)
    return adminApi.post('/productos/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  analizarImagen: file => {
    const formData = new FormData()
    formData.append('image', file)
    return adminApi.post('/productos/scan-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    })
  },
  crear: data => adminApi.post('/productos', data),
  actualizar: (id, data) => adminApi.put(`/productos/${id}`, data),
  agregarEtiquetas: data => adminApi.patch('/productos/atributos', data),
  eliminar: id => adminApi.delete(`/productos/${id}`),
  actualizarStock: (id, stock, expected_stock) => adminApi.patch(`/productos/${id}/stock`, { stock, expected_stock }),
  calcularPrecio: usd => adminApi.get(`/productos/utils/calcular-precio?usd=${usd}`),
}

export const pedidosApi = {
  listar: () => adminApi.get('/pedidos'),
  stats: () => adminApi.get('/pedidos/stats'),
  exportarMensual: month => adminApi.get(`/pedidos/export/monthly?month=${encodeURIComponent(month)}`, { responseType: 'blob' }),
  crearManual: data => adminApi.post('/pedidos/manual', data),
  mine: () => clientApi.get('/pedidos/mine'),
  reservaActual: () => checkoutApi.get('/pedidos/reservation/current'),
  reservarCheckout: items => checkoutApi.post('/pedidos/reservation', { items }),
  liberarReserva: () => checkoutApi.delete('/pedidos/reservation/current'),
  paymentConfig: () => publicApi.get('/pedidos/payment-config'),
  quoteShipping: payload => publicApi.post('/pedidos/shipping-quote', payload),
  crearCliente: data => checkoutApi.post('/pedidos', data),
  subirComprobante: ({ pedidoId, file, email, codigo, token }) => {
    const formData = new FormData()
    formData.append('comprobante', file)
    if (email) formData.append('email', email)
    if (codigo) formData.append('codigo', codigo)
    return publicApi.post(`/pedidos/${pedidoId}/comprobante`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  },
  cambiarEstado: (id, estado) => adminApi.patch(`/pedidos/${id}/estado`, { estado }),
  eliminar: id => adminApi.delete(`/pedidos/${id}`),
}

export const reviewsApi = {
  home: (limit = 6) => publicApi.get(`/resenas/home?limit=${encodeURIComponent(limit)}`),
  product: id => publicApi.get(`/resenas/product/${id}`),
  mine: () => clientApi.get('/resenas/mine'),
  guardar: payload => clientApi.post('/resenas', payload),
}

export const descuentosApi = {
  listar: () => adminApi.get('/descuentos'),
  validar: payload => publicApi.post('/descuentos/validate', payload),
  crear: data => adminApi.post('/descuentos', data),
  actualizar: (id, data) => adminApi.put(`/descuentos/${id}`, data),
  eliminar: id => adminApi.delete(`/descuentos/${id}`),
}

export const clientesApi = {
  listar: () => adminApi.get('/clientes'),
  actualizar: (id, data) => adminApi.put(`/clientes/${id}`, data),
  eliminar: id => adminApi.delete(`/clientes/${id}`),
  actualizarPerfil: data => clientApi.put('/clientes/me/profile', data),
  wishlist: () => clientApi.get('/clientes/me/wishlist'),
  agregarWishlist: productoId => clientApi.post('/clientes/me/wishlist', { producto_id: productoId }),
  quitarWishlist: productoId => clientApi.delete(`/clientes/me/wishlist/${productoId}`),
}

export const settingsApi = {
  site: () => publicApi.get('/settings/site'),
  guardarSite: payload => adminApi.put('/settings/site', payload),
  home: () => publicApi.get('/settings/home'),
  guardarHome: payload => adminApi.put('/settings/home', payload),
}

export const managementApi = {
  inventory: () => adminApi.get('/management/inventory'),
  inventoryHistory: id => adminApi.get('/management/inventory/history', { params: id ? { producto_id:id } : {} }),
  adjustInventory: data => adminApi.post('/management/inventory/adjust', data),
  fulfillment: id => adminApi.get(`/management/orders/${id}/fulfillment`),
  saveFulfillment: (id,data) => adminApi.put(`/management/orders/${id}/fulfillment`, data),
  activity: () => adminApi.get('/management/activity'),
  revisions: () => adminApi.get('/management/revisions'),
  revision: id => adminApi.get(`/management/revisions/${id}`),
  restoreRevision: id => adminApi.post(`/management/revisions/${id}/restore`),
  backups: () => adminApi.get('/management/backups'),
  createBackup: () => adminApi.post('/management/backups'),
  downloadBackup: id => adminApi.get(`/management/backups/${id}/download`, { responseType:'blob', timeout:60000 }),
  mail: () => adminApi.get('/management/mail'),
  saveMail: data => adminApi.put('/management/mail', data),
  previewMail: data => adminApi.post('/management/mail/preview', data),
  retryMail: id => adminApi.post(`/management/mail/${id}/retry`, {}, { timeout:25000 }),
}
export const restockApi = { subscribe: data => publicApi.post('/restock',data) }

export const mensajesApi = {
  emailStatus: () => adminApi.get('/mensajes/email/status', { timeout: 15000 }),
  testEmail: email => adminApi.post('/mensajes/email/test', { email }, { timeout: 20000 }),
  saveOrderNotifications: data => adminApi.put('/mensajes/email/notifications', data),
  listar: () => adminApi.get('/mensajes'),
  listarSuscriptores: () => adminApi.get('/mensajes/suscriptores'),
  enviar: data => publicApi.post('/mensajes', data),
  marcarLeido: id => adminApi.patch(`/mensajes/${id}/leido`),
  marcarRespondido: id => adminApi.patch(`/mensajes/${id}/respondido`),
  suscribir: email => publicApi.post('/mensajes/suscribir', { email }),
  enviarNewsletter: payload => adminApi.post('/mensajes/newsletter/enviar', payload),
}

export const newsApi = {
  kbeauty: () => publicApi.get('/news/kbeauty'),
}

export function resolveAssetUrl(path) {
  if (!path) return '#'
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (apiOrigin) return `${apiOrigin}${path}`
  return path
}

export { adminApi, clientApi, publicApi, adminUnauthorizedEvent, clientUnauthorizedEvent }
