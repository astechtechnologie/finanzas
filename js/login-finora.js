/* Finora Login V2: mejoras de interfaz, no reemplaza la autenticación Firebase. */
(function () {
  'use strict';
  function iniciarInterfazLogin() {
    const pantalla = document.getElementById('authScreen');
    if (!pantalla) return;
    const login = document.getElementById('tabLogin');
    const registro = document.getElementById('tabRegistro');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const accion = document.getElementById('btnAuthAction');
    const error = document.getElementById('authError');
    const botonVisibilidad = pantalla.querySelector('.toggle-password');
    const titulo = document.getElementById('fi-login-title');
    const subtitulo = document.getElementById('fi-login-subtitle');
    const nota = document.getElementById('fi-login-password-note');
    if (!login || !registro || !email || !password || !accion) return;

    function sincronizarModo() {
      const esRegistro = registro.classList.contains('active');
      login.setAttribute('aria-selected', String(!esRegistro));
      registro.setAttribute('aria-selected', String(esRegistro));
      if (titulo) titulo.textContent = esRegistro ? 'Crea tu cuenta' : 'Bienvenido de nuevo';
      if (subtitulo) subtitulo.textContent = esRegistro
        ? 'Empieza a organizar tus finanzas en Finora.'
        : 'Inicia sesión para continuar con tus finanzas.';
      if (nota) nota.hidden = !esRegistro;
      password.setAttribute('autocomplete', esRegistro ? 'new-password' : 'current-password');
    }
    login.addEventListener('click', sincronizarModo);
    registro.addEventListener('click', sincronizarModo);
    sincronizarModo();

    // El archivo js/auth.js ya gestiona los clics de autenticar y recuperar.
    // Solo facilitamos el envío por Enter: NO hacemos otra llamada a Firebase.
    [email, password].forEach(function (campo) {
      campo.addEventListener('keydown', function (evento) {
        if (evento.key !== 'Enter' || evento.isComposing || evento.repeat) return;
        evento.preventDefault();
        accion.click();
      });
    });

    // js/auth.js conserva el control real del tipo password/text.
    if (botonVisibilidad) {
      botonVisibilidad.addEventListener('click', function () {
        const visible = password.type === 'text';
        botonVisibilidad.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
        botonVisibilidad.setAttribute('title', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
      });
    }

    // Feedback local para campos vacíos; los mensajes de Firebase siguen siendo
    // gestionados por auth.js, evitando interferir en sus promesas/eventos.
    accion.addEventListener('click', function () {
      if (email.value.trim() && password.value) return;
      if (error) {
        error.textContent = !email.value.trim()
          ? 'Ingresa tu correo electrónico.'
          : 'Ingresa tu contraseña.';
        error.classList.remove('hidden');
      }
      if (!email.value.trim()) email.focus();
      else password.focus();
    });
    // Borra solo el mensaje local al continuar escribiendo.
    [email, password].forEach(function (campo) {
      campo.addEventListener('input', function () {
        if (error && ['Ingresa tu correo electrónico.', 'Ingresa tu contraseña.'].includes(error.textContent)) {
          error.classList.add('hidden');
        }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarInterfazLogin);
  else iniciarInterfazLogin();
})();
