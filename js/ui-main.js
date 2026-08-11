(function() {
  const App = window.App;

  // Esperar a que App.obtenerMesActual esté definido
  function getMes() {
    return (typeof App.obtenerMesActual === 'function') ? App.obtenerMesActual() : new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
  }

  let mesSeleccionado = getMes();
  let tipoTransaccion = 'ingreso';

  // Elementos del shell
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

  function cambiarVista(nombreVista) {
    Object.values(vistas).forEach(v => v.classList.remove('activa'));
    vistas[nombreVista].classList.add('activa');
    navItems.forEach(item => item.classList.remove('active'));
    document.querySelector('[data-vista="' + nombreVista + '"]').classList.add('active');
    const titulos = { inicio: 'Inicio', presupuesto: 'Presupuesto', categorias: 'Categorías', ajustes: 'Ajustes' };
    tituloSeccion.textContent = titulos[nombreVista];

    if (nombreVista === 'presupuesto' && typeof App.cargarPantallaPresupuesto === 'function') {
      App.cargarPantallaPresupuesto();
    }
    if (nombreVista === 'categorias') renderizarListaCategorias();
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const vista = item.dataset.vista;
      cambiarVista(vista);
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

  document.getElementById('tabIngreso').addEventListener('click', () => {
    tipoTransaccion = 'ingreso';
    document.getElementById('tabIngreso').classList.add('active');
    document.getElementById('tabGasto').classList.remove('active');
  });
  document.getElementById('tabGasto').addEventListener('click', () => {
    tipoTransaccion = 'gasto';
    document.getElementById('tabGasto').classList.add('active');
    document.getElementById('tabIngreso').classList.remove('active');
  });

  document.getElementById('fecha').value = new Date().toISOString().split('T')[0];

  function actualizarInicio(transacciones) {
    mesSeleccionado = getMes(); // refrescar por si cambió
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

  function llenarSelectCategorias() {
    const select = document.getElementById('categoria');
    select.innerHTML = (App.categoriasState || []).map(c => '<option value="' + c.nombre + '">' + c.emoji + ' ' + c.nombre + '</option>').join('');
  }

  function renderizarListaCategorias() {
    const contenedor = document.getElementById('listaCategorias');
    if (!App.categoriasState || App.categoriasState.length === 0) {
      contenedor.innerHTML = '<p class="texto-secundario">No hay categorías</p>';
      return;
    }
    contenedor.innerHTML = App.categoriasState.map(c => 
      '<div class="cat-item">' +
        '<span>' + c.emoji + ' ' + c.nombre + '</span>' +
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
})();
