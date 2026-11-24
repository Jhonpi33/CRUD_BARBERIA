<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import Button from './Button.vue'
import Icon from './Icon.vue'

const auth = useAuthStore()
const enabled = ref(false)
const connection = ref({ status: 'unlinked' })
const pairingCode = ref('')
const busy = ref(false)
const savingAlerts = ref(false)
const confirmDisconnect = ref(false)
const error = ref('')
const controller = new AbortController()
const options = { signal: controller.signal }
let pollTimer
let refreshVersion = 0

const labels = {
  unlinked: 'Sin vincular',
  created: 'Sin iniciar',
  initializing: 'Iniciando conexión',
  qr_ready: 'Esperando vinculación',
  authenticating: 'Verificando conexión',
  ready: 'Conectado',
  disconnected: 'Desconectado',
  action_required: 'Requiere volver a vincular',
  failed: 'La conexión falló',
  number_in_use: 'Número vinculado a otra cuenta',
  disconnecting: 'Desvinculación pendiente',
}
const status = computed(() => connection.value.status)
const linking = computed(() => ['initializing', 'qr_ready', 'authenticating'].includes(status.value))
const canStart = computed(() => ['unlinked', 'created', 'disconnected', 'failed'].includes(status.value))
const alertsEnabled = computed(() => auth.profile?.whatsappNotificationsEnabled === true)
const samePhone = computed(() => {
  const digits = String(auth.profile?.phone || '').replace(/\D/g, '')
  return digits && (digits === connection.value.phone || `57${digits}` === connection.value.phone)
})

function errorMessage(err) {
  return err.response?.data?.message || 'No se pudo consultar WhatsApp. Intenta de nuevo.'
}

function applyStatus(data) {
  connection.value = data
  if (!linking.value) pairingCode.value = ''
}

function scheduleRefresh() {
  clearTimeout(pollTimer)
  if (linking.value && !controller.signal.aborted) pollTimer = setTimeout(refresh, 5000)
}

async function refresh() {
  if (busy.value || controller.signal.aborted) return
  const version = ++refreshVersion
  try {
    const { data } = await api.get('/whatsapp/connection', options)
    if (version === refreshVersion && !controller.signal.aborted) applyStatus(data)
  } catch (err) {
    if (version === refreshVersion && !controller.signal.aborted) {
      if (linking.value) connection.value = { status: status.value }
      error.value = errorMessage(err)
    }
  } finally {
    if (version === refreshVersion) scheduleRefresh()
  }
}

async function perform(action) {
  if (busy.value || controller.signal.aborted) return
  refreshVersion += 1
  clearTimeout(pollTimer)
  busy.value = true
  error.value = ''
  try {
    await action()
  } catch (err) {
    if (!controller.signal.aborted) error.value = errorMessage(err)
  } finally {
    busy.value = false
    scheduleRefresh()
  }
}

async function start() {
  pairingCode.value = ''
  await perform(async () => {
    const { data } = await api.post('/whatsapp/connection', {}, options)
    applyStatus(data)
  })
  await refresh()
}

function requestCode() {
  return perform(async () => {
    const { data } = await api.post('/whatsapp/connection/code', {}, options)
    pairingCode.value = data.pairingCode
  })
}

async function disconnect() {
  await perform(async () => {
    const { data } = await api.delete('/whatsapp/connection', options)
    applyStatus(data)
    confirmDisconnect.value = false
  })
  await refresh()
}

async function toggleAlerts(event) {
  savingAlerts.value = true
  error.value = ''
  const input = event.target
  try {
    await auth.saveProfile({ whatsappNotificationsEnabled: input.checked })
  } catch (err) {
    input.checked = alertsEnabled.value
    error.value = errorMessage(err)
  } finally {
    savingAlerts.value = false
  }
}

onMounted(async () => {
  try {
    const { data } = await api.get('/whatsapp/status', options)
    enabled.value = data.channels.pairingAvailable === true
    if (enabled.value) await refresh()
  } catch {
    // La agenda se puede usar aunque el canal de WhatsApp no esté disponible.
  }
})

onUnmounted(() => {
  controller.abort()
  clearTimeout(pollTimer)
})
</script>

<template>
  <section v-if="enabled" class="wa-connection" aria-labelledby="wa-heading">
    <header class="wa-connection__header">
      <div class="wa-connection__icon"><Icon name="phone" :size="20" /></div>
      <div class="wa-connection__heading">
        <h2 id="wa-heading">Avisos por WhatsApp</h2>
        <p>Envía confirmaciones y recordatorios de citas desde tu número.</p>
      </div>
      <span class="wa-connection__status" :class="{ 'wa-connection__status--ready': status === 'ready' }" role="status">
        {{ labels[status] || 'Consultando estado' }}
      </span>
    </header>

    <div v-if="canStart" class="wa-connection__section">
      <p>Vincula un número de trabajo. WhatsApp puede restringir el uso de conexiones no oficiales.</p>
      <Button :loading="busy" @click="start">
        <Icon name="link" :size="16" /> {{ status === 'unlinked' ? 'Vincular WhatsApp' : 'Reconectar WhatsApp' }}
      </Button>
      <Button v-if="error" variant="secondary" :disabled="busy" @click="refresh">Comprobar conexión</Button>
    </div>

    <div v-if="linking" class="wa-connection__pair">
      <img v-if="connection.qrCode && !pairingCode" :src="connection.qrCode" alt="QR para vincular tu número con Elysia" width="216" height="216" />
      <div class="wa-connection__section">
        <template v-if="pairingCode">
          <p>En WhatsApp, abre Dispositivos vinculados → Vincular un dispositivo → Vincular con número de teléfono. Escribe este código de un solo uso.</p>
          <output class="wa-connection__code" dir="ltr">{{ pairingCode }}</output>
        </template>
        <p v-else-if="connection.qrCode">En tu celular, abre WhatsApp → Dispositivos vinculados → Vincular un dispositivo y escanea el QR. Se actualiza automáticamente.</p>
        <p v-else>Estamos esperando la respuesta de WhatsApp. Esta pantalla se actualiza automáticamente.</p>
        <Button v-if="status === 'qr_ready'" variant="secondary" :loading="busy" @click="requestCode">
          {{ pairingCode ? 'Generar otro código' : 'Estoy en el mismo celular' }}
        </Button>
        <small v-if="status === 'qr_ready' && !pairingCode">El código usa el número guardado en tu perfil.</small>
      </div>
    </div>

    <div v-if="status === 'ready'" class="wa-connection__section">
      <p><strong>+{{ connection.phone }}</strong> · Tus clientes pueden elegir recibir avisos al reservar.</p>
      <label class="wa-connection__toggle">
        <input type="checkbox" :checked="alertsEnabled" :disabled="savingAlerts || busy" @change="toggleAlerts" />
        <span>Recibir también los avisos de reservas en mi WhatsApp</span>
      </label>
      <small v-if="alertsEnabled && samePhone">Los avisos que te envíes desde tu mismo número llegan al chat contigo. La alerta en tu celular depende de WhatsApp.</small>
    </div>

    <div v-if="!canStart || status !== 'unlinked'" class="wa-connection__actions">
      <template v-if="confirmDisconnect">
        <p>¿Desvincular este número? Se detendrán los mensajes automáticos de esta conexión.</p>
        <Button variant="danger" :loading="busy" @click="disconnect">Confirmar desvinculación</Button>
        <Button variant="secondary" :disabled="busy" @click="confirmDisconnect = false">Cancelar</Button>
      </template>
      <Button v-else variant="secondary" :disabled="busy || savingAlerts" @click="confirmDisconnect = true">
        {{ status === 'disconnecting' ? 'Reintentar desvinculación' : 'Desvincular número' }}
      </Button>
    </div>
    <p v-if="error" class="form__error" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.wa-connection {
  display: grid;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
  padding: clamp(16px, 4vw, 24px);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  font-size: var(--font-size-sm);
}
.wa-connection__header { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
.wa-connection__heading { flex: 1 1 190px; min-width: 0; }
.wa-connection__heading h2 { margin-bottom: var(--space-1); font-size: var(--font-size-md); }
.wa-connection__icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: var(--radius-md); background: var(--success-soft); color: var(--success); }
.wa-connection__status { padding: 4px 10px; border: 1px solid var(--border-soft); border-radius: var(--radius-full); background: var(--surface-2); color: var(--text-muted); }
.wa-connection__status--ready { color: var(--success); background: var(--success-soft); }
.wa-connection p, .wa-connection small { color: var(--text-muted); }
.wa-connection__section { display: grid; justify-items: start; align-content: start; gap: var(--space-2); }
.wa-connection__pair { display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: center; padding: var(--space-3); border: 1px solid var(--border-soft); border-radius: var(--radius-md); background: var(--surface-2); }
.wa-connection__pair img { width: min(100%, 216px); height: auto; padding: 8px; background: white; border-radius: var(--radius-sm); }
.wa-connection__pair .wa-connection__section { flex: 1 1 220px; }
.wa-connection__code { display: block; padding: 10px 14px; border-radius: var(--radius-sm); background: var(--surface); color: var(--text); font: 700 1.3rem ui-monospace, monospace; letter-spacing: .13em; }
.wa-connection__toggle { display: flex; align-items: flex-start; gap: 8px; cursor: pointer; padding-block: 8px; }
.wa-connection__toggle input { flex: 0 0 18px; width: 18px; height: 18px; margin-top: 2px; accent-color: var(--accent); }
.wa-connection__actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.wa-connection__actions p { width: 100%; }
@media (max-width: 450px) {
  .wa-connection__pair { justify-content: center; }
  .wa-connection .btn { width: 100%; min-height: 44px; }
}
</style>
