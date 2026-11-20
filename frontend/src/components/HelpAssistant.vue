<script setup>
import { computed, nextTick, ref } from 'vue'
import api from '../services/api'
import Icon from './Icon.vue'

const props = defineProps({ compact: { type: Boolean, default: false } })
const promptIdeas = [
  '¿Qué hago después de registrarme?',
  '¿Cómo completo mi perfil de barbero?',
  '¿Cómo configuro servicios y horarios?',
]
const messages = ref([
  { role: 'model', text: 'Hola. Te puedo orientar con el registro, tu perfil y el uso de Elysia. ¿Qué necesitas hacer?' },
])
const input = ref('')
const sending = ref(false)
const error = ref('')
const conversationEl = ref(null)
const canSend = computed(() => input.value.trim().length > 0 && !sending.value)

async function scrollToEnd() {
  await nextTick()
  if (conversationEl.value) conversationEl.value.scrollTop = conversationEl.value.scrollHeight
}

async function send(suggestedText = '') {
  const message = (suggestedText || input.value).trim()
  if (!message || sending.value) return
  const history = messages.value.slice(-8).map(({ role, text }) => ({ role, text }))
  messages.value.push({ role: 'user', text: message })
  input.value = ''
  error.value = ''
  sending.value = true
  await scrollToEnd()
  try {
    const { data } = await api.post('/assistant/chat', { message, history })
    messages.value.push({ role: 'model', text: data.reply })
  } catch (err) {
    error.value = err?.response?.data?.message || 'No pude conectar con la ayuda de Elysia. Intenta de nuevo.'
  } finally {
    sending.value = false
    await scrollToEnd()
  }
}
</script>

<template>
  <section class="help-assistant" :class="{ 'help-assistant--compact': compact }" aria-label="Asistente de ayuda de Elysia">
    <header class="help-assistant__header">
      <span class="help-assistant__icon"><Icon name="sparkle" :size="18" /></span>
      <div>
        <h2>Asistente de Elysia</h2>
        <p>Guía para registrarte y usar la plataforma</p>
      </div>
    </header>
    <div ref="conversationEl" class="help-assistant__conversation" aria-live="polite" aria-relevant="additions">
      <article v-for="(message, index) in messages" :key="index" class="help-assistant__message" :class="`help-assistant__message--${message.role}`">
        <span>{{ message.text }}</span>
      </article>
      <article v-if="sending" class="help-assistant__message help-assistant__message--model" role="status">Estoy pensando…</article>
    </div>
    <div v-if="messages.length === 1" class="help-assistant__suggestions" aria-label="Preguntas sugeridas">
      <button v-for="idea in promptIdeas" :key="idea" type="button" @click="send(idea)">{{ idea }}</button>
    </div>
    <p v-if="error" class="help-assistant__error" role="alert">{{ error }}</p>
    <form class="help-assistant__composer" @submit.prevent="send()">
      <label class="sr-only" for="elysia-help-question">Escribe tu pregunta</label>
      <input id="elysia-help-question" v-model="input" type="text" maxlength="1000" placeholder="Escribe tu pregunta…" autocomplete="off" :disabled="sending" />
      <button type="submit" :disabled="!canSend" aria-label="Enviar pregunta"><Icon name="arrow-right" :size="18" /></button>
    </form>
    <p class="help-assistant__privacy">Te orienta, pero no crea cuentas ni cambia tus datos. Nunca escribas contraseñas o códigos.</p>
  </section>
</template>

<style scoped>
.help-assistant { display:flex; flex-direction:column; min-height:440px; max-height:680px; color:var(--text); background:var(--surface); border:1px solid var(--border-soft); border-radius:var(--radius-lg); overflow:hidden; }
.help-assistant--compact { min-height:360px; max-height:460px; margin-top:var(--space-5); }
.help-assistant__header { display:flex; align-items:center; gap:var(--space-3); padding:var(--space-4); border-bottom:1px solid var(--border-soft); }
.help-assistant__icon { display:grid; place-items:center; width:40px; height:40px; border-radius:var(--radius-full); color:var(--accent); background:var(--accent-soft); }
.help-assistant__header h2 { font-size:var(--font-size-sm); margin-bottom:2px; }
.help-assistant__header p,.help-assistant__privacy { color:var(--text-muted); font-size:var(--font-size-xs); }
.help-assistant__conversation { display:flex; flex:1; flex-direction:column; align-items:flex-start; gap:var(--space-3); min-height:0; padding:var(--space-4); overflow-y:auto; }
.help-assistant__message { max-width:min(90%,560px); padding:10px 13px; border-radius:var(--radius-md); background:var(--surface-2); font-size:var(--font-size-sm); line-height:1.5; white-space:pre-wrap; overflow-wrap:anywhere; }
.help-assistant__message--user { align-self:flex-end; background:var(--accent); color:var(--accent-contrast); }
.help-assistant__suggestions { display:flex; flex-wrap:wrap; gap:var(--space-2); padding:0 var(--space-4) var(--space-3); }
.help-assistant__suggestions button { padding:7px 10px; border:1px solid var(--border); border-radius:var(--radius-pill); color:var(--text-muted); font-size:var(--font-size-xs); text-align:left; }
.help-assistant__suggestions button:hover { border-color:var(--accent); color:var(--accent); }
.help-assistant__error { padding:0 var(--space-4) var(--space-2); color:var(--danger); font-size:var(--font-size-xs); }
.help-assistant__composer { display:flex; gap:var(--space-2); padding:var(--space-3) var(--space-4); border-top:1px solid var(--border-soft); }
.help-assistant__composer input { min-width:0; flex:1; padding:10px 12px; border:1px solid var(--border); border-radius:var(--radius-md); background:var(--surface-2); color:var(--text); font-size:var(--font-size-sm); }
.help-assistant__composer input:focus { outline:2px solid var(--accent); outline-offset:1px; }
.help-assistant__composer button { display:grid; place-items:center; width:42px; flex:0 0 auto; border-radius:var(--radius-md); color:var(--accent-contrast); background:var(--accent); }
.help-assistant__composer button:disabled { opacity:.5; cursor:not-allowed; }
.help-assistant__privacy { padding:0 var(--space-4) var(--space-3); }
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
</style>
