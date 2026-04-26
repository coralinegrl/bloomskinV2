<template>
  <div class="detail-page">
    <div class="detail-shell">
      <RouterLink to="/" class="back-link">← Volver al catálogo</RouterLink>

      <div v-if="loading" class="detail-loading">Cargando producto...</div>
      <div v-else-if="!producto" class="detail-empty">No pudimos encontrar este producto.</div>

      <template v-else>
        <div class="detail-grid">
          <div class="gallery-card">
            <div class="gallery-image" :class="producto.img_clase">
              <img
                v-if="hasRealImage"
                :src="producto.imagen_url"
                :alt="producto.nombre"
                class="gallery-photo"
                @error="imageBroken = true"
              >
              <div v-else class="gallery-fallback">
                <div class="fallback-orb"></div>
                <div class="fallback-copy">
                  <span>Bloomskin</span>
                  <strong>{{ producto.marca }}</strong>
                  <p>Imagen oficial en actualización.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="detail-card">
            <div class="detail-category">{{ producto.categoria }}</div>
            <h1>{{ producto.nombre }}</h1>
            <div class="detail-brand">{{ producto.marca }}</div>

            <div class="detail-rating">
              <StarRating :value="producto.estrellas" />
              <span>({{ producto.resenas || 0 }} reseñas)</span>
            </div>

            <div class="detail-price-row">
              <strong>{{ fmt(producto.precio_clp) }}</strong>
              <span v-if="offerActive" class="detail-price-old">{{ fmt(producto.precio_oferta_clp) }}</span>
            </div>

            <p class="detail-description">
              {{ producto.descripcion || 'Producto del catálogo Bloomskin disponible para compra online.' }}
            </p>

            <div v-if="hasToneOptions" class="tone-block">
              <span class="tone-label">Tipo</span>
              <div class="tone-grid">
                <button
                  v-for="tone in producto.tonos"
                  :key="tone"
                  class="tone-chip"
                  :class="{ active: selectedTone === tone }"
                  type="button"
                  @click="selectedTone = tone"
                >
                  {{ tone }}
                </button>
              </div>
            </div>

            <div class="detail-meta">
              <div><span>Categoría</span><strong>{{ producto.categoria }}</strong></div>
              <div><span>Disponibilidad</span><strong>{{ producto.stock > 0 ? `${producto.stock} en stock` : 'Sin stock' }}</strong></div>
            </div>

            <div class="detail-actions">
              <div class="qty-control">
                <button @click="qty = Math.max(1, qty - 1)">-</button>
                <span>{{ qty }}</span>
                <button :disabled="qty >= producto.stock" @click="qty = Math.min(producto.stock, qty + 1)">+</button>
              </div>
              <button class="add-btn" :disabled="producto.stock === 0 || (hasToneOptions && !selectedTone)" @click="addToCart">
                {{ producto.stock === 0 ? 'Sin stock' : 'Agregar al carrito' }}
              </button>
            </div>

            <div class="detail-notes">
              <div>Envío gratis sobre $49.990</div>
              <div>Compra con tu cuenta Bloomskin</div>
              <div>Selección original de K-Beauty</div>
            </div>
          </div>
        </div>

        <section class="reviews-section">
          <div class="reviews-head">
            <div>
              <div class="eyebrow">Reseñas verificadas</div>
              <h2>Opiniones de este producto</h2>
            </div>
            <span>{{ productReviews.length }} publicadas</span>
          </div>

          <div v-if="reviewsLoading" class="reviews-state">Cargando reseñas...</div>
          <div v-else-if="productReviews.length" class="reviews-grid">
            <article v-for="review in productReviews" :key="review.id" class="review-card">
              <div class="review-card-head">
                <div>
                  <strong>{{ review.cliente_nombre }}</strong>
                  <small>{{ formatReviewDate(review.creado_en) }}</small>
                </div>
                <StarRating :value="review.rating" />
              </div>
              <p>{{ review.contenido }}</p>
            </article>
          </div>
          <div v-else class="reviews-state">
            Aún no hay reseñas verificadas para este producto.
          </div>
        </section>

        <section v-if="relatedProducts.length" class="related-section">
          <div class="related-head">
            <div>
              <div class="eyebrow">Relacionados</div>
              <h2>Más en {{ producto.categoria }}</h2>
            </div>
          </div>
          <div class="related-grid">
            <ProductCard v-for="item in relatedProducts" :key="item.id" :producto="item" />
          </div>
        </section>

        <StoreFooter />
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import StoreFooter from '../components/store/StoreFooter.vue'
import ProductCard from '../components/store/ProductCard.vue'
import StarRating from '../components/store/StarRating.vue'
import { productosApi, reviewsApi } from '../api/index.js'
import { useCartStore } from '../stores/cart.js'
import { useUiStore } from '../stores/ui.js'

const route = useRoute()
const cart = useCartStore()
const ui = useUiStore()

const loading = ref(true)
const producto = ref(null)
const allProducts = ref([])
const productReviews = ref([])
const reviewsLoading = ref(false)
const qty = ref(1)
const imageBroken = ref(false)
const selectedTone = ref('')

const hasRealImage = computed(() => Boolean(producto.value?.imagen_url) && !imageBroken.value)
const hasToneOptions = computed(() => Boolean(producto.value?.usa_tonos && producto.value?.tonos?.length))
const offerActive = computed(() => {
  if (!producto.value?.precio_oferta_clp) return false
  if (!producto.value?.oferta_hasta) return true
  const end = new Date(`${String(producto.value.oferta_hasta).slice(0, 10)}T23:59:59`)
  return Number.isFinite(end.getTime()) && end.getTime() >= Date.now()
})

const relatedProducts = computed(() => {
  if (!producto.value) return []
  return allProducts.value
    .filter(item => item.id !== producto.value.id && item.categoria === producto.value.categoria)
    .slice(0, 4)
})

onMounted(async () => {
  window.addEventListener('focus', refreshProductData)
  document.addEventListener('visibilitychange', refreshProductData)
  await loadProductData()
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', refreshProductData)
  document.removeEventListener('visibilitychange', refreshProductData)
})

async function loadProductData() {
  try {
    const [{ data: detail }, { data: listing }] = await Promise.all([
      productosApi.obtener(route.params.id),
      productosApi.listar(),
    ])
    producto.value = detail
    allProducts.value = listing
    selectedTone.value = detail?.usa_tonos && detail?.tonos?.length ? detail.tonos[0] : ''
    await loadProductReviews()
  } catch (error) {
    console.error(error)
    ui.error('No pudimos cargar este producto.')
  } finally {
    loading.value = false
  }
}

async function refreshProductData() {
  if (document.visibilityState && document.visibilityState !== 'visible') return
  try {
    const [{ data: detail }, { data: listing }] = await Promise.all([
      productosApi.obtener(route.params.id),
      productosApi.listar(),
    ])
    producto.value = detail
    allProducts.value = listing
    await loadProductReviews()
    if (detail?.usa_tonos && detail?.tonos?.length) {
      if (!detail.tonos.includes(selectedTone.value)) selectedTone.value = detail.tonos[0]
    } else {
      selectedTone.value = ''
    }
  } catch (error) {
    console.error('No pudimos refrescar este producto.', error)
  }
}

async function loadProductReviews() {
  reviewsLoading.value = true
  try {
    const { data } = await reviewsApi.product(route.params.id)
    productReviews.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('No pudimos cargar las reseñas del producto.', error)
    productReviews.value = []
  } finally {
    reviewsLoading.value = false
  }
}

function addToCart() {
  if (!producto.value) return
  if (hasToneOptions.value && !selectedTone.value) {
    ui.info('Elige un tipo antes de agregar este producto.')
    return
  }
  const existing = cart.items.find(item =>
    item.id === producto.value.id
    && String(item.tono_seleccionado || '') === String(selectedTone.value || '')
  )
  const currentInCart = existing?.cantidad || 0
  if (currentInCart + qty.value > Number(producto.value.stock || 0)) {
    ui.info('No puedes agregar más unidades que el stock disponible.')
    qty.value = Math.max(1, Number(producto.value.stock || 1) - currentInCart)
    return
  }
  for (let i = 0; i < qty.value; i += 1) {
    cart.agregar({
      ...producto.value,
      tono_seleccionado: hasToneOptions.value ? selectedTone.value : null,
    })
  }
  ui.success(`${producto.value.nombre}${selectedTone.value ? ` · ${selectedTone.value}` : ''} se agregó al carrito.`)
}

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('es-CL')
}

function formatReviewDate(value) {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(value))
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fffafc 0%, #f7f1f3 100%);
}
.detail-shell {
  width: min(1180px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 28px 0 56px;
}
.back-link {
  display: inline-flex;
  margin-bottom: 24px;
  color: var(--rose-dark);
  font-size: 12px;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(380px, 460px);
  gap: 28px;
  align-items: start;
}
.gallery-card,
.detail-card {
  background: rgba(255,255,255,.82);
  border: 1px solid rgba(139,63,85,.08);
  border-radius: 28px;
  box-shadow: 0 20px 50px rgba(139,63,85,.08);
}
.gallery-card { padding: 18px; }
.gallery-image {
  min-height: 640px;
  border-radius: 22px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.gallery-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.gallery-fallback {
  width: 100%;
  height: 100%;
  position: relative;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 22% 20%, rgba(255,255,255,.55), transparent 26%),
    radial-gradient(circle at 78% 76%, rgba(255,255,255,.32), transparent 24%),
    linear-gradient(145deg, rgba(255,250,252,.98), rgba(243,226,232,.96));
}
.fallback-orb {
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #fff, #f2d3df 72%);
  box-shadow: 0 28px 50px rgba(164, 92, 118, .18);
}
.fallback-copy {
  position: absolute;
  inset: auto 28px 28px 28px;
  padding: 22px 24px;
  border-radius: 24px;
  background: rgba(255,255,255,.8);
  border: 1px solid rgba(180,126,145,.16);
  backdrop-filter: blur(10px);
}
.fallback-copy span {
  display: block;
  font-size: 10px;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: var(--rose);
}
.fallback-copy strong {
  display: block;
  margin-top: 10px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 36px;
  line-height: 1;
  color: var(--rose-dark);
}
.fallback-copy p {
  margin: 10px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}
.detail-card {
  padding: 32px;
  position: sticky;
  top: 96px;
}
.detail-category {
  font-size: 11px;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: var(--rose);
  font-weight: 600;
}
.detail-card h1 {
  margin: 10px 0 8px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 42px;
  line-height: 1.02;
  color: var(--dark);
}
.detail-brand {
  color: var(--dark-mid);
  font-size: 14px;
}
.detail-rating {
  display: flex;
  gap: 10px;
  margin: 18px 0;
  color: #b0843c;
  font-size: 13px;
}
.detail-price-row {
  display: flex;
  gap: 12px;
  align-items: baseline;
}
.detail-price-row strong {
  font-size: 34px;
  color: var(--rose-dark);
}
.detail-price-old {
  color: var(--text-muted);
  text-decoration: line-through;
}
.detail-description {
  margin: 18px 0 24px;
  color: var(--dark-mid);
  line-height: 1.7;
}
.tone-block {
  margin-bottom: 22px;
}
.tone-label {
  display: block;
  margin-bottom: 10px;
  font-size: 11px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--rose);
  font-weight: 600;
}
.tone-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.tone-chip {
  border: 1px solid rgba(191,84,122,.18);
  background: #fff;
  color: var(--rose-dark);
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 12px;
  line-height: 1;
}
.tone-chip.active {
  background: var(--rose-dark);
  border-color: var(--rose-dark);
  color: #fff;
}
.detail-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  padding: 18px 0 24px;
  border-top: 1px solid rgba(139,63,85,.08);
  border-bottom: 1px solid rgba(139,63,85,.08);
}
.detail-meta span {
  display: block;
  font-size: 11px;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.detail-meta strong {
  display: block;
  margin-top: 8px;
  color: var(--dark);
  font-size: 14px;
}
.detail-actions {
  display: grid;
  grid-template-columns: 112px 1fr;
  gap: 16px;
  margin-top: 24px;
}
.qty-control {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid #ead7dd;
  border-radius: 999px;
  overflow: hidden;
  height: 52px;
}
.qty-control button,
.qty-control span {
  display: flex;
  align-items: center;
  justify-content: center;
}
.qty-control button {
  background: #fff9fa;
  border: none;
  color: var(--rose-dark);
}
.add-btn {
  border: none;
  background: var(--rose-dark);
  color: white;
  border-radius: 999px;
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
}
.detail-notes {
  margin-top: 20px;
  display: grid;
  gap: 8px;
  color: var(--text-muted);
  font-size: 12px;
}
.reviews-section {
  margin-top: 38px;
}
.reviews-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: end;
}
.reviews-head h2 {
  margin-top: 8px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 42px;
  line-height: 1;
  color: var(--dark);
}
.reviews-head span {
  color: var(--text-muted);
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
}
.reviews-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}
.review-card,
.reviews-state {
  background: rgba(255,255,255,.82);
  border: 1px solid rgba(139,63,85,.08);
  border-radius: 24px;
  padding: 22px;
  box-shadow: 0 16px 38px rgba(139,63,85,.06);
}
.review-card-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: start;
}
.review-card strong {
  display: block;
  color: var(--rose-dark);
}
.review-card small,
.reviews-state {
  color: var(--text-muted);
}
.review-card p {
  margin-top: 14px;
  color: var(--dark-mid);
  line-height: 1.75;
}
.related-section {
  margin-top: 40px;
}
.related-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-top: 18px;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: var(--rose);
  font-weight: 600;
}

@media (max-width: 980px) {
  .detail-grid,
  .reviews-grid,
  .related-grid {
    grid-template-columns: 1fr;
  }
  .detail-card {
    position: static;
  }
}

@media (max-width: 640px) {
  .detail-shell {
    width: min(100vw, calc(100vw - 24px));
    padding: 18px 0 40px;
  }

  .gallery-card,
  .detail-card {
    border-radius: 22px;
  }

  .gallery-card {
    padding: 12px;
  }

  .gallery-image {
    min-height: 360px;
  }

  .fallback-orb {
    width: 160px;
    height: 160px;
  }

  .fallback-copy {
    inset: auto 16px 16px 16px;
    padding: 18px;
  }

  .fallback-copy strong {
    font-size: 28px;
  }

  .detail-card {
    padding: 22px 18px;
  }

  .detail-card h1 {
    font-size: 34px;
  }

  .detail-meta,
  .detail-actions,
  .related-grid {
    grid-template-columns: 1fr;
  }

  .detail-price-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .reviews-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
