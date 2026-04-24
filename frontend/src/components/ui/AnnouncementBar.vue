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
const items = [
  'Envío gratis sobre $49.990',
  'Skincare coreano 100% original',
  'Despacho local en Antofagasta',
  'Ayuda por WhatsApp para elegir tu rutina',
  'Novedades y lanzamientos de K-Beauty',
]
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
