(function() {
  const App = window.App;
  const CLAVE_TEMA = 'tema_oscuro';

  App.obtenerMesActual = () => {
    const ahora = new Date();
    return ahora.getFullYear() + '-' + String(ahora.getMonth() + 1).padStart(2, '0');
  };

  function aplicarTema(oscuro) {
    document.documentElement.setAttribute('data-theme', oscuro ? 'dark' : 'light');
    const btn = document.getElementById('toggleTemaAjustes');
    if (btn) btn.textContent = oscuro ? '☀️' : '🌙';
  }

  App.toggleTema = () => {
    const actual = document.documentElement.getAttribute('data-theme') === 'dark';
    const nuevo = !actual;
    localStorage.setItem(CLAVE_TEMA, nuevo ? 'dark' : 'light');
    aplicarTema(nuevo);
  };

  document.addEventListener('DOMContentLoaded', () => {
    const guardado = localStorage.getItem(CLAVE_TEMA) || 'light';
    aplicarTema(guardado === 'dark');
    document.getElementById('toggleTemaAjustes').addEventListener('click', App.toggleTema);
  });
})();
