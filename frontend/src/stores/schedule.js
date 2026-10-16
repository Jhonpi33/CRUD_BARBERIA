/*
  Store de horarios de atención (Fase 4).
  La fuente de verdad es MongoDB (/api/schedule/me); este store solo
  maneja el estado del formulario y de guardado de la interfaz.
*/
import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api'
import { friendlyAuthError } from './auth'

export const DAY_LABELS = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo',
}

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function emptyDay() {
  return { isWorkingDay: false, blocks: [], breaks: [] }
}

function cloneDays(source) {
  return Object.fromEntries(
    DAY_KEYS.map((key) => {
      const d = source?.[key] || emptyDay()
      return [
        key,
        {
          isWorkingDay: Boolean(d.isWorkingDay),
          blocks: (d.blocks || []).map((b) => ({ ...b })),
          breaks: (d.breaks || []).map((b) => ({ ...b })),
        },
      ]
    })
  )
}

export const useScheduleStore = defineStore('schedule', () => {
  const schedule = ref(null) // documento persistido (o null)
  const defaults = ref(null) // estructura inicial cuando no hay config
  const timezone = ref('America/Bogota')
  const days = ref(cloneDays(null)) // copia de trabajo del formulario
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('') // error general (red/servidor)
  const fieldErrors = ref([]) // [{ path, message }] devueltos por el backend
  const loaded = ref(false)
  const savedAt = ref(null)

  /** GET /api/schedule/me — sin configuración devuelve defaults (no crea datos). */
  async function fetchSchedule(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    error.value = ''
    try {
      const { data } = await api.get('/schedule/me')
      if (data.schedule) {
        schedule.value = data.schedule
        timezone.value = data.schedule.timezone
        days.value = cloneDays(data.schedule.days)
      } else {
        schedule.value = null
        timezone.value = data.defaults.timezone
        days.value = cloneDays(data.defaults.days)
        defaults.value = data.defaults
      }
      loaded.value = true
    } catch (err) {
      error.value = friendlyAuthError(err)
    } finally {
      loading.value = false
    }
  }

  /**
   * PUT /api/schedule/me — envía la semana completa.
   * Los errores del backend se guardan en fieldErrors para mostrarlos
   * junto al día correspondiente.
   */
  async function saveSchedule() {
    saving.value = true
    error.value = ''
    fieldErrors.value = []
    try {
      const { data } = await api.put('/schedule/me', {
        timezone: timezone.value,
        days: days.value,
      })
      schedule.value = data.schedule
      timezone.value = data.schedule.timezone
      days.value = cloneDays(data.schedule.days)
      savedAt.value = new Date()
      return data.schedule
    } catch (err) {
      const payload = err?.response?.data
      if (Array.isArray(payload?.errors)) {
        fieldErrors.value = payload.errors
        error.value = payload.message || 'La configuración no es válida'
      } else {
        error.value = friendlyAuthError(err)
      }
      throw err
    } finally {
      saving.value = false
    }
  }

  /** Errores de backend para un día concreto (o de la semana en general). */
  function errorsForDay(key) {
    return fieldErrors.value.filter((e) => e.path === `days.${key}`).map((e) => e.message)
  }

  function errorsForPath(path) {
    return fieldErrors.value.filter((e) => e.path === path).map((e) => e.message)
  }

  /** Reemplaza todos los días de trabajo por copias del día trabajado. */
  function resetFrom(sourceDays, sourceTimezone) {
    days.value = cloneDays(sourceDays)
    if (sourceTimezone) timezone.value = sourceTimezone
    error.value = ''
    fieldErrors.value = []
  }

  return {
    schedule,
    defaults,
    timezone,
    days,
    loading,
    saving,
    error,
    fieldErrors,
    loaded,
    savedAt,
    fetchSchedule,
    saveSchedule,
    errorsForDay,
    errorsForPath,
    resetFrom,
  }
})
