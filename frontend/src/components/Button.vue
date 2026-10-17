<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary', // primary | secondary | danger
  },
  type: {
    type: String,
    default: 'button',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="[{ 'is-loading': loading }, `btn--${variant}`]"
    :disabled="disabled || loading"
    :aria-busy="loading ? 'true' : undefined"
  >
    <slot />
  </button>
</template>
