import { defineStore } from 'pinia'
import { ref } from 'vue'

let toastId = 0

export const useUiStore = defineStore('ui', () => {
  const toasts = ref([])
  const authModalOpen = ref(false)
  const authModalMode = ref('login')

  function pushToast({ title, message, tone = 'info', duration = 3200 }) {
    const id = ++toastId
    const toast = { id, title, message, tone }
    toasts.value.push(toast)

    if (duration > 0) {
      window.setTimeout(() => removeToast(id), duration)
    }

    return id
  }

  function success(message, title = 'Listo') {
    return pushToast({ title, message, tone: 'success' })
  }

  function error(message, title = 'No se pudo completar') {
    return pushToast({ title, message, tone: 'error', duration: 4200 })
  }

  function info(message, title = 'Aviso') {
    return pushToast({ title, message, tone: 'info' })
  }

  function removeToast(id) {
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }

  function openAuthModal(mode = 'login') {
    authModalMode.value = mode
    authModalOpen.value = true
  }

  function closeAuthModal() {
    authModalOpen.value = false
  }

  return {
    toasts,
    authModalOpen,
    authModalMode,
    pushToast,
    success,
    error,
    info,
    removeToast,
    openAuthModal,
    closeAuthModal,
  }
})
