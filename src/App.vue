<script setup>
import { ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'

const servicios = useLocalStorage('servicios-barberia', [])

const barberos = ['Ramiro', 'Julian', 'Mario']

const tiposServicio = [
  'Corte Clasico',
  'Corte Moderno',
  'Corte Degradado',
  'Corte Infantil',
  'Barba',
  'Diseño De Barba',
  'Corte + barba',
  'cejas',
  'Limpieza Facial'
]

const preciosServicio = {
  'Corte Clasico': 15000,
  'Corte Moderno': 18000,
  'Corte Degradado': 20000,
  'Corte Infantil': 12000,
  'Barba': 10000,
  'Diseño De Barba': 15000,
  'Corte + barba': 25000,
  'cejas': 8000,
  'Limpieza Facial': 20000
}

const formulario = ref({
  id: null,
  cliente: '',
  tipoServicio: '',
  barbero: '',
  fecha: '',
  hora: '',
  precio: 0,
  metodoPago: '',
  estadoPago: '',
  calificacion: 0,
  observaciones: '',
  finalizado: false
})

const mostrarmodal = ref(false)
const idEditando = ref(null)
const mostrarConfirmacion = ref(false)
const idEliminar = ref(null)
const mensajeEror = ref('')
const resumenDia = ref(0)
const guardando = ref(false)

const mostrarModalFinalizar = ref(false)
const idFinalizando = ref(null)
const calificacionFinal = ref(0)
const observacionesFinal = ref('')
const guardandoFinalizacion = ref(false)

function actualizarPrecio() {
  formulario.value.precio = preciosServicio[formulario.value.tipoServicio]
}

function guardarServicio() {
  if (formulario.value.cliente.trim() === "") {
    mensajeEror.value = 'El Nombre Del Cliente Es Obligatorio'
    return
  }
  if (formulario.value.tipoServicio === '') {
    mensajeEror.value = 'Seleccione Un Tipo De Servicio'
    return
  }
  if (formulario.value.barbero === '') {
    mensajeEror.value = 'Seleccione Un Barbero'
    return
  }
  if (formulario.value.precio <= 0) {
    mensajeEror.value = 'El Precio Debe Ser Mayor a 0'
    return
  }

  mensajeEror.value = ''
  guardando.value = true

  // simula que esta guardando en un servidor antes de escribirlo de verdad en el localStorage
  setTimeout(() => {
    if (idEditando.value === null) {
      formulario.value.id = Date.now()
      formulario.value.finalizado = false
      servicios.value.push({ ...formulario.value })
    } else {
      for (let i = 0; i < servicios.value.length; i++) {
        if (servicios.value[i].id === idEditando.value) {
          servicios.value[i] = { ...formulario.value }
          break
        }
      }
    }
    guardando.value = false
    mostrarmodal.value = false
    limpiarFormulario()
  }, 2000)
}

function limpiarFormulario() {
  formulario.value = {
    id: null,
    cliente: '',
    tipoServicio: '',
    barbero: '',
    fecha: '',
    hora: '',
    precio: 0,
    metodoPago: '',
    estadoPago: '',
    calificacion: 0,
    observaciones: '',
    finalizado: false
  }
  idEditando.value = null
  mensajeEror.value = ''
}

function abrirModalNuevo() {
  limpiarFormulario()
  mostrarmodal.value = true
}

function abrirModalEditar(servicio) {
  formulario.value = { ...servicio }
  idEditando.value = servicio.id
  mostrarmodal.value = true
}

function cerrarModal() {
  if (guardando.value) return
  mostrarmodal.value = false
  limpiarFormulario()
}

function abrirConfirmacion(id) {
  idEliminar.value = id
  mostrarConfirmacion.value = true
}

function confirmarEliminacion() {
  for (let i = 0; i < servicios.value.length; i++) {
    if (servicios.value[i].id === idEliminar.value) {
      servicios.value.splice(i, 1)
      break
    }
  }
  mostrarConfirmacion.value = false
  idEliminar.value = null
}

function abrirFinalizar(servicio) {
  idFinalizando.value = servicio.id
  calificacionFinal.value = servicio.calificacion || 0
  observacionesFinal.value = servicio.observaciones || ''
  mostrarModalFinalizar.value = true
}

function ponerCalificacion(estrella) {
  if (guardandoFinalizacion.value) return
  calificacionFinal.value = estrella
}

function cerrarFinalizar() {
  if (guardandoFinalizacion.value) return
  mostrarModalFinalizar.value = false
  idFinalizando.value = null
}

function guardarFinalizacion() {
  guardandoFinalizacion.value = true
  setTimeout(() => {
    for (let i = 0; i < servicios.value.length; i++) {
      if (servicios.value[i].id === idFinalizando.value) {
        servicios.value[i].calificacion = calificacionFinal.value
        servicios.value[i].observaciones = observacionesFinal.value
        servicios.value[i].finalizado = true
        break
      }
    }
    guardandoFinalizacion.value = false
    mostrarModalFinalizar.value = false
    idFinalizando.value = null
  }, 1500)
}

function verResumenDia() {
  let total = 0
  const hoy = new Date().toISOString().split('T')[0]
  for (let i = 0; i < servicios.value.length; i++) {
    if (servicios.value[i].fecha === hoy) {
      total += Number(servicios.value[i].precio)
    }
  }
  resumenDia.value = total
}
</script>

<template>
  <div class="nav">
    <h1 class="titulo_nav">GALE</h1>
    <p class="subtitulo_nav">Barber - Studio</p>
  </div>

  <div class="inf">
    <p>Gestiona los servicios de tu barbería, fácil y rápido</p>
  </div>

  <button class="btn-nuevo" @click="abrirModalNuevo">
    + Nuevo Servicio
  </button>

  <div class="resumen">
    <button @click="verResumenDia">Ver resumen del día</button>
    <p>Total vendido hoy: ${{ resumenDia }}</p>
  </div>

  <h2 class="titulo-seccion" v-if="servicios.length > 0">Servicios Registrados</h2>
  <p class="sin-registros" v-if="servicios.length === 0">
    Aún no hay servicios registrados. ¡Agrega el primero!
  </p>

  <div class="servicios">
    <div v-for="servicio in servicios" :key="servicio.id" class="tarjeta"
      :class="{
        pendiente: servicio.estadoPago === 'Pendiente',
        fiado: servicio.estadoPago === 'Fiado'
      }"
    >
      <div class="tarjeta-header">
        <h3>{{ servicio.cliente }}</h3>
        <span class="badge" v-if="servicio.estadoPago === 'Pagado'">Pagado</span>
        <span class="badge badge-pendiente" v-else-if="servicio.estadoPago === 'Pendiente'">Pendiente</span>
        <span class="badge badge-fiado" v-else-if="servicio.estadoPago === 'Fiado'">Fiado</span>
      </div>

      <p><strong>Servicio:</strong> {{ servicio.tipoServicio }}</p>
      <p><strong>Barbero:</strong> {{ servicio.barbero }}</p>
      <p><strong>Fecha:</strong> {{ servicio.fecha }} {{ servicio.hora }}</p>
      <p><strong>Precio:</strong> ${{ servicio.precio }}</p>

      <p v-if="servicio.metodoPago === 'Efectivo'">Efectivo</p>
      <p v-else-if="servicio.metodoPago === 'Trasferencia'">Transferencia</p>
      <p v-else-if="servicio.metodoPago === 'Tarjeta'">Tarjeta</p>

      <p v-if="servicio.estadoPago === 'Fiado'" class="alerta-debe">¡Debe!</p>

      <div v-if="!servicio.finalizado" class="sin-finalizar">
        <p class="pendiente-finalizar">Servicio en curso</p>
        <button class="btn-finalizar" @click="abrirFinalizar(servicio)">
          Finalizar Servicio
        </button>
      </div>

      <div v-else>
        <p v-if="servicio.calificacion <= 2" class="calificacion-baja">
          Calificación Baja ({{ servicio.calificacion }}/5)
        </p>
        <p v-else>⭐ {{ servicio.calificacion }}/5</p>

        <p v-if="servicio.observaciones" class="observaciones">
          {{ servicio.observaciones }}
        </p>
      </div>

      <div class="acciones">
        <button @click="abrirModalEditar(servicio)">Editar</button>
        <button @click="abrirConfirmacion(servicio.id)">Eliminar</button>
      </div>
    </div>
  </div>

  <div v-if="mostrarmodal" class="model">
    <div class="modal_contenido">
      <h2>{{ idEditando === null ? 'Registrar Servicio' : 'Editar Servicio' }}</h2>

      <form @submit.prevent="guardarServicio">
        <label>Nombre del cliente</label>
        <input type="text" v-model="formulario.cliente" :disabled="guardando">

        <label>Tipo de servicio</label>
        <select v-model="formulario.tipoServicio" @change="actualizarPrecio" :disabled="guardando">
          <option value="">Seleccione un servicio</option>
          <option v-for="tipo in tiposServicio" :key="tipo" :value="tipo">
            {{ tipo }}
          </option>
        </select>

        <label>Barbero</label>
        <select v-model="formulario.barbero" :disabled="guardando">
          <option value="">Seleccione un barbero</option>
          <option v-for="barbero in barberos" :key="barbero" :value="barbero">
            {{ barbero }}
          </option>
        </select>

        <div class="fila">
          <div>
            <label>Fecha</label>
            <input type="date" v-model="formulario.fecha" :disabled="guardando">
          </div>
          <div>
            <label>Hora</label>
            <input type="time" v-model="formulario.hora" :disabled="guardando">
          </div>
        </div>

        <label>Precio</label>
        <input type="number" v-model="formulario.precio" :disabled="guardando">

        <label>Método de pago</label>
        <select v-model="formulario.metodoPago" :disabled="guardando">
          <option value="">Seleccione un método</option>
          <option value="Efectivo">Efectivo</option>
          <option value="Trasferencia">Transferencia</option>
          <option value="Tarjeta">Tarjeta</option>
        </select>

        <label>Estado del pago</label>
        <select v-model="formulario.estadoPago" :disabled="guardando">
          <option value="">Seleccione un estado</option>
          <option value="Pagado">Pagado</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Fiado">Fiado</option>
        </select>

        <p v-if="mensajeEror" class="error">{{ mensajeEror }}</p>
        <p v-if="guardando" class="guardando-msg">Guardando el servicio, un momento...</p>

        <div class="botones-form">
          <button type="submit" class="btn-guardar" :disabled="guardando">
            {{ guardando ? 'Guardando...' : 'Guardar Servicio' }}
          </button>
          <button type="button" class="btn-cancelar" @click="cerrarModal" :disabled="guardando">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="mostrarModalFinalizar" class="model">
    <div class="modal_contenido">
      <h2>Finalizar Servicio</h2>
      <p>Registra cómo quedó el cliente al terminar el servicio.</p>

      <label>Calificación</label>
      <div class="estrellas">
        <span v-for="estrella in 5" :key="estrella" @click="ponerCalificacion(estrella)">
          <span v-if="estrella <= calificacionFinal">★</span>
          <span v-else>☆</span>
        </span>
      </div>

      <label>Observaciones (opcional)</label>
      <textarea v-model="observacionesFinal" :disabled="guardandoFinalizacion"></textarea>

      <p v-if="guardandoFinalizacion" class="guardando-msg">Guardando</p>

      <div class="botones-form">
        <button type="button" class="btn-guardar" :disabled="guardandoFinalizacion" @click="guardarFinalizacion">
          {{ guardandoFinalizacion ? 'Guardando...' : 'Guardar' }}
        </button>
        <button type="button" class="btn-cancelar" :disabled="guardandoFinalizacion" @click="cerrarFinalizar">
          Cancelar
        </button>
      </div>
    </div>
  </div>

  <div v-if="mostrarConfirmacion" class="modal-confirmacion">
    <div class="Confirmacion-contenido">
      <h2>¿Eliminar Servicio?</h2>
      <p>¿Estás seguro de eliminar este servicio? Esta acción no se puede deshacer.</p>
      <div class="botones-form">
        <button class="btn-guardar" @click="confirmarEliminacion">Sí, eliminar</button>
        <button class="btn-cancelar" @click="mostrarConfirmacion = false">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<style>
* { box-sizing: border-box; }

body {
  font-family: 'Segoe UI', sans-serif;
  background: #f0f2f5;
  margin: 0;
  padding: 0;
}
.nav {
  background-color: #111;
  padding: 20px 10px 15px 10px;
  text-align: center;
}
.titulo_nav {
  margin: 0;
  padding: 0;
  color: white;
  font-family: 'Bodoni Moda', serif;
  font-weight: 700;
  font-size: 2.2rem;
  text-transform: uppercase;
  letter-spacing: 3px;
}
.subtitulo_nav {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 0.9rem;
  letter-spacing: 4px;
  text-transform: uppercase;
  margin: 0;
  padding-top: 5px;
  color: #ccc;
}
.inf {
  text-align: center;
  padding: 20px 10px 5px 10px;
  color: #555;
  font-size: 0.95rem;
}
.btn-nuevo {
  display: block;
  margin: 10px auto 20px auto;
  padding: 12px 30px;
  background: #2c3e50;
  color: white;
  border: none;
  border-radius: 30px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
}
.resumen {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin: 0 auto 25px auto;
  max-width: 300px;
  background: white;
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}
.resumen button {
  padding: 8px 20px;
  border: none;
  border-radius: 20px;
  background: #2c3e50;
  color: white;
  cursor: pointer;
  font-weight: bold;
}
.resumen p {
  margin-top: 10px;
  margin-bottom: 0;
  font-weight: bold;
  color: #2c3e50;
}
.titulo-seccion {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 15px;
}
.sin-registros {
  text-align: center;
  color: #888;
  padding: 20px;
}
.servicios {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px 30px 20px;
}
.tarjeta {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border-left: 5px solid #2ecc71;
  width: 280px;
  display: flex;
  flex-direction: column;
}
.tarjeta-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.tarjeta-header h3 {
  margin: 0;
  color: #2c3e50;
}
.badge {
  padding: 3px 10px;
  border-radius: 15px;
  font-size: 0.7rem;
  font-weight: bold;
  background: #2ecc71;
  color: white;
}
.badge-pendiente { background: rgb(255, 149, 0); }
.badge-fiado { background: #e74c3c; }
.tarjeta p { margin: 6px 0; font-size: 0.9rem; color: #444; }
.pendiente { border-left: 5px solid rgb(210, 177, 115); background: #fff8ec; }
.fiado { border-left: 5px solid #e74c3c; background: #fdeceb; }
.calificacion-baja { color: #e74c3c; font-weight: bold; }
.alerta-debe { color: #e74c3c; font-weight: bold; }
.observaciones { font-style: italic; color: #666; }
.sin-finalizar {
  background: #fff8e1;
  border-radius: 8px;
  padding: 8px;
  margin-top: 8px;
  text-align: center;
}
.pendiente-finalizar {
  margin: 0 0 8px 0;
  font-size: 0.85rem;
  color: #ad892c;
}
.btn-finalizar {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: #a58653;
  color: white;
  font-weight: bold;
  cursor: pointer;
}
.acciones {
  margin-top: auto;
  padding-top: 12px;
  display: flex;
  gap: 8px;
}
.acciones button {
  flex: 1;
  padding: 5px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: white;
  font-weight: bold;
}
.acciones button:first-child { background: #4f7c53; }
.acciones button:last-child { background: #8f4a42; }
.model, .modal-confirmacion {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}
.modal_contenido, .Confirmacion-contenido {
  background: white;
  border-radius: 12px;
  padding: 25px;
  width: 100%;
  max-width: 420px;
  max-height: 85vh;
  overflow-y: auto;
}
.modal_contenido label {
  display: block;
  margin-top: 10px;
  font-weight: bold;
  color: #2c3e50;
}
.modal_contenido input,
.modal_contenido select,
.modal_contenido textarea {
  width: 100%;
  padding: 8px;
  margin-top: 4px;
  border-radius: 6px;
  border: 1px solid #ccc;
}
.fila {
  display: flex;
  gap: 10px;
}
.fila > div { flex: 1; }
.estrellas {
  display: flex;
  gap: 5px;
  font-size: 1.5rem;
  color: #f69d0f;
  cursor: pointer;
  margin-top: 5px;
}
.error {
  color: #c51e0c;
  font-weight: bold;
}
.guardando-msg {
  color: #3cb929;
  font-weight: bold;
  text-align: center;
  margin-top: 10px;
}
.botones-form {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}
.btn-guardar, .btn-cancelar {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  color: white;
}
.btn-guardar { background: #2ecc71; }
.btn-guardar:disabled { background: #95d5b2; cursor: not-allowed; }
.btn-cancelar { background: #999; }
.btn-cancelar:disabled { cursor: not-allowed; }
@media (max-width: 600px) {
  .tarjeta { width: 100%; }
  .fila { flex-direction: column; }
}
</style>