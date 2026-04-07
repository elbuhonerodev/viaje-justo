import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Login from '../views/Login.vue'

const routes = [
  { path: '/', component: Login, meta: { requiresAuth: false } },
  { path: '/signup', component: () => import('../views/Signup.vue'), meta: { requiresAuth: false } },
  { 
    path: '/dashboard-user', 
    component: () => import('../views/DashboardUser.vue'), 
    meta: { requiresAuth: true } // Cualquier usuario autenticado puede acceder
  },
  { 
    path: '/reset-password', 
    name: 'ResetPassword',
    component: () => import('../views/ResetPassword.vue'), 
    meta: { requiresAuth: false } 
  },
  {
    path: '/viaje/:id',
    name: 'TripDetail',
    component: () => import('../views/TripDetail.vue'),
    meta: { requiresAuth: true }, // Cualquier usuario autenticado puede acceder
    props: true
  },
  {
    path: '/join/:id',
    name: 'JoinTrip',
    component: () => import('../views/JoinTrip.vue'),
    meta: { requiresAuth: false } // It handles auth checks internally
  },
  { 
    path: '/dashboard-admin', 
    component: () => import('../views/DashboardAdmin.vue'), 
    meta: { requiresAuth: true, role: 'super_admin' } 
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth) {
    if (!authStore.user) {
      return next('/')
    }

    // Solo bloquear rutas de admin si el rol no es super_admin
    if (to.meta.role === 'super_admin' && authStore.role !== 'super_admin') {
      return next('/dashboard-user')
    }
  }

  // Redirect authenticated users away from Login/Signup
  // EXCEPCION: No interceptar las rutas de join ni el signup con parámetro joinTrip
  // para que los usuarios ya autenticados puedan unirse a un viaje
  if (!to.meta.requiresAuth && authStore.user) {
    // Dejar pasar /join/:id siempre
    if (to.name === 'JoinTrip') return next()
    // Dejar pasar el reset-password (aunque tengan sesion, van a resetearla)
    if (to.name === 'ResetPassword') return next()
    // Dejar pasar /signup?joinTrip=... 
    if (to.path === '/signup' && to.query.joinTrip) return next()

    if (authStore.role === 'super_admin') return next('/dashboard-admin')
    if (authStore.role === 'usuario') return next('/dashboard-user')
    // Para roles nuevos como Individual/Grupal, también ir al dashboard-user
    return next('/dashboard-user')
  }

  next()
})

export default router
