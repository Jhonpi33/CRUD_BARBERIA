import api from './api.js'

export function isConnectionError(error) {
  return ['ECONNABORTED', 'ETIMEDOUT', 'ERR_NETWORK'].includes(error?.code) ||
    [502, 503, 504].includes(error?.response?.status)
}

/** Solo las consultas de lectura se pueden repetir sin crear otra reserva. */
export async function getBookingData(url, { signal, params, onWaiting = () => {} } = {}) {
  const deadline = Date.now() + 90000
  while (true) {
    try {
      return await api.get(url, {
        signal,
        params,
        timeout: Math.min(20000, Math.max(1, deadline - Date.now())),
      })
    } catch (error) {
      if (signal?.aborted || !isConnectionError(error) || Date.now() + 2000 >= deadline) {
        throw error
      }
      onWaiting()
      await new Promise(resolve => {
        const finish = () => {
          clearTimeout(timer)
          signal?.removeEventListener('abort', finish)
          resolve()
        }
        const timer = setTimeout(finish, 2000)
        signal?.addEventListener('abort', finish, { once: true })
        if (signal?.aborted) finish()
      })
      if (signal?.aborted) throw new Error('Consulta cancelada')
    }
  }
}
