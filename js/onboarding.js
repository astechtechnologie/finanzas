(function() {
  const App = window.App;

  function mostrarOnboarding() {
    const el = document.getElementById('vistaOnboarding');
    if (el) el.classList.add('activa');
    const inicio = document.getElementById('vistaInicio');
    if (inicio) inicio.classList.remove('activa');
  }

  function ocultarOnboarding() {
    const el = document.getElementById('vistaOnboarding');
    if (el) el.classList.remove('activa');
    const inicio = document.getElementById('vistaInicio');
    if (inicio) inicio.classList.add('activa');
    localStorage.setItem('onboarding_completado', 'true');
  }

  function configurarEventos() {
    document.querySelectorAll('[data-onboarding-next]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const paso = parseInt(this.dataset.onboardingNext);
        const actual = document.querySelector('.onboarding-step.active');
        if (actual) actual.classList.remove('active');
        const siguiente = document.querySelector('[data-step="' + paso + '"]');
        if (siguiente) siguiente.classList.add('active');
      });
    });
    document.querySelectorAll('[data-onboarding-skip]').forEach(function(btn) {
      btn.addEventListener('click', ocultarOnboarding);
    });
    const final = document.querySelector('[data-onboarding-finish]');
    if (final) final.addEventListener('click', ocultarOnboarding);
  }

  App.auth.onAuthStateChanged(function(user) {
    if (user) {
      const visto = localStorage.getItem('onboarding_completado');
      if (!visto) {
        mostrarOnboarding();
      } else {
        const inicio = document.getElementById('vistaInicio');
        if (inicio) inicio.classList.add('activa');
      }
      configurarEventos();
    }
  });
})();
