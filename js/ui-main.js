(function() {
  const App = window.App;

  function getMes() {
    return (typeof App.obtenerMesActual === 'function') ? App.obtenerMesActual() : new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
  }

  document.addEventListener('DOMContentLoaded', function() {
    let mesSeleccionado = getMes();
    let tipoTransaccion = 'ingreso';

    const vistas = {
      inicio: document.getElementById('vistaInicio'),
      presupuesto: document.getElementById('vistaPresupuesto'),
      categorias: document.getElementById('vistaCategorias'),
      ajustes: document.getElementById('vistaAjustes')
    };
    const navItems = document.querySelectorAll('.nav-item');
    const tituloSeccion = document.getElementById('tituloSeccion');
    const modal = document.getElementById('modalTransaccion');
    const fab = document.getElementById('fabAgregar');

    if (!vistas.inicio || !fab || !modal) {
      console.error('Elementos del shell no encontrados');
      return;
    }

    function normalizarVista(nombreVista) {
      return nombreVista.replace('vista', '').toLowerCase();
    }

    function cambiarVista(nombreVista) {
      const clave = normalizarVista(nombreVista);
      const vista = vistas[clave];
      if (!vista) {
        console.error('Vista no encontrada:', clave);
        return;
      }

      Object.values(vistas).forEach(v => v.classList.remove('activa'));
      vista.classList.add('activa');

      navItems.forEach(item => item.classList.remove('active'));
      const itemActivo = document.querySelector('[data-vista="' + nombreVista + '"]');
      if (itemActivo) itemActivo.classList.add('active');

      const titulos = { inicio: 'Inicio', presupuesto: 'Presupuesto', categorias: 'Categorías', ajustes: 'Ajustes' };
      tituloSeccion.textContent = titulos[clave];

      if (clave === 'presupuesto' && typeof App.cargarPantallaPresupuesto === 'function') {
        App.cargarPantallaPresupuesto();
      }
      if (clave === 'categorias') {
        renderizarListaCategorias();
      }
    }

    navItems.forEach(item => {
      item.addEventListener('click', function() {
        const vista = this.dataset.vista;
        cambiarVista(vista);
      });
    });

    // FAB y Modal
    fab.addEventListener('click', function() {
      modal.classList.remove('hidden');
    });

    document.getElementById('btnCancelarModal').addEventListener('click', function() {
      modal.classList.add('hidden');
    });

    document.getElementById('btnGuardarModal').addEventListener('click', function() {
      const categoria = document.getElementById('categoria').value;
      const descripcion = document.getElementById('descripcion').value.trim();
      const monto = document.getElementById('monto').value;
      const fecha = document.getElementById('fecha').value;
      if (!categoria || !descripcion || !monto) return;
      App.agregarTransaccion(tipoTransaccion, categoria, descripcion, monto, fecha);
      modal.classList.add('hidden');
      document.getElementById('descripcion').value = '';
      document.getElementById('monto').value = '';
    });

    document.getElementById('tabIngreso').addEventListener('click', function() {
      tipoTransaccion = 'ingreso';
      this.classList.add('active');
      document.getElementById('tabGasto').classList.remove('active');
    });
    document.getElementById('tabGasto').addEventListener('click', function() {
      tipoTransaccion = 'gasto';
      this.classList.add('active');
      document.getElementById('tabIngreso').classList.remove('active');
    });

    const fechaInput = document.getElementById('fecha');
    if (fechaInput) fechaInput.value = new Date().toISOString().split('T')[0];

    // ========== RENDERIZADO ==========
    function actualizarInicio(transacciones) {
      mesSeleccionado = getMes();
      const filtradas = transacciones.filter(function(t) {
        return t.fecha && t.fecha.startsWith(mesSeleccionado);
      });
      let ingresos = 0, gastos = 0;
      filtradas.forEach(function(t) {
        if (t.tipo === 'ingreso') ingresos += t.monto;
        else gastos += t.monto;
      });
      document.getElementById('totalIngresos').textContent = '$' + ingresos.toFixed(2);
      document.getElementById('totalGastos').textContent = '$' + gastos.toFixed(2);
      const balance = ingresos - gastos;
      const balanceEl = document.getElementById('balance');
      balanceEl.textContent = '$' + balance.toFixed(2);
      balanceEl.className = balance >= 0 ? 'text-emerald-500' : 'text-red-500';

      const lista = document.getElementById('listaTransacciones');
      if (filtradas.length === 0) {
        lista.innerHTML = '<p class="texto-secundario text-center">No hay movimientos</p>';
        return;
      }
      let html = '';
      const cats = App.categoriasState || [];
      filtradas.sort(function(a, b) { return (b.fecha + b.id).localeCompare(a.fecha + a.id); });
      filtradas.forEach(function(t) {
        const cat = cats.find(function(c) { return c.nombre === t.categoria; });
        const emoji = cat ? cat.emoji : '📌';
        const color = t.tipo === 'ingreso' ? 'text-emerald-500' : 'text-red-500';
        html += '<div class="movimiento-item">' +
          '<span class="emoji">' + emoji + '</span>' +
          '<div class="descripcion"><strong>' + t.descripcion + '</strong><small>' + new Date(t.fecha + 'T00:00:00').toLocaleDateString() + '</small></div>' +
          '<span class="' + color + ' font-bold">' + (t.tipo === 'ingreso' ? '+' : '-') + '$' + t.monto.toFixed(2) + '</span>' +
          '<button onclick="App.eliminarTransaccion(\'' + t.id + '\')" class="btn-delete">✕</button>' +
          '</div>';
      });
      lista.innerHTML = html;
      if (typeof App.actualizarGraficas === 'function') {
        App.actualizarGraficas(filtradas, App.categoriasState || []);
      }
    }

    function llenarSelectCategorias() {
      const select = document.getElementById('categoria');
      if (!select) return;
      select.innerHTML = (App.categoriasState || []).map(function(c) {
        return '<option value="' + c.nombre + '">' + c.emoji + ' ' + c.nombre + '</option>';
      }).join('');
    }

    function renderizarListaCategorias() {
      const contenedor = document.getElementById('listaCategorias');
      if (!contenedor) return;
      if (!App.categoriasState || App.categoriasState.length === 0) {
        contenedor.innerHTML = '<p class="texto-secundario">No hay categorías</p>';
        return;
      }
      contenedor.innerHTML = App.categoriasState.map(function(c) {
        return '<div class="cat-item">' +
          '<span>' + c.emoji + ' ' + c.nombre + '</span>' +
          '<button onclick="App.eliminarCategoria(\'' + c.id + '\')" class="btn-delete">✕</button>' +
          '</div>';
      }).join('');
    }

    App.cargarDatosIniciales = function() {
      App.obtenerCategorias(function(cats) {
        App.categoriasState = cats;
        llenarSelectCategorias();
        renderizarListaCategorias();
        App.obtenerTransacciones(function(transacciones) {
          actualizarInicio(transacciones);
        });
      });
    };

    // Formulario de categoría (vista categorías)
    var formCat = document.getElementById('formCategoria');
    if (formCat) {
      formCat.addEventListener('submit', function(e) {
        e.preventDefault();
        var nombre = document.getElementById('nombreCategoria').value.trim();
        var emoji = document.getElementById('emojiCategoria').value.trim() || '📌';
        var color = document.getElementById('colorCategoria').value;
        if (!nombre) return;
        App.agregarCategoria(nombre, emoji, color);
        this.reset();
        document.getElementById('colorCategoria').value = '#10b981';
        document.getElementById('emojiCategoria').value = '';
      });
    }
  });
})();
