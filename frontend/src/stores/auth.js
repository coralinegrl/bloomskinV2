import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { adminAuthApi } from '../api/index.js'

export const useAuthStore = defineStore('admin-auth', () => {
  const token = ref(localStorage.getItem('bs_admin_token') || null)
  const user = ref(JSON.parse(localStorage.getItem('bs_admin_user') || 'null'))
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!token.value)

  async function login(email, password) {
    loading.value = true
    error.value = null
    try {
      const { data } = await adminAuthApi.login(email, password)
      token.value = data.token
      user.value = data.user
      localStorage.setItem('bs_admin_token', data.token)
      localStorage.setItem('bs_admin_user', JSON.stringify(data.user))
      return true
    } catch (err) {
      error.value = err.response?.data?.error || 'Error al iniciar sesión'
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    error.value = null
    localStorage.removeItem('bs_admin_token')
    localStorage.removeItem('bs_admin_user')
  }

  return { token, user, loading, error, isAuthenticated, login, logout }
})
