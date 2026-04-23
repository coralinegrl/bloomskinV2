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
]

const router = createRouter({
  history: createWebHistory(),
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
