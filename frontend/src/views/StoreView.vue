<template>
  <div>
    <AnnouncementBar />
    <AppHeader
      v-model:search-term="headerSearch"
      :account-label="customerAuth.isAuthenticated ? (customerAuth.user?.nombre || 'Mi cuenta') : 'Entrar'"
      :is-authenticated="customerAuth.isAuthenticated"
      :cart-count="cart.count"
      @search-submit="submitHeaderSearch"
      @account-click="handleAccountClick"
      @favorites-click="handleFavoritesClick"
      @cart-click="cart.openDrawer('cart')"
      @category-select="selectCategory"
    />

    <section class="hero">
      <div class="hero-left">
        <div class="hero-tag">{{ homeContent.hero.tag }}</div>
        <h1 class="hero-title">{{ homeContent.hero.title }}<br /><em>{{ homeContent.hero.emphasis }}</em></h1>
        <p class="hero-desc">
          {{ homeContent.hero.description }}
        </p>
        <div class="hero-btns">
          <a href="#mas-vendidos" class="btn-primary">{{ homeContent.hero.primary_cta_label }}</a>
          <RouterLink to="/catalogo" class="btn-outline">{{ homeContent.hero.secondary_cta_label }}</RouterLink>
        </div>
      </div>

      <div class="hero-right">
        <button
          v-for="tile in heroTiles"
          :key="tile.name"
          class="hero-tile"
          :class="`tile-${tile.name.toLowerCase().replaceAll(' ', '-')}`"
          type="button"
          @click="selectCategory(tile.name)"
        >
          <div class="tile-visual">
            <img v-if="tile.image_url" :src="tile.image_url" :alt="tile.label" class="tile-photo" />
            <div v-else :class="tile.shape"></div>
          </div>
          <div class="tile-name">{{ tile.label }}</div>
          <div class="tile-count">{{ tile.count }} productos</div>
        </button>
      </div>
    </section>

    <div class="promo-band">
      <div v-for="(promo, index) in homeContent.promoItems" :key="`promo-${index}`" class="promo-item">
        <div class="promo-icon" :class="{ 'promo-flag-icon': promoIconKey(promo.icon) === 'flag-kr' }" aria-hidden="true">
          <svg v-if="promoIconKey(promo.icon) === 'truck'" viewBox="0 0 24 24" class="promo-svg" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M3 7h11v8H3z" />
            <path d="M14 10h3l3 3v2h-6z" />
            <circle cx="7.5" cy="17.5" r="1.5" />
            <circle cx="17.5" cy="17.5" r="1.5" />
          </svg>
          <svg v-else-if="promoIconKey(promo.icon) === 'gift'" viewBox="0 0 24 24" class="promo-svg" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M4 9h16v11H4z" />
            <path d="M12 9v11" />
            <path d="M3 9h18v-3H3z" />
            <path d="M12 9H7.5a2.5 2.5 0 1 1 0-5c2.4 0 3.6 2.5 4.5 5Z" />
            <path d="M12 9h4.5a2.5 2.5 0 1 0 0-5C14.1 4 12.9 6.5 12 9Z" />
          </svg>
          <svg v-else-if="promoIconKey(promo.icon) === 'whatsapp'" viewBox="0 0 24 24" class="promo-svg" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M20 11.5a8 8 0 1 1-14.9 4L4 20l4.7-1.1A8 8 0 1 1 20 11.5Z" />
            <path d="M9 8.8c.2-.4.4-.4.7-.4h.6c.2 0 .4 0 .5.4l.6 1.6c.1.2.1.4 0 .6l-.5.8c-.1.2-.1.4 0 .6c.5.8 1.2 1.5 2 2c.2.1.4.1.6 0l.8-.5c.2-.1.4-.1.6 0l1.6.6c.4.1.4.3.4.5v.6c0 .3 0 .5-.4.7c-.6.3-1.3.5-2 .4c-1.1-.1-2.5-.8-3.9-2.2c-1.4-1.4-2.1-2.8-2.2-3.9c-.1-.7.1-1.4.4-2Z" />
          </svg>
          <svg v-else-if="promoIconKey(promo.icon) === 'flag-kr'" viewBox="0 0 64 64" class="flag-svg">
            <circle cx="32" cy="32" r="30" fill="#fff" />
            <path d="M32 18a14 14 0 0 1 0 28c-7.732 0-14-6.268-14-14s6.268-14 14-14Z" fill="#cd2e3a" />
            <path d="M32 46a14 14 0 0 1 0-28c7.732 0 14 6.268 14 14s-6.268 14-14 14Z" fill="#0047a0" />
            <path d="M26 25a7 7 0 0 0 12 7a7 7 0 0 1-12-7Z" fill="#0047a0" />
            <path d="M38 39a7 7 0 0 0-12-7a7 7 0 0 1 12 7Z" fill="#cd2e3a" />
            <g fill="#111">
              <rect x="11" y="16" width="10" height="2" rx="1" transform="rotate(-28 16 17)" />
              <rect x="12" y="20" width="10" height="2" rx="1" transform="rotate(-28 17 21)" />
              <rect x="13" y="24" width="10" height="2" rx="1" transform="rotate(-28 18 25)" />
              <rect x="41" y="39" width="10" height="2" rx="1" transform="rotate(-28 46 40)" />
              <rect x="42" y="43" width="10" height="2" rx="1" transform="rotate(-28 47 44)" />
              <rect x="43" y="47" width="10" height="2" rx="1" transform="rotate(-28 48 48)" />
              <rect x="41" y="16" width="10" height="2" rx="1" transform="rotate(28 46 17)" />
              <rect x="42" y="20" width="10" height="2" rx="1" transform="rotate(28 47 21)" />
              <rect x="43" y="24" width="10" height="2" rx="1" transform="rotate(28 48 25)" />
              <rect x="11" y="39" width="10" height="2" rx="1" transform="rotate(28 16 40)" />
              <rect x="12" y="43" width="10" height="2" rx="1" transform="rotate(28 17 44)" />
              <rect x="13" y="47" width="10" height="2" rx="1" transform="rotate(28 18 48)" />
            </g>
          </svg>
          <span v-else class="promo-fallback">{{ promo.title?.slice(0, 1) || 'B' }}</span>
        </div>
        <div class="promo-text"><strong>{{ promo.title }}</strong><span>{{ promo.copy }}</span></div>
      </div>
    </div>

    <section class="showcase-section showcase-section-centered" id="mas-vendidos">
      <div class="section-header section-header-centered">
        <div>
          <div class="section-tag">{{ homeContent.bestSellers.tag }}</div>
          <h2 class="section-title">{{ homeContent.bestSellers.title }}</h2>
          <p class="section-copy section-copy-centered">{{ homeContent.bestSellers.copy }}</p>
        </div>
        <RouterLink class="section-link" to="/catalogo">{{ homeContent.bestSellers.link_label }}</RouterLink>
      </div>

      <div class="showcase-grid">
        <ProductCard v-for="product in bestSellers" :key="product.id" :producto="product" />
      </div>
    </section>

    <div class="section-divider" aria-hidden="true"></div>

    <section class="editorial-section">
      <div class="section-header">
        <div class="section-tag">{{ homeContent.editorial.tag }}</div>
        <h2 class="section-title">{{ homeContent.editorial.title }}</h2>
        <p class="section-copy section-copy-centered">{{ homeContent.editorial.copy }}</p>
      </div>

      <div class="editorial-grid">
        <button
          v-for="(card, index) in homeContent.editorial.cards"
          :key="`editorial-${index}`"
          class="editorial-card"
          :class="`editorial-${card.tone || 'rose'}`"
          @click="selectCategory(card.category)"
        >
          <span class="editorial-kicker">{{ card.kicker }}</span>
          <strong>{{ card.title }}</strong>
          <p>{{ card.copy }}</p>
          <span class="editorial-link">{{ card.link_label }}</span>
        </button>
      </div>
    </section>

    <section class="showcase-section showcase-section-centered">
      <div class="section-header section-header-centered">
        <div>
          <div class="section-tag">{{ homeContent.newIn.tag }}</div>
          <h2 class="section-title">{{ homeContent.newIn.title }}</h2>
          <p class="section-copy section-copy-centered">{{ homeContent.newIn.copy }}</p>
        </div>
        <RouterLink class="section-link" to="/catalogo">{{ homeContent.newIn.link_label }}</RouterLink>
      </div>

      <div class="showcase-grid compact">
        <ProductCard v-for="product in newArrivals" :key="product.id" :producto="product" />
      </div>
    </section>

    <div class="section-divider" aria-hidden="true"></div>

    <section class="catalog-cta-section">
      <div class="catalog-cta-card">
        <div>
          <div class="section-tag">{{ homeContent.catalogCta.tag }}</div>
          <h2 class="section-title">{{ homeContent.catalogCta.title }}</h2>
          <p class="section-copy left">{{ homeContent.catalogCta.copy }}</p>
        </div>
        <RouterLink class="btn-primary" to="/catalogo">{{ homeContent.catalogCta.button_label }}</RouterLink>
      </div>
    </section>

    <div v-if="homeReviews.length" class="section-divider" aria-hidden="true"></div>

    <section v-if="homeReviews.length" class="home-reviews-section">
      <div class="section-header section-header-centered">
        <div>
          <div class="section-tag">Reseñas reales</div>
          <h2 class="section-title">Lo que cuentan las clientas</h2>
          <p class="section-copy section-copy-centered">
            Opiniones verificadas de compras entregadas, mostradas al azar para descubrir favoritos desde experiencias reales.
          </p>
        </div>
      </div>

      <div class="home-reviews-grid">
        <RouterLink
          v-for="review in homeReviews"
          :key="review.id"
          class="home-review-card"
          :to="{ name: 'product-detail', params: { id: review.producto_id } }"
        >
          <div class="home-review-top">
            <div>
              <span>{{ review.producto_marca }}</span>
              <strong>{{ review.producto_nombre }}</strong>
            </div>
            <StarRating :value="review.rating" />
          </div>
          <p>{{ review.contenido }}</p>
          <small>{{ review.cliente_nombre }}</small>
        </RouterLink>
      </div>
    </section>

    <div v-if="newsItems.length || newsLoading" class="section-divider" aria-hidden="true"></div>

    <section v-if="newsItems.length" class="news-section">
      <div class="section-header section-header-centered">
        <div>
          <div class="section-tag">K-Beauty News</div>
          <h2 class="section-title">Qué se está moviendo en Corea del Sur</h2>
          <p class="section-copy section-copy-centered">
            Noticias y señales de la industria coreana para entender lanzamientos, marcas y tendencias que hoy inspiran el skincare.
          </p>
        </div>
      </div>

      <div class="news-grid">
        <a
          v-for="item in newsItems"
          :key="item.url"
          class="news-card"
          :href="item.url"
          target="_blank"
          rel="noreferrer"
        >
          <span class="news-source">{{ item.source }}</span>
          <strong>{{ item.title }}</strong>
          <span class="news-link">Leer noticia</span>
        </a>
      </div>
    </section>

    <div v-else-if="newsLoading" class="news-loading">Cargando noticias de K-Beauty...</div>

    <div class="section-divider" aria-hidden="true"></div>

    <section class="newsletter-section">
      <div class="newsletter-tag">{{ homeContent.newsletter.tag }}</div>
      <h2 class="newsletter-title">{{ homeContent.newsletter.title }}<br /><em>{{ homeContent.newsletter.emphasis }}</em></h2>
      <p class="newsletter-sub">{{ homeContent.newsletter.copy }}</p>
      <div class="newsletter-form">
        <input v-model.trim="newsletterEmail" type="email" :placeholder="homeContent.newsletter.placeholder" />
        <button @click="suscribir" :disabled="newsletterLoading || suscritoOk">
          {{ suscritoOk ? 'Suscripción lista' : newsletterLoading ? 'Enviando...' : homeContent.newsletter.button_label }}
        </button>
      </div>
    </section>

    <StoreFooter />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { mensajesApi, newsApi, productosApi, resolveAssetUrl, reviewsApi, settingsApi } from '../api/index.js'
import AppHeader from '../components/store/AppHeader.vue'
import ProductCard from '../components/store/ProductCard.vue'
import StarRating from '../components/store/StarRating.vue'
import StoreFooter from '../components/store/StoreFooter.vue'
import AnnouncementBar from '../components/ui/AnnouncementBar.vue'
import { useCartStore } from '../stores/cart.js'
import { useCustomerAuthStore } from '../stores/customerAuth.js'
import { useUiStore } from '../stores/ui.js'

const router = useRouter()
const ui = useUiStore()
const cart = useCartStore()
const customerAuth = useCustomerAuthStore()

const productos = ref([])
const siteSettings = ref({
  home: {
    hero: {
      tag: 'Glow diario, ritual coreano',
      title: 'Descubre tu rutina de',
      emphasis: 'skincare coreano',
      description: 'Una selección curada de fórmulas coreanas para limpiar, hidratar, proteger y tratar tu piel con texturas ligeras, ingredientes nobles y resultados visibles.',
      primary_cta_label: 'Explorar favoritos',
      secondary_cta_label: 'Ver catálogo',
    },
    categoryTiles: [],
    promoItems: [
      { icon: 'truck', title: 'Envío gratis', copy: 'Sobre $49.990 en compras seleccionadas' },
      { icon: 'flag-kr', title: 'Originales de Corea', copy: 'Selección auténtica de K-Beauty' },
      { icon: 'gift', title: 'Hallazgos y favoritos', copy: 'Curaduría pensada para cada rutina' },
      { icon: 'whatsapp', title: 'Asesoría por WhatsApp', copy: 'Te ayudamos a elegir según tu piel' },
    ],
    bestSellers: {
      tag: 'Best Sellers',
      title: 'Favoritos Bloomskin',
      copy: 'Los esenciales que más buscan nuestras clientas para una rutina simple, efectiva y rica de usar.',
      link_label: 'Ver catálogo',
    },
    editorial: {
      tag: 'Descubre por necesidad',
      title: 'Explora la tienda como una rutina',
      copy: 'Explora por necesidad y encuentra texturas, beneficios e ingredientes que sí hacen sentido para tu piel.',
      cards: [
        { kicker: 'Rutina base', title: 'Empieza por una limpieza suave', copy: 'Espumas, geles y básicos suaves para empezar una rutina coreana sin complicarte.', link_label: 'Explorar limpiadores →', category: 'Limpiadores', tone: 'rose' },
        { kicker: 'Uso diario', title: 'Protección solar que sí vas a querer usar', copy: 'Filtros ligeros, cómodos y amables con el maquillaje para todos los días.', link_label: 'Ver solares →', category: 'Protección Solar', tone: 'sage' },
        { kicker: 'Tratamiento', title: 'Serums para hidratación y glow', copy: 'Serums para hidratación, luminosidad, textura y manchas con una selección más clara y útil.', link_label: 'Ir a serums →', category: 'Serums', tone: 'cream' },
      ],
    },
    newIn: {
      tag: 'New In',
      title: 'Novedades y hallazgos',
      copy: 'Novedades, lanzamientos y fórmulas que están marcando tendencia en el universo K-Beauty.',
      link_label: 'Ver novedades',
    },
    catalogCta: {
      tag: 'Catálogo completo',
      title: 'Explora todo el universo Bloomskin',
      copy: 'Filtra por categoría, marca, precio, stock y promociones para encontrar lo que tu rutina necesita.',
      button_label: 'Abrir catálogo',
    },
    newsletter: {
      tag: 'Únete a la comunidad',
      title: 'Tips de K-Beauty y',
      emphasis: 'novedades exclusivas',
      copy: 'Suscríbete para recibir lanzamientos, rituales, favoritos coreanos y ofertas especiales.',
      placeholder: 'tu@email.com',
      button_label: 'Suscribirme',
    },
  },
})
const headerSearch = ref('')
const newsletterEmail = ref('')
const newsletterLoading = ref(false)
const suscritoOk = ref(false)
const newsItems = ref([])
const newsLoading = ref(false)
const homeReviews = ref([])

const categoryAliases = {
  'Tónicos': 'Tonicos',
  'Protección Solar': 'Protección Solar',
}

const tileStyles = ['bottle1', 'bottle2', 'bottle3', 'bottle4']
const homeContent = computed(() => siteSettings.value.home)

const heroTiles = computed(() => {
  const counts = productos.value.reduce((acc, product) => {
    const category = normalizeCategory(product.categoria)
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {})

  return ['Serums', 'Hidratantes', 'Limpiadores', 'Protección Solar']
    .map((category, index) => {
      const config = homeContent.value.categoryTiles.find(tile => normalizeCategory(tile.category) === category)
      return {
        name: category,
        label: config?.label || category,
        count: counts[category] || 0,
        shape: tileStyles[index % tileStyles.length],
        image_url: resolveAssetUrl(config?.image_url || ''),
      }
    })
    .filter(tile => tile.count)
})

const bestSellers = computed(() => {
  const badgeScore = { hot: 3, sale: 2, new: 1 }
  return [...productos.value]
    .sort((a, b) => {
      const badgeDelta = (badgeScore[b.badge] || 0) - (badgeScore[a.badge] || 0)
      if (badgeDelta !== 0) return badgeDelta
      const reviewDelta = Number(b.resenas || 0) - Number(a.resenas || 0)
      if (reviewDelta !== 0) return reviewDelta
      return Number(b.stock || 0) - Number(a.stock || 0)
    })
    .slice(0, 4)
})

const newArrivals = computed(() => {
  const newItems = productos.value.filter(product => product.badge === 'new')
  if (newItems.length >= 4) return newItems.slice(0, 4)
  return [...productos.value].sort((a, b) => b.id - a.id).slice(0, 4)
})

const newsletterButtonLabel = computed(() => {
  if (suscritoOk.value) return 'Suscripcion lista'
  if (newsletterLoading.value) return 'Enviando...'
  return homeContent.value.newsletter.button_label
})

onMounted(async () => {
  window.addEventListener('focus', handleVisibilityRefresh)
  document.addEventListener('visibilitychange', handleVisibilityRefresh)
  await loadStoreData()
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', handleVisibilityRefresh)
  document.removeEventListener('visibilitychange', handleVisibilityRefresh)
})

async function loadStoreData() {
  try {
    const [, { data }, { data: settingsData }] = await Promise.all([
      customerAuth.refreshProfile(),
      productosApi.listar(),
      settingsApi.site(),
    ])
    productos.value = data.map(product => ({
      ...product,
      categoria: normalizeCategory(product.categoria),
    }))
    await loadHomeReviews()
    siteSettings.value = settingsData || siteSettings.value
    newsLoading.value = true
    try {
      const { data: newsData } = await newsApi.kbeauty()
      newsItems.value = Array.isArray(newsData?.items) ? newsData.items.slice(0, 4) : []
    } catch (newsError) {
      console.error('Error cargando noticias K-Beauty', newsError)
    } finally {
      newsLoading.value = false
    }
  } catch (error) {
    console.error('Error cargando home', error)
    ui.error('No pudimos cargar la portada. Intenta nuevamente.')
  }
}

async function handleVisibilityRefresh() {
  if (document.visibilityState && document.visibilityState !== 'visible') return
  try {
    const { data } = await productosApi.listar()
    productos.value = data.map(product => ({
      ...product,
      categoria: normalizeCategory(product.categoria),
    }))
    await loadHomeReviews()
  } catch (error) {
    console.error('No se pudo refrescar la portada', error)
  }
}

async function loadHomeReviews() {
  try {
    const { data } = await reviewsApi.home(6)
    homeReviews.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('No se pudieron cargar las reseñas del home', error)
    homeReviews.value = []
  }
}

function normalizeCategory(category) {
  if (!category) return 'Sin categoría'
  return categoryAliases[category] || category
}

function promoIconKey(icon) {
  return String(icon || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
}

function goToCatalog(category) {
  const query = category ? { category } : {}
  if (headerSearch.value) query.q = headerSearch.value
  router.push({ name: 'catalog', query })
}

function selectCategory(category) {
  goToCatalog(category)
}

function submitHeaderSearch() {
  goToCatalog()
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

async function suscribir() {
  if (!newsletterEmail.value) {
    ui.info('Ingresa tu email para suscribirte.')
    return
  }

  newsletterLoading.value = true

  try {
    await mensajesApi.suscribir(newsletterEmail.value)
    suscritoOk.value = true
    newsletterEmail.value = ''
    ui.success('Te sumaste a la comunidad. Revisa tu correo para futuras novedades.')
  } catch (error) {
    console.error(error)
    ui.error(error.response?.data?.error || 'No pudimos registrar tu email.')
  } finally {
    newsletterLoading.value = false
  }
}
</script>

<style scoped>
header { background: var(--white); border-bottom: 1px solid #edd8df; position: sticky; top: 0; z-index: 50; }
.header-inner { max-width: 1280px; margin: 0 auto; padding: 0 32px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; min-height: 80px; gap: 20px; }
.logo { text-align: center; display: inline-flex; justify-content: center; }
.logo-lockup { display: inline-flex; align-items: center; gap: 10px; }
.logo-image { width: 46px; height: 46px; object-fit: contain; display: block; filter: drop-shadow(0 8px 18px rgba(217,109,144,.12)); border-radius: 14px; }
.logo-wording { display: flex; flex-direction: column; align-items: flex-start; }
.logo-text { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 600; letter-spacing: .08em; color: var(--heart-deep); display: block; line-height: .9; }
.logo-sub { font-size: 8px; letter-spacing: .28em; color: var(--text-muted); text-transform: uppercase; display: block; margin-top: 4px; }
nav { display: flex; gap: 24px; }
.nav-link { background: none; border: none; font-size: 12px; font-weight: 500; letter-spacing: .1em; text-transform: uppercase; color: var(--dark-mid); padding: 4px 0; border-bottom: 1.5px solid transparent; transition: all .2s; }
.nav-link:hover { color: var(--rose); border-bottom-color: var(--rose); }
.header-right { display: flex; justify-content: flex-end; align-items: center; gap: 14px; }
.search-link { display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; min-width: 170px; border: 1px solid #e9d6dc; border-radius: 999px; background: linear-gradient(180deg,#fffafc,#fdf1f5); color: var(--text-muted); font-size: 12px; }
.search-link input { width: 100%; min-width: 0; border: none; background: transparent; outline: none; color: var(--dark); font-size: 12px; }
.search-link input::placeholder { color: var(--text-muted); }
.search-icon-btn { background: none; border: none; padding: 0; display: inline-flex; align-items: center; justify-content: center; }
.account-btn { min-width: 0; border: 1px solid rgba(139, 63, 85, 0.12); background: linear-gradient(135deg, #fff9fa, #f8eff1); border-radius: 999px; padding: 9px 14px; text-align: center; }
.account-copy strong { font-size: 11px; color: var(--rose-dark); letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
.icon-btn { background: none; border: none; color: var(--dark-mid); display: flex; align-items: center; transition: color .2s; position: relative; }
.icon-btn:hover { color: var(--rose); }
.cart-badge { position: absolute; top: -6px; right: -6px; background: var(--rose); color: white; border-radius: 50%; width: 16px; height: 16px; font-size: 9px; display: flex; align-items: center; justify-content: center; font-weight: 500; }
.hero { display: grid; grid-template-columns: 1.08fr .92fr; min-height: 560px; overflow: hidden; border-bottom: 1px solid rgba(139,63,85,.08); }
.hero-left { background: linear-gradient(135deg,#f9eaed,#f2d6de 50%,#e8c3cd); display: flex; flex-direction: column; justify-content: center; padding: 80px 72px; position: relative; overflow: hidden; }
.hero-left::before { content: ''; position: absolute; width: 320px; height: 320px; border-radius: 50%; background: rgba(196,100,122,.08); top: -80px; right: -80px; }
.hero-tag,.section-tag,.newsletter-tag { display: inline-block; font-size: 10px; letter-spacing: .25em; text-transform: uppercase; color: var(--rose); background: rgba(196,100,122,.12); padding: 5px 14px; border-radius: 20px; width: fit-content; font-weight: 500; }
.hero-title,.section-title,.newsletter-title { font-family: 'Cormorant Garamond', serif; font-size: 58px; font-weight: 300; line-height: 1.06; color: var(--dark); }
.hero-title em,.newsletter-title em { font-style: italic; color: var(--rose); }
.hero-desc,.section-copy,.newsletter-sub,.footer-about { font-size: 14px; color: var(--dark-mid); line-height: 1.8; }
.hero-desc { max-width: 380px; margin-top: 18px; }
.hero-btns { display: flex; gap: 14px; margin-top: 32px; flex-wrap: wrap; }
.btn-primary,.btn-outline { display: inline-flex; align-items: center; justify-content: center; border-radius: 2px; font-size: 12px; font-weight: 500; letter-spacing: .1em; text-transform: uppercase; padding: 13px 28px; }
.btn-primary { background: var(--rose-dark); color: #fff; border: none; }
.btn-outline { background: transparent; color: var(--rose-dark); border: 1.5px solid var(--rose-dark); }

.hero-right { background: #edd8df; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 3px; }
.hero-tile { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 28px 20px 24px; background: rgba(255,255,255,.25); border: none; text-align: center; }
.hero-tile:nth-child(1) { background: #f0dade; }
.hero-tile:nth-child(2) { background: #e8d0d8; }
.hero-tile:nth-child(3) { background: #d8c8cf; }
.hero-tile:nth-child(4) { background: #c8b8c0; }
.tile-visual { width: 150px; height: 190px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tile-photo { width: 177%; height: 177%; object-fit: contain; filter: drop-shadow(0 22px 34px rgba(139,63,85,.2)); }
.tile-hidratantes .tile-photo { width: 142%; height: 142%; transform: translateY(8px); }
.bottle1 { width: 50px; height: 110px; background: linear-gradient(180deg,#faf0f3,#f0d8e0); border-radius: 25px 25px 8px 8px; border: 1px solid rgba(196,100,122,.2); }
.bottle2 { width: 70px; height: 90px; background: linear-gradient(180deg,#fff,#f4ebe2); border-radius: 8px; border: 1px solid rgba(196,100,122,.15); }
.bottle3 { width: 55px; height: 100px; background: linear-gradient(180deg,#9db8a3,#7a9e83); border-radius: 6px 6px 10px 10px; }
.bottle4 { width: 80px; height: 80px; background: linear-gradient(135deg,#f9eaed,#f0d4da); border-radius: 50%; }
.tile-name { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--dark-mid); font-weight: 500; }
.tile-count { font-size: 11px; color: var(--text-muted); margin-top: 6px; }

.promo-band,.showcase-section,.editorial-section,.catalog-cta-section,.home-reviews-section,footer { max-width: 1280px; margin: 0 auto; padding-left: 32px; padding-right: 32px; }
.promo-band { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-top: 28px; }
.promo-item { background: var(--sage-light); border: 1px solid #c8dcc8; border-radius: 22px; padding: 18px 18px; display: flex; align-items: center; gap: 12px; }
.promo-icon { width: 40px; height: 40px; background: var(--sage); color: #335f4a; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.promo-flag-icon { padding: 0; overflow: hidden; }
.promo-svg { width: 20px; height: 20px; display: block; }
.promo-fallback { font-size: 13px; font-weight: 700; }
.flag-svg { width: 24px; height: 24px; display: block; }
.promo-text strong { display: block; font-size: 12px; }
.promo-text span { font-size: 12px; color: var(--text-muted); }

.showcase-section,.editorial-section,.catalog-cta-section,.home-reviews-section,.newsletter-section { padding-top: 58px; }
.section-header { text-align: center; }
.section-header.split { display: flex; justify-content: space-between; align-items: end; gap: 18px; text-align: left; }
.section-header-centered { display: grid; justify-items: center; text-align: center; gap: 10px; }
.showcase-section-centered { padding-top: 72px; }
.section-title { font-size: 50px; margin-top: 10px; }
.section-copy { margin-top: 14px; max-width: 560px; }
.section-copy-centered { margin-left: auto; margin-right: auto; text-align: center; }
.section-copy.left { max-width: 420px; }
.section-link { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: var(--rose-dark); }
.section-divider {
  width: min(180px, calc(100vw - 80px));
  height: 1px;
  margin: 26px auto 0;
  background: linear-gradient(90deg, transparent, rgba(191,84,122,.24), transparent);
  position: relative;
}
.section-divider::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f4dbe4;
  border: 1px solid rgba(191,84,122,.26);
  transform: translate(-50%, -50%);
}
.showcase-grid { margin-top: 24px; display: grid; grid-template-columns: repeat(4,1fr); gap: 22px; }

.editorial-grid { margin-top: 24px; display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
.editorial-card { min-height: 280px; border: 1px solid rgba(139,63,85,.08); border-radius: 30px; padding: 28px; display: flex; flex-direction: column; justify-content: end; gap: 12px; text-align: left; }
.editorial-card strong { font-family: 'Cormorant Garamond', serif; font-size: 34px; line-height: 1.05; color: var(--dark); }
.editorial-card p { color: var(--dark-mid); line-height: 1.7; }
.editorial-kicker,.editorial-link { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--rose); }
.editorial-rose { background: linear-gradient(160deg,#fbebf0,#f3d4dd); }
.editorial-sage { background: linear-gradient(160deg,#eef8f1,#d8eadb); }
.editorial-cream { background: linear-gradient(160deg,#fff8f1,#f2e1cf); }

.catalog-cta-card { padding: 28px; border-radius: 30px; background: linear-gradient(135deg,#fff5f8,#f7e9ee); border: 1px solid rgba(191,84,122,.1); display: flex; justify-content: space-between; align-items: end; gap: 18px; }

.home-reviews-grid { margin-top: 24px; display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; }
.home-review-card {
  min-height: 230px;
  display: grid;
  align-content: space-between;
  gap: 16px;
  padding: 24px;
  border-radius: 24px;
  background: #fff;
  border: 1px solid rgba(191,84,122,.12);
  box-shadow: 0 16px 36px rgba(139,63,85,.06);
  color: var(--dark);
}
.home-review-top { display: flex; justify-content: space-between; gap: 14px; align-items: start; }
.home-review-top span {
  display: block;
  font-size: 10px;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--rose);
}
.home-review-top strong {
  display: block;
  margin-top: 6px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 26px;
  line-height: 1.05;
}
.home-review-card p { color: var(--dark-mid); line-height: 1.75; }
.home-review-card small {
  font-size: 11px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--rose-dark);
}

.news-section { max-width: 1280px; margin: 0 auto; padding: 58px 32px 0; }
.news-grid { margin-top: 24px; display: grid; grid-template-columns: repeat(4,1fr); gap: 18px; }
.news-card {
  display: grid;
  gap: 12px;
  align-content: start;
  min-height: 220px;
  padding: 24px;
  border-radius: 26px;
  background: linear-gradient(160deg,#fff9fb,#f5e9ef);
  border: 1px solid rgba(191,84,122,.12);
  color: var(--dark);
}
.news-source {
  font-size: 10px;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--rose);
}
.news-card strong {
  font-family: 'Cormorant Garamond', serif;
  font-size: 30px;
  line-height: 1.08;
  font-weight: 500;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}
.news-link {
  font-size: 11px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--rose-dark);
}
.news-loading {
  max-width: 1280px;
  margin: 0 auto;
  padding: 22px 32px 0;
  color: var(--text-muted);
  text-align: center;
}

.newsletter-section { max-width: 920px; margin: 0 auto; padding-left: 32px; padding-right: 32px; padding-bottom: 72px; text-align: center; }
.newsletter-form { display: grid; grid-template-columns: 1fr auto; gap: 12px; margin-top: 22px; }
.newsletter-form input { border: 1px solid #ead7dd; border-radius: 999px; padding: 15px 18px; font-size: 13px; outline: none; }
.newsletter-form button { border: none; border-radius: 999px; padding: 15px 22px; background: var(--rose-dark); color: #fff; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }

footer { padding-top: 36px; padding-bottom: 42px; }
.footer-top { display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; gap: 24px; padding-top: 18px; border-top: 1px solid rgba(139,63,85,.08); }
.footer-brand { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.footer-brand-heart { color: var(--rose); }
.footer-brand-text { font-family: 'Cormorant Garamond', serif; font-size: 30px; color: var(--rose-dark); }
.social-links { display: flex; gap: 10px; margin-top: 14px; }
.social-btn { width: 36px; height: 36px; border-radius: 50%; background: var(--blush-light); display: flex; align-items: center; justify-content: center; font-size: 12px; }
.footer-col h4 { margin-bottom: 12px; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: var(--dark-mid); }
.footer-col ul { list-style: none; display: grid; gap: 10px; }
.footer-col a,.footer-link { background: none; border: none; color: var(--text-muted); font-size: 13px; text-align: left; }
.footer-bottom { display: flex; justify-content: space-between; gap: 18px; margin-top: 26px; font-size: 12px; color: var(--text-muted); }

@media (max-width: 1080px) {
  .header-inner { grid-template-columns: 1fr; min-height: auto; padding: 16px 24px; }
  nav,.header-right { justify-content: center; flex-wrap: wrap; }
  .hero,.section-header.split,.catalog-cta-card,.footer-top { grid-template-columns: 1fr; display: grid; }
  .promo-band,.showcase-grid,.editorial-grid,.home-reviews-grid,.news-grid { grid-template-columns: repeat(2,1fr); }
}

@media (max-width: 720px) {
  .search-link { order: 3; width: 100%; justify-content: center; }
  .account-btn { flex: 1; }
  .hero-left,.promo-band,.showcase-section,.editorial-section,.catalog-cta-section,.home-reviews-section,footer,.newsletter-section,.news-section { padding-left: 20px; padding-right: 20px; }
  .hero-left { padding-top: 56px; padding-bottom: 56px; }
  .hero-title,.section-title,.newsletter-title { font-size: 42px; }
  .promo-band,.showcase-grid,.editorial-grid,.home-reviews-grid,.hero-right,.newsletter-form,.footer-top,.news-grid { grid-template-columns: 1fr; }
  .footer-bottom { flex-direction: column; }
}
</style>


