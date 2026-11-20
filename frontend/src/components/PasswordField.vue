<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    required: true,
  },
  autocomplete: {
    type: String,
    default: 'current-password',
  },
  placeholder: {
    type: String,
    default: '••••••••',
  },
  minlength: {
    type: [Number, String],
    default: undefined,
  },
})

const emit = defineEmits(['update:modelValue'])

const show = ref(false)

const type = computed(() => (show.value ? 'text' : 'password'))
const toggleLabel = computed(() => (show.value ? 'Ocultar contraseña' : 'Mostrar contraseña'))

function onInput(event) {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <span class="input-wrap">
    <input
      class="form__input"
      :type="type"
      :name="name"
      :value="props.modelValue"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      :minlength="minlength"
      required
      @input="onInput"
    />
    <button
      class="input-toggle"
      type="button"
      :aria-label="toggleLabel"
      @click="show = !show"
    >
      <svg
        v-if="!show"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <svg
        v-else
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path
          d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
        />
        <path d="M1 1l22 22" />
      </svg>
    </button>
  </span>
</template>
