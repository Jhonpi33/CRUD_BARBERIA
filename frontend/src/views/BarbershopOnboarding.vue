<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, friendlyAuthError } from '../stores/auth'
import Button from '../components/Button.vue'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({
  businessName: '',
  logoUrl: '',
  phone: '',
  location: '',
  currency: 'COP',
  openingTime: '09:00',
  closingTime: '20:00',
  appointmentDuration: 30,
})

const errors = ref({})
const notice = ref('')
const loading = ref(true)

/** Carga el perfil existente desde MongoDB para retomar el onboarding. */
onMounted(async () => {
  if (!auth.profile) await auth.fetchProfile()
  const p = auth.profile
  if (p) {
    form.businessName = p.businessName || ''
    form.logoUrl = p.logoUrl || ''
    form.phone = p.phone || ''
    form.location = p.location || ''
    if (p.settings) {
      form.currency = p.settings.currency || 'COP'
      form.openingTime = p.settings.openingTime || '09:00'
      form.closingTime = p.settings.closingTime || '20:00'
      form.appointmentDuration = p.settings.appointmentDuration || 30
    }
  }
  loading.value = false
})

/** Validación en frontend (el backend también valida). */
function validate() {
  const e = {}
  const name = form.businessName.trim()
  if (name.length < 2 || name.length > 80) e.businessName = 'El nombre comercial debe tener entre 2 y 80 caracteres.'
  const phone = form.phone.trim()
  if (phone.length < 7 || phone.length > 30) e.phone = 'El teléfono debe tener entre 7 y 30 caracteres.'
  const location = form.location.trim()
  if (location.length < 3 || location.length > 160) e.location = 'Indica la ubicación del local.'
  if (form.logoUrl.trim() && !/^https?:\/\/\S+$/i.test(form.logoUrl.trim())) e.logoUrl = 'El logo debe ser un enlace http/https válido.'
  if (form.closingTime <= form.openingTime) e.hours = 'La hora de cierre debe ser posterior a la de apertura.'
  const dur = Number(form.appointmentDuration)
  if (!Number.isInteger(dur) || dur < 10 || dur > 240) e.appointmentDuration = 'La duración debe estar entre 10 y 240 minutos.'
  errors.value = e
  return Object.keys(e).length === 0
}

function payload() {
  return {
    businessName: form.businessName.trim(),
    logoUrl: form.logoUrl.trim(),
    phone: form.phone.trim(),
    location: form.location.trim(),
    settings: {
      currency: form.currency.trim() || 'COP',
      openingTime: form.openingTime,
      closingTime: form.closingTime,
      appointmentDuration: Number(form.appointmentDuration),
    },
  }
}

async function onSaveDraft() {
  notice.value = ''
  errors.value = {}
  try {
    await auth.saveProfile(payload())
    notice.value = 'Borrador guardado. Puedes cerrar sesión y continuar después.'
  } catch (err) {
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
</script>

<template>
  <div class="onboarding">
    <p class="onboarding__step">Paso 1 de 1 · Perfil de barbería</p>
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
    <h1 class="onboarding__title">Configura tu barbería</h1>
    <p class="onboarding__lead">
      Estos datos identifican tu negocio y definen cómo agenda. Puedes guardarlo a medias y
      volver cuando quieras.
    </p>

    <div v-if="loading" class="onboarding__loading">Cargando tu perfil…</div>

    <form v-else class="form onboarding__form" novalidate @submit.prevent="onFinish">
      <label class="form__field">
        <span class="form__label">Nombre comercial *</span>
        <input
          v-model="form.businessName"
          class="form__input"
          type="text"
          placeholder="Ej. Barbería Los Hermanos"
          maxlength="80"
        />
        <span v-if="errors.businessName" class="form__error">{{ errors.businessName }}</span>
      </label>

      <label class="form__field">
        <span class="form__label">Logo (enlace) </span>
        <input
          v-model="form.logoUrl"
          class="form__input"
          type="url"
          placeholder="https://…"
          maxlength="300"
        />
        <span v-if="errors.logoUrl" class="form__error">{{ errors.logoUrl }}</span>
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
        <span class="form__label">Ubicación del local *</span>
        <input
          v-model="form.location"
          class="form__input"
          type="text"
          placeholder="Ej. Bogotá, Calle 100 #15-20"
          maxlength="160"
        />
        <span v-if="errors.location" class="form__error">{{ errors.location }}</span>
      </label>

      <fieldset class="onboarding__fieldset">
        <legend class="onboarding__legend">Configuración inicial del negocio</legend>

        <div class="onboarding__grid">
          <label class="form__field">
            <span class="form__label">Moneda</span>
            <select v-model="form.currency" class="form__input">
              <option value="COP">COP (Peso colombiano)</option>
              <option value="MXN">MXN (Peso mexicano)</option>
              <option value="USD">USD (Dólar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="ARS">ARS (Peso argentino)</option>
              <option value="CLP">CLP (Peso chileno)</option>
            </select>
          </label>

          <label class="form__field">
            <span class="form__label">Duración estándar (min) *</span>
            <input
              v-model.number="form.appointmentDuration"
              class="form__input"
              type="number"
              min="10"
              max="240"
              step="5"
            />
            <span v-if="errors.appointmentDuration" class="form__error">
              {{ errors.appointmentDuration }}
            </span>
          </label>

          <label class="form__field">
            <span class="form__label">Abre</span>
            <input v-model="form.openingTime" class="form__input" type="time" />
          </label>

          <label class="form__field">
            <span class="form__label">Cierra</span>
            <input v-model="form.closingTime" class="form__input" type="time" />
          </label>
        </div>
        <span v-if="errors.hours" class="form__error">{{ errors.hours }}</span>
      </fieldset>

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

.onboarding__fieldset {
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.onboarding__legend {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--accent);
  padding: 0 var(--space-2);
}

.onboarding__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
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

@media (max-width: 480px) {
  .onboarding__grid {
    grid-template-columns: 1fr;
  }

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
