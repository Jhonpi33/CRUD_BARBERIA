<template>
  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__brand">
        <p class="footer__logo">Elysia</p>
        <p class="footer__tagline">
          El software que automatiza y gestiona barberías: agenda, clientes, cobros e IA en un solo lugar.
        </p>
      </div>

      <div class="footer__col">
        <p class="footer__heading">Producto</p>
        <RouterLink to="/funciones">Funciones</RouterLink>
        <RouterLink to="/precios">Precios</RouterLink>
      </div>

      <div class="footer__col">
        <p class="footer__heading">Cuenta</p>
        <RouterLink to="/login">Iniciar sesión</RouterLink>
        <RouterLink to="/register">Crear cuenta</RouterLink>
        <RouterLink to="/recuperar-contrasena">Recuperar contraseña</RouterLink>
      </div>

      <div class="footer__col">
        <p class="footer__heading">Legal</p>
        <RouterLink to="/legal/privacidad">Política de privacidad</RouterLink>
        <RouterLink to="/legal/terminos">Términos del servicio</RouterLink>
      </div>
    </div>

    <p class="footer__copy">© {{ new Date().getFullYear() }} Elysia. Todos los derechos reservados.</p>
  </footer>
</template>
