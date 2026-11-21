<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const docs = {
  privacidad: {
    title: 'Política de privacidad',
    updated: 'Borrador informativo del piloto · 10 de noviembre de 2026',
    sections: [
      {
        heading: 'Qué datos recopilamos',
        body: 'Elysia procesa el nombre y correo de la cuenta; los datos del perfil profesional, servicios y horarios; y la información que se registra al reservar, como nombre, teléfono, cita y servicio. Si usas la caja o las notas privadas, también se guardan esos movimientos y notas.',
      },
      {
        heading: 'Cómo usamos tus datos',
        body: 'Los usamos para operar la cuenta, publicar el perfil, administrar reservas y agenda, mostrar el historial a la barbería correspondiente y prestar las funciones del piloto. Los mensajes de WhatsApp no se envían solos: el barbero los revisa y los envía manualmente.',
      },
      {
        heading: 'Seguridad',
        body: 'Las contraseñas no se guardan en texto legible: se almacenan mediante hash con bcrypt. El servicio debe publicarse y usarse por HTTPS. Cada barbero autenticado solo debe acceder a los recursos de su propia cuenta.',
      },
      {
        heading: 'Tus derechos',
        body: 'Para que este documento pueda usarse con clientes reales, el responsable de Elysia debe completar aquí su nombre o razón social, identificación, correo de contacto y el canal para atender solicitudes sobre datos personales. La retención, eliminación y exportación deben confirmarse antes de activar el piloto.',
      },
    ],
  },
  terminos: {
    title: 'Términos del servicio',
    updated: 'Borrador informativo del piloto · 10 de noviembre de 2026',
    sections: [
      {
        heading: 'Uso del servicio',
        body: 'Elysia ofrece a barberos independientes un perfil público, servicios, horarios, reservas, agenda, directorio de clientes y caja básica. El piloto se dirige a participantes de San Gil, Curití y Socorro, Santander.',
      },
      {
        heading: 'Planes y pagos',
        body: 'El precio actual es de $30.000 COP por mes. El registro en la web no cobra; la activación y el pago se coordinan directamente. Elysia no procesa pagos en línea ni ofrece actualmente una cancelación desde el panel. Cualquier precio futuro debe comunicarse antes de aplicarse.',
      },
      {
        heading: 'Responsabilidad sobre los datos',
        body: 'El barbero debe registrar información necesaria para prestar sus servicios y comunicar a sus clientes cómo se usa. No registres datos sensibles en las notas. El responsable del tratamiento debe definir y publicar el procedimiento para consultas o solicitudes de los titulares antes del piloto con datos reales.',
      },
      {
        heading: 'Limitación del servicio',
        body: 'Este texto es un borrador de producto y no reemplaza los términos finales del servicio. Antes de abrir el registro al público, completa la identidad y contacto del proveedor, disponibilidad del servicio, tratamiento de datos, soporte y procedimiento de cierre de cuenta.',
      },
    ],
  },
}

const doc = computed(() => docs[route.params.doc] || docs.privacidad)
</script>

<template>
  <div class="legal">
    <h1 class="legal__title">{{ doc.title }}</h1>
    <p class="legal__updated">{{ doc.updated }}</p>

    <section v-for="section in doc.sections" :key="section.heading" class="legal__section">
      <h2 class="legal__heading">{{ section.heading }}</h2>
      <p class="legal__body">{{ section.body }}</p>
    </section>

    <p class="legal__links">
      <RouterLink to="/legal/privacidad">Política de privacidad</RouterLink>
      <span aria-hidden="true">·</span>
      <RouterLink to="/legal/terminos">Términos del servicio</RouterLink>
    </p>
  </div>
</template>

<style scoped>
.legal {
  max-width: 760px;
  margin: 0 auto;
  padding: var(--space-7) var(--space-4);
}

.legal__title {
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  margin-bottom: var(--space-2);
}

.legal__updated {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-bottom: var(--space-6);
}

.legal__section {
  margin-bottom: var(--space-5);
}

.legal__heading {
  font-size: var(--font-size-md);
  color: var(--color-primary-soft);
  margin-bottom: var(--space-2);
}

.legal__body {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.legal__links {
  display: flex;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-top: var(--space-6);
}

.legal__links a:hover {
  color: var(--color-primary-soft);
}
</style>
