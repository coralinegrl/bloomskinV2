import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { clientAuthApi, clientesApi } from '../api/index.js'
import { useWishlistStore } from './wishlist.js'

export const useCustomerAuthStore = defineStore('customer-auth', () => {
  const token = ref(localStorage.getItem('bs_client_token') || null)
  const user = ref(JSON.parse(localStorage.getItem('bs_client_user') || 'null'))
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!token.value)

  function persistSession(data) {
    const wishlist = useWishlistStore()
    token.value = data.token
    user.value = data.user
    localStorage.setItem('bs_client_token', data.token)
    localStorage.setItem('bs_client_user', JSON.stringify(data.user))
    void wishlist.load(data.user?.id, { silent: true })
  }

  async function login(email, password) {
    loading.value = true
    error.value = null
    try {
      const { data } = await clientAuthApi.login(email, password)
      persistSession(data)
      return true
    } catch (err) {
      error.value = err.response?.data?.error || 'No se pudo iniciar sesion'
      return false
    } finally {
      loading.value = false
    }
  }

  async function register(payload) {
    loading.value = true
    error.value = null
    try {
      const { data } = await clientAuthApi.register(payload)
      persistSession(data)
      return true
    } catch (err) {
      error.value = err.response?.data?.error || 'No se pudo crear la cuenta'
      return false
    } finally {
      loading.value = false
    }
  }

  async function refreshProfile() {
    if (!token.value) return
    try {
      const wishlist = useWishlistStore()
      const { data } = await clientAuthApi.me()
      user.value = data.user
      localStorage.setItem('bs_client_user', JSON.stringify(data.user))
      void wishlist.load(data.user?.id, { silent: true })
    } catch {
      logout()
    }
  }

  async function updateProfile(payload) {
    loading.value = true
    error.value = null
    try {
      const { data } = await clientesApi.actualizarPerfil(payload)
      user.value = data.user
      localStorage.setItem('bs_client_user', JSON.stringify(data.user))
      return true
    } catch (err) {
      error.value = err.response?.data?.error || 'No se pudo actualizar el perfil'
      return false
    } finally {
      loading.value = false
    }
  }

  async function requestPasswordReset(email) {
    loading.value = true
    error.value = null
    try {
      await clientAuthApi.requestPasswordReset(email)
      return true
    } catch (err) {
      error.value = err.response?.data?.error || 'No se pudo iniciar la recuperacion de contrasena'
      return false
    } finally {
      loading.value = false
    }
  }

  async function resetPassword(payload) {
    loading.value = true
    error.value = null
    try {
      await clientAuthApi.resetPassword(payload)
      return true
    } catch (err) {
      error.value = err.response?.data?.error || 'No se pudo restablecer la contrasena'
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    const wishlist = useWishlistStore()
    token.value = null
    user.value = null
    error.value = null
    localStorage.removeItem('bs_client_token')
    localStorage.removeItem('bs_client_user')
    wishlist.clear()
  }

  return { token, user, loading, error, isAuthenticated, login, register, requestPasswordReset, resetPassword, refreshProfile, updateProfile, logout }
})

