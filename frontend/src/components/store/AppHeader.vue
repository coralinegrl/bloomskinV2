<template>
  <header class="app-header">
    <div class="header-inner">
      <div class="mobile-bar">
        <button ref="menuButton" class="mobile-menu-btn" type="button" :aria-expanded="mobileMenuOpen" aria-controls="store-navigation store-header-actions" :aria-label="mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'" :title="mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'" @click="mobileMenuOpen = !mobileMenuOpen">
          <X v-if="mobileMenuOpen" :size="20" aria-hidden="true" />
          <Menu v-else :size="20" aria-hidden="true" />
        </button>

        <RouterLink :to="homeTo" class="logo mobile-logo" @click="closeMobileMenu">
          <span class="logo-lockup">
            <img src="/brand/bloomskin-logo.png" alt="Bloomskin" class="logo-image" />
            <span class="logo-wording">
              <span class="logo-text">bloomskin</span>
              <span class="logo-sub">K-Beauty - Chile</span>
            </span>
          </span>
        </RouterLink>

        <div class="mobile-actions">
          <button class="icon-btn" type="button" aria-label="Favoritos" title="Favoritos" @click="$emit('favorites-click'); closeMobileMenu()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          <button class="icon-btn cart-btn" type="button" aria-label="Carrito" title="Carrito" @click="$emit('cart-click'); closeMobileMenu()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span v-if="cartCount > 0" class="cart-badge">{{ cartCount }}</span>
          </button>
        </div>
      </div>

      <nav id="store-navigation" class="header-nav" :class="{ open: mobileMenuOpen }" aria-label="Navegación principal">
        <RouterLink class="nav-link" :to="homeTo" @click="closeMobileMenu">Inicio</RouterLink>
        <RouterLink class="nav-link" :to="catalogTo" @click="closeMobileMenu">Catálogo</RouterLink>
        <RouterLink class="nav-link" to="/contacto" @click="closeMobileMenu">Contáctanos</RouterLink>
        <RouterLink class="nav-link" to="/quienes-somos" @click="closeMobileMenu">Quiénes somos</RouterLink>
        <RouterLink class="nav-link" to="/envios" @click="closeMobileMenu">Envíos</RouterLink>
      </nav>

      <RouterLink :to="homeTo" class="logo desktop-logo">
        <span class="logo-lockup">
          <img src="/brand/bloomskin-logo.png" alt="Bloomskin" class="logo-image" />
          <span class="logo-wording">
            <span class="logo-text">bloomskin</span>
            <span class="logo-sub">K-Beauty - Chile</span>
          </span>
        </span>
      </RouterLink>

      <div id="store-header-actions" class="header-right" :class="{ open: mobileMenuOpen }">
        <form class="search-bar" role="search" @submit.prevent="emitSearchSubmit">
          <button class="search-submit" type="submit" aria-label="Buscar" title="Buscar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
          <input
            :value="searchTerm"
            type="search"
            aria-label="Buscar productos"
            :placeholder="searchPlaceholder"
            @input="$emit('update:searchTerm', $event.target.value)"
            @keydown.enter.prevent="emitSearchSubmit"
          />
        </form>

        <button class="account-btn" type="button" :aria-label="isAuthenticated ? accountLabel : 'Ingresar o crear cuenta'" :title="isAuthenticated ? accountLabel : 'Ingresar o crear cuenta'" @click="$emit('account-click'); closeMobileMenu()">
          <span class="account-copy">
            <strong v-if="isAuthenticated">{{ accountLabel }}</strong>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="8" r="4" />
            </svg>
            <span v-if="!isAuthenticated" class="mobile-account-label">{{ accountLabel }}</span>
          </span>
        </button>

        <button class="icon-btn desktop-only" type="button" aria-label="Favoritos" title="Favoritos" @click="$emit('favorites-click')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        <button class="icon-btn cart-btn desktop-only" type="button" aria-label="Carrito" title="Carrito" @click="$emit('cart-click')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <span v-if="cartCount > 0" class="cart-badge">{{ cartCount }}</span>
        </button>

        <RouterLink v-if="showAdminLink" to="/admin/login" class="admin-link" title="Admin" @click="closeMobileMenu">Panel</RouterLink>
      </div>
    </div>
  </header>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Menu, X } from 'lucide-vue-next'

const props = defineProps({
  searchTerm: { type: String, default: '' },
  searchPlaceholder: { type: String, default: 'Buscar productos...' },
  accountLabel: { type: String, default: 'Entrar' },
  isAuthenticated: { type: Boolean, default: false },
  cartCount: { type: Number, default: 0 },
  homeTo: { type: [String, Object], default: '/' },
  catalogTo: { type: [String, Object], default: '/catalogo' },
  showAdminLink: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update:searchTerm',
  'search-submit',
  'account-click',
  'favorites-click',
  'cart-click',
  'category-select',
])

const mobileMenuOpen = ref(false)
const menuButton = ref(null)
const route = useRoute()

watch(() => route.fullPath, closeMobileMenu)
onMounted(() => document.addEventListener('keydown', dismissMobileMenu))
onBeforeUnmount(() => document.removeEventListener('keydown', dismissMobileMenu))

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

function dismissMobileMenu(event) {
  if (event.key !== 'Escape' || !mobileMenuOpen.value) return
  closeMobileMenu()
  menuButton.value?.focus()
}

function emitSearchSubmit() {
  emit('search-submit')
  closeMobileMenu()
}
</script>

<style scoped>
.app-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid #edd8df;
  position: sticky;
  top: 0;
  z-index: 50;
}

.header-inner {
  width: 100%;
  min-width: 0;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px;
  min-height: 82px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 20px;
}

.mobile-bar {
  display: none;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.nav-link {
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--dark-mid);
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1.5px solid transparent;
  transition: all 0.2s;
}

.nav-link:hover,
.nav-link.router-link-exact-active {
  color: var(--rose);
  border-bottom-color: var(--rose);
}

.logo {
  text-align: center;
  display: inline-flex;
  justify-content: center;
}

.logo-lockup {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.logo-image {
  width: 46px;
  height: 46px;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 8px 18px rgba(217, 109, 144, 0.12));
  border-radius: 14px;
}

.logo-wording {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}

.logo-text {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--heart-deep);
  display: block;
  line-height: 0.9;
}

.logo-sub {
  font-size: 8px;
  letter-spacing: 0.28em;
  color: var(--text-muted);
  text-transform: uppercase;
  display: block;
  margin-top: 4px;
}

.header-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 14px;
}

.mobile-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mobile-menu-btn {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 1px solid #ead7dd;
  background: linear-gradient(180deg, #fffafc, #fdf1f5);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--rose-dark);
  padding: 0 10px;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 170px;
  min-width: 170px;
  max-width: 170px;
  padding: 9px 14px;
  border-radius: 999px;
  border: 1px solid #e9d6dc;
  background: linear-gradient(180deg, #fffafc, #fdf1f5);
  color: var(--text-muted);
  flex: 0 0 170px;
}

.search-submit {
  background: none;
  border: none;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
}

.search-bar input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--dark);
  font-size: 12px;
}

.search-bar input::placeholder {
  color: var(--text-muted);
}

.search-bar:focus-within {
  outline: 2px solid var(--rose-dark);
  outline-offset: 2px;
}

.account-btn {
  min-width: 0;
  min-height: 44px;
  border: 1px solid rgba(139, 63, 85, 0.12);
  background: linear-gradient(135deg, #fff9fa, #f8eff1);
  border-radius: 999px;
  padding: 9px 14px;
  text-align: center;
}

.account-copy {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.mobile-account-label { display: none; }

.account-copy strong {
  font-size: 11px;
  color: var(--rose-dark);
  letter-spacing: 0.06em;
  white-space: nowrap;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.account-copy svg {
  color: var(--rose-dark);
  display: block;
}

.icon-btn {
  min-width: 44px;
  min-height: 44px;
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--dark-mid);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
  position: relative;
}

.icon-btn:hover {
  color: var(--rose);
}

.cart-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: var(--rose);
  color: white;
  border-radius: 50%;
  min-width: 17px;
  padding: 0 3px;
  height: 17px;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.admin-link {
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  transition: color 0.2s;
}

.admin-link:hover {
  color: var(--rose);
}

@media (max-width: 1180px) {
  .header-inner {
    grid-template-columns: auto minmax(0, 1fr);
    padding: 12px 24px 6px;
    gap: 6px 20px;
  }

  .desktop-logo { order: 1; }
  .header-nav { order: 3; grid-column: 1 / -1; justify-content: center; }
  .header-right {
    order: 2;
    min-width: 0;
  }
}

@media (max-width: 720px) {
  .header-inner {
    display: block;
    min-height: auto;
    padding: 12px 16px 16px;
  }

  .mobile-bar {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
  }

  .desktop-logo,
  .desktop-only {
    display: none;
  }

  .mobile-logo {
    justify-content: flex-start;
    min-width: 0;
  }

  .logo-image {
    width: 40px;
    height: 40px;
  }

  .logo-text {
    font-size: 22px;
  }

  .logo-sub {
    font-size: 7px;
    letter-spacing: 0.22em;
  }

  .header-nav {
    display: none;
  }

  .header-right { display: flex; }
  .header-right > :not(.search-bar) { display: none; }
  .header-right.open > .account-btn { display: block; }

  .header-nav.open,
  .header-right.open {
    display: flex;
  }

  .header-nav {
    margin-top: 14px;
    gap: 4px 14px;
    justify-content: flex-start;
    width: 100%;
  }

  .header-right {
    margin-top: 14px;
    width: 100%;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: flex-start;
  }

  .search-bar {
    order: -1;
    width: 100%;
    min-width: 0;
    max-width: none;
    flex: 1 1 100%;
    min-height: 44px;
  }

  .search-bar input { font-size: 16px; min-width: 0; }
  .search-submit { min-width: 28px; min-height: 28px; }
  .icon-btn { min-width: 44px; min-height: 44px; }
  .header-nav { display: none; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .header-nav.open { display: grid; }
  .nav-link { line-height: 1.4; }
  .logo-lockup { gap: 6px; }
  .mobile-actions { gap: 0; }
  .logo-sub { letter-spacing: 0; }

  @media (max-width: 360px) {
    .logo-image { width: 30px; height: 30px; }
    .logo-text { font-size: 18px; }
    .mobile-bar { gap: 4px; }
  }

  .account-btn {
    flex: 1 1 auto;
  }

  .mobile-account-label { display: inline; font-size: 14px; color: var(--rose-dark); }
}

@media (max-width: 420px) {
  .header-inner {
    padding-left: 12px;
    padding-right: 12px;
  }

  .mobile-bar {
    gap: 8px;
  }

  .logo-text {
    font-size: 20px;
  }

  .icon-btn,
  .mobile-menu-btn {
    min-width: 44px;
    min-height: 44px;
  }

  .header-nav.open {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .nav-link {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
}
</style>
