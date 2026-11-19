import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { clientesApi } from '../api/index.js'
import { useUiStore } from './ui.js'
import { readStoredList, writeStoredList } from '../utils/browserStorage.js'

export const useWishlistStore = defineStore('wishlist', () => {
  const items = ref(readStoredList('bs_guest_wishlist'))
  const loading = ref(false)
  const loadedForUserId = ref(null)

  const count = computed(() => items.value.length)
  const ids = computed(() => new Set(items.value.map(item => Number(item.id))))

  function isWishlisted(productId) {
    return ids.value.has(Number(productId))
  }

  async function load(userId, { silent = false } = {}) {
    if (!userId) {
      items.value = readStoredList('bs_guest_wishlist')
      loadedForUserId.value = null
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
      if (!localStorage.getItem('bs_client_token')) {
        items.value = isWishlisted(productId) ? items.value.filter(item => Number(item.id) !== productId) : [product, ...items.value].slice(0, 40)
        writeStoredList('bs_guest_wishlist', items.value)
        ui.success(isWishlisted(productId) ? 'Guardado en tus favoritos de este dispositivo.' : 'Producto quitado de favoritos.')
        return true
      }
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
    items.value = readStoredList('bs_guest_wishlist')
    loadedForUserId.value = null
    loading.value = false
  }

  return { items, loading, loadedForUserId, count, ids, isWishlisted, load, toggle, setItems, clear }
})
