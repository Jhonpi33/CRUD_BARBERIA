<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import {
  useAppointmentsStore,
  STATUS_LABELS,
  STATUS_ACTIONS,
  allowedTransitions,
} from '../../stores/appointments'
import Button from '../../components/Button.vue'

const auth = useAuthStore()
const store = useAppointmentsStore()

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const mode = ref('day') // 'day' | 'week'
const selected = ref(toISODate(new Date()))
const success = ref('')

/** Fecha local -> 'YYYY-MM-DD' (nunca usar toISOString: corre en UTC). */
function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(iso, n) {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Lunes (día 1) de la semana que contiene `iso`. */
function mondayOf(iso) {
  const d = parseISO(iso)
  const dow = (d.getDay() + 6) % 7 // 0 = lunes
  d.setDate(d.getDate() - dow)
  return toISODate(d)
}

function longLabel(iso) {
  const d = parseISO(iso)
  const dow = (d.getDay() + 6) % 7
  const dayName = [
    'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo',
  ][dow]
  return `${dayName} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} de ${d.getFullYear()}`
}

function shortLabel(iso) {
  const d = parseISO(iso)
  return `${DAY_NAMES[(d.getDay() + 6) % 7]} ${d.getDate()}`
}

function priceLabel(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value))
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

/** Rango a consultar según el modo (día suelto o semana completa). */
const range = computed(() =>
  mode.value === 'week'
    ? { from: mondayOf(selected.value), to: addDays(mondayOf(selected.value), 6) }
    : { from: selected.value, to: selected.value }
)

watch([mode, selected], load, { immediate: true })
onMounted(() => load())

async function load(force = false) {
  success.value = ''
  store.clearError()
  await store.fetchRange(range.value.from, range.value.to, force)
}

function move(delta) {
  selected.value = addDays(selected.value, mode.value === 'week' ? delta * 7 : delta)
}

async function act(appointment, status) {
  success.value = ''
  try {
    await store.changeStatus(appointment._id, status)
    success.value = `Cita ${STATUS_LABELS[status].toLowerCase()}.`
  } catch {
    /* el mensaje queda en store.error (transición rechazada por backend) */
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
          Citas reservadas desde tu enlace público. Confirma, completa o cancela cada cita;
          los cambios de estado los valida el servidor.
        </p>
      </div>
      <RouterLink class="btn btn--secondary btn--sm" :to="auth.panelPath">
        ⬅ Volver al panel
      </RouterLink>
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
          📅 Día
        </button>
        <button
          class="agenda__mode"
          :class="{ 'agenda__mode--on': mode === 'week' }"
          type="button"
          role="tab"
          :aria-selected="mode === 'week'"
          @click="mode = 'week'"
        >
          🗓 Semana
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
      </div>

      <p class="agenda__date">
        <strong>{{ mode === 'week' ? 'Semana del ' + shortLabel(weekDays[0].date) + ' al ' + shortLabel(weekDays[6].date) : longLabel(selected) }}</strong>
        <span v-if="isToday" class="agenda__today">hoy</span>
      </p>
    </section>

    <p v-if="store.loading" class="agenda__state">Cargando citas…</p>

    <template v-else>
      <p v-if="store.error" class="form__error" role="alert">{{ store.error }}</p>
      <p v-if="success" class="form__info" role="status">{{ success }}</p>

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
                  {{ priceLabel(a.serviceSnapshot.price) }}
                </p>
                <p class="appt__phone">📞 {{ a.clientSnapshot.phone }}</p>
              </div>
              <div v-if="allowedTransitions(a.status).length" class="appt__actions">
                <button
                  v-for="next in allowedTransitions(a.status)"
                  :key="next"
                  class="btn btn--sm"
                  :class="next === 'cancelled' || next === 'no_show' ? 'btn--danger' : 'btn--primary'"
                  type="button"
                  :disabled="store.saving"
                  @click="act(a, next)"
                >
                  {{ STATUS_ACTIONS[next].icon }} {{ STATUS_ACTIONS[next].label }}
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

.appt__phone {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-top: var(--space-1);
}

.appt__actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
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
