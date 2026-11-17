<script setup>
/*
  Asistente de IA en MODO PRUEBA.

  Simula la conversación de WhatsApp sin conectar Meta: el dueño escribe como
  si fuera un cliente y ve exactamente lo que el bot respondería, incluidas
  las citas que agenda de verdad en su propia agenda.

  El `slug` del negocio lo pone el panel (nunca el texto): así el bot solo
  puede tocar la agenda de este negocio.
*/
import { ref, computed, nextTick, onMounted } from 'vue'
import api from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import { longDate, moneyLabel } from '../../utils/datetime'
import Icon from '../../components/Icon.vue'

const auth = useAuthStore()

const slug = computed(() => auth.profile?.slug || '')
const businessName = computed(
  () => auth.profile?.professionalName || auth.profile?.businessName || 'tu negocio'
)

// Datos del "cliente simulado": así se prueban reservas y consultas reales.
const clientName = ref('Cliente de prueba')
const clientPhone = ref('3001234567')

const messages = ref([])
const input = ref('')
const sending = ref(false)
const error = ref('')
const booking = ref(null)
const listEl = ref(null)

function greeting() {
  return {
    role: 'model',
    text: `Hola, soy el asistente de ${businessName.value}. Puedo contarte los servicios y precios, mirar horarios libres y agendar una cita. ¿Qué necesitas?`,
  }
}

onMounted(() => {
  messages.value = [greeting()]
})

async function scrollToEnd() {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

async function send() {
  const text = input.value.trim()
  if (!text || sending.value || !slug.value) return

  // Historial ANTERIOR al mensaje actual (el backend añade el nuevo).
  const history = messages.value
    .filter((m) => m.role === 'user' || m.role === 'model')
    .slice(-10)
    .map((m) => ({ role: m.role, text: m.text }))

  messages.value.push({ role: 'user', text })
  input.value = ''
  error.value = ''
  sending.value = true
  await scrollToEnd()

  try {
    const { data } = await api.post(
      '/agent/chat',
      {
        slug: slug.value,
        message: text,
        phone: clientPhone.value,
        name: clientName.value,
        history,
      },
      // El modelo puede necesitar dos o tres llamadas seguidas (consultar,
      // agendar y responder). 60 s evita cortar una conversación válida.
      { timeout: 60000 }
    )

    messages.value.push({ role: 'model', text: data.reply })
    if (data.booking) booking.value = data.booking
  } catch (err) {
    error.value =
      err?.response?.data?.message ||
      (err?.code === 'ECONNABORTED'
        ? 'El asistente está tardando más de lo normal. Vuelve a intentarlo en unos segundos.'
        : 'No se pudo conectar con el asistente. Intenta de nuevo.')
  } finally {
    sending.value = false
    await scrollToEnd()
  }
}

function reset() {
  messages.value = [greeting()]
  booking.value = null
  error.value = ''
  input.value = ''
}
</script>

<template>
  <div class="panel-view">
    <h1 class="panel-view__title">Asistente de IA</h1>
    <p class="panel-view__lead">
      Modo prueba: escribe como si fueras un cliente y mira cómo el asistente consulta tus
      horarios y agenda citas reales. Cuando conectemos WhatsApp, tus clientes hablarán así
      contigo.
    </p>

    <section v-if="!slug" class="agent-warning">
      <Icon name="alert" :size="18" />
      <p>
        Necesitas completar tu perfil y tener un enlace público para probar el asistente.
        <RouterLink :to="{ name: auth.role === 'barber' ? 'barber-onboarding' : 'barbershop-onboarding' }">
          Completar mi perfil
        </RouterLink>
      </p>
    </section>

    <div v-else class="agent">
      <!-- Datos del cliente simulado -->
      <div class="agent__setup">
        <span class="agent__setup-icon" aria-hidden="true"><Icon name="user" :size="16" /></span>
        <label class="agent__field">
          <span>Nombre del cliente</span>
          <input v-model="clientName" type="text" maxlength="60" autocomplete="off" />
        </label>
        <label class="agent__field">
          <span>Teléfono del cliente</span>
          <input v-model="clientPhone" type="tel" maxlength="40" autocomplete="off" />
        </label>
        <p class="agent__setup-note">
          El teléfono es la identidad del cliente: con él se buscan y crean sus citas.
        </p>
      </div>

      <!-- Conversación -->
      <div ref="listEl" class="agent__chat" aria-live="polite">
        <div
          v-for="(m, i) in messages"
          :key="i"
          class="agent__row"
          :class="m.role === 'user' ? 'agent__row--user' : 'agent__row--bot'"
        >
          <span v-if="m.role === 'model'" class="agent__avatar" aria-hidden="true">
            <Icon name="star" :size="14" />
          </span>
          <p class="agent__bubble">{{ m.text }}</p>
        </div>

        <div v-if="sending" class="agent__row agent__row--bot">
          <span class="agent__avatar" aria-hidden="true"><Icon name="star" :size="14" /></span>
          <p class="agent__bubble agent__bubble--typing">
            <span></span><span></span><span></span>
          </p>
        </div>
      </div>

      <p v-if="error" class="agent__error" role="alert">
        <Icon name="alert" :size="16" /> {{ error }}
      </p>

      <!-- Cita creada por el bot -->
      <div v-if="booking" class="agent__booking">
        <div class="agent__booking-head">
          <Icon name="check-circle" :size="18" />
          <strong>Cita agendada en tu agenda</strong>
        </div>
        <p>
          {{ booking.service }} · {{ longDate(booking.date) }} a las {{ booking.start }} –
          {{ booking.end }} · {{ moneyLabel(booking.price) }}
        </p>
        <p class="agent__booking-note">
          Estado: {{ booking.status === 'pending' ? 'pendiente de tu confirmación' : booking.status }}.
          Aparecerá en tu agenda como una reserva normal.
        </p>
        <RouterLink
          class="btn btn--secondary btn--sm"
          :to="{ name: auth.role === 'barber' ? 'barber-agenda' : 'barbershop-agenda' }"
        >
          Ver en la agenda <Icon name="arrow-right" :size="15" />
        </RouterLink>
      </div>

      <!-- Entrada -->
      <form class="agent__composer" @submit.prevent="send">
        <input
          v-model="input"
          class="agent__input"
          type="text"
          maxlength="600"
          placeholder="Escribe como un cliente: «¿cuánto cuesta el corte?»"
          :disabled="sending"
          aria-label="Mensaje para el asistente"
        />
        <button class="btn btn--primary" type="submit" :disabled="sending || !input.trim()">
          {{ sending ? 'Pensando…' : 'Enviar' }}
        </button>
      </form>

      <div class="agent__foot">
        <button class="agent__link" type="button" @click="reset">Reiniciar conversación</button>
        <span class="agent__hint">
          Las citas que agende esta prueba son reales: puedes cancelarlas desde la agenda.
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.agent-warning {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--warning-soft);
  color: var(--warning);
  font-size: var(--font-size-sm);
}

.agent-warning a {
  color: inherit;
  font-weight: 700;
  text-decoration: underline;
}

.agent {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 760px;
}

/* Datos del cliente simulado */
.agent__setup {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding: var(--space-3) var(--space-4);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
}

.agent__setup-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-full);
  background: var(--accent-soft);
  color: var(--accent);
  margin-bottom: 2px;
}

.agent__field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-xs, 0.75rem);
  color: var(--text-muted);
}

.agent__field input {
  padding: 6px var(--space-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
  font-size: var(--font-size-sm);
  min-width: 160px;
}

.agent__setup-note {
  flex: 1 1 100%;
  font-size: var(--font-size-xs, 0.75rem);
  color: var(--text-muted);
}

/* Conversación */
.agent__chat {
  height: min(52vh, 460px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
}

.agent__row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  max-width: 85%;
}

.agent__row--user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.agent__row--bot {
  align-self: flex-start;
}

.agent__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: var(--radius-full);
  background: var(--accent-soft);
  color: var(--accent);
}

.agent__bubble {
  padding: 10px var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  line-height: 1.5;
  white-space: pre-line;
  background: var(--bg);
  border: 1px solid var(--border-soft);
  color: var(--text);
}

.agent__row--user .agent__bubble {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

/* Puntitos de "escribiendo" */
.agent__bubble--typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 14px var(--space-3);
}

.agent__bubble--typing span {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--text-muted);
  animation: agent-dot 1.2s infinite ease-in-out;
}

.agent__bubble--typing span:nth-child(2) {
  animation-delay: 0.15s;
}

.agent__bubble--typing span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes agent-dot {
  0%,
  80%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

/* Cita creada */
.agent__booking {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--success-border, #a7f3d0);
  background: var(--success-soft);
  font-size: var(--font-size-sm);
}

.agent__booking-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--success);
  margin-bottom: var(--space-2);
}

.agent__booking-note {
  color: var(--text-muted);
  margin: var(--space-1) 0 var(--space-3);
}

/* Entrada */
.agent__composer {
  display: flex;
  gap: var(--space-2);
}

.agent__input {
  flex: 1;
  min-width: 0;
  padding: 12px var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  font-size: var(--font-size-sm);
}

.agent__input:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.agent__error {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--danger-soft, #fee2e2);
  color: var(--danger, #b91c1c);
  font-size: var(--font-size-sm);
}

.agent__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  font-size: var(--font-size-xs, 0.75rem);
  color: var(--text-muted);
}

.agent__link {
  background: none;
  border: none;
  padding: 0;
  color: var(--accent);
  font-size: inherit;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

@media (max-width: 560px) {
  .agent__row {
    max-width: 92%;
  }

  .agent__composer {
    flex-direction: column;
  }
}
</style>
