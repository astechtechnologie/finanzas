(function() {
  const App = window.App;
  const CLAVE_TEMA = 'tema_preferido';

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
    // Actualizar selector si existe
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

    // Escuchar cambios del sistema si está en modo sistema
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
      if (localStorage.getItem(CLAVE_TEMA) === 'system') aplicarTema('system');
    });

    // ============ Manejo de atajos (App Shortcuts) ============
    const params = new URLSearchParams(window.location.search);
    const accion = params.get('accion');
    if (accion === 'nuevo-gasto') {
      document.getElementById('modalTransaccion')?.classList.remove('hidden');
    } else if (accion === 'presupuesto') {
      document.querySelector('[data-vista="vistaPresupuesto"]')?.click();
    } else if (accion === 'metas') {
      document.querySelector('[data-vista="vistaPresupuesto"]')?.click();
      setTimeout(() => {
        document.getElementById('tabMetasAhorro')?.click();
      }, 300);
    }

    // Asegurar que el botón de toggle funciona
    const btnTema = document.getElementById('toggleTemaAjustes');
    if (btnTema) btnTema.addEventListener('click', App.toggleTema);
  });
})();
