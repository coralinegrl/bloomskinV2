<template>
  <Transition name="drawer">
    <div v-if="cart.open" class="drawer-overlay" @click.self="closeDrawer">
      <aside class="drawer">
        <div class="drawer-header">
          <div>
            <div class="drawer-eyebrow">{{ currentStepLabel }}</div>
            <div class="drawer-title">{{ currentTitle }}</div>
          </div>
          <button class="drawer-close" type="button" @click="closeDrawer">x</button>
        </div>

        <div v-if="cart.items.length > 0" class="drawer-steps">
          <button class="step-chip" :class="{ active: cart.view === 'cart' }" type="button" @click="cart.view = 'cart'">
            1. Carrito
          </button>
          <button
            class="step-chip"
            :class="{ active: cart.view === 'checkout', locked: !customerAuth.isAuthenticated }"
            type="button"
            @click="openCheckoutStep"
          >
            2. Checkout
          </button>
        </div>

        <div v-if="cart.items.length === 0 && !checkoutOk" class="drawer-empty">
          <strong>Tu carrito está vacío</strong>
          <p>Agrega productos desde la tienda o el catálogo para empezar tu compra.</p>
          <button class="ghost-btn" type="button" @click="closeDrawer">Seguir comprando</button>
        </div>

        <template v-else>
          <div v-if="cart.view === 'cart'" class="drawer-body">
            <div class="cart-list">
              <article v-for="item in cart.items" :key="item.cart_key || item.id" class="cart-item">
                <div class="cart-item-img" :class="item.img_clase">
                  <img v-if="item.imagen_url" :src="item.imagen_url" :alt="item.nombre" class="cart-photo" />
                </div>

                <div class="cart-item-main">
                  <div class="cart-item-brand">{{ item.marca }}</div>
                  <div class="cart-item-name">{{ item.nombre }}</div>
                  <div v-if="item.tono_seleccionado" class="cart-item-tone">Tipo: {{ item.tono_seleccionado }}</div>
                  <div class="cart-item-price">{{ fmt(item.precio_clp) }}</div>
                </div>

                <div class="cart-item-side">
                  <button class="remove-btn" type="button" @click="cart.quitar(item.cart_key || item.id)">Quitar</button>
                  <div class="qty-control">
                    <button type="button" @click="cart.cambiarCantidad(item.cart_key || item.id, item.cantidad - 1)">-</button>
                    <span>{{ item.cantidad }}</span>
                    <button type="button" :disabled="item.cantidad >= Number(item.stock || 0)" @click="cart.cambiarCantidad(item.cart_key || item.id, item.cantidad + 1)">+</button>
                  </div>
                </div>
              </article>
            </div>

            <div class="summary-card">
              <div class="summary-row">
                <span>Subtotal</span>
                <strong>{{ fmt(cart.total) }}</strong>
              </div>
              <div v-if="cart.savings > 0" class="summary-row">
                <span>Ahorro</span>
                <strong class="summary-save">-{{ fmt(cart.savings) }}</strong>
              </div>
              <div class="summary-row muted">
                <span>Envío</span>
                <span>Se calcula en checkout</span>
              </div>
              <div class="summary-banner">
                <strong>{{ cart.total >= 49990 ? 'Ya tienes envío gratis.' : `Te faltan ${fmt(49990 - cart.total)} para envío gratis.` }}</strong>
                <span>Antofagasta se calcula por distancia. Fuera de Antofagasta usamos Blue Express.</span>
              </div>
              <a class="ghost-btn whatsapp-btn" :href="whatsappUrl" target="_blank" rel="noreferrer">Hablar por WhatsApp</a>
              <button class="primary-btn" type="button" @click="openCheckoutStep">Continuar compra</button>
              <button class="ghost-btn" type="button" @click="closeDrawer">Seguir comprando</button>
            </div>
          </div>

          <div v-else class="drawer-body checkout-body">
            <div v-if="customerAuth.isAuthenticated && cart.items.length > 0 && !checkoutOk" class="checkout-panel reservation-panel">
              <strong>Tu carrito está reservado por {{ reservationCountdownLabel }}</strong>
              <p class="panel-copy">Tienes 20 minutos para terminar la compra antes de que el stock vuelva a liberarse automáticamente.</p>
              <p v-if="reservationLoading" class="panel-copy">Actualizando reserva...</p>
              <p v-if="reservationError" class="panel-error">{{ reservationError }}</p>
            </div>

            <div class="checkout-panel compact">
              <div class="panel-head">
                <strong>Resumen rápido</strong>
                <button class="text-btn" type="button" @click="cart.view = 'cart'">Editar carrito</button>
              </div>
              <div class="summary-row">
                <span>Productos</span>
                <strong>{{ cart.count }}</strong>
              </div>
              <div class="summary-row">
                <span>Subtotal</span>
                <strong>{{ fmt(displaySubtotal) }}</strong>
              </div>
              <div v-if="displayDiscount > 0" class="summary-row">
                <span>Descuento</span>
                <strong class="summary-save">-{{ fmt(displayDiscount) }}</strong>
              </div>
              <div class="summary-row">
                <span>Envío</span>
                <strong>{{ shippingValueLabel }}</strong>
              </div>
              <div class="summary-row total">
                <span>Total</span>
                <strong>{{ fmt(orderTotal) }}</strong>
              </div>
            </div>

            <div v-if="!customerAuth.isAuthenticated" class="checkout-panel login-panel">
              <strong>Necesitas iniciar sesión para continuar</strong>
              <p>Tu carrito ya está listo. Abre el acceso en el modal y vuelves aquí al terminar.</p>
              <div class="login-actions">
                <button class="primary-btn" type="button" @click="ui.openAuthModal('login')">Iniciar sesión</button>
                <button class="ghost-btn" type="button" @click="ui.openAuthModal('register')">Crear cuenta</button>
              </div>
            </div>

            <template v-else-if="!checkoutOk">
              <div class="checkout-panel">
                <div class="panel-head">
                  <strong>Cómo quieres recibir tu pedido</strong>
                </div>
                <div class="delivery-mode-grid" role="radiogroup" aria-label="Forma de entrega">
                  <button
                    class="delivery-mode-card"
                    :class="{ active: deliveryMode === 'delivery' }"
                    type="button"
                    role="radio"
                    :aria-pressed="deliveryMode === 'delivery'"
                    :aria-checked="deliveryMode === 'delivery'"
                    @click="deliveryMode = 'delivery'"
                  >
                    <span class="delivery-radio" aria-hidden="true"></span>
                    <span class="delivery-copy">
                      <strong>Despacho a domicilio</strong>
                      <small>Calculamos el despacho según tu comuna y dirección.</small>
                    </span>
                    <strong>Envío a domicilio</strong>
                    <span>Calculamos el despacho según comuna y dirección.</span>
                  </button>
                  <button
                    class="delivery-mode-card"
                    :class="{ active: deliveryMode === 'pickup' }"
                    type="button"
                    role="radio"
                    :aria-pressed="deliveryMode === 'pickup'"
                    :aria-checked="deliveryMode === 'pickup'"
                    @click="deliveryMode = 'pickup'"
                  >
                    <span class="delivery-radio" aria-hidden="true"></span>
                    <span class="delivery-copy">
                      <strong>Retiro en Sierra Nevada 10706A</strong>
                      <small>Coordinamos el retiro sin costo cuando tu pedido esté listo.</small>
                    </span>
                    <strong>Retiro en domicilio</strong>
                    <span>Coordinamos contigo en Antofagasta y no cobramos envío.</span>
                  </button>
                </div>
              </div>

              <div class="checkout-panel" v-if="deliveryMode === 'delivery'">
                <div class="panel-head">
                  <strong>Datos de envío</strong>
                  <button class="text-btn" type="button" :disabled="shippingLoading" @click="calculateShipping">
                    {{ shippingLoading ? 'Calculando...' : 'Recalcular envío' }}
                  </button>
                </div>

                <div class="form-grid">
                  <label class="field-block">
                    <span>Región</span>
                    <select v-model="shippingForm.region" :disabled="submitting || shippingLoading">
                      <option value="">Selecciona una región</option>
                      <option v-for="region in CHILE_REGIONS" :key="region" :value="region">{{ region }}</option>
                    </select>
                    <small v-if="shippingErrors.region" class="field-error">{{ shippingErrors.region }}</small>
                  </label>

                  <label class="field-block">
                    <span>Comuna / Ciudad</span>
                    <input v-model.trim="shippingForm.city" type="text" placeholder="Antofagasta" :disabled="submitting || shippingLoading" />
                    <small v-if="shippingErrors.city" class="field-error">{{ shippingErrors.city }}</small>
                  </label>

                  <label class="field-block">
                    <span>Calle</span>
                    <input v-model.trim="shippingForm.street" type="text" placeholder="Av. Grecia" :disabled="submitting || shippingLoading" />
                    <small v-if="shippingErrors.direccion" class="field-error">{{ shippingErrors.direccion }}</small>
                  </label>

                  <label class="field-block">
                    <span>Número</span>
                    <input v-model.trim="shippingForm.number" type="text" placeholder="860" :disabled="submitting || shippingLoading" />
                  </label>

                  <label class="field-block">
                    <span>Depto / Oficina</span>
                    <input v-model.trim="shippingForm.apartment" type="text" placeholder="Depto 402" :disabled="submitting || shippingLoading" />
                  </label>

                  <label class="field-block">
                    <span>Referencia</span>
                    <input v-model.trim="shippingForm.reference" type="text" placeholder="Casa verde, portón negro" :disabled="submitting || shippingLoading" />
                  </label>
                </div>

                <p class="panel-copy">
                  Antofagasta se calcula por distancia desde Bloomskin. Fuera de Antofagasta usamos Blue Express por {{ fmt(3990) }}. Sobre {{ fmt(49990) }} el envío es gratis.
                </p>
                <p v-if="shippingQuote" class="panel-ok">
                  {{ shippingQuote.provider }} - {{ shippingQuote.tier_label }}
                  <span v-if="shippingQuote.distance_km !== null"> - {{ shippingQuote.distance_km }} km</span>
                </p>
                <p v-if="shippingError" class="panel-error">{{ shippingError }}</p>
              </div>

              <div v-else class="checkout-panel">
                <strong>Retiro coordinado</strong>
                <p class="panel-copy">
                  Si eliges retiro, coordinaremos contigo por WhatsApp o correo una vez creado el pedido.
                  Tu dirección personal puede seguir guardada en tu cuenta para futuras compras con despacho.
                </p>
                <p class="panel-ok">No se cobrará envío en este pedido.</p>
              </div>

              <div class="checkout-panel">
                <strong>Datos de contacto y facturación</strong>
                <div class="form-grid">
                  <label class="field-block">
                    <span>Nombre completo</span>
                    <input v-model.trim="profileForm.nombre" type="text" placeholder="Nombre completo" :disabled="submitting" />
                    <small v-if="profileErrors.nombre" class="field-error">{{ profileErrors.nombre }}</small>
                  </label>

                  <label class="field-block">
                    <span>Email</span>
                    <input :value="customerAuth.user?.email || ''" type="email" disabled />
                  </label>

                  <label class="field-block">
                    <span>RUT</span>
                    <input :value="profileForm.rut" type="text" placeholder="12.345.678-5" :disabled="submitting" @input="profileForm.rut = formatRutInput($event.target.value)" />
                    <small v-if="profileErrors.rut" class="field-error">{{ profileErrors.rut }}</small>
                  </label>

                  <label class="field-block">
                    <span>Teléfono</span>
                    <input :value="profileForm.telefono" type="text" placeholder="+56 9 1234 5678" :disabled="submitting" @input="profileForm.telefono = formatPhoneInput($event.target.value)" />
                    <small v-if="profileErrors.telefono" class="field-error">{{ profileErrors.telefono }}</small>
                  </label>

                  <label class="field-block">
                    <span>Calle</span>
                    <input v-model.trim="profileForm.street" type="text" placeholder="Av. Grecia" :disabled="submitting" />
                    <small v-if="profileErrors.direccion" class="field-error">{{ profileErrors.direccion }}</small>
                  </label>

                  <label class="field-block">
                    <span>Número</span>
                    <input v-model.trim="profileForm.number" type="text" placeholder="860" :disabled="submitting" />
                  </label>

                  <label class="field-block">
                    <span>Depto / Oficina</span>
                    <input v-model.trim="profileForm.apartment" type="text" placeholder="Depto 402" :disabled="submitting" />
                  </label>

                  <label class="field-block">
                    <span>Comuna / Ciudad</span>
                    <input v-model.trim="profileForm.city" type="text" placeholder="Antofagasta" :disabled="submitting" />
                    <small v-if="profileErrors.ciudad" class="field-error">{{ profileErrors.ciudad }}</small>
                  </label>

                  <label class="field-block full-span">
                    <span>Región</span>
                    <select v-model="profileForm.region" :disabled="submitting">
                      <option value="">Selecciona una región</option>
                      <option v-for="region in CHILE_REGIONS" :key="region" :value="region">{{ region }}</option>
                    </select>
                    <small v-if="profileErrors.region" class="field-error">{{ profileErrors.region }}</small>
                  </label>

                  <label class="field-block full-span">
                    <span>Notas del pedido</span>
                    <textarea v-model.trim="checkoutNotas" rows="3" placeholder="Notas del pedido (opcional)" :disabled="submitting"></textarea>
                  </label>
                </div>
              </div>

              <div class="checkout-panel">
                <div class="panel-head">
                  <strong>Código de descuento</strong>
                  <button class="text-btn" type="button" :disabled="submitting || discountLoading" @click="applyDiscountCode">
                    {{ discountLoading ? 'Aplicando...' : 'Aplicar código' }}
                  </button>
                </div>
                <div class="discount-row">
                  <input
                    v-model.trim="discountCode"
                    type="text"
                    placeholder="Ej. APERTURA15"
                    :disabled="submitting || discountLoading"
                    @input="discountError = ''"
                    @keydown.enter.prevent="applyDiscountCode"
                  />
                  <button class="ghost-btn discount-clear" type="button" :disabled="discountLoading || (!discountCode && !appliedDiscount)" @click="clearDiscountCode">
                    Quitar
                  </button>
                </div>
                <p v-if="appliedDiscount" class="panel-ok">
                  {{ appliedDiscount.code }} aplicado: -{{ fmt(appliedDiscount.discount_clp) }}
                  <span v-if="appliedDiscount.remaining_uses !== null"> · quedan {{ appliedDiscount.remaining_uses }} usos</span>
                </p>
                <p v-else class="panel-copy">Puedes usar códigos por apertura, campañas o temporadas especiales.</p>
                <p v-if="discountError" class="panel-error">{{ discountError }}</p>
              </div>

              <div class="checkout-panel">
                <strong>Pago por transferencia</strong>
                <p class="panel-copy">Creas el pedido, transfieres el total exacto y luego subes tu comprobante.</p>
                <p v-if="transferConfigWarning" class="panel-error">{{ transferConfigWarning }}</p>
                <p v-else-if="checkoutError" class="panel-error">{{ checkoutError }}</p>
                <a class="ghost-btn whatsapp-btn" :href="whatsappUrl" target="_blank" rel="noreferrer">Ayuda por WhatsApp</a>
                <button class="primary-btn" type="button" :disabled="submitting || shippingLoading || !isTransferReady" @click="handleCheckout">
                  {{ submitting ? 'Creando pedido...' : 'Crear pedido por transferencia' }}
                </button>
              </div>
            </template>

            <template v-else>
              <div class="checkout-panel success-panel">
                <strong>Pedido {{ checkoutOk.codigo }} creado</strong>
                <p>Transfiere {{ fmt(checkoutOk.total_clp) }} y luego sube tu comprobante.</p>
                <p class="panel-copy">Usa <strong>{{ checkoutOk.codigo }}</strong> como asunto o referencia de la transferencia.</p>
                <p class="panel-copy" v-if="checkoutOk.comprobante_limite_en">
                  Tienes <strong>{{ uploadProofCountdownLabel }}</strong> para subir tu comprobante antes de que el pedido se cancele automáticamente.
                </p>
                <a class="ghost-btn whatsapp-btn" :href="whatsappUrl" target="_blank" rel="noreferrer">Enviar dudas por WhatsApp</a>
              </div>

              <div class="checkout-panel">
                <div class="panel-head">
                  <strong>Datos de transferencia</strong>
                  <button class="text-btn" type="button" @click="copyAllTransferData">Copiar todo</button>
                </div>
                <div class="transfer-grid">
                  <span>Banco</span><strong>{{ paymentConfig?.transfer?.bank_name || 'Por definir' }}</strong>
                  <span>Tipo</span><strong>{{ paymentConfig?.transfer?.account_type || 'Por definir' }}</strong>
                  <span>Número</span><strong>{{ paymentConfig?.transfer?.account_number || 'Por definir' }}</strong>
                  <span>Titular</span><strong>{{ paymentConfig?.transfer?.account_holder || 'Bloomskin' }}</strong>
                  <span>RUT</span><strong>{{ paymentConfig?.transfer?.account_rut || 'Por definir' }}</strong>
                  <span>Email</span><strong>{{ paymentConfig?.transfer?.transfer_email || 'Por definir' }}</strong>
                  <span>Asunto</span><strong>{{ checkoutOk.codigo }}</strong>
                  <span>Total</span><strong>{{ fmt(checkoutOk.total_clp) }}</strong>
                </div>
                <p class="panel-copy">{{ paymentConfig?.transfer?.instructions }}</p>
              </div>

              <div class="checkout-panel">
                <strong>Sube tu comprobante</strong>
                <input class="proof-input" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/bmp,image/tiff" @change="handleProofSelected" :disabled="proofUploading" />
                <p class="panel-copy">Aceptamos imágenes JPG, PNG, WebP, HEIC, BMP o TIFF de hasta 5 MB.</p>
                <button class="primary-btn" type="button" :disabled="proofUploading || !proofFile" @click="uploadProof">
                  {{ proofUploading ? 'Subiendo comprobante...' : 'Subir comprobante' }}
                </button>
                <p v-if="proofUploadedUrl" class="panel-ok">Comprobante recibido correctamente.</p>
                <p v-if="checkoutError" class="panel-error">{{ checkoutError }}</p>
              </div>
            </template>
          </div>
        </template>
      </aside>

      <div v-if="proofSuccessModalOpen" class="proof-modal-backdrop" @click.self="goToOrdersFromProofModal">
        <div class="proof-modal">
          <div class="proof-modal-tag">Comprobante recibido</div>
          <h3>Tu pedido quedó en espera de confirmación</h3>
          <p>
            Ya recibimos tu comprobante para el pedido <strong>{{ checkoutOk?.codigo }}</strong>.
            Ahora nuestro equipo revisará el pago y te avisaremos por correo cada vez que el estado cambie.
          </p>
          <button class="primary-btn" type="button" @click="goToOrdersFromProofModal">OK, ir a mis pedidos</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { descuentosApi, pedidosApi, settingsApi } from '../../api/index.js'
import { useCartStore } from '../../stores/cart.js'
import { useCustomerAuthStore } from '../../stores/customerAuth.js'
import { useUiStore } from '../../stores/ui.js'
import { validateCustomerProfile, validateShippingAddress } from '../../utils/validation.js'
import {
  buildApiCustomerPayload,
  buildProfileForm,
  buildShippingPayload,
  CHILE_REGIONS,
  formatPhoneInput,
  formatRutInput,
} from '../../utils/customerFields.js'

const cart = useCartStore()
const customerAuth = useCustomerAuthStore()
const ui = useUiStore()
const router = useRouter()

const submitting = ref(false)
const shippingLoading = ref(false)
const proofUploading = ref(false)
const discountLoading = ref(false)
const checkoutError = ref('')
const shippingError = ref('')
const discountError = ref('')
const checkoutOk = ref(null)
const checkoutNotas = ref('')
const paymentConfig = ref(null)
const shippingQuote = ref(null)
const discountCode = ref('')
const appliedDiscount = ref(null)
const proofFile = ref(null)
const proofUploadedUrl = ref('')
const proofSuccessModalOpen = ref(false)
const whatsappUrl = ref('https://wa.me/56994841853')
const deliveryMode = ref('delivery')
const reservationInfo = ref(null)
const reservationLoading = ref(false)
const reservationError = ref('')
const nowTick = ref(Date.now())
const MAX_PROOF_FILE_BYTES = 5 * 1024 * 1024
const ALLOWED_PROOF_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff'])
const ALLOWED_PROOF_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'bmp', 'tif', 'tiff'])
let shippingDebounce = null
let reservationSyncDebounce = null
const timerInterval = window.setInterval(() => {
  nowTick.value = Date.now()
}, 1000)

const profileForm = reactive(buildProfileForm(customerAuth.user))
const shippingForm = reactive({
  street: '',
  number: '',
  apartment: '',
  city: '',
  region: '',
  reference: '',
})
const profileErrors = reactive({ nombre: '', rut: '', telefono: '', direccion: '', ciudad: '', region: '' })
const shippingErrors = reactive({ direccion: '', city: '', region: '' })

const currentStepLabel = computed(() => (cart.view === 'checkout' ? 'Checkout Bloomskin' : 'Tu selección'))
const currentTitle = computed(() => (cart.view === 'checkout' ? 'Carrito y envío' : `Tu carrito (${cart.count})`))
const displaySubtotal = computed(() => checkoutOk.value?.subtotal_clp || cart.total)
const displayDiscount = computed(() => checkoutOk.value?.descuento_clp || appliedDiscount.value?.discount_clp || 0)
const discountedSubtotal = computed(() => checkoutOk.value?.subtotal_pagado_clp || Math.max(0, cart.total - displayDiscount.value))
const orderTotal = computed(() => {
  if (checkoutOk.value) return checkoutOk.value.total_clp
  if (deliveryMode.value === 'pickup') return discountedSubtotal.value
  return discountedSubtotal.value + (shippingQuote.value?.fee_clp || 0)
})
const reservationSecondsLeft = computed(() => {
  if (!reservationInfo.value?.expires_en) return 0
  return Math.max(0, Math.floor((new Date(reservationInfo.value.expires_en).getTime() - nowTick.value) / 1000))
})
const reservationCountdownLabel = computed(() => {
  const minutes = String(Math.floor(reservationSecondsLeft.value / 60)).padStart(2, '0')
  const seconds = String(reservationSecondsLeft.value % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})
const uploadProofSecondsLeft = computed(() => {
  if (!checkoutOk.value?.comprobante_limite_en) return 0
  return Math.max(0, Math.floor((new Date(checkoutOk.value.comprobante_limite_en).getTime() - nowTick.value) / 1000))
})
const uploadProofCountdownLabel = computed(() => {
  const minutes = String(Math.floor(uploadProofSecondsLeft.value / 60)).padStart(2, '0')
  const seconds = String(uploadProofSecondsLeft.value % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})

const shippingValueLabel = computed(() => {
  if (checkoutOk.value) return fmt(checkoutOk.value.envio_clp)
  if (deliveryMode.value === 'pickup') return 'Retiro'
  if (shippingLoading.value) return 'Calculando...'
  if (!shippingQuote.value) return 'Pendiente'
  if (shippingQuote.value.fee_clp === 0) return 'Gratis'
  return fmt(shippingQuote.value.fee_clp)
})
const isTransferReady = computed(() => paymentConfig.value?.transfer?.is_complete !== false)
const transferConfigWarning = computed(() => {
  if (isTransferReady.value) return ''
  return 'La tienda aún no tiene completos los datos bancarios para recibir transferencias. Configúralos en admin antes de crear pedidos.'
})

function resetProfileErrors() {
  Object.keys(profileErrors).forEach(key => { profileErrors[key] = '' })
}

function resetShippingErrors() {
  Object.keys(shippingErrors).forEach(key => { shippingErrors[key] = '' })
}

watch(
  () => customerAuth.user,
  user => {
    Object.assign(profileForm, buildProfileForm(user))
    if (!shippingForm.region) shippingForm.region = user?.region || ''
    if (!shippingForm.city) shippingForm.city = user?.ciudad || ''
    if (!shippingForm.street) shippingForm.street = buildProfileForm(user).street
    if (!shippingForm.number) shippingForm.number = buildProfileForm(user).number
    if (!shippingForm.apartment) shippingForm.apartment = buildProfileForm(user).apartment
  },
  { immediate: true }
)

watch(
  () => [profileForm.region, profileForm.city, profileForm.street, profileForm.number, profileForm.apartment],
  ([region, city, street, number, apartment]) => {
    if (customerAuth.isAuthenticated) {
      shippingForm.region = region || ''
      shippingForm.city = city || ''
      shippingForm.street = street || ''
      shippingForm.number = number || ''
      shippingForm.apartment = apartment || ''
    }
  }
)

watch(
  () => [shippingForm.region, shippingForm.city, shippingForm.street, shippingForm.number, shippingForm.apartment],
  () => {
    shippingQuote.value = null
    shippingError.value = ''
    if (checkoutOk.value || cart.view !== 'checkout' || deliveryMode.value !== 'delivery') return
    clearTimeout(shippingDebounce)
    if (!customerAuth.isAuthenticated) return
    shippingDebounce = setTimeout(() => {
      calculateShipping()
    }, 600)
  }
)

watch(deliveryMode, mode => {
  shippingQuote.value = null
  shippingError.value = ''
  resetShippingErrors()
  if (checkoutOk.value || cart.view !== 'checkout') return
  if (mode === 'delivery') {
    clearTimeout(shippingDebounce)
    shippingDebounce = setTimeout(() => {
      calculateShipping()
    }, 150)
  }
})

watch(
  () => [cart.total, cart.count],
  () => {
    if (checkoutOk.value) return
    if (appliedDiscount.value) {
      appliedDiscount.value = null
      discountError.value = ''
      if (cart.view === 'checkout') {
        void calculateShipping()
      }
    }
  }
)

watch(
  () => cart.items.map(item => `${item.id}:${item.cantidad}:${item.tono_seleccionado || ''}`).join('|'),
  () => {
    if (checkoutOk.value || cart.view !== 'checkout' || !customerAuth.isAuthenticated || cart.items.length === 0) return
    clearTimeout(reservationSyncDebounce)
    reservationSyncDebounce = setTimeout(() => {
      void syncCheckoutReservation()
    }, 250)
  }
)

watch(discountCode, value => {
  if (!appliedDiscount.value) return
  if (String(value || '').trim().toUpperCase() !== String(appliedDiscount.value.code || '').trim().toUpperCase()) {
    appliedDiscount.value = null
    discountError.value = ''
  }
})

watch(reservationSecondsLeft, seconds => {
  if (checkoutOk.value || !reservationInfo.value) return
  if (seconds > 0) return
  reservationInfo.value = null
  reservationError.value = 'Tu reserva de 20 minutos venció. Volvimos a liberar el stock.'
  checkoutError.value = reservationError.value
  cart.view = 'cart'
  ui.error(reservationError.value)
})

watch(
  () => cart.open,
  async isOpen => {
    if (!isOpen) return
    checkoutError.value = ''
    discountError.value = ''
    proofUploadedUrl.value = ''
    proofFile.value = null
    proofSuccessModalOpen.value = false
    reservationError.value = ''
    if (cart.view !== 'checkout') cart.view = 'cart'

    if (customerAuth.isAuthenticated) {
      Object.assign(profileForm, buildProfileForm(customerAuth.user))
      shippingForm.region = profileForm.region || ''
      shippingForm.city = profileForm.city || ''
      shippingForm.street = profileForm.street || ''
      shippingForm.number = profileForm.number || ''
      shippingForm.apartment = profileForm.apartment || ''
    } else {
      shippingForm.region = ''
      shippingForm.city = ''
      shippingForm.street = ''
      shippingForm.number = ''
      shippingForm.apartment = ''
    }

    if (!paymentConfig.value) {
      try {
        const [{ data }, { data: siteData }] = await Promise.all([
          pedidosApi.paymentConfig(),
          settingsApi.site(),
        ])
        paymentConfig.value = data
        if (siteData?.footer?.whatsapp_url) whatsappUrl.value = siteData.footer.whatsapp_url
      } catch (error) {
        console.error(error)
      }
    }

    if (customerAuth.isAuthenticated && cart.view === 'checkout' && !checkoutOk.value && cart.items.length > 0) {
      void syncCheckoutReservation()
    }
  },
  { immediate: true }
)

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('es-CL')
}

function closeDrawer() {
  cart.open = false
  proofSuccessModalOpen.value = false
}

async function syncCheckoutReservation() {
  if (!customerAuth.isAuthenticated || checkoutOk.value || cart.items.length === 0) return
  reservationLoading.value = true
  reservationError.value = ''
  try {
    const { data } = await pedidosApi.reservarCheckout(cart.items.map(item => ({
      producto_id: item.id,
      cantidad: item.cantidad,
      tono_seleccionado: item.tono_seleccionado || null,
    })))
    reservationInfo.value = data?.reservation || null
  } catch (error) {
    reservationInfo.value = null
    reservationError.value = error.response?.data?.error || 'No pudimos reservar tu carrito en este momento.'
    ui.error(reservationError.value)
  } finally {
    reservationLoading.value = false
  }
}

function openCheckoutStep() {
  if (!customerAuth.isAuthenticated) {
    ui.openAuthModal('login')
    return
  }
  cart.view = 'checkout'
  void syncCheckoutReservation()
  if (deliveryMode.value === 'delivery' && !shippingQuote.value && !shippingLoading.value) {
    clearTimeout(shippingDebounce)
    shippingDebounce = setTimeout(() => {
      calculateShipping()
    }, 150)
  }
}

async function applyDiscountCode() {
  const normalizedCode = normalizeDiscountInput(discountCode.value)
  discountCode.value = normalizedCode
  appliedDiscount.value = null

  if (!normalizedCode) {
    discountError.value = 'Ingresa un código antes de aplicarlo.'
    return
  }

  if (cart.count <= 0 || cart.total <= 0) {
    discountError.value = 'Agrega productos al carrito antes de usar un código.'
    return
  }

  if (!isValidDiscountCode(normalizedCode)) {
    discountError.value = 'El código debe tener entre 3 y 50 caracteres y usar solo letras, números, guion o guion bajo.'
    return
  }

  discountLoading.value = true
  discountError.value = ''

  try {
    const { data } = await descuentosApi.validar({ code: normalizedCode, subtotal_clp: cart.total })
    appliedDiscount.value = data
    discountCode.value = data.code
    if (cart.view === 'checkout') {
      await calculateShipping()
    }
    ui.success(`Código ${data.code} aplicado correctamente.`)
  } catch (error) {
    appliedDiscount.value = null
    discountError.value = apiErrorMessage(error, 'No pudimos aplicar ese código.')
  } finally {
    discountLoading.value = false
  }
}

function clearDiscountCode() {
  appliedDiscount.value = null
  discountCode.value = ''
  discountError.value = ''
  checkoutError.value = ''
  if (cart.view === 'checkout') {
    void calculateShipping()
  }
}

async function calculateShipping() {
  if (!customerAuth.isAuthenticated || checkoutOk.value) return
  if (deliveryMode.value !== 'delivery') {
    shippingQuote.value = null
    shippingError.value = ''
    return
  }

  resetShippingErrors()
  const shippingPayload = buildShippingPayload(shippingForm)
  const shippingValidation = validateShippingAddress(shippingPayload)
  if (shippingValidation.errors.length) {
    shippingErrors.region = shippingValidation.errors.find(msg => msg.startsWith('Región')) || ''
    shippingErrors.city = shippingValidation.errors.find(msg => msg.startsWith('Ciudad')) || ''
    shippingErrors.direccion = shippingValidation.errors.find(msg => msg.startsWith('Dirección')) || ''
    shippingError.value = shippingValidation.errors[0]
    return
  }

  shippingLoading.value = true
  shippingError.value = ''
  try {
    const { data } = await pedidosApi.quoteShipping({
      ciudad: shippingValidation.normalized.ciudad,
      direccion: shippingValidation.normalized.direccion,
      subtotal_clp: discountedSubtotal.value,
    })
    shippingQuote.value = data
  } catch (err) {
    shippingQuote.value = null
    shippingError.value = err.response?.data?.error || 'No se pudo calcular el envío.'
  } finally {
    shippingLoading.value = false
  }
}

async function handleCheckout() {
  checkoutError.value = ''
  checkoutOk.value = null
  proofFile.value = null
  proofUploadedUrl.value = ''
  submitting.value = true

  try {
    resetProfileErrors()
    resetShippingErrors()

    const profilePayload = buildApiCustomerPayload({
      ...profileForm,
      email: customerAuth.user?.email || '',
    })
    const profileValidation = validateCustomerProfile(profilePayload, {
      requirePassword: false,
      requireAddress: deliveryMode.value === 'delivery',
    })
    if (profileValidation.errors.length) {
      profileErrors.nombre = profileValidation.errors.find(msg => msg.startsWith('Nombre')) || ''
      profileErrors.rut = profileValidation.errors.find(msg => msg.startsWith('RUT')) || ''
      profileErrors.telefono = profileValidation.errors.find(msg => msg.startsWith('Teléfono')) || ''
      profileErrors.direccion = profileValidation.errors.find(msg => msg.startsWith('Dirección')) || ''
      profileErrors.ciudad = profileValidation.errors.find(msg => msg.startsWith('Ciudad')) || ''
      profileErrors.region = profileValidation.errors.find(msg => msg.startsWith('Región')) || ''
      checkoutError.value = profileValidation.errors[0]
      return
    }

    const shippingPayload = buildShippingPayload(shippingForm)
    const shippingValidation = deliveryMode.value === 'delivery'
      ? validateShippingAddress(shippingPayload)
      : { errors: [], normalized: { region: '', ciudad: '', direccion: '', referencia: '' } }
    if (shippingValidation.errors.length) {
      shippingErrors.region = shippingValidation.errors.find(msg => msg.startsWith('Región')) || ''
      shippingErrors.city = shippingValidation.errors.find(msg => msg.startsWith('Ciudad')) || ''
      shippingErrors.direccion = shippingValidation.errors.find(msg => msg.startsWith('Dirección')) || ''
      checkoutError.value = shippingValidation.errors[0]
      return
    }

    if (deliveryMode.value === 'delivery' && !shippingQuote.value) {
      await calculateShipping()
      if (!shippingQuote.value) {
        checkoutError.value = shippingError.value || 'No pudimos calcular el envío para este pedido.'
        return
      }
    }
    if (!isTransferReady.value) {
      checkoutError.value = transferConfigWarning.value
      return
    }
    if (!reservationInfo.value) {
      await syncCheckoutReservation()
    }
    if (!reservationInfo.value) {
      checkoutError.value = reservationError.value || 'Tu reserva ya no está activa. Intenta nuevamente.'
      return
    }

    const profileUpdated = await customerAuth.updateProfile({
      ...profileValidation.normalized,
      skip_address_validation: deliveryMode.value !== 'delivery',
    })
    if (!profileUpdated) {
      checkoutError.value = customerAuth.error || 'No se pudo actualizar tu perfil antes de comprar.'
      return
    }

    const { data: pedido } = await pedidosApi.crearCliente({
      items: cart.items.map(item => ({
        producto_id: item.id,
        cantidad: item.cantidad,
        tono_seleccionado: item.tono_seleccionado || null,
      })),
      notas: checkoutNotas.value || null,
      metodo_pago: 'bank_transfer',
      delivery_mode: deliveryMode.value,
      discount_code: appliedDiscount.value?.code || null,
      region_envio: shippingValidation.normalized.region,
      ciudad_envio: shippingValidation.normalized.ciudad,
      direccion_envio: shippingValidation.normalized.direccion,
      referencia_envio: shippingValidation.normalized.referencia || null,
    })

    checkoutOk.value = pedido
    reservationInfo.value = null
    cart.vaciar()
    checkoutNotas.value = ''
    ui.success(`Tu pedido ${checkoutOk.value.codigo} fue creado. Ahora transfiere y sube tu comprobante.`)
  } catch (err) {
    const message = apiErrorMessage(err, 'No se pudo crear el pedido.')
    if (isDiscountErrorMessage(message)) {
      appliedDiscount.value = null
      discountError.value = message
      checkoutError.value = 'Revisa el código de descuento antes de continuar.'
    } else {
      checkoutError.value = message
    }
    ui.error(checkoutError.value)
  } finally {
    submitting.value = false
  }
}

function normalizeDiscountInput(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

function isValidDiscountCode(value) {
  return /^[A-Z0-9_-]{3,50}$/.test(value)
}

function apiErrorMessage(error, fallback) {
  return error?.response?.data?.error || fallback
}

function isDiscountErrorMessage(message) {
  return /c[oó]digo|descuento|subtotal m[ií]nimo|vigencia|venci[oó]|usos|promoci[oó]n/i.test(String(message || ''))
}

function handleProofSelected(event) {
  proofUploadedUrl.value = ''
  checkoutError.value = ''
  const file = event.target.files?.[0] || null
  proofFile.value = null

  if (!file) return

  const fileType = String(file.type || '').toLowerCase()
  const fileExtension = String(file.name || '').split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_PROOF_TYPES.has(fileType) && !ALLOWED_PROOF_EXTENSIONS.has(fileExtension)) {
    checkoutError.value = 'El comprobante debe ser una imagen JPG, PNG, WebP, HEIC, BMP o TIFF. No se permiten videos, GIF ni PDF.'
    ui.error(checkoutError.value)
    event.target.value = ''
    return
  }

  if (file.size > MAX_PROOF_FILE_BYTES) {
    checkoutError.value = 'El comprobante no puede pesar más de 5 MB.'
    ui.error(checkoutError.value)
    event.target.value = ''
    return
  }

  proofFile.value = file
}

async function uploadProof() {
  if (!checkoutOk.value || !proofFile.value) return

  proofUploading.value = true
  checkoutError.value = ''
  try {
    const { data } = await pedidosApi.subirComprobante({
      pedidoId: checkoutOk.value.id,
      file: proofFile.value,
      email: null,
      codigo: checkoutOk.value.codigo,
      token: customerAuth.token,
    })
    proofUploadedUrl.value = data.comprobante_url
    ui.success('Comprobante subido correctamente.')
    proofSuccessModalOpen.value = true
  } catch (err) {
    checkoutError.value = err.response?.data?.error || 'No se pudo subir el comprobante.'
    ui.error(checkoutError.value)
  } finally {
    proofUploading.value = false
  }
}

async function copyAllTransferData() {
  if (!checkoutOk.value || !paymentConfig.value?.transfer) return

  const transfer = paymentConfig.value.transfer
  const payload = [
    `Pedido: ${checkoutOk.value.codigo}`,
    `Banco: ${transfer.bank_name || 'Por definir'}`,
    `Tipo: ${transfer.account_type || 'Por definir'}`,
    `Número: ${transfer.account_number || 'Por definir'}`,
    `Titular: ${transfer.account_holder || 'Bloomskin'}`,
    `RUT: ${transfer.account_rut || 'Por definir'}`,
    `Email: ${transfer.transfer_email || 'Por definir'}`,
    `Asunto/Referencia: ${checkoutOk.value.codigo}`,
    `Monto: ${fmt(checkoutOk.value.total_clp)}`,
  ].join('\n')

  try {
    await navigator.clipboard.writeText(payload)
    ui.success('Datos completos de transferencia copiados.')
  } catch {
    ui.error('No se pudieron copiar todos los datos.')
  }
}
function goToOrdersFromProofModal() {
  proofSuccessModalOpen.value = false
  cart.open = false
  router.push({ name: 'customer-account', hash: '#mis-pedidos' })
}

onBeforeUnmount(() => {
  if (timerInterval) window.clearInterval(timerInterval)
  if (shippingDebounce) clearTimeout(shippingDebounce)
  if (reservationSyncDebounce) clearTimeout(reservationSyncDebounce)
})
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(42, 24, 32, 0.38);
  z-index: 300;
  display: flex;
  justify-content: flex-end;
}

.drawer {
  width: 100%;
  max-width: 500px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #fffefe, #fff6f8);
  box-shadow: -12px 0 36px rgba(98, 45, 64, 0.12);
}

.drawer-header {
  padding: 22px 24px 16px;
  border-bottom: 1px solid #edd8df;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.drawer-eyebrow {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--rose);
  font-weight: 600;
}

.drawer-title {
  margin-top: 6px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px;
  line-height: 1;
  color: var(--dark);
}

.drawer-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 20px;
}

.drawer-steps {
  display: flex;
  gap: 10px;
  padding: 14px 24px 0;
}

.step-chip {
  border: 1px solid #ead7dd;
  border-radius: 999px;
  padding: 10px 14px;
  background: #fff;
  color: var(--text-muted);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.step-chip.active {
  background: var(--rose-dark);
  border-color: var(--rose-dark);
  color: #fff;
}

.step-chip.locked {
  opacity: 0.85;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 24px 24px;
  display: grid;
  gap: 18px;
}

.drawer-empty {
  flex: 1;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 12px;
  padding: 24px;
  color: var(--text-muted);
}

.cart-list,
.checkout-body {
  display: grid;
  gap: 16px;
}

.cart-item {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  gap: 14px;
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(191, 84, 122, 0.08);
}

.cart-item-img {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  overflow: hidden;
}

.cart-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cart-item-brand {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rose);
  font-weight: 600;
}

.cart-item-name {
  margin-top: 4px;
  color: var(--dark);
  line-height: 1.35;
}

.cart-item-tone {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-muted);
}

.cart-item-price {
  margin-top: 8px;
  color: var(--rose-dark);
  font-weight: 700;
}

.cart-item-side {
  display: grid;
  gap: 12px;
  align-content: space-between;
  justify-items: end;
}

.remove-btn,
.text-btn {
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 11px;
}

.qty-control {
  display: grid;
  grid-template-columns: repeat(3, 32px);
  align-items: center;
  border: 1px solid #ead7dd;
  border-radius: 999px;
  overflow: hidden;
  background: #fff;
}

.qty-control button {
  border: none;
  background: #fff;
  color: var(--rose-dark);
  height: 32px;
}

.qty-control span {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
}

.summary-card,
.checkout-panel {
  border: 1px solid #ead7dd;
  background: rgba(255, 255, 255, 0.88);
  border-radius: 24px;
  padding: 18px;
  display: grid;
  gap: 12px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--dark);
  font-size: 13px;
}

.summary-row.muted {
  color: var(--text-muted);
}

.summary-row.total,
.summary-banner strong {
  color: var(--rose-dark);
}

.summary-save {
  color: #54936c;
}

.summary-banner {
  display: grid;
  gap: 6px;
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(135deg, #fff7f9, #f8eef2);
  font-size: 12px;
  color: var(--text-muted);
}

.primary-btn,
.ghost-btn {
  border-radius: 999px;
  padding: 14px 16px;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.primary-btn {
  border: none;
  background: var(--rose-dark);
  color: #fff;
}

.primary-btn:disabled {
  opacity: .58;
  cursor: not-allowed;
  filter: grayscale(.08);
}

.ghost-btn {
  border: 1px solid #ead7dd;
  background: #fff;
  color: var(--dark-mid);
}

.whatsapp-btn {
  text-align: center;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.panel-copy {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.7;
}

.delivery-mode-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.delivery-mode-card {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
  text-align: left;
  padding: 14px 15px;
  border: 1px solid rgba(191, 84, 122, .16);
  border-radius: 18px;
  background: linear-gradient(135deg, #fff, #fff8fb);
  color: var(--dark);
  box-shadow: 0 12px 28px rgba(139, 63, 85, .06);
  transition: border-color .2s ease, background .2s ease, box-shadow .2s ease, transform .2s ease;
}

.delivery-mode-card:hover {
  transform: translateY(-1px);
  border-color: rgba(191, 84, 122, .32);
  box-shadow: 0 16px 34px rgba(139, 63, 85, .09);
}

.delivery-mode-card.active {
  border-color: rgba(191, 84, 122, .58);
  background: linear-gradient(135deg, #fff4f8, #fceaf1);
}

.delivery-radio {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid #e3c3ce;
  background: #fff;
  box-shadow: inset 0 0 0 4px #fff;
}

.delivery-mode-card.active .delivery-radio {
  border-color: var(--rose-dark);
  background: var(--rose-dark);
}

.delivery-copy {
  display: grid;
  gap: 4px;
}

.delivery-copy strong {
  font-size: 13px;
  color: var(--rose-dark);
}

.delivery-copy small {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.delivery-mode-card > strong,
.delivery-mode-card > span:not(.delivery-radio):not(.delivery-copy) {
  display: none;
}

.discount-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.discount-clear {
  min-width: 110px;
}

.panel-ok {
  color: #4a8a63;
  font-size: 12px;
}

.panel-error,
.field-error {
  color: #b54768;
  font-size: 12px;
}

.form-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr 1fr;
}

.field-block {
  display: grid;
  gap: 6px;
}

.field-block span {
  font-size: 12px;
  color: var(--dark-mid);
}

.full-span {
  grid-column: 1 / -1;
}

.form-grid input,
.form-grid textarea,
.form-grid select,
.proof-input {
  width: 100%;
  border: 1px solid #ead7dd;
  border-radius: 14px;
  background: #fff;
  padding: 12px 13px;
  font-size: 13px;
  outline: none;
}

.form-grid textarea {
  resize: vertical;
  font-family: inherit;
  min-height: 84px;
}

.login-panel strong,
.success-panel strong {
  font-size: 16px;
  color: var(--dark);
}

.login-panel p,
.success-panel p {
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.7;
}

.login-actions {
  display: grid;
  gap: 10px;
}

.transfer-grid {
  display: grid;
  grid-template-columns: 86px 1fr;
  gap: 10px 12px;
  font-size: 13px;
}

.transfer-grid span {
  color: var(--text-muted);
}

.transfer-grid strong {
  color: var(--dark);
  word-break: break-word;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.28s ease;
}

.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform 0.28s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer,
.drawer-leave-to .drawer {
  transform: translateX(100%);
}

.proof-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(42, 24, 32, 0.48);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 320;
}

.proof-modal {
  width: min(460px, 100%);
  border-radius: 28px;
  background: linear-gradient(180deg, #fffefe, #fff6f8);
  border: 1px solid rgba(191, 84, 122, 0.14);
  box-shadow: 0 24px 60px rgba(98, 45, 64, 0.16);
  padding: 28px 24px;
  display: grid;
  gap: 14px;
  text-align: center;
}

.proof-modal-tag {
  justify-self: center;
  border-radius: 999px;
  padding: 7px 12px;
  background: rgba(191, 84, 122, 0.1);
  color: var(--rose-dark);
  font-size: 10px;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.proof-modal h3 {
  font-family: 'Cormorant Garamond', serif;
  font-size: 34px;
  line-height: 1;
  color: var(--dark);
}

.proof-modal p {
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.8;
}

@media (max-width: 640px) {
  .drawer {
    max-width: none;
    width: 100vw;
  }

  .drawer-header,
  .drawer-body {
    padding-left: 16px;
    padding-right: 16px;
  }

  .drawer-header {
    padding-top: 18px;
    padding-bottom: 14px;
  }

  .drawer-title {
    font-size: 24px;
  }

  .drawer-steps {
    padding: 12px 16px 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .step-chip {
    width: 100%;
    text-align: center;
    padding: 10px 8px;
    letter-spacing: 0.05em;
  }

  .cart-item {
    grid-template-columns: 64px minmax(0, 1fr);
  }

  .cart-item-side {
    grid-column: 1 / -1;
    justify-items: stretch;
    align-content: start;
  }

  .remove-btn {
    justify-self: flex-end;
  }

  .qty-control {
    justify-self: flex-start;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .discount-row {
    grid-template-columns: 1fr;
  }

  .summary-card,
  .checkout-panel {
    padding: 16px;
    border-radius: 20px;
  }

  .reservation-panel strong,
  .success-panel strong {
    line-height: 1.35;
  }

  .panel-head,
  .summary-row,
  .login-actions {
    grid-template-columns: 1fr;
  }

  .panel-head,
  .summary-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .transfer-grid {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .transfer-grid strong {
    margin-bottom: 8px;
  }

  .primary-btn,
  .ghost-btn {
    width: 100%;
  }

  .proof-modal-backdrop {
    align-items: flex-end;
    padding: 12px;
  }

  .proof-modal {
    border-radius: 24px 24px 0 0;
    padding: 24px 18px;
  }

  .proof-modal h3 {
    font-size: 28px;
  }
}
</style>
