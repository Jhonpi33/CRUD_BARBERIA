/*
  Store de caja (sesión con apertura/cierre + movimientos).

  La caja trabaja con SESIONES: se abre con un fondo inicial, durante el día
  se registran ingresos/egresos y se cierra con un conteo manual (cuadre).
  El saldo esperado lo calcula SIEMPRE el backend (fondo + ingresos - egresos):
  aquí solo se refleja la respuesta del servidor.

  Reglas de seguridad que respeta este store (la autoridad es el backend):
  - Sin caja abierta no se pueden registrar movimientos (409).
  - Una cita solo puede cobrarse UNA VEZ (409 si se repite).
  - Los movimientos de sesiones cerradas son inmutables.
*/
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api'
import { friendlyAuthError } from './auth'

export const useCashStore = defineStore('cash', () => {
  const session = ref(null) // sesión abierta (o null)
  const movements = ref([])
  const totals = ref({ income: 0, expense: 0, count: 0, expected: 0 })
  const lastClosed = ref(null) // último cierre (para mostrar el cuadre)
  const history = ref([]) // sesiones del rango consultado (reporte)

  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const loaded = ref(false)

  /** Saldo que "debería haber" en caja según los registros. */
  const balance = computed(() => totals.value.expected)

  /**
   * GET /api/cash/current — caja abierta + movimientos + totales.
   */
  async function fetchCurrent(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    error.value = ''
    try {
      const { data } = await api.get('/cash/current')
      session.value = data.session
      movements.value = data.movements ?? []
      totals.value = data.totals ?? { income: 0, expense: 0, count: 0, expected: 0 }
      loaded.value = true
    } catch (err) {
      error.value = err?.response?.data?.message || friendlyAuthError(err)
    } finally {
      loading.value = false
    }
  }

  /**
   * POST /api/cash/open — abre la caja del día.
   * @param {{ openingBalance?: number, note?: string }} payload
   */
  async function openCash(payload = {}) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await api.post('/cash/open', payload)
      session.value = data.session
      lastClosed.value = null
      await fetchCurrent(true)
      return data.session
    } catch (err) {
      error.value = err?.response?.data?.message || friendlyAuthError(err)
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * POST /api/cash/close — cierra y cuadra la caja.
   * @param {{ closingBalance: number, note?: string }} payload
   */
  async function closeCash(payload) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await api.post('/cash/close', payload)
      lastClosed.value = data.session
      await fetchCurrent(true)
      return data.session
    } catch (err) {
      error.value = err?.response?.data?.message || friendlyAuthError(err)
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * POST /api/cash/movements — registra un ingreso o egreso en la caja abierta.
   * @param {{ type: 'income'|'expense', amount: number, concept: string, method?: string, appointmentId?: string }} payload
   */
  async function addMovement(payload) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await api.post('/cash/movements', payload)
      await fetchCurrent(true) // los totales los recalcula el servidor
      return data.movement
    } catch (err) {
      error.value = err?.response?.data?.message || friendlyAuthError(err)
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Cobro de una cita desde la Agenda (un solo clic).
   * Usa el precio del servicio copiado en la cita y lo vincula con
   * `appointmentId` para que el backend impida doble cobro.
   */
  async function chargeAppointment(appointment) {
    return addMovement({
      type: 'income',
      amount: appointment.serviceSnapshot.price,
      concept: `Cobro: ${appointment.serviceSnapshot.name} · ${appointment.clientSnapshot.name}`,
      method: 'cash',
      appointmentId: appointment._id,
    })
  }

  /** DELETE /api/cash/movements/:id — borra un registro mientras la caja esté abierta. */
  async function removeMovement(id) {
    saving.value = true
    error.value = ''
    try {
      await api.delete(`/cash/movements/${id}`)
      await fetchCurrent(true)
    } catch (err) {
      error.value = err?.response?.data?.message || friendlyAuthError(err)
      throw err
    } finally {
      saving.value = false
    }
  }

  /** GET /api/cash/history?from=&to= — sesiones y cuadres para el reporte (siempre consulta). */
  async function fetchHistory(params = {}) {
    loading.value = true
    error.value = ''
    try {
      const { data } = await api.get('/cash/history', { params })
      history.value = data.sessions ?? []
    } catch (err) {
      error.value = err?.response?.data?.message || friendlyAuthError(err)
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = ''
  }

  function $reset() {
    session.value = null
    movements.value = []
    totals.value = { income: 0, expense: 0, count: 0, expected: 0 }
    lastClosed.value = null
    history.value = []
    loading.value = false
    saving.value = false
    error.value = ''
    loaded.value = false
  }

  return {
    session,
    movements,
    totals,
    lastClosed,
    history,
    loading,
    saving,
    error,
    loaded,
    balance,
    fetchCurrent,
    openCash,
    closeCash,
    addMovement,
    chargeAppointment,
    removeMovement,
    fetchHistory,
    clearError,
    $reset,
  }
})
