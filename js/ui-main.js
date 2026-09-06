(function() {
  const App = window.App;

  function getMes() {
    return (typeof App.obtenerMesActual === 'function') ? App.obtenerMesActual() : new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
  }

  document.addEventListener('DOMContentLoaded', function() {
    var mesSeleccionado = getMes();
    var tipoTransaccion = 'ingreso';
    var metodosPago = [];
    App.subcategoriasPorCategoria = {};

    var vistas = {
      inicio: document.getElementById('vistaInicio'),
      presupuesto: document.getElementById('vistaPresupuesto'),
      categorias: document.getElementById('vistaCategorias'),
      ajustes: document.getElementById('vistaAjustes'),
      admin: document.getElementById('vistaAdmin')
    };
    var navItems = document.querySelectorAll('.nav-item');
    var titulo = document.getElementById('tituloSeccion');
    var modal = document.getElementById('modalTransaccion');
    var modalEditar = document.getElementById('modalEditarTransaccion');
    var fab = document.getElementById('fabAgregar');
    var filtroMes = document.getElementById('filtroMesHeader');

    if (!vistas.inicio) return;

    function cambiarVista(nombreVista) {
      const clave = nombreVista.replace('vista', '').toLowerCase();
      Object.keys(vistas).forEach(function(key) {
        if (vistas[key]) vistas[key].classList.remove('activa');
      });
      if (vistas[clave]) vistas[clave].classList.add('activa');
      navItems.forEach(function(item) { item.classList.remove('active'); });
      const itemActivo = document.querySelector('[data-vista="' + nombreVista + '"]');
      if (itemActivo) itemActivo.classList.add('active');
      const titulos = { inicio: 'Inicio', presupuesto: 'Presupuesto', categorias: 'Categorías', ajustes: 'Ajustes', admin: 'Admin' };
      if (titulo) titulo.textContent = titulos[clave] || 'Inicio';
      if (clave === 'presupuesto' && typeof App.cargarPantallaPresupuesto === 'function') App.cargarPantallaPresupuesto();
      if (clave === 'categorias') {
        App.obtenerLimitesCategorias(mesSeleccionado, function(limites) {
          App.subcategoriasPorCategoria = {};
          const gastos = limites.gastos || {};
          Object.keys(gastos).forEach(function(cat) {
            App.subcategoriasPorCategoria[cat] = Object.keys(gastos[cat].subcategorias || {});
          });
          renderizarListaCategorias();
        });
      }
      if (clave === 'admin') {
        cargarOrganizaciones();
        cargarUsuariosAdmin();
        cargarAuditoria();
        cargarEstadisticas();
      }
    }

    App.cambiarVista = function(nombre) { cambiarVista(nombre); };

    navItems.forEach(function(item) {
      item.addEventListener('click', function() { cambiarVista(this.dataset.vista); });
    });

    // Iconos disponibles (más de 100)
    const iconosDisponibles = [
      'ph-house', 'ph-car', 'ph-bus', 'ph-airplane', 'ph-shopping-cart',
      'ph-graduation-cap', 'ph-heartbeat', 'ph-game-controller', 'ph-music-notes',
      'ph-books', 'ph-lightbulb', 'ph-drop', 'ph-device-mobile', 'ph-laptop',
      'ph-dog', 'ph-gift', 'ph-shirt', 'ph-receipt', 'ph-credit-card',
      'ph-bank', 'ph-money', 'ph-chart-line-up', 'ph-target', 'ph-star',
      'ph-coffee', 'ph-utensils', 'ph-film-slate', 'ph-barbell', 'ph-pill',
      'ph-phone', 'ph-envelope', 'ph-calendar', 'ph-clock', 'ph-map-pin',
      'ph-camera', 'ph-image', 'ph-video', 'ph-music-note', 'ph-microphone',
      'ph-headphones', 'ph-tv', 'ph-printer', 'ph-keyboard', 'ph-mouse',
      'ph-hard-drive', 'ph-cpu', 'ph-database', 'ph-cloud', 'ph-server',
      'ph-lock', 'ph-shield', 'ph-bell', 'ph-flag', 'ph-briefcase',
      'ph-wrench', 'ph-paint-brush', 'ph-scissors', 'ph-ruler', 'ph-bookmark',
      'ph-bug', 'ph-fire', 'ph-snowflake', 'ph-leaf', 'ph-tree',
      'ph-sun', 'ph-moon', 'ph-cloud-rain', 'ph-umbrella', 'ph-snow',
      'ph-cake', 'ph-cookie', 'ph-beer', 'ph-wine', 'ph-hamburger',
      'ph-fork-knife', 'ph-baby', 'ph-handshake', 'ph-users', 'ph-user',
      'ph-factory', 'ph-storefront', 'ph-truck', 'ph-train', 'ph-ship',
      'ph-bicycle', 'ph-motorbike', 'ph-rocket', 'ph-flame', 'ph-drop-half',
      'ph-currency-dollar', 'ph-currency-eur', 'ph-percent', 'ph-calculator',
      'ph-newspaper', 'ph-package', 'ph-cube', 'ph-trophy', 'ph-medal',
      'ph-notebook', 'ph-pencil', 'ph-eraser', 'ph-magnifying-glass', 'ph-filter',
      'ph-download', 'ph-upload', 'ph-share', 'ph-heart', 'ph-trash'
    ];

    function generarListaIconos(filtro = '') {
      const cont = document.getElementById('listaIconosCategoria');
      if (!cont) return;
      const filtrados = iconosDisponibles.filter(icon => icon.includes(filtro));
      cont.innerHTML = filtrados.map(icon => {
        return '<button type="button" data-icono="' + icon + '"><i class="ph ' + icon + '"></i></button>';
      }).join('');
      cont.querySelectorAll('button').forEach(function(btn) {
        btn.addEventListener('click', function() {
          const icono = this.dataset.icono;
          document.getElementById('iconoCategoria').value = icono;
          document.getElementById('btnMostrarIconos').innerHTML = '<i class="ph ' + icono + '"></i>';
          document.getElementById('selectorIconosModal').classList.add('hidden');
        });
      });
    }

    function mostrarSelectorIconos() {
      document.getElementById('selectorIconosModal').classList.remove('hidden');
      generarListaIconos();
    }

    addListener('btnMostrarIconos', mostrarSelectorIconos);
    addListener('btnCerrarSelectorIconos', function() {
      document.getElementById('selectorIconosModal').classList.add('hidden');
    });
    addListener('buscarIcono', function() {
      generarListaIconos(this.value.trim().toLowerCase());
    });

    function addListener(id, callback) {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', callback);
    }

    // Accesos directos
    addListener('btnAccesoGasto', function() {
      tipoTransaccion = 'gasto';
      document.getElementById('tabGasto')?.classList.add('active');
      document.getElementById('tabIngreso')?.classList.remove('active');
      llenarSelectCategorias();
      modal?.classList.remove('hidden');
    });
    addListener('btnAccesoIngreso', function() {
      tipoTransaccion = 'ingreso';
      document.getElementById('tabIngreso')?.classList.add('active');
      document.getElementById('tabGasto')?.classList.remove('active');
      llenarSelectCategorias();
      modal?.classList.remove('hidden');
    });
    addListener('btnAccesoPresupuesto', function() { cambiarVista('vistaPresupuesto'); });
    addListener('btnAccesoMetas', function() {
      cambiarVista('vistaPresupuesto');
      setTimeout(function() { document.getElementById('tabMetasAhorro')?.click(); }, 300);
    });

    // Filtro mes
    if (filtroMes) {
      filtroMes.value = mesSeleccionado;
      filtroMes.addEventListener('change', function() {
        mesSeleccionado = filtroMes.value;
        if (App.auth.currentUser) App.obtenerTransacciones(function(t) { actualizarDashboard(t); });
      });
    }

    // FAB
    if (fab) fab.addEventListener('click', function() { modal?.classList.remove('hidden'); });

    // Modales
    addListener('btnCancelarModal', function() { modal?.classList.add('hidden'); });
    addListener('btnGuardarModal', function() {
      const cat = document.getElementById('categoria').value;
      const subcat = document.getElementById('subcategoria').value || null;
      const desc = document.getElementById('descripcion').value.trim();
      const montoLimpio = document.getElementById('monto').value.trim().replace(/\./g, '').replace(',', '.');
      const monto = parseFloat(montoLimpio) || 0;
      const fecha = document.getElementById('fecha').value;
      const metodoPago = document.getElementById('metodoPago').value || null;
      if (!cat || !desc || !monto) return;
      App.agregarTransaccion(tipoTransaccion, cat, subcat, desc, monto, fecha, metodoPago);
      modal?.classList.add('hidden');
      document.getElementById('descripcion').value = '';
      document.getElementById('monto').value = '';
    });

    addListener('tabIngreso', function() {
      tipoTransaccion = 'ingreso';
      document.getElementById('tabIngreso')?.classList.add('active');
      document.getElementById('tabGasto')?.classList.remove('active');
      llenarSelectCategorias();
    });
    addListener('tabGasto', function() {
      tipoTransaccion = 'gasto';
      document.getElementById('tabGasto')?.classList.add('active');
      document.getElementById('tabIngreso')?.classList.remove('active');
      llenarSelectCategorias();
    });

    const fechaInput = document.getElementById('fecha');
    if (fechaInput) fechaInput.value = new Date().toISOString().split('T')[0];

    addListener('btnCancelarEditar', function() { modalEditar?.classList.add('hidden'); });
    addListener('btnGuardarEditar', function() {
      const id = document.getElementById('idTransaccionEditar').value;
      const cat = document.getElementById('categoriaEditar').value;
      const subcat = document.getElementById('subcategoriaEditar').value || null;
      const desc = document.getElementById('descripcionEditar').value.trim();
      const montoLimpio = document.getElementById('montoEditar').value.trim().replace(/\./g, '').replace(',', '.');
      const monto = parseFloat(montoLimpio) || 0;
      const fecha = document.getElementById('fechaEditar').value;
      const metodoPago = document.getElementById('metodoPagoEditar').value || null;
      if (!id || !cat || !desc || isNaN(monto)) return;
      App.actualizarTransaccion(id, { categoria: cat, subcategoria: subcat, descripcion: desc, monto: monto, fecha: fecha, metodoPago: metodoPago });
      modalEditar?.classList.add('hidden');
    });

    // Exportar CSV
    addListener('btnExportarCSV', function() {
      App.obtenerTransacciones(function(todas) {
        const filtradas = todas.filter(function(t) { return t.fecha && t.fecha.startsWith(mesSeleccionado); });
        let csv = 'Tipo,Categoría,Subcategoría,Descripción,Monto,Fecha,Método de pago\n';
        filtradas.forEach(function(t) {
          csv += t.tipo + ',' + t.categoria + ',' + (t.subcategoria || '') + ',' + t.descripcion + ',' + t.monto + ',' + t.fecha + ',' + (t.metodoPago || '') + '\n';
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'finanzas-' + mesSeleccionado + '.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
    });

    // Métodos de pago
    addListener('btnGestionarMetodos', function() {
      document.getElementById('panelMetodosPago')?.classList.toggle('hidden');
      renderizarListaMetodosPago();
    });
    addListener('btnAgregarMetodoPago', function() {
      const nombre = document.getElementById('nombreMetodoPago').value.trim();
      if (!nombre) return;
      App.agregarMetodoPago(nombre);
      document.getElementById('nombreMetodoPago').value = '';
    });

    function renderizarListaMetodosPago() {
      const lista = document.getElementById('listaMetodosPago');
      if (!lista) return;
      if (metodosPago.length === 0) { lista.innerHTML = '<p class="texto-secundario">No hay métodos de pago</p>'; return; }
      let html = '';
      metodosPago.forEach(function(m) {
        html += '<div class="metodo-pago-item"><span>' + m.nombre + '</span><button class="btn-delete" data-id="' + m.id + '">✕</button></div>';
      });
      lista.innerHTML = html;
      lista.querySelectorAll('.btn-delete').forEach(function(btn) {
        btn.addEventListener('click', function() { App.eliminarMetodoPago(this.dataset.id); });
      });
    }

    // Dashboard
    function actualizarDashboard(transacciones) {
      const filtradas = transacciones.filter(function(t) { return t.fecha && t.fecha.startsWith(mesSeleccionado); });
      let ingresos = 0, gastos = 0;
      filtradas.forEach(function(t) { t.tipo === 'ingreso' ? ingresos += t.monto : gastos += t.monto; });
      const elIngresos = document.getElementById('totalIngresos');
      const elGastos = document.getElementById('totalGastos');
      const elBalance = document.getElementById('balance');
      if (elIngresos) elIngresos.textContent = '$' + App.formatearMonto(ingresos);
      if (elGastos) elGastos.textContent = '$' + App.formatearMonto(gastos);
      const balance = ingresos - gastos;
      if (elBalance) {
        elBalance.textContent = '$' + App.formatearMonto(balance);
        elBalance.className = balance >= 0 ? 'text-emerald-500' : 'text-red-500';
      }
      const kpiPromedio = document.getElementById('kpiPromedioDiario');
      if (kpiPromedio) kpiPromedio.textContent = '$' + App.formatearMonto(0);
      const lista = document.getElementById('listaTransacciones');
      if (!lista) return;
      if (filtradas.length === 0) { lista.innerHTML = '<p class="texto-secundario text-center">No hay movimientos</p>'; }
      else {
        let html = '';
        filtradas.forEach(function(t) {
          html += '<div class="movimiento-item"><span>' + t.descripcion + '</span><span>$' + App.formatearMonto(t.monto) + '</span></div>';
        });
        lista.innerHTML = html;
      }
      if (typeof App.actualizarGraficaTendencia === 'function') App.actualizarGraficaTendencia(transacciones, mesSeleccionado);
    }

    // Funciones auxiliares
    function llenarSelectCategorias() {
      const select = document.getElementById('categoria');
      if (!select) return;
      const cats = (App.categoriasState || []).filter(function(c) { return c.tipo === tipoTransaccion; });
      select.innerHTML = cats.map(function(c) {
        return '<option value="' + c.nombre + '"><i class="ph ' + c.icono + '"></i> ' + c.nombre + '</option>';
      }).join('');
      llenarSelectSubcategorias();
    }

    function llenarSelectSubcategorias() {
      const select = document.getElementById('subcategoria');
      if (!select) return;
      const catSeleccionada = document.getElementById('categoria').value;
      const subcats = App.subcategoriasPorCategoria[catSeleccionada] || [];
      let html = '<option value="">Sin subcategoría</option>';
      subcats.forEach(function(sub) { html += '<option value="' + sub + '">' + sub + '</option>'; });
      select.innerHTML = html;
    }

    const selectCategoria = document.getElementById('categoria');
    if (selectCategoria) selectCategoria.addEventListener('change', llenarSelectSubcategorias);

    function renderizarListaCategorias() {
      const cont = document.getElementById('listaCategorias');
      if (!cont) return;
      if (!App.categoriasState || App.categoriasState.length === 0) {
        cont.innerHTML = '<p class="texto-secundario text-center py-4">No hay categorías</p>';
        return;
      }
      let html = '';
      App.categoriasState.forEach(function(c) {
        html += '<div class="cat-card">' +
          '<div class="cat-info">' +
            '<span class="cat-emoji"><i class="ph ' + c.icono + '"></i></span>' +
            '<div class="cat-detalles">' +
              '<span class="cat-nombre">' + c.nombre + '</span>' +
              '<span class="cat-tipo ' + c.tipo + '">' + c.tipo + '</span>' +
            '</div>' +
          '</div>' +
          '<button class="btn-delete-cat" data-id="' + c.id + '">✕</button>' +
        '</div>';
      });
      cont.innerHTML = html;
      cont.querySelectorAll('.btn-delete-cat').forEach(function(b) {
        b.addEventListener('click', function() {
          if (confirm('¿Eliminar esta categoría?')) App.eliminarCategoria(this.dataset.id);
        });
      });
    }

    // Admin (resumido, mantén las funciones que ya tienes)
    function cargarOrganizaciones() { /* ... tu código ... */ }
    function cargarUsuariosAdmin() { /* ... tu código ... */ }
    function cargarAuditoria() { /* ... tu código ... */ }
    function cargarEstadisticas() { /* ... tu código ... */ }

    // Carga inicial
    App.cargarDatosIniciales = function() {
      App.obtenerCategorias(function(cats) {
        App.categoriasState = cats;
        llenarSelectCategorias();
        renderizarListaCategorias();
        App.obtenerMetodosPago(function(metodos) { metodosPago = metodos; });
        App.obtenerTransacciones(function(t) { actualizarDashboard(t); });
        App.actualizarBotonAdmin();
      });
    };

    App.actualizarBotonAdmin = function() {
      App.obtenerRolUsuario(function(rol) {
        var btnAdmin = document.getElementById('btnAdmin');
        if (btnAdmin) {
          if (rol === 'admin') btnAdmin.classList.remove('hidden');
          else btnAdmin.classList.add('hidden');
        }
      });
    };

    // Formulario de categoría
    const formCat = document.getElementById('formCategoria');
    if (formCat) {
      formCat.addEventListener('submit', function(e) {
        e.preventDefault();
        const nombre = document.getElementById('nombreCategoria').value.trim();
        const icono = document.getElementById('iconoCategoria').value;
        const color = document.getElementById('colorCategoria').value;
        const tipo = document.getElementById('tipoCategoria').value;
        if (!nombre) return;
        App.agregarCategoria(nombre, icono, color, tipo);
        formCat.reset();
        document.getElementById('colorCategoria').value = '#e8c84c';
        document.getElementById('iconoCategoria').value = 'ph-house';
        document.getElementById('btnMostrarIconos').innerHTML = '<i class="ph ph-house"></i>';
      });
    }
  });
})();
