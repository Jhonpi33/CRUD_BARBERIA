<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, friendlyAuthError } from '../stores/auth'
import { useToastsStore } from '../stores/toasts'
import Button from '../components/Button.vue'
import Icon from '../components/Icon.vue'
import api from '../services/api'

const router = useRouter()
const auth = useAuthStore()
const toast = useToastsStore()

const form = reactive({
  professionalName: '',
  photoUrl: '',
  description: '',
  phone: '',
  location: '',
  whatsappNotificationsEnabled: false,
})

const errors = ref({})
const notice = ref('')
const loading = ref(true)
const whatsappChannels = ref({ configured: false, barberAlerts: false })

const publicLink = computed(() => {
  const slug = auth.profile?.slug
  return slug ? `${window.location.origin}/u/${slug}` : null
})

const isEditing = computed(() => Boolean(auth.profile?.completedAt))

/** Carga el perfil existente desde MongoDB para retomar el onboarding. */
onMounted(async () => {
  if (!auth.profile) await auth.fetchProfile()
  try {
    const { data } = await api.get('/whatsapp/status')
    whatsappChannels.value = data.channels
  } catch {
    // El perfil sigue disponible aunque no se pueda consultar el canal.
  }
  const p = auth.profile
  if (p) {
    form.professionalName = p.professionalName || ''
    form.photoUrl = p.photoUrl || ''
    form.description = p.description || ''
    form.phone = p.phone || ''
    form.location = p.location || ''
    form.whatsappNotificationsEnabled = p.whatsappNotificationsEnabled === true
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
    toast.success(
      isEditing.value ? 'Perfil actualizado' : 'Perfil activado',
      'Tus cambios ya se reflejan en tu perfil público.'
    )
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
    whatsappNotificationsEnabled: form.whatsappNotificationsEnabled,
  }
}
</script>

<template>
  <div class="onboarding">
    <!-- Siempre hay salida: al panel si ya existe el perfil, al inicio si lo está creando -->
    <div class="onboarding__nav-top">
      <RouterLink
        class="btn btn--secondary btn--sm"
        :to="isEditing ? '/panel/barbero' : '/'"
      >
        <Icon name="arrow-left" :size="16" />
        {{ isEditing ? 'Volver al panel' : 'Volver al inicio' }}
      </RouterLink>
    </div>

    <template v-if="!isEditing">
      <p class="onboarding__step">Paso 1 de 1 · Perfil de barbero</p>
      <div
        class="onboarding__progress"
        role="progressbar"
        aria-valuenow="1"
        aria-valuemin="1"
        aria-valuemax="1"
        aria-label="Progreso del formulario"
      >
        <span class="onboarding__progress-bar" style="width: 100%"></span>
      </div>
    </template>

    <h1 class="onboarding__title">
      {{ isEditing ? 'Editar mi perfil profesional' : 'Crea tu perfil profesional' }}
    </h1>
    <p class="onboarding__lead">
      {{
        isEditing
          ? 'Actualiza los datos que verán tus clientes en tu perfil público.'
          : 'Esto es lo que verán tus clientes en tu perfil público. Puedes guardarlo a medias y volver cuando quieras.'
      }}
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
        <span class="form__label">Teléfono / WhatsApp *</span>
        <input
          v-model="form.phone"
          class="form__input"
          type="tel"
          placeholder="Ej. 300 123 4567"
          maxlength="30"
        />
        <span class="form__hint">Escribe tu número con indicativo de país si no es colombiano.</span>
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

      <label class="onboarding__whatsapp">
        <input v-model="form.whatsappNotificationsEnabled" type="checkbox" />
        <span>
          <strong>Recibir avisos de reservas por WhatsApp</strong>
          <small v-if="whatsappChannels.barberAlerts">Usaremos el teléfono de WhatsApp de tu perfil para avisarte cuando llegue una reserva.</small>
          <small v-else>La conexión automática de WhatsApp aún no está lista. Puedes dejar activada esta preferencia para cuando se configure.</small>
        </span>
      </label>

      <p v-if="errors._form" class="form__error" role="alert">{{ errors._form }}</p>
      <p v-if="notice" class="form__info" role="status">{{ notice }}</p>

      <div class="onboarding__actions">
        <Button
          v-if="!isEditing"
          type="button"
          variant="secondary"
          :disabled="auth.loading"
          @click="onSaveDraft"
        >
          Guardar borrador
        </Button>
        <Button type="submit" variant="primary" :disabled="auth.loading">
          {{ auth.loading ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Terminar y entrar a mi panel' }}
        </Button>
      </div>
    </form>

    <p v-if="publicLink" class="onboarding__public">
      Tu perfil público:
      <a :href="publicLink" target="_blank" rel="noopener">{{ publicLink }}</a>
    </p>
  </div>
</template>

<style scoped>
.onboarding {
  text-align: left;
}

.onboarding__nav-top {
  margin-bottom: var(--space-4);
}

.onboarding__step {
  font-size: var(--font-size-xs);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 600;
  margin-bottom: var(--space-2);
  text-align: center;
}

.onboarding__progress {
  width: 100%;
  height: 6px;
  background: var(--surface-2);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--space-4);
}

.onboarding__progress-bar {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: var(--radius-full);
  transition: width var(--motion) ease;
}

.onboarding__title {
  font-size: var(--font-size-lg);
  text-align: center;
  margin-bottom: var(--space-2);
}

.onboarding__lead {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  text-align: center;
  margin-bottom: var(--space-5);
}

.onboarding__loading {
  text-align: center;
  color: var(--text-muted);
  padding: var(--space-6) 0;
}

.onboarding__whatsapp {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  background: var(--surface-2);
  cursor: pointer;
}
.onboarding__whatsapp input { width: 18px; height: 18px; margin-top: 2px; accent-color: var(--accent); }
.onboarding__whatsapp span { display: grid; gap: 4px; }
.onboarding__whatsapp strong { font-size: var(--font-size-sm); }
.onboarding__whatsapp small { color: var(--text-muted); font-size: var(--font-size-xs); }

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
  color: var(--text-muted);
  word-break: break-all;
  text-align: center;
}

.onboarding__public a {
  color: var(--accent);
}

.form__hint {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-align: right;
}

.form__textarea {
  resize: vertical;
  min-height: 90px;
}

/* Fijar Atrás/Continuar abajo en móvil */
@media (max-width: 560px) {
  .onboarding__actions {
    position: sticky;
    bottom: 0;
    background: var(--surface);
    padding: var(--space-3) 0;
    margin-top: var(--space-4);
    border-top: 1px solid var(--border-soft);
  }
}
</style>
