/*
  Store de citas/agenda (Fase 5).
  Los datos viven en MongoDB vía /api/appointments; aquí solo hay caché
  reactiva por rango de fechas y estados de carga/error de la interfaz.
  La máquina de transiciones se valida SIEMPRE en el backend: este store
  solo propone el cambio y refleja la respuesta.
*/
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api'
import { friendlyAuthError } from './auth'

/** Etiquetas en español (espejo de appointmentStatus.js del backend). */
export const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'Inasistencia',
}

/** Transiciones válidas (espejo del backend; la autoridad es el backend). */
const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
}

/** Acciones mostradas por transición, con su etiqueta e icono. */
export const STATUS_ACTIONS = {
  confirmed: { label: 'Confirmar', icon: '✓' },
  completed: { label: 'Completar', icon: '✅' },
  cancelled: { label: 'Cancelar', icon: '✕' },
  no_show: { label: 'Inasistencia', icon: '⚠' },
}

export function allowedTransitions(status) {
  return VALID_TRANSITIONS[status] || []
}

export const useAppointmentsStore = defineStore('appointments', () => {
  const appointments = ref([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const loadedFrom = ref(null)
  const loadedTo = ref(null)

  /** Citas agrupadas por fecha de calendario (YYYY-MM-DD). */
  const byDate = computed(() => {
    const map = {}
    for (const a of appointments.value) {
      ;(map[a.date] ||= []).push(a)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((x, y) => x.startMinutes - y.startMinutes)
    }
    return map
  })

  /** GET /api/appointments?from=&to= — citas del dueño autenticado. */
  async function fetchRange(fromDate, toDate = fromDate, force = false) {
    if (!force && loadedFrom.value === fromDate && loadedTo.value === toDate) return
    loading.value = true
    error.value = ''
    try {
      const { data } = await api.get('/appointments', {
        params: { from: fromDate, to: toDate },
      })
      appointments.value = data.appointments
      loadedFrom.value = data.from
      loadedTo.value = data.to
    } catch (err) {
      error.value = friendlyAuthError(err)
    } finally {
      loading.value = false
    }
  }

  /**
   * PATCH /api/appointments/:id/status — propone el cambio de estado.
   * Si el backend rechaza la transición (409), se propaga el error con su
   * mensaje: la máquina de estados vive en el servidor.
   */
  async function changeStatus(id, status) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await api.patch(`/appointments/${id}/status`, { status })
      const i = appointments.value.findIndex((a) => a._id === id)
      if (i !== -1) appointments.value[i] = data.appointment
      return data.appointment
    } catch (err) {
      error.value =
        err?.response?.data?.message || friendlyAuthError(err)
      throw err
    } finally {
      saving.value = false
    }
  }

  function clearError() {
    error.value = ''
  }

  return {
    appointments,
    loading,
    saving,
    error,
    byDate,
    fetchRange,
    changeStatus,
    clearError,
  }
})
