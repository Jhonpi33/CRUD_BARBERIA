<script setup>
/*
  Diálogo modal centrado (reemplaza los confirm del navegador).

  Se teletransporta a <body> para que ningún contenedor con overflow lo recorte,
  bloquea el scroll de la página mientras está abierto y devuelve el foco al
  elemento que lo abrió. Escape y el clic en el fondo cierran.

  Accesibilidad: role="dialog" + aria-modal, título ligado con aria-labelledby,
  foco atrapado dentro del cuadro y botón de cerrar con aria-label.
*/
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  /** Nombre de icono de Icon.vue; vacío para no mostrar ninguno. */
  icon: { type: String, default: '' },
  /** Tono del icono/borde: default | danger | warning | success. */
  tone: { type: String, default: 'default' },
})

const emit = defineEmits(['close'])

const box = ref(null)
const titleId = `modal-title-${Math.random().toString(36).slice(2, 9)}`
let lastFocus = null

function focusables() {
  if (!box.value) return []
  return [...box.value.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter((el) => el.offsetParent !== null)
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
    return
  }
  if (e.key !== 'Tab') return

  const nodes = focusables()
  if (!nodes.length) return
  const first = nodes[0]
  const last = nodes[nodes.length - 1]

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      lastFocus = document.activeElement
      document.body.style.overflow = 'hidden'
      await nextTick()
      focusables()[0]?.focus()
    } else {
      document.body.style.overflow = ''
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus()
      lastFocus = null
    }
  }
)

onMounted(() => {
  if (props.open) document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal">
        <div class="modal__backdrop" @click="emit('close')" />

        <div
          ref="box"
          class="modal__box"
          :class="`modal__box--${tone}`"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          @keydown="onKeydown"
        >
          <header class="modal__head">
            <span v-if="icon" class="modal__icon">
              <Icon :name="icon" :size="20" />
            </span>
            <h2 :id="titleId" class="modal__title">{{ title }}</h2>
            <button class="modal__close" type="button" aria-label="Cerrar" @click="emit('close')">
              <Icon name="x" :size="18" />
            </button>
          </header>

          <div class="modal__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="modal__foot">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: 130;
  display: grid;
  place-items: center;
  padding: var(--space-4);
}

.modal__backdrop {
  position: absolute;
  inset: 0;
  background: var(--overlay);
}

.modal__box {
  position: relative;
  width: min(440px, 100%);
  max-height: calc(100vh - 32px);
  overflow: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-5);
}

.modal__box--danger {
  border-top: 4px solid var(--danger);
}

.modal__box--warning {
  border-top: 4px solid var(--warning);
}

.modal__box--success {
  border-top: 4px solid var(--success);
}

.modal__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.modal__icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  color: var(--accent);
  background: var(--accent-soft);
}

.modal__box--danger .modal__icon {
  color: var(--danger);
  background: var(--danger-soft);
}

.modal__box--warning .modal__icon {
  color: var(--warning);
  background: var(--warning-soft);
}

.modal__box--success .modal__icon {
  color: var(--success);
  background: var(--success-soft);
}

.modal__title {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-md);
  font-family: var(--font-display);
}

.modal__close {
  flex: none;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: var(--text-faint);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--motion-fast) ease, color var(--motion-fast) ease;
}

.modal__close:hover {
  background: var(--surface-2);
  color: var(--text);
}

.modal__close:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.modal__body {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-5);
}

/* --- Animación (se desactiva con prefers-reduced-motion en base.css) --- */
.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--motion) ease;
}

.modal-enter-active .modal__box,
.modal-leave-active .modal__box {
  transition: transform var(--motion) ease, opacity var(--motion) ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal__box,
.modal-leave-to .modal__box {
  transform: translateY(12px) scale(0.98);
  opacity: 0;
}

@media (max-width: 480px) {
  .modal__foot {
    flex-direction: column-reverse;
  }

  .modal__foot :deep(.btn) {
    width: 100%;
  }
}
</style>
