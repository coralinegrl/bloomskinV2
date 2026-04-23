<template>
  <RouterView />
  <CartDrawer />
  <AuthModal />
  <AppToast />
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { adminUnauthorizedEvent, clientUnauthorizedEvent } from './api/index.js'
import CartDrawer from './components/store/CartDrawer.vue'
import AuthModal from './components/store/AuthModal.vue'
import AppToast from './components/ui/AppToast.vue'
import { useAuthStore } from './stores/auth.js'
import { useCustomerAuthStore } from './stores/customerAuth.js'
import { useUiStore } from './stores/ui.js'

const adminAuth = useAuthStore()
const customerAuth = useCustomerAuthStore()
const ui = useUiStore()
const router = useRouter()

function handleAdminUnauthorized() {
  adminAuth.logout()
  if (router.currentRoute.value.meta.requiresAuth) {
    router.push({ name: 'login' })
  }
}

function handleClientUnauthorized() {
  customerAuth.logout()
      ui.info('Tu sesión de clienta venció. Ingresa nuevamente para seguir.')
  if (router.currentRoute.value.meta.requiresClientAuth) {
    router.push({ name: 'store' })
  }
}

onMounted(() => {
  window.addEventListener(adminUnauthorizedEvent, handleAdminUnauthorized)
  window.addEventListener(clientUnauthorizedEvent, handleClientUnauthorized)
})
onBeforeUnmount(() => {
  window.removeEventListener(adminUnauthorizedEvent, handleAdminUnauthorized)
  window.removeEventListener(clientUnauthorizedEvent, handleClientUnauthorized)
})
</script>
