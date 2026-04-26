<template>
  <div class="account-page">
    <section class="account-hero">
      <RouterLink to="/" class="back-link">Volver a la tienda</RouterLink>
      <div class="hero-grid">
        <div>
          <div class="eyebrow">Mi cuenta</div>
          <h1>{{ customerAuth.user?.nombre || 'Tu cuenta Bloomskin' }}</h1>
          <p>
            Revisa tus datos, mantén tu perfil al día, guarda favoritos y sigue el estado de cada compra.
          </p>
        </div>
        <div class="hero-card">
          <span>Cuenta activa</span>
          <strong>{{ customerAuth.user?.email }}</strong>
          <button class="ghost-btn" @click="logout">Cerrar sesión</button>
        </div>
      </div>
    </section>

    <section class="account-layout">
      <article class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-tag">Perfil</div>
            <h2>Tus datos</h2>
          </div>
          <button class="save-btn" :disabled="saving" @click="saveProfile">
            {{ saving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>

        <div class="form-grid">
          <label>
            <span>Nombre completo</span>
            <input v-model.trim="profileForm.nombre" type="text" :disabled="saving" />
            <small v-if="fieldErrors.nombre" class="field-error">{{ fieldErrors.nombre }}</small>
          </label>
          <label>
            <span>Email</span>
            <input :value="customerAuth.user?.email || ''" type="email" disabled />
          </label>
          <label>
            <span>RUT</span>
            <input :value="profileForm.rut" type="text" :disabled="saving" @input="profileForm.rut = formatRutInput($event.target.value)" />
            <small v-if="fieldErrors.rut" class="field-error">{{ fieldErrors.rut }}</small>
          </label>
          <label>
            <span>Teléfono</span>
            <input :value="profileForm.telefono" type="text" :disabled="saving" @input="profileForm.telefono = formatPhoneInput($event.target.value)" />
            <small v-if="fieldErrors.telefono" class="field-error">{{ fieldErrors.telefono }}</small>
          </label>
          <label>
            <span>Calle</span>
            <input v-model.trim="profileForm.street" type="text" :disabled="saving" />
            <small v-if="fieldErrors.direccion" class="field-error">{{ fieldErrors.direccion }}</small>
          </label>
          <label>
            <span>Número</span>
            <input v-model.trim="profileForm.number" type="text" :disabled="saving" />
          </label>
          <label>
            <span>Depto / Oficina</span>
            <input v-model.trim="profileForm.apartment" type="text" :disabled="saving" />
          </label>
          <label>
            <span>Comuna / Ciudad</span>
            <input v-model.trim="profileForm.city" type="text" :disabled="saving" />
            <small v-if="fieldErrors.ciudad" class="field-error">{{ fieldErrors.ciudad }}</small>
          </label>
          <label class="full-span">
            <span>Región</span>
            <select v-model="profileForm.region" :disabled="saving">
              <option value="">Selecciona una región</option>
              <option v-for="region in CHILE_REGIONS" :key="region" :value="region">{{ region }}</option>
            </select>
            <small v-if="fieldErrors.region" class="field-error">{{ fieldErrors.region }}</small>
          </label>
          <label class="full-span">
            <span>Tipo de piel</span>
            <input v-model.trim="profileForm.tipo_piel" type="text" :disabled="saving" placeholder="Seca, mixta, sensible..." />
          </label>
        </div>
      </article>

      <aside class="summary-stack">
        <article class="summary-card">
          <span>Pedidos</span>
          <strong>{{ orders.length }}</strong>
          <small>{{ orders.length ? 'Tu historial está disponible más abajo.' : 'Todavía no tienes compras registradas.' }}</small>
        </article>
        <article class="summary-card">
          <span>Favoritos</span>
          <strong>{{ wishlist.count }}</strong>
          <small>{{ wishlist.count ? 'Tus productos guardados están disponibles más abajo.' : 'Guarda productos con el corazón para verlos aquí.' }}</small>
        </article>
        <article class="summary-card">
          <span>Última compra</span>
          <strong>{{ latestOrderLabel }}</strong>
          <small>{{ latestOrderAmount }}</small>
        </article>
      </aside>
    </section>

    <section id="favoritos" class="orders-section">
      <div class="orders-head">
        <div>
          <div class="panel-tag">Favoritos</div>
          <h2>Tu lista de deseos</h2>
        </div>
        <button class="ghost-btn" :disabled="wishlist.loading" @click="loadWishlist">
          {{ wishlist.loading ? 'Actualizando...' : 'Actualizar' }}
        </button>
      </div>

      <div v-if="wishlist.loading" class="orders-state">
        Cargando tus favoritos...
      </div>

      <div v-else-if="wishlist.items.length === 0" class="orders-empty">
        <p>Todavía no has guardado productos.</p>
        <RouterLink to="/" class="shop-link">Ir a comprar</RouterLink>
      </div>

      <div v-else class="wishlist-grid">
        <ProductCard v-for="product in wishlist.items" :key="`wishlist-${product.id}`" :producto="product" />
      </div>
    </section>

    <section id="mis-pedidos" class="orders-section">
      <div class="orders-head">
        <div>
          <div class="panel-tag">Historial</div>
          <h2>Tus pedidos</h2>
        </div>
        <button class="ghost-btn" :disabled="ordersLoading" @click="loadOrders">
          {{ ordersLoading ? 'Actualizando...' : 'Actualizar' }}
        </button>
      </div>

      <div v-if="ordersLoading" class="orders-state">
        Cargando tus pedidos...
      </div>

      <div v-else-if="orders.length === 0" class="orders-empty">
        <p>Todavía no tienes compras registradas.</p>
        <RouterLink to="/" class="shop-link">Ir a comprar</RouterLink>
      </div>

      <div v-else class="orders-list">
        <article v-for="order in orders" :key="order.id" class="order-card">
          <div class="order-top">
            <div>
              <div class="order-code">{{ order.codigo }}</div>
              <div class="order-date">{{ formatDate(order.creado_en) }}</div>
            </div>
            <div class="order-summary">
              <span class="status-pill" :class="`status-${order.estado}`">{{ formatStatus(order.estado) }}</span>
              <strong>{{ formatCurrency(order.total_clp) }}</strong>
            </div>
          </div>

          <div class="order-meta">
            <div>
              <span>Método de envío</span>
              <strong>{{ formatShippingMethod(order.metodo_envio) }}</strong>
            </div>
            <div>
              <span>Despacho</span>
              <strong>{{ order.direccion_envio }}, {{ order.ciudad_envio }}, {{ order.region_envio }}</strong>
            </div>
          </div>

          <div v-if="order.estado !== 'cancelled'" class="timeline">
            <div
              v-for="step in getOrderTimeline(order.estado)"
              :key="`${order.id}-${step.key}`"
              class="timeline-step"
              :class="{ done: step.state === 'done', current: step.state === 'current' }"
            >
              <div class="timeline-dot-wrap">
                <div class="timeline-dot"></div>
                <div class="timeline-line"></div>
              </div>
              <div class="timeline-copy">
                <strong>{{ step.label }}</strong>
                <small>{{ step.helper }}</small>
              </div>
            </div>
          </div>

          <div v-else class="cancelled-box">
            Este pedido fue cancelado. Si necesitas ayuda, escríbenos por WhatsApp o correo.
          </div>

          <ul class="order-items">
            <li v-for="item in order.items" :key="`${order.id}-${item.producto_nombre}-${item.tono_seleccionado || 'base'}`">
              <span>
                {{ item.producto_marca }} · {{ item.producto_nombre }}
                <template v-if="item.tono_seleccionado"> · Tipo: {{ item.tono_seleccionado }}</template>
              </span>
              <span>x{{ item.cantidad }} · {{ formatCurrency(item.precio_unitario_clp) }}</span>
            </li>
          </ul>

          <div class="order-financials">
            <span>Subtotal: {{ formatCurrency(order.subtotal_clp) }}</span>
            <span v-if="order.descuento_clp">Descuento: -{{ formatCurrency(order.descuento_clp) }}<template v-if="order.descuento_codigo"> con {{ order.descuento_codigo }}</template></span>
            <span>Envío: {{ formatCurrency(order.envio_clp) }}</span>
            <span>Total: {{ formatCurrency(order.total_clp) }}</span>
          </div>

          <a v-if="order.comprobante_url" :href="absoluteAssetUrl(order.comprobante_url)" target="_blank" rel="noreferrer" class="proof-link">
            Ver comprobante subido
          </a>

          <p v-if="order.notas" class="order-notes">Notas: {{ order.notas }}</p>
        </article>
      </div>
    </section>

    <StoreFooter />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { pedidosApi, resolveAssetUrl } from '../api/index.js'
import ProductCard from '../components/store/ProductCard.vue'
import StoreFooter from '../components/store/StoreFooter.vue'
import { useCustomerAuthStore } from '../stores/customerAuth.js'
import { useUiStore } from '../stores/ui.js'
import { useWishlistStore } from '../stores/wishlist.js'
import { validateCustomerProfile } from '../utils/validation.js'
import { buildApiCustomerPayload, buildProfileForm, CHILE_REGIONS, formatPhoneInput, formatRutInput } from '../utils/customerFields.js'

const router = useRouter()
const customerAuth = useCustomerAuthStore()
const ui = useUiStore()
const wishlist = useWishlistStore()

const saving = ref(false)
const ordersLoading = ref(false)
const orders = ref([])
const profileForm = reactive(buildProfileForm(customerAuth.user))
const fieldErrors = reactive({
  nombre: '',
  rut: '',
  telefono: '',
  direccion: '',
  ciudad: '',
  region: '',
})

const timelineLabels = {
  created: { label: 'Pedido creado', helper: 'Tu compra ya quedó registrada en Bloomskin.' },
  pending_payment: { label: 'Esperando transferencia', helper: 'Realiza la transferencia con los datos del pedido.' },
  payment_submitted: { label: 'Comprobante recibido', helper: 'Tu comprobante está pendiente de revisión.' },
  paid: { label: 'Pago validado', helper: 'El pago ya fue confirmado por Bloomskin.' },
  shipped: { label: 'En preparación o enviado', helper: 'Estamos preparando o despachando tu pedido.' },
  delivered: { label: 'Entregado', helper: 'Tu pedido ya fue entregado o marcado como recibido.' },
}

const latestOrder = computed(() => orders.value[0] || null)
const latestOrderLabel = computed(() => latestOrder.value ? formatDate(latestOrder.value.creado_en) : 'Sin pedidos')
const latestOrderAmount = computed(() => latestOrder.value ? formatCurrency(latestOrder.value.total_clp) : 'Haz tu primera compra')

void Promise.all([loadOrders(), loadWishlist()])

watch(
  () => customerAuth.user,
  user => {
    Object.assign(profileForm, buildProfileForm(user))
  },
  { immediate: true }
)

async function loadOrders() {
  ordersLoading.value = true
  try {
    const { data } = await pedidosApi.mine()
    orders.value = data
  } catch (error) {
    console.error(error)
    ui.error(error.response?.data?.error || 'No pudimos cargar tu historial de pedidos.')
  } finally {
    ordersLoading.value = false
  }
}

async function loadWishlist() {
  await wishlist.load(customerAuth.user?.id)
}

async function saveProfile() {
  saving.value = true
  try {
    fieldErrors.nombre = ''
    fieldErrors.rut = ''
    fieldErrors.telefono = ''
    fieldErrors.direccion = ''
    fieldErrors.ciudad = ''
    fieldErrors.region = ''

    const payload = buildApiCustomerPayload({
      ...profileForm,
      email: customerAuth.user?.email || '',
    })
    const validation = validateCustomerProfile(payload, { requirePassword: false })
    if (validation.errors.length) {
      fieldErrors.nombre = validation.errors.find(msg => msg.startsWith('Nombre')) || ''
      fieldErrors.rut = validation.errors.find(msg => msg.startsWith('RUT')) || ''
      fieldErrors.telefono = validation.errors.find(msg => msg.startsWith('Teléfono')) || ''
      fieldErrors.direccion = validation.errors.find(msg => msg.startsWith('Dirección')) || ''
      fieldErrors.ciudad = validation.errors.find(msg => msg.startsWith('Ciudad')) || ''
      fieldErrors.region = validation.errors.find(msg => msg.startsWith('Región')) || ''
      ui.error(validation.errors[0])
      return
    }

    const ok = await customerAuth.updateProfile(validation.normalized)
    if (!ok) {
      ui.error(customerAuth.error || 'No pudimos guardar tus datos.')
      return
    }
    ui.success('Tu perfil se actualizó correctamente.')
  } finally {
    saving.value = false
  }
}

function logout() {
  customerAuth.logout()
  ui.info('Tu sesión se cerró correctamente.')
  router.push({ name: 'store' })
}

function formatCurrency(value) {
  return '$' + Number(value || 0).toLocaleString('es-CL')
}

function formatDate(value) {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatStatus(status) {
  const labels = {
    pending_payment: 'Esperando transferencia',
    payment_submitted: 'Comprobante recibido',
    paid: 'Pago validado',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  }
  return labels[status] || status
}

function formatShippingMethod(method) {
  const labels = {
    free_shipping: 'Envío gratis',
    blue_express: 'Blue Express',
    local_delivery: 'Despacho Bloomskin',
    store_pickup: 'Retiro coordinado',
  }
  return labels[method] || method || 'Por definir'
}

function getOrderTimeline(status) {
  const order = ['created', 'pending_payment', 'payment_submitted', 'paid', 'shipped', 'delivered']
  const activeMap = {
    pending_payment: 1,
    payment_submitted: 2,
    paid: 3,
    shipped: 4,
    delivered: 5,
  }
  const activeIndex = activeMap[status] ?? 1

  return order.map((key, index) => {
    let state = 'pending'
    if (index < activeIndex) state = 'done'
    if (index === activeIndex) state = 'current'
    return { key, state, ...timelineLabels[key] }
  })
}

function absoluteAssetUrl(path) {
  return resolveAssetUrl(path)
}
</script>

<style scoped>
.account-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fcf4f6 0%, #f7efef 30%, #fdfbf9 100%);
  color: var(--dark);
}

.account-hero,
.account-layout,
.orders-section {
  width: min(1120px, calc(100vw - 32px));
  margin: 0 auto;
}

.account-hero { padding: 36px 0 28px; }
.back-link {
  display: inline-flex;
  margin-bottom: 24px;
  color: var(--rose-dark);
  font-size: 12px;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.hero-grid,
.account-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 24px;
}

.eyebrow,
.panel-tag {
  font-size: 11px;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: var(--rose);
  font-weight: 600;
}

.account-hero h1,
.panel h2,
.orders-head h2 {
  margin-top: 10px;
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(34px, 4vw, 52px);
  line-height: 1;
}

.account-hero p {
  margin-top: 16px;
  max-width: 620px;
  color: var(--dark-mid);
  line-height: 1.8;
}

.hero-card,
.panel,
.summary-card,
.order-card {
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(191, 84, 122, 0.12);
  border-radius: 28px;
  box-shadow: 0 20px 50px rgba(139, 63, 85, 0.06);
}

.hero-card {
  padding: 28px;
  display: grid;
  gap: 14px;
  align-content: start;
}

.hero-card span,
.summary-card span,
.order-meta span {
  font-size: 11px;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.hero-card strong,
.summary-card strong {
  font-size: 20px;
  color: var(--rose-dark);
}

.ghost-btn,
.save-btn,
.shop-link,
.proof-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 11px 16px;
  font-size: 11px;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.ghost-btn,
.shop-link {
  border: 1px solid rgba(191, 84, 122, 0.2);
  color: var(--rose-dark);
  background: #fff;
}

.save-btn {
  border: none;
  background: var(--rose-dark);
  color: #fff;
}

.panel {
  padding: 28px;
}

.panel-head,
.orders-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.form-grid {
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.form-grid label {
  display: grid;
  gap: 8px;
}

.form-grid span {
  font-size: 11px;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--dark-mid);
}

.form-grid input,
.form-grid select {
  border-radius: 18px;
  border: 1px solid rgba(191, 84, 122, 0.16);
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.95);
}

.full-span {
  grid-column: 1 / -1;
}

.field-error {
  color: #c05779;
  font-size: 12px;
}

.summary-stack {
  display: grid;
  gap: 18px;
}

.summary-card {
  padding: 24px;
  display: grid;
  gap: 10px;
}

.summary-card small,
.timeline-copy small,
.orders-state,
.orders-empty,
.order-notes {
  color: var(--text-muted);
  line-height: 1.7;
}

.orders-section {
  margin-top: 28px;
}

.orders-state,
.orders-empty {
  margin-top: 18px;
  padding: 28px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px dashed rgba(191, 84, 122, 0.18);
}

.wishlist-grid {
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 22px;
}

.orders-list {
  margin-top: 22px;
  display: grid;
  gap: 20px;
}

.order-card {
  padding: 24px;
  display: grid;
  gap: 18px;
}

.order-top,
.order-meta,
.order-financials {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}

.order-code {
  font-size: 12px;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--rose);
}

.order-date {
  margin-top: 6px;
  color: var(--text-muted);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 10px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.status-pending_payment,
.status-payment_submitted {
  background: #fff3dc;
  color: #8f6520;
}

.status-paid,
.status-delivered {
  background: #e7f7ed;
  color: #2f7a50;
}

.status-shipped {
  background: #edf2ff;
  color: #4b63b5;
}

.status-cancelled {
  background: #fde8ee;
  color: #b14d6e;
}

.timeline {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
}

.timeline-step {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 10px;
  align-items: start;
}

.timeline-dot-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ead4dc;
  flex-shrink: 0;
}

.timeline-line {
  height: 2px;
  flex: 1;
  background: #ead4dc;
  border-radius: 999px;
}

.timeline-step.done .timeline-dot,
.timeline-step.current .timeline-dot {
  background: var(--rose);
}

.timeline-step.done .timeline-line,
.timeline-step.current .timeline-line {
  background: rgba(191, 84, 122, 0.42);
}

.timeline-step:last-child .timeline-line {
  display: none;
}

.timeline-copy strong {
  display: block;
  margin-bottom: 4px;
}

.cancelled-box {
  padding: 16px 18px;
  border-radius: 18px;
  background: #fff2f6;
  color: #b14d6e;
}

.order-items {
  display: grid;
  gap: 10px;
}

.order-items li {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  color: var(--dark-mid);
}

.proof-link {
  width: fit-content;
}

@media (max-width: 960px) {
  .hero-grid,
  .account-layout,
  .form-grid,
  .wishlist-grid {
    grid-template-columns: 1fr;
  }

  .timeline {
    grid-template-columns: 1fr;
  }

  .timeline-step {
    grid-template-columns: 18px 1fr;
    grid-template-rows: none;
    gap: 12px;
  }

  .timeline-dot-wrap {
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .timeline-line {
    width: 2px;
    min-height: 28px;
  }

  .timeline-step:last-child .timeline-line {
    display: block;
    visibility: hidden;
  }
}

@media (max-width: 720px) {
  .account-hero,
  .account-layout,
  .orders-section {
    width: min(1120px, calc(100vw - 24px));
  }

  .back-link {
    margin-bottom: 14px;
  }

  .hero-card,
  .summary-card,
  .panel,
  .order-card {
    border-radius: 20px;
  }

  .order-top,
  .order-meta,
  .order-financials,
  .panel-head,
  .orders-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
