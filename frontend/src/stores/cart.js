import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])
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

  function agregar(producto) {
    const existing = items.value.find(i => i.id === producto.id)
    if (existing) {
      const maxStock = Number(producto.stock ?? existing.stock ?? 0)
      existing.stock = maxStock
      if (maxStock > 0 && existing.cantidad < maxStock) {
        existing.cantidad++
      }
    } else {
      items.value.push({ ...producto, cantidad: 1 })
    }
    view.value = 'cart'
    open.value = true
  }

  function quitar(id) {
    items.value = items.value.filter(i => i.id !== id)
  }

  function cambiarCantidad(id, cantidad) {
    const item = items.value.find(i => i.id === id)
    if (item) {
      if (cantidad <= 0) quitar(id)
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
