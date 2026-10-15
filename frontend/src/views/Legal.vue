<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const docs = {
  privacidad: {
    title: 'Política de privacidad',
    updated: 'Última actualización: octubre de 2026',
    sections: [
      {
        heading: 'Qué datos recopilamos',
        body: 'Al crear tu cuenta recopilamos tu nombre, correo electrónico y una versión cifrada de tu contraseña. A medida que usas Elysia también guardamos la información de tu barbería: servicios, precios, clientes y turnos.',
      },
      {
        heading: 'Cómo usamos tus datos',
        body: 'Usamos tus datos únicamente para operar el servicio: mostrarte tu agenda, enviar recordatorios a tus clientes y generar reportes de tu negocio. Nunca vendemos tus datos ni los cedemos a terceros con fines publicitarios.',
      },
      {
        heading: 'Seguridad',
        body: 'Las contraseñas se almacenan cifradas y todas las comunicaciones viajan por conexión segura (HTTPS). El acceso a la información de tu cuenta está limitado a ti y a los usuarios que autorices explícitamente.',
      },
      {
        heading: 'Tus derechos',
        body: 'Puedes solicitar la exportación o eliminación de tus datos escribiéndonos. Al eliminar tu cuenta, la información personal se borra de nuestros sistemas en un plazo razonable.',
      },
    ],
  },
  terminos: {
    title: 'Términos del servicio',
    updated: 'Última actualización: octubre de 2026',
    sections: [
      {
        heading: 'Uso del servicio',
        body: 'Elysia es una plataforma de gestión para barberías. Al crear una cuenta te comprometes a usarla de forma legítina y a mantener la confidencialidad de tus credenciales.',
      },
      {
        heading: 'Planes y pagos',
        body: 'Los planes son de pago mensual y pueden cancelarse en cualquier momento desde el panel, sin permanencia mínima. Los precios pueden actualizarse avisando con anticipación.',
      },
      {
        heading: 'Responsabilidad sobre los datos',
        body: 'Tú eres responsable de la información que registras en Elysia (servicios, precios y datos de tus clientes) y de contar con la autorización necesaria de tus clientes para tratar sus datos.',
      },
      {
        heading: 'Limitación del servicio',
        body: 'Elysia se ofrece "tal cual". No garantizamos la ausencia total de interrupciones, pero trabajamos para mantener el servicio disponible y tus datos seguros.',
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
