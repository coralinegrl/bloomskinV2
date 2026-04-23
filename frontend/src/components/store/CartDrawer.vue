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
          <strong>Tu carrito esta vacio</strong>
          <p>Agrega productos desde la home o el catalogo para empezar una compra.</p>
          <button class="ghost-btn" type="button" @click="closeDrawer">Seguir comprando</button>
        </div>

        <template v-else>
          <div v-if="cart.view === 'cart'" class="drawer-body">
            <div class="cart-list">
              <article v-for="item in cart.items" :key="item.id" class="cart-item">
                <div class="cart-item-img" :class="item.img_clase">
                  <img v-if="item.imagen_url" :src="item.imagen_url" :alt="item.nombre" class="cart-photo" />
                </div>

                <div class="cart-item-main">
                  <div class="cart-item-brand">{{ item.marca }}</div>
                  <div class="cart-item-name">{{ item.nombre }}</div>
                  <div class="cart-item-price">{{ fmt(item.precio_clp) }}</div>
                </div>

                <div class="cart-item-side">
                  <button class="remove-btn" type="button" @click="cart.quitar(item.id)">Quitar</button>
                  <div class="qty-control">
                    <button type="button" @click="cart.cambiarCantidad(item.id, item.cantidad - 1)">-</button>
                    <span>{{ item.cantidad }}</span>
                    <button type="button" :disabled="item.cantidad >= Number(item.stock || 0)" @click="cart.cambiarCantidad(item.id, item.cantidad + 1)">+</button>
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
                <span>Envio</span>
                <span>Se calcula en checkout</span>
              </div>
              <div class="summary-banner">
                <strong>{{ cart.total >= 49990 ? 'Ya tienes envio gratis.' : `Te faltan ${fmt(49990 - cart.total)} para envio gratis.` }}</strong>
                <span>Antofagasta se calcula por distancia. Fuera de Antofagasta usamos Blue Express.</span>
              </div>
              <a class="ghost-btn whatsapp-btn" :href="whatsappUrl" target="_blank" rel="noreferrer">Hablar por WhatsApp</a>
              <button class="primary-btn" type="button" @click="openCheckoutStep">Continuar compra</button>
              <button class="ghost-btn" type="button" @click="closeDrawer">Seguir comprando</button>
            </div>
          </div>

          <div v-else class="drawer-body checkout-body">
            <div class="checkout-panel compact">
              <div class="panel-head">
                <strong>Resumen rapido</strong>
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
              <div class="summary-row">
                <span>Envio</span>
                <strong>{{ shippingValueLabel }}</strong>
              </div>
              <div class="summary-row total">
                <span>Total</span>
                <strong>{{ fmt(orderTotal) }}</strong>
              </div>
            </div>

            <div v-if="!customerAuth.isAuthenticated" class="checkout-panel login-panel">
              <strong>Necesitas iniciar sesion para continuar</strong>
              <p>El carrito ya esta listo. Abre el acceso en un modal y vuelves aqui al terminar.</p>
              <div class="login-actions">
                <button class="primary-btn" type="button" @click="ui.openAuthModal('login')">Iniciar sesion</button>
                <button class="ghost-btn" type="button" @click="ui.openAuthModal('register')">Crear cuenta</button>
              </div>
            </div>

            <template v-else-if="!checkoutOk">
              <div class="checkout-panel">
                <div class="panel-head">
                  <strong>Datos de envio</strong>
                  <button class="text-btn" type="button" :disabled="shippingLoading" @click="calculateShipping">
                    {{ shippingLoading ? 'Calculando...' : 'Recalcular envio' }}
                  </button>
                </div>

                <div class="form-grid">
                  <label class="field-block">
                    <span>Region</span>
                    <select v-model="shippingForm.region" :disabled="submitting || shippingLoading">
                      <option value="">Selecciona una region</option>
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
                    <span>Numero</span>
                    <input v-model.trim="shippingForm.number" type="text" placeholder="860" :disabled="submitting || shippingLoading" />
                  </label>

                  <label class="field-block">
                    <span>Depto / Oficina</span>
                    <input v-model.trim="shippingForm.apartment" type="text" placeholder="Depto 402" :disabled="submitting || shippingLoading" />
                  </label>

                  <label class="field-block">
                    <span>Referencia</span>
                    <input v-model.trim="shippingForm.reference" type="text" placeholder="Casa verde, porton negro" :disabled="submitting || shippingLoading" />
                  </label>
                </div>

                <p class="panel-copy">
                  Antofagasta se calcula por distancia desde Bloomskin. Fuera de Antofagasta usamos Blue Express por {{ fmt(3990) }}. Sobre {{ fmt(49990) }} el envio es gratis.
                </p>
                <p v-if="shippingQuote" class="panel-ok">
                  {{ shippingQuote.provider }} - {{ shippingQuote.tier_label }}
                  <span v-if="shippingQuote.distance_km !== null"> - {{ shippingQuote.distance_km }} km</span>
                </p>
                <p v-if="shippingError" class="panel-error">{{ shippingError }}</p>
              </div>

              <div class="checkout-panel">
                <strong>Datos de contacto y facturacion</strong>
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
                    <span>Telefono</span>
                    <input :value="profileForm.telefono" type="text" placeholder="+56 9 1234 5678" :disabled="submitting" @input="profileForm.telefono = formatPhoneInput($event.target.value)" />
                    <small v-if="profileErrors.telefono" class="field-error">{{ profileErrors.telefono }}</small>
                  </label>

                  <label class="field-block">
                    <span>Calle</span>
                    <input v-model.trim="profileForm.street" type="text" placeholder="Av. Grecia" :disabled="submitting" />
                    <small v-if="profileErrors.direccion" class="field-error">{{ profileErrors.direccion }}</small>
                  </label>

                  <label class="field-block">
                    <span>Numero</span>
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
                    <span>Region</span>
                    <select v-model="profileForm.region" :disabled="submitting">
                      <option value="">Selecciona una region</option>
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
                <strong>Pago por transferencia</strong>
                <p class="panel-copy">Creas el pedido, transfieres el total exacto y luego subes tu comprobante.</p>
                <p v-if="checkoutError" class="panel-error">{{ checkoutError }}</p>
                <a class="ghost-btn whatsapp-btn" :href="whatsappUrl" target="_blank" rel="noreferrer">Ayuda por WhatsApp</a>
                <button class="primary-btn" type="button" :disabled="submitting || shippingLoading || !shippingQuote" @click="handleCheckout">
                  {{ submitting ? 'Creando pedido...' : 'Crear pedido por transferencia' }}
                </button>
              </div>
            </template>

            <template v-else>
              <div class="checkout-panel success-panel">
                <strong>Pedido {{ checkoutOk.codigo }} creado</strong>
                <p>Transfiere {{ fmt(checkoutOk.total_clp) }} y luego sube tu comprobante.</p>
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
                  <span>Numero</span><strong>{{ paymentConfig?.transfer?.account_number || 'Por definir' }}</strong>
                  <span>Titular</span><strong>{{ paymentConfig?.transfer?.account_holder || 'Bloomskin' }}</strong>
                  <span>RUT</span><strong>{{ paymentConfig?.transfer?.account_rut || 'Por definir' }}</strong>
                  <span>Email</span><strong>{{ paymentConfig?.transfer?.transfer_email || 'Por definir' }}</strong>
                  <span>Total</span><strong>{{ fmt(checkoutOk.total_clp) }}</strong>
                </div>
                <p class="panel-copy">{{ paymentConfig?.transfer?.instructions }}</p>
              </div>

              <div class="checkout-panel">
                <strong>Sube tu comprobante</strong>
                <input class="proof-input" type="file" accept="image/*,.pdf" @change="handleProofSelected" :disabled="proofUploading" />
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
    </div>
  </Transition>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { pedidosApi, settingsApi } from '../../api/index.js'
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

const submitting = ref(false)
const shippingLoading = ref(false)
const proofUploading = ref(false)
const checkoutError = ref('')
const shippingError = ref('')
const checkoutOk = ref(null)
const checkoutNotas = ref('')
const paymentConfig = ref(null)
const shippingQuote = ref(null)
const proofFile = ref(null)
const proofUploadedUrl = ref('')
const whatsappUrl = ref('https://wa.me/569948418523')
let shippingDebounce = null

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

const currentStepLabel = computed(() => (cart.view === 'checkout' ? 'Checkout Bloomskin' : 'Tu seleccion'))
const currentTitle = computed(() => (cart.view === 'checkout' ? 'Carrito y envio' : `Tu carrito (${cart.count})`))
const displaySubtotal = computed(() => checkoutOk.value?.subtotal_clp || cart.total)
const orderTotal = computed(() => checkoutOk.value?.total_clp || (cart.total + (shippingQuote.value?.fee_clp || 0)))

const shippingValueLabel = computed(() => {
  if (checkoutOk.value) return fmt(checkoutOk.value.envio_clp)
  if (shippingLoading.value) return 'Calculando...'
  if (!shippingQuote.value) return 'Pendiente'
  if (shippingQuote.value.fee_clp === 0) return 'Gratis'
  return fmt(shippingQuote.value.fee_clp)
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
    if (checkoutOk.value || cart.view !== 'checkout') return
    clearTimeout(shippingDebounce)
    if (!customerAuth.isAuthenticated) return
    shippingDebounce = setTimeout(() => {
      calculateShipping()
    }, 600)
  }
)

watch(
  () => cart.open,
  async isOpen => {
    if (!isOpen) return
    checkoutError.value = ''
    proofUploadedUrl.value = ''
    proofFile.value = null
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
  },
  { immediate: true }
)

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('es-CL')
}

function closeDrawer() {
  cart.open = false
}

function openCheckoutStep() {
  if (!customerAuth.isAuthenticated) {
    ui.openAuthModal('login')
    return
  }
  cart.view = 'checkout'
}

async function calculateShipping() {
  if (!customerAuth.isAuthenticated || checkoutOk.value) return

  resetShippingErrors()
  const shippingPayload = buildShippingPayload(shippingForm)
  const shippingValidation = validateShippingAddress(shippingPayload)
  if (shippingValidation.errors.length) {
    shippingErrors.region = shippingValidation.errors.find(msg => msg.startsWith('Region')) || ''
    shippingErrors.city = shippingValidation.errors.find(msg => msg.startsWith('Ciudad')) || ''
    shippingErrors.direccion = shippingValidation.errors.find(msg => msg.startsWith('Direccion')) || ''
    shippingError.value = shippingValidation.errors[0]
    return
  }

  shippingLoading.value = true
  shippingError.value = ''
  try {
    const { data } = await pedidosApi.quoteShipping({
      ciudad: shippingValidation.normalized.ciudad,
      direccion: shippingValidation.normalized.direccion,
      subtotal_clp: cart.total,
    })
    shippingQuote.value = data
  } catch (err) {
    shippingQuote.value = null
    shippingError.value = err.response?.data?.error || 'No se pudo calcular el envio.'
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
    const profileValidation = validateCustomerProfile(profilePayload, { requirePassword: false })
    if (profileValidation.errors.length) {
      profileErrors.nombre = profileValidation.errors.find(msg => msg.startsWith('Nombre')) || ''
      profileErrors.rut = profileValidation.errors.find(msg => msg.startsWith('RUT')) || ''
      profileErrors.telefono = profileValidation.errors.find(msg => msg.startsWith('Telefono')) || ''
      profileErrors.direccion = profileValidation.errors.find(msg => msg.startsWith('Direccion')) || ''
      profileErrors.ciudad = profileValidation.errors.find(msg => msg.startsWith('Ciudad')) || ''
      profileErrors.region = profileValidation.errors.find(msg => msg.startsWith('Region')) || ''
      checkoutError.value = profileValidation.errors[0]
      return
    }

    const shippingPayload = buildShippingPayload(shippingForm)
    const shippingValidation = validateShippingAddress(shippingPayload)
    if (shippingValidation.errors.length) {
      shippingErrors.region = shippingValidation.errors.find(msg => msg.startsWith('Region')) || ''
      shippingErrors.city = shippingValidation.errors.find(msg => msg.startsWith('Ciudad')) || ''
      shippingErrors.direccion = shippingValidation.errors.find(msg => msg.startsWith('Direccion')) || ''
      checkoutError.value = shippingValidation.errors[0]
      return
    }

    if (!shippingQuote.value) {
      checkoutError.value = 'Primero calcula el envio.'
      return
    }

    const profileUpdated = await customerAuth.updateProfile(profileValidation.normalized)
    if (!profileUpdated) {
      checkoutError.value = customerAuth.error || 'No se pudo actualizar tu perfil antes de comprar.'
      return
    }

    const { data: pedido } = await pedidosApi.crearCliente({
      items: cart.items.map(item => ({ producto_id: item.id, cantidad: item.cantidad })),
      notas: checkoutNotas.value || null,
      metodo_pago: 'bank_transfer',
      region_envio: shippingValidation.normalized.region,
      ciudad_envio: shippingValidation.normalized.ciudad,
      direccion_envio: shippingValidation.normalized.direccion,
      referencia_envio: shippingValidation.normalized.referencia || null,
    })

    checkoutOk.value = pedido
    cart.vaciar()
    checkoutNotas.value = ''
    ui.success(`Tu pedido ${checkoutOk.value.codigo} fue creado. Ahora transfiere y sube tu comprobante.`)
  } catch (err) {
    checkoutError.value = err.response?.data?.error || 'No se pudo crear el pedido.'
    ui.error(checkoutError.value)
  } finally {
    submitting.value = false
  }
}

function handleProofSelected(event) {
  proofUploadedUrl.value = ''
  proofFile.value = event.target.files?.[0] || null
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
    `Numero: ${transfer.account_number || 'Por definir'}`,
    `Titular: ${transfer.account_holder || 'Bloomskin'}`,
    `RUT: ${transfer.account_rut || 'Por definir'}`,
    `Email: ${transfer.transfer_email || 'Por definir'}`,
    `Monto: ${fmt(checkoutOk.value.total_clp)}`,
  ].join('\n')

  try {
    await navigator.clipboard.writeText(payload)
    ui.success('Datos completos de transferencia copiados.')
  } catch {
    ui.error('No se pudieron copiar todos los datos.')
  }
}
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

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
