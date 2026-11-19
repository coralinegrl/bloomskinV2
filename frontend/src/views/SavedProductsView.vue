<template>
  <AppHeader v-model:search-term="headerSearch" :cart-count="cart.count" :is-authenticated="customerAuth.isAuthenticated" @search-submit="router.push({ name: 'catalog', query: { q: headerSearch } })" @category-select="category => router.push({ name: 'catalog', query: { category } })" @cart-click="cart.openDrawer()" @account-click="customerAuth.isAuthenticated ? router.push('/mi-cuenta') : ui.openAuthModal()" />
  <main class="saved-page"><RouterLink to="/catalogo">Volver al catálogo</RouterLink><h1>Tus favoritos</h1><p v-if="!products.length">Todavía no guardaste productos disponibles.</p><div class="saved-grid"><ProductCard v-for="product in products" :key="product.id" :producto="product" quick-view @quick-view="selected = $event" /></div><ProductQuickViewModal :product="selected" @close="selected = null" /></main>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useRouter } from 'vue-router'
import AppHeader from '../components/store/AppHeader.vue'
import { useCartStore } from '../stores/cart.js'
import { useCustomerAuthStore } from '../stores/customerAuth.js'
import { useUiStore } from '../stores/ui.js'
import { useWishlistStore } from '../stores/wishlist.js'
import { productosApi } from '../api/index.js'
import ProductCard from '../components/store/ProductCard.vue'
import ProductQuickViewModal from '../components/store/ProductQuickViewModal.vue'
const wishlist = useWishlistStore(), selected = ref(null)
const cart = useCartStore(), router = useRouter()
const customerAuth = useCustomerAuthStore(), ui = useUiStore(), headerSearch = ref('')
const catalog = ref(null)
const products = computed(() => catalog.value ? wishlist.items.map(item => catalog.value.find(product => Number(product.id) === Number(item.id))).filter(Boolean) : wishlist.items)
onMounted(async () => { try { catalog.value = (await productosApi.listar()).data } catch { ui.error('No pudimos actualizar precios y stock. Intenta nuevamente.') } })
</script>
<style scoped>
.saved-page { max-width: 1200px; margin: auto; padding: 28px 16px; } h1 { font-family: Georgia,serif; margin: 20px 0; font-size: 32px; }
.saved-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 16px; }
@media(max-width:800px){.saved-grid {grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}}
@media(max-width:359px){.saved-grid {grid-template-columns:minmax(0,1fr)}}
</style>
