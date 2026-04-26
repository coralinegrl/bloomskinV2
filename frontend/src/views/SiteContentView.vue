<template>
  <div class="content-page">
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
    />

    <main class="content-main">
      <section class="content-hero">
        <div class="content-tag">Información Bloomskin</div>
        <h1>{{ page.title }}</h1>
        <p>{{ page.intro }}</p>
      </section>

      <section class="content-card">
        <p>{{ page.body }}</p>
        <div class="content-actions">
          <RouterLink class="ghost-btn" to="/catalogo">Volver al catálogo</RouterLink>
          <RouterLink class="primary-btn" to="/contacto">Hablar con Bloomskin</RouterLink>
        </div>
      </section>
    </main>

    <StoreFooter />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { settingsApi } from '../api/index.js'
import AppHeader from '../components/store/AppHeader.vue'
import StoreFooter from '../components/store/StoreFooter.vue'
import AnnouncementBar from '../components/ui/AnnouncementBar.vue'
import { useCartStore } from '../stores/cart.js'
import { useCustomerAuthStore } from '../stores/customerAuth.js'
import { useUiStore } from '../stores/ui.js'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const cart = useCartStore()
const customerAuth = useCustomerAuthStore()

const headerSearch = ref('')
const site = ref({
  legal: {
    shipping_policy: {
      title: 'Tiempos y condiciones de envío',
      intro: 'Despachamos desde Antofagasta y coordinamos cada pedido según destino y disponibilidad.',
      body: 'Antofagasta se calcula por distancia desde Bloomskin. Fuera de Antofagasta usamos Blue Express. Sobre $49.990 el envío es gratis cuando corresponda según la configuración vigente. Los tiempos pueden variar en días de alta demanda.',
    },
    returns_policy: {
      title: 'Cambios y devoluciones',
      intro: 'No realizamos cambios ni devoluciones por preferencia personal, aroma, textura o expectativas de uso.',
      body: 'En Bloomskin solo revisamos casos en que el producto llegue quebrado, abierto, derramado, con falla evidente de fábrica o en mal estado al momento de la entrega. Si ocurre, escríbenos apenas lo recibas con tu número de pedido, fotos claras del empaque y del producto, y una breve descripción. Evaluaremos cada caso y, si corresponde, ofreceremos reposición, nota de crédito o solución equivalente según stock y disponibilidad.',
    },
    shipping_conditions: {
      title: 'Condiciones de despacho',
      intro: 'Estas condiciones resumen cómo operan nuestros envíos dentro de Chile.',
      body: 'La clienta debe ingresar datos correctos y completos para evitar retrasos. Si eliges envío, la dirección debe estar bien escrita y con referencias útiles. Si eliges retiro coordinado, no necesitas completar dirección de despacho para ese pedido. Si el courier no logra entregar por dirección incompleta o ausencia reiterada, el pedido puede requerir coordinación adicional.',
    },
    terms_conditions: {
      title: 'Términos y condiciones',
      intro: 'Bloomskin opera como una tienda online de skincare coreano con stock limitado, curaduría propia y atención personalizada desde Chile.',
      body: 'Al comprar en Bloomskin, aceptas que la disponibilidad de productos, promociones, tiempos de preparación y formas de entrega pueden variar según stock, campañas activas y volumen operativo. Los pedidos por transferencia quedan sujetos a confirmación una vez recibido el comprobante dentro del plazo indicado en checkout. Nos reservamos el derecho de anular pedidos con datos incompletos, pagos no acreditados, errores manifiestos de precio o falta de stock sobreviniente, informándolo oportunamente a la clienta y ofreciendo la solución correspondiente. Todo el contenido, imágenes y textos del sitio son referenciales y buscan orientar mejor tu compra, sin reemplazar la lectura de ingredientes, indicaciones y precauciones propias de cada producto.',
    },
  },
})

const page = computed(() => {
  const key = route.meta.contentKey || 'shipping_policy'
  return site.value.legal?.[key] || site.value.legal.shipping_policy
})

function submitHeaderSearch() {
  router.push({
    name: 'catalog',
    query: headerSearch.value.trim() ? { q: headerSearch.value.trim() } : {},
  })
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

async function loadSite() {
  try {
    const { data } = await settingsApi.site()
    if (data) site.value = data
  } catch (error) {
    console.error('No se pudo cargar el contenido legal', error)
  }
}

watch(page, value => {
  document.title = `${value.title} | Bloomskin`
}, { immediate: true })

onMounted(loadSite)
</script>

<style scoped>
.content-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fffdfd, #fff5f8 22%, #fefcfd 100%);
}

.content-main {
  max-width: 1120px;
  margin: 0 auto;
  padding: 44px 28px 0;
}

.content-hero {
  text-align: center;
  max-width: 760px;
  margin: 0 auto 28px;
}

.content-tag {
  display: inline-flex;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(196, 100, 122, 0.12);
  color: var(--rose);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.content-hero h1 {
  margin-top: 12px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 56px;
  line-height: 1;
  color: var(--dark);
}

.content-hero p,
.content-card p {
  color: var(--dark-mid);
  line-height: 1.9;
  font-size: 15px;
}

.content-card {
  max-width: 860px;
  margin: 0 auto;
  padding: 34px;
  border-radius: 32px;
  background: linear-gradient(145deg, #fff7fa, #fffdfd);
  border: 1px solid rgba(191, 84, 122, 0.12);
  box-shadow: 0 16px 40px rgba(148, 89, 108, 0.08);
}

.content-actions {
  margin-top: 28px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.primary-btn,
.ghost-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 18px;
  border-radius: 999px;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.primary-btn {
  background: var(--rose-dark);
  color: #fff;
}

.ghost-btn {
  border: 1px solid rgba(191, 84, 122, 0.16);
  color: var(--rose-dark);
  background: #fff;
}

@media (max-width: 720px) {
  .content-main {
    padding: 28px 20px 0;
  }

  .content-hero h1 {
    font-size: 42px;
  }

  .content-card {
    padding: 24px 20px;
  }

  .content-actions {
    flex-direction: column;
  }

  .primary-btn,
  .ghost-btn {
    width: 100%;
  }
}
</style>
