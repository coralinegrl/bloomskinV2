import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { clientesApi } from '../api/index.js'
import { useUiStore } from './ui.js'

export const useWishlistStore = defineStore('wishlist', () => {
  const items = ref([])
  const loading = ref(false)
  const loadedForUserId = ref(null)

  const count = computed(() => items.value.length)
  const ids = computed(() => new Set(items.value.map(item => Number(item.id))))

  function isWishlisted(productId) {
    return ids.value.has(Number(productId))
  }

  async function load(userId, { silent = false } = {}) {
    if (!userId) {
      clear()
      return
    }

    if (!silent) loading.value = true
    try {
      const { data } = await clientesApi.wishlist()
      items.value = Array.isArray(data.items) ? data.items : []
      loadedForUserId.value = userId
    } finally {
      loading.value = false
    }
  }

  async function toggle(product) {
    const ui = useUiStore()
    const productId = Number(product?.id)
    if (!productId) return false

    loading.value = true
    try {
      const response = isWishlisted(productId)
        ? await clientesApi.quitarWishlist(productId)
        : await clientesApi.agregarWishlist(productId)

      items.value = Array.isArray(response.data.items) ? response.data.items : []
      if (isWishlisted(productId)) {
        ui.success(`${product.nombre} se guardó en tus favoritos.`)
      } else {
        ui.info(`${product.nombre} salió de tus favoritos.`)
      }
      return true
    } catch (error) {
      ui.error(error.response?.data?.error || 'No se pudo actualizar favoritos.')
      return false
    } finally {
      loading.value = false
    }
  }

  function setItems(nextItems, userId = loadedForUserId.value) {
    items.value = Array.isArray(nextItems) ? nextItems : []
    loadedForUserId.value = userId
  }

  function clear() {
    items.value = []
    loadedForUserId.value = null
    loading.value = false
  }

  return { items, loading, loadedForUserId, count, ids, isWishlisted, load, toggle, setItems, clear }
})
