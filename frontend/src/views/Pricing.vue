<script setup>
const included = [
  'Perfil público con enlace para compartir',
  'Catálogo de servicios, precios y duración',
  'Configuración de horarios y descansos',
  'Reservas públicas y agenda de citas',
  'Directorio de clientes e historial de citas',
  'Caja básica: apertura, ingresos, egresos y cierre',
  'Mensajes preparados para enviar manualmente por WhatsApp',
  'Acompañamiento para configurar tu cuenta',
]

const faqs = [
  {
    question: '¿Para quién es este plan?',
    answer: 'Para barberos independientes que llevan su propia agenda.',
  },
  {
    question: '¿Cuánto cuesta y cada cuánto se paga?',
    answer: '$30.000 COP al mes. El pago se coordina directamente con el equipo de Elysia.',
  },
  {
    question: '¿El sistema cobra en línea?',
    answer: 'No hay cobro en línea. El pago se coordina directamente con Elysia.',
  },
  {
    question: '¿WhatsApp envía recordatorios automáticos?',
    answer: 'No. Elysia ofrece textos y accesos para que revises y envíes los mensajes manualmente desde WhatsApp.',
  },
  {
    question: '¿El plan incluye inventario o manejo de equipos?',
    answer: 'No incluye inventario ni gestión de equipos. La caja básica permite registrar los movimientos del día.',
  },
]
</script>

<template>
  <div class="pricing">
    <header class="pricing__hero">
      <p class="pricing__eyebrow">Precios de Elysia</p>
      <h1 class="pricing__title">Un plan para gestionar tus citas</h1>
      <p class="pricing__lead">
        Agenda, reservas y caja para barberos independientes.
      </p>
    </header>

    <section class="pricing__grid" aria-label="Plan mensual">
      <article class="pricing-card pricing-card--highlight">
        <span class="pricing-card__badge">Plan mensual</span>
        <h2 class="pricing-card__name">Barbero independiente</h2>
        <p class="pricing-card__price">
          $30.000 <span class="pricing-card__period">COP / mes</span>
        </p>
        <p class="pricing-card__tagline">
          Publica tus servicios y recibe solicitudes de cita desde tu propio enlace.
        </p>
        <ul class="pricing-card__features">
          <li v-for="item in included" :key="item">{{ item }}</li>
        </ul>
        <RouterLink class="btn btn--primary" to="/registro">Crear cuenta</RouterLink>
        <p class="pricing-card__note">
          El registro no realiza ningún cobro. El equipo coordina contigo la activación y el pago mensual.
        </p>
      </article>
    </section>

    <section class="pricing__faq">
      <h2 class="pricing__section-title">Preguntas frecuentes</h2>
      <div class="faq-list">
        <div v-for="faq in faqs" :key="faq.question" class="faq-item-static">
          <p class="faq-item-static__q">{{ faq.question }}</p>
          <p class="faq-item-static__a">{{ faq.answer }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pricing {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: var(--space-7) var(--space-4);
}

.pricing__hero {
  text-align: center;
  margin-bottom: var(--space-7);
}

.pricing__eyebrow {
  display: inline-block;
  font-size: var(--font-size-xs);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-primary-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 6px 14px;
  margin-bottom: var(--space-4);
  background: var(--color-surface);
}

.pricing__title {
  font-size: clamp(1.8rem, 5vw, 2.8rem);
  margin: 0 auto var(--space-3);
  max-width: 780px;
}

.pricing__lead {
  color: var(--color-text-muted);
  max-width: 600px;
  margin: 0 auto;
  font-size: var(--font-size-md);
}

.pricing__grid {
  display: grid;
  justify-items: center;
  margin-bottom: var(--space-8);
}

.pricing-card {
  position: relative;
  width: min(100%, 660px);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.pricing-card--highlight {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary), var(--shadow-md);
}

.pricing-card__badge {
  align-self: flex-start;
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  font-size: var(--font-size-xs);
  font-weight: 700;
  padding: 5px 12px;
  border-radius: var(--radius-pill);
}

.pricing-card__name { font-size: var(--font-size-lg); }
.pricing-card__price { font-size: clamp(2rem, 6vw, 2.8rem); font-weight: 800; }
.pricing-card__period { font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text-muted); }
.pricing-card__tagline, .pricing-card__note { color: var(--color-text-muted); font-size: var(--font-size-sm); }
.pricing-card__features { list-style: none; padding: 0; margin: var(--space-2) 0; display: grid; gap: var(--space-3); }
.pricing-card__features li { padding-left: 1.5rem; position: relative; }
.pricing-card__features li::before { content: '✓'; position: absolute; left: 0; color: var(--color-primary-soft); font-weight: 700; }
.pricing-card__note { margin: 0; text-align: center; }
.pricing__section-title { text-align: center; font-size: clamp(1.3rem, 3.5vw, 1.8rem); margin-bottom: var(--space-4); }
.faq-list { max-width: 760px; margin: 0 auto; display: grid; gap: var(--space-3); }
.faq-item-static { border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); padding: var(--space-4); background: var(--color-surface); }
.faq-item-static__q { font-weight: 700; margin-bottom: var(--space-2); }
.faq-item-static__a { color: var(--color-text-muted); font-size: var(--font-size-sm); }
</style>
