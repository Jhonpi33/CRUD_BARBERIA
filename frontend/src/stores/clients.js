/*
  Store de clientes (módulo del panel).

  Los clientes se crean SOLOS cuando alguien reserva desde la página pública
  (el backend los deduplica por teléfono). Aquí se lee ese dato: lista con
  búsqueda y ficha con historial de citas.

  Única escritura del panel: las NOTAS privadas de la ficha técnica
  (preferencias de corte, piel sensible…). El alta de clientes no se hace
  a mano (nacen con cada reserva). La autorización real vive en el backend,
  que siempre filtra por el _id del token.
*/
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api'
import { friendlyAuthError } from './auth'

export const useClientsStore = defineStore('clients', () => {
  const list = ref([])
  const loading = ref(false)
  const error = ref('')
  const loaded = ref(false)

  // Búsqueda por teléfono que se aplica en el cliente sobre lo ya cargado
  // (el backend también acepta ?phone= para buscar fuera de la página).
  const query = ref('')

  /** Total mostrado hoy: se recalcula con lo que llega del servidor. */
  const total = ref(0)

  const filtered = computed(() => {
    const q = query.value.trim().toLowerCase()
    if (!q) return list.value
    return list.value.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.phoneNormalized?.includes(q.replace(/\D+/g, ''))
    )
  })

  /** GET /api/clients — lista de los clientes del dueño autenticado. */
  async function fetchClients(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    error.value = ''
    try {
      const { data } = await api.get('/clients')
      list.value = data.clients ?? []
      total.value = list.value.length
      loaded.value = true
    } catch (err) {
      error.value = friendlyAuthError(err)
    } finally {
      loading.value = false
    }
  }

  /**
   * GET /api/clients/:id — ficha + historial de citas.
   * Se devuelve sin guardar en el store: la ficha vive en la vista.
   */
  async function fetchClient(id) {
    loading.value = true
    error.value = ''
    try {
      const { data } = await api.get(`/clients/${id}`)
      return data
    } catch (err) {
      error.value = err?.response?.data?.message || friendlyAuthError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * PATCH /api/clients/:id/notes — guarda la ficha técnica privada.
   * Devuelve el cliente actualizado para que la vista pinte el nuevo valor.
   */
  async function updateNotes(id, notes) {
    error.value = ''
    try {
      const { data } = await api.patch(`/clients/${id}/notes`, { notes })
      return data.client
    } catch (err) {
      error.value = err?.response?.data?.message || friendlyAuthError(err)
      throw err
    }
  }

  function setQuery(value) {
    query.value = value
  }

  function clearError() {
    error.value = ''
  }

  function $reset() {
    list.value = []
    query.value = ''
    total.value = 0
    loaded.value = false
    loading.value = false
    error.value = ''
  }

  return {
    list,
    loading,
    error,
    loaded,
    query,
    total,
    filtered,
    fetchClients,
    fetchClient,
    updateNotes,
    setQuery,
    clearError,
    $reset,
  }
})
