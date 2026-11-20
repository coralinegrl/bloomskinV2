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

      <section v-if="showFounder" class="founder-section" :class="{ 'has-photo': about.photo_url && !photoBroken }" aria-labelledby="founder-title">
        <figure v-if="about.photo_url && !photoBroken" class="founder-portrait">
          <img :src="about.photo_url" :alt="about.photo_alt || (about.founder_name ? `${about.founder_name}, detrás de Bloomskin` : 'La persona detrás de Bloomskin')" width="640" height="800" decoding="async" @error="photoBroken = true">
        </figure>
        <div class="founder-story">
          <span class="founder-eyebrow">Detrás de Bloomskin</span>
          <h2 id="founder-title">{{ about.founder_name || 'Una tienda con una historia propia' }}</h2>
          <p v-if="about.founder_bio">{{ about.founder_bio }}</p>
          <RouterLink to="/contacto" class="about-link">Conversemos</RouterLink>
        </div>
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
import { computed, onMounted, ref, watch } from 'vue'
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
const photoBroken = ref(false)
const about = ref({
  founder_name: '', founder_bio: '', photo_url: '', photo_alt: '',
  heading: 'Quiénes somos',
  intro: 'Bloomskin nace para acercar el skincare coreano a Chile con una selección curada, amable de comprar y pensada para la vida real.',
  body: 'Nos importan las fórmulas originales, las texturas que de verdad se disfrutan y una experiencia simple para descubrir productos sin sentir la tienda pesada. Curamos el catálogo, acompañamos por WhatsApp y buscamos que cada compra se sienta confiable, linda y clara de principio a fin.',
  signature: 'Curaduría real, ayuda cercana y una forma más humana de comprar K-Beauty.',
})
const showFounder = computed(() => Boolean(about.value.founder_name || about.value.founder_bio || (about.value.photo_url && !photoBroken.value)))
watch(() => about.value.photo_url, () => { photoBroken.value = false })

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
  background: var(--white);
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
  gap: 48px;
  padding: 32px 0;
}

.about-card {
  min-width: 0;
}

.story-card {
  padding-right: 12px;
}

.about-card h2 {
  font-family: 'Cormorant Garamond', serif;
  font-size: 34px;
  line-height: 1.2;
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
  padding: 12px 0;
  border-bottom: 1px solid var(--line-soft);
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
  border-radius: 6px;
  background: var(--rose-dark);
  color: #fff;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.founder-section { padding: 32px 0 48px; display: grid; gap: 32px; align-items: center; border-bottom: 1px solid var(--line-soft); }
.founder-section.has-photo { grid-template-columns: minmax(0, 320px) minmax(0, 1fr); gap: 48px; }
.founder-portrait { margin: 0; min-width: 0; }
.founder-portrait img { display: block; width: 100%; height: auto; aspect-ratio: 4 / 5; object-fit: contain; border-radius: 8px; }
.founder-story { min-width: 0; }
.founder-eyebrow { font-size: 14px; color: var(--rose-dark); }
.founder-story h2 { margin: 12px 0 20px; font-family: 'Cormorant Garamond', serif; font-size: 36px; line-height: 1.15; color: var(--dark); overflow-wrap: anywhere; }
.founder-story p { white-space: pre-line; overflow-wrap: anywhere; font-size: 16px; line-height: 1.8; color: var(--dark-mid); }
.about-card p, .about-hero p { white-space: pre-line; overflow-wrap: anywhere; }

@media (max-width: 900px) {
  .about-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .founder-section.has-photo { grid-template-columns: minmax(0, 1fr); gap: 28px; }
  .founder-portrait { width: min(100%, 320px); margin: 0 auto; }
  .founder-story h2 { font-size: 32px; }
  .about-main {
    padding: 28px 20px 0;
  }

  .about-hero h1 {
    font-size: 42px;
  }

  .about-card {
    padding: 0;
  }
}
</style>
