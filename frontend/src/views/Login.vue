<script setup>
import { reactive, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore, friendlyAuthError } from '../stores/auth'
import Button from '../components/Button.vue'
import PasswordField from '../components/PasswordField.vue'
import GoogleSignIn from '../components/GoogleSignIn.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const form = reactive({ email: '', password: '' })
const error = ref('')
const challenge = ref(null)
const code = ref('')

const redirectTarget = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') ? target : null
})

async function onSubmit() {
  if (auth.loading) return
  error.value = ''
  try {
    const user = await auth.login({ email: form.email, password: form.password })
    form.password = ''
    if (user.loginChallenge) {
      challenge.value = user.loginChallenge
      code.value = ''
      return
    }
    router.push(redirectTarget.value || auth.panelPath)
    return user
  } catch (err) {
    // Cuenta creada y sin verificar: en vez de un error, seguimos al código.
    const data = err?.response?.data
    if (data?.code === 'EMAIL_NOT_VERIFIED') {
      const pendiente = data.email || form.email
      auth.setPendingVerification({ email: pendiente, devCode: null })
      const query = { email: pendiente }
      if (redirectTarget.value) query.redirect = redirectTarget.value
      router.push({ path: '/verificar-correo', query })
      return
    }
    error.value = friendlyAuthError(err)
  }
}

async function submitCode() {
  if (auth.loading || !challenge.value) return
  error.value = ''
  if (!/^\d{6}$/.test(code.value)) {
    error.value = 'Escribe los seis dígitos del código.'
    return
  }
  try {
    await auth.verifyLoginCode({ challengeToken: challenge.value.token, code: code.value })
    challenge.value = null
    code.value = ''
    router.push(redirectTarget.value || auth.panelPath)
  } catch (err) {
    error.value = friendlyAuthError(err)
    code.value = ''
  }
}

function backToPassword() {
  challenge.value = null
  code.value = ''
  error.value = ''
}
</script>

<template>
  <div class="auth-form">
    <h1 class="auth-form__title">{{ challenge ? 'Confirma tu acceso' : 'Iniciar sesión' }}</h1>
    <p v-if="!challenge" class="auth-form__lead">Bienvenido de nuevo a Elysia.</p>
    <GoogleSignIn v-if="!challenge" />

    <form v-if="challenge" class="form" novalidate @submit.prevent="submitCode">
      <p class="auth-form__lead" role="status">
        Enviamos un código de seis dígitos a <strong>{{ challenge.email }}</strong>.
        Revisa tu bandeja y la carpeta de spam. El código vence en diez minutos.
      </p>
      <label class="form__field">
        <span class="form__label">Código de acceso</span>
        <input v-model.trim="code" class="form__input" type="text" inputmode="numeric"
          autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required
          :disabled="auth.loading" />
      </label>
      <p v-if="error" class="form__error" role="alert">{{ error }}</p>
      <Button type="submit" variant="primary" :disabled="auth.loading">
        {{ auth.loading ? 'Verificando…' : 'Verificar y entrar' }}
      </Button>
      <Button variant="secondary" :disabled="auth.loading" @click="backToPassword">
        Volver o solicitar otro código
      </Button>
    </form>

    <form v-else class="form" novalidate @submit.prevent="onSubmit">
      <label class="form__field">
        <span class="form__label">Correo electrónico</span>
        <input
          v-model.trim="form.email"
          class="form__input"
          type="email"
          name="email"
          autocomplete="email"
          placeholder="tu@correo.com"
          required
        />
      </label>

      <label class="form__field">
        <span class="form__label">Contraseña</span>
        <PasswordField
          v-model="form.password"
          name="password"
          autocomplete="current-password"
          placeholder="••••••••"
        />
      </label>

      <p v-if="error" class="form__error" role="alert">{{ error }}</p>

      <Button type="submit" variant="primary" :disabled="auth.loading">
        {{ auth.loading ? 'Entrando…' : 'Entrar' }}
      </Button>
    </form>

    <p v-if="!challenge" class="auth-form__link">
      <RouterLink to="/recuperar-contrasena">¿Olvidaste tu contraseña?</RouterLink>
    </p>
    <p v-if="!challenge" class="auth-form__link">
      ¿No tienes cuenta?
      <RouterLink to="/registro">Crea una cuenta</RouterLink>
    </p>
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

.auth-form__link {
  margin-top: var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.auth-form__link a {
  color: var(--color-primary-soft);
}
</style>
