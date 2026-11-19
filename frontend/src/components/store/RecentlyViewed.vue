<template>
  <section v-if="products.length" class="recent-products"><h2>Vistos recientemente</h2><div class="recent-grid"><ProductCard v-for="product in products" :key="product.id" :producto="product" quick-view @quick-view="selected = $event" /></div><ProductQuickViewModal :product="selected" @close="selected = null" /></section>
</template>
<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { readStoredList } from '../../utils/browserStorage.js'
import ProductCard from './ProductCard.vue'
import ProductQuickViewModal from './ProductQuickViewModal.vue'
const props = defineProps({ catalogProducts: { type: Array, default: () => [] } })
const saved = ref(readStoredList('bs_recent_products', 4)), selected = ref(null)
const products = computed(() => saved.value.map(item => props.catalogProducts.find(product => Number(product.id) === Number(item.id))).filter(Boolean))
const refresh = () => { saved.value = readStoredList('bs_recent_products', 4) }
onMounted(() => window.addEventListener('bloomskin:recent-products', refresh))
onBeforeUnmount(() => window.removeEventListener('bloomskin:recent-products', refresh))
</script>
<style scoped>
.recent-products { max-width: 1280px; margin: 40px auto; padding: 0 20px; } h2 { font-family: Georgia,serif; font-size: 28px; margin-bottom: 20px; }
.recent-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 16px; }
@media(max-width:720px){.recent-grid {grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}}
@media(max-width:359px){.recent-grid {grid-template-columns:minmax(0,1fr)}}
</style>
