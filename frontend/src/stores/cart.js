import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { readStoredList, writeStoredList } from '../utils/browserStorage.js'

export const useCartStore = defineStore('cart', () => {
  const items = ref(readStoredList('bs_cart', 60).map(item => ({
    ...item, cantidad: Math.max(1, Math.min(99, Math.floor(Number(item.cantidad) || 1))),
    cart_key: `${item.id}::${String(item.tono_seleccionado || '')}`,
  })))
  watch(items, value => writeStoredList('bs_cart', value), { deep: true })
  const open  = ref(false)
  const view = ref('cart')

  const count = computed(() => items.value.reduce((s, i) => s + i.cantidad, 0))
  const total = computed(() => items.value.reduce((s, i) => s + i.precio_clp * i.cantidad, 0))
  const subtotalBase = computed(() => items.value.reduce((sum, item) => {
    const offerActive = Boolean(item.precio_oferta_clp) && (
      !item.oferta_hasta || new Date(`${String(item.oferta_hasta).slice(0, 10)}T23:59:59`).getTime() >= Date.now()
    )
    const basePrice = offerActive ? item.precio_oferta_clp : item.precio_clp
    return sum + basePrice * item.cantidad
  }, 0))
  const savings = computed(() => Math.max(0, subtotalBase.value - total.value))

  function buildCartKey(producto) {
    return `${producto.id}::${String(producto.tono_seleccionado || '')}`
  }

  function agregar(producto) {
    const cartKey = buildCartKey(producto)
    const existing = items.value.find(i => i.cart_key === cartKey)
    if (existing) {
      const maxStock = Number(producto.stock ?? existing.stock ?? 0)
      existing.stock = maxStock
      if (maxStock > 0 && existing.cantidad < maxStock) {
        existing.cantidad++
      }
    } else {
      items.value.push({ ...producto, cart_key: cartKey, cantidad: 1 })
    }
    view.value = 'cart'
    // Adding a product should not interrupt browsing; the bag remains available in the header.
  }

  function quitar(cartKey) {
    items.value = items.value.filter(i => i.cart_key !== cartKey)
  }

  function cambiarCantidad(cartKey, cantidad) {
    const item = items.value.find(i => i.cart_key === cartKey)
    if (item) {
      if (cantidad <= 0) quitar(cartKey)
      else {
        const maxStock = Number(item.stock ?? 0)
        item.cantidad = maxStock > 0 ? Math.min(cantidad, maxStock) : cantidad
      }
    }
  }

  function vaciar() { items.value = [] }

  function openDrawer(nextView = 'cart') {
    view.value = nextView
    open.value = true
  }

  return { items, open, view, count, total, subtotalBase, savings, agregar, quitar, cambiarCantidad, vaciar, openDrawer }
})
