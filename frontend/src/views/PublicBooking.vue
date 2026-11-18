<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { getBookingData, isConnectionError } from '../services/bookingConnection'
import Button from '../components/Button.vue'
import Icon from '../components/Icon.vue'
import Modal from '../components/Modal.vue'
import { waMessageLink } from '../utils/whatsapp'
import { mapsLink } from '../utils/maps'

const route = useRoute()
const router = useRouter()

const slug = computed(() => String(route.params.slug || ''))

const loading = ref(true)
const booking = ref(false)
const error = ref('')
const profile = ref(null)
const services = ref([])
const connectionWaiting = ref(false)
const slotsWaiting = ref(false)
const profileRetryable = ref(false)
const slotsRetryable = ref(false)
const bookingUncertain = ref(false)
let profileController
let slotsController
let profileVersion = 0

// Selección
const serviceId = ref(String(route.query.serviceId || ''))
const date = ref(String(route.query.date || ''))
const start = ref('')
const slots = ref([])
const slotsLoading = ref(false)
const slotsError = ref('')
const bufferMinutes = ref(0) // margen de cambio que aplica el servidor al hueco elegido

// Formulario del cliente
const form = ref({ name: '', phone: '', whatsappOptIn: false })
const touched = ref({ name: false, phone: false })
const confirmOpen = ref(false) // modal centrado de confirmación (el cliente "acepta")
const confirmError = ref('') // error del servidor dentro del modal
const done = ref(null) // cita confirmada (pantalla de éxito)

/** Errores del formulario en vivo (se muestran al tocar el campo o al enviar). */
const formErrors = computed(() => {
  const e = {}
  const name = form.value.name.trim()
  if (name.length < 2 || name.length > 120)
    e.name = 'Escribe tu nombre (entre 2 y 120 caracteres).'
  const digits = form.value.phone.replace(/\D+/g, '')
  if (digits.length < 7 || digits.length > 15)
    e.phone = 'Escribe un teléfono válido (7 a 15 dígitos).'
  return e
})

const formValid = computed(() => Object.keys(formErrors.value).length === 0)

/** ¿Mostrar el error de un campo? Solo si ya se tocó (o tras enviar). */
function showError(field) {
  return Boolean(touched.value[field] && formErrors.value[field])
}

const selectedService = computed(() =>
  services.value.find((s) => s._id === serviceId.value)
)

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** 'YYYY-MM-DD' -> '27 de octubre de 2026' (para mostrarle al cliente). */
function longDate(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number)
  if (!y || !m || !d) return iso || ''
  return `${d} de ${MONTHS[m - 1]} de ${y}`
}

/** Enlace de mapa con la dirección del local (null si no hay dirección). */
const mapUrl = computed(() => mapsLink(profile.value?.location))
const bookingCheckLink = computed(() => waMessageLink(
  profile.value?.phone,
  `Hola, soy ${form.value.name.trim()}. Intenté reservar ${selectedService.value?.name || 'un servicio'} el ${longDate(date.value)} a las ${start.value}. ¿Puedes comprobar si recibiste mi reserva?`
))

/**
 * Mensaje con todos los datos de la cita (fecha, hora y ubicación en formato
 * enlace de mapa) listo para enviar por WhatsApp desde la pantalla de éxito.
 */
const waDetailsLink = computed(() => {
  if (!done.value) return null
  const loc = profile.value?.location?.trim() || ''
  let msg = `¡Hola! Tu cita está agendada: ${done.value.service.name} el ${longDate(done.value.date)} de ${done.value.start} a ${done.value.end}.`
  if (loc) msg += `\n\n📍 Ubicación: ${loc}${mapUrl.value ? `\n${mapUrl.value}` : ''}`
  return waMessageLink(form.value.phone, msg)
})

/** Próximos 14 días (hoy incluido) como 'YYYY-MM-DD'. */
const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MONTHS_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

const dateOptions = computed(() => {
  const out = []
  const now = new Date()
  let lastMonth = -1
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    out.push({
      value: `${y}-${m}-${day}`,
      weekday: WEEKDAYS_SHORT[d.getDay()],
      day: d.getDate(),
      monthShort: MONTHS_SHORT[d.getMonth()],
      monthLabel: `${MONTHS[d.getMonth()]} de ${y}`,
      // El nombre del mes solo aparece cuando cambia, para no repetirlo en cada chip.
      showMonth: d.getMonth() !== lastMonth,
      isToday: i === 0,
    })
    lastMonth = d.getMonth()
  }
  return out
})

/** Mes que se muestra sobre la tira de fechas. */
const monthLabel = computed(() => {
  const chosen = dateOptions.value.find((d) => d.value === date.value)
  return (chosen || dateOptions.value[0])?.monthLabel || ''
})

/** Huecos agrupados en Mañana (antes del mediodía) y Tarde. */
const slotGroups = computed(() => {
  const morning = []
  const afternoon = []
  for (const s of slots.value) {
    const hour = Number(String(s.start).split(':')[0])
    ;(hour < 12 ? morning : afternoon).push(s)
  }
  const groups = []
  if (morning.length) groups.push({ key: 'am', label: 'Mañana', slots: morning })
  if (afternoon.length) groups.push({ key: 'pm', label: 'Tarde', slots: afternoon })
  return groups
})

/** Hueco elegido (para saber su hora de fin y pintar el resumen). */
const selectedSlot = computed(
  () => slots.value.find((s) => s.start === start.value) || null
)

async function loadProfile() {
  const version = ++profileVersion
  profileController?.abort()
  slotsController?.abort()
  const controller = new AbortController()
  profileController = controller
  loading.value = true
  profile.value = null
  services.value = []
  done.value = null
  slots.value = []
  start.value = ''
  confirmOpen.value = false
  bookingUncertain.value = false
  error.value = ''
  connectionWaiting.value = false
  profileRetryable.value = false
  try {
    const { data } = await getBookingData(
      `/public/booking/${encodeURIComponent(slug.value)}`,
      { signal: controller.signal, onWaiting: () => { connectionWaiting.value = true } }
    )
    if (version !== profileVersion || controller.signal.aborted) return
    profile.value = data.profile
    services.value = data.services
    if (serviceId.value && !services.value.some(service => service._id === serviceId.value)) {
      serviceId.value = ''
    }
    await reloadSlots()
  } catch (err) {
    if (version !== profileVersion || controller.signal.aborted) return
    profileRetryable.value = isConnectionError(err)
    error.value =
      profileRetryable.value ? 'La agenda está tardando en responder. Intenta conectarte de nuevo.' :
        err?.response?.data?.message || 'Este perfil no acepta reservas en línea.'
  } finally {
    if (version === profileVersion && !controller.signal.aborted) loading.value = false
  }
}

watch(slug, loadProfile, { immediate: true })
onBeforeUnmount(() => {
  profileController?.abort()
  slotsController?.abort()
})

/** Cambiar de servicio o fecha recarga los huecos reales del servidor. */
watch([serviceId, date], async () => {
  slots.value = []
  start.value = ''
  await reloadSlots()
})

function pickSlot(value) {
  start.value = value
}

/** Pasos del flujo: qué tan lejos llegó el cliente. */
const stepDone = computed(() => [
  Boolean(serviceId.value),
  Boolean(date.value && start.value),
  formValid.value,
])

/** Paso en el que va el cliente ahora mismo (0, 1 o 2). */
const currentStep = computed(() => {
  if (!serviceId.value) return 0
  if (!date.value || !start.value) return 1
  return 2
})

/** Volver a un paso ya completado desde el indicador de progreso. */
function goToStep(index) {
  if (index > currentStep.value) return
  document.getElementById(`paso-${index + 1}`)?.scrollIntoView({ block: 'start' })
}

/**
 * Enviar el formulario: revisa los campos y, si todo está bien, abre el modal
 * centrado con el resumen de la cita. La reserva solo se envía cuando el
 * cliente acepta en ese modal.
 */
function submitForm() {
  if (booking.value || bookingUncertain.value || done.value) return
  touched.value = { name: true, phone: true }
  error.value = ''
  confirmError.value = ''
  if (!serviceId.value || !date.value || !start.value) {
    error.value = 'Elige un servicio, una fecha y una hora.'
    return
  }
  if (!formValid.value) return
  confirmOpen.value = true
}

/** Crea la cita en el servidor (se llama desde el modal de confirmación). */
async function confirmBooking() {
  if (booking.value || bookingUncertain.value || done.value) return
  confirmError.value = ''
  error.value = ''
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
        whatsappOptIn: form.value.whatsappOptIn,
      },
      { timeout: 90000 }
    )
    confirmOpen.value = false
    done.value = data.appointment
  } catch (err) {
    const body = err?.response?.data
    if (body?.code === 'SLOT_UNAVAILABLE' || body?.code === 'SLOT_TAKEN') {
      // Otro cliente se lo ganó mientras tanto: cierra el modal, avisa arriba
      // y refresca los huecos reales que devuelve el servidor ahora mismo.
      confirmOpen.value = false
      error.value = body.message
      start.value = ''
      await reloadSlots()
    } else {
      bookingUncertain.value = isConnectionError(err) || !err?.response || err.response.status >= 500
      confirmError.value = bookingUncertain.value
        ? 'Se perdió la conexión y no pudimos comprobar si tu reserva quedó guardada. Consulta con el barbero antes de volver a reservar.'
        : body?.message || 'No se pudo completar la reserva.'
    }
  } finally {
    booking.value = false
  }
}

/** Recarga de la disponibilidad (la pinta el servidor con las citas reales). */
async function reloadSlots() {
  slotsController?.abort()
  const controller = new AbortController()
  slotsController = controller
  slots.value = []
  start.value = ''
  slotsWaiting.value = false
  slotsRetryable.value = false
  slotsError.value = ''
  if (!serviceId.value || !date.value || !profile.value) {
    slotsLoading.value = false
    return
  }
  slotsLoading.value = true
  try {
    const { data } = await getBookingData(
      `/public/booking/${encodeURIComponent(slug.value)}/availability`,
      {
        signal: controller.signal,
        params: { serviceId: serviceId.value, date: date.value },
        onWaiting: () => { slotsWaiting.value = true },
      }
    )
    if (controller.signal.aborted) return
    slots.value = data.slots
    bufferMinutes.value = Number(data.bufferMinutes) || 0
    if (data.slots.length === 0) {
      slotsError.value = 'No hay huecos libres ese día. Prueba con otra fecha.'
    }
  } catch (err) {
    if (controller.signal.aborted) return
    slotsRetryable.value = isConnectionError(err)
    slotsError.value =
      err?.response?.data?.message || 'No se pudo cargar la disponibilidad.'
  } finally {
    if (!controller.signal.aborted) slotsLoading.value = false
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
    <!-- Barra mínima de la reserva: solo la marca y volver al perfil.
         Sin menú de marketing (esa es la página del cliente, no del negocio). -->
    <div class="book__bar">
      <span class="book__brand">Elysia</span>
      <button class="book__back" type="button" @click="goToProfile">
        <Icon name="arrow-left" :size="15" />
        Volver al perfil
      </button>
    </div>

    <!-- Cargando -->
    <p v-if="loading" class="book__state" role="status" aria-live="polite">
      {{ connectionWaiting ? 'Estamos conectando con la agenda, espera un momento…' : 'Conectando con la agenda…' }}
    </p>

    <!-- Perfil no disponible -->
    <div v-else-if="error && !profile && !done" class="book__state book__state--error">
      <h1 class="book__title">Reservas no disponibles</h1>
      <p>{{ error }}</p>
      <Button v-if="profileRetryable" variant="primary" @click="loadProfile">Volver a conectar</Button>
      <Button variant="secondary" @click="goToProfile">Ver perfil</Button>
    </div>

    <!-- Reserva exitosa -->
    <article v-else-if="done" class="book__card book__card--ok">
      <div class="book__ok-icon" aria-hidden="true"><Icon name="check" :size="30" /></div>
      <h1 class="book__title">¡Reserva recibida!</h1>
      <p class="book__lead">
        Tu cita queda <strong>pendiente de confirmación</strong>. {{ profile?.name }} te
        confirmará pronto.
      </p>
      <ul class="book__summary">
        <li><span>Servicio</span><strong>{{ done.service.name }}</strong></li>
        <li><span>Fecha</span><strong>{{ longDate(done.date) }}</strong></li>
        <li><span>Hora</span><strong>{{ done.start }} – {{ done.end }}</strong></li>
        <li><span>Duración</span><strong>{{ done.service.durationMinutes }} min</strong></li>
        <li><span>Precio</span><strong>{{ priceLabel(done.service.price) }}</strong></li>
        <li><span>Nombre</span><strong>{{ done.clientName }}</strong></li>
        <li v-if="profile?.location">
          <span>Dirección</span>
          <strong>
            <a v-if="mapUrl" :href="mapUrl" target="_blank" rel="noopener">{{ profile.location }}</a>
            <template v-else>{{ profile.location }}</template>
          </strong>
        </li>
      </ul>
      <div class="book__ok-actions">
        <a
          v-if="waDetailsLink"
          class="btn btn--primary"
          :href="waDetailsLink"
          target="_blank"
          rel="noopener"
        >
          <Icon name="message" :size="16" /> Enviar detalles por WhatsApp
        </a>
        <Button variant="secondary" @click="goToProfile">Volver al perfil</Button>
      </div>
    </article>

    <!-- Flujo de reserva -->
    <template v-else>
      <header class="book__header">
        <p class="book__type">{{ profile?.type === 'barber' ? 'Barbero' : 'Barbería' }}</p>
        <h1 class="book__title">Reserva con {{ profile?.name }}</h1>
        <p class="book__lead">Elige servicio, fecha y hora. No necesitas crear una cuenta.</p>

        <!-- Indicador de progreso: marca dónde vas y deja volver a lo ya elegido -->
        <ol class="book__stepper" aria-label="Pasos de la reserva">
          <li
            v-for="(label, i) in ['Servicio', 'Fecha y hora', 'Tus datos']"
            :key="label"
            :class="{
              'is-done': stepDone[i],
              'is-current': currentStep === i,
              'is-future': i > currentStep,
            }"
          >
            <button
              class="book__stepper-btn"
              type="button"
              :disabled="i > currentStep || booking || bookingUncertain"
              :aria-current="currentStep === i ? 'step' : null"
              @click="goToStep(i)"
            >
              <span class="book__stepper-dot">
                <Icon v-if="stepDone[i] && i !== currentStep" name="check" :size="13" :strokeWidth="2.6" />
                <template v-else>{{ i + 1 }}</template>
              </span>
              <span class="book__stepper-label">{{ label }}</span>
            </button>
          </li>
        </ol>
      </header>

      <p v-if="error" class="form__error" role="alert">{{ error }}</p>

      <!-- Paso 1: servicio -->
      <section id="paso-1" class="book__card">
        <div class="book__card-head">
          <h2 class="book__step">1 · Servicio</h2>
          <p v-if="selectedService" class="book__duration">
            <Icon name="check" :size="13" :strokeWidth="2.4" />
            {{ selectedService.name }}
          </p>
        </div>
        <p v-if="services.length === 0" class="book__state">
          Este perfil aún no tiene servicios activos para reservar.
        </p>
        <ul v-else class="book__services">
          <li v-for="s in services" :key="s._id">
            <button
              class="service-pick"
              :class="{ 'service-pick--on': serviceId === s._id }"
              type="button"
              :disabled="booking || bookingUncertain"
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
      <section v-if="serviceId" id="paso-2" class="book__card">
        <div class="book__card-head">
          <h2 class="book__step">2 · Fecha y hora</h2>
          <p v-if="selectedService" class="book__duration">
            <Icon name="clock" :size="13" />
            {{ selectedService.durationMinutes }} min
          </p>
        </div>

        <p class="book__month">
          <Icon name="calendar" :size="14" />
          <span>{{ monthLabel }}</span>
        </p>

        <div class="book__dates" role="group" aria-label="Elige un día">
          <button
            v-for="d in dateOptions"
            :key="d.value"
            class="date-chip"
            :class="{ 'date-chip--on': date === d.value }"
            type="button"
            :disabled="booking || bookingUncertain"
            :aria-pressed="date === d.value"
            :aria-label="longDate(d.value)"
            @click="date = d.value"
          >
            <span class="date-chip__wd">{{ d.weekday }}</span>
            <span class="date-chip__day">{{ d.day }}</span>
            <span v-if="d.showMonth" class="date-chip__month">{{ d.monthShort }}</span>
            <span v-else-if="d.isToday" class="date-chip__month">hoy</span>
            <span v-else class="date-chip__month date-chip__month--empty">&nbsp;</span>
          </button>
        </div>

        <p v-if="slotsLoading" class="book__state book__state--inline" role="status" aria-live="polite">
          {{ slotsWaiting ? 'Estamos conectando con la agenda, espera un momento…' : 'Consultando horarios disponibles…' }}
        </p>
        <Button v-if="slotsRetryable && !slotsLoading" variant="secondary" @click="reloadSlots">
          Volver a consultar horarios
        </Button>
        <p v-else-if="date && slotsError" class="book__notice" role="status">
          <Icon name="alert" :size="15" />
          <span>{{ slotsError }}</span>
        </p>

        <div v-if="slots.length" class="book__times">
          <div v-for="g in slotGroups" :key="g.key" class="book__times-group">
            <p class="book__times-label">
              <span>{{ g.label }}</span>
              <i class="book__times-rule" aria-hidden="true"></i>
            </p>
            <div class="book__slots" role="group" :aria-label="g.label">
              <button
                v-for="slot in g.slots"
                :key="slot.start"
                class="slot"
                :class="{ 'slot--on': start === slot.start }"
                type="button"
                :disabled="booking || bookingUncertain"
                :aria-pressed="start === slot.start"
                @click="pickSlot(slot.start)"
              >
                <span class="slot__start">{{ slot.start }}</span>
                <span class="slot__end">→ {{ slot.end }}</span>
              </button>
            </div>
          </div>

          <p v-if="bufferMinutes > 0" class="book__note">
            <Icon name="clock" :size="14" />
            <span>
              Dejamos {{ bufferMinutes }} min de cambio entre citas para que tu turno
              nunca se te atrase.
            </span>
          </p>
        </div>

        <div v-if="selectedSlot" class="book__pick">
          <Icon name="check-circle" :size="18" />
          <span>
            <strong>{{ longDate(date) }}</strong>
            · {{ selectedSlot.start }} – {{ selectedSlot.end }}
          </span>
          <button class="book__pick-clear" type="button" :disabled="booking || bookingUncertain" @click="start = ''">Cambiar</button>
        </div>
      </section>

      <!-- Paso 3: tus datos -->
      <section v-if="serviceId && date && start" id="paso-3" class="book__card">
        <div class="book__card-head">
          <h2 class="book__step">3 · Tus datos</h2>
          <p class="book__duration">
            <Icon name="lock" :size="13" />
            Sin cuenta
          </p>
        </div>
        <form class="book__form" novalidate @submit.prevent="submitForm">
          <label class="form__field">
            <span class="form__label">Nombre *</span>
            <input
              v-model="form.name"
              class="form__input"
              :class="{ 'form__input--error': showError('name') }"
              type="text"
              maxlength="120"
              autocomplete="name"
              :disabled="booking || bookingUncertain"
              placeholder="Tu nombre"
              :aria-invalid="showError('name') ? 'true' : null"
              @blur="touched.name = true"
            />
            <span v-if="showError('name')" class="form__error">{{ formErrors.name }}</span>
          </label>

          <label class="form__field">
            <span class="form__label">Teléfono *</span>
            <input
              v-model="form.phone"
              class="form__input"
              :class="{ 'form__input--error': showError('phone') }"
              type="tel"
              maxlength="40"
              autocomplete="tel"
              :disabled="booking || bookingUncertain"
              placeholder="Ej. 300 123 4567"
              :aria-invalid="showError('phone') ? 'true' : null"
              @blur="touched.phone = true"
            />
            <span v-if="showError('phone')" class="form__error">{{ formErrors.phone }}</span>
          </label>

          <label v-if="profile?.whatsappUpdatesAvailable" class="book__whatsapp-opt-in">
            <input v-model="form.whatsappOptIn" type="checkbox" :disabled="booking || bookingUncertain" />
            <span>Acepto recibir por WhatsApp avisos sobre esta reserva y un recordatorio antes de la cita.</span>
          </label>
          <p v-else class="book__whatsapp-unavailable">Los avisos automáticos por WhatsApp no están disponibles todavía. Podrás consultar el estado de tu reserva en esta página.</p>

          <p class="book__recap">
            <strong>{{ selectedService?.name }}</strong> · {{ longDate(date) }} ·
            {{ selectedSlot?.start }} – {{ selectedSlot?.end }}
            · {{ priceLabel(selectedService?.price) }}
          </p>

          <p v-if="bookingUncertain" class="form__error" role="alert">{{ confirmError }}</p>
          <a v-if="bookingUncertain && bookingCheckLink" class="btn btn--secondary" :href="bookingCheckLink" target="_blank" rel="noopener">
            Consultar con el barbero
          </a>
          <Button type="submit" variant="primary" :disabled="booking || bookingUncertain">
            Revisar y confirmar
          </Button>
        </form>
      </section>

      <!-- Confirmación centrada: el cliente acepta aquí antes de enviar la cita -->
      <Modal
        :open="confirmOpen"
        title="Confirmar reserva"
        icon="calendar"
        @close="!booking && (confirmOpen = false)"
      >
        <p class="book__confirm-lead">
          Revisa los datos. Al confirmar, la cita queda
          <strong>pendiente de que {{ profile?.name }} la acepte</strong>.
        </p>

        <ul class="book__summary">
          <li><span>Servicio</span><strong>{{ selectedService?.name }}</strong></li>
          <li><span>Fecha</span><strong>{{ longDate(date) }}</strong></li>
          <li>
            <span>Hora</span>
            <strong>{{ selectedSlot?.start }} – {{ selectedSlot?.end }}</strong>
          </li>
          <li><span>Duración</span><strong>{{ selectedService?.durationMinutes }} min</strong></li>
          <li><span>Precio</span><strong>{{ priceLabel(selectedService?.price) }}</strong></li>
          <li><span>Nombre</span><strong>{{ form.name.trim() }}</strong></li>
          <li><span>Teléfono</span><strong>{{ form.phone.trim() }}</strong></li>
        </ul>

        <p v-if="confirmError" class="form__error" role="alert">{{ confirmError }}</p>
        <a v-if="bookingUncertain && bookingCheckLink" class="btn btn--secondary" :href="bookingCheckLink" target="_blank" rel="noopener">
          Consultar con el barbero
        </a>
        <p v-if="booking" role="status" aria-live="polite">Estamos enviando tu reserva. Espera la confirmación antes de cerrar esta página.</p>

        <template #footer>
          <Button variant="secondary" :disabled="booking" @click="confirmOpen = false">
            Seguir editando
          </Button>
          <Button variant="primary" :disabled="booking || bookingUncertain" @click="confirmBooking">
            {{ booking ? 'Confirmando…' : 'Sí, confirmar' }}
          </Button>
        </template>
      </Modal>
    </template>
  </div>
</template>

<style scoped>
.book {
  max-width: 640px;
  margin: 0 auto;
  padding: clamp(24px, 5vw, 48px) var(--space-4);
}
.book__whatsapp-opt-in { display:flex; align-items:flex-start; gap:var(--space-2); color:var(--text-muted); font-size:var(--font-size-xs); line-height:1.45; }
.book__whatsapp-opt-in input { width:16px; height:16px; flex:0 0 auto; margin-top:2px; accent-color:var(--accent); }
.book__whatsapp-unavailable { color:var(--text-muted); font-size:var(--font-size-xs); }

.book__state {
  color: var(--text-muted);
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

/* Barra mínima: marca a la izquierda, volver al perfil a la derecha */
.book__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.book__brand {
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text);
}

.book__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  padding: 6px 10px;
  margin: 0;
  border-radius: var(--radius-md);
  transition: color var(--motion-fast) ease, background-color var(--motion-fast) ease;
}

.book__back:hover {
  color: var(--accent-hover);
  background: var(--accent-soft);
}

.book__type {
  display: inline-block;
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-pill);
  padding: 4px 12px;
  margin-bottom: var(--space-3);
}

.book__title {
  font-size: clamp(1.3rem, 4vw, 1.8rem);
  margin-bottom: var(--space-2);
}

.book__lead {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

/* Indicador de pasos bajo el título */
.book__stepper {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 0;
  list-style: none;
  padding: 0;
  margin: var(--space-5) 0 0;
}

.book__stepper li {
  position: relative;
  flex: 1;
  display: flex;
  justify-content: center;
  min-width: 0;
}

/* Línea que une un paso con el siguiente */
.book__stepper li:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 15px;
  left: calc(50% + 22px);
  width: calc(100% - 44px);
  height: 2px;
  background: var(--border);
}

.book__stepper li.is-done:not(:last-child)::after,
.book__stepper li.is-current:not(:last-child)::after {
  background: var(--accent-border);
}

.book__stepper-btn {
  font: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--text-muted);
  min-width: 0;
}

.book__stepper-btn:disabled {
  cursor: default;
}

.book__stepper-dot {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 700;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-muted);
  transition: background-color var(--motion) ease, border-color var(--motion) ease,
    color var(--motion) ease;
}

.book__stepper-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-align: center;
  line-height: 1.25;
}

/* Paso completado: palomita en accent */
.book__stepper li.is-done .book__stepper-dot {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.book__stepper li.is-done .book__stepper-btn,
.book__stepper li.is-done .book__stepper-label {
  color: var(--accent);
}

/* Paso actual: anillo destacado */
.book__stepper li.is-current .book__stepper-dot {
  background: var(--accent-soft);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
  color: var(--accent);
}

.book__stepper li.is-current .book__stepper-label {
  color: var(--text);
  font-weight: 700;
}

/* Paso futuro: apagado */
.book__stepper li.is-future .book__stepper-dot {
  opacity: 0.6;
}

.book__confirm-lead {
  margin-bottom: var(--space-3);
}

.book__confirm-lead strong {
  color: var(--text);
}

.book__card {
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  margin-bottom: var(--space-4);
  box-shadow: var(--shadow-sm);
}

.book__card--ok {
  text-align: center;
}

.book__ok-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto var(--space-4);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--success);
  background: var(--success-soft);
  border: 1px solid var(--success-border);
}

.book__step {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  margin-bottom: var(--space-4);
  padding: 4px 12px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-pill);
  color: var(--accent);
}

.book__summary {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: var(--space-5) 0;
  font-size: var(--font-size-sm);
}

.book__summary a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Acciones de la pantalla de éxito: WhatsApp + volver */
.book__ok-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.book__summary li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  border-bottom: 1px dashed var(--border-soft);
  padding-bottom: var(--space-2);
}

.book__summary span {
  color: var(--text-muted);
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
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  transition: border-color var(--motion) ease, background-color var(--motion) ease, box-shadow var(--motion) ease;
}

.service-pick:hover {
  border-color: var(--accent-border);
}

/* Seleccionado: borde accent + fondo accent-soft (nunca solo color: doble borde) */
.service-pick--on {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 0 1px var(--accent);
}

.service-pick__name {
  font-weight: 600;
}

.service-pick__meta {
  font-size: var(--font-size-sm);
  color: var(--accent);
  font-weight: 600;
}

/* Encabezado de la tarjeta: paso + duración del servicio */
.book__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}

.book__card-head .book__step {
  margin-bottom: 0;
}

.book__duration {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  padding: 4px 10px;
}

.book__month {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: var(--space-2);
}

/* Tira de fechas: se desliza en horizontal (celular primero) */
.book__dates {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: var(--space-2);
  margin-bottom: var(--space-4);
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
  -webkit-mask-image: linear-gradient(to right, #000 92%, transparent 100%);
  mask-image: linear-gradient(to right, #000 92%, transparent 100%);
}

.date-chip {
  font: inherit;
  flex: 0 0 auto;
  min-width: 62px;
  scroll-snap-align: start;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 6px 6px;
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: border-color var(--motion) ease, background-color var(--motion) ease,
    color var(--motion) ease, transform var(--motion) ease;
}

.date-chip:hover {
  border-color: var(--accent-border);
}

.date-chip--on {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 0 1px var(--accent);
}

.date-chip__wd {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.date-chip__day {
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.1;
  color: var(--text);
}

.date-chip--on .date-chip__day {
  color: var(--accent);
}

.date-chip__month {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  min-height: 12px;
}

.date-chip__month--empty {
  opacity: 0;
}

/* Horas disponibles, separadas en Mañana / Tarde */
.book__times {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.book__times-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.book__times-label {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.book__times-rule {
  flex: 1;
  height: 1px;
  background: var(--border-soft);
}

.book__slots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: var(--space-2);
}

.slot {
  font: inherit;
  font-variant-numeric: tabular-nums;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: border-color var(--motion) ease, background-color var(--motion) ease,
    color var(--motion) ease;
}

.slot:hover {
  border-color: var(--accent-border);
}

.slot--on {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 0 1px var(--accent);
}

.slot__start {
  font-size: 1rem;
  font-weight: 700;
}

.slot--on .slot__start {
  color: var(--accent);
}

.slot__end {
  font-size: 10.5px;
  color: var(--text-muted);
}

.slot--on .slot__end {
  color: var(--accent);
}

/* Nota de margen de cambio entre citas */
.book__note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: var(--font-size-xs);
  line-height: 1.5;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
}

.book__note .icon {
  flex: 0 0 auto;
  margin-top: 2px;
}

/* Aviso suave (sin rojo) cuando no hay huecos */
.book__notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: var(--font-size-sm);
  line-height: 1.5;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  margin-bottom: var(--space-3);
}

.book__notice .icon {
  flex: 0 0 auto;
  margin-top: 2px;
}

/* Resumen de lo elegido al pie del paso 2 */
.book__pick {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
}

.book__pick .icon {
  flex: 0 0 auto;
}

.book__pick span {
  flex: 1;
}

.book__pick-clear {
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: 700;
  background: none;
  border: none;
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  padding: 0;
}

.book__pick-clear:hover {
  color: var(--accent-hover);
}

.book__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.book__recap {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.book__recap strong {
  color: var(--text);
}
</style>
