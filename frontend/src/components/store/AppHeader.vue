<template>
  <header class="app-header">
    <div class="header-inner">
      <nav class="header-nav">
        <RouterLink class="nav-link" :to="homeTo">Inicio</RouterLink>
        <RouterLink class="nav-link" :to="catalogTo">Catalogo</RouterLink>
        <button class="nav-link" type="button" @click="$emit('category-select', 'Limpiadores')">Limpiadores</button>
        <button class="nav-link" type="button" @click="$emit('category-select', 'Serums')">Serums</button>
        <button class="nav-link" type="button" @click="$emit('category-select', 'Protección Solar')">Solar</button>
      </nav>

      <RouterLink to="/" class="logo">
        <span class="logo-lockup">
          <img src="/brand/bloomskin-logo.png" alt="Bloomskin" class="logo-image" />
          <span class="logo-wording">
            <span class="logo-text">bloomskin</span>
            <span class="logo-sub">K-Beauty - Chile</span>
          </span>
        </span>
      </RouterLink>

      <div class="header-right">
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

        <button class="account-btn" type="button" @click="$emit('account-click')">
          <span class="account-copy">
            <strong>{{ accountLabel }}</strong>
          </span>
        </button>

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

        <RouterLink v-if="showAdminLink" to="/admin/login" class="admin-link" title="Admin">⚙</RouterLink>
      </div>
    </div>
  </header>
</template>

<script setup>
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

function emitSearchSubmit() {
  emit('search-submit')
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

.nav-link:hover { color: var(--rose); border-bottom-color: var(--rose); }

.logo {
  text-align: center;
  display: inline-flex;
  justify-content: center;
}

.logo-lockup { display: inline-flex; align-items: center; gap: 10px; }
.logo-image {
  width: 46px;
  height: 46px;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 8px 18px rgba(217,109,144,.12));
  border-radius: 14px;
}
.logo-wording { display: flex; flex-direction: column; align-items: flex-start; }
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

.icon-btn:hover { color: var(--rose); }

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
  font-size: 18px;
  color: var(--text-muted);
  transition: color .2s;
}

.admin-link:hover { color: var(--rose); }

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
  .header-nav { gap: 14px; }
  .header-right {
    width: 100%;
    flex-wrap: wrap;
    gap: 10px;
  }
  .search-bar {
    order: 3;
    width: 100%;
    min-width: 0;
    max-width: none;
    flex: 1 1 100%;
  }
  .account-btn { flex: 1; }
}
</style>
