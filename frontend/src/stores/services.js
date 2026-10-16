/*
  Store de servicios (Fase 4).
  Los datos viven en MongoDB vía /api/services; aquí solo hay caché
  reactiva del listado y estados de carga/error de la interfaz.
*/
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api'
import { friendlyAuthError } from './auth'

export const useServicesStore = defineStore('services', () => {
  const services = ref([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const loaded = ref(false)

  const activeServices = computed(() => services.value.filter((s) => s.isActive))
  const inactiveServices = computed(() => services.value.filter((s) => !s.isActive))

  /** GET /api/services — incluye inactivos (para administrarlos). */
  async function fetchServices(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    error.value = ''
    try {
      const { data } = await api.get('/services')
      services.value = data.services
      loaded.value = true
    } catch (err) {
      error.value = friendlyAuthError(err)
    } finally {
      loading.value = false
    }
  }

  /** POST /api/services */
  async function createService(payload) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await api.post('/services', payload)
      services.value = [data.service, ...services.value]
      return data.service
    } catch (err) {
      error.value = friendlyAuthError(err)
      throw err
    } finally {
      saving.value = false
    }
  }

  /** PUT /api/services/:id */
  async function updateService(id, payload) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await api.put(`/services/${id}`, payload)
      const i = services.value.findIndex((s) => s._id === id)
      if (i !== -1) services.value[i] = data.service
      return data.service
    } catch (err) {
      error.value = friendlyAuthError(err)
      throw err
    } finally {
      saving.value = false
    }
  }

  /** PATCH /api/services/:id/status */
  async function toggleStatus(id, isActive) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await api.patch(`/services/${id}/status`, { isActive })
      const i = services.value.findIndex((s) => s._id === id)
      if (i !== -1) services.value[i] = data.service
      return data.service
    } catch (err) {
      error.value = friendlyAuthError(err)
      throw err
    } finally {
      saving.value = false
    }
  }

  /** DELETE /api/services/:id (la interfaz prefiere desactivar) */
  async function removeService(id) {
    saving.value = true
    error.value = ''
    try {
      await api.delete(`/services/${id}`)
      services.value = services.value.filter((s) => s._id !== id)
    } catch (err) {
      error.value = friendlyAuthError(err)
      throw err
    } finally {
      saving.value = false
    }
  }

  function clearError() {
    error.value = ''
  }

  return {
    services,
    loading,
    saving,
    error,
    loaded,
    activeServices,
    inactiveServices,
    fetchServices,
    createService,
    updateService,
    toggleStatus,
    removeService,
    clearError,
  }
})
