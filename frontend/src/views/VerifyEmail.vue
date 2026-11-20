<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore, friendlyAuthError } from '../stores/auth'
import Button from '../components/Button.vue'
import Icon from '../components/Icon.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const code = ref('')
const error = ref('')
const notice = ref('')
const typedEmail = ref('')
const resendState = ref('idle') // idle | sending | sent
const cooldown = ref(0)
let timer = null

/**
 * El correo llega desde el registro o el login (query o store). Si alguien
 * abre la URL a mano, se le pide el correo antes de continuar.
 */
const email = computed(() => {
  const q = route.query.email
  return (typeof q === 'string' && q) || auth.pendingVerification?.email || ''
})

/** Solo en desarrollo, cuando el correo no pudo enviarse. */
const devCode = computed(() => auth.pendingVerification?.devCode || '')
const mailNotice = computed(() => auth.pendingVerification?.message || '')

const redirectTarget = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') ? target : null
})

const resendLabel = computed(() => {
  if (resendState.value === 'sending') return 'Enviando…'
  if (cooldown.value > 0) return `Reenviar en ${cooldown.value}s`
  return resendState.value === 'sent' ? 'Reenviar de nuevo' : 'No llegó el código'
})

/** Solo dígitos, máximo 6; al completar los 6 se verifica solo. */
function onInput(event) {
  // El input es controlado por `code` (no usa v-model): hay que leer el DOM.
  code.value = String(event.target.value).replace(/\D/g, '').slice(0, 6)
  error.value = ''
  if (code.value.length === 6) onSubmit()
}

async function onSubmit() {
  if (auth.loading || code.value.length !== 6 || !email.value) return
  error.value = ''
  try {
    await auth.verifyEmail({ email: email.value, code: code.value })
    router.push(redirectTarget.value || auth.panelPath)
  } catch (err) {
    // El backend responde 400 con el mensaje (intento vencido, código malo…).
    error.value = friendlyAuthError(err)
    code.value = ''
  }
}

function startCooldown(seconds) {
  cooldown.value = seconds
  clearInterval(timer)
  timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) clearInterval(timer)
  }, 1000)
}

async function onResend() {
  if (cooldown.value > 0 || resendState.value === 'sending' || !email.value) return
  error.value = ''
  notice.value = ''
  resendState.value = 'sending'
  try {
    await auth.resendVerification(email.value)
    resendState.value = 'sent'
    code.value = ''
    notice.value = 'Código reenviado. Revisa tu correo.'
    startCooldown(60)
  } catch (err) {
    error.value = friendlyAuthError(err)
    resendState.value = 'idle'
  }
}

/** Caso de acceso directo a la URL: primero se pide el correo. */
function onSubmitEmail() {
  const value = typedEmail.value.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    error.value = 'Escribe un correo válido.'
    return
  }
  error.value = ''
  auth.setPendingVerification({ email: value, devCode: null })
}

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="auth-form">
    <template v-if="email">
      <p class="verify__badge"><Icon name="mail" :size="18" /></p>
      <h1 class="auth-form__title">Verifica tu correo</h1>
      <p class="auth-form__lead">
        Enviamos un código de 6 dígitos a <strong>{{ email }}</strong>.
      </p>

      <p v-if="mailNotice" class="verify__notice" role="status">{{ mailNotice }}</p>
      <p v-if="devCode" class="verify__dev" role="status">
        Modo desarrollo: tu código es <strong>{{ devCode }}</strong>
      </p>
      <p v-if="notice && !mailNotice" class="verify__notice" role="status">{{ notice }}</p>

      <form class="form" novalidate @submit.prevent="onSubmit">
        <label class="form__field">
          <span class="form__label">Código de verificación</span>
          <input
            :value="code"
            class="form__input verify__code"
            type="text"
            name="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="123456"
            aria-describedby="code-hint"
            @input="onInput"
          />
          <span id="code-hint" class="form__hint">Si usas Android o iOS puede rellenarse solo.</span>
        </label>

        <p v-if="error" class="form__error" role="alert">{{ error }}</p>

        <Button type="submit" variant="primary" :disabled="auth.loading || code.length !== 6">
          {{ auth.loading ? 'Verificando…' : 'Verificar' }}
        </Button>
      </form>

      <div class="verify__actions">
        <button
          class="btn btn--secondary btn--sm"
          type="button"
          :disabled="cooldown > 0 || resendState === 'sending'"
          @click="onResend"
        >
          {{ resendLabel }}
        </button>
      </div>

      <p class="auth-form__link">
        ¿Correo equivocado?
        <RouterLink to="/registro">Vuelve al registro</RouterLink>
      </p>
    </template>

    <!-- Acceso directo a /verificar-correo sin correo en la URL -->
    <template v-else>
      <h1 class="auth-form__title">Verifica tu correo</h1>
      <p class="auth-form__lead">Escribe el correo con el que te registraste.</p>

      <form class="form" novalidate @submit.prevent="onSubmitEmail">
        <label class="form__field">
          <span class="form__label">Correo electrónico</span>
          <input
            v-model.trim="typedEmail"
            class="form__input"
            type="email"
            name="email"
            autocomplete="email"
            placeholder="tu@correo.com"
            required
          />
        </label>

        <p v-if="error" class="form__error" role="alert">{{ error }}</p>

        <Button type="submit" variant="primary">Buscar código</Button>
      </form>

      <p class="auth-form__link">
        ¿Aún no tienes cuenta?
        <RouterLink to="/registro">Crea una cuenta</RouterLink>
      </p>
    </template>
  </div>
</template>

<style scoped>
.auth-form {
  text-align: center;
}

.auth-form__title {
  font-size: var(--font-size-lg);
  margin-bottom: var(--space-2);
}

.auth-form__lead {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-5);
}

.auth-form__lead strong {
  color: var(--text);
  word-break: break-all;
}

.auth-form__link {
  margin-top: var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.auth-form__link a {
  color: var(--color-primary-soft);
}

.verify__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--accent);
  margin-bottom: var(--space-3);
}

.verify__code {
  text-align: center;
  letter-spacing: 0.45em;
  text-indent: 0.45em;
  font-size: var(--font-size-lg);
  font-variant-numeric: tabular-nums;
}

.verify__notice {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-3);
}

.verify__dev {
  font-size: var(--font-size-xs);
  color: var(--text);
  background: var(--surface-2);
  border: 1px dashed var(--accent);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-3);
}

.verify__actions {
  margin-top: var(--space-4);
  display: flex;
  justify-content: center;
}
</style>
