import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useCustomerAuthStore } from '../stores/customerAuth.js'

const routes = [
  {
    path: '/',
    name: 'store',
    component: () => import('../views/StoreView.vue'),
  },
  {
    path: '/catalogo',
    name: 'catalog',
    component: () => import('../views/CatalogView.vue'),
  },
  {
    path: '/producto/:id',
    name: 'product-detail',
    component: () => import('../views/ProductDetailView.vue'),
  },
  {
    path: '/admin/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/mi-cuenta',
    name: 'customer-account',
    component: () => import('../views/CustomerAccountView.vue'),
    meta: { requiresClientAuth: true },
  },
  {
    path: '/envios',
    name: 'shipping-policy',
    component: () => import('../views/SiteContentView.vue'),
    meta: { contentKey: 'shipping_policy' },
  },
  {
    path: '/cambios-y-devoluciones',
    name: 'returns-policy',
    component: () => import('../views/SiteContentView.vue'),
    meta: { contentKey: 'returns_policy' },
  },
  {
    path: '/condiciones-de-envio',
    name: 'shipping-conditions',
    component: () => import('../views/SiteContentView.vue'),
    meta: { contentKey: 'shipping_conditions' },
  },
  {
    path: '/contacto',
    name: 'contact',
    component: () => import('../views/ContactView.vue'),
  },
  {
    path: '/quienes-somos',
    name: 'about',
    component: () => import('../views/AboutView.vue'),
  },
  {
    path: '/recuperar-contrasena',
    name: 'password-reset',
    component: () => import('../views/PasswordResetView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const adminAuth = useAuthStore()
  const customerAuth = useCustomerAuthStore()
  if (to.meta.requiresAuth && !adminAuth.isAuthenticated) {
    return { name: 'login' }
  }
  if (to.meta.requiresClientAuth && !customerAuth.isAuthenticated) {
    return { name: 'store' }
  }
})

export default router
