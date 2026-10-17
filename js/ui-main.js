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
    App.cuentaActual = 'personal';

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
    var selectorCuenta = document.getElementById('selectorCuenta');

    if (!vistas.inicio) return;

    // ==================== SALUDO ====================
    const horaActual = new Date().getHours();
    let saludo = 'Buenos días';
    if (horaActual >= 12 && horaActual < 18) saludo = 'Buenas tardes';
    else if (horaActual >= 18) saludo = 'Buenas noches';
    const saludoEl = document.getElementById('saludoUsuario');
    if (saludoEl) saludoEl.textContent = saludo;

    // ==================== PRIVACIDAD ====================
    let ocultarMontos = localStorage.getItem('ocultarMontos') === 'true';
    const btnTogglePrivacidad = document.getElementById('btnTogglePrivacidad');
    const togglePrivacidadAjustes = document.getElementById('togglePrivacidadAjustes');

    function aplicarPrivacidad() {
      const elementos = document.querySelectorAll('.monto-sensible');
      const icono = btnTogglePrivacidad ? btnTogglePrivacidad.querySelector('i') : null;

      if (ocultarMontos) {
        elementos.forEach(el => {
          if (!el.dataset.valorOriginal) el.dataset.valorOriginal = el.textContent;
          el.textContent = '$ ******';
        });
        if (icono) icono.className = 'ph ph-eye-slash';
      } else {
        elementos.forEach(el => {
          if (el.dataset.valorOriginal) {
            el.textContent = el.dataset.valorOriginal;
            delete el.dataset.valorOriginal;
          }
        });
        if (icono) icono.className = 'ph ph-eye';
      }

      if (togglePrivacidadAjustes) togglePrivacidadAjustes.checked = ocultarMontos;
      localStorage.setItem('ocultarMontos', ocultarMontos);
    }

    if (btnTogglePrivacidad) {
      btnTogglePrivacidad.addEventListener('click', function() {
        ocultarMontos = !ocultarMontos;
        aplicarPrivacidad();
        App.obtenerTransacciones(function(t) { actualizarDashboard(t); }, App.cuentaActual);
      });
    }

    if (togglePrivacidadAjustes) {
      togglePrivacidadAjustes.addEventListener('change', function() {
        ocultarMontos = this.checked;
        aplicarPrivacidad();
        App.obtenerTransacciones(function(t) { actualizarDashboard(t); }, App.cuentaActual);
      });
    }
    setTimeout(aplicarPrivacidad, 100);

    // ==================== CUENTAS ====================
    function cargarCuentas() {
      App.obtenerCuentas(function(cuentas) {
        const select = document.getElementById('selectorCuenta');
        if (select) {
          select.innerHTML = cuentas.map(function(c) {
            return '<option value="' + c.id + '">' + c.nombre + '</option>';
          }).join('');

          if (!App.cuentaActual || App.cuentaActual === 'personal') {
            const personal = cuentas.find(function(c) { return c.nombre === 'Personal'; });
            if (personal) App.cuentaActual = personal.id;
            else if (cuentas.length > 0) App.cuentaActual = cuentas[0].id;
          }
          select.value = App.cuentaActual;
        }
        App.obtenerTransacciones(function(t) { actualizarDashboard(t); }, App.cuentaActual);
      });
    }

    if (selectorCuenta) {
      selectorCuenta.addEventListener('change', function() {
        App.cuentaActual = this.value;
        App.obtenerTransacciones(function(t) { actualizarDashboard(t); }, App.cuentaActual);
      });
    }

    function addListener(id, callback) {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', callback);
    }

    // ==================== NAVEGACIÓN ====================
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
      if (clave === 'categorias') renderizarListaCategorias();
      if (clave === 'admin') {
        cargarOrganizaciones();
        cargarUsuariosAdmin();
        cargarAuditoria();
        cargarEstadisticas();
      }
      setTimeout(aplicarPrivacidad, 50);
    }

    App.cambiarVista = function(nombre) { cambiarVista(nombre); };

    navItems.forEach(function(item) {
      item.addEventListener('click', function() { cambiarVista(this.dataset.vista); });
    });

    // ==================== ABRIR MODAL ====================
    function abrirModalTransaccion(tipo) {
      tipoTransaccion = tipo;
      
      // Actualizar pestañas visuales
      if (tipo === 'ingreso') {
        document.getElementById('tabIngreso')?.classList.add('active');
        document.getElementById('tabGasto')?.classList.remove('active');
      } else {
        document.getElementById('tabGasto')?.classList.add('active');
        document.getElementById('tabIngreso')?.classList.remove('active');
      }

      // Limpiar selección previa
      document.getElementById('categoria').value = '';
      
      // Dibujar chips
      renderizarChipsCategorias();
      
      // Mostrar modal
      modal?.classList.remove('hidden');
    }

    addListener('btnAccesoGasto', function() { abrirModalTransaccion('gasto'); });
    addListener('btnAccesoIngreso', function() { abrirModalTransaccion('ingreso'); });
    addListener('tabIngreso', function() { abrirModalTransaccion('ingreso'); });
    addListener('tabGasto', function() { abrirModalTransaccion('gasto'); });
    if (fab) fab.addEventListener('click', function() { abrirModalTransaccion('ingreso'); });

    addListener('btnAccesoPresupuesto', function() { cambiarVista('vistaPresupuesto'); });
    addListener('btnAccesoMetas', function() {
      cambiarVista('vistaPresupuesto');
      setTimeout(function() { document.getElementById('tabMetasAhorro')?.click(); }, 300);
    });

    if (filtroMes) {
      filtroMes.value = mesSeleccionado;
      filtroMes.addEventListener('change', function() {
        mesSeleccionado = filtroMes.value;
        App.obtenerTransacciones(function(t) { actualizarDashboard(t); }, App.cuentaActual);
      });
    }

    // ==================== GUARDAR TRANSACCIÓN ====================
    addListener('btnCancelarModal', function() { modal?.classList.add('hidden'); });
    addListener('btnCerrarModalX', function() { modal?.classList.add('hidden'); });
    
    function guardarTransaccion() {
      // LEER DIRECTAMENTE DEL BOTÓN ACTIVO (No del select oculto)
      const chipActivo = document.querySelector('#chipsCategorias .chip-categoria.activo');
      const cat = chipActivo ? chipActivo.dataset.nombre : '';

      const subcat = document.getElementById('subcategoria').value || null;
      const desc = document.getElementById('descripcion').value.trim();
      const montoLimpio = document.getElementById('monto').value.trim().replace(/\./g, '').replace(',', '.');
      const monto = parseFloat(montoLimpio) || 0;
      const fecha = document.getElementById('fecha').value;
      const metodoPago = document.getElementById('metodoPago').value || null;
      const cuentaId = App.cuentaActual;

      if (!cat) {
        alert('Por favor, selecciona una categoría tocando uno de los botones de arriba.');
        return;
      }
      if (!monto || monto <= 0) {
        alert('Por favor, escribe un monto mayor a 0.');
        return;
      }

      const descFinal = desc || 'Sin descripción';
      
      // Ejecutamos el guardado
      App.agregarTransaccion(tipoTransaccion, cat, subcat, descFinal, monto, fecha, metodoPago, cuentaId);
      
      // Limpiamos y cerramos
      if (modal) modal.classList.add('hidden');
      document.getElementById('descripcion').value = '';
      document.getElementById('monto').value = '';
      document.getElementById('categoria').value = '';
    }

    addListener('btnGuardarModalQuick', guardarTransaccion);

    // ==================== CHIPS DE CATEGORÍAS ====================
    function renderizarChipsCategorias() {
      const cont = document.getElementById('chipsCategorias');
      if (!cont) return;

      const cats = (App.categoriasState || []).filter(function(c) { return c.tipo === tipoTransaccion; });
      const selectHidden = document.getElementById('categoria');

      if (cats.length === 0) {
        cont.innerHTML = '<p class="texto-secundario text-sm">No hay categorías</p>';
        return;
      }

      let html = '';
      cats.forEach(function(c, index) {
        // El primer elemento se marca como activo visualmente por defecto
        const activo = index === 0 ? ' activo' : '';
        html += '<div class="chip-categoria' + activo + '" data-nombre="' + c.nombre + '">' +
          '<i class="ph ' + c.icono + '"></i>' +
          '<span>' + c.nombre + '</span>' +
          '</div>';
      });
      cont.innerHTML = html;

      // Actualizamos el select por si acaso, pero ya no dependemos de él
      if (cats.length > 0) selectHidden.value = cats[0].nombre;

      cont.querySelectorAll('.chip-categoria').forEach(function(chip) {
        chip.addEventListener('click', function() {
          cont.querySelectorAll('.chip-categoria').forEach(function(c) { c.classList.remove('activo'); });
          this.classList.add('activo');
          selectHidden.value = this.dataset.nombre;
          llenarSelectSubcategorias();
        });
      });
      
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

    // ==================== DASHBOARD ====================
    function actualizarDashboard(transacciones) {
      const filtradas = transacciones.filter(function(t) {
        return t.fecha && t.fecha.startsWith(mesSeleccionado) && (t.espacioId || 'personal') === App.cuentaActual;
      });

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

      if (ocultarMontos) {
        [elIngresos, elGastos, elBalance].forEach(el => {
          if (el) { el.dataset.valorOriginal = el.textContent; el.textContent = '$ ******'; }
        });
      }

      const lista = document.getElementById('listaTransacciones');
      if (!lista) return;
      if (filtradas.length === 0) {
        lista.innerHTML = '<p class="texto-secundario text-center">No hay movimientos</p>';
      } else {
        let html = '';
        filtradas.forEach(function(t) {
          const montoStr = '$' + App.formatearMonto(t.monto);
          html += '<div class="movimiento-item" style="display: flex; justify-content: space-between; align-items: center;">' +
            '<span>' + t.descripcion + '</span>' +
            '<div style="display: flex; align-items: center; gap: 10px;">' +
              '<span class="monto-sensible">' + (ocultarMontos ? '$ ******' : montoStr) + '</span>' +
              '<button class="btn-delete" data-id="' + t.id + '">✕</button>' +
            '</div>' +
            '</div>';
        });
        lista.innerHTML = html;

        lista.querySelectorAll('.btn-delete').forEach(function(btn) {
          btn.addEventListener('click', function() {
            if (confirm('¿Eliminar este movimiento?')) App.eliminarTransaccion(this.dataset.id);
          });
        });
      }
    }

    // ==================== LISTA DE CATEGORÍAS ====================
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
            '<div class="cat-detalles"><span class="cat-nombre">' + c.nombre + '</span><span class="cat-tipo ' + c.tipo + '">' + c.tipo + '</span></div>' +
          '</div>' +
          '<div class="categoria-acciones">' +
            '<button class="btn-delete-cat" data-id="' + c.id + '">✕</button>' +
          '</div>' +
        '</div>';
      });
      cont.innerHTML = html;

      cont.querySelectorAll('.btn-delete-cat').forEach(function(btn) {
        btn.addEventListener('click', function() { if (confirm('¿Eliminar esta categoría?')) App.eliminarCategoria(this.dataset.id); });
      });
    }

    // ==================== CARGA INICIAL ====================
    App.cargarDatosIniciales = function() {
      setTimeout(function() {
        if (typeof App.inicializarCategoriasPorDefecto === 'function') {
          App.inicializarCategoriasPorDefecto();
        }
      }, 1500); // Damos 1.5 segundos para que Firebase Auth esté listo
      
      cargarCuentas();

      App.obtenerCategorias(function(cats) {
        App.categoriasState = cats;
        renderizarListaCategorias();
      });
    };

    // ==================== FORM CREAR CATEGORÍAS ====================
    const formCat = document.getElementById('formCategoria');
    if (formCat) {
      formCat.addEventListener('submit', function(e) {
        e.preventDefault();
        const nombre = document.getElementById('nombreCategoria').value.trim();
        const icono = document.getElementById('iconoCategoria').value;
        const color = document.getElementById('colorCategoria').value;
        const tipo = document.getElementById('tipoCategoria').value;

        if (!nombre) return;

        App.agregarCategoria(nombre, icono, color, tipo).then(function() {
          App.obtenerCategorias(function(cats) { 
            App.categoriasState = cats; 
            renderizarListaCategorias();
          });
        });

        formCat.reset();
        document.getElementById('colorCategoria').value = '#e8c84c';
        document.getElementById('iconoCategoria').value = 'ph-house';
        document.getElementById('btnMostrarIconos').innerHTML = '<i class="ph ph-house"></i>';
      });
    }

  });
})();
