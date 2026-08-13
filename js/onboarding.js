(function() {
  const App = window.App;

  function mostrarOnboarding() {
    document.getElementById('vistaOnboarding').classList.add('activa');
    document.getElementById('vistaInicio').classList.remove('activa');
  }

  function ocultarOnboarding() {
    document.getElementById('vistaOnboarding').classList.remove('activa');
    document.getElementById('vistaInicio').classList.add('activa');
    localStorage.setItem('onboarding_completado', 'true');
  }

  function configurarEventosOnboarding() {
    document.querySelectorAll('[data-onboarding-next]').forEach(btn => {
      btn.addEventListener('click', function() {
        const paso = parseInt(this.dataset.onboardingNext);
        const pasoActual = document.querySelector('.onboarding-step.active');
        if (pasoActual) pasoActual.classList.remove('active');
        const siguiente = document.querySelector('[data-step="' + paso + '"]');
        if (siguiente) siguiente.classList.add('active');
      });
    });

    document.querySelectorAll('[data-onboarding-skip]').forEach(btn => {
      btn.addEventListener('click', ocultarOnboarding);
    });

    const botonFinal = document.querySelector('[data-onboarding-finish]');
    if (botonFinal) botonFinal.addEventListener('click', ocultarOnboarding);
  }

  // Escuchar cambios de autenticación
  App.auth.onAuthStateChanged(function(user) {
    if (user) {
      const visto = localStorage.getItem('onboarding_completado');
      if (!visto) {
        mostrarOnboarding();
      } else {
        // Si ya lo vio, asegurar que la vista inicio esté activa
        document.getElementById('vistaInicio').classList.add('activa');
      }
      // Configurar eventos del onboarding una vez que existan en el DOM
      configurarEventosOnboarding();
    }
  });
})();
