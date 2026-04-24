<template>
  <header class="app-header">
    <div class="header-inner">
      <div class="mobile-bar">
        <button class="mobile-menu-btn" type="button" :aria-expanded="mobileMenuOpen ? 'true' : 'false'" aria-label="Abrir menu" @click="mobileMenuOpen = !mobileMenuOpen">
          <span></span>
          <span></span>
          <span></span>
        </button>

        <RouterLink to="/" class="logo mobile-logo">
          <span class="logo-lockup">
            <img src="/brand/bloomskin-logo.png" alt="Bloomskin" class="logo-image" />
            <span class="logo-wording">
              <span class="logo-text">bloomskin</span>
              <span class="logo-sub">K-Beauty - Chile</span>
            </span>
          </span>
        </RouterLink>

        <div class="mobile-actions">
          <button class="icon-btn" type="button" aria-label="Favoritos" @click="$emit('favorites-click')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          <button class="icon-btn cart-btn" type="button" aria-label="Carrito" @click="$emit('cart-click')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span v-if="cartCount > 0" class="cart-badge">{{ cartCount }}</span>
          </button>
        </div>
      </div>

      <nav class="header-nav" :class="{ open: mobileMenuOpen }">
        <RouterLink class="nav-link" :to="homeTo" @click="closeMobileMenu">Inicio</RouterLink>
        <RouterLink class="nav-link" :to="catalogTo" @click="closeMobileMenu">Catalogo</RouterLink>
        <button class="nav-link" type="button" @click="emitCategory('Limpiadores')">Limpiadores</button>
        <button class="nav-link" type="button" @click="emitCategory('Serums')">Serums</button>
        <button class="nav-link" type="button" @click="emitCategory('Protección Solar')">Solar</button>
      </nav>

      <RouterLink to="/" class="logo desktop-logo">
        <span class="logo-lockup">
          <img src="/brand/bloomskin-logo.png" alt="Bloomskin" class="logo-image" />
          <span class="logo-wording">
            <span class="logo-text">bloomskin</span>
            <span class="logo-sub">K-Beauty - Chile</span>
          </span>
        </span>
      </RouterLink>

      <div class="header-right" :class="{ open: mobileMenuOpen }">
        <form class="search-bar" @submit.prevent="emitSearchSubmit">
          <button class="search-submit" type="submit" aria-label="Buscar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
          <input
            :value="searchTerm"
            type="text"
            :placeholder="searchPlaceholder"
            @input="$emit('update:searchTerm', $event.target.value)"
            @keydown.enter.prevent="emitSearchSubmit"
          />
        </form>

        <button class="account-btn" type="button" @click="$emit('account-click'); closeMobileMenu()">
          <span class="account-copy">
            <strong>{{ accountLabel }}</strong>
          </span>
        </button>

        <button class="icon-btn desktop-only" type="button" aria-label="Favoritos" @click="$emit('favorites-click')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        <button class="icon-btn cart-btn desktop-only" type="button" aria-label="Carrito" @click="$emit('cart-click')">
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
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  searchTerm: { type: String, default: '' },
  searchPlaceholder: { type: String, default: 'Buscar productos...' },
  accountLabel: { type: String, default: 'Entrar' },
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

watch(() => props.searchTerm, () => {
  mobileMenuOpen.value = false
})

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

function emitSearchSubmit() {
  emit('search-submit')
  closeMobileMenu()
}

function emitCategory(category) {
  emit('category-select', category)
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
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--dark-mid);
  padding: 4px 0;
  border-bottom: 1.5px solid transparent;
  transition: all 0.2s;
}

.nav-link:hover {
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
  filter: drop-shadow(0 8px 18px rgba(217,109,144,.12));
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
  line-height: .9;
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
  width: 42px;
  height: 42px;
  border-radius: 14px;
  border: 1px solid #ead7dd;
  background: linear-gradient(180deg, #fffafc, #fdf1f5);
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 0 10px;
}

.mobile-menu-btn span {
  display: block;
  width: 100%;
  height: 1.5px;
  border-radius: 999px;
  background: var(--rose-dark);
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

.account-btn {
  min-width: 0;
  border: 1px solid rgba(139, 63, 85, 0.12);
  background: linear-gradient(135deg, #fff9fa, #f8eff1);
  border-radius: 999px;
  padding: 9px 14px;
  text-align: center;
}

.account-copy strong {
  font-size: 11px;
  color: var(--rose-dark);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--dark-mid);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color .2s;
  position: relative;
}

.icon-btn:hover {
  color: var(--rose);
}

.cart-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--rose);
  color: white;
  border-radius: 50%;
  width: 17px;
  height: 17px;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.admin-link {
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--text-muted);
  transition: color .2s;
}

.admin-link:hover {
  color: var(--rose);
}

@media (max-width: 1180px) {
  .header-inner {
    grid-template-columns: 1fr;
    padding: 14px 24px;
  }

  .header-nav,
  .header-right {
    justify-content: center;
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
    letter-spacing: .22em;
  }

  .header-nav,
  .header-right {
    display: none;
  }

  .header-nav.open,
  .header-right.open {
    display: flex;
  }

  .header-nav {
    margin-top: 14px;
    gap: 10px 14px;
    justify-content: flex-start;
  }

  .header-right {
    margin-top: 14px;
    width: 100%;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: flex-start;
  }

  .search-bar {
    order: 4;
    width: 100%;
    min-width: 0;
    max-width: none;
    flex: 1 1 100%;
  }

  .account-btn {
    flex: 1 1 auto;
  }
}
</style>
