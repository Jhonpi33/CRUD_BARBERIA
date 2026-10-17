<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import Button from '../components/Button.vue'

const route = useRoute()
const router = useRouter()

const slug = computed(() => String(route.params.slug || ''))

const loading = ref(true)
const booking = ref(false)
const error = ref('')
const profile = ref(null)
const services = ref([])

// Selección
const serviceId = ref('')
const date = ref('')
const start = ref('')
const slots = ref([])
const slotsLoading = ref(false)
const slotsError = ref('')

// Formulario del cliente
const form = ref({ name: '', phone: '' })
const formErrors = ref({})
const done = ref(null) // cita confirmada (pantalla de éxito)

const selectedService = computed(() =>
  services.value.find((s) => s._id === serviceId.value)
)

/** Próximos 14 días (hoy incluido) como 'YYYY-MM-DD'. */
const dateOptions = computed(() => {
  const out = []
  const now = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    out.push({
      value: `${y}-${m}-${day}`,
      label: `${d.getDate()} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()]}`,
      isToday: i === 0,
    })
  }
  return out
})

onMounted(async () => {
  try {
    const { data } = await api.get(
      `/public/booking/${encodeURIComponent(slug.value)}`
    )
    profile.value = data.profile
    services.value = data.services
  } catch (err) {
    error.value =
      err?.response?.data?.message || 'Este perfil no acepta reservas en línea.'
  } finally {
    loading.value = false
  }
})

/** Cambiar de servicio o fecha recarga los huecos reales del servidor. */
watch([serviceId, date], async ([svc, d]) => {
  slots.value = []
  start.value = ''
  if (!svc || !d) return
  await reloadSlots()
})

function pickSlot(value) {
  start.value = value
}

function validate() {
  const e = {}
  const name = form.value.name.trim()
  if (name.length < 2 || name.length > 120)
    e.name = 'Escribe tu nombre (entre 2 y 120 caracteres).'
  const digits = form.value.phone.replace(/\D+/g, '')
  if (digits.length < 7 || digits.length > 15)
    e.phone = 'Escribe un teléfono válido (7 a 15 dígitos).'
  formErrors.value = e
  return Object.keys(e).length === 0
}

async function confirm() {
  error.value = ''
  if (!serviceId.value || !date.value || !start.value) {
    error.value = 'Elige un servicio, una fecha y una hora.'
    return
  }
  if (!validate()) return

  booking.value = true
  try {
    const { data } = await api.post(
      `/public/booking/${encodeURIComponent(slug.value)}`,
      {
        serviceId: serviceId.value,
        date: date.value,
        start: start.value,
        name: form.value.name.trim(),
        phone: form.value.phone.trim(),
      }
    )
    done.value = data.appointment
  } catch (err) {
    const body = err?.response?.data
    if (body?.code === 'SLOT_UNAVAILABLE' || body?.code === 'SLOT_TAKEN') {
      // Otro cliente se lo ganó mientras tanto: muestra el motivo y refresca
      // los huecos reales que devuelve el servidor ahora mismo.
      error.value = body.message
      start.value = ''
      await reloadSlots()
    } else {
      error.value = body?.message || 'No se pudo completar la reserva.'
    }
  } finally {
    booking.value = false
  }
}

/** Recarga de la disponibilidad (la pinta el servidor con las citas reales). */
async function reloadSlots() {
  slotsLoading.value = true
  slotsError.value = ''
  try {
    const { data } = await api.get(
      `/public/booking/${encodeURIComponent(slug.value)}/availability`,
      { params: { serviceId: serviceId.value, date: date.value } }
    )
    slots.value = data.slots
    if (data.slots.length === 0) {
      slotsError.value = 'No hay huecos libres ese día. Prueba con otra fecha.'
    }
  } catch (err) {
    slotsError.value =
      err?.response?.data?.message || 'No se pudo cargar la disponibilidad.'
  } finally {
    slotsLoading.value = false
  }
}

function goToProfile() {
  router.push({ name: 'public-profile', params: { slug: slug.value } })
}

function priceLabel(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value))
}
</script>

<template>
  <div class="book">
    <!-- Cargando -->
    <p v-if="loading" class="book__state">Cargando…</p>

    <!-- Perfil no disponible -->
    <div v-else-if="error && !profile && !done" class="book__state book__state--error">
      <h1 class="book__title">Reservas no disponibles</h1>
      <p>{{ error }}</p>
      <Button variant="secondary" @click="goToProfile">Ver perfil</Button>
    </div>

    <!-- Reserva exitosa -->
    <article v-else-if="done" class="book__card book__card--ok">
      <div class="book__ok-icon" aria-hidden="true">✓</div>
      <h1 class="book__title">¡Reserva recibida!</h1>
      <p class="book__lead">
        Tu cita queda <strong>pendiente de confirmación</strong>. {{ profile?.name }} te
        confirmará pronto.
      </p>
      <ul class="book__summary">
        <li><span>Servicio</span><strong>{{ done.service.name }}</strong></li>
        <li><span>Fecha</span><strong>{{ done.date }}</strong></li>
        <li><span>Hora</span><strong>{{ done.start }} – {{ done.end }}</strong></li>
        <li><span>Duración</span><strong>{{ done.service.durationMinutes }} min</strong></li>
        <li><span>Precio</span><strong>{{ priceLabel(done.service.price) }}</strong></li>
        <li><span>Nombre</span><strong>{{ done.clientName }}</strong></li>
      </ul>
      <Button variant="secondary" @click="goToProfile">Volver al perfil</Button>
    </article>

    <!-- Flujo de reserva -->
    <template v-else>
      <header class="book__header">
        <button class="book__back" type="button" @click="goToProfile">‹ Volver al perfil</button>
        <p class="book__type">{{ profile?.type === 'barber' ? 'Barbero' : 'Barbería' }}</p>
        <h1 class="book__title">Reserva con {{ profile?.name }}</h1>
        <p class="book__lead">Elige servicio, fecha y hora. No necesitas crear una cuenta.</p>
      </header>

      <p v-if="error" class="form__error" role="alert">{{ error }}</p>

      <!-- Paso 1: servicio -->
      <section class="book__card">
        <h2 class="book__step">1 · Servicio</h2>
        <p v-if="services.length === 0" class="book__state">
          Este perfil aún no tiene servicios activos para reservar.
        </p>
        <ul v-else class="book__services">
          <li v-for="s in services" :key="s._id">
            <button
              class="service-pick"
              :class="{ 'service-pick--on': serviceId === s._id }"
              type="button"
              :aria-pressed="serviceId === s._id"
              @click="serviceId = s._id"
            >
              <span class="service-pick__name">{{ s.name }}</span>
              <span class="service-pick__meta">
                {{ s.durationMinutes }} min · {{ priceLabel(s.price) }}
              </span>
            </button>
          </li>
        </ul>
      </section>

      <!-- Paso 2: fecha y hora -->
      <section v-if="serviceId" class="book__card">
        <h2 class="book__step">2 · Fecha y hora</h2>

        <div class="book__dates">
          <button
            v-for="d in dateOptions"
            :key="d.value"
            class="date-chip"
            :class="{ 'date-chip--on': date === d.value }"
            type="button"
            :aria-pressed="date === d.value"
            @click="date = d.value"
          >
            {{ d.label }}
            <span v-if="d.isToday" class="date-chip__today">hoy</span>
          </button>
        </div>

        <p v-if="slotsLoading" class="book__state book__state--inline">Buscando huecos libres…</p>
        <p v-else-if="date && slotsError" class="form__error" role="status">{{ slotsError }}</p>

        <div v-if="slots.length" class="book__slots" role="group" aria-label="Horas disponibles">
          <button
            v-for="slot in slots"
            :key="slot.start"
            class="slot"
            :class="{ 'slot--on': start === slot.start }"
            type="button"
            :aria-pressed="start === slot.start"
            @click="pickSlot(slot.start)"
          >
            {{ slot.start }}
          </button>
        </div>
      </section>

      <!-- Paso 3: tus datos -->
      <section v-if="serviceId && date && start" class="book__card">
        <h2 class="book__step">3 · Tus datos</h2>
        <form class="book__form" novalidate @submit.prevent="confirm">
          <label class="form__field">
            <span class="form__label">Nombre *</span>
            <input
              v-model="form.name"
              class="form__input"
              type="text"
              maxlength="120"
              autocomplete="name"
              placeholder="Tu nombre"
            />
            <span v-if="formErrors.name" class="form__error">{{ formErrors.name }}</span>
          </label>

          <label class="form__field">
            <span class="form__label">Teléfono *</span>
            <input
              v-model="form.phone"
              class="form__input"
              type="tel"
              maxlength="40"
              autocomplete="tel"
              placeholder="Ej. 300 123 4567"
            />
            <span v-if="formErrors.phone" class="form__error">{{ formErrors.phone }}</span>
          </label>

          <p class="book__recap">
            <strong>{{ selectedService?.name }}</strong> · {{ date }} · {{ start }} –
            {{ slots.find((s) => s.start === start)?.end }}
            · {{ priceLabel(selectedService?.price) }}
          </p>

          <Button type="submit" variant="primary" :disabled="booking">
            {{ booking ? 'Confirmando…' : 'Confirmar reserva' }}
          </Button>
        </form>
      </section>
    </template>
  </div>
</template>

<style scoped>
.book {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-7) var(--space-4);
}

.book__state {
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--space-6) 0;
}

.book__state--inline {
  padding: var(--space-4) 0;
}

.book__state--error .btn {
  margin-top: var(--space-4);
}

.book__header {
  text-align: center;
  margin-bottom: var(--space-5);
}

.book__back {
  font: inherit;
  font-size: var(--font-size-sm);
  background: none;
  border: none;
  color: var(--color-primary-soft);
  cursor: pointer;
  padding: 0;
  margin-bottom: var(--space-3);
}

.book__type {
  font-size: var(--font-size-xs);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-primary-soft);
  margin-bottom: var(--space-2);
}

.book__title {
  font-size: clamp(1.3rem, 4vw, 1.8rem);
  margin-bottom: var(--space-2);
}

.book__lead {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.book__card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  margin-bottom: var(--space-4);
}

.book__card--ok {
  text-align: center;
}

.book__ok-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto var(--space-4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  color: var(--color-accent);
  background: var(--success-soft);
  border: 1px solid var(--success-border);
}

.book__step {
  font-size: var(--font-size-md);
  margin-bottom: var(--space-4);
}

.book__summary {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: var(--space-5) 0;
  font-size: var(--font-size-sm);
}

.book__summary li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  border-bottom: 1px dashed var(--color-border-soft);
  padding-bottom: var(--space-2);
}

.book__summary span {
  color: var(--color-text-muted);
}

.book__services {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.service-pick {
  font: inherit;
  width: 100%;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
}

.service-pick--on {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.service-pick__name {
  font-weight: 600;
}

.service-pick__meta {
  font-size: var(--font-size-sm);
  color: var(--color-primary-soft);
}

.book__dates {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}

.date-chip {
  font: inherit;
  font-size: var(--font-size-sm);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 6px 12px;
  cursor: pointer;
  color: var(--color-text-muted);
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.date-chip--on {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.date-chip__today {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.book__slots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: var(--space-2);
}

.slot {
  font: inherit;
  font-variant-numeric: tabular-nums;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 8px 6px;
  cursor: pointer;
}

.slot--on {
  color: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.book__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.book__recap {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.book__recap strong {
  color: var(--color-text);
}
</style>
