<template>
  <div v-if="previewMode" class="store-system-banner">Vista previa · cambios sin publicar · compras desactivadas<button type="button" @click="closePreview">Cerrar vista previa</button></div>
  <div v-else-if="!storeConfig.operations.accepting_orders && !String(route.path).startsWith('/admin')" class="store-system-banner" role="status">{{ storeConfig.operations.pause_message }}</div>
  <RouterView />
  <CartDrawer />
  <AuthModal />
  <AppToast />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { adminUnauthorizedEvent, clientUnauthorizedEvent, settingsApi } from './api/index.js'
import CartDrawer from './components/store/CartDrawer.vue'
import AuthModal from './components/store/AuthModal.vue'
import AppToast from './components/ui/AppToast.vue'
import { useAuthStore } from './stores/auth.js'
import { useCustomerAuthStore } from './stores/customerAuth.js'
import { useUiStore } from './stores/ui.js'
import {useStoreConfig} from './stores/storeConfig.js'
import {isContentPreview} from './utils/contentPreview.js'
const storeConfig=useStoreConfig(),previewMode=isContentPreview
function closePreview(){window.close()}
let settingsRefresh

const adminAuth = useAuthStore()
const customerAuth = useCustomerAuthStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()
const siteSettings = ref({
  seo: {
    site_name: 'Bloomskin',
    title_suffix: 'Bloomskin - K-Beauty Chile',
    default_title: 'Bloomskin - K-Beauty coreano en Chile',
    default_description: 'Skincare coreano original en Chile. Compra sérums, limpiadores, hidratantes y protección solar con envío a todo Chile.',
    og_image: '/brand/bloomskin-logo.png',
    favicon: '/brand/bloomskin-logo.png',
    ga_measurement_id: '',
  },
})
let analyticsLoadedId = ''

function handleAdminUnauthorized() {
  adminAuth.logout()
  if (router.currentRoute.value.meta.requiresAuth) {
    router.push({ name: 'login' })
  }
}

function handleClientUnauthorized() {
  customerAuth.logout()
  ui.info('Tu sesión de clienta venció. Ingresa nuevamente para seguir.')
  if (router.currentRoute.value.meta.requiresClientAuth) {
    router.push({ name: 'store' })
  }
}

function upsertMeta(name, content, attribute = 'name') {
  if (!content) return
  let tag = document.head.querySelector(`meta[${attribute}="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attribute, name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function applySeo() {
  const seo = siteSettings.value.seo || {}
  const pageTitles = {
    store: seo.default_title,
    catalog: `Catálogo | ${seo.site_name || 'Bloomskin'}`,
    'product-detail': `Producto | ${seo.site_name || 'Bloomskin'}`,
    'customer-account': `Mi cuenta | ${seo.site_name || 'Bloomskin'}`,
    'shipping-policy': `Envíos | ${seo.site_name || 'Bloomskin'}`,
    'returns-policy': `Cambios y devoluciones | ${seo.site_name || 'Bloomskin'}`,
    'shipping-conditions': `Condiciones de envío | ${seo.site_name || 'Bloomskin'}`,
    'terms-conditions': `Términos y condiciones | ${seo.site_name || 'Bloomskin'}`,
    contact: `Contacto | ${seo.site_name || 'Bloomskin'}`,
    about: `Quiénes somos | ${seo.site_name || 'Bloomskin'}`,
    'not-found': `Pagina no encontrada | ${seo.site_name || 'Bloomskin'}`,
    admin: `Admin | ${seo.site_name || 'Bloomskin'}`,
    login: `Admin login | ${seo.site_name || 'Bloomskin'}`,
  }
  const title = pageTitles[route.name] || seo.default_title || 'Bloomskin'
  document.title = title

  upsertMeta('description', seo.default_description || '')
  upsertMeta('og:title', title, 'property')
  upsertMeta('og:description', seo.default_description || '', 'property')
  upsertMeta('og:type', 'website', 'property')
  upsertMeta('og:image', seo.og_image || '/brand/bloomskin-logo.png', 'property')

  if (seo.favicon) {
    let favicon = document.head.querySelector('link[rel="icon"]')
    if (!favicon) {
      favicon = document.createElement('link')
      favicon.setAttribute('rel', 'icon')
      document.head.appendChild(favicon)
    }
    favicon.setAttribute('href', seo.favicon)
  }
}

function applyAnalytics() {
  if(previewMode) return
  const measurementId = siteSettings.value.seo?.ga_measurement_id || ''
  if (!measurementId || analyticsLoadedId === measurementId || typeof window === 'undefined') return

  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments)
  }

  if (!document.querySelector(`script[data-ga-id="${measurementId}"]`)) {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
    script.dataset.gaId = measurementId
    document.head.appendChild(script)
  }

  window.gtag('js', new Date())
  window.gtag('config', measurementId, { send_page_view: true })
  analyticsLoadedId = measurementId
}

async function loadSiteSettings() {
  try {
    const { data } = await settingsApi.site()
    storeConfig.setSite(data)
    if (data?.seo) siteSettings.value = data
  } catch (error) {
    console.error('No se pudo cargar SEO del sitio', error)
  }
}

onMounted(() => {
  window.addEventListener(adminUnauthorizedEvent, handleAdminUnauthorized)
  window.addEventListener(clientUnauthorizedEvent, handleClientUnauthorized)
  void loadSiteSettings()
  window.addEventListener('focus',loadSiteSettings)
  settingsRefresh=setInterval(()=>{if(document.visibilityState==='visible')void loadSiteSettings()},60000)
})

onBeforeUnmount(() => {
  window.removeEventListener('focus',loadSiteSettings)
  clearInterval(settingsRefresh)
  window.removeEventListener(adminUnauthorizedEvent, handleAdminUnauthorized)
  window.removeEventListener(clientUnauthorizedEvent, handleClientUnauthorized)
})

watch([route, siteSettings], () => {
  applySeo()
  applyAnalytics()
}, { immediate: true, deep: true })
</script>
<style scoped>.store-system-banner{padding:12px 20px;background:#fff1f6;border-bottom:1px solid #e5b4c8;color:#70324d;font-size:14px;line-height:1.5;display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap}.store-system-banner button{border:1px solid #bf547a;background:white;color:#70324d;border-radius:6px;min-height:44px;padding:8px 12px;cursor:pointer;font:inherit}</style>
