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
        <div class="content-tag">Informacion Bloomskin</div>
        <h1>{{ page.title }}</h1>
        <p>{{ page.intro }}</p>
      </section>

      <section class="content-card">
        <p>{{ page.body }}</p>
        <div class="content-actions">
          <RouterLink class="ghost-btn" to="/catalogo">Volver al catalogo</RouterLink>
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
      title: 'Tiempos y condiciones de envio',
      intro: 'Despachamos desde Antofagasta y coordinamos cada pedido segun destino y disponibilidad.',
      body: 'Antofagasta se calcula por distancia desde Bloomskin. Fuera de Antofagasta usamos Blue Express. Sobre $49.990 el envio es gratis cuando corresponda segun configuracion vigente. Los tiempos pueden variar en dias de alta demanda.',
    },
    returns_policy: {
      title: 'Cambios y devoluciones',
      intro: 'Si tu pedido llega con algun problema, escribenos para revisarlo caso a caso.',
      body: 'Aceptamos revisiones por productos danados, errores de preparacion o incidencias de transporte. Para evaluar un caso necesitaremos numero de pedido, fotos y contacto dentro del plazo informado por Bloomskin.',
    },
    shipping_conditions: {
      title: 'Condiciones de despacho',
      intro: 'Estas condiciones resumen como operan nuestros envios dentro de Chile.',
      body: 'La clienta debe ingresar datos correctos y completos para evitar retrasos. Si el courier no logra entregar por direccion incompleta o ausencia reiterada, el pedido puede requerir coordinacion adicional.',
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
