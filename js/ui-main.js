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
      if (!vista) return;

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
      if (clave === 'categorias') renderizarListaCategorias();
    }

    navItems.forEach(item => {
      item.addEventListener('click', function() {
        cambiarVista(this.dataset.vista);
      });
    });

    // FAB y Modal
    fab.addEventListener('click', () => modal.classList.remove('hidden'));
    document.getElementById('btnCancelarModal').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('btnGuardarModal').addEventListener('click', () => {
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

    // Pestañas del modal
    const tabIngreso = document.getElementById('tabIngreso');
    const tabGasto = document.getElementById('tabGasto');
    tabIngreso.addEventListener('click', () => {
      tipoTransaccion = 'ingreso';
      tabIngreso.classList.add('active');
      tabGasto.classList.remove('active');
      llenarSelectCategorias();
    });
    tabGasto.addEventListener('click', () => {
      tipoTransaccion = 'gasto';
      tabGasto.classList.add('active');
      tabIngreso.classList.remove('active');
      llenarSelectCategorias();
    });

    document.getElementById('fecha').value = new Date().toISOString().split('T')[0];

    // Renderizado de inicio
    function actualizarInicio(transacciones) {
      mesSeleccionado = getMes();
      const filtradas = transacciones.filter(t => t.fecha && t.fecha.startsWith(mesSeleccionado));
      let ingresos = 0, gastos = 0;
      filtradas.forEach(t => t.tipo === 'ingreso' ? ingresos += t.monto : gastos += t.monto);
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
      filtradas.sort((a,b) => (b.fecha+b.id).localeCompare(a.fecha+a.id));
      filtradas.forEach(t => {
        const cat = cats.find(c => c.nombre === t.categoria);
        const emoji = cat ? cat.emoji : '📌';
        const color = t.tipo === 'ingreso' ? 'text-emerald-500' : 'text-red-500';
        html += '<div class="movimiento-item">' +
          '<span class="emoji">' + emoji + '</span>' +
          '<div class="descripcion"><strong>' + t.descripcion + '</strong><small>' + new Date(t.fecha+'T00:00:00').toLocaleDateString() + '</small></div>' +
          '<span class="' + color + ' font-bold">' + (t.tipo === 'ingreso' ? '+' : '-') + '$' + t.monto.toFixed(2) + '</span>' +
          '<button onclick="App.eliminarTransaccion(\'' + t.id + '\')" class="btn-delete">✕</button>' +
          '</div>';
      });
      lista.innerHTML = html;
      App.actualizarGraficas(filtradas, App.categoriasState || []);
    }

    // Llenar select según tipo de transacción
    function llenarSelectCategorias() {
      const select = document.getElementById('categoria');
      if (!select) return;
      const filtradas = (App.categoriasState || []).filter(c => c.tipo === tipoTransaccion);
      select.innerHTML = filtradas.map(c => '<option value="' + c.nombre + '">' + c.emoji + ' ' + c.nombre + '</option>').join('');
    }

    // Renderizar lista de categorías en la vista correspondiente
    function renderizarListaCategorias() {
      const contenedor = document.getElementById('listaCategorias');
      if (!contenedor) return;
      if (!App.categoriasState || App.categoriasState.length === 0) {
        contenedor.innerHTML = '<p class="texto-secundario">No hay categorías</p>';
        return;
      }
      contenedor.innerHTML = App.categoriasState.map(c =>
        '<div class="cat-item">' +
          '<span>' + c.emoji + ' ' + c.nombre + ' <small>(' + c.tipo + ')</small></span>' +
          '<button onclick="App.eliminarCategoria(\'' + c.id + '\')" class="btn-delete">✕</button>' +
        '</div>'
      ).join('');
    }

    App.cargarDatosIniciales = function() {
      App.obtenerCategorias(cats => {
        App.categoriasState = cats;
        llenarSelectCategorias();
        renderizarListaCategorias();
        App.obtenerTransacciones(transacciones => actualizarInicio(transacciones));
      });
    };

    // Formulario de categoría (vista categorías) ahora con tipo
    const formCat = document.getElementById('formCategoria');
    if (formCat) {
      // Añadir un select para el tipo (ingreso/gasto) en el formulario
      const tipoSelect = document.createElement('select');
      tipoSelect.id = 'tipoCategoria';
      tipoSelect.innerHTML = '<option value="gasto">Gasto</option><option value="ingreso">Ingreso</option>';
      formCat.insertBefore(tipoSelect, formCat.querySelector('button'));
    }
    if (formCat) {
      formCat.addEventListener('submit', function(e) {
        e.preventDefault();
        const nombre = document.getElementById('nombreCategoria').value.trim();
        const emoji = document.getElementById('emojiCategoria').value.trim() || '📌';
        const color = document.getElementById('colorCategoria').value;
        const tipo = document.getElementById('tipoCategoria') ? document.getElementById('tipoCategoria').value : 'gasto';
        if (!nombre) return;
        App.agregarCategoria(nombre, emoji, color, tipo);
        this.reset();
        document.getElementById('colorCategoria').value = '#10b981';
        document.getElementById('emojiCategoria').value = '';
      });
    }
  });
})();
