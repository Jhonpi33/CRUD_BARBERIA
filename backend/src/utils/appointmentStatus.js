/*
  Estados y transiciones de las citas (Fase 5).
  Función PURA, sin MongoDB: centraliza qué transiciones son válidas para
  que ni el frontend ni el backend improvisen estados.
*/

/** Estados posibles de una cita. */
export const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']

/** Etiquetas en español para la interfaz. */
export const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'Inasistencia',
}

/** Colores/acentos por estado (para la interfaz). */
export const STATUS_ACCENTS = {
  pending: 'warning',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'muted',
  no_show: 'danger',
}

/**
 * Transiciones válidas. Las terminales (completed, cancelled, no_show)
 * no permiten salir: una cita final no se reabre.
 *
 * Flujo previsto:
 *   pending  --confirmar--> confirmed
 *   pending  --cancelar---> cancelled
 *   confirmed --completar-> completed
 *   confirmed --no_show---> no_show
 *   confirmed --cancelar--> cancelled
 */
export const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
}

/** Errores de dominio con código para traducirlos a HTTP. */
export class AppointmentError extends Error {
  constructor(message, code = 'APPOINTMENT_ERROR', status = 422) {
    super(message)
    this.name = 'AppointmentError'
    this.code = code
    this.status = status
  }
}

/** ¿La transición `from -> to` está permitida? */
export function canTransition(from, to) {
  if (!APPOINTMENT_STATUSES.includes(from)) return false
  if (!APPOINTMENT_STATUSES.includes(to)) return false
  return VALID_TRANSITIONS[from].includes(to)
}

/**
 * Aplica una transición a una cita y devuelve el siguiente estado.
 * @param {object} appointment  cita actual (tiene `status`)
 * @param {string} next         estado destino
 * @returns {{ status: string, changedAt: Date }}
 * @throws {AppointmentError} si la transición no está permitida.
 */
export function transition(appointment, next) {
  const from = appointment?.status
  if (!APPOINTMENT_STATUSES.includes(next)) {
    throw new AppointmentError(`Estado desconocido: ${next}`, 'INVALID_STATUS', 422)
  }
  if (from === next) {
    // Idempotente: repetir la misma acción no es un error.
    return { status: from, changedAt: appointment.updatedAt || new Date() }
  }
  if (!canTransition(from, next)) {
    const allowed = VALID_TRANSITIONS[from]?.length
      ? VALID_TRANSITIONS[from].join(', ')
      : 'ninguna (la cita ya está cerrada)'
    throw new AppointmentError(
      `No se puede pasar de "${STATUS_LABELS[from] || from}" a "${STATUS_LABELS[next]}". ` +
        `Transiciones permitidas desde "${STATUS_LABELS[from] || from}": ${allowed}.`,
      'INVALID_TRANSITION',
      409
    )
  }
  return { status: next, changedAt: new Date() }
}

/** Estados que ocupan un intervalo (bloquean el slot). */
export const BLOCKING_STATUSES = ['pending', 'confirmed']
