<template>
  <div class="contact-page">
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

    <main class="contact-main">
      <section class="contact-hero">
        <div class="contact-tag">Contacto Bloomskin</div>
        <h1>{{ contact.heading }}</h1>
        <p>{{ contact.intro }}</p>
      </section>

      <section class="contact-grid">
        <article class="contact-card accent-card">
          <div class="card-kicker">Escribenos</div>
          <h2>Te ayudamos a elegir mejor</h2>
          <p>
            Si tienes dudas sobre una rutina, un pedido, despachos o disponibilidad, dejanos tu mensaje.
            Respondemos con foco comercial y ayuda real, no con respuestas roboticas.
          </p>

          <form class="contact-form" @submit.prevent="sendMessage">
            <div class="form-row">
              <label>
                <span>Nombre</span>
                <input v-model.trim="form.nombre" type="text" placeholder="Tu nombre" :disabled="sending" />
              </label>
              <label>
                <span>Email</span>
                <input v-model.trim="form.email" type="email" placeholder="tu@email.com" :disabled="sending" />
              </label>
            </div>

            <label>
              <span>Motivo</span>
              <select v-model="form.tipo" :disabled="sending">
                <option value="consult">Consulta de productos</option>
                <option value="order">Pedido o seguimiento</option>
                <option value="complaint">Postventa o incidencia</option>
              </select>
            </label>

            <label>
              <span>Mensaje</span>
              <textarea
                v-model.trim="form.contenido"
                rows="6"
                placeholder="Cuéntanos qué necesitas y te orientamos."
                :disabled="sending"
              ></textarea>
            </label>

            <div class="contact-actions">
              <button class="primary-btn" type="submit" :disabled="sending">
                {{ sending ? 'Enviando...' : 'Enviar mensaje' }}
              </button>
              <a class="ghost-btn" :href="footer.whatsapp_url" target="_blank" rel="noreferrer">
                {{ contact.whatsapp_cta_label }}
              </a>
            </div>
          </form>
        </article>

        <article class="contact-card">
          <div class="card-kicker">Canales directos</div>
          <h2>Bloomskin por donde te acomode</h2>
          <p>
            Si prefieres una respuesta mas rapida, tambien puedes escribirnos directo por correo o WhatsApp.
          </p>

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

          <div class="contact-note">
            <strong>Tip Bloomskin</strong>
            <p>
              Si nos escribes por un pedido, incluye tu numero de orden para ayudarte mucho mas rapido.
            </p>
          </div>
        </article>
      </section>
    </main>

    <StoreFooter />
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { mensajesApi, settingsApi } from '../api/index.js'
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
const sending = ref(false)

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

const form = ref(buildForm())

function buildForm() {
  return {
    nombre: customerAuth.user?.nombre || '',
    email: customerAuth.user?.email || '',
    tipo: 'consult',
    contenido: '',
  }
}

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
    if (data?.footer) footer.value = { ...footer.value, ...data.footer }
    if (data?.contact) contact.value = { ...contact.value, ...data.contact }
  } catch (error) {
    console.error('No se pudo cargar la pagina de contacto', error)
  }
}

async function sendMessage() {
  if (!form.value.nombre || !form.value.email || !form.value.contenido) {
    ui.info('Completa nombre, email y mensaje para poder enviarlo.')
    return
  }

  sending.value = true

  try {
    await mensajesApi.enviar({
      ...form.value,
      cliente_id: customerAuth.user?.id || null,
    })
    ui.success('Recibimos tu mensaje. Te responderemos por el canal que nos dejaste.')
    form.value = {
      ...buildForm(),
      tipo: form.value.tipo,
    }
  } catch (error) {
    console.error(error)
    ui.error(error.response?.data?.error || 'No pudimos enviar tu mensaje.')
  } finally {
    sending.value = false
  }
}

watch(() => customerAuth.user, () => {
  form.value.nombre = customerAuth.user?.nombre || form.value.nombre
  form.value.email = customerAuth.user?.email || form.value.email
}, { deep: true })

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

.contact-main {
  max-width: 1120px;
  margin: 0 auto;
  padding: 44px 28px 0;
}

.contact-hero {
  text-align: center;
  max-width: 780px;
  margin: 0 auto 28px;
}

.contact-tag,
.card-kicker {
  display: inline-flex;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(196, 100, 122, 0.12);
  color: var(--rose);
  font-size: 10px;
  letter-spacing: 0.22em;
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
  grid-template-columns: 1.2fr 0.8fr;
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
  margin-top: 14px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 34px;
  color: var(--dark);
}

.contact-card p {
  margin-top: 12px;
  color: var(--dark-mid);
  line-height: 1.8;
}

.contact-form {
  margin-top: 24px;
  display: grid;
  gap: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.contact-form label {
  display: grid;
  gap: 8px;
}

.contact-form span {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rose-dark);
}

.contact-form input,
.contact-form select,
.contact-form textarea {
  width: 100%;
  border: 1px solid rgba(191, 84, 122, 0.18);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  padding: 14px 16px;
  color: var(--dark);
  font-size: 14px;
  font-family: inherit;
  outline: none;
}

.contact-form textarea {
  resize: vertical;
}

.contact-form input:focus,
.contact-form select:focus,
.contact-form textarea:focus {
  border-color: var(--rose);
}

.contact-actions {
  margin-top: 6px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.primary-btn,
.ghost-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 20px;
  border-radius: 999px;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.primary-btn {
  background: var(--rose-dark);
  color: #fff;
  border: none;
}

.primary-btn:disabled {
  opacity: 0.65;
}

.ghost-btn {
  border: 1px solid rgba(191, 84, 122, 0.16);
  color: var(--rose-dark);
  background: #fff;
}

.contact-list {
  margin-top: 22px;
  display: grid;
  gap: 16px;
}

.contact-list dt {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rose);
}

.contact-list dd,
.contact-list a {
  margin-top: 6px;
  color: var(--dark-mid);
}

.contact-note {
  margin-top: 28px;
  padding: 18px 20px;
  border-radius: 24px;
  background: rgba(196, 100, 122, 0.08);
  border: 1px solid rgba(191, 84, 122, 0.12);
}

.contact-note strong {
  display: block;
  color: var(--rose-dark);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 11px;
}

.contact-note p {
  margin-top: 8px;
}

@media (max-width: 900px) {
  .contact-grid,
  .form-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .contact-main {
    padding: 28px 20px 0;
  }

  .contact-hero h1 {
    font-size: 42px;
  }

  .contact-card {
    padding: 24px 20px;
  }

  .contact-actions {
    flex-direction: column;
  }

  .primary-btn,
  .ghost-btn {
    width: 100%;
  }
}
</style>
