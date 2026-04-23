<template>
  <Transition name="auth-modal">
    <div v-if="ui.authModalOpen" class="auth-overlay" @click.self="ui.closeAuthModal()">
      <div class="auth-modal">
        <button class="auth-close" type="button" @click="ui.closeAuthModal()">×</button>

        <div class="auth-head">
          <span class="auth-kicker">Bloomskin account</span>
          <h2>{{ ui.authModalMode === 'register' ? 'Crea tu cuenta' : 'Inicia sesion' }}</h2>
          <p>
            Guarda tus datos, revisa pedidos y termina la compra sin mezclar el acceso con el carrito.
          </p>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab" :class="{ active: ui.authModalMode === 'login' }" type="button" @click="ui.openAuthModal('login')">
            Entrar
          </button>
          <button class="auth-tab" :class="{ active: ui.authModalMode === 'register' }" type="button" @click="ui.openAuthModal('register')">
            Crear cuenta
          </button>
        </div>

        <form v-if="ui.authModalMode === 'login'" class="auth-form" @submit.prevent="submitLogin">
          <input v-model.trim="loginForm.email" type="email" placeholder="Email" :disabled="customerAuth.loading" />
          <input v-model="loginForm.password" type="password" placeholder="Contraseña" :disabled="customerAuth.loading" />
          <p v-if="customerAuth.error" class="auth-error">{{ customerAuth.error }}</p>
          <button class="auth-submit" type="submit" :disabled="customerAuth.loading">
            {{ customerAuth.loading ? 'Ingresando...' : 'Iniciar sesion' }}
          </button>
        </form>

        <form v-else class="auth-form" @submit.prevent="submitRegister">
          <input v-model.trim="registerForm.nombre" type="text" placeholder="Nombre" :disabled="customerAuth.loading" />
          <input v-model.trim="registerForm.email" type="email" placeholder="Email" :disabled="customerAuth.loading" />
          <input v-model="registerForm.password" type="password" placeholder="Contraseña" :disabled="customerAuth.loading" />
          <input v-model.trim="registerForm.telefono" type="text" placeholder="Telefono (opcional)" :disabled="customerAuth.loading" />
          <input v-model.trim="registerForm.ciudad" type="text" placeholder="Ciudad" :disabled="customerAuth.loading" />
          <p v-if="customerAuth.error" class="auth-error">{{ customerAuth.error }}</p>
          <button class="auth-submit" type="submit" :disabled="customerAuth.loading">
            {{ customerAuth.loading ? 'Creando...' : 'Crear cuenta' }}
          </button>
        </form>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { reactive } from 'vue'
import { useCustomerAuthStore } from '../../stores/customerAuth.js'
import { useUiStore } from '../../stores/ui.js'

const customerAuth = useCustomerAuthStore()
const ui = useUiStore()

const loginForm = reactive({ email: '', password: '' })
const registerForm = reactive({ nombre: '', email: '', password: '', telefono: '', ciudad: '' })

async function submitLogin() {
  const ok = await customerAuth.login(loginForm.email, loginForm.password)
  if (!ok) return
  loginForm.password = ''
  ui.closeAuthModal()
}

async function submitRegister() {
  const ok = await customerAuth.register(registerForm)
  if (!ok) return
  registerForm.password = ''
  ui.closeAuthModal()
}
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
  width: min(460px, 100%);
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
  font-size: 24px;
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

.auth-form input {
  width: 100%;
  border: 1px solid #ead7dd;
  border-radius: 14px;
  background: #fff;
  padding: 13px 14px;
  font-size: 13px;
  outline: none;
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

.auth-error {
  color: #b54768;
  font-size: 12px;
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
</style>
