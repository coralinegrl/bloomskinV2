<template>
  <Teleport to="body">
    <Transition name="quick-view">
      <div v-if="product" class="quick-view-backdrop" @click.self="close">
        <article class="quick-view-modal" role="dialog" aria-modal="true" :aria-labelledby="titleId">
          <button class="quick-view-close" type="button" aria-label="Cerrar vista rápida" @click="close">×</button>

          <div class="quick-view-media" :class="product.img_clase">
            <img
              v-if="hasRealImage"
              :src="product.imagen_url"
              :alt="product.nombre"
              class="quick-view-photo"
              @error="imageBroken = true"
            >
            <div v-else class="quick-view-placeholder">
              <span>Bloomskin</span>
              <strong>{{ product.marca }}</strong>
              <small>Imagen en actualización</small>
            </div>
            <span v-if="product.badge" class="quick-view-badge">{{ badgeLabel }}</span>
          </div>

          <div class="quick-view-content">
            <div class="quick-view-kicker">{{ product.categoria || 'Bloomskin' }}</div>
            <h2 :id="titleId">{{ product.nombre }}</h2>
            <div class="quick-view-brand">{{ product.marca }}</div>

            <div class="quick-view-rating">
              <StarRating :value="product.estrellas" />
              <span>({{ product.resenas || 0 }} reseñas)</span>
            </div>

            <div class="quick-view-price">
              <strong>{{ fmt(product.precio_clp) }}</strong>
              <span v-if="offerActive">{{ fmt(product.precio_oferta_clp) }}</span>
            </div>

            <p class="quick-view-description">
              {{ product.descripcion || 'Producto Bloomskin disponible para compra online.' }}
            </p>

            <div v-if="hasToneOptions" class="quick-view-tones">
              <span>Tipo</span>
              <div class="quick-view-tone-grid">
                <button
                  v-for="tone in product.tonos"
                  :key="tone"
                  class="quick-view-tone"
                  :class="{ active: selectedTone === tone }"
                  type="button"
                  :disabled="toneStock(tone) === 0"
                  @click="selectTone(tone)"
                >
                  {{ tone }}
                  <small>{{ toneStock(tone) }} disp.</small>
                </button>
              </div>
            </div>

            <div class="quick-view-stock">
              <span>Disponibilidad</span>
              <strong>{{ availabilityLabel }}</strong>
            </div>

            <div class="quick-view-actions">
              <div class="quick-view-qty" aria-label="Cantidad">
                <button type="button" :disabled="qty <= 1" @click="qty = Math.max(1, qty - 1)">-</button>
                <span>{{ qty }}</span>
                <button type="button" :disabled="qty >= selectedStock" @click="qty = Math.min(selectedStock, qty + 1)">+</button>
              </div>
              <button class="quick-view-cart" type="button" :disabled="!canAddToCart" @click="addToCart">
                {{ selectedStock === 0 ? 'Sin stock' : 'Agregar al carrito' }}
              </button>
            </div>

            <button class="quick-view-detail" type="button" @click="goToDetail">
              Ver detalle completo
            </button>
          </div>
        </article>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../../stores/cart.js'
import { useUiStore } from '../../stores/ui.js'
import StarRating from './StarRating.vue'

const props = defineProps({
  product: {
    type: Object,
    default: null,
  },
})
const emit = defineEmits(['close'])

const router = useRouter()
const cart = useCartStore()
const ui = useUiStore()
const selectedTone = ref('')
const qty = ref(1)
const imageBroken = ref(false)
const titleId = `quick-view-title-${Math.random().toString(36).slice(2)}`

const hasRealImage = computed(() => Boolean(props.product?.imagen_url) && !imageBroken.value)
const hasToneOptions = computed(() => Boolean(props.product?.usa_tonos && props.product?.tonos?.length))
const selectedStock = computed(() => {
  if (!props.product) return 0
  if (!hasToneOptions.value) return Number(props.product.stock || 0)
  return toneStock(selectedTone.value)
})
const canAddToCart = computed(() => selectedStock.value > 0 && (!hasToneOptions.value || selectedTone.value))
const availabilityLabel = computed(() => {
  if (!props.product) return 'Sin stock'
  if (hasToneOptions.value) {
    if (!selectedTone.value) return 'Elige un tipo'
    return selectedStock.value > 0 ? `${selectedStock.value} disponible para ${selectedTone.value}` : `Sin stock para ${selectedTone.value}`
  }
  return selectedStock.value > 0 ? `${selectedStock.value} en stock` : 'Sin stock'
})
const offerActive = computed(() => {
  if (!props.product?.precio_oferta_clp) return false
  if (!props.product?.oferta_hasta) return true
  const end = new Date(`${String(props.product.oferta_hasta).slice(0, 10)}T23:59:59`)
  return Number.isFinite(end.getTime()) && end.getTime() >= Date.now()
})
const badgeLabel = computed(() => {
  const map = { hot: 'Más vendido', new: 'Nuevo', sale: 'Oferta' }
  return map[props.product?.badge] || ''
})

watch(
  () => props.product?.id,
  () => {
    imageBroken.value = false
    qty.value = 1
    selectedTone.value = firstAvailableTone(props.product)
  },
  { immediate: true }
)

watch(
  () => props.product,
  async product => {
    window.removeEventListener('keydown', handleKeydown)
    if (!product) {
      document.body.classList.remove('quick-view-lock')
      return
    }
    document.body.classList.add('quick-view-lock')
    window.addEventListener('keydown', handleKeydown)
    await nextTick()
  }
)

onBeforeUnmount(() => {
  document.body.classList.remove('quick-view-lock')
  window.removeEventListener('keydown', handleKeydown)
})

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('es-CL')
}

function toneStock(tone) {
  if (!tone) return 0
  return Math.max(0, Math.floor(Number(props.product?.tonos_stock?.[tone] || 0)))
}

function firstAvailableTone(product) {
  if (!product?.usa_tonos || !product?.tonos?.length) return ''
  return product.tonos.find(tone => Number(product.tonos_stock?.[tone] || 0) > 0) || product.tonos[0]
}

function selectTone(tone) {
  selectedTone.value = tone
  qty.value = 1
}

function addToCart() {
  if (!props.product || !canAddToCart.value) return
  const payload = hasToneOptions.value
    ? { ...props.product, tono_seleccionado: selectedTone.value, stock: selectedStock.value }
    : props.product

  const cartKey = `${payload.id}::${String(payload.tono_seleccionado || '')}`
  const existing = cart.items.find(item => item.cart_key === cartKey)
  if (existing && existing.cantidad + qty.value > selectedStock.value) {
    ui.info('Ya agregaste todo el stock disponible de este producto.')
    return
  }

  for (let index = 0; index < qty.value; index += 1) {
    cart.agregar(payload)
  }
  close()
}

function goToDetail() {
  if (!props.product) return
  const id = props.product.id
  close()
  router.push({ name: 'product-detail', params: { id } })
}

function close() {
  emit('close')
}

function handleKeydown(event) {
  if (event.key === 'Escape') close()
}
</script>

<style scoped>
.quick-view-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(45, 31, 38, .28);
  backdrop-filter: blur(8px);
}

.quick-view-modal {
  position: relative;
  width: min(960px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(300px, .95fr) minmax(320px, 1.05fr);
  background: #fff;
  border: 1px solid rgba(191, 84, 122, .14);
  border-radius: 28px;
  box-shadow: 0 32px 90px rgba(72, 38, 50, .22);
}

.quick-view-close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 2;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(191, 84, 122, .16);
  border-radius: 50%;
  background: rgba(255, 255, 255, .92);
  color: var(--rose-dark);
  font-size: 22px;
  line-height: 1;
}

.quick-view-media {
  min-height: 560px;
  position: relative;
  display: grid;
  place-items: center;
  background: #fbf2f5;
}

.quick-view-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.quick-view-placeholder {
  width: calc(100% - 48px);
  min-height: 300px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  border-radius: 24px;
  background: linear-gradient(145deg, #fff9fb, #f3dbe4);
  color: var(--rose-dark);
  text-align: center;
}

.quick-view-placeholder span {
  font-size: 10px;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: var(--rose);
}

.quick-view-placeholder strong {
  font-family: 'Cormorant Garamond', serif;
  font-size: 42px;
  line-height: 1;
}

.quick-view-placeholder small {
  color: var(--text-muted);
}

.quick-view-badge {
  position: absolute;
  top: 18px;
  left: 18px;
  padding: 7px 12px;
  border-radius: 999px;
  background: var(--dark);
  color: #fff;
  font-size: 10px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.quick-view-content {
  overflow: auto;
  padding: 42px 42px 36px;
}

.quick-view-kicker,
.quick-view-brand,
.quick-view-tones > span,
.quick-view-stock span {
  font-size: 11px;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--rose);
}

.quick-view-content h2 {
  margin-top: 10px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 42px;
  line-height: 1;
  color: var(--dark);
}

.quick-view-brand {
  margin-top: 10px;
  color: var(--dark-mid);
}

.quick-view-rating {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  color: var(--text-muted);
  font-size: 12px;
}

.quick-view-price {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 22px;
}

.quick-view-price strong {
  font-size: 28px;
  color: var(--rose-dark);
}

.quick-view-price span {
  color: var(--text-muted);
  text-decoration: line-through;
}

.quick-view-description {
  margin-top: 20px;
  color: var(--dark-mid);
  line-height: 1.75;
}

.quick-view-tones {
  margin-top: 22px;
}

.quick-view-tone-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.quick-view-tone {
  min-width: 78px;
  display: grid;
  gap: 3px;
  padding: 10px 14px;
  border: 1px solid #ead7dd;
  border-radius: 999px;
  background: #fff9fb;
  color: var(--rose-dark);
}

.quick-view-tone small {
  color: var(--text-muted);
  font-size: 10px;
}

.quick-view-tone.active {
  background: var(--rose-dark);
  border-color: var(--rose-dark);
  color: #fff;
}

.quick-view-tone.active small {
  color: rgba(255, 255, 255, .78);
}

.quick-view-tone:disabled {
  opacity: .45;
  cursor: not-allowed;
}

.quick-view-stock {
  margin-top: 22px;
  padding: 16px 0;
  border-top: 1px solid rgba(139, 63, 85, .08);
  border-bottom: 1px solid rgba(139, 63, 85, .08);
}

.quick-view-stock strong {
  display: block;
  margin-top: 6px;
  color: var(--dark);
}

.quick-view-actions {
  display: grid;
  grid-template-columns: 116px 1fr;
  gap: 14px;
  margin-top: 24px;
}

.quick-view-qty {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  height: 48px;
  overflow: hidden;
  border: 1px solid #ead7dd;
  border-radius: 999px;
}

.quick-view-qty button,
.quick-view-qty span {
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-view-qty button {
  border: none;
  background: #fff9fb;
  color: var(--rose-dark);
}

.quick-view-cart,
.quick-view-detail {
  min-height: 48px;
  border-radius: 999px;
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.quick-view-cart {
  border: none;
  background: var(--rose-dark);
  color: #fff;
}

.quick-view-cart:disabled,
.quick-view-qty button:disabled {
  opacity: .48;
  cursor: not-allowed;
}

.quick-view-detail {
  width: 100%;
  margin-top: 12px;
  border: 1px solid #dfbcc7;
  background: #fff;
  color: var(--rose-dark);
}

.quick-view-enter-active,
.quick-view-leave-active {
  transition: opacity .2s ease;
}

.quick-view-enter-active .quick-view-modal,
.quick-view-leave-active .quick-view-modal {
  transition: transform .22s ease, opacity .22s ease;
}

.quick-view-enter-from,
.quick-view-leave-to {
  opacity: 0;
}

.quick-view-enter-from .quick-view-modal,
.quick-view-leave-to .quick-view-modal {
  opacity: 0;
  transform: translateY(18px) scale(.98);
}

:global(body.quick-view-lock) {
  overflow: hidden;
}

@media (max-width: 820px) {
  .quick-view-backdrop {
    padding: 14px;
  }

  .quick-view-modal {
    grid-template-columns: 1fr;
    max-height: calc(100vh - 28px);
    overflow: auto;
  }

  .quick-view-media {
    min-height: 320px;
  }

  .quick-view-content {
    overflow: visible;
    padding: 28px 22px 24px;
  }

  .quick-view-content h2 {
    font-size: 34px;
  }

  .quick-view-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .quick-view-backdrop {
    align-items: stretch;
    padding: 0;
  }

  .quick-view-modal {
    width: 100%;
    max-height: 100dvh;
    border-radius: 0;
  }

  .quick-view-close {
    top: 12px;
    right: 12px;
  }

  .quick-view-media {
    min-height: 260px;
    max-height: 42dvh;
  }

  .quick-view-content {
    padding: 24px 18px 22px;
  }

  .quick-view-content h2 {
    font-size: 30px;
    line-height: 1.05;
  }

  .quick-view-price strong {
    font-size: 24px;
  }

  .quick-view-tone {
    min-width: 0;
    flex: 1 1 calc(50% - 10px);
  }

  .quick-view-cart,
  .quick-view-detail {
    min-height: 46px;
    padding-left: 14px;
    padding-right: 14px;
  }
}
</style>
