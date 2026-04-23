<template>
  <div class="catalog-page">
    <AnnouncementBar />
    <AppHeader
      v-model:search-term="searchQuery"
      :account-label="customerAuth.isAuthenticated ? 'Mi cuenta' : 'Entrar'"
      :cart-count="cart.count"
      @search-submit="syncRouteQuery"
      @account-click="handleAccountClick"
      @favorites-click="handleFavoritesClick"
      @cart-click="cart.openDrawer('cart')"
      @category-select="setCategory"
    />

    <section class="catalog-hero">
      <div>
        <div class="section-tag">Catalogo Bloomskin</div>
        <h1>Compra con filtros y busqueda real.</h1>
        <p>El buscador ahora es el mismo de la home y sincroniza la URL del catalogo.</p>
      </div>
      <div class="hero-metrics">
        <div class="metric-card"><span>Productos</span><strong>{{ filteredProducts.length }}</strong></div>
        <div class="metric-card"><span>Marcas</span><strong>{{ availableBrands.length }}</strong></div>
        <div class="metric-card"><span>Categorias</span><strong>{{ tabs.length - 1 }}</strong></div>
      </div>
    </section>

    <section class="catalog-shell">
      <div class="products-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab"
          :class="{ active: activeTab === tab.key }"
          @click="setCategory(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="filters-panel">
        <div class="filters-grid">
          <label class="filter-field">
            <span>Marca</span>
            <StoreSelect v-model="brandFilter" :options="brandOptions" />
          </label>
          <label class="filter-field">
            <span>Stock</span>
            <StoreSelect v-model="stockFilter" :options="stockOptions" />
          </label>
          <label class="filter-field">
            <span>Precio</span>
            <StoreSelect v-model="priceFilter" :options="priceOptions" />
          </label>
          <label class="filter-field">
            <span>Promocion</span>
            <StoreSelect v-model="badgeFilter" :options="badgeOptions" />
          </label>
          <label class="filter-field">
            <span>Orden</span>
            <StoreSelect v-model="sortBy" :options="sortOptions" />
          </label>
        </div>

        <div class="filters-footer">
          <div class="toolbar-meta">{{ filteredProducts.length }} productos</div>
          <button class="clear-btn" type="button" @click="resetFilters">Limpiar filtros</button>
        </div>
      </div>

      <div v-if="loading" class="loading-grid">
        <div v-for="n in 8" :key="n" class="skeleton-card"></div>
      </div>
      <div v-else-if="filteredProducts.length === 0" class="no-results">
        No encontramos productos con esa combinacion de filtros.
      </div>
      <div v-else class="products-grid">
        <ProductCard v-for="product in filteredProducts" :key="product.id" :producto="product" />
      </div>
    </section>

    <StoreFooter @category-select="setCategory" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { productosApi } from '../api/index.js'
import AppHeader from '../components/store/AppHeader.vue'
import ProductCard from '../components/store/ProductCard.vue'
import StoreFooter from '../components/store/StoreFooter.vue'
import StoreSelect from '../components/store/StoreSelect.vue'
import AnnouncementBar from '../components/ui/AnnouncementBar.vue'
import { useCartStore } from '../stores/cart.js'
import { useCustomerAuthStore } from '../stores/customerAuth.js'
import { useUiStore } from '../stores/ui.js'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const cart = useCartStore()
const customerAuth = useCustomerAuthStore()

const productos = ref([])
const loading = ref(true)
const searchQuery = ref('')
const activeTab = ref('todos')
const brandFilter = ref('all')
const stockFilter = ref('all')
const priceFilter = ref('all')
const badgeFilter = ref('all')
const sortBy = ref('featured')

const categoryOrder = ['Limpiadores', 'Tonicos', 'Esencias', 'Serums', 'Ampollas', 'Contorno de Ojos', 'Hidratantes', 'Protección Solar', 'Maquillaje', 'Extras']
const categoryAliases = { Tónicos: 'Tonicos', 'Protección Solar': 'Protección Solar' }

const tabs = computed(() => {
  const seen = new Set()
  const items = [{ key: 'todos', label: 'Todos' }]
  for (const product of productos.value) {
    const category = normalizeCategory(product.categoria)
    if (!category || seen.has(category)) continue
    seen.add(category)
    items.push({ key: category, label: category })
  }
  return items.sort((a, b) => {
    if (a.key === 'todos') return -1
    if (b.key === 'todos') return 1
    const aIndex = categoryOrder.indexOf(a.key)
    const bIndex = categoryOrder.indexOf(b.key)
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
  })
})

const availableBrands = computed(() => [...new Set(productos.value.map(product => product.marca).filter(Boolean))].sort((a, b) => a.localeCompare(b)))
const brandOptions = computed(() => [{ value: 'all', label: 'Todas las marcas' }, ...availableBrands.value.map(brand => ({ value: brand, label: brand }))])
const stockOptions = [{ value: 'all', label: 'Todo el stock' }, { value: 'in', label: 'Solo con stock' }, { value: 'low', label: 'Stock bajo' }, { value: 'out', label: 'Agotados' }]
const priceOptions = [{ value: 'all', label: 'Todos los precios' }, { value: 'under-15000', label: 'Hasta $15.000' }, { value: '15000-30000', label: '$15.000 a $30.000' }, { value: '30000-50000', label: '$30.000 a $50.000' }, { value: 'over-50000', label: 'Sobre $50.000' }]
const badgeOptions = [{ value: 'all', label: 'Todas las etiquetas' }, { value: 'hot', label: 'Mas vendidos' }, { value: 'new', label: 'Nuevos' }, { value: 'sale', label: 'Ofertas' }]
const sortOptions = [{ value: 'featured', label: 'Destacados' }, { value: 'price-asc', label: 'Precio: menor a mayor' }, { value: 'price-desc', label: 'Precio: mayor a menor' }, { value: 'name-asc', label: 'Nombre: A-Z' }, { value: 'brand-asc', label: 'Marca: A-Z' }, { value: 'reviews-desc', label: 'Mas reseñas' }]

const filteredProducts = computed(() => {
  let list = [...productos.value]
  if (activeTab.value !== 'todos') list = list.filter(product => normalizeCategory(product.categoria) === activeTab.value)
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.trim().toLowerCase()
    list = list.filter(product =>
      product.nombre.toLowerCase().includes(query) ||
      String(product.marca || '').toLowerCase().includes(query) ||
      normalizeCategory(product.categoria).toLowerCase().includes(query)
    )
  }
  if (brandFilter.value !== 'all') list = list.filter(product => product.marca === brandFilter.value)
  if (stockFilter.value === 'in') list = list.filter(product => Number(product.stock) > 0)
  else if (stockFilter.value === 'low') list = list.filter(product => Number(product.stock) > 0 && Number(product.stock) <= 5)
  else if (stockFilter.value === 'out') list = list.filter(product => Number(product.stock) === 0)
  if (priceFilter.value !== 'all') list = list.filter(product => matchesPriceFilter(Number(product.precio_clp), priceFilter.value))
  if (badgeFilter.value !== 'all') list = list.filter(product => product.badge === badgeFilter.value)
  sortProducts(list, sortBy.value)
  return list
})

onMounted(async () => {
  try {
    await customerAuth.refreshProfile()
    const { data } = await productosApi.listar()
    productos.value = data.map(product => ({ ...product, categoria: normalizeCategory(product.categoria) }))
    applyRouteFilters()
  } catch (error) {
    console.error(error)
    ui.error('No pudimos cargar el catalogo.')
  } finally {
    loading.value = false
  }
})

watch(() => route.query, applyRouteFilters)
watch([activeTab, searchQuery], () => {
  syncRouteQuery()
})

function applyRouteFilters() {
  const nextCategory = route.query.category ? normalizeCategory(String(route.query.category)) : 'todos'
  activeTab.value = tabs.value.some(tab => tab.key === nextCategory) ? nextCategory : 'todos'
  searchQuery.value = typeof route.query.q === 'string' ? route.query.q : ''
}

function syncRouteQuery() {
  const nextQuery = {}
  if (activeTab.value !== 'todos') nextQuery.category = activeTab.value
  if (searchQuery.value.trim()) nextQuery.q = searchQuery.value.trim()
  const currentCategory = typeof route.query.category === 'string' ? route.query.category : undefined
  const currentSearch = typeof route.query.q === 'string' ? route.query.q : undefined
  if (currentCategory === nextQuery.category && currentSearch === nextQuery.q) return
  router.replace({ name: 'catalog', query: nextQuery })
}

function setCategory(category) {
  activeTab.value = category
}

function handleAccountClick() {
  if (customerAuth.isAuthenticated) {
    router.push({ name: 'customer-account' })
    return
  }
  ui.openAuthModal('login')
}

function handleFavoritesClick() {
  if (customerAuth.isAuthenticated) {
    router.push({ name: 'customer-account', hash: '#favoritos' })
    return
  }
  ui.openAuthModal('login')
}

function resetFilters() {
  searchQuery.value = ''
  activeTab.value = 'todos'
  brandFilter.value = 'all'
  stockFilter.value = 'all'
  priceFilter.value = 'all'
  badgeFilter.value = 'all'
  sortBy.value = 'featured'
}

function normalizeCategory(category) {
  if (!category) return 'Sin categoria'
  return categoryAliases[category] || category
}

function matchesPriceFilter(price, filter) {
  if (filter === 'under-15000') return price <= 15000
  if (filter === '15000-30000') return price > 15000 && price <= 30000
  if (filter === '30000-50000') return price > 30000 && price <= 50000
  if (filter === 'over-50000') return price > 50000
  return true
}

function sortProducts(list, mode) {
  if (mode === 'price-asc') return list.sort((a, b) => a.precio_clp - b.precio_clp)
  if (mode === 'price-desc') return list.sort((a, b) => b.precio_clp - a.precio_clp)
  if (mode === 'name-asc') return list.sort((a, b) => a.nombre.localeCompare(b.nombre))
  if (mode === 'brand-asc') return list.sort((a, b) => a.marca.localeCompare(b.marca))
  if (mode === 'reviews-desc') return list.sort((a, b) => Number(b.resenas || 0) - Number(a.resenas || 0))
  const badgeScore = { hot: 3, sale: 2, new: 1 }
  return list.sort((a, b) => {
    const badgeDelta = (badgeScore[b.badge] || 0) - (badgeScore[a.badge] || 0)
    if (badgeDelta !== 0) return badgeDelta
    return Number(b.resenas || 0) - Number(a.resenas || 0)
  })
}
</script>

<style scoped>
.catalog-page {
  min-height: 100vh;
  background: #fffdfd;
}

.catalog-hero,
.catalog-shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px;
}

.catalog-hero {
  padding-top: 52px;
  display: grid;
  grid-template-columns: 1.15fr .85fr;
  gap: 28px;
  align-items: end;
}

.section-tag {
  display: inline-block;
  font-size: 10px;
  letter-spacing: .24em;
  text-transform: uppercase;
  color: var(--rose);
  font-weight: 700;
}

.catalog-hero h1 {
  margin-top: 10px;
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(40px, 5vw, 60px);
  line-height: 1;
}

.catalog-hero p {
  margin-top: 14px;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.8;
  max-width: 620px;
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.metric-card {
  padding: 22px;
  border-radius: 24px;
  background: linear-gradient(180deg, #fff8fa, #f8eef1);
  border: 1px solid #ead7dd;
}

.metric-card span {
  display: block;
  font-size: 10px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.metric-card strong {
  display: block;
  margin-top: 12px;
  font-size: 30px;
  color: var(--rose-dark);
}

.catalog-shell {
  padding-top: 30px;
  padding-bottom: 72px;
}

.products-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 24px;
  border-bottom: 1px solid #edd8df;
  overflow-x: auto;
}

.tab {
  background: none;
  border: none;
  padding: 12px 18px;
  white-space: nowrap;
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
}

.tab.active {
  color: var(--rose);
  border-bottom-color: var(--rose);
}

.filters-panel {
  padding: 22px;
  border: 1px solid #ead7dd;
  border-radius: 28px;
  background: linear-gradient(180deg, #fffdfd, #fff7f9);
  margin-bottom: 26px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-field span {
  font-size: 10px;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.filters-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: 18px;
}

.toolbar-meta {
  font-size: 12px;
  color: var(--dark-mid);
}

.clear-btn {
  border: 1px solid #dfbcc7;
  background: #fff;
  color: var(--rose-dark);
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 11px;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.products-grid,
.loading-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.skeleton-card {
  height: 380px;
  background: linear-gradient(90deg, var(--blush-light) 25%, #f9f0f3 50%, var(--blush-light) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 16px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.no-results {
  text-align: center;
  padding: 80px 0;
  color: var(--text-muted);
  font-size: 14px;
}

@media (max-width: 1180px) {
  .catalog-hero,
  .hero-metrics,
  .filters-grid,
  .products-grid,
  .loading-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .catalog-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .catalog-hero,
  .catalog-shell {
    padding-left: 20px;
    padding-right: 20px;
  }

  .hero-metrics,
  .filters-grid,
  .products-grid,
  .loading-grid {
    grid-template-columns: 1fr;
  }

  .filters-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
