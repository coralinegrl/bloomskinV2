<template>
  <div class="login-page">
    <div class="login-card">
      <RouterLink to="/" class="login-logo-wrap">
        <img src="/brand/bloomskin-logo.png" alt="Bloomskin" class="login-logo-image" />
      </RouterLink>
      <p class="login-sub">Panel Administrador</p>

      <label class="form-label">Email</label>
      <input v-model="email" type="email" class="form-input" placeholder="admin@bloomskin.cl"
             @keyup.enter="handleLogin" />

      <label class="form-label">Contraseña</label>
      <input v-model="password" type="password" class="form-input" placeholder="••••••••"
             @keyup.enter="handleLogin" />

      <p v-if="auth.error" class="login-error">{{ auth.error }}</p>

      <button class="login-btn" :disabled="auth.loading" @click="handleLogin">
        {{ auth.loading ? 'Ingresando...' : 'Ingresar' }}
      </button>

      <RouterLink to="/" class="back-link">← Volver a la tienda</RouterLink>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const auth     = useAuthStore()
const router   = useRouter()
const email    = ref('')
const password = ref('')

async function handleLogin() {
  const ok = await auth.login(email.value, password.value)
  if (ok) router.push('/admin')
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: radial-gradient(circle at top, rgba(217,109,144,.18), transparent 30%), linear-gradient(180deg, #130e16 0%, #0f0d14 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.login-card {
  background: var(--ad-surface);
  border: 1px solid var(--ad-border);
  border-radius: 24px;
  padding: 48px 40px;
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 24px 60px rgba(0,0,0,.28);
}
.login-logo-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}
.login-logo-image {
  width: 130px;
  height: 130px;
  object-fit: contain;
  filter: drop-shadow(0 10px 24px rgba(217,109,144,.18));
}
.login-sub {
  font-size: 11px;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: var(--ad-muted);
  text-align: center;
  margin-bottom: 28px;
}
.form-label {
  font-size: 11px;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--ad-muted);
  margin-bottom: 6px;
  margin-top: 12px;
}
.form-input {
  width: 100%;
  background: var(--ad-bg);
  border: 1px solid var(--ad-border);
  border-radius: 6px;
  padding: 11px 14px;
  color: var(--ad-text);
  font-size: 14px;
  outline: none;
  transition: border-color .2s;
}
.form-input:focus { border-color: var(--rose); }
.login-error {
  font-size: 12px;
  color: #E57373;
  margin-top: 8px;
}
.login-btn {
  margin-top: 20px;
  width: 100%;
  padding: 13px;
  background: var(--rose-dark);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: .06em;
  transition: background .2s;
}
.login-btn:hover:not(:disabled) { background: var(--rose); }
.login-btn:disabled { opacity: .6; cursor: not-allowed; }
.back-link {
  font-size: 12px;
  color: var(--ad-muted);
  text-align: center;
  margin-top: 14px;
  transition: color .2s;
}
.back-link:hover { color: var(--blush); }
</style>
