// Interfaz principal (pantalla de inicio, formulario, lista, resumen, categorías)
(function() {
  const App = window.App;
  let tipoSeleccionado = 'ingreso';
  let mesSeleccionado = App.obtenerMesActual ? App.obtenerMesActual() : new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');

  // Referencias a elementos (se llenan en DOMContentLoaded)
  let elementos = {};

  function initDOMElements() {
    elementos = {
      filtroMes: document.getElementById('filtroMes'),
      totalIngresos: document.getElementById('totalIngresos'),
      totalGastos: document.getElementById('totalGastos'),
      balance: document.getElementById('balance'),
      listaTransacciones: document.getElementById('listaTransacciones'),
      categoriaSelect: document.getElementById('categoria'),
      formTransaccion: document.getElementById('formTransaccion'),
      fechaInput: document.getElementById('fecha'),
      btnAgregar: document.getElementById('btnAgregar'),
      tabIngreso: document.getElementById('tabIngreso'),
      tabGasto: document.getElementById('tabGasto'),
      panelCategorias: document.getElementById('panelCategorias'),
      listaCategorias: document.getElementById('listaCategorias'),
      formCategoria: document.getElementById('formCategoria'),
      btnCategorias: document.getElementById('btnCategorias'),
      toggleTema: document.getElementById('toggleTema')
    };
  }

  function actualizarInterfaz(transacciones) {
    const filtradas = transacciones.filter(t => t.fecha && t.fecha.startsWith(mesSeleccionado));
    let ingresos = 0, gastos = 0;
    filtradas.forEach(t => t.tipo === 'ingreso' ? ingresos += t.monto : gastos += t.monto);
    elementos.totalIngresos.textContent = '$' + ingresos.toFixed(2);
    elementos.totalGastos.textContent = '$' + gastos.toFixed(2);
    const balance = ingresos - gastos;
    const balanceEl = elementos.balance;
    balanceEl.textContent = '$' + balance.toFixed(2);
    balanceEl.className = 'text-4xl font-extrabold mt-1 ' + (balance >= 0 ? 'text-emerald-500' : 'text-red-500');

    // Lista de transacciones
    if (filtradas.length === 0) {
      elementos.listaTransacciones.innerHTML = '<p class="texto-secundario text-center py-4">No hay movimientos este mes</p>';
    } else {
      filtradas.sort((a, b) => (b.fecha + b.id).localeCompare(a.fecha + a.id));
      let html = '';
      const categorias = App.categoriasState || [];
      filtradas.forEach(t => {
        const cat = categorias.find(c => c.nombre === t.categoria);
        const emoji = cat ? cat.emoji : '📌';
        const colorBorde = t.tipo === 'ingreso' ? 'border-emerald-400' : 'border-red-400';
        const colorTexto = t.tipo === 'ingreso' ? 'text-emerald-500' : 'text-red-500';
        const signo = t.tipo === 'ingreso' ? '+' : '-';
        const fecha = new Date(t.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        html += '<div class="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border-l-4 ' + colorBorde + '">' +
          '<div class="text-2xl">' + emoji + '</div>' +
          '<div class="flex-1"><p class="font-medium">' + t.descripcion + '</p><p class="text-xs texto-secundario">' + fecha + ' · ' + t.categoria + '</p></div>' +
          '<div class="text-right"><p class="font-bold ' + colorTexto + '">' + signo + '$' + t.monto.toFixed(2) + '</p>' +
          '<button onclick="App.eliminarTransaccion(\'' + t.id + '\')" class="text-xs text-red-400 hover:text-red-600 mt-1">Eliminar</button></div>' +
          '</div>';
      });
      elementos.listaTransacciones.innerHTML = html;
    }
    App.actualizarGraficas(filtradas, App.categoriasState || []);
  }

  function llenarSelectCategorias() {
    const select = elementos.categoriaSelect;
    let opciones = '';
    (App.categoriasState || []).forEach(c => {
      opciones += '<option value="' + c.nombre + '">' + c.emoji + ' ' + c.nombre + '</option>';
    });
    select.innerHTML = opciones;
  }

  function renderizarListaCategorias() {
    if (!elementos.listaCategorias) return;
    if ((App.categoriasState || []).length === 0) {
      elementos.listaCategorias.innerHTML = '<p class="texto-secundario text-sm">No hay categorías</p>';
      return;
    }
    let html = '';
    App.categoriasState.forEach(c => {
      html += '<div class="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl">' +
        '<span class="font-medium">' + c.emoji + ' ' + c.nombre + '</span>' +
        '<button onclick="if(confirm(\'¿Eliminar categoría ' + c.nombre + '?\')) App.eliminarCategoria(\'' + c.id + '\')" class="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>' +
        '</div>';
    });
    elementos.listaCategorias.innerHTML = html;
  }

  // Función pública que se llama cuando los datos están listos
  App.cargarDatosIniciales = function() {
    App.obtenerCategorias(cats => {
      App.categoriasState = cats;
      llenarSelectCategorias();
      renderizarListaCategorias();
      App.obtenerTransacciones(transacciones => actualizarInterfaz(transacciones));
    });
  };

  // Eventos (se ejecutarán después del DOM)
  document.addEventListener('DOMContentLoaded', function() {
    initDOMElements();

    // Pestañas ingreso/gasto
    elementos.tabIngreso.addEventListener('click', () => {
      tipoSeleccionado = 'ingreso';
      elementos.tabIngreso.className = 'flex-1 py-2.5 rounded-lg font-semibold text-sm bg-white dark:bg-gray-700 shadow-sm';
      elementos.tabGasto.className = 'flex-1 py-2.5 rounded-lg font-semibold text-sm text-gray-500 dark:text-gray-400';
      elementos.btnAgregar.textContent = 'Agregar ingreso';
      elementos.btnAgregar.className = 'btn btn-primario w-full';
    });
    elementos.tabGasto.addEventListener('click', () => {
      tipoSeleccionado = 'gasto';
      elementos.tabGasto.className = 'flex-1 py-2.5 rounded-lg font-semibold text-sm bg-white dark:bg-gray-700 shadow-sm';
      elementos.tabIngreso.className = 'flex-1 py-2.5 rounded-lg font-semibold text-sm text-gray-500 dark:text-gray-400';
      elementos.btnAgregar.textContent = 'Agregar gasto';
      elementos.btnAgregar.className = 'btn btn-peligro w-full';
    });

    // Filtro de mes
    elementos.filtroMes.value = mesSeleccionado;
    elementos.filtroMes.addEventListener('change', () => {
      mesSeleccionado = elementos.filtroMes.value;
      if (App.auth.currentUser) App.obtenerTransacciones(transacciones => actualizarInterfaz(transacciones));
    });

    // Fecha por defecto hoy
    elementos.fechaInput.value = new Date().toISOString().split('T')[0];

    // Formulario transacción
    elementos.formTransaccion.addEventListener('submit', e => {
      e.preventDefault();
      const categoria = elementos.categoriaSelect.value;
      const descripcion = document.getElementById('descripcion').value.trim();
      const monto = document.getElementById('monto').value;
      const fecha = elementos.fechaInput.value;
      if (!descripcion || !monto || !categoria || !fecha) return;
      App.agregarTransaccion(tipoSeleccionado, categoria, descripcion, monto, fecha);
      e.target.reset();
      elementos.fechaInput.value = new Date().toISOString().split('T')[0];
      // mantener pestaña activa
      if (tipoSeleccionado === 'ingreso') elementos.tabIngreso.click();
      else elementos.tabGasto.click();
    });

    // Panel de categorías
    elementos.btnCategorias.addEventListener('click', () => {
      elementos.panelCategorias.classList.toggle('hidden');
      if (!elementos.panelCategorias.classList.contains('hidden')) renderizarListaCategorias();
    });

    elementos.formCategoria.addEventListener('submit', e => {
      e.preventDefault();
      const nombre = document.getElementById('nombreCategoria').value.trim();
      const emoji = document.getElementById('emojiCategoria').value.trim() || '📌';
      const color = document.getElementById('colorCategoria').value;
      if (!nombre) return;
      App.agregarCategoria(nombre, emoji, color);
      e.target.reset();
      document.getElementById('colorCategoria').value = '#10b981';
      document.getElementById('emojiCategoria').value = '';
    });

    // Tema oscuro (la función toggleTema se definirá en app.js o aquí, usamos la global)
    if (typeof App.toggleTema === 'function') {
      elementos.toggleTema.addEventListener('click', App.toggleTema);
    }
  });

  // Exponer algunas funciones para ui-presupuesto
  App.getMesSeleccionado = function() { return mesSeleccionado; };
  App.setMesSeleccionado = function(mes) { mesSeleccionado = mes; };
})();
