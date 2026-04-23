<template>
  <div class="content-page">
    <AnnouncementBar />

    <header class="content-header">
      <div class="content-header-inner">
        <RouterLink to="/" class="header-brand">
          <img src="/brand/bloomskin-logo.png" alt="Bloomskin" class="header-logo" />
          <span>
            <strong>bloomskin</strong>
            <small>K-Beauty - Chile</small>
          </span>
        </RouterLink>

        <nav class="content-nav">
          <RouterLink to="/">Home</RouterLink>
          <RouterLink to="/catalogo">Catalogo</RouterLink>
          <RouterLink to="/contacto">Contacto</RouterLink>
        </nav>
      </div>
    </header>

    <main class="content-main">
      <section class="content-hero">
        <div class="content-tag">Informacion Bloomskin</div>
        <h1>{{ page.title }}</h1>
        <p>{{ page.intro }}</p>
      </section>

      <section class="content-card">
        <p>{{ page.body }}</p>
        <div class="content-actions">
          <RouterLink class="ghost-btn" to="/catalogo">Volver al catalogo</RouterLink>
          <RouterLink class="primary-btn" to="/contacto">Hablar con Bloomskin</RouterLink>
        </div>
      </section>
    </main>

    <StoreFooter />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { settingsApi } from '../api/index.js'
import StoreFooter from '../components/store/StoreFooter.vue'
import AnnouncementBar from '../components/ui/AnnouncementBar.vue'

const route = useRoute()

const site = ref({
  legal: {
    shipping_policy: {
      title: 'Tiempos y condiciones de envio',
      intro: 'Despachamos desde Antofagasta y coordinamos cada pedido segun destino y disponibilidad.',
      body: 'Antofagasta se calcula por distancia desde Bloomskin. Fuera de Antofagasta usamos Blue Express. Sobre $49.990 el envio es gratis cuando corresponda segun configuracion vigente. Los tiempos pueden variar en dias de alta demanda.',
    },
    returns_policy: {
      title: 'Cambios y devoluciones',
      intro: 'Si tu pedido llega con algun problema, escribenos para revisarlo caso a caso.',
      body: 'Aceptamos revisiones por productos danados, errores de preparacion o incidencias de transporte. Para evaluar un caso necesitaremos numero de pedido, fotos y contacto dentro del plazo informado por Bloomskin.',
    },
    shipping_conditions: {
      title: 'Condiciones de despacho',
      intro: 'Estas condiciones resumen como operan nuestros envios dentro de Chile.',
      body: 'La clienta debe ingresar datos correctos y completos para evitar retrasos. Si el courier no logra entregar por direccion incompleta o ausencia reiterada, el pedido puede requerir coordinacion adicional.',
    },
  },
})

const page = computed(() => {
  const key = route.meta.contentKey || 'shipping_policy'
  return site.value.legal?.[key] || site.value.legal.shipping_policy
})

async function loadSite() {
  try {
    const { data } = await settingsApi.site()
    if (data) site.value = data
  } catch (error) {
    console.error('No se pudo cargar el contenido legal', error)
  }
}

watch(page, value => {
  document.title = `${value.title} | Bloomskin`
}, { immediate: true })

onMounted(loadSite)
</script>

<style scoped>
.content-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fffdfd, #fff5f8 22%, #fefcfd 100%);
}

.content-header {
  background: rgba(255, 255, 255, 0.94);
  border-bottom: 1px solid rgba(191, 84, 122, 0.12);
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(12px);
}

.content-header-inner,
.content-main {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 28px;
}

.content-header-inner {
  min-height: 78px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.header-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.header-brand strong {
  display: block;
  font-family: 'Cormorant Garamond', serif;
  font-size: 30px;
  color: var(--heart-deep);
  line-height: .9;
}

.header-brand small {
  display: block;
  margin-top: 4px;
  font-size: 9px;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.header-logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.content-nav {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}

.content-nav a {
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--dark-mid);
}

.content-main {
  padding-top: 52px;
  padding-bottom: 24px;
}

.content-hero {
  text-align: center;
  max-width: 760px;
  margin: 0 auto 28px;
}

.content-tag {
  display: inline-flex;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(196, 100, 122, 0.12);
  color: var(--rose);
  font-size: 10px;
  letter-spacing: .22em;
  text-transform: uppercase;
}

.content-hero h1 {
  margin-top: 12px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 56px;
  line-height: 1;
  color: var(--dark);
}

.content-hero p,
.content-card p {
  color: var(--dark-mid);
  line-height: 1.9;
  font-size: 15px;
}

.content-card {
  max-width: 860px;
  margin: 0 auto;
  padding: 34px;
  border-radius: 32px;
  background: linear-gradient(145deg, #fff7fa, #fffdfd);
  border: 1px solid rgba(191, 84, 122, 0.12);
  box-shadow: 0 16px 40px rgba(148, 89, 108, 0.08);
}

.content-actions {
  margin-top: 28px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.primary-btn,
.ghost-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 18px;
  border-radius: 999px;
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.primary-btn {
  background: var(--rose-dark);
  color: #fff;
}

.ghost-btn {
  border: 1px solid rgba(191, 84, 122, 0.16);
  color: var(--rose-dark);
  background: #fff;
}

@media (max-width: 720px) {
  .content-header-inner {
    flex-direction: column;
    justify-content: center;
    padding-top: 14px;
    padding-bottom: 14px;
  }

  .content-main {
    padding-left: 20px;
    padding-right: 20px;
  }

  .content-hero h1 {
    font-size: 42px;
  }

  .content-card {
    padding: 24px 20px;
  }
}
</style>
