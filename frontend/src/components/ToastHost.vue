<script setup>
/*
  Host de alertas flotantes: se monta UNA vez en App.vue y pinta lo que el
  store de toasts tenga en cola. No toca el layout: queda fijo en pantalla.

  Accesibilidad: cada aviso es `role="status"` (errores `role="alert"`) para
  que el lector de pantalla lo anuncie, y el botón de cerrar tiene
  `aria-label`. La animación respeta prefers-reduced-motion (base.css).
*/
import { useToastsStore } from '../stores/toasts'

const toasts = useToastsStore()

/** Ícono por tipo (SVG inline, sin librerías). */
const ICONS = {
  success: 'M20 6 9 17l-5-5',
  error: 'M18 6 6 18M6 6l12 12',
  warning: 'M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
  info: 'M12 16v-4M12 8h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
}

function label(type) {
  return { success: 'Éxito', error: 'Error', warning: 'Aviso', info: 'Información' }[type] || type
}
</script>

<template>
  <div class="toasts" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts.items"
        :key="t.id"
        class="toast"
        :class="[`toast--${t.type}`, { 'toast--closing': t.closing }]"
        :role="t.type === 'error' ? 'alert' : 'status'"
      >
        <span class="toast__icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path :d="ICONS[t.type] || ICONS.info" />
          </svg>
        </span>

        <span class="toast__body">
          <strong class="toast__title">
            <span class="visually-hidden">{{ label(t.type) }}: </span>{{ t.title }}
          </strong>
          <span v-if="t.message" class="toast__message">{{ t.message }}</span>
        </span>

        <button
          class="toast__close"
          type="button"
          aria-label="Cerrar aviso"
          @click="toasts.dismiss(t.id, 0)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  z-index: 100;
  right: var(--space-4);
  bottom: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: min(360px, calc(100vw - var(--space-6)));
  /* Deja ver el bottom-nav del panel en móvil */
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-left-width: 4px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  font-size: var(--font-size-sm);
}

.toast--success { border-left-color: var(--success); }
.toast--error   { border-left-color: var(--danger); }
.toast--warning { border-left-color: var(--warning); }
.toast--info    { border-left-color: var(--info); }

.toast__icon {
  flex: none;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
}

.toast__icon svg { width: 18px; height: 18px; }

.toast--success .toast__icon { color: var(--success); }
.toast--error   .toast__icon { color: var(--danger); }
.toast--warning .toast__icon { color: var(--warning); }
.toast--info    .toast__icon { color: var(--info); }

.toast__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toast__title {
  font-weight: 600;
  color: var(--text);
}

.toast__message {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  line-height: 1.45;
}

.toast__close {
  flex: none;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: var(--text-faint);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--motion-fast) ease, color var(--motion-fast) ease;
}

.toast__close:hover {
  background: var(--surface-2);
  color: var(--text);
}

.toast__close:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.toast__close svg { width: 16px; height: 16px; }

/* --- Animación de entrada/salida --- */
.toast-enter-active,
.toast-leave-active {
  transition: opacity var(--motion) ease, transform var(--motion) ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

.toast-leave-active {
  position: absolute;
  right: 0;
  width: 100%;
}

/* En móvil sube un poco para no tapar el bottom-nav */
@media (max-width: 900px) {
  .toasts {
    bottom: 84px;
  }
}
</style>
