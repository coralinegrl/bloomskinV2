<template>
  <div class="not-found-page">
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

    <main class="not-found-main">
      <section class="not-found-hero">
        <div class="not-found-kicker">404</div>
        <h1>Página no encontrada</h1>
        <p>La ruta que abriste no existe o ya no está disponible.</p>
        <div class="not-found-actions">
          <RouterLink class="primary-btn" to="/catalogo">Ir al catálogo</RouterLink>
          <RouterLink class="ghost-btn" to="/">Volver al inicio</RouterLink>
        </div>
      </section>
    </main>

    <StoreFooter />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
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
</script>

<style scoped>
.not-found-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fffdfd, #fff5f8 30%, #fefcfd 100%);
}

.not-found-main {
  min-height: 52vh;
  display: grid;
  place-items: center;
  padding: 54px 24px;
}

.not-found-hero {
  width: min(760px, 100%);
  text-align: center;
}

.not-found-kicker {
  display: inline-flex;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(196, 100, 122, 0.12);
  color: var(--rose);
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.not-found-hero h1 {
  margin-top: 14px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 58px;
  line-height: 1;
  color: var(--dark);
}

.not-found-hero p {
  margin: 16px auto 0;
  max-width: 480px;
  color: var(--dark-mid);
  font-size: 15px;
  line-height: 1.8;
}

.not-found-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 28px;
}

.primary-btn,
.ghost-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 20px;
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
  .not-found-main {
    padding: 38px 20px;
  }

  .not-found-hero h1 {
    font-size: 42px;
  }

  .not-found-actions {
    flex-direction: column;
  }
}
</style>
