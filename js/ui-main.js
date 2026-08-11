(function() {
  const App = window.App;
  let mesSeleccionado = App.obtenerMesActual();
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

  // Navegación
  function cambiarVista(nombreVista) {
    Object.values(vistas).forEach(v => v.classList.remove('activa'));
    vistas[nombreVista].classList.add('activa');
    navItems.forEach(item => item.classList.remove('active'));
    document.querySelector([data-vista="vista${capitalize(nombreVista)}"]).classList.add('active');
    tituloSeccion.textContent = nombreVista === 'inicio' ? 'Inicio' : nombreVista.charAt(0).toUpperCase() + nombreVista.slice(1);

    if (nombreVista === 'presupuesto') App.cargarPantallaPresupuesto();
    if (nombreVista === 'categorias') renderizarListaCategorias();
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const vista = item.dataset.vista.replace('vista', '').toLowerCase();
      cambiarVista(vista);
    });
  });

  // Modal
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

  // Fecha hoy
  document.getElementById('fecha').value = new Date().toISOString().split('T')[0];

  // Renderizado de vista Inicio (resumen + gráficas + lista)
  function actualizarInicio(transacciones) {
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
      html += `<div class="movimiento-item">
        <span class="emoji">${emoji}</span>
        <div class="descripcion"><strong>${t.descripcion}</strong><small>${new Date(t.fecha+'T00:00:00').toLocaleDateString()}</small></div>
        <span class="${color} font-bold">${t.tipo === 'ingreso' ? '+' : '-'}$${t.monto.toFixed(2)}</span>
        <button onclick="App.eliminarTransaccion('${t.id}')" class="btn-delete">✕</button>
      </div>`;
    });
    lista.innerHTML = html;
    App.actualizarGraficas(filtradas, App.categoriasState || []);
  }

  // Llenar select de categorías (modal)
  function llenarSelectCategorias() {
    const select = document.getElementById('categoria');
    select.innerHTML = (App.categoriasState || []).map(c => <option value="${c.nombre}">${c.emoji} ${c.nombre}</option>).join('');
  }

  // Categorías (vista independiente)
  function renderizarListaCategorias() {
    const contenedor = document.getElementById('listaCategorias');
    if (!App.categoriasState || App.categoriasState.length === 0) {
      contenedor.innerHTML = '<p class="texto-secundario">No hay categorías</p>';
      return;
    }
    contenedor.innerHTML = App.categoriasState.map(c => `
      <div class="cat-item">
        <span>${c.emoji} ${c.nombre}</span>
        <button onclick="App.eliminarCategoria('${c.id}')" class="btn-delete">✕</button>
      </div>
    `).join('');
  }

  // Inicialización
  App.cargarDatosIniciales = function() {
    App.obtenerCategorias(cats => {
      App.categoriasState = cats;
      llenarSelectCategorias();
      renderizarListaCategorias();
      App.obtenerTransacciones(transacciones => actualizarInicio(transacciones));
    });
  };

  // Filtro mes desde la vista inicio (podemos añadir un selector pequeño)
  // Por simplicidad, mantendremos el filtro en la cabecera o como botón extra.
  // Agregaremos un input month en la vista inicio (oculto o integrado)
  // Para no complicar, lo dejamos como input tipo month en la parte superior.
})();
