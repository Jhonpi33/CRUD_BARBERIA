<script setup>
import { ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'

const servicios = useLocalStorage('servicios-barberia', [])
const barberos = [
  'Don Ramiro',
  'carlos',
  'andres'
]

const tiposServicio = [
  'Corte Clasico',
  'Corte Moderno',
  'Barba',
  'Corte + barba',
  'cejas',
  'tinte'
]

const servicio = {
  id: Date.now(),
  cliente: '',
  tipoServicio: '',
  barbero: '',
  fecha: '',
  hora: '',
  precio: 0,
  metodoPago: '',
  estadodePago: '',
  calificacion: 0,
  observaciones: ''
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
  estadodePago: '',
  calificacion: 0,
  observaciones: ''
})
const mostrarmodal = ref(false)

const idEditando = ref(null)


const mensajeEror = ref('')

function guardarServicio() {
  if (formulario.value.cliente.trim() === "") {
    mensajeEror.value = 'El  Nombre Del Cliente Es Obligatorio'
    return
  }

  if (formulario.value.tipoServicio === '') {
    mensajeEror.value = 'Selecione Un Tipo De Servicio'
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

  if (idEditando.value === null) {
    formulario.value.id = Date.now()

    servicios.value.push({
      ...formulario.value
    })
  } else {
    for (let i = 0; i < servicios.value.length; i++) {
      if (servicios.value[i].id === idEditando.value){
        servicios.value[i] = {
          ...formulario.value
        }
        break
      } 
    }
  }
  mostrarmodal.value = false
}

</script>

<template>
  <div v-if="mostrarmodal" class="model">
    <div class="modal_contenido">
      <h2>Registrar Servicio</h2>

      <form @submit.prevent="guardarServicio">

      <label>Nombre del cliente</label>
        <input
          type="text"
          v-model="formulario.cliente"
        >

        <label>Tipo de servicio</label>
        <select v-model="formulario.tipoServicio">
          <option value="">Seleccione un servicio</option>

          <option
            v-for="tipo in tiposServicio"
            :key="tipo"
            :value="tipo"
          >
            {{ tipo }}
          </option>
        </select>

        <label>Barbero</label>
        <select v-model="formulario.barbero">
          <option value="">Selecione Un Barbero</option>
        

        <option
        v-for="barbero in barberos"
        :key="barbero"
        :value="barbero">
      >
        {{ barbero }}
      </option>
      </select>

      <label>Fecha y hora</label>
      <input
        type="datetime-local"
        v-model="formulario.fecha"
      >

      <label>Precio</label>
      <input
      type="number"
      v-model="formulario.precio"
      >

      <label>Metodo De Pago</label>
      <select v-model="formulario.metodoPago">
        <option value="">Selecione Un Metoodo</option>
        <option value="Efectivo">Efectivo</option>
        <option value="Trasferencia">Trasferencia</option>
        <option value="Tarjeta">Tarjeta</option>
      </select>

      <label>Estado Del Pago</label>
      <select v-model="formulario.estadodePago">
        <option value="">Selecione Un Estado</option>
        <option value="Pagado">Pagado</option>
        <option value="Pendiente">Pendiente</option>
        <option value="Fiado">Fiado</option>
      </select>

      <label>Clasficacion</label>

      <div>
        <span
          v-for="estrella in 5"
          :key="estrella"
          @click="formulario.calificacion = estrella"
        >
          <span v-if="estrella <= formulario.calificacion">★</span>
          <span v-else>☆</span>
        </span>
      </div>

      <label>Obeservaciones</label>
      <textarea v-model="formulario.observaciones"></textarea>
      <button type="submit">
        Guardar Servicio
      </button>

      </form>
    </div>
  </div>
</template>
