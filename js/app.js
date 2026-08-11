// Inicialización general y modo oscuro
(function() {
  const App = window.App;
  const CLAVE_TEMA = 'tema_oscuro';

  App.obtenerMesActual = function() {
    const ahora = new Date();
    return ahora.getFullYear() + '-' + String(ahora.getMonth() + 1).padStart(2, '0');
  };

  function aplicarTema(oscuro) {
    document.documentElement.setAttribute('data-theme', oscuro ? 'dark' : 'light');
    const btn = document.getElementById('toggleTema');
    if (btn) btn.textContent = oscuro ? '☀️' : '🌙';
    // Refrescar gráficas si hay usuario
    if (App.auth && App.auth.currentUser) {
      App.obtenerTransacciones(transacciones => {
        const mes = App.getMesSeleccionado ? App.getMesSeleccionado() : App.obtenerMesActual();
        const filtradas = transacciones.filter(t => t.fecha && t.fecha.startsWith(mes));
        App.actualizarGraficas(filtradas, App.categoriasState || []);
      });
    }
  }

  App.toggleTema = function() {
    const actual = document.documentElement.getAttribute('data-theme') === 'dark';
    const nuevo = !actual;
    localStorage.setItem(CLAVE_TEMA, nuevo ? 'dark' : 'light');
    aplicarTema(nuevo);
  };

  document.addEventListener('DOMContentLoaded', function() {
    const temaGuardado = localStorage.getItem(CLAVE_TEMA) || 'light';
    aplicarTema(temaGuardado === 'dark');
  });
})();
