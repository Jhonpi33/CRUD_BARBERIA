<script setup>
import { ref } from 'vue'

defineProps({
  question: {
    type: String,
    required: true,
  },
})

const open = ref(false)
</script>

<template>
  <div class="faq-item" :class="{ 'faq-item--open': open }">
    <button
      class="faq-item__question"
      type="button"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span>{{ question }}</span>
      <span class="faq-item__icon" aria-hidden="true">{{ open ? '−' : '+' }}</span>
    </button>

    <div v-show="open" class="faq-item__answer">
      <slot />
    </div>
  </div>
</template>
