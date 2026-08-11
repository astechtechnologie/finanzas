(function() {
  const App = window.App;

  function getMes() {
    return (typeof App.obtenerMesActual === 'function') ? App.obtenerMesActual() : new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0');
  }

  document.addEventListener('DOMContentLoaded', () => {
    let mesSeleccionado = getMes();
    let tipoTransaccion = 'ingreso';

    const vistas = {
      inicio: document.getElementById('vistaInicio'),
      presupuesto: document.getElementById('vistaPresupuesto'),
      categorias: document.getElementById('vistaCategorias'),
      ajustes: document.getElementById('vistaAjustes')
    };
    const navItems = document.querySelectorAll('.nav-item');
    const titulo = document.getElementById('tituloSeccion');
    const modal = document.getElementById('modalTransaccion');
    const modalEditar = document.getElementById('modalEditarTransaccion');
    const fab = document.getElementById('fabAgregar');
    const filtroMes = document.getElementById('filtroMesHeader');

    if (!vistas.inicio) return;

    function cambiarVista(nombre) {
      const clave = nombre.replace('vista','').toLowerCase();
      Object.values(vistas).forEach(v => v.classList.remove('activa'));
      vistas[clave].classList.add('activa');
      navItems.forEach(i => i.classList.remove('active'));
      document.querySelector([data-vista="${nombre}"]).classList.add('active');
      titulo.textContent = { inicio:'Inicio', presupuesto:'Presupuesto', categorias:'Categorías', ajustes:'Ajustes' }[clave];
      if (clave === 'presupuesto' && App.cargarPantallaPresupuesto) App.cargarPantallaPresupuesto();
      if (clave === 'categorias') renderizarListaCategorias();
    }
    navItems.forEach(i => i.addEventListener('click', () => cambiarVista(i.dataset.vista)));

    // Filtro de mes
    filtroMes.value = mesSeleccionado;
    filtroMes.addEventListener('change', () => {
      mesSeleccionado = filtroMes.value;
      if (App.auth.currentUser) App.obtenerTransacciones(t => actualizarInicio(t));
    });

    // FAB
    fab.addEventListener('click', () => modal.classList.remove('hidden'));

    // Modal Agregar
    document.getElementById('btnCancelarModal').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('btnGuardarModal').addEventListener('click', () => {
      const cat = document.getElementById('categoria').value;
      const desc = document.getElementById('descripcion').value.trim();
      const monto = document.getElementById('monto').value;
      const fecha = document.getElementById('fecha').value;
      if (!cat || !desc || !monto) return;
      App.agregarTransaccion(tipoTransaccion, cat, desc, monto, fecha);
      modal.classList.add('hidden');
      document.getElementById('descripcion').value = '';
      document.getElementById('monto').value = '';
    });

    // Pestañas tipo
    document.getElementById('tabIngreso').addEventListener('click', () => {
      tipoTransaccion = 'ingreso';
      document.getElementById('tabIngreso').classList.add('active');
      document.getElementById('tabGasto').classList.remove('active');
      llenarSelectCategorias();
    });
    document.getElementById('tabGasto').addEventListener('click', () => {
      tipoTransaccion = 'gasto';
      document.getElementById('tabGasto').classList.add('active');
      document.getElementById('tabIngreso').classList.remove('active');
      llenarSelectCategorias();
    });

    document.getElementById('fecha').value = new Date().toISOString().split('T')[0];

    // Modal Editar
    document.getElementById('btnCancelarEditar').addEventListener('click', () => modalEditar.classList.add('hidden'));
    document.getElementById('btnGuardarEditar').addEventListener('click', () => {
      const id = document.getElementById('idTransaccionEditar').value;
      const cat = document.getElementById('categoriaEditar').value;
      const desc = document.getElementById('descripcionEditar').value.trim();
      const monto = parseFloat(document.getElementById('montoEditar').value);
      const fecha = document.getElementById('fechaEditar').value;
      if (!id || !cat || !desc || isNaN(monto)) return;
      App.actualizarTransaccion(id, { categoria: cat, descripcion: desc, monto, fecha });
      modalEditar.classList.add('hidden');
    });

    // Exportar CSV
    document.getElementById('btnExportarCSV').addEventListener('click', () => {
      App.obtenerTransacciones(todas => {
        const filtradas = todas.filter(t => t.fecha && t.fecha.startsWith(mesSeleccionado));
        let csv = 'Tipo,Categoría,Descripción,Monto,Fecha\n';
        filtradas.forEach(t => {
          csv += ${t.tipo},${t.categoria},${t.descripcion},${t.monto},${t.fecha}\n;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finanzas-${mesSeleccionado}.csv;
        a.click();
        URL.revokeObjectURL(url);
      });
    });

    // Renderizado de inicio
    function actualizarInicio(transacciones) {
      const filtradas = transacciones.filter(t => t.fecha && t.fecha.startsWith(mesSeleccionado));
      let ingresos = 0, gastos = 0;
      filtradas.forEach(t => t.tipo === 'ingreso' ? ingresos += t.monto : gastos += t.monto);
      document.getElementById('totalIngresos').textContent = '$' + ingresos.toFixed(2);
      document.getElementById('totalGastos').textContent = '$' + gastos.toFixed(2);
      const balance = ingresos - gastos;
      const bel = document.getElementById('balance');
      bel.textContent = '$' + balance.toFixed(2);
      bel.className = balance >= 0 ? 'text-emerald-500' : 'text-red-500';

      const lista = document.getElementById('listaTransacciones');
      if (filtradas.length === 0) {
        lista.innerHTML = '<p class="texto-secundario text-center">No hay movimientos</p>';
      } else {
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
            <span class="${color} font-bold">${t.tipo==='ingreso'?'+':'-'}$${t.monto.toFixed(2)}</span>
            <button class="btn-editar" data-id="${t.id}" data-tipo="${t.tipo}" data-cat="${t.categoria}" data-desc="${t.descripcion}" data-monto="${t.monto}" data-fecha="${t.fecha}">✏️</button>
            <button class="btn-delete" data-id="${t.id}">✕</button>
          </div>`;
        });
        lista.innerHTML = html;
        // Eventos editar y eliminar
        lista.querySelectorAll('.btn-editar').forEach(b => b.addEventListener('click', function() {
          document.getElementById('idTransaccionEditar').value = this.dataset.id;
          document.getElementById('fechaEditar').value = this.dataset.fecha;
          document.getElementById('descripcionEditar').value = this.dataset.desc;
          document.getElementById('montoEditar').value = this.dataset.monto;
          // Llenar select de categorías con el tipo correspondiente
          const tipo = this.dataset.tipo;
          const selectEditar = document.getElementById('categoriaEditar');
          const filtradas = (App.categoriasState || []).filter(c => c.tipo === tipo);
          selectEditar.innerHTML = filtradas.map(c => <option value="${c.nombre}" ${c.nombre===this.dataset.cat?'selected':''}>${c.emoji} ${c.nombre}</option>).join('');
          document.getElementById('tabIngreso').classList.remove('active');
          document.getElementById('tabGasto').classList.remove('active');
          if (tipo === 'ingreso') document.getElementById('tabIngreso').classList.add('active');
          else document.getElementById('tabGasto').classList.add('active');
          modalEditar.classList.remove('hidden');
        }));
        lista.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', function() {
          if (confirm('¿Eliminar esta transacción?')) App.eliminarTransaccion(this.dataset.id);
        }));
      }

      // Gráfico de tendencia
      App.actualizarGraficaTendencia(transacciones, mesSeleccionado);
    }

    function llenarSelectCategorias() {
      const select = document.getElementById('categoria');
      if (!select) return;
      const filtradas = (App.categoriasState || []).filter(c => c.tipo === tipoTransaccion);
      select.innerHTML = filtradas.map(c => <option value="${c.nombre}">${c.emoji} ${c.nombre}</option>).join('');
    }

    function renderizarListaCategorias() {
      const cont = document.getElementById('listaCategorias');
      if (!cont) return;
      if (!App.categoriasState || App.categoriasState.length === 0) {
        cont.innerHTML = '<p class="texto-secundario">No hay categorías</p>';
        return;
      }
      cont.innerHTML = App.categoriasState.map(c => `
        <div class="cat-item">
          <span>${c.emoji} ${c.nombre} <small>(${c.tipo})</small></span>
          <button class="btn-delete" data-id="${c.id}">✕</button>
        </div>`).join('');
      cont.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', function() {
        App.eliminarCategoria(this.dataset.id);
      }));
    }

    App.cargarDatosIniciales = () => {
      App.obtenerCategorias(cats => {
        App.categoriasState = cats;
        llenarSelectCategorias();
        renderizarListaCategorias();
        App.obtenerTransacciones(t => actualizarInicio(t));
      });
    };

    // Formulario de categoría
    const formCat = document.getElementById('formCategoria');
    if (formCat) {
      formCat.addEventListener('submit', e => {
        e.preventDefault();
        const nombre = document.getElementById('nombreCategoria').value.trim();
        const emoji = document.getElementById('emojiCategoria').value.trim() || '📌';
        const color = document.getElementById('colorCategoria').value;
        const tipo = document.getElementById('tipoCategoria').value;
        if (!nombre) return;
        App.agregarCategoria(nombre, emoji, color, tipo);
        formCat.reset();
        document.getElementById('colorCategoria').value = '#10b981';
      });
    }
  });
})();
