/*
  Store de autenticación (Pinia).
  Guarda el token y el usuario de sesión. Nunca guarda contraseñas.
  El rol que vive aquí solo sirve para decidir qué pantallas mostrar;
  la autorización real siempre la valida el backend.
*/
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import api, { TOKEN_KEY } from '../services/api'

/** Ruta de panel según rol. Fuente de verdad para las redirecciones. */
export const ROLE_PANEL = {
  barber: '/panel/barbero',
  barbershop_owner: '/panel/barberia',
  barber_employee: '/panel/empleado',
  admin: '/panel/admin',
}

/** Nombre legible de cada rol. */
export const ROLE_LABEL = {
  barber: 'Barbero',
  barbershop_owner: 'Propietario de barbería',
  barber_employee: 'Empleado de barbería',
  admin: 'Administración',
}

export function friendlyAuthError(error) {
  return (
    error?.response?.data?.message ||
    'No se pudo conectar con el servidor. Intenta de nuevo.'
  )
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(false)
  const initialized = ref(false)

  const isAuthenticated = computed(() => Boolean(token.value && user.value))
  const role = computed(() => user.value?.role || null)
  const hasRole = computed(() => Boolean(role.value))
  const roleLabel = computed(() => (role.value ? ROLE_LABEL[role.value] : null))
  const panelPath = computed(() => (role.value ? ROLE_PANEL[role.value] : '/seleccionar-rol'))

  // Onboarding: el perfil vive en MongoDB, no en localStorage.
  const onboardingPath = computed(() => {
    if (role.value === 'barber') return '/onboarding/barbero'
    if (role.value === 'barbershop_owner') return '/onboarding/barberia'
    return null
  })
  // Roles sin onboarding propio (admin, empleado) nunca quedan atascados.
  const needsOnboarding = computed(() => {
    if (!onboardingPath.value) return false
    return !profile.value?.completedAt
  })

  function saveSession(newToken, newUser) {
    token.value = newToken
    user.value = newUser
    localStorage.setItem(TOKEN_KEY, newToken)
  }

  function clearSession() {
    token.value = ''
    user.value = null
    profile.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  /** POST /api/auth/register — el rol se asigna después, en /seleccionar-rol. */
  async function register({ name, email, password }) {
    loading.value = true
    try {
      const { data } = await api.post('/auth/register', { name, email, password })
      saveSession(data.token, data.user)
      return data.user
    } finally {
      loading.value = false
    }
  }

  /** POST /api/auth/login */
  async function login({ email, password }) {
    loading.value = true
    try {
      const { data } = await api.post('/auth/login', { email, password })
      saveSession(data.token, data.user)
      return data.user
    } finally {
      loading.value = false
    }
  }

  /** GET /api/auth/me — valida el token guardado al abrir la app o recargar la página. */
  async function fetchMe() {
    if (!token.value) {
      initialized.value = true
      return null
    }
    try {
      const { data } = await api.get('/auth/me')
      user.value = data.user
      // Carga el perfil junto con la sesión: permite retomar el onboarding.
      await fetchProfile()
      return data.user
    } catch {
      clearSession()
      return null
    } finally {
      initialized.value = true
    }
  }

  /**
   * GET /api/profile/me — trae (o crea vacío) el perfil en MongoDB.
   * El backend crea el registro; el frontend no inventa datos locales.
   */
  async function fetchProfile() {
    if (!token.value) return null
    try {
      const { data } = await api.get('/profile/me')
      profile.value = data.profile
      return data.profile
    } catch {
      profile.value = null
      return null
    }
  }

  /** PUT /api/profile/me — guarda parcialmente (retoma onboarding incompleto). */
  async function saveProfile(payload) {
    loading.value = true
    try {
      const { data } = await api.put('/profile/me', payload)
      profile.value = data.profile
      return data.profile
    } finally {
      loading.value = false
    }
  }

  /** PATCH /api/profile/me/complete — valida obligatorios y publica el enlace. */
  async function completeProfile() {
    loading.value = true
    try {
      const { data } = await api.patch('/profile/me/complete')
      profile.value = data.profile
      return data.profile
    } finally {
      loading.value = false
    }
  }

  /** PATCH /api/auth/role — solo funciona si el usuario aún no tiene rol (lo valida el backend). */
  async function setRole(newRole) {
    loading.value = true
    try {
      const { data } = await api.patch('/auth/role', { role: newRole })
      user.value = data.user
      return data.user
    } finally {
      loading.value = false
    }
  }

  /** POST /api/auth/forgot-password */
  async function forgotPassword(email) {
    const { data } = await api.post('/auth/forgot-password', { email })
    return data
  }

  /** POST /api/auth/reset-password */
  async function resetPassword({ token: resetToken, password }) {
    const { data } = await api.post('/auth/reset-password', {
      token: resetToken,
      password,
    })
    return data
  }

  function logout() {
    clearSession()
  }

  return {
    token,
    user,
    profile,
    loading,
    initialized,
    isAuthenticated,
    role,
    hasRole,
    roleLabel,
    panelPath,
    onboardingPath,
    needsOnboarding,
    register,
    login,
    fetchMe,
    fetchProfile,
    saveProfile,
    completeProfile,
    setRole,
    forgotPassword,
    resetPassword,
    logout,
  }
})
