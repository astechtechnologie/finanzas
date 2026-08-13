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

  document.addEventListener('DOMContentLoaded', function() {
    const visto = localStorage.getItem('onboarding_completado');
    if (!visto && App.auth && App.auth.currentUser) {
      mostrarOnboarding();
    } else {
      // Asegurar que la vista inicio esté activa
      document.getElementById('vistaInicio').classList.add('activa');
    }

    document.querySelectorAll('[data-onboarding-next]').forEach(btn => {
      btn.addEventListener('click', function() {
        const paso = parseInt(this.dataset.onboardingNext);
        document.querySelector('.onboarding-step.active').classList.remove('active');
        const siguiente = document.querySelector('[data-step="' + paso + '"]');
        if (siguiente) siguiente.classList.add('active');
      });
    });

    document.querySelectorAll('[data-onboarding-skip]').forEach(btn => {
      btn.addEventListener('click', ocultarOnboarding);
    });

    const botonFinal = document.querySelector('[data-onboarding-finish]');
    if (botonFinal) botonFinal.addEventListener('click', ocultarOnboarding);
  });
})();
