<script setup>
import { ref, computed, watch, onMounted, defineAsyncComponent } from 'vue'
import { useAuthStore } from '../../stores/auth'
import {
  useAppointmentsStore,
  STATUS_LABELS,
  STATUS_ACTIONS,
  allowedTransitions,
} from '../../stores/appointments'
import { useToastsStore } from '../../stores/toasts'
import { useCashStore } from '../../stores/cash'
import { waLink, waMessageLink } from '../../utils/whatsapp'
import { mapsLink } from '../../utils/maps'
import { dayjs, toISODate, moneyLabel } from '../../utils/datetime'
import { es } from 'date-fns/locale'
import Icon from '../../components/Icon.vue'

/* Calendario (@vuepic/vue-datepicker) cargado bajo demanda: así no sumamos
   ~230 kB al bundle inicial del home y solo se descarga al entrar al panel. */
const VueDatePicker = defineAsyncComponent(async () => {
  await import('@vuepic/vue-datepicker/dist/main.css')
  const mod = await import('@vuepic/vue-datepicker')
  return mod.VueDatePicker
})

const auth = useAuthStore()
const store = useAppointmentsStore()
const toast = useToastsStore()
const cash = useCashStore()

const barberName = computed(
  () =>
    auth.profile?.professionalName ||
    auth.profile?.businessName ||
    auth.user?.name ||
    'tu barbero'
)

const bookingUrl = computed(() => {
  const slug = auth.profile?.slug
  return slug ? `/u/${slug}/reservar?date=${selected.value}` : null
})

function waReminderLink(appt) {
  const msg = `¡Hola ${appt.clientSnapshot.name}! 👋 Te recuerdo tu cita hoy a las ${appt.localStart} para ${appt.serviceSnapshot.name} con ${barberName.value}. ¡Te esperamos!`
  return waMessageLink(appt.clientSnapshot.phone, msg)
}

/** Dirección del local del barbero (para los mensajes con ubicación). */
const barberLocation = computed(() => (auth.profile?.location || '').trim())

/**
 * Añade la ubicación del local al final del mensaje, en formato enlace de
 * mapa: el cliente lo toca en WhatsApp y llega directo (no un texto plano).
 */
function withMap(msg) {
  if (!barberLocation.value) return msg
  const link = mapsLink(barberLocation.value)
  return `${msg}\n\n📍 Ubicación: ${barberLocation.value}${link ? `\n${link}` : ''}`
}

/** Al crear la reserva: aviso de solicitud recibida con fecha y hora. */
function waRequestedLink(appt) {
  const msg = `¡Hola ${appt.clientSnapshot.name}! Recibí tu solicitud de ${appt.serviceSnapshot.name} para el ${longLabel(appt.date)} a las ${appt.localStart} con ${barberName.value}. Te confirmo en un momento.`
  return waMessageLink(appt.clientSnapshot.phone, withMap(msg))
}

function waReadyLink(appt) {
  const msg = `¡Hola ${appt.clientSnapshot.name}! 💈 Tu turno para ${appt.serviceSnapshot.name} ya está listo. ¡Ya puedes pasar!`
  return waMessageLink(appt.clientSnapshot.phone, msg)
}

/** Al confirmar: fecha, hora y ubicación en formato enlace de mapa. */
function waConfirmedLink(appt) {
  const msg = `¡Hola ${appt.clientSnapshot.name}! ✅ Tu cita para ${appt.serviceSnapshot.name} el ${longLabel(appt.date)} a las ${appt.localStart} con ${barberName.value} ha sido confirmada con éxito. ¡Nos vemos!`
  return waMessageLink(appt.clientSnapshot.phone, withMap(msg))
}

/** Al rechazar/cancelar: aviso de que no fue posible agendar. */
function waCancelledLink(appt) {
  const msg = `¡Hola ${appt.clientSnapshot.name}! Lamento avisarte que no fue posible agendar tu cita de ${appt.serviceSnapshot.name} para el ${longLabel(appt.date)} a las ${appt.localStart}. Escríbeme y con gusto buscamos otro horario.`
  return waMessageLink(appt.clientSnapshot.phone, withMap(msg))
}

function waDirectLink(appt) {
  return waLink(appt.clientSnapshot.phone)
}

const mode = ref('day') // 'day' | 'week'
const selected = ref(toISODate(new Date()))

/* Toda la fecha pasa por dayjs (utils/datetime.js, locale español).
   Ojo: dayjs lee 'YYYY-MM-DD' en HORA LOCAL; nunca usar toISOString. */
function addDays(iso, n) {
  return dayjs(iso).add(n, 'day').format('YYYY-MM-DD')
}

/** Lunes (día 1) de la semana que contiene `iso`. */
function mondayOf(iso) {
  const d = dayjs(iso)
  return d.subtract((d.day() + 6) % 7, 'day').format('YYYY-MM-DD')
}

/** Fecha larga para la cabecera y los mensajes: 'lunes 26 de octubre de 2026'. */
function longLabel(iso) {
  return dayjs(iso).format('dddd D [de] MMMM [de] YYYY')
}

/** 'Lun 26' para la vista semanal. */
function shortLabel(iso) {
  const label = dayjs(iso).format('ddd D')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const weekDays = computed(() => {
  const mon = mondayOf(selected.value)
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(mon, i)
    return { date, label: shortLabel(date), items: store.byDate[date] || [] }
  })
})

const dayItems = computed(() => store.byDate[selected.value] || [])

const isToday = computed(() => selected.value === toISODate(new Date()))

/** La fecha seleccionada como Date, para el calendario de la librería. */
const selectedDate = computed(() => dayjs(selected.value).toDate())

/** Salta la agenda a la fecha elegida en el calendario. */
function jumpTo(value) {
  if (!value) return
  selected.value = toISODate(value)
}

/** Rango a consultar según el modo (día suelto o semana completa). */
const range = computed(() =>
  mode.value === 'week'
    ? { from: mondayOf(selected.value), to: addDays(mondayOf(selected.value), 6) }
    : { from: selected.value, to: selected.value }
)

watch([mode, selected], load, { immediate: true })
onMounted(() => load())

async function load(force = false) {
  store.clearError()
  await store.fetchRange(range.value.from, range.value.to, force)
}

function move(delta) {
  selected.value = addDays(selected.value, mode.value === 'week' ? delta * 7 : delta)
}

async function act(appointment, status) {
  try {
    await store.changeStatus(appointment._id, status)
    toast.success(`Cita ${STATUS_LABELS[status].toLowerCase()}`)
  } catch {
    // La transición la rechazó el backend (409): el motivo queda en store.error
    toast.error('No se pudo cambiar la cita', store.error)
  }
}

/**
 * Cobra la cita en un clic: registra el ingreso en la caja abierta con el
 * precio del servicio y lo vincula a la cita (el backend impide doble cobro).
 * Si no hay caja abierta, el backend responde 409 y avisamos con su mensaje.
 */
async function charge(appointment) {
  try {
    await cash.chargeAppointment(appointment)
    appointment.paid = true
    toast.success(
      'Cobro registrado',
      `${appointment.serviceSnapshot.name} · ${moneyLabel(appointment.serviceSnapshot.price)}`
    )
  } catch {
    toast.error('No se pudo cobrar', cash.error)
  }
}

/** Clase visual del badge según estado. */
function statusClass(status) {
  return {
    pending: 'appt__badge--pending',
    confirmed: 'appt__badge--confirmed',
    completed: 'appt__badge--completed',
    cancelled: 'appt__badge--cancelled',
    no_show: 'appt__badge--no_show',
  }[status] || ''
}
</script>

<template>
  <div class="agenda">
    <header class="agenda__header">
      <div>
        <h1 class="agenda__title">Mi agenda</h1>
        <p class="agenda__lead">
          Aquí llegan las citas que tus clientes reservaron desde tu perfil público.
          Confirma, completa o cancela cada una;
          los cambios de estado los valida el servidor.
        </p>
      </div>
      <div class="agenda__header-actions">
        <a
          v-if="bookingUrl"
          class="btn btn--primary btn--sm"
          :href="bookingUrl"
          target="_blank"
          rel="noopener"
        >
          + Agendar cita
        </a>
        <RouterLink class="btn btn--secondary btn--sm" :to="auth.panelPath">
          <Icon name="arrow-left" :size="16" /> Volver al panel
        </RouterLink>
      </div>
    </header>

    <!-- Controles -->
    <section class="agenda__controls">
      <div class="agenda__modes" role="tablist" aria-label="Vista de agenda">
        <button
          class="agenda__mode"
          :class="{ 'agenda__mode--on': mode === 'day' }"
          type="button"
          role="tab"
          :aria-selected="mode === 'day'"
          @click="mode = 'day'"
        >
          <Icon name="calendar" :size="16" /> Día
        </button>
        <button
          class="agenda__mode"
          :class="{ 'agenda__mode--on': mode === 'week' }"
          type="button"
          role="tab"
          :aria-selected="mode === 'week'"
          @click="mode = 'week'"
        >
          <Icon name="calendar" :size="16" /> Semana
        </button>
      </div>

      <div class="agenda__nav">
        <button class="btn btn--secondary btn--sm" type="button" @click="move(-1)">
          ‹ Anterior
        </button>
        <button class="btn btn--secondary btn--sm" type="button" @click="selected = toISODate(new Date())" :disabled="isToday">
          Hoy
        </button>
        <button class="btn btn--secondary btn--sm" type="button" @click="move(1)">
          Siguiente ›
        </button>
        <VueDatePicker
          class="agenda__jump"
          :model-value="selectedDate"
          :locale="es"
          :time-config="{ enableTimePicker: false }"
          :formats="{ input: 'dd/MM/yyyy' }"
          :teleport="true"
          :input-attrs="{ clearable: false }"
          placeholder="Ir a fecha…"
          aria-label="Ir a una fecha"
          @update:model-value="jumpTo"
        />
      </div>

      <p class="agenda__date">
        <strong>{{ mode === 'week' ? 'Semana del ' + shortLabel(weekDays[0].date) + ' al ' + shortLabel(weekDays[6].date) : longLabel(selected) }}</strong>
        <span v-if="isToday" class="agenda__today">hoy</span>
      </p>
    </section>

    <p v-if="store.loading" class="agenda__state">Cargando citas…</p>

    <template v-else>
      <p v-if="store.error" class="form__error" role="alert">{{ store.error }}</p>

      <!-- Vista día -->
      <section v-if="mode === 'day'" class="agenda__card">
        <template v-if="dayItems.length">
          <ul class="agenda__list">
            <li v-for="a in dayItems" :key="a._id" class="appt">
              <div class="appt__time">
                <strong>{{ a.localStart }}</strong>
                <span>{{ a.localEnd }}</span>
              </div>
              <div class="appt__info">
                <p class="appt__client">
                  {{ a.clientSnapshot.name }}
                  <span class="appt__badge" :class="statusClass(a.status)">
                    {{ STATUS_LABELS[a.status] }}
                  </span>
                </p>
                <p class="appt__meta">
                  {{ a.serviceSnapshot.name }} · {{ a.serviceSnapshot.durationMinutes }} min ·
                  {{ moneyLabel(a.serviceSnapshot.price) }}
                </p>
                <!-- Ficha técnica privada del cliente (se ve al abrir la cita) -->
                <p v-if="a.clientNotes" class="appt__notes">
                  <span class="appt__notes-tag"><Icon name="clipboard" :size="14" /> Ficha</span>
                  <span class="appt__notes-text">{{ a.clientNotes }}</span>
                </p>
                <div class="appt__contact">
                  <a class="appt__phone" :href="`tel:${a.clientSnapshot.phone}`">
                    <Icon name="phone" :size="15" /> {{ a.clientSnapshot.phone }}
                  </a>
                  <div class="appt__wa-group">
                    <a
                      v-if="waDirectLink(a)"
                      class="appt__wa-btn"
                      :href="waDirectLink(a)"
                      target="_blank"
                      rel="noopener"
                      title="Abrir chat en WhatsApp"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                      <span>Chat</span>
                    </a>
                    <a
                      v-if="waRequestedLink(a) && a.status === 'pending'"
                      class="appt__wa-btn appt__wa-btn--pill"
                      :href="waRequestedLink(a)"
                      target="_blank"
                      rel="noopener"
                      title="Avisar al cliente que su solicitud fue recibida"
                    >
                      <Icon name="check-circle" :size="15" /> Recibido
                    </a>
                    <a
                      v-if="waReminderLink(a) && ['pending', 'confirmed'].includes(a.status)"
                      class="appt__wa-btn appt__wa-btn--pill"
                      :href="waReminderLink(a)"
                      target="_blank"
                      rel="noopener"
                      title="Enviar recordatorio de turno por WhatsApp"
                    >
                      <Icon name="bell" :size="15" /> Recordar
                    </a>
                    <a
                      v-if="waReadyLink(a) && a.status === 'confirmed'"
                      class="appt__wa-btn appt__wa-btn--pill"
                      :href="waReadyLink(a)"
                      target="_blank"
                      rel="noopener"
                      title="Avisar que su turno ya está listo"
                    >
                      <Icon name="scissors" :size="15" /> Ya puedes pasar
                    </a>
                    <a
                      v-if="waConfirmedLink(a) && a.status === 'pending'"
                      class="appt__wa-btn appt__wa-btn--pill"
                      :href="waConfirmedLink(a)"
                      target="_blank"
                      rel="noopener"
                      title="Enviar confirmación de cita por WhatsApp"
                    >
                      <Icon name="check" :size="15" /> Confirmar
                    </a>
                    <a
                      v-if="waCancelledLink(a) && a.status === 'cancelled'"
                      class="appt__wa-btn appt__wa-btn--pill"
                      :href="waCancelledLink(a)"
                      target="_blank"
                      rel="noopener"
                      title="Avisar al cliente que la cita no se agendó"
                    >
                      <Icon name="x" :size="15" /> Avisar cancelación
                    </a>
                  </div>
                </div>
              </div>
              <div class="appt__actions">
                <!-- Cobro en un clic (solo si la cita aún no está cobrada) -->
                <button
                  v-if="!a.paid && !['cancelled', 'no_show'].includes(a.status)"
                  class="btn btn--sm appt__charge"
                  type="button"
                  :disabled="store.saving || cash.saving"
                  title="Registrar el cobro de esta cita en la caja"
                  @click="charge(a)"
                >
                  <Icon name="wallet" :size="15" /> Cobrar {{ moneyLabel(a.serviceSnapshot.price) }}
                </button>
                <span v-else-if="a.paid" class="appt__paid" title="Cobro registrado en caja">
                  <Icon name="check" :size="15" /> Cobrado
                </span>

                <button
                  v-for="next in allowedTransitions(a.status)"
                  :key="next"
                  class="btn btn--sm"
                  :class="next === 'cancelled' || next === 'no_show' ? 'btn--danger' : 'btn--primary'"
                  type="button"
                  :disabled="store.saving"
                  @click="act(a, next)"
                >
                  <Icon :name="STATUS_ACTIONS[next].icon" :size="15" />
                  {{ STATUS_ACTIONS[next].label }}
                </button>
              </div>
            </li>
          </ul>
        </template>
        <p v-else class="agenda__state">Sin citas para este día.</p>
      </section>

      <!-- Vista semana -->
      <section v-else class="agenda__week-wrap">
        <div class="agenda__week">
          <div v-for="day in weekDays" :key="day.date" class="weekday" :class="{ 'weekday--today': day.date === toISODate(new Date()) }">
            <p class="weekday__label">{{ day.label }}</p>
            <p v-if="day.items.length" class="weekday__count">{{ day.items.length }} cita{{ day.items.length > 1 ? 's' : '' }}</p>
            <ul v-if="day.items.length" class="weekday__list">
              <li v-for="a in day.items" :key="a._id" class="weekday__item" :class="statusClass(a.status)">
                <strong>{{ a.localStart }}</strong> · {{ a.clientSnapshot.name }}
                <span class="weekday__service">{{ a.serviceSnapshot.name }}</span>
                <span class="appt__badge" :class="statusClass(a.status)">{{ STATUS_LABELS[a.status] }}</span>
              </li>
            </ul>
            <p v-else class="weekday__empty">—</p>
          </div>
        </div>
        <p class="agenda__note">
          En la vista de día puedes cambiar el estado de cada cita; la vista semanal es de consulta.
        </p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.agenda__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-bottom: var(--space-5);
}

.agenda__header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.agenda__title {
  font-size: clamp(1.3rem, 4vw, 1.8rem);
  margin-bottom: var(--space-2);
}

.agenda__lead {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  max-width: 560px;
}

.agenda__controls {
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.agenda__modes {
  display: inline-flex;
  gap: var(--space-2);
}

.agenda__mode {
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 6px 14px;
  cursor: pointer;
}

.agenda__mode--on {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.agenda__nav {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  align-items: center;
}

/* Calendario para saltar a cualquier fecha (@vuepic/vue-datepicker) */
.agenda__jump {
  width: 170px;
  --dp-font-family: var(--font-body);
  --dp-font-size: var(--font-size-sm);
  --dp-border-radius: var(--radius-md);
  --dp-border-color: var(--color-border);
  --dp-input-height: 36px;
  --dp-input-color: var(--color-text);
  --dp-input-background-color: var(--color-surface);
  --dp-input-icon-color: var(--color-text-muted);
  --dp-placeholder-color: var(--color-text-muted);
  --dp-menu-min-width: 290px;
  --dp-cell-size: 36px;
  --dp-primary-color: var(--color-primary);
  --dp-primary-disabled-color: var(--accent-soft);
  --dp-highlight-color: var(--accent-soft);
  --dp-hover-color: var(--surface-2);
  --dp-day-name-color: var(--color-text-muted);
  --dp-text-color: var(--color-text);
}

.agenda__date {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.agenda__date strong {
  color: var(--color-text);
}

.agenda__today {
  font-size: var(--font-size-xs);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 2px 8px;
}

.agenda__state {
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--space-6) 0;
}

.agenda__card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-5);
}

.agenda__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.appt {
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  flex-wrap: wrap;
}

.appt__time {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 64px;
  font-variant-numeric: tabular-nums;
}

.appt__time strong {
  font-size: var(--font-size-md);
  color: var(--color-primary-soft);
}

.appt__time span {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.appt__info {
  flex: 1;
  min-width: 200px;
}

.appt__client {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.appt__meta {
  font-size: var(--font-size-sm);
  color: var(--color-primary-soft);
  margin-top: var(--space-1);
}

/* Ficha técnica privada del cliente (visible al abrir la cita) */
.appt__notes {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--surface-2);
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
}

.appt__notes-tag {
  font-weight: 700;
  color: var(--accent);
  white-space: nowrap;
}

.appt__notes-text {
  color: var(--text-muted);
}

.appt__contact {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-top: var(--space-2);
}

.appt__phone {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-decoration: none;
}

.appt__phone:hover {
  color: var(--accent);
  text-decoration: underline;
}

.appt__wa-group {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  flex-wrap: wrap;
}

.appt__wa-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(37, 211, 102, 0.12);
  color: #15803d;
  border: 1px solid rgba(37, 211, 102, 0.35);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s ease;
}

.appt__wa-btn:hover {
  background: #25d366;
  color: #ffffff;
}

.appt__wa-btn svg {
  width: 13px;
  height: 13px;
}

.appt__wa-btn--pill {
  border-radius: var(--radius-full);
}

.appt__actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  align-items: center;
}

/* Botón de cobro (verde, un clic => ingreso en caja) */
.appt__charge {
  background: #16a34a;
  border-color: #16a34a;
  color: #ffffff;
}

.appt__charge:hover:not(:disabled) {
  background: #15803d;
  border-color: #15803d;
  color: #ffffff;
}

/* Badge de cita ya cobrada */
.appt__paid {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--success);
  background: var(--success-soft);
  border: 1px solid var(--success-border);
  border-radius: var(--radius-pill);
  padding: 4px 10px;
  white-space: nowrap;
}

.appt__badge {
  font-size: var(--font-size-xs);
  font-weight: 700;
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  border: 1px solid transparent;
}

.appt__badge--pending {
  color: var(--warning);
  background: var(--warning-soft);
  border-color: var(--warning-border);
}

.appt__badge--confirmed {
  color: var(--info);
  background: var(--info-soft);
  border-color: var(--info-border);
}

.appt__badge--completed {
  color: var(--success);
  background: var(--success-soft);
  border-color: var(--success-border);
}

.appt__badge--cancelled {
  color: var(--text-faint);
  background: var(--surface-2);
  border-color: var(--border);
}

.appt__badge--no_show {
  color: var(--danger);
  background: var(--danger-soft);
  border-color: var(--danger-border);
}

.agenda__week-wrap {
  overflow-x: auto;
}

.agenda__week {
  display: grid;
  grid-template-columns: repeat(7, minmax(130px, 1fr));
  gap: var(--space-3);
  min-width: 720px;
}

.weekday {
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  min-height: 140px;
}

.weekday--today {
  border-color: var(--color-primary);
}

.weekday__label {
  font-size: var(--font-size-sm);
  font-weight: 700;
  margin-bottom: var(--space-1);
}

.weekday__count,
.weekday__empty {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

.weekday__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.weekday__item {
  font-size: var(--font-size-xs);
  border-left: 3px solid var(--color-border);
  padding-left: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.weekday__item.appt__badge--pending { border-left-color: var(--warning); }
.weekday__item.appt__badge--confirmed { border-left-color: var(--info); }
.weekday__item.appt__badge--completed { border-left-color: var(--success); }
.weekday__item.appt__badge--cancelled { border-left-color: var(--text-faint); }
.weekday__item.appt__badge--no_show { border-left-color: var(--danger); }

.weekday__service {
  color: var(--color-text-muted);
}

.agenda__note {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-top: var(--space-3);
}

@media (max-width: 560px) {
  .appt {
    flex-direction: column;
  }

  .appt__time {
    flex-direction: row;
    gap: var(--space-2);
    align-items: baseline;
  }
}
</style>
