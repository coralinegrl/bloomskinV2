<template>
  <main class="order-page">
    <RouterLink to="/" class="brand">bloomskin</RouterLink>
    <p v-if="loading" role="status">Cargando tu pedido…</p>
    <section v-else-if="error" role="alert"><h1>No pudimos abrir tu pedido</h1><p>{{ error }}</p><button @click="loadOrder">Reintentar</button><RouterLink to="/mi-cuenta">Mi cuenta</RouterLink></section>
    <template v-else-if="order">
      <header><span>Tu compra</span><h1>{{ order.codigo }}</h1><p class="order-state">{{ statusLabels[order.estado] || order.estado }}</p></header>
      <p>Hola {{ order.cliente_nombre }}. Este enlace es privado y permite consultar tu pedido.</p>
      <article v-for="(item, index) in order.items" :key="index" class="order-item"><img v-if="item.imagen_url" :src="item.imagen_url" :alt="item.nombre"><div><strong>{{ item.nombre }}</strong><p v-if="item.tono_seleccionado">{{ item.tono_seleccionado }}</p><span>{{ item.cantidad }} × {{ money(item.precio_unitario_clp) }}</span></div></article>
      <dl><dt>Subtotal</dt><dd>{{ money(order.subtotal_clp) }}</dd><dt v-if="order.descuento_clp">Descuento</dt><dd v-if="order.descuento_clp">−{{ money(order.descuento_clp) }}</dd><dt>Despacho / retiro</dt><dd>{{ money(order.envio_clp) }}</dd><dt>Total</dt><dd><strong>{{ money(order.total_clp) }}</strong></dd></dl>
      <p>{{ order.direccion_envio }}</p>
      <OrderTracking :tracking="order.fulfillment" />
      <ReorderButton v-if="['paid','shipped','delivered'].includes(order.estado)" :items="order.items" />
      <section v-if="canPay" class="payment-section">
        <h2>{{ order.metodo_pago === 'flow' ? 'Completa tu pago con Flow' : 'Pago por transferencia' }}</h2>
        <p>Plazo para completar el pago: {{ deadline }}. Después de ese plazo se libera la reserva.</p>
        <template v-if="order.metodo_pago === 'flow'">
          <p>Paga con débito, crédito u otro medio disponible en Flow. El pago se abre en otra pestaña y tu pedido se actualiza al volver.</p>
          <a v-if="flowUrl" :href="flowUrl" target="_blank" rel="noopener noreferrer" class="flow-link" @click="feedback = 'Completa el pago en la pestaña de Flow. No vuelvas a pagar si ya recibiste un cargo.'">Abrir Flow en otra pestaña</a>
          <button v-else :disabled="busy" @click="payFlow">{{ busy ? 'Preparando…' : 'Pagar con Flow' }}</button>
        </template>
        <template v-else>
          <dl><dt>Banco</dt><dd>{{ order.transfer.bank_name }}</dd><dt>Tipo</dt><dd>{{ order.transfer.account_type }}</dd><dt>Cuenta</dt><dd>{{ order.transfer.account_number }}</dd><dt>Titular</dt><dd>{{ order.transfer.account_holder }}</dd><dt>RUT</dt><dd>{{ order.transfer.account_rut }}</dd><dt>Referencia</dt><dd>{{ order.codigo }}</dd></dl>
          <button @click="copyTransfer">Copiar datos de transferencia</button>
          <label class="proof-label">Comprobante de pago<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/bmp,image/tiff" :disabled="busy" @change="selectProof"></label>
          <button :disabled="!proof || busy" @click="uploadProof">{{ busy ? 'Subiendo…' : 'Enviar comprobante' }}</button>
        </template>
      </section>
      <p v-if="feedback" role="status">{{ feedback }}</p>
      <p v-if="!canPay && order.estado === 'pending_payment'">El plazo venció. Actualiza el estado del pedido antes de realizar un pago.</p>
      <div class="order-actions"><button @click="loadOrder">Actualizar estado</button><RouterLink to="/catalogo">Seguir comprando</RouterLink><button v-if="!customerAuth.isAuthenticated" @click="ui.openAuthModal('register')">Crear mi cuenta</button></div>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import OrderTracking from '../components/store/OrderTracking.vue'
import ReorderButton from '../components/store/ReorderButton.vue'
import { useRoute, RouterLink } from 'vue-router'
import { checkoutSessionApi, pedidosApi } from '../api/index.js'
import { useUiStore } from '../stores/ui.js'
import { useCustomerAuthStore } from '../stores/customerAuth.js'
import { reserveFlowTab, navigateFlowTab, closeFlowTab, flowPaymentUrl } from '../utils/flowPayment.mjs'
const route = useRoute(), ui = useUiStore(), customerAuth = useCustomerAuthStore()
const order = ref(null), loading = ref(true), error = ref(''), busy = ref(false), proof = ref(null), feedback = ref('')
const flowUrl = ref(''), now = ref(Date.now())
let refreshTimer = null, loadInProgress = false
if (route.query.flow === 'opened') feedback.value = 'Flow se abrió en otra pestaña. Completa el pago allí; tu pedido seguirá disponible aquí.'
if (route.query.flow === 'pending') feedback.value = 'Tu pedido ya está creado. Pulsa Pagar con Flow para abrir el pago en otra pestaña.'
const token = ref('')
const statusLabels = { pending_payment: 'Pendiente de pago', payment_submitted: 'Comprobante en revisión', paid: 'Pago confirmado', shipped: 'Despachado / listo para retiro', delivered: 'Entregado', cancelled: 'Cancelado' }
const canPay = computed(() => order.value?.estado === 'pending_payment' && new Date(order.value.comprobante_limite_en).getTime() > now.value)
const deadline = computed(() => new Date(order.value.comprobante_limite_en).toLocaleString('es-CL'))
const money = value => '$' + Number(value || 0).toLocaleString('es-CL')
async function loadOrder(options = {}) {
  if (loadInProgress) return
  const silent = options.silent === true
  loadInProgress = true
  if (!silent) { loading.value = true; error.value = '' }
  try {
    const fromLink = new URLSearchParams(route.hash.slice(1)).get('access')
    if (fromLink) { token.value = fromLink; sessionStorage.setItem(`bs_order_${route.params.id}`, fromLink); history.replaceState(history.state, '', route.path) }
    token.value ||= sessionStorage.getItem(`bs_order_${route.params.id}`) || customerAuth.token || ''
    if (!token.value) throw new Error('Abre el enlace privado del correo de confirmación o inicia sesión con la cuenta de tu compra.')
    order.value = (await checkoutSessionApi.pedido(route.params.id, token.value)).data
    now.value = Date.now()
    if (order.value.metodo_pago === 'flow' && order.value.estado !== 'pending_payment') { flowUrl.value = ''; feedback.value = '' }
  } catch (err) { if (!silent) error.value = err.response?.data?.error || err.message || 'El enlace no es válido o venció.' }
  finally { loading.value = false; loadInProgress = false }
}
function selectProof(event) {
  feedback.value = ''; proof.value = null
  const file = event.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024 || !/\.(jpe?g|png|webp|heic|heif|bmp|tiff?)$/i.test(file.name) || !/^image\//.test(file.type) || file.type === 'image/gif') { feedback.value = 'Adjunta una imagen sin animación de hasta 5 MB.'; return }
  proof.value = file
}
async function uploadProof() {
  busy.value = true
  try { await pedidosApi.subirComprobante({ pedidoId: order.value.id, file: proof.value, token: token.value }); feedback.value = 'Comprobante recibido. Te avisaremos al validar el pago.'; proof.value = null; await loadOrder() }
  catch (err) { feedback.value = err.response?.data?.error || 'No pudimos subir el comprobante.' }
  finally { busy.value = false }
}
async function payFlow() {
  if (busy.value) return
  const tab = reserveFlowTab()
  let opened = false
  busy.value = true
  feedback.value = ''
  try {
    const { data } = await checkoutSessionApi.pagarFlow(order.value.id, token.value)
    flowUrl.value = flowPaymentUrl(data.url)
    opened = navigateFlowTab(tab, flowUrl.value)
    feedback.value = opened
      ? 'Flow se abrió en otra pestaña. No vuelvas a pagar si ya recibiste un cargo.'
      : 'No pudimos abrir la pestaña. Usa el enlace Abrir Flow en otra pestaña para continuar con este mismo pedido.'
  }
  catch (err) { feedback.value = err.response?.data?.error || 'No pudimos abrir Flow. No vuelvas a pagar si ya recibiste un cargo.' }
  finally { if (!opened) closeFlowTab(tab); busy.value = false }
}
async function copyTransfer() {
  try { await navigator.clipboard.writeText([order.value.transfer.bank_name, order.value.transfer.account_type, order.value.transfer.account_number, order.value.transfer.account_holder, order.value.transfer.account_rut, order.value.codigo, money(order.value.total_clp)].join('\n')); feedback.value = 'Datos copiados.' }
  catch { feedback.value = 'No pudimos copiar los datos. Puedes seleccionarlos en el resumen.' }
}
function refreshOrder() {
  now.value = Date.now()
  if (document.visibilityState === 'visible' && order.value?.estado === 'pending_payment' && !busy.value) loadOrder({ silent: true })
}
onMounted(() => {
  loadOrder()
  window.addEventListener('focus', refreshOrder)
  document.addEventListener('visibilitychange', refreshOrder)
  refreshTimer = window.setInterval(refreshOrder, 15000)
})
onBeforeUnmount(() => {
  window.removeEventListener('focus', refreshOrder)
  document.removeEventListener('visibilitychange', refreshOrder)
  window.clearInterval(refreshTimer)
})
</script>

<style scoped>
.order-page { width: min(720px, 100%); margin: auto; padding: 24px 20px 60px; font-size: 16px; }
.brand { font-family: Georgia, serif; font-size: 30px; color: var(--rose-dark); }
header { padding: 28px 0 12px; } h1 { font-size: 32px; } h2 { font-size: 22px; margin-bottom: 12px; }
.order-state { color: var(--rose-dark); font-weight: 600; } p { margin: 12px 0; overflow-wrap: anywhere; }
.order-item { display: flex; align-items: center; gap: 16px; padding: 18px 0; border-bottom: 1px solid var(--line-soft); }
.order-item img { width: 72px; height: 84px; object-fit: contain; } .order-item div { min-width: 0; }
.order-item strong { display: block; margin-bottom: 6px; }
.order-item span { display: block; font-size: 14px; }
dl { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; margin: 24px 0; } dd { text-align: right; overflow-wrap: anywhere; }
button, .order-actions a, .flow-link { min-height: 44px; padding: 12px 16px; background: white; border: 1px solid var(--line-soft); border-radius: 6px; color: var(--dark); font-size: 16px; }
.flow-link { display: inline-flex; align-items: center; }
button:disabled { opacity: .5; } .payment-section { border-top: 1px solid var(--line-soft); padding-top: 24px; }
.proof-label { display: grid; gap: 12px; margin: 24px 0; } input { width: 100%; font-size: 16px; }
.order-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
</style>
