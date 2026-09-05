(function() {
  const App = window.App;
  const CLAVE_TEMA = 'tema_preferido';

  App.formatearMonto = function(monto) {
    return Number(monto).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  App.obtenerMesActual = function() {
    const ahora = new Date();
    return ahora.getFullYear() + '-' + String(ahora.getMonth() + 1).padStart(2, '0');
  };

  function aplicarTema(tema) {
    const root = document.documentElement;
    if (tema === 'system') {
      const sistemaOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', sistemaOscuro ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', tema);
    }
    const btn = document.getElementById('toggleTemaAjustes');
    if (btn) btn.textContent = root.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
  }

  App.toggleTema = function() {
    const actual = document.documentElement.getAttribute('data-theme');
    const nuevo = actual === 'dark' ? 'light' : 'dark';
    localStorage.setItem(CLAVE_TEMA, nuevo);
    aplicarTema(nuevo);
    const selector = document.getElementById('temaSelector');
    if (selector) selector.value = nuevo;
  };

  document.addEventListener('DOMContentLoaded', function() {
    const preferencia = localStorage.getItem(CLAVE_TEMA) || 'system';
    const selector = document.getElementById('temaSelector');
    if (selector) {
      selector.value = preferencia;
      selector.addEventListener('change', function() {
        localStorage.setItem(CLAVE_TEMA, this.value);
        aplicarTema(this.value);
      });
    }
    aplicarTema(preferencia);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
      if (localStorage.getItem(CLAVE_TEMA) === 'system') aplicarTema('system');
    });

    function manejarAccionDesdeHash() {
      const hash = window.location.hash.substring(1);
      if (!hash) return;
      const params = new URLSearchParams(hash);
      const accion = params.get('accion');
      if (accion === 'nuevo-gasto') {
        document.getElementById('modalTransaccion')?.classList.remove('hidden');
      } else if (accion === 'presupuesto') {
        document.querySelector('[data-vista="vistaPresupuesto"]')?.click();
      } else if (accion === 'metas') {
        document.querySelector('[data-vista="vistaPresupuesto"]')?.click();
        setTimeout(function() {
          document.getElementById('tabMetasAhorro')?.click();
        }, 300);
      }
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    manejarAccionDesdeHash();

    const btnTema = document.getElementById('toggleTemaAjustes');
    if (btnTema) btnTema.addEventListener('click', App.toggleTema);
  });
})();
