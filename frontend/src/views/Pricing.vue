<script setup>
const plans = [
  {
    name: 'Plan Barbero',
    price: '$9.900',
    period: 'por mes',
    tagline: 'Para el barbero independiente que quiere ordenar su agenda y sus cobros.',
    highlight: false,
    included: [
      'Agenda personal inteligente',
      'Reserva en línea para tus clientes',
      'Recordatorios automáticos',
      'Ficha e historial de clientes',
      'Cobros y cierre de caja diario',
      'Panel de ingresos básico',
      'Soporte por correo',
    ],
  },
  {
    name: 'Plan Barbería',
    price: '$24.900',
    period: 'por mes',
    tagline: 'Para locales con equipo: varios barberos, caja central e inventario.',
    highlight: true,
    badge: 'Más elegido',
    included: [
      'Todo lo del Plan Barbero',
      'Agenda de cada barbero del equipo',
      'Cuentas de empleado con permisos',
      'Comisiones por barbero',
      'Inventario de productos y alertas de stock',
      'Reportes e informes del negocio',
      'Soporte prioritario',
    ],
  },
]

const comparison = [
  { feature: 'Agenda personal', barbero: true, barberia: true },
  { feature: 'Reserva en línea para clientes', barbero: true, barberia: true },
  { feature: 'Recordatorios automáticos', barbero: true, barberia: true },
  { feature: 'Cobros y cierre de caja', barbero: true, barberia: true },
  { feature: 'Agenda por varios barberos', barbero: false, barberia: true },
  { feature: 'Roles de empleado y permisos', barbero: false, barberia: true },
  { feature: 'Comisiones por barbero', barbero: false, barberia: true },
  { feature: 'Inventario de productos', barbero: false, barberia: true },
  { feature: 'Reportes avanzados', barbero: false, barberia: true },
]

const faqs = [
  {
    question: '¿Hay permanencia mínima?',
    answer: 'No. Ambos planes son mensuales y puedes cancelar cuando quieras desde tu panel.',
  },
  {
    question: '¿Puedo cambiar de plan después?',
    answer: 'Sí, puedes subir o bajar de plan cuando quieras; el cambio se aplica en tu siguiente ciclo de facturación.',
  },
  {
    question: '¿Cuántos barberos admite el Plan Barbería?',
    answer: 'Los planes de mayor capacidad se cotizan según el tamaño del equipo. Escríbenos y te armamos una propuesta.',
  },
  {
    question: '¿Los clientes pagan algo por agendar?',
    answer: 'No. La reserva en línea es gratuita para tus clientes, siempre.',
  },
]
</script>

<template>
  <div class="pricing">
    <header class="pricing__hero">
      <p class="pricing__eyebrow">Precios</p>
      <h1 class="pricing__title">Planes que crecen con tu barbería</h1>
      <p class="pricing__lead">
        Empieza gratis, sin tarjeta de crédito. Cancela cuando quieras, sin permanencia.
      </p>
    </header>

    <section class="pricing__grid">
      <article
        v-for="plan in plans"
        :key="plan.name"
        class="pricing-card"
        :class="{ 'pricing-card--highlight': plan.highlight }"
      >
        <span v-if="plan.badge" class="pricing-card__badge">{{ plan.badge }}</span>
        <h2 class="pricing-card__name">{{ plan.name }}</h2>
        <p class="pricing-card__price">
          {{ plan.price }}<span class="pricing-card__period"> {{ plan.period }}</span>
        </p>
        <p class="pricing-card__tagline">{{ plan.tagline }}</p>
        <ul class="pricing-card__features">
          <li v-for="item in plan.included" :key="item">{{ item }}</li>
        </ul>
        <RouterLink
          class="btn"
          :class="plan.highlight ? 'btn--primary' : 'btn--secondary'"
          to="/register"
        >
          Empezar gratis
        </RouterLink>
      </article>
    </section>

    <section class="pricing__comparison">
      <h2 class="pricing__section-title">Comparación detallada</h2>
      <div class="comparison">
        <table class="comparison__table">
          <thead>
            <tr>
              <th>Función</th>
              <th>Barbero</th>
              <th>Barbería</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in comparison" :key="row.feature">
              <td>{{ row.feature }}</td>
              <td>
                <span :class="row.barbero ? 'comparison__yes' : 'comparison__no'">
                  {{ row.barbero ? 'Sí' : '—' }}
                </span>
              </td>
              <td>
                <span :class="row.barberia ? 'comparison__yes' : 'comparison__no'">
                  {{ row.barberia ? 'Sí' : '—' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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

.pricing__eyebrow,
.features__eyebrow {
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
  margin-bottom: var(--space-3);
}

.pricing__lead {
  color: var(--color-text-muted);
  max-width: 560px;
  margin: 0 auto;
  font-size: var(--font-size-md);
}

.pricing__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: var(--space-5);
  margin-bottom: var(--space-8);
}

.pricing-card {
  position: relative;
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
  position: absolute;
  top: -12px;
  left: var(--space-6);
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  font-size: var(--font-size-xs);
  font-weight: 700;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
}

.pricing-card__name {
  font-size: var(--font-size-md);
  color: var(--color-primary-soft);
}

.pricing-card__price {
  font-family: var(--font-display);
  font-size: var(--font-size-xl);
}

.pricing-card__period {
  font-family: var(--font-body);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.pricing-card__tagline {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  min-height: 44px;
}

.pricing-card__features {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  margin: var(--space-3) 0;
}

.pricing-card__features li::before {
  content: '✓ ';
  color: var(--color-accent);
}

.pricing-card .btn {
  margin-top: auto;
  width: 100%;
}

.pricing__section-title {
  font-size: clamp(1.3rem, 3.5vw, 1.8rem);
  text-align: center;
  margin-bottom: var(--space-5);
}

.pricing__comparison,
.pricing__faq {
  margin-bottom: var(--space-7);
}

.comparison {
  overflow-x: auto;
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.comparison__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
  min-width: 480px;
}

.comparison__table th,
.comparison__table td {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  border-bottom: 1px solid var(--color-border-soft);
}

.comparison__table th {
  color: var(--color-primary-soft);
  font-family: var(--font-body);
  font-weight: 700;
  font-size: var(--font-size-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.comparison__table tr:last-child td {
  border-bottom: none;
}

.comparison__yes {
  color: var(--color-accent);
  font-weight: 700;
}

.comparison__no {
  color: var(--color-text-muted);
}

.faq-list {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.faq-item-static__q {
  font-weight: 600;
  margin-bottom: var(--space-1);
}

.faq-item-static__a {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
</style>
