<template>
  <div class="about-page">
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

    <main class="about-main">
      <section class="about-hero">
        <div class="about-tag">Nuestra historia</div>
        <h1>{{ about.heading }}</h1>
        <p>{{ about.intro }}</p>
      </section>

      <section class="about-layout">
        <article class="about-card story-card">
          <h2>La idea detrás de Bloomskin</h2>
          <p>{{ about.body }}</p>
          <blockquote>{{ about.signature }}</blockquote>
        </article>

        <article class="about-card values-card">
          <h2>Lo que cuidamos</h2>
          <ul class="value-list">
            <li>
              <strong>Curaduría real</strong>
              <span>Elegimos productos con criterio para que comprar sea más simple y confiable.</span>
            </li>
            <li>
              <strong>Originales de Corea</strong>
              <span>Priorizamos autenticidad, marcas con buena reputación y una experiencia de compra clara.</span>
            </li>
            <li>
              <strong>Acompañamiento cercano</strong>
              <span>Te orientamos por WhatsApp, postventa y contenido para que la rutina haga sentido en tu vida real.</span>
            </li>
          </ul>
          <RouterLink to="/contacto" class="about-link">Hablar con Bloomskin</RouterLink>
        </article>
      </section>
    </main>

    <StoreFooter />
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { settingsApi } from '../api/index.js'
import AppHeader from '../components/store/AppHeader.vue'
import StoreFooter from '../components/store/StoreFooter.vue'
import AnnouncementBar from '../components/ui/AnnouncementBar.vue'
import { useCartStore } from '../stores/cart.js'
import { useCustomerAuthStore } from '../stores/customerAuth.js'
import { useUiStore } from '../stores/ui.js'

const router = useRouter()
const ui = useUiStore()
const cart = useCartStore()
const customerAuth = useCustomerAuthStore()

const headerSearch = ref('')
const about = ref({
  heading: 'Quiénes somos',
  intro: 'Bloomskin nace para acercar el skincare coreano a Chile con una selección curada, amable de comprar y pensada para la vida real.',
  body: 'Nos importan las fórmulas originales, las texturas que de verdad se disfrutan y una experiencia simple para descubrir productos sin sentir la tienda pesada. Curamos el catálogo, acompañamos por WhatsApp y buscamos que cada compra se sienta confiable, linda y clara de principio a fin.',
  signature: 'Curaduría real, ayuda cercana y una forma más humana de comprar K-Beauty.',
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
    if (data?.about) about.value = { ...about.value, ...data.about }
  } catch (error) {
    console.error('No se pudo cargar la página Quiénes somos', error)
  }
}

watch(about, value => {
  document.title = `${value.heading} | Bloomskin`
}, { immediate: true, deep: true })

onMounted(loadSite)
</script>

<style scoped>
.about-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fffdfd, #fff5f8 20%, #fefcfd 100%);
}

.about-main {
  max-width: 1120px;
  margin: 0 auto;
  padding: 44px 28px 0;
}

.about-hero {
  text-align: center;
  max-width: 780px;
  margin: 0 auto 28px;
}

.about-tag {
  display: inline-flex;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(196, 100, 122, 0.12);
  color: var(--rose);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.about-hero h1 {
  margin-top: 12px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 56px;
  line-height: 1;
  color: var(--dark);
}

.about-hero p {
  margin-top: 16px;
  color: var(--dark-mid);
  font-size: 15px;
  line-height: 1.9;
}

.about-layout {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 18px;
}

.about-card {
  padding: 30px;
  border-radius: 32px;
  background: linear-gradient(145deg, #fff7fa, #fffdfd);
  border: 1px solid rgba(191, 84, 122, 0.12);
  box-shadow: 0 16px 40px rgba(148, 89, 108, 0.08);
}

.story-card {
  background: linear-gradient(145deg, #fef0f5, #fffdfd);
}

.about-card h2 {
  font-family: 'Cormorant Garamond', serif;
  font-size: 34px;
  color: var(--dark);
}

.about-card p {
  margin-top: 14px;
  color: var(--dark-mid);
  line-height: 1.9;
}

blockquote {
  margin-top: 24px;
  padding: 18px 20px;
  border-left: 3px solid var(--rose);
  background: rgba(196, 100, 122, 0.08);
  border-radius: 0 20px 20px 0;
  color: var(--rose-dark);
  font-size: 15px;
  line-height: 1.8;
}

.value-list {
  margin-top: 16px;
  display: grid;
  gap: 14px;
}

.value-list li {
  padding: 16px 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(191, 84, 122, 0.12);
}

.value-list strong {
  display: block;
  color: var(--rose-dark);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 11px;
}

.value-list span {
  display: block;
  margin-top: 8px;
  color: var(--dark-mid);
  line-height: 1.8;
}

.about-link {
  margin-top: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 18px;
  border-radius: 999px;
  background: var(--rose-dark);
  color: #fff;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

@media (max-width: 900px) {
  .about-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .about-main {
    padding: 28px 20px 0;
  }

  .about-hero h1 {
    font-size: 42px;
  }

  .about-card {
    padding: 24px 20px;
  }
}
</style>
