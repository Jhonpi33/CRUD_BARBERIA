<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, friendlyAuthError } from '../stores/auth'
import Button from '../components/Button.vue'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({
  professionalName: '',
  photoUrl: '',
  description: '',
  phone: '',
  location: '',
})

const errors = ref({})
const notice = ref('')
const loading = ref(true)

const publicLink = computed(() => {
  const slug = auth.profile?.slug
  return slug ? `${window.location.origin}/u/${slug}` : null
})

/** Carga el perfil existente desde MongoDB para retomar el onboarding. */
onMounted(async () => {
  if (!auth.profile) await auth.fetchProfile()
  const p = auth.profile
  if (p) {
    form.professionalName = p.professionalName || ''
    form.photoUrl = p.photoUrl || ''
    form.description = p.description || ''
    form.phone = p.phone || ''
    form.location = p.location || ''
  }
  loading.value = false
})

/** Validación en frontend (el backend también valida). */
function validate() {
  const e = {}
  const name = form.professionalName.trim()
  if (name.length < 2 || name.length > 80) e.professionalName = 'Tu nombre profesional debe tener entre 2 y 80 caracteres.'
  if (form.description.trim().length > 600) e.description = 'La descripción no puede superar 600 caracteres.'
  const phone = form.phone.trim()
  if (phone.length < 7 || phone.length > 30) e.phone = 'El teléfono debe tener entre 7 y 30 caracteres.'
  const location = form.location.trim()
  if (location.length < 3 || location.length > 160) e.location = 'Indica tu ubicación (ciudad o dirección).'
  if (form.photoUrl.trim() && !/^https?:\/\/\S+$/i.test(form.photoUrl.trim())) e.photoUrl = 'La foto debe ser un enlace http/https válido.'
  errors.value = e
  return Object.keys(e).length === 0
}

async function onSaveDraft() {
  notice.value = ''
  errors.value = {}
  try {
    await auth.saveProfile(payload())
    notice.value = 'Borrador guardado. Puedes cerrar sesión y continuar después.'
  } catch (err) {
    errors.value = {}
    notice.value = ''
    errors.value._form = friendlyAuthError(err)
  }
}

async function onFinish() {
  notice.value = ''
  errors.value = {}
  if (!validate()) return
  try {
    await auth.saveProfile(payload())
    await auth.completeProfile()
    router.push(auth.panelPath)
  } catch (err) {
    errors.value._form = friendlyAuthError(err)
  }
}

function payload() {
  return {
    professionalName: form.professionalName.trim(),
    photoUrl: form.photoUrl.trim(),
    description: form.description.trim(),
    phone: form.phone.trim(),
    location: form.location.trim(),
  }
}
</script>

<template>
  <div class="onboarding">
    <p class="onboarding__step">Paso 1 de 1 · Perfil de barbero</p>
    <h1 class="onboarding__title">Crea tu perfil profesional</h1>
    <p class="onboarding__lead">
      Esto es lo que verán tus clientes en tu enlace público. Puedes guardarlo a medias y
      volver cuando quieras.
    </p>

    <div v-if="loading" class="onboarding__loading">Cargando tu perfil…</div>

    <form v-else class="form onboarding__form" novalidate @submit.prevent="onFinish">
      <label class="form__field">
        <span class="form__label">Nombre profesional *</span>
        <input
          v-model="form.professionalName"
          class="form__input"
          type="text"
          placeholder="Ej. Carlos el Barbero"
          maxlength="80"
        />
        <span v-if="errors.professionalName" class="form__error">{{ errors.professionalName }}</span>
      </label>

      <label class="form__field">
        <span class="form__label">Foto (enlace) </span>
        <input
          v-model="form.photoUrl"
          class="form__input"
          type="url"
          placeholder="https://…"
          maxlength="300"
        />
        <span v-if="errors.photoUrl" class="form__error">{{ errors.photoUrl }}</span>
      </label>

      <label class="form__field">
        <span class="form__label">Descripción *</span>
        <textarea
          v-model="form.description"
          class="form__input form__textarea"
          placeholder="Cuéntale a tus clientes quién eres y tu estilo."
          maxlength="600"
          rows="4"
        ></textarea>
        <span class="form__hint">{{ form.description.length }}/600</span>
        <span v-if="errors.description" class="form__error">{{ errors.description }}</span>
      </label>

      <label class="form__field">
        <span class="form__label">Teléfono *</span>
        <input
          v-model="form.phone"
          class="form__input"
          type="tel"
          placeholder="Ej. 300 123 4567"
          maxlength="30"
        />
        <span v-if="errors.phone" class="form__error">{{ errors.phone }}</span>
      </label>

      <label class="form__field">
        <span class="form__label">Ubicación *</span>
        <input
          v-model="form.location"
          class="form__input"
          type="text"
          placeholder="Ej. Bogotá, Chapinero"
          maxlength="160"
        />
        <span v-if="errors.location" class="form__error">{{ errors.location }}</span>
      </label>

      <p v-if="errors._form" class="form__error" role="alert">{{ errors._form }}</p>
      <p v-if="notice" class="form__info" role="status">{{ notice }}</p>

      <div class="onboarding__actions">
        <Button type="button" variant="secondary" :disabled="auth.loading" @click="onSaveDraft">
          Guardar borrador
        </Button>
        <Button type="submit" variant="primary" :disabled="auth.loading">
          {{ auth.loading ? 'Guardando…' : 'Terminar y entrar a mi panel' }}
        </Button>
      </div>
    </form>

    <p v-if="publicLink" class="onboarding__public">
      Tu enlace público:
      <a :href="publicLink" target="_blank" rel="noopener">{{ publicLink }}</a>
    </p>
  </div>
</template>

<style scoped>
.onboarding {
  text-align: left;
}

.onboarding__step {
  font-size: var(--font-size-xs);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-primary-soft);
  margin-bottom: var(--space-2);
  text-align: center;
}

.onboarding__title {
  font-size: var(--font-size-lg);
  text-align: center;
  margin-bottom: var(--space-2);
}

.onboarding__lead {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  text-align: center;
  margin-bottom: var(--space-5);
}

.onboarding__loading {
  text-align: center;
  color: var(--color-text-muted);
  padding: var(--space-6) 0;
}

.onboarding__actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.onboarding__actions .btn {
  flex: 1;
  min-width: 160px;
}

.onboarding__public {
  margin-top: var(--space-5);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  word-break: break-all;
  text-align: center;
}

.onboarding__public a {
  color: var(--color-primary-soft);
}

.form__hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-align: right;
}

.form__textarea {
  resize: vertical;
  min-height: 90px;
}
</style>
