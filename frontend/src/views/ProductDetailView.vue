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
              <span v-if="producto.precio_oferta_clp" class="detail-price-old">{{ fmt(producto.precio_oferta_clp) }}</span>
            </div>

            <p class="detail-description">
              {{ producto.descripcion || 'Producto del catálogo Bloomskin disponible para compra online.' }}
            </p>

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
              <button class="add-btn" :disabled="producto.stock === 0" @click="addToCart">
                {{ producto.stock === 0 ? 'Sin stock' : 'Agregar al carrito' }}
              </button>
            </div>

            <div class="detail-notes">
              <div>Envío gratis sobre $49.990</div>
              <div>Compra con tu cuenta Bloomskin</div>
              <div>Catálogo sincronizado desde Bloomskin</div>
            </div>
          </div>
        </div>

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
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import StoreFooter from '../components/store/StoreFooter.vue'
import ProductCard from '../components/store/ProductCard.vue'
import StarRating from '../components/store/StarRating.vue'
import { productosApi } from '../api/index.js'
import { useCartStore } from '../stores/cart.js'
import { useUiStore } from '../stores/ui.js'

const route = useRoute()
const cart = useCartStore()
const ui = useUiStore()

const loading = ref(true)
const producto = ref(null)
const allProducts = ref([])
const qty = ref(1)
const imageBroken = ref(false)

const hasRealImage = computed(() => Boolean(producto.value?.imagen_url) && !imageBroken.value)

const relatedProducts = computed(() => {
  if (!producto.value) return []
  return allProducts.value
    .filter(item => item.id !== producto.value.id && item.categoria === producto.value.categoria)
    .slice(0, 4)
})

onMounted(async () => {
  try {
    const [{ data: detail }, { data: listing }] = await Promise.all([
      productosApi.obtener(route.params.id),
      productosApi.listar(),
    ])
    producto.value = detail
    allProducts.value = listing
  } catch (error) {
    console.error(error)
    ui.error('No pudimos cargar este producto.')
  } finally {
    loading.value = false
  }
})

function addToCart() {
  if (!producto.value) return
  const existing = cart.items.find(item => item.id === producto.value.id)
  const currentInCart = existing?.cantidad || 0
  if (currentInCart + qty.value > Number(producto.value.stock || 0)) {
    ui.info('No puedes agregar más unidades que el stock disponible.')
    qty.value = Math.max(1, Number(producto.value.stock || 1) - currentInCart)
    return
  }
  for (let i = 0; i < qty.value; i += 1) {
    cart.agregar(producto.value)
  }
  ui.success(`${producto.value.nombre} se agregó al carrito.`)
}

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('es-CL')
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
  .related-grid {
    grid-template-columns: 1fr;
  }
  .detail-card {
    position: static;
  }
}
</style>
