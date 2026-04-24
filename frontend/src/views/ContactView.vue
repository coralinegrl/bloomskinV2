<template>
  <div class="contact-page">
    <AnnouncementBar />

    <header class="contact-header">
      <div class="contact-header-inner">
        <RouterLink to="/" class="header-brand">
          <img src="/brand/bloomskin-logo.png" alt="Bloomskin" class="header-logo" />
          <span>
            <strong>bloomskin</strong>
            <small>K-Beauty - Chile</small>
          </span>
        </RouterLink>

        <nav class="contact-nav">
          <RouterLink to="/">Inicio</RouterLink>
          <RouterLink to="/catalogo">Catálogo</RouterLink>
          <RouterLink to="/envios">Envíos</RouterLink>
        </nav>
      </div>
    </header>

    <main class="contact-main">
      <section class="contact-hero">
        <div class="contact-tag">Contacto</div>
        <h1>{{ contact.heading }}</h1>
        <p>{{ contact.intro }}</p>
      </section>

      <section class="contact-grid">
        <article class="contact-card accent-card">
          <h2>Canales directos</h2>
          <p>Resuelve dudas de productos, despacho o seguimiento usando el canal que te acomode más.</p>

          <div class="contact-actions">
            <a class="primary-btn" :href="footer.whatsapp_url" target="_blank" rel="noreferrer">
              {{ contact.whatsapp_cta_label }}
            </a>
            <a class="ghost-btn" :href="`mailto:${footer.email}`">
              {{ contact.email_cta_label }}
            </a>
          </div>
        </article>

        <article class="contact-card">
          <h2>Datos de Bloomskin</h2>
          <dl class="contact-list">
            <div>
              <dt>Email</dt>
              <dd><a :href="`mailto:${footer.email}`">{{ footer.email }}</a></dd>
            </div>
            <div>
              <dt>Instagram</dt>
              <dd><a :href="footer.instagram_url" target="_blank" rel="noreferrer">{{ footer.instagram_handle }}</a></dd>
            </div>
            <div>
              <dt>WhatsApp</dt>
              <dd><a :href="footer.whatsapp_url" target="_blank" rel="noreferrer">{{ footer.whatsapp_label }}</a></dd>
            </div>
          </dl>
        </article>
      </section>
    </main>

    <StoreFooter />
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { settingsApi } from '../api/index.js'
import StoreFooter from '../components/store/StoreFooter.vue'
import AnnouncementBar from '../components/ui/AnnouncementBar.vue'

const footer = ref({
  instagram_url: 'https://www.instagram.com/bloomskin__cl',
  whatsapp_url: 'https://wa.me/569948418523',
  email: 'bloomskincl1@gmail.com',
  instagram_handle: '@bloomskin__cl',
  whatsapp_label: '+56 9 9484 1853',
})

const contact = ref({
  heading: 'Hablemos de tu rutina',
  intro: 'Si tienes dudas de compra, despacho o productos, puedes escribirnos y te ayudamos.',
  whatsapp_cta_label: 'Hablar por WhatsApp',
  email_cta_label: 'Escribir por correo',
})

async function loadSite() {
  try {
    const { data } = await settingsApi.site()
    if (data?.footer) footer.value = { ...footer.value, ...data.footer }
    if (data?.contact) contact.value = { ...contact.value, ...data.contact }
  } catch (error) {
    console.error('No se pudo cargar la página de contacto', error)
  }
}

watch(contact, value => {
  document.title = `${value.heading} | Bloomskin`
}, { immediate: true, deep: true })

onMounted(loadSite)
</script>

<style scoped>
.contact-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fffdfd, #fff5f8 20%, #fefcfd 100%);
}

.contact-header {
  background: rgba(255, 255, 255, 0.94);
  border-bottom: 1px solid rgba(191, 84, 122, 0.12);
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(12px);
}

.contact-header-inner,
.contact-main {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 28px;
}

.contact-header-inner {
  min-height: 78px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.header-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.header-brand strong {
  display: block;
  font-family: 'Cormorant Garamond', serif;
  font-size: 30px;
  color: var(--heart-deep);
  line-height: .9;
}

.header-brand small {
  display: block;
  margin-top: 4px;
  font-size: 9px;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.header-logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.contact-nav {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}

.contact-nav a {
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--dark-mid);
}

.contact-main {
  padding-top: 52px;
  padding-bottom: 24px;
}

.contact-hero {
  text-align: center;
  max-width: 760px;
  margin: 0 auto 28px;
}

.contact-tag {
  display: inline-flex;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(196, 100, 122, 0.12);
  color: var(--rose);
  font-size: 10px;
  letter-spacing: .22em;
  text-transform: uppercase;
}

.contact-hero h1 {
  margin-top: 12px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 56px;
  line-height: 1;
  color: var(--dark);
}

.contact-hero p {
  margin-top: 16px;
  color: var(--dark-mid);
  font-size: 15px;
  line-height: 1.9;
}

.contact-grid {
  display: grid;
  grid-template-columns: 1.2fr .8fr;
  gap: 18px;
}

.contact-card {
  padding: 30px;
  border-radius: 32px;
  background: linear-gradient(145deg, #fff7fa, #fffdfd);
  border: 1px solid rgba(191, 84, 122, 0.12);
  box-shadow: 0 16px 40px rgba(148, 89, 108, 0.08);
}

.accent-card {
  background: linear-gradient(145deg, #fef0f5, #fffdfd);
}

.contact-card h2 {
  font-family: 'Cormorant Garamond', serif;
  font-size: 34px;
  color: var(--dark);
}

.contact-card p {
  margin-top: 12px;
  color: var(--dark-mid);
  line-height: 1.8;
}

.contact-actions {
  margin-top: 24px;
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
  letter-spacing: .1em;
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

.contact-list {
  margin-top: 18px;
  display: grid;
  gap: 14px;
}

.contact-list dt {
  font-size: 11px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--rose);
}

.contact-list dd,
.contact-list a {
  margin-top: 6px;
  color: var(--dark-mid);
}

@media (max-width: 820px) {
  .contact-grid {
    grid-template-columns: 1fr;
  }

  .contact-header-inner {
    flex-direction: column;
    justify-content: center;
    padding-top: 14px;
    padding-bottom: 14px;
  }

  .contact-main {
    padding-left: 20px;
    padding-right: 20px;
  }

  .contact-hero h1 {
    font-size: 42px;
  }

  .contact-card {
    padding: 24px 20px;
  }
}
</style>
