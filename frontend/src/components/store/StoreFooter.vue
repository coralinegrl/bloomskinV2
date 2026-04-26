<template>
  <footer class="store-footer">
    <div class="footer-shell">
      <div class="footer-main">
        <div class="footer-brand-block">
          <div class="footer-brand-lockup">
            <img src="/brand/bloomskin-logo.png" alt="Bloomskin" class="footer-logo" />
            <div>
              <div class="footer-brand-name">bloomskin</div>
              <div class="footer-brand-sub">{{ footer.brand_sub }}</div>
            </div>
          </div>
          <p class="footer-copy">{{ footer.copy }}</p>
          <div class="footer-socials">
            <a :href="footer.instagram_url" target="_blank" rel="noreferrer" aria-label="Instagram Bloomskin" class="social-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4.2" />
                <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a :href="footer.whatsapp_url" target="_blank" rel="noreferrer" aria-label="WhatsApp Bloomskin" class="social-link">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.11 4.93A9.9 9.9 0 0 0 12.06 2a9.94 9.94 0 0 0-8.59 14.96L2 22l5.2-1.36A9.94 9.94 0 0 0 12.06 22h.01A9.94 9.94 0 0 0 22 12.06a9.86 9.86 0 0 0-2.89-7.13Zm-7.04 15.4a8.3 8.3 0 0 1-4.24-1.16l-.3-.18-3.09.81.83-3.01-.2-.31a8.29 8.29 0 0 1-1.29-4.42 8.43 8.43 0 1 1 8.44 8.27Zm4.62-6.31c-.25-.12-1.46-.72-1.68-.8-.22-.08-.38-.12-.54.13-.16.24-.62.8-.76.97-.14.16-.28.18-.52.06-.25-.12-1.04-.38-1.97-1.21-.73-.65-1.22-1.45-1.36-1.7-.14-.24-.01-.37.1-.49.11-.11.25-.28.37-.41.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.79-.2-.47-.4-.41-.54-.41l-.46-.01c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.19 1.1.16 1.52.1.46-.07 1.46-.6 1.66-1.18.21-.58.21-1.08.14-1.18-.06-.1-.22-.16-.46-.28Z" />
              </svg>
            </a>
          </div>
        </div>

        <div class="footer-col">
          <h4>Tienda</h4>
          <RouterLink to="/">Inicio</RouterLink>
          <RouterLink to="/catalogo">Catálogo</RouterLink>
          <RouterLink to="/contacto">Contáctanos</RouterLink>
          <RouterLink to="/quienes-somos">Quiénes somos</RouterLink>
        </div>

        <div class="footer-col">
          <h4>Información</h4>
          <RouterLink to="/envios">Envíos</RouterLink>
          <RouterLink to="/cambios-y-devoluciones">Cambios y devoluciones</RouterLink>
          <RouterLink to="/condiciones-de-envio">Condiciones de envío</RouterLink>
          <RouterLink to="/terminos-y-condiciones">Términos y condiciones</RouterLink>
          <RouterLink to="/contacto">Ayuda y contacto</RouterLink>
        </div>

        <div class="footer-col">
          <h4>Contacto</h4>
          <a :href="`mailto:${footer.email}`">{{ footer.email }}</a>
          <a :href="footer.instagram_url" target="_blank" rel="noreferrer">{{ footer.instagram_handle }}</a>
          <a :href="footer.whatsapp_url" target="_blank" rel="noreferrer">{{ footer.whatsapp_label }}</a>
        </div>
      </div>

      <div class="footer-bottom">
        <span>{{ footer.bottom_left }}</span>
        <span>{{ footer.bottom_right }}</span>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { settingsApi } from '../../api/index.js'

const footer = ref({
  brand_sub: 'K-Beauty - Chile',
  copy: 'Skincare coreano curado para Chile, con productos originales, ayuda real y compra simple.',
  instagram_url: 'https://www.instagram.com/bloomskin__cl',
  whatsapp_url: 'https://wa.me/56994841853',
  email: 'bloomskincl1@gmail.com',
  instagram_handle: '@bloomskin__cl',
  whatsapp_label: '+56 9 9484 1853',
  bottom_left: '(c) 2026 Bloomskin - Antofagasta, Chile',
  bottom_right: 'Originales de Corea del Sur',
})

onMounted(async () => {
  try {
    const { data } = await settingsApi.site()
    if (data?.footer) footer.value = { ...footer.value, ...data.footer }
  } catch (error) {
    console.error('No se pudo cargar el footer configurable', error)
  }
})
</script>

<style scoped>
.store-footer {
  margin-top: 40px;
  background:
    radial-gradient(circle at top left, rgba(217, 109, 144, 0.08), transparent 20%),
    linear-gradient(180deg, #fff8fb, #f4e9ee);
  border-top: 1px solid rgba(191, 84, 122, 0.12);
  position: relative;
  left: 50%;
  transform: translateX(-50%);
  width: 100vw;
  max-width: 100vw;
}

.footer-shell {
  width: 100%;
  margin: 0 auto;
  padding: 18px 32px 10px;
}

.footer-main {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr;
  gap: 20px;
}

.footer-brand-lockup {
  display: flex;
  align-items: center;
  gap: 12px;
}

.footer-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 14px;
}

.footer-brand-name {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px;
  line-height: 0.9;
  color: var(--rose-dark);
}

.footer-brand-sub {
  margin-top: 4px;
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.footer-copy {
  margin-top: 10px;
  max-width: 360px;
  color: var(--dark-mid);
  line-height: 1.55;
}

.footer-socials {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}

.social-link {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: var(--rose-dark);
  border: 1px solid rgba(191, 84, 122, 0.14);
  box-shadow: 0 8px 18px rgba(191, 84, 122, 0.08);
}

.social-link svg {
  width: 18px;
  height: 18px;
}

.footer-col {
  display: grid;
  align-content: start;
  gap: 8px;
}

.footer-col h4 {
  margin-bottom: 4px;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rose);
}

.footer-col a {
  font-size: 13px;
  color: var(--dark-mid);
}

.footer-bottom {
  max-width: 1280px;
  margin: 14px auto 0;
  padding-top: 10px;
  border-top: 1px solid rgba(191, 84, 122, 0.1);
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: var(--text-muted);
  font-size: 12px;
}

@media (max-width: 900px) {
  .footer-main {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .footer-shell {
    padding: 16px 20px 10px;
  }

  .footer-main,
  .footer-bottom {
    grid-template-columns: 1fr;
    display: grid;
  }
}
</style>
