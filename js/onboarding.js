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
    const onboardingVisto = localStorage.getItem('onboarding_completado');
    if (!onboardingVisto && App.auth && App.auth.currentUser) {
      mostrarOnboarding();
    } else {
      // Si ya lo vio, aseguramos que la vista inicio esté activa
      document.getElementById('vistaInicio').classList.add('activa');
    }

    // Navegación entre pasos
    document.querySelectorAll('[data-onboarding-next]').forEach(btn => {
      btn.addEventListener('click', function() {
        const pasoActual = document.querySelector('.onboarding-step.active');
        const pasoNum = parseInt(pasoActual.dataset.step);
        pasoActual.classList.remove('active');
        const siguiente = document.querySelector('[data-step="' + (pasoNum + 1) + '"]');
        if (siguiente) siguiente.classList.add('active');
      });
    });

    document.querySelectorAll('[data-onboarding-skip]').forEach(btn => {
      btn.addEventListener('click', ocultarOnboarding);
    });

    document.querySelector('[data-onboarding-finish]').addEventListener('click', ocultarOnboarding);
  });
})();
