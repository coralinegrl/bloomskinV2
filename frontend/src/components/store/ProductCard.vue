<template>
  <div class="product-card" :class="{ 'out-of-stock': producto.stock === 0 }" @click="goToProduct">
    <div class="product-image" :class="producto.img_clase">
      <img
        v-if="hasRealImage"
        :src="producto.imagen_url"
        :alt="producto.nombre"
        class="product-photo"
        @error="imageBroken = true"
      >
      <div v-else class="product-placeholder">
        <div class="placeholder-orb"></div>
        <div class="placeholder-copy">
          <span class="placeholder-kicker">Bloomskin</span>
          <strong>{{ shortBrand }}</strong>
          <span>Imagen en actualizacion</span>
        </div>
      </div>
      <span v-if="producto.badge" class="product-badge" :class="`badge-${producto.badge}`">
        {{ badgeLabel }}
      </span>
      <button class="wishlist-btn" :aria-label="wishlisted ? 'Quitar de favoritos' : 'Agregar a favoritos'" @click.stop="toggleWishlist">{{ wishlisted ? '♥' : '♡' }}</button>
    </div>

    <div class="product-body">
      <div class="product-brand">{{ producto.marca }}</div>
      <div class="product-name">{{ producto.nombre }}</div>
      <div class="product-stars">
        <StarRating :value="producto.estrellas" />
        <span class="review-count">({{ producto.resenas }})</span>
      </div>
      <div class="product-price">
        <span class="price-current">{{ fmt(producto.precio_clp) }}</span>
        <span v-if="offerActive" class="price-old">{{ fmt(producto.precio_oferta_clp) }}</span>
      </div>
      <div v-if="producto.stock === 0" class="stock-out">Sin stock</div>
      <div v-else-if="producto.stock <= 5" class="stock-low">Solo {{ producto.stock }} disponibles</div>
      <button class="add-to-cart" :disabled="producto.stock === 0" @click.stop="agregar">
        {{ producto.stock === 0 ? 'Sin stock' : hasToneOptions ? 'Elegir tono' : 'Agregar al carro' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../../stores/cart.js'
import { useCustomerAuthStore } from '../../stores/customerAuth.js'
import { useUiStore } from '../../stores/ui.js'
import { useWishlistStore } from '../../stores/wishlist.js'
import StarRating from './StarRating.vue'

const props = defineProps({ producto: Object })
const router = useRouter()
const cart = useCartStore()
const customerAuth = useCustomerAuthStore()
const wishlist = useWishlistStore()
const ui = useUiStore()
const imageBroken = ref(false)

const hasRealImage = computed(() => Boolean(props.producto.imagen_url) && !imageBroken.value)
const wishlisted = computed(() => wishlist.isWishlisted(props.producto.id))
const hasToneOptions = computed(() => Boolean(props.producto.usa_tonos && props.producto.tonos?.length))
const offerActive = computed(() => {
  if (!props.producto.precio_oferta_clp) return false
  if (!props.producto.oferta_hasta) return true
  const end = new Date(`${String(props.producto.oferta_hasta).slice(0, 10)}T23:59:59`)
  return Number.isFinite(end.getTime()) && end.getTime() >= Date.now()
})

const shortBrand = computed(() => {
  const brand = props.producto.marca || 'Bloomskin'
  return brand.length > 18 ? `${brand.slice(0, 18)}...` : brand
})

const badgeLabel = computed(() => {
  const map = { hot: 'Más vendido', new: 'Nuevo', sale: 'Oferta' }
  return map[props.producto.badge] || ''
})

function fmt(n) {
  return '$' + Number(n).toLocaleString('es-CL')
}

function toggleWishlist() {
  if (!customerAuth.isAuthenticated) {
    ui.openAuthModal('login')
    return
  }
  void wishlist.toggle(props.producto)
}

function agregar() {
  if (hasToneOptions.value) {
    goToProduct()
    return
  }
  const existing = cart.items.find(item => item.id === props.producto.id)
  if (existing && existing.cantidad >= Number(props.producto.stock || 0)) {
    ui.info('Ya agregaste todo el stock disponible de este producto.')
    return
  }
  cart.agregar(props.producto)
}

function goToProduct() {
  router.push({ name: 'product-detail', params: { id: props.producto.id } })
}
</script>

<style scoped>
.product-card {
  background: var(--white);
  border: 1px solid #EDD8DF;
  border-radius: 4px;
  overflow: hidden;
  transition: transform .25s, box-shadow .25s;
  cursor: pointer;
  position: relative;
}
.product-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(139,63,85,.1); }

.product-image {
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.product-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.p-img-1 { background: linear-gradient(160deg,#F5E0E6,#ECC2CF); }
.p-img-2 { background: linear-gradient(160deg,#E5EEDF,#C8DDBF); }
.p-img-3 { background: linear-gradient(160deg,#FEF0E5,#F5D5B5); }
.p-img-4 { background: linear-gradient(160deg,#E8EAF8,#C8CDEF); }
.p-img-5 { background: linear-gradient(160deg,#F8E5EC,#EDBECC); }
.p-img-6 { background: linear-gradient(160deg,#E5F0F0,#BECECE); }
.p-img-7 { background: linear-gradient(160deg,#FBF0E0,#F0D5B0); }
.p-img-8 { background: linear-gradient(160deg,#F0E5F8,#D5BEEF); }

.product-placeholder {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 20% 18%, rgba(255,255,255,.55), transparent 28%),
    radial-gradient(circle at 80% 78%, rgba(255,255,255,.32), transparent 26%),
    linear-gradient(150deg, rgba(255,248,251,.96), rgba(245,226,233,.92));
}
.placeholder-orb {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #fff, #f3d3df 72%);
  box-shadow: 0 18px 32px rgba(164, 92, 118, .16);
}
.placeholder-copy {
  position: absolute;
  inset: auto 18px 18px 18px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255,255,255,.78);
  border: 1px solid rgba(180, 126, 145, .18);
  backdrop-filter: blur(8px);
  display: grid;
  gap: 4px;
  text-align: left;
}
.placeholder-kicker {
  font-size: 9px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--rose);
}
.placeholder-copy strong {
  font-family: 'Cormorant Garamond', serif;
  font-size: 24px;
  line-height: 1;
  color: var(--rose-dark);
}
.placeholder-copy span:last-child {
  font-size: 11px;
  color: var(--text-muted);
}

.product-badge {
  position: absolute; top: 12px; left: 12px;
  font-size: 9px; font-weight: 500; letter-spacing: .1em;
  text-transform: uppercase; padding: 4px 10px; border-radius: 2px; z-index: 2;
}
.badge-hot  { background: var(--dark); color: white; }
.badge-new  { background: var(--sage); color: #2A4A2E; }
.badge-sale { background: var(--rose-dark); color: white; }

.wishlist-btn {
  position: absolute; top: 12px; right: 12px;
  width: 40px; height: 40px; background: rgba(255,255,255,.94);
  border: 1px solid rgba(191,84,122,.14); border-radius: 50%; font-size: 19px;
  color: var(--rose-dark); box-shadow: 0 10px 18px rgba(139,63,85,.12);
  opacity: .94; transition: opacity .2s, transform .2s, box-shadow .2s; z-index: 3;
}
.product-card:hover .wishlist-btn { opacity: 1; transform: translateY(-1px); }
.wishlist-btn:active { transform: scale(.97); }
.wishlist-btn:hover { box-shadow: 0 12px 22px rgba(139,63,85,.16); }
.product-body { padding: 14px 16px 18px; }
.product-brand { font-size: 10px; letter-spacing: .15em; text-transform: uppercase; color: var(--rose); font-weight: 500; margin-bottom: 5px; }
.product-name  { font-size: 13px; color: var(--dark); line-height: 1.4; margin-bottom: 8px; }
.product-stars { display: flex; align-items: center; gap: 4px; margin-bottom: 10px; }
.review-count { font-size: 10px; color: var(--text-muted); }
.product-price { display: flex; align-items: baseline; gap: 8px; }
.price-current { font-size: 16px; font-weight: 500; color: var(--rose-dark); }
.price-old     { font-size: 12px; color: var(--text-muted); text-decoration: line-through; }
.stock-low  { font-size: 10px; color: #B85A00; font-weight: 500; margin-top: 4px; }
.stock-out  { font-size: 10px; color: #C4303A; font-weight: 500; margin-top: 4px; }
.add-to-cart {
  width: 100%; margin-top: 12px;
  background: var(--blush-light); color: var(--rose-dark);
  border: 1px solid var(--blush); padding: 9px; border-radius: 2px;
  font-size: 11px; font-weight: 500; letter-spacing: .08em;
  text-transform: uppercase; transition: all .2s;
}
.add-to-cart:hover:not(:disabled) { background: var(--rose-dark); color: white; border-color: var(--rose-dark); }
.add-to-cart:disabled { opacity: .5; cursor: not-allowed; }

@media (pointer: fine) {
  .wishlist-btn {
    opacity: 0;
  }

  .product-card:hover .wishlist-btn,
  .wishlist-btn:focus-visible {
    opacity: 1;
  }
}

@media (pointer: coarse), (max-width: 720px) {
  .wishlist-btn {
    opacity: 1;
    width: 44px;
    height: 44px;
    font-size: 20px;
  }
}
</style>
