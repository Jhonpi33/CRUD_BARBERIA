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
  client: '/panel/cliente',
  barber: '/panel/barbero',
  barbershop_owner: '/panel/barberia',
  barber_employee: '/panel/empleado',
  admin: '/panel/admin',
}

/** Nombre legible de cada rol. */
export const ROLE_LABEL = {
  client: 'Cliente',
  barber: 'Barbero',
  barbershop_owner: 'Propietario de barbería',
  barber_employee: 'Empleado de barbería',
  admin: 'Administración',
}

export function friendlyAuthError(error) {
  if (error?.response?.data?.message) return error.response.data.message
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return 'El servidor tardó demasiado en responder. Intenta de nuevo.'
  }
  return 'No pudimos conectar con Elysia. Comprueba que el servidor esté activo e intenta de nuevo.'
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(false)
  const initialized = ref(false)
  const pendingVerification = ref(null)

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
    pendingVerification.value = null
    initialized.value = true
    localStorage.setItem(TOKEN_KEY, newToken)
  }

  function clearSession() {
    token.value = ''
    user.value = null
    profile.value = null
    pendingVerification.value = null
    initialized.value = true
    localStorage.removeItem(TOKEN_KEY)
  }

  // Cuenta creada a la espera del código de 6 dígitos. Vive solo en memoria
  // (no en la URL ni en localStorage): si se recarga la página, se pide otro.
  function setPendingVerification(info) {
    pendingVerification.value = info
  }

  /**
   * POST /api/auth/register — el rol se asigna después, en /seleccionar-rol.
   *
   * Si la validación de correo está activa, la respuesta trae `verification`
   * y NO hay token todavía: toca pasar por /verificar-correo.
   *
   * @returns {Promise<{user: object, verification: object|null}>}
   */
  async function register({ name, email, password }) {
    loading.value = true
    try {
      const { data } = await api.post('/auth/register', { name, email, password })
      if (data.verification) {
        pendingVerification.value = { ...data.verification }
        return { user: data.user, verification: data.verification }
      }
      saveSession(data.token, data.user)
      return { user: data.user, verification: null }
    } finally {
      loading.value = false
    }
  }

  /**
   * POST /api/auth/verify-email — valida el código y abre sesión.
   * Los errores (400) los recibe quien llama para pintarlos en el formulario.
   */
  async function verifyEmail({ email, code }) {
    loading.value = true
    try {
      const { data } = await api.post('/auth/verify-email', { email, code })
      saveSession(data.token, data.user)
      pendingVerification.value = null
      // Igual que en login: trae el perfil para que el guard decida bien.
      await fetchProfile()
      return data.user
    } finally {
      loading.value = false
    }
  }

  /**
   * POST /api/auth/resend-verification — código nuevo (el anterior caduca).
   * El backend responde igual exista o no la cuenta; aquí solo se conserva
   * el `devCode` si el entorno de desarrollo lo devuelve.
   */
  async function resendVerification(email) {
    const { data } = await api.post('/auth/resend-verification', { email })
    pendingVerification.value = {
      email,
      devCode: data?.verification?.devCode || null,
      sent: Boolean(data?.verification?.sent),
    }
    return data
  }

  /** POST /api/auth/login */
  async function login({ email, password }) {
    loading.value = true
    try {
      const { data } = await api.post('/auth/login', { email, password })
      saveSession(data.token, data.user)
      // Carga el perfil junto con el login: evita que un usuario con perfil
      // completado caiga al onboarding por una condición de carrera del guard
      // (el guard no vuelve a traer la sesión si ya estaba inicializada).
      await fetchProfile()
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

  /** PATCH /api/auth/me — nombre y teléfono de la propia cuenta. */
  async function updateAccount({ name, phone }) {
    const payload = {}
    if (name !== undefined) payload.name = name
    if (phone !== undefined) payload.phone = phone
    const { data } = await api.patch('/auth/me', payload)
    user.value = data.user
    return data.user
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
    pendingVerification,
    setPendingVerification,
    register,
    verifyEmail,
    resendVerification,
    login,
    fetchMe,
    fetchProfile,
    saveProfile,
    completeProfile,
    setRole,
    updateAccount,
    forgotPassword,
    resetPassword,
    logout,
  }
})
