(function() {
  const App = window.App;
  const CLAVE_TEMA = 'tema_oscuro';

  App.obtenerMesActual = function() {
    const ahora = new Date();
    return ahora.getFullYear() + '-' + String(ahora.getMonth() + 1).padStart(2, '0');
  };

  function aplicarTema(oscuro) {
    document.documentElement.setAttribute('data-theme', oscuro ? 'dark' : 'light');
    const btnTema = document.getElementById('toggleTemaAjustes');
    if (btnTema) btnTema.textContent = oscuro ? '☀️' : '🌙';
    // Refrescar gráficas si necesario
  }

  App.toggleTema = function() {
    const actual = document.documentElement.getAttribute('data-theme') === 'dark';
    const nuevo = !actual;
    localStorage.setItem(CLAVE_TEMA, nuevo ? 'dark' : 'light');
    aplicarTema(nuevo);
  };

  document.addEventListener('DOMContentLoaded', () => {
    const temaGuardado = localStorage.getItem(CLAVE_TEMA) || 'light';
    aplicarTema(temaGuardado === 'dark');
    document.getElementById('toggleTemaAjustes').addEventListener('click', App.toggleTema);
  });
})();
