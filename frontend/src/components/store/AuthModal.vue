<template>
  <Transition name="auth-modal">
    <div v-if="ui.authModalOpen" class="auth-overlay" @click.self="closeModal">
      <div class="auth-modal">
        <button class="auth-close" type="button" @click="closeModal">x</button>

        <div class="auth-head">
          <span class="auth-kicker">Bloomskin account</span>
          <h2>{{ modalTitle }}</h2>
          <p>{{ modalCopy }}</p>
        </div>

        <div v-if="showTabs" class="auth-tabs">
          <button class="auth-tab" :class="{ active: ui.authModalMode === 'login' }" type="button" @click="switchMode('login')">
            Entrar
          </button>
          <button class="auth-tab" :class="{ active: ui.authModalMode === 'register' }" type="button" @click="switchMode('register')">
            Crear cuenta
          </button>
        </div>

        <form v-if="ui.authModalMode === 'login'" class="auth-form" @submit.prevent="submitLogin">
          <label class="field-block">
            <span>Email</span>
            <input v-model.trim="loginForm.email" type="email" placeholder="tu@email.com" :disabled="customerAuth.loading" />
          </label>
          <label class="field-block">
            <span>Contraseña</span>
            <div class="password-field">
              <input v-model="loginForm.password" :type="showLoginPassword ? 'text' : 'password'" placeholder="Tu contraseña" :disabled="customerAuth.loading" />
              <button class="password-toggle" type="button" :disabled="customerAuth.loading" @click="showLoginPassword = !showLoginPassword">
                {{ showLoginPassword ? 'Ocultar' : 'Ver' }}
              </button>
            </div>
          </label>
          <button class="link-btn" type="button" @click="switchMode('forgot')">Olvidé mi contraseña</button>
          <p v-if="loginError || customerAuth.error" class="auth-error">{{ loginError || customerAuth.error }}</p>
          <button class="auth-submit" type="submit" :disabled="customerAuth.loading">
            {{ customerAuth.loading ? 'Ingresando...' : 'Iniciar sesión' }}
          </button>
        </form>

        <form v-else-if="ui.authModalMode === 'forgot'" class="auth-form" @submit.prevent="submitForgotPassword">
          <label class="field-block">
            <span>Email</span>
            <input v-model.trim="forgotForm.email" type="email" placeholder="tu@email.com" :disabled="customerAuth.loading" />
          </label>
          <p v-if="forgotMessage" class="auth-success">{{ forgotMessage }}</p>
          <p v-if="loginError || customerAuth.error" class="auth-error">{{ loginError || customerAuth.error }}</p>
          <button class="auth-submit" type="submit" :disabled="customerAuth.loading">
            {{ customerAuth.loading ? 'Enviando...' : 'Enviar enlace' }}
          </button>
          <button class="link-btn" type="button" @click="switchMode('login')">Volver al login</button>
        </form>

        <form v-else-if="ui.authModalMode === 'reset'" class="auth-form" @submit.prevent="submitResetPassword">
          <label class="field-block">
            <span>Email</span>
            <input v-model.trim="resetForm.email" type="email" placeholder="tu@email.com" :disabled="customerAuth.loading" />
          </label>
          <label class="field-block">
            <span>Nueva contraseña</span>
            <div class="password-field">
              <input v-model="resetForm.password" :type="showResetPassword ? 'text' : 'password'" placeholder="Mínimo 8 caracteres" :disabled="customerAuth.loading" />
              <button class="password-toggle" type="button" :disabled="customerAuth.loading" @click="showResetPassword = !showResetPassword">
                {{ showResetPassword ? 'Ocultar' : 'Ver' }}
              </button>
            </div>
            <small v-if="resetErrors.password" class="field-error">{{ resetErrors.password }}</small>
          </label>
          <label class="field-block">
            <span>Repite la contraseña</span>
            <div class="password-field">
              <input v-model="resetForm.confirmPassword" :type="showResetConfirmPassword ? 'text' : 'password'" placeholder="Repite tu contraseña" :disabled="customerAuth.loading" />
              <button class="password-toggle" type="button" :disabled="customerAuth.loading" @click="showResetConfirmPassword = !showResetConfirmPassword">
                {{ showResetConfirmPassword ? 'Ocultar' : 'Ver' }}
              </button>
            </div>
            <small v-if="resetErrors.confirmPassword" class="field-error">{{ resetErrors.confirmPassword }}</small>
          </label>
          <p v-if="forgotMessage" class="auth-success">{{ forgotMessage }}</p>
          <p v-if="loginError || customerAuth.error" class="auth-error">{{ loginError || customerAuth.error }}</p>
          <button class="auth-submit" type="submit" :disabled="customerAuth.loading">
            {{ customerAuth.loading ? 'Guardando...' : 'Restablecer contraseña' }}
          </button>
        </form>

        <form v-else class="auth-form" @submit.prevent="submitRegister">
          <label class="field-block">
            <span>Nombre completo</span>
            <input v-model.trim="registerForm.nombre" type="text" placeholder="Nombre Apellido" :disabled="customerAuth.loading" />
            <small v-if="registerErrors.nombre" class="field-error">{{ registerErrors.nombre }}</small>
          </label>

          <label class="field-block">
            <span>Email</span>
            <input v-model.trim="registerForm.email" type="email" placeholder="tu@email.com" :disabled="customerAuth.loading" />
            <small v-if="registerErrors.email" class="field-error">{{ registerErrors.email }}</small>
          </label>

          <label class="field-block">
            <span>Contraseña</span>
            <div class="password-field">
              <input v-model="registerForm.password" :type="showRegisterPassword ? 'text' : 'password'" placeholder="Mínimo 8 caracteres" :disabled="customerAuth.loading" />
              <button class="password-toggle" type="button" :disabled="customerAuth.loading" @click="showRegisterPassword = !showRegisterPassword">
                {{ showRegisterPassword ? 'Ocultar' : 'Ver' }}
              </button>
            </div>
            <small v-if="registerErrors.password" class="field-error">{{ registerErrors.password }}</small>
          </label>

          <div class="auth-grid">
            <label class="field-block">
              <span>RUT</span>
              <input
                :value="registerForm.rut"
                type="text"
                placeholder="12.345.678-5"
                :disabled="customerAuth.loading"
                @input="registerForm.rut = formatRutInput($event.target.value)"
              />
              <small v-if="registerErrors.rut" class="field-error">{{ registerErrors.rut }}</small>
            </label>

            <label class="field-block">
              <span>Teléfono</span>
              <input
                :value="registerForm.telefono"
                type="text"
                placeholder="+56 9 1234 5678"
                :disabled="customerAuth.loading"
                @input="registerForm.telefono = formatPhoneInput($event.target.value)"
              />
              <small v-if="registerErrors.telefono" class="field-error">{{ registerErrors.telefono }}</small>
            </label>
          </div>

          <div class="auth-grid address-grid">
            <label class="field-block">
              <span>Calle</span>
              <input v-model.trim="registerForm.street" type="text" placeholder="Av. Grecia" :disabled="customerAuth.loading" />
              <small v-if="registerErrors.direccion" class="field-error">{{ registerErrors.direccion }}</small>
            </label>

            <label class="field-block">
              <span>Número</span>
              <input v-model.trim="registerForm.number" type="text" placeholder="860" :disabled="customerAuth.loading" />
            </label>
          </div>

          <label class="field-block">
            <span>Depto / Oficina</span>
            <input v-model.trim="registerForm.apartment" type="text" placeholder="Depto 402, Torre B" :disabled="customerAuth.loading" />
          </label>

          <div class="auth-grid">
            <label class="field-block">
              <span>Comuna / Ciudad</span>
              <input v-model.trim="registerForm.city" type="text" placeholder="Antofagasta" :disabled="customerAuth.loading" />
              <small v-if="registerErrors.ciudad" class="field-error">{{ registerErrors.ciudad }}</small>
            </label>

            <label class="field-block">
              <span>Región</span>
              <select v-model="registerForm.region" :disabled="customerAuth.loading">
                <option value="">Selecciona una region</option>
                <option v-for="region in CHILE_REGIONS" :key="region" :value="region">{{ region }}</option>
              </select>
              <small v-if="registerErrors.region" class="field-error">{{ registerErrors.region }}</small>
            </label>
          </div>

          <p v-if="formError || customerAuth.error" class="auth-error">{{ formError || customerAuth.error }}</p>
          <button class="auth-submit" type="submit" :disabled="customerAuth.loading">
            {{ customerAuth.loading ? 'Creando...' : 'Crear cuenta' }}
          </button>
        </form>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomerAuthStore } from '../../stores/customerAuth.js'
import { useUiStore } from '../../stores/ui.js'
import { validateCustomerProfile, normalizeEmail, isValidEmail, validatePassword, isValidChileanRut, isValidChileanPhone, validateRequiredText } from '../../utils/validation.js'
import { CHILE_REGIONS, buildApiCustomerPayload, formatPhoneInput, formatRutInput } from '../../utils/customerFields.js'

const customerAuth = useCustomerAuthStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()
const formError = ref('')
const loginError = ref('')
const forgotMessage = ref('')
const showLoginPassword = ref(false)
const showRegisterPassword = ref(false)
const showResetPassword = ref(false)
const showResetConfirmPassword = ref(false)

const loginForm = reactive({ email: '', password: '' })
const forgotForm = reactive({ email: '' })
const resetForm = reactive({ email: '', token: '', password: '', confirmPassword: '' })
const registerForm = reactive({
  nombre: '',
  email: '',
  password: '',
  rut: '',
  telefono: '',
  street: '',
  number: '',
  apartment: '',
  city: '',
  region: '',
  tipo_piel: '',
})
const registerErrors = reactive({
  nombre: '',
  email: '',
  password: '',
  rut: '',
  telefono: '',
  direccion: '',
  ciudad: '',
  region: '',
})
const resetErrors = reactive({
  password: '',
  confirmPassword: '',
})

const showTabs = computed(() => ['login', 'register'].includes(ui.authModalMode))
const modalTitle = computed(() => ({
  login: 'Inicia sesión',
  register: 'Crea tu cuenta',
  forgot: 'Recupera tu contraseña',
  reset: 'Restablece tu contraseña',
}[ui.authModalMode] || 'Bloomskin account'))
const modalCopy = computed(() => ({
  login: 'Guarda tus datos, revisa pedidos y termina la compra sin mezclar el acceso con el carrito.',
  register: 'Completa tus datos una vez y deja tu cuenta lista para futuras compras.',
  forgot: 'Te enviaremos un enlace seguro para crear una nueva contraseña.',
  reset: 'Define una contraseña nueva para volver a entrar a tu cuenta.',
}[ui.authModalMode] || ''))

function resetErrorsState() {
  formError.value = ''
  loginError.value = ''
  forgotMessage.value = ''
  Object.keys(registerErrors).forEach(key => {
    registerErrors[key] = ''
  })
  Object.keys(resetErrors).forEach(key => {
    resetErrors[key] = ''
  })
}

function switchMode(mode) {
  resetErrorsState()
  ui.openAuthModal(mode)
}

function closeModal() {
  ui.closeAuthModal()
  if (route.query.reset) {
    const query = { ...route.query }
    delete query.reset
    delete query.email
    router.replace({ query })
  }
}

function collectRegisterErrors(payload) {
  registerErrors.nombre = validateRequiredText(payload.nombre, 'Nombre', 3)
  registerErrors.email = !payload.email
    ? 'Email es requerido.'
    : !isValidEmail(payload.email)
      ? 'Ingresa un email valido.'
      : ''
  registerErrors.password = validatePassword(payload.password)
  registerErrors.rut = !payload.rut
    ? 'RUT es requerido.'
    : !isValidChileanRut(payload.rut)
      ? 'Ingresa un RUT chileno valido.'
      : ''
  registerErrors.telefono = !payload.telefono
    ? 'Telefono es requerido.'
    : !isValidChileanPhone(payload.telefono)
      ? 'Usa +569XXXXXXXX o 9XXXXXXXX.'
      : ''
  registerErrors.direccion = validateRequiredText(payload.direccion, 'Direccion', 6)
  registerErrors.ciudad = validateRequiredText(payload.ciudad, 'Ciudad', 2)
  registerErrors.region = validateRequiredText(payload.region, 'Region', 2)
}

async function submitLogin() {
  resetErrorsState()
  const email = normalizeEmail(loginForm.email)
  if (!email) {
    loginError.value = 'Email es requerido.'
    return
  }
  if (!isValidEmail(email)) {
    loginError.value = 'Ingresa un email valido.'
    return
  }
  if (!loginForm.password) {
    loginError.value = 'Contraseña es requerida.'
    return
  }

  const ok = await customerAuth.login(email, loginForm.password)
  if (!ok) return
  loginForm.password = ''
  ui.closeAuthModal()
}

async function submitForgotPassword() {
  resetErrorsState()
  const email = normalizeEmail(forgotForm.email)
  if (!email || !isValidEmail(email)) {
    loginError.value = 'Ingresa un email valido.'
    return
  }

  const ok = await customerAuth.requestPasswordReset(email)
  if (!ok) return
  forgotMessage.value = 'Te enviamos un enlace para restablecer tu contraseña.'
}

async function submitResetPassword() {
  resetErrorsState()
  const email = normalizeEmail(resetForm.email)
  if (!email || !isValidEmail(email)) {
    loginError.value = 'Ingresa un email valido.'
    return
  }
  resetErrors.password = validatePassword(resetForm.password)
  resetErrors.confirmPassword = resetForm.password !== resetForm.confirmPassword
    ? 'Las contraseñas no coinciden.'
    : ''
  if (resetErrors.password || resetErrors.confirmPassword) {
    loginError.value = resetErrors.password || resetErrors.confirmPassword
    return
  }
  if (!resetForm.token) {
    loginError.value = 'El enlace de recuperación no es válido.'
    return
  }

  const ok = await customerAuth.resetPassword({
    email,
    token: resetForm.token,
    password: resetForm.password,
  })
  if (!ok) return

  forgotMessage.value = 'Tu contraseña fue actualizada. Ahora puedes iniciar sesión.'
  resetForm.password = ''
  resetForm.confirmPassword = ''
  const query = { ...route.query }
  delete query.reset
  delete query.email
  router.replace({ query })
  ui.openAuthModal('login')
}

async function submitRegister() {
  resetErrorsState()
  const payload = buildApiCustomerPayload({
    ...registerForm,
    city: registerForm.city,
    region: registerForm.region,
  })
  payload.password = registerForm.password

  collectRegisterErrors(payload)
  const validation = validateCustomerProfile(payload, { requirePassword: true })
  if (validation.errors.length) {
    formError.value = validation.errors[0]
    return
  }

  const ok = await customerAuth.register(validation.normalized)
  if (!ok) return
  registerForm.password = ''
  ui.closeAuthModal()
}

watch(() => route.query.reset, token => {
  if (!token) return
  resetForm.token = String(token)
  resetForm.email = normalizeEmail(route.query.email)
  ui.openAuthModal('reset')
}, { immediate: true })
</script>

<style scoped>
.auth-overlay {
  position: fixed;
  inset: 0;
  background: rgba(38, 18, 28, 0.45);
  backdrop-filter: blur(6px);
  z-index: 500;
  display: grid;
  place-items: center;
  padding: 24px;
}

.auth-modal {
  width: min(560px, 100%);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  background: linear-gradient(180deg, #fffdfd, #fff5f8);
  border: 1px solid rgba(191, 84, 122, 0.14);
  border-radius: 28px;
  padding: 28px;
  box-shadow: 0 30px 60px rgba(90, 34, 54, 0.18);
  position: relative;
}

.auth-close {
  position: absolute;
  top: 16px;
  right: 18px;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 20px;
}

.auth-kicker {
  display: inline-block;
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--rose);
  font-weight: 600;
}

.auth-head h2 {
  margin-top: 8px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 40px;
  line-height: 1;
}

.auth-head p {
  margin-top: 12px;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.7;
}

.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 24px;
}

.auth-tab {
  border: 1px solid #ead7dd;
  border-radius: 999px;
  padding: 12px;
  background: white;
  color: var(--text-muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.auth-tab.active {
  background: var(--rose-dark);
  border-color: var(--rose-dark);
  color: white;
}

.auth-form {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.auth-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.address-grid {
  align-items: start;
}

.field-block {
  display: grid;
  gap: 6px;
}

.field-block span {
  font-size: 12px;
  color: var(--dark-mid);
}

.password-field {
  position: relative;
}

.auth-form input,
.auth-form select {
  width: 100%;
  border: 1px solid #ead7dd;
  border-radius: 14px;
  background: #fff;
  padding: 13px 14px;
  font-size: 13px;
  outline: none;
}

.password-field input {
  padding-right: 82px;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: var(--rose-dark);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.password-toggle:disabled {
  cursor: default;
  opacity: 0.6;
}

.field-error,
.auth-error {
  color: #b54768;
  font-size: 12px;
}

.auth-success {
  color: #43725a;
  font-size: 12px;
}

.link-btn {
  justify-self: start;
  background: none;
  border: none;
  padding: 0;
  font-size: 12px;
  color: var(--rose-dark);
}

.auth-submit {
  margin-top: 6px;
  border: none;
  border-radius: 999px;
  padding: 14px 18px;
  background: var(--rose-dark);
  color: white;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.auth-modal-enter-active,
.auth-modal-leave-active {
  transition: opacity 0.25s ease;
}

.auth-modal-enter-active .auth-modal,
.auth-modal-leave-active .auth-modal {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.auth-modal-enter-from,
.auth-modal-leave-to {
  opacity: 0;
}

.auth-modal-enter-from .auth-modal,
.auth-modal-leave-to .auth-modal {
  transform: translateY(12px) scale(0.98);
  opacity: 0;
}

@media (max-width: 640px) {
  .auth-grid {
    grid-template-columns: 1fr;
  }
}
</style>
