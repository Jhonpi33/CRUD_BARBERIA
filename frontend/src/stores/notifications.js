/*
  Store de notificaciones del panel (Fase 6.3).

  Las notificaciones viven en MongoDB vía /api/notifications; aquí solo hay
  caché reactiva (lista + contador de no leídas) y estados de carga/error.
  El servidor es la única autoridad: cada acción vuelve a leer la respuesta
  real en lugar de asumir el resultado.
*/
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api'
import { friendlyAuthError } from './auth'

/** Etiquetas de tipo (espejo del backend). */
export const TYPE_LABELS = {
  booking_created: 'Reserva',
}

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref([])
  const unreadCount = ref(0)
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')

  const hasUnread = computed(() => unreadCount.value > 0)

  /** Trae la lista (por defecto las más recientes) y actualiza el contador. */
  async function fetch({ limit = 20, page = 1 } = {}) {
    loading.value = true
    error.value = ''
    try {
      const { data } = await api.get('/notifications', { params: { limit, page } })
      items.value = data.notifications ?? []
      total.value = data.total ?? items.value.length
      // El contador viene del servidor: no lo calculamos en el cliente.
      unreadCount.value = data.unreadCount ?? 0
    } catch (err) {
      error.value = friendlyAuthError(err)
    } finally {
      loading.value = false
    }
  }

  /** Solo el contador de no leídas (barato; para la campana). */
  async function fetchUnreadCount() {
    try {
      const { data } = await api.get('/notifications/unread-count')
      unreadCount.value = data.count ?? 0
    } catch (err) {
      // Silencioso: la campana no debe romper la interfaz.
      console.warn('[notificaciones] no se pudo leer el contador:', err?.message)
    }
  }

  /** Marca UNA como leída y refleja la respuesta del servidor. */
  async function markRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`)
      const n = items.value.find((x) => x._id === id)
      if (n && !n.readAt) {
        n.readAt = new Date().toISOString()
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    } catch (err) {
      error.value = friendlyAuthError(err)
    }
  }

  /** Marca TODAS como leídas usando el contador real que devuelve el server. */
  async function markAllRead() {
    try {
      const { data } = await api.patch('/notifications/read-all')
      for (const n of items.value) {
        if (!n.readAt) n.readAt = new Date().toISOString()
      }
      // El server devuelve cuántas marcó; el contador baja a 0.
      if (typeof data?.modified === 'number') {
        unreadCount.value = Math.max(0, unreadCount.value - data.modified)
      } else {
        unreadCount.value = 0
      }
    } catch (err) {
      error.value = friendlyAuthError(err)
    }
  }

  function $reset() {
    items.value = []
    unreadCount.value = 0
    total.value = 0
    loading.value = false
    error.value = ''
  }

  return {
    items,
    unreadCount,
    total,
    loading,
    error,
    hasUnread,
    fetch,
    fetchUnreadCount,
    markRead,
    markAllRead,
    $reset,
  }
})
