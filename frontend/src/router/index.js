import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '../stores/auth'

import PublicLayout from '../layouts/PublicLayout.vue'
import AuthLayout from '../layouts/AuthLayout.vue'
import PanelLayout from '../layouts/PanelLayout.vue'

import Home from '../views/Home.vue'
import Features from '../views/Features.vue'
import Pricing from '../views/Pricing.vue'
import Legal from '../views/Legal.vue'
import PublicProfile from '../views/PublicProfile.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import RecoverPassword from '../views/RecoverPassword.vue'
import SelectRole from '../views/SelectRole.vue'
import BarberOnboarding from '../views/BarberOnboarding.vue'
import BarbershopOnboarding from '../views/BarbershopOnboarding.vue'
import BarberPanel from '../views/panels/BarberPanel.vue'
import BarbershopPanel from '../views/panels/BarbershopPanel.vue'
import EmployeePanel from '../views/panels/EmployeePanel.vue'
import AdminPanel from '../views/panels/AdminPanel.vue'

const routes = [
  // ---------- Áreas públicas ----------
  {
    path: '/',
    component: PublicLayout,
    children: [
      { path: '', name: 'home', component: Home },
      { path: 'funciones', name: 'features', component: Features },
      { path: 'precios', name: 'pricing', component: Pricing },
      { path: 'legal/:doc?', name: 'legal', component: Legal },
      { path: 'u/:slug', name: 'public-profile', component: PublicProfile },
    ],
  },

  // ---------- Autenticación (solo visitantes) ----------
  {
    path: '/',
    component: AuthLayout,
    meta: { guestOnly: true },
    children: [
      { path: 'login', name: 'login', component: Login },
      { path: 'registro', alias: 'register', name: 'register', component: Register },
      { path: 'recuperar-contrasena', name: 'recover-password', component: RecoverPassword },
    ],
  },

  // ---------- Flujo de cuenta (autenticado) ----------
  {
    path: '/',
    component: AuthLayout,
    meta: { requiresAuth: true },
    children: [
      { path: 'seleccionar-rol', name: 'select-role', component: SelectRole },
      {
        path: 'onboarding/barbero',
        name: 'barber-onboarding',
        component: BarberOnboarding,
        meta: { roles: ['barber'], onboarding: true },
      },
      {
        path: 'onboarding/barberia',
        name: 'barbershop-onboarding',
        component: BarbershopOnboarding,
        meta: { roles: ['barbershop_owner'], onboarding: true },
      },
    ],
  },

  // ---------- Paneles privados (por rol) ----------
  {
    path: '/panel',
    component: PanelLayout,
    meta: { requiresAuth: true },
    children: [
      { path: 'barbero', name: 'barber-panel', component: BarberPanel, meta: { roles: ['barber'] } },
      {
        path: 'barberia',
        name: 'barbershop-panel',
        component: BarbershopPanel,
        meta: { roles: ['barbershop_owner'] },
      },
      {
        path: 'empleado',
        name: 'employee-panel',
        component: EmployeePanel,
        meta: { roles: ['barber_employee'] },
      },
      { path: 'admin', name: 'admin-panel', component: AdminPanel, meta: { roles: ['admin'] } },
    ],
  },

  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

/** Garantiza que el store tenga el usuario antes de evaluar los guards. */
async function ensureSession() {
  const auth = useAuthStore()
  if (!auth.initialized) {
    await auth.fetchMe()
  }
}

router.beforeEach(async (to) => {
  await ensureSession()

  const auth = useAuthStore()

  // 1) Rutas que exigen sesión (/seleccionar-rol, onboarding, paneles)
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (!auth.isAuthenticated) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }

    // Sin rol definido: obligar a elegir tipo de cuenta.
    if (!auth.hasRole && to.name !== 'select-role') {
      return '/seleccionar-rol'
    }

    const isOnboarding = Boolean(to.meta.onboarding)

    // Con rol pero sin perfil completo: no dejar avanzar al panel.
    // El onboarding siempre es accesible (también sirve para editar el perfil).
    if (auth.needsOnboarding && !isOnboarding) {
      return auth.onboardingPath
    }

    // Rol definido pero intentando entrar a un panel que no le corresponde.
    const requiredRoles = to.meta.roles
    if (requiredRoles && !requiredRoles.includes(auth.role)) {
      return auth.panelPath
    }

    return true
  }

  // 2) Rutas solo para visitantes (/login, /registro, /recuperar-contrasena)
  if (to.matched.some((record) => record.meta.guestOnly) && auth.isAuthenticated) {
    // Con sesión iniciada: según avance del onboarding, al onboarding o al panel.
    if (!auth.hasRole) return '/seleccionar-rol'
    return auth.needsOnboarding ? auth.onboardingPath : auth.panelPath
  }

  return true
})

export default router
