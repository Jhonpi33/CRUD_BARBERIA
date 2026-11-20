<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore, friendlyAuthError } from '../stores/auth'
import api from '../services/api'
import Icon from './Icon.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const host = ref(null)
const loading = ref(true)
const error = ref('')
const enabled = ref(false)
let active = true
const controller = new AbortController()

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  return new Promise((resolve, reject) => {
    let script = document.getElementById('google-identity')
    const finish = event => {
      clearTimeout(timer)
      script.removeEventListener('load', finish)
      script.removeEventListener('error', finish)
      if (event?.type === 'load' && window.google?.accounts?.id) resolve()
      else {
        script.remove()
        reject(new Error('Google no respondió'))
      }
    }
    const timer = setTimeout(() => finish(), 12000)
    if (!script) {
      script = document.createElement('script')
      script.id = 'google-identity'
      script.src = 'https://accounts.google.com/gsi/client?hl=es'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', finish, { once: true })
    script.addEventListener('error', finish, { once: true })
  })
}

async function handleCredential(response) {
  if (!active || auth.loading) return
  error.value = ''
  try {
    await auth.loginWithGoogle(response.credential)
    if (!active) return
    const target = route.query.redirect
    router.push(typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
      ? target : auth.panelPath)
  } catch (err) {
    if (active) {
      error.value = friendlyAuthError(err)
      enabled.value = false
    }
  }
}

async function initialize() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/auth/google/config', {
      signal: controller.signal, withCredentials: true,
    })
    if (!active) return
    if (!data.enabled) {
      error.value = 'El acceso con Google aún no está habilitado. Continúa con tu correo.'
      return
    }
    await loadGoogleScript()
    if (!active) return
    window.google.accounts.id.initialize({
      client_id: data.clientId,
      nonce: data.nonce,
      callback: handleCredential,
      auto_select: false,
    })
    host.value.replaceChildren()
    window.google.accounts.id.renderButton(host.value, {
      type: 'standard', theme: 'outline', size: 'large', text: 'continue_with',
      shape: 'rectangular', locale: 'es', width: Math.min(360, host.value.clientWidth || 280),
    })
    enabled.value = true
  } catch {
    if (active) error.value = 'No pudimos conectar con Google. Puedes reintentar o usar tu correo.'
  } finally {
    if (active) loading.value = false
  }
}

onMounted(initialize)
onBeforeUnmount(() => {
  active = false
  controller.abort()
})
</script>

<template>
  <div class="google-signin" :aria-busy="auth.loading || loading">
    <p v-if="loading || auth.loading" class="google-signin__message" role="status">
      {{ auth.loading ? 'Entrando a Elysia…' : 'Conectando con Google…' }}
    </p>
    <div v-show="enabled && !auth.loading" ref="host" class="google-signin__button" />
    <button v-if="!enabled && !loading && !auth.loading" class="google-signin__placeholder" type="button" disabled>
      <Icon name="google" :size="20" /> Continuar con Google
    </button>
    <p v-if="error" class="google-signin__message" role="status">{{ error }}</p>
    <button v-if="error && !loading" class="google-signin__retry" type="button" :disabled="auth.loading" @click="initialize">
      Reintentar Google
    </button>
    <p class="google-signin__divider">o continúa con tu correo</p>
  </div>
</template>

<style scoped>
.google-signin { margin-bottom: var(--space-4); }
.google-signin__button { display: flex; justify-content: center; min-height: 44px; }
.google-signin__placeholder { display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; min-height: 44px; border: 1px solid var(--color-border); border-radius: 4px; background: white; color: #5f6368; font: inherit; margin-bottom: var(--space-2); cursor: not-allowed; }
.google-signin__message { font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: var(--space-2); }
.google-signin__retry { background: transparent; border: 0; color: var(--color-primary-soft); padding: 8px; cursor: pointer; }
.google-signin__divider { font-size: var(--font-size-sm); color: var(--color-text-muted); margin-top: var(--space-4); }
</style>
