<template>
  <div class="announcement-bar" aria-label="Anuncios Bloomskin">
    <div class="announcement-track">
      <div v-for="loop in 2" :key="loop" class="announcement-row" aria-hidden="true">
        <span v-for="(item, index) in items" :key="`${loop}-${index}`" class="announcement-item">
          {{ item }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed} from 'vue'
import {useStoreConfig} from '../../stores/storeConfig.js'
const config=useStoreConfig()
const items = computed(()=>[
  config.operations.free_shipping_enabled && config.operations.delivery_enabled ? `Envío gratis desde $${Number(config.operations.free_shipping_threshold).toLocaleString('es-CL')}` : '',
  config.operations.delivery_enabled ? config.operations.national_enabled ? 'Envíos a todo Chile continental' : `Despacho local en ${config.operations.pickup_city}` : '',
  'Skincare coreano 100% original',
  config.operations.pickup_enabled ? `Retiro en ${config.operations.pickup_address}` : '',
  'Ayuda por WhatsApp para elegir tu rutina',
  'Novedades y lanzamientos de K-Beauty',
].filter(Boolean))
</script>

<style scoped>
.announcement-bar {
  background: linear-gradient(90deg, #bf547a, #cf6d8f, #bf547a);
  color: #fff;
  overflow: hidden;
  position: relative;
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
}

.announcement-track {
  display: flex;
  width: max-content;
  animation: ticker 28s linear infinite;
}

.announcement-row {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
}

.announcement-item {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
}

.announcement-item::after {
  content: '•';
  opacity: 0.55;
}

@keyframes ticker {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@media (max-width: 720px) {
  .announcement-item {
    padding: 9px 14px;
    font-size: 10px;
    letter-spacing: 0.1em;
  }
}
</style>
