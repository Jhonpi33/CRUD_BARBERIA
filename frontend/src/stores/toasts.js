/*
  Sistema de alertas flotantes (toasts) — propio, sin dependencias.

  Notificación breve que aparece en una esquina y desaparece sola: se usa
  para confirmar una acción ("Servicio creado") o avisar un error ("Ese
  horario ya fue reservado"). No guarda datos de la app: solo la lista
  visible de avisos y sus temporizadores.

  Los colores/íconos viven en el componente; aquí únicamente se gestiona
  el ciclo de vida. Cada aviso lleva un id propio para poder cerrarlo a mano.
*/
import { ref } from 'vue'
import { defineStore } from 'pinia'

/** Duración por defecto (ms). Los errores se quedan más, para que dé tiempo a leerlos. */
const DEFAULT_MS = 4000
const ERROR_MS = 7000

/** Tope de avisos visibles a la vez: evita apilar uno por cada fila de una lista. */
const MAX_VISIBLE = 4

let seq = 0

export const useToastsStore = defineStore('toasts', () => {
  const items = ref([])

  /**
   * Crea un aviso. Si ya hay demasiados, se descarta el más antiguo.
   * @param {object} opts
   * @param {string} opts.type  'success' | 'error' | 'info' | 'warning'
   * @param {string} opts.title Título corto (obligatorio)
   * @param {string} [opts.message] Detalle opcional
   * @param {number} [opts.timeout] ms antes de cerrarse (0 = no se cierra sola)
   */
  function show({ type = 'info', title, message = '', timeout } = {}) {
    if (!title) return null

    const id = ++seq
    const duration =
      typeof timeout === 'number' ? timeout : type === 'error' ? ERROR_MS : DEFAULT_MS

    const toast = { id, type, title, message, closing: false }
    items.value.push(toast)

    // Deja solo los N más recientes.
    if (items.value.length > MAX_VISIBLE) {
      items.value.splice(0, items.value.length - MAX_VISIBLE)
    }

    if (duration > 0) {
      // Primero se espera la vida útil COMPLETA del aviso; recién al final se
      // marca `closing` para animar la salida y se quita de la lista. Marcarlo
      // antes haría que el aviso naciera ya "cerrándose".
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }

  /** Atajo: aviso de éxito. */
  function success(title, message) {
    return show({ type: 'success', title, message })
  }

  /** Atajo: aviso de error. */
  function error(title, message) {
    return show({ type: 'error', title, message })
  }

  /** Atajo: aviso informativo. */
  function info(title, message) {
    return show({ type: 'info', title, message })
  }

  /** Atajo: aviso de advertencia. */
  function warning(title, message) {
    return show({ type: 'warning', title, message })
  }

  /**
   * Cierra un aviso. Primero marca `closing` para que el CSS pueda animar la
   * salida; recién después lo saca de la lista.
   */
  function dismiss(id, delay = 220) {
    const t = items.value.find((x) => x.id === id)
    if (!t) return
    t.closing = true
    setTimeout(() => {
      items.value = items.value.filter((x) => x.id !== id)
    }, delay)
  }

  /** Cierra todo (al cerrar sesión, para que no queden avisos de otro usuario). */
  function clear() {
    items.value = []
  }

  return { items, show, success, error, info, warning, dismiss, clear }
})
