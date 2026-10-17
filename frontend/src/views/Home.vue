<script setup>
import AccordionItem from '../components/AccordionItem.vue'

const productOptions = [
  {
    key: 'barbero',
    title: 'Para ti, barbero',
    description:
      'Eres independiente y quieres dejar el cuaderno y los mensajes sueltos. Agenda, clientes y cobros desde el celular.',
    points: ['Agenda personal', 'Recordatorios automáticos', 'Historial de clientes'],
  },
  {
    key: 'barberia',
    title: 'Para tu barbería',
    description:
      'Tienes un equipo y necesitas verlo todo: turnos de cada barbero, caja del día, productos e inventario.',
    points: ['Agenda por barbero', 'Caja e informes', 'Inventario de productos'],
  },
]

const features = [
  {
    icon: '📅',
    title: 'Agenda inteligente',
    description: 'Turnos por barbero, duración por servicio y bloqueos automáticos de horarios.',
  },
  {
    icon: '🔔',
    title: 'Recordatorios automáticos',
    description: 'El cliente recibe la confirmación y el recordatorio de su turno sin que tú hagas nada.',
  },
  {
    icon: '👤',
    title: 'Ficha de cada cliente',
    description: 'Cortes preferidos, alergias, visitas y gasto histórico en una sola pantalla.',
  },
  {
    icon: '💰',
    title: 'Cobros y caja',
    description: 'Registra cobros en segundos y cierra la caja del día con un resumen claro.',
  },
  {
    icon: '💈',
    title: 'Equipo y comisiones',
    description: 'Suma barberos, reparte turnos y calcula comisiones sin hojas de cálculo.',
  },
  {
    icon: '📊',
    title: 'Reportes claros',
    description: 'Ingresos, horas pico y rendimiento por barbero para decidir con datos.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Crea tu cuenta',
    description: 'Solo necesitas nombre, correo y contraseña. Tarda menos de un minuto.',
  },
  {
    number: '02',
    title: 'Elige tu tipo de cuenta',
    description: 'Barbero individual o dueño de barbería. Elysia adapta todo el panel a tu caso.',
  },
  {
    number: '03',
    title: 'Configura tus servicios',
    description: 'Define cortes, duraciones y precios. Tu agenda queda lista para recibir turnos.',
  },
  {
    number: '04',
    title: 'Empieza a recibir turnos',
    description: 'Comparte tu agenda y deja que los recordatorios trabajen por ti.',
  },
]

const plans = [
  {
    name: 'Plan Barbero',
    price: '$9.900',
    period: '/mes',
    tagline: 'Para el barbero independiente',
    features: [
      'Agenda personal inteligente',
      'Recordatorios automáticos',
      'Ficha de clientes',
      'Cobros y cierre de caja',
    ],
    cta: 'Empezar gratis',
  },
  {
    name: 'Plan Barbería',
    price: '$24.900',
    period: '/mes',
    tagline: 'Para equipos y locales con varios barberos',
    features: [
      'Todo lo del Plan Barbero',
      'Agenda por cada barbero del equipo',
      'Roles de empleado y permisos',
      'Inventario de productos',
      'Reportes e informes de negocio',
    ],
    highlight: true,
    cta: 'Empezar gratis',
  },
]

const faqs = [
  {
    question: '¿Necesito instalar algo?',
    answer:
      'No. Elysia funciona desde el navegador de tu celular o computador. No hay apps que descargar ni actualizaciones que instalar.',
  },
  {
    question: '¿Mis clientes tienen que crear una cuenta?',
    answer:
      'No. Tus clientes agendan desde un enlace sencillo, sin registro ni contraseñas.',
  },
  {
    question: '¿Puedo usarlo con varios barberos?',
    answer:
      'Sí. El Plan Barbería está pensado para equipos: cada barbero tiene su agenda y tú ves el negocio completo en un solo lugar.',
  },
  {
    question: '¿Qué pasa con la IA? ¿Va a responder por mí?',
    answer:
      'La IA propone horarios y responde consultas repetitivas, pero siempre dentro de tus reglas: tú decides qué puede y qué no puede hacer.',
  },
  {
    question: '¿Cuándo puedo cancelar?',
    answer:
      'Cuando quieras, desde tu panel. Sin permanencia mínima ni preguntas incómodas.',
  },
]
</script>

<template>
  <div class="landing">
    <!-- 2. Hero principal -->
    <section class="hero">
      <p class="hero__eyebrow">Software de gestión para barberías</p>
      <h1 class="hero__title">
        Tu barbería,<br />
        <span class="hero__title-accent">automatizada de principio a fin.</span>
      </h1>
      <p class="hero__subtitle">
        Elysia agenda tus turnos, recuerda a tus clientes, controla tu caja y usa inteligencia
        artificial para que dejes de apagar incendios y te dediques a cortar pelo.
      </p>
      <div class="hero__actions">
        <RouterLink class="btn btn--primary btn--lg" to="/register">Crear cuenta gratis</RouterLink>
        <RouterLink class="btn btn--secondary btn--lg" to="/precios">Ver planes</RouterLink>
      </div>
      <p class="hero__note">Sin tarjeta de crédito. Configúralo en menos de 5 minutos.</p>
    </section>

    <!-- 3. Selector de producto -->
    <section class="section">
      <h2 class="section__title">Dos formas de usar Elysia</h2>
      <p class="section__lead">Elige tu perfil y el panel se adapta a cómo trabajas.</p>

      <div class="product-grid">
        <article v-for="option in productOptions" :key="option.key" class="product-card">
          <h3 class="product-card__title">{{ option.title }}</h3>
          <p class="product-card__description">{{ option.description }}</p>
          <ul class="product-card__points">
            <li v-for="point in option.points" :key="point">{{ point }}</li>
          </ul>
          <RouterLink class="product-card__link" to="/precios">
            Ver qué incluye &rarr;
          </RouterLink>
        </article>
      </div>
    </section>

    <!-- 4. Funcionalidades principales -->
    <section class="section section--alt">
      <h2 class="section__title">Todo lo que tu barbería necesita</h2>
      <p class="section__lead">Un solo lugar para agendar, cobrar, vender y analizar.</p>

      <div class="feature-grid">
        <article v-for="feature in features" :key="feature.title" class="feature-card">
          <span class="feature-card__icon" aria-hidden="true">{{ feature.icon }}</span>
          <h3 class="feature-card__title">{{ feature.title }}</h3>
          <p class="feature-card__description">{{ feature.description }}</p>
        </article>
      </div>

      <p class="section__cta">
        <RouterLink class="btn btn--secondary" to="/funciones">Explorar todas las funciones</RouterLink>
      </p>
    </section>

    <!-- 5. Sección de automatización con IA -->
    <section class="section ai-section">
      <div class="ai-section__content">
        <p class="ai-section__eyebrow">Inteligencia artificial</p>
        <h2 class="section__title">La IA atiende, tú cortas</h2>
        <p class="section__lead ai-section__lead">
          Elysia usa IA para responder consultas, sugerir horarios libres y detectar clientes
          que están por irse. Trabaja con tus reglas, nunca por su cuenta.
        </p>
        <ul class="ai-section__list">
          <li>Responde dudas frecuentes por WhatsApp las 24 horas.</li>
          <li>Sugiere el mejor horario disponible cuando un cliente pide turno.</li>
          <li>Alerta a los clientes que hace meses no visitan la barbería.</li>
        </ul>
      </div>
      <div class="ai-section__demo" aria-hidden="true">
        <p class="ai-chat__bubble ai-chat__bubble--client">¿Tienen turno mañana tarde?</p>
        <p class="ai-chat__bubble ai-chat__bubble--ia">
          ¡Hola Carlos! Sí: tengo 16:30 o 18:00 con Andrés. ¿Cuál te sirve?
        </p>
        <p class="ai-chat__bubble ai-chat__bubble--client">16:30, perfecto.</p>
        <p class="ai-chat__bubble ai-chat__bubble--ia">
          Listo ✅ Turno reservado. Te recuerdo mañana a las 10:00.
        </p>
      </div>
    </section>

    <!-- 6. Cómo funciona Elysia -->
    <section class="section section--alt">
      <h2 class="section__title">Cómo funciona Elysia</h2>
      <p class="section__lead">De cero a tu primera agenda en línea, en cuatro pasos.</p>

      <ol class="steps">
        <li v-for="step in steps" :key="step.number" class="step">
          <span class="step__number">{{ step.number }}</span>
          <h3 class="step__title">{{ step.title }}</h3>
          <p class="step__description">{{ step.description }}</p>
        </li>
      </ol>
    </section>

    <!-- 7. Comparación de planes (resumen) -->
    <section class="section">
      <h2 class="section__title">Planes simples, sin sorpresas</h2>
      <p class="section__lead">Empieza gratis. Crece cuando tu barbería lo pida.</p>

      <div class="plan-grid">
        <article
          v-for="plan in plans"
          :key="plan.name"
          class="plan-card"
          :class="{ 'plan-card--highlight': plan.highlight }"
        >
          <h3 class="plan-card__name">{{ plan.name }}</h3>
          <p class="plan-card__price">
            {{ plan.price }}<span class="plan-card__period">{{ plan.period }}</span>
          </p>
          <p class="plan-card__tagline">{{ plan.tagline }}</p>
          <ul class="plan-card__features">
            <li v-for="feature in plan.features" :key="feature">{{ feature }}</li>
          </ul>
          <RouterLink
            class="btn"
            :class="plan.highlight ? 'btn--primary' : 'btn--secondary'"
            to="/register"
          >
            {{ plan.cta }}
          </RouterLink>
        </article>
      </div>

      <p class="section__cta">
        <RouterLink class="btn btn--secondary" to="/precios">Comparar planes en detalle</RouterLink>
      </p>
    </section>

    <!-- 8. Preguntas frecuentes -->
    <section class="section section--alt">
      <h2 class="section__title">Preguntas frecuentes</h2>
      <p class="section__lead">Lo que suelen preguntarnos antes de empezar.</p>

      <div class="faq">
        <AccordionItem v-for="faq in faqs" :key="faq.question" :question="faq.question">
          {{ faq.answer }}
        </AccordionItem>
      </div>
    </section>

    <!-- CTA final -->
    <section class="section final-cta">
      <h2 class="section__title">Deja el cuaderno. Empieza con Elysia.</h2>
      <p class="section__lead">
        Crea tu cuenta hoy y ten tu barbería funcionando con agenda en línea esta misma semana.
      </p>
      <RouterLink class="btn btn--primary btn--lg" to="/register">Crear cuenta gratis</RouterLink>
    </section>
  </div>
</template>

<style scoped>
.landing {
  overflow: hidden;
}

/* ---------- Hero ---------- */
.hero {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: var(--space-8) var(--space-4);
  text-align: center;
}

.hero__eyebrow,
.ai-section__eyebrow {
  display: inline-block;
  font-size: var(--font-size-xs);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-primary-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 6px 14px;
  margin-bottom: var(--space-5);
  background: var(--color-surface);
}

.hero__title {
  font-size: clamp(2.2rem, 6vw, 3.6rem);
  margin-bottom: var(--space-5);
}

.hero__title-accent {
  color: var(--color-primary-soft);
  font-style: italic;
}

.hero__subtitle {
  max-width: 620px;
  margin: 0 auto var(--space-6);
  color: var(--color-text-muted);
  font-size: var(--font-size-md);
}

.hero__actions {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
  flex-wrap: wrap;
}

.hero__note {
  margin-top: var(--space-4);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

/* ---------- Secciones genéricas ---------- */
.section {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: var(--space-8) var(--space-4);
  text-align: center;
}

.section--alt {
  max-width: none;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border-soft);
  border-bottom: 1px solid var(--color-border-soft);
}

.section--alt > * {
  max-width: var(--container-max);
  margin-left: auto;
  margin-right: auto;
}

.section__title {
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  margin-bottom: var(--space-3);
}

.section__lead {
  color: var(--color-text-muted);
  max-width: 620px;
  margin: 0 auto var(--space-6);
}

.section__cta {
  margin-top: var(--space-6);
}

/* ---------- Selector de producto ---------- */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-5);
  text-align: left;
}

.product-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.product-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-3px);
}

.product-card__title {
  font-size: var(--font-size-lg);
  color: var(--color-primary-soft);
}

.product-card__description {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.product-card__points {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  margin: var(--space-2) 0;
}

.product-card__points li::before {
  content: '✓ ';
  color: var(--color-accent);
}

.product-card__link {
  margin-top: auto;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-primary-soft);
}

/* ---------- Funcionalidades ---------- */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-5);
  text-align: left;
}

.feature-card {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-5);
}

.feature-card__icon {
  font-size: 1.6rem;
  display: block;
  margin-bottom: var(--space-3);
}

.feature-card__title {
  font-size: var(--font-size-md);
  margin-bottom: var(--space-2);
}

.feature-card__description {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

/* ---------- IA ---------- */
.ai-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-7);
  align-items: center;
  text-align: left;
}

.ai-section__lead {
  margin-left: 0;
  text-align: left;
}

.ai-section__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
}

.ai-section__list li::before {
  content: '✦ ';
  color: var(--color-primary);
}

.ai-section__demo {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  box-shadow: var(--shadow-md);
}

.ai-chat__bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.ai-chat__bubble--client {
  align-self: flex-end;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
}

.ai-chat__bubble--ia {
  align-self: flex-start;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  color: var(--text);
}

/* ---------- Pasos ---------- */
.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-5);
  text-align: left;
  counter-reset: step;
}

.step {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-5);
}

.step__number {
  font-family: var(--font-display);
  font-size: var(--font-size-lg);
  color: var(--color-primary);
  display: block;
  margin-bottom: var(--space-2);
}

.step__title {
  font-size: var(--font-size-md);
  margin-bottom: var(--space-2);
}

.step__description {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

/* ---------- Planes ---------- */
.plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-5);
  text-align: left;
}

.plan-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.plan-card--highlight {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary), var(--shadow-md);
}

.plan-card__name {
  font-size: var(--font-size-md);
  color: var(--color-primary-soft);
}

.plan-card__price {
  font-family: var(--font-display);
  font-size: var(--font-size-xl);
}

.plan-card__period {
  font-family: var(--font-body);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.plan-card__tagline {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.plan-card__features {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  margin: var(--space-3) 0;
}

.plan-card__features li::before {
  content: '✓ ';
  color: var(--color-accent);
}

.plan-card .btn {
  margin-top: auto;
  width: 100%;
}

/* ---------- FAQ ---------- */
.faq {
  max-width: 720px;
  margin: 0 auto;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* ---------- CTA final ---------- */
.final-cta .btn {
  margin-top: var(--space-2);
}

/* ---------- Responsive ---------- */
@media (max-width: 820px) {
  .ai-section {
    grid-template-columns: 1fr;
  }

  .ai-section__lead {
    text-align: left;
  }
}
</style>
