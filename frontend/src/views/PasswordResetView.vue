<template>
  <div class="reset-page">
    <AnnouncementBar />

    <main class="reset-main">
      <div class="reset-card">
        <RouterLink class="back-link" to="/">Volver a Bloomskin</RouterLink>
        <div class="reset-kicker">Recuperación de cuenta</div>
        <h1>Restablece tu contraseña</h1>
        <p>Define una contraseña nueva para volver a entrar a tu cuenta Bloomskin.</p>

        <form class="reset-form" @submit.prevent="submitReset">
          <label class="field-block">
            <span>Email</span>
            <input v-model.trim="form.email" type="email" placeholder="tu@email.com" :disabled="customerAuth.loading" />
          </label>

          <label class="field-block">
            <span>Nueva contraseña</span>
            <input v-model="form.password" type="password" placeholder="Mínimo 8 caracteres" :disabled="customerAuth.loading" />
            <small v-if="passwordError" class="field-error">{{ passwordError }}</small>
          </label>

          <label class="field-block">
            <span>Repite la contraseña</span>
            <input v-model="form.confirmPassword" type="password" placeholder="Repite tu contraseña" :disabled="customerAuth.loading" />
            <small v-if="confirmError" class="field-error">{{ confirmError }}</small>
          </label>

          <p v-if="customerAuth.error" class="field-error">{{ customerAuth.error }}</p>
          <p v-if="successMessage" class="success-message">{{ successMessage }}</p>

          <button class="primary-btn" type="submit" :disabled="customerAuth.loading">
            {{ customerAuth.loading ? 'Guardando...' : 'Restablecer contraseña' }}
          </button>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AnnouncementBar from '../components/ui/AnnouncementBar.vue'
import { useCustomerAuthStore } from '../stores/customerAuth.js'
import { isValidEmail, normalizeEmail, validatePassword } from '../utils/validation.js'

const route = useRoute()
const router = useRouter()
const customerAuth = useCustomerAuthStore()
const successMessage = ref('')

const form = reactive({
  email: normalizeEmail(route.query.email),
  token: String(route.query.token || route.query.reset || ''),
  password: '',
  confirmPassword: '',
})

const passwordError = computed(() => (form.password ? validatePassword(form.password) : ''))
const confirmError = computed(() => (
  form.confirmPassword && form.password !== form.confirmPassword
    ? 'Las contraseñas no coinciden.'
    : ''
))

async function submitReset() {
  successMessage.value = ''
  const email = normalizeEmail(form.email)
  if (!email || !isValidEmail(email)) return
  if (!form.token) return
  if (passwordError.value || confirmError.value) return

  const ok = await customerAuth.resetPassword({
    email,
    token: form.token,
    password: form.password,
  })
  if (!ok) return

  successMessage.value = 'Tu contraseña fue actualizada. Ahora puedes iniciar sesión.'
  setTimeout(() => {
    router.push({ name: 'store' })
  }, 1500)
}
</script>

<style scoped>
.reset-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fffdfd, #fff5f8 22%, #fefcfd 100%);
}

.reset-main {
  min-height: calc(100vh - 40px);
  display: grid;
  place-items: center;
  padding: 40px 20px;
}

.reset-card {
  width: min(520px, 100%);
  border-radius: 28px;
  padding: 30px;
  background: linear-gradient(180deg, #fffdfd, #fff5f8);
  border: 1px solid rgba(191, 84, 122, 0.14);
  box-shadow: 0 30px 60px rgba(90, 34, 54, 0.18);
}

.back-link,
.reset-kicker {
  font-size: 11px;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.back-link {
  color: var(--rose-dark);
}

.reset-kicker {
  display: inline-block;
  margin-top: 18px;
  color: var(--rose);
}

.reset-card h1 {
  margin-top: 10px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 42px;
  line-height: 1;
}

.reset-card p {
  margin-top: 12px;
  color: var(--text-muted);
  line-height: 1.7;
}

.reset-form {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.field-block {
  display: grid;
  gap: 6px;
}

.field-block span {
  font-size: 12px;
  color: var(--dark-mid);
}

.reset-form input {
  width: 100%;
  border: 1px solid #ead7dd;
  border-radius: 14px;
  background: #fff;
  padding: 13px 14px;
  font-size: 13px;
  outline: none;
}

.field-error {
  color: #b54768;
  font-size: 12px;
}

.success-message {
  color: #43725a;
  font-size: 12px;
}

.primary-btn {
  margin-top: 6px;
  border: none;
  border-radius: 999px;
  min-height: 48px;
  padding: 0 18px;
  background: var(--rose-dark);
  color: white;
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
}
</style>
