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
})
</script>

<template>
  <button :type="type" class="btn" :class="`btn--${variant}`" :disabled="disabled">
    <slot />
  </button>
</template>
