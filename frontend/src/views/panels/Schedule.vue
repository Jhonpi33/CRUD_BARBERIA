<script setup>
import { computed, onMounted, defineAsyncComponent } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useScheduleStore, DAY_KEYS, DAY_LABELS } from '../../stores/schedule'
import { useToastsStore } from '../../stores/toasts'
import Button from '../../components/Button.vue'
import Icon from '../../components/Icon.vue'
import { es } from 'date-fns/locale'
import { dayjs } from '../../utils/datetime'

/* Calendario (@vuepic/vue-datepicker) cargado bajo demanda para no sumar
   ~230 kB al bundle inicial del home. */
const VueDatePicker = defineAsyncComponent(async () => {
  await import('@vuepic/vue-datepicker/dist/main.css')
  const mod = await import('@vuepic/vue-datepicker')
  return mod.VueDatePicker
})

const auth = useAuthStore()
const store = useScheduleStore()
const toast = useToastsStore()

const TIMEZONES = [
  'America/Bogota',
  'America/Mexico_City',
  'America/Argentina/Buenos_Aires',
  'America/Lima',
  'America/Santiago',
  'America/New_York',
  'Europe/Madrid',
]

const weekErrors = computed(() =>
  store.fieldErrors.filter((e) => !e.path || !e.path.startsWith('days.'))
)

onMounted(() => {
  store.fetchSchedule()
})

function day(key) {
  return store.days[key]
}

/** Activar/desactivar un día. Al desactivar se limpian bloques y descansos
 *  (el backend rechaza bloques en días no laborables). */
function toggleDay(key) {
  const d = day(key)
  d.isWorkingDay = !d.isWorkingDay
  if (d.isWorkingDay && d.blocks.length === 0) {
    d.blocks.push({ start: '09:00', end: '18:00' })
  }
  if (!d.isWorkingDay) {
    d.blocks = []
    d.breaks = []
  }
}

function addBlock(key) {
  day(key).blocks.push({ start: '09:00', end: '13:00' })
}

function removeBlock(key, index) {
  day(key).blocks.splice(index, 1)
}

function addBreak(key) {
  day(key).breaks.push({ start: '12:00', end: '12:30' })
}

function removeBreak(key, index) {
  day(key).breaks.splice(index, 1)
}

/**
 * El selector de hora (@vuepic/vue-datepicker) puede devolver 'HH:mm',
 * un Date u objeto { hours, minutes }: aquí se normaliza a 'HH:mm',
 * el formato que guardan y validan el backend y la agenda.
 */
function toTime(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 5)
  const h = value instanceof Date ? value.getHours() : Number(value.hours)
  const m = value instanceof Date ? value.getMinutes() : Number(value.minutes)
  if (Number.isNaN(h) || Number.isNaN(m)) return ''
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Escribe la hora elegida en el bloque/descanso correspondiente. */
function setTime(target, key, value) {
  const time = toTime(value)
  if (time) target[key] = time
}

async function onSave() {
  try {
    await store.saveSchedule()
    const hora = store.savedAt ? dayjs(store.savedAt).format('HH:mm') : ''
    toast.success('Horario guardado', hora ? `Guardado a las ${hora}.` : '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch {
    /* los errores quedan en store.error y store.fieldErrors */
    toast.error('No se pudo guardar el horario', store.error)
  }
}
</script>

<template>
  <div class="schedule">
    <header class="schedule__header">
      <div>
        <h1 class="schedule__title">Horarios de atención</h1>
        <p class="schedule__lead">
          Define tus días y bloques laborales. Los descansos van dentro de un bloque
          (ej. comida de 12:00 a 13:00). Los días desactivados no ofrecerán citas.
        </p>
      </div>
      <RouterLink class="btn btn--secondary btn--sm" :to="auth.panelPath">
        <Icon name="arrow-left" :size="16" /> Volver al panel
      </RouterLink>
    </header>

    <p v-if="store.loading" class="schedule__state">Cargando horario…</p>

    <template v-else>
      <p v-if="store.error" class="form__error" role="alert">{{ store.error }}</p>
      <ul v-if="weekErrors.length" class="schedule__errors" role="alert">
        <li v-for="(e, i) in weekErrors" :key="i">{{ e.message }}</li>
      </ul>

      <!-- Zona horaria -->
      <section class="schedule__card">
        <h2 class="schedule__subtitle"><Icon name="globe" :size="17" /> Zona horaria</h2>
        <label class="form__field">
          <span class="form__label">Las horas se interpretan en esta zona</span>
          <input v-model="store.timezone" class="form__input" list="tz-list" placeholder="America/Bogota" />
          <datalist id="tz-list">
            <option v-for="tz in TIMEZONES" :key="tz" :value="tz"></option>
          </datalist>
          <span v-for="(m, i) in store.errorsForPath('timezone')" :key="i" class="form__error">{{ m }}</span>
        </label>
      </section>

      <!-- Días -->
      <section v-for="key in DAY_KEYS" :key="key" class="schedule__card">
        <header class="schedule__day">
          <label class="schedule__day-toggle">
            <input type="checkbox" :checked="day(key).isWorkingDay" @change="toggleDay(key)" />
            <span class="schedule__day-name">{{ DAY_LABELS[key] }}</span>
          </label>
          <span class="badge" :class="day(key).isWorkingDay ? 'badge--on' : 'badge--off'">
            {{ day(key).isWorkingDay ? 'Día laborable' : 'Descanso' }}
          </span>
        </header>

        <template v-if="day(key).isWorkingDay">
          <!-- Bloques -->
          <div class="schedule__block">
            <p class="schedule__block-title">Bloques laborales</p>
            <div v-for="(block, i) in day(key).blocks" :key="i" class="schedule__interval">
              <VueDatePicker
                class="schedule__time"
                :model-value="block.start"
                time-picker
                model-type="HH:mm"
                :locale="es"
                :time-config="{ is24: true, minutesIncrement: 5 }"
                :input-attrs="{ clearable: false }"
                aria-label="Inicio del bloque"
                @update:model-value="setTime(block, 'start', $event)"
              />
              <span class="schedule__dash">–</span>
              <VueDatePicker
                class="schedule__time"
                :model-value="block.end"
                time-picker
                model-type="HH:mm"
                :locale="es"
                :time-config="{ is24: true, minutesIncrement: 5 }"
                :input-attrs="{ clearable: false }"
                aria-label="Fin del bloque"
                @update:model-value="setTime(block, 'end', $event)"
              />
              <button
                class="btn btn--danger btn--sm"
                type="button"
                :disabled="day(key).blocks.length === 1"
                :title="day(key).blocks.length === 1 ? 'Debe quedar al menos un bloque' : 'Quitar bloque'"
                @click="removeBlock(key, i)"
              >
                <Icon name="x" :size="15" />
              </button>
            </div>
            <button class="btn btn--secondary btn--sm" type="button" @click="addBlock(key)">
              + Añadir bloque (jornada partida)
            </button>
          </div>

          <!-- Descansos -->
          <div class="schedule__block">
            <p class="schedule__block-title">Descansos / pausas</p>
            <p v-if="day(key).breaks.length === 0" class="schedule__hint">
              Sin descansos. Añade uno dentro de un bloque (ej. comida).
            </p>
            <div v-for="(brk, i) in day(key).breaks" :key="i" class="schedule__interval">
              <VueDatePicker
                class="schedule__time"
                :model-value="brk.start"
                time-picker
                model-type="HH:mm"
                :locale="es"
                :time-config="{ is24: true, minutesIncrement: 5 }"
                :input-attrs="{ clearable: false }"
                aria-label="Inicio del descanso"
                @update:model-value="setTime(brk, 'start', $event)"
              />
              <span class="schedule__dash">–</span>
              <VueDatePicker
                class="schedule__time"
                :model-value="brk.end"
                time-picker
                model-type="HH:mm"
                :locale="es"
                :time-config="{ is24: true, minutesIncrement: 5 }"
                :input-attrs="{ clearable: false }"
                aria-label="Fin del descanso"
                @update:model-value="setTime(brk, 'end', $event)"
              />
              <button class="btn btn--danger btn--sm" type="button" @click="removeBreak(key, i)"><Icon name="x" :size="15" /></button>
            </div>
            <button class="btn btn--secondary btn--sm" type="button" @click="addBreak(key)">
              + Añadir descanso
            </button>
          </div>
        </template>

        <!-- Errores del backend para este día -->
        <ul v-if="store.errorsForDay(key).length" class="schedule__errors" role="alert">
          <li v-for="(m, i) in store.errorsForDay(key)" :key="i">{{ m }}</li>
        </ul>
      </section>

      <!-- Guardar -->
      <div class="schedule__footer">
        <Button variant="primary" :disabled="store.saving" @click="onSave">
          {{ store.saving ? 'Guardando…' : 'Guardar horario' }}
        </Button>
        <p class="schedule__hint">
          Se guarda en tu cuenta: al recargar la página verás lo último guardado.
        </p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.schedule__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-bottom: var(--space-5);
}

.schedule__title {
  font-size: clamp(1.3rem, 4vw, 1.8rem);
  margin-bottom: var(--space-2);
}

.schedule__lead {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  max-width: 620px;
}

.schedule__state {
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--space-6) 0;
}

.schedule__card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  margin-bottom: var(--space-4);
}

.schedule__subtitle {
  font-size: var(--font-size-md);
  margin-bottom: var(--space-4);
}

.schedule__day {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.schedule__day-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
}

.schedule__day-toggle input {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
}

.schedule__day-name {
  font-weight: 600;
}

.schedule__block {
  margin-bottom: var(--space-4);
}

.schedule__block-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  margin-bottom: var(--space-2);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.schedule__interval {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}

.schedule__interval .form__input {
  max-width: 150px;
}

.schedule__dash {
  color: var(--color-text-muted);
}

/* Selector de hora (@vuepic/vue-datepicker), tematizado con los tokens */
.schedule__time {
  width: 172px;
  --dp-font-family: var(--font-body);
  --dp-font-size: var(--font-size-sm);
  --dp-border-radius: var(--radius-md);
  --dp-border-color: var(--color-border);
  --dp-input-height: 40px;
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

.schedule__hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-bottom: var(--space-3);
}

.schedule__errors {
  list-style: disc;
  margin-top: var(--space-3);
  padding-left: 20px;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

.schedule__footer {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-top: var(--space-5);
}

.badge {
  font-size: var(--font-size-xs);
  font-weight: 700;
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  white-space: nowrap;
}

.badge--on {
  color: var(--color-accent);
  background: var(--success-soft);
  border: 1px solid var(--success-border);
}

.badge--off {
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
}

@media (max-width: 560px) {
  .schedule__interval .form__input {
    max-width: none;
    flex: 1;
  }

  .schedule__time {
    width: 100%;
  }
}
</style>
