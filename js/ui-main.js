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

    // ==================== ICONOS ====================
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

    function addListener(id, callback) {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', callback);
    }

    addListener('btnMostrarIconos', mostrarSelectorIconos);
    addListener('btnCerrarSelectorIconos', function() {
      document.getElementById('selectorIconosModal').classList.add('hidden');
    });

    const buscarIconoInput = document.getElementById('buscarIcono');
    if (buscarIconoInput) {
      buscarIconoInput.addEventListener('input', function() {
        generarListaIconos(this.value.trim().toLowerCase());
      });
    }

    // ==================== ACCESOS DIRECTOS ====================
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

    // ==================== FILTRO MES ====================
    if (filtroMes) {
      filtroMes.value = mesSeleccionado;
      filtroMes.addEventListener('change', function() {
        mesSeleccionado = filtroMes.value;
        if (App.auth.currentUser) App.obtenerTransacciones(function(t) { actualizarDashboard(t); });
      });
    }

    // ==================== FAB ====================
    if (fab) fab.addEventListener('click', function() { modal?.classList.remove('hidden'); });

    // ==================== MODALES ====================
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

    // ==================== EXPORTAR CSV ====================
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

    // ==================== MÉTODOS DE PAGO ====================
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

    // ==================== DASHBOARD ====================
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

    // ==================== CATEGORÍAS ====================
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

    function renderizarListaCategorias(filtroTexto = '', orden = 'nombre') {
      const cont = document.getElementById('listaCategorias');
      if (!cont) return;
      if (!App.categoriasState || App.categoriasState.length === 0) {
        cont.innerHTML = '<p class="texto-secundario text-center py-4">No hay categorías</p>';
        return;
      }
      let cats = App.categoriasState.slice();
      if (filtroTexto) cats = cats.filter(c => c.nombre.includes(filtroTexto.toLowerCase()));
      if (orden === 'nombre') cats.sort((a, b) => a.nombre.localeCompare(b.nombre));
      else if (orden === 'reciente') cats.sort((a, b) => (b.id || '').localeCompare(a.id || ''));

      let html = '';
      cats.forEach(function(c) {
        html += '<div class="cat-card">' +
          '<div class="cat-info">' +
            '<span class="cat-emoji"><i class="ph ' + c.icono + '"></i></span>' +
            '<div class="cat-detalles"><span class="cat-nombre">' + c.nombre + '</span><span class="cat-tipo ' + c.tipo + '">' + c.tipo + '</span></div>' +
          '</div>' +
          '<div class="categoria-acciones">' +
            '<button class="btn-editar-cat" data-id="' + c.id + '" data-nombre="' + c.nombre + '" data-icono="' + c.icono + '" data-color="' + c.color + '" data-tipo="' + c.tipo + '">✏️</button>' +
            '<button class="btn-delete-cat" data-id="' + c.id + '">✕</button>' +
          '</div>' +
        '</div>';
      });
      cont.innerHTML = html;

      cont.querySelectorAll('.btn-editar-cat').forEach(function(btn) {
        btn.addEventListener('click', function() { abrirEdicionCategoria(this.dataset); });
      });
      cont.querySelectorAll('.btn-delete-cat').forEach(function(btn) {
        btn.addEventListener('click', function() { if (confirm('¿Eliminar esta categoría?')) App.eliminarCategoria(this.dataset.id); });
      });
    }

    function abrirEdicionCategoria(datos) {
      const nombre = prompt('Nombre:', datos.nombre);
      if (!nombre) return;
      const tipo = prompt('Tipo (gasto/ingreso):', datos.tipo);
      if (!tipo) return;
      const color = prompt('Color (hex):', datos.color);
      if (!color) return;
      const icono = prompt('Icono (ej: ph-house):', datos.icono);
      if (!icono) return;
      App.actualizarCategoria(datos.id, { nombre: nombre.trim().toLowerCase(), tipo: tipo, color: color, icono: icono }).then(function() {
        App.obtenerCategorias(function(cats) { App.categoriasState = cats; renderizarListaCategorias(); });
      });
    }

    addListener('buscarCategoria', function() {
      renderizarListaCategorias(this.value, document.getElementById('ordenCategorias').value);
    });
    addListener('ordenCategorias', function() {
      App.guardarOrdenCategorias(this.value);
      renderizarListaCategorias(document.getElementById('buscarCategoria').value, this.value);
    });

    // Sugerencia automática
    const descripcionInput = document.getElementById('descripcion');
    if (descripcionInput) {
      descripcionInput.addEventListener('input', function() {
        const texto = this.value.toLowerCase();
        const sugerencias = {
          'comida': ['supermercado', 'restaurante', 'cena', 'almuerzo'],
          'transporte': ['uber', 'taxi', 'bus', 'gasolina'],
          'salud': ['medicina', 'farmacia', 'doctor'],
          'ocio': ['cine', 'juego', 'netflix']
        };
        let categoriaSugerida = '';
        (App.categoriasState || []).forEach(function(cat) {
          const palabras = sugerencias[cat.nombre] || [];
          palabras.forEach(function(palabra) { if (texto.includes(palabra)) categoriaSugerida = cat.nombre; });
        });
        if (categoriaSugerida) { document.getElementById('categoria').value = categoriaSugerida; llenarSelectSubcategorias(); }
      });
    }

    // ==================== ADMIN ====================
    function cargarOrganizaciones() {
      const cont = document.getElementById('listaOrganizaciones');
      if (!cont) return;
      App.obtenerOrganizaciones(function(orgs) {
        if (orgs.length === 0) { cont.innerHTML = '<p class="texto-secundario text-center py-2">Sin organizaciones</p>'; return; }
        let html = '';
        orgs.forEach(function(org) {
          html += '<div class="org-item"><span><i class="ph ph-building"></i> ' + org.nombre + '</span><button class="btn-eliminar-org" data-id="' + org.id + '">✕</button></div>';
        });
        cont.innerHTML = html;
        cont.querySelectorAll('.btn-eliminar-org').forEach(function(btn) {
          btn.addEventListener('click', function() { if (confirm('¿Eliminar organización?')) App.eliminarOrganizacion(this.dataset.id); });
        });
      });
    }

    function cargarUsuariosAdmin() {
      const cont = document.getElementById('listaUsuariosAdmin');
      if (!cont) return;
      App.obtenerUsuariosVinculados(function(usuarios) {
        if (usuarios.length === 0) { cont.innerHTML = '<p class="texto-secundario text-center py-4">No hay clientes vinculados</p>'; return; }
        let html = '';
        usuarios.forEach(function(usuario) {
          App.obtenerUsuarioPorId(usuario.uid, function(datos) {
            const rol = datos ? (datos.rol || 'normal') : 'normal';
            const activo = datos ? (datos.activo !== false) : true;
            usuario.rol = rol;
            usuario.activo = activo;

            App.obtenerTransaccionesDeUsuario(usuario.uid, function(transacciones) {
              const mesActual = getMes();
              let ingresos = 0, gastos = 0;
              transacciones.forEach(function(t) {
                if (t.fecha && t.fecha.startsWith(mesActual)) {
                  if (t.tipo === 'ingreso') ingresos += t.monto;
                  else gastos += t.monto;
                }
              });
              const balance = ingresos - gastos;
              const inicial = usuario.email.charAt(0).toUpperCase();

              html += '<div class="cliente-card">';
              html += '<div class="cliente-header"><div class="cliente-avatar">' + inicial + '</div><div class="cliente-info"><div class="cliente-nombre">' + usuario.email + '</div><div class="cliente-email">' + (activo ? 'Activo' : 'Inactivo') + '</div></div><span class="cliente-estado ' + (activo ? 'activo' : 'inactivo') + '">' + (activo ? 'Activo' : 'Inactivo') + '</span></div>';
              html += '<div class="cliente-metricas"><span>Ingresos: $' + App.formatearMonto(ingresos) + '</span><span>Gastos: $' + App.formatearMonto(gastos) + '</span><span>Balance: $' + App.formatearMonto(balance) + '</span></div>';
              html += '<div class="cliente-acciones">';
              html += '<button class="btn-ver-cliente" data-uid="' + usuario.uid + '"><i class="ph ph-eye"></i> Ver</button>';
              html += '<button class="btn-editar-rol" data-uid="' + usuario.uid + '" data-rol="' + rol + '"><i class="ph ph-user"></i> Rol</button>';
              html += '<button class="btn-toggle-estado" data-uid="' + usuario.uid + '" data-activo="' + activo + '"><i class="ph ph-power"></i> ' + (activo ? 'Desactivar' : 'Activar') + '</button>';
              html += '<button class="btn-eliminar-cliente" data-uid="' + usuario.uid + '"><i class="ph ph-trash"></i> Eliminar</button>';
              html += '</div></div>';

              cont.innerHTML = html;

              cont.querySelectorAll('.btn-eliminar-cliente').forEach(function(btn) {
                btn.addEventListener('click', function() { if (confirm('¿Eliminar cliente?')) App.eliminarVinculacion(this.dataset.uid); });
              });
              cont.querySelectorAll('.btn-ver-cliente').forEach(function(btn) {
                btn.addEventListener('click', function() { verDetalleUsuario(this.dataset.uid); });
              });
              cont.querySelectorAll('.btn-editar-rol').forEach(function(btn) {
                btn.addEventListener('click', function() {
                  const nuevoRol = this.dataset.rol === 'admin' ? 'normal' : 'admin';
                  if (confirm('¿Cambiar rol a ' + nuevoRol + '?')) App.actualizarRolUsuario(this.dataset.uid, nuevoRol);
                });
              });
              cont.querySelectorAll('.btn-toggle-estado').forEach(function(btn) {
                btn.addEventListener('click', function() {
                  const nuevoEstado = this.dataset.activo !== 'true';
                  App.actualizarEstadoUsuario(this.dataset.uid, nuevoEstado);
                });
              });
            });
          });
        });
      });
    }

    function verDetalleUsuario(usuarioUid) {
      const detalleCont = document.getElementById('detalleUsuarioAdmin');
      if (!detalleCont) return;
      App.obtenerUsuarioPorId(usuarioUid, function(datosUsuario) {
        if (!datosUsuario) return;
        App.obtenerTransaccionesDeUsuario(usuarioUid, function(transacciones) {
          const mesActual = getMes();
          let ingresos = 0, gastos = 0;
          const porCategoria = {};
          transacciones.forEach(function(t) {
            if (t.fecha && t.fecha.startsWith(mesActual)) {
              if (t.tipo === 'ingreso') ingresos += t.monto;
              else { gastos += t.monto; porCategoria[t.categoria] = (porCategoria[t.categoria] || 0) + t.monto; }
            }
          });
          const balance = ingresos - gastos;

          let html = '<div class="detalle-cliente">';
          html += '<div class="detalle-header"><div class="detalle-avatar">' + datosUsuario.email.charAt(0).toUpperCase() + '</div><div class="detalle-info"><div class="detalle-nombre">' + datosUsuario.email + '</div><div class="detalle-email">' + (datosUsuario.activo !== false ? 'Activo' : 'Inactivo') + '</div></div><button class="btn-eliminar-cliente" data-uid="' + usuarioUid + '"><i class="ph ph-x"></i></button></div>';
          html += '<div class="detalle-stats"><div class="detalle-stat"><i class="ph ph-money"></i><div class="detalle-stat-numero">$' + App.formatearMonto(ingresos) + '</div><span>Ingresos</span></div><div class="detalle-stat"><i class="ph ph-wallet"></i><div class="detalle-stat-numero">$' + App.formatearMonto(gastos) + '</div><span>Gastos</span></div><div class="detalle-stat"><i class="ph ph-chart-line"></i><div class="detalle-stat-numero">$' + App.formatearMonto(balance) + '</div><span>Balance</span></div></div>';
          html += '<div class="detalle-seccion"><h5><i class="ph ph-chart-pie"></i> Gastos por categoría</h5>';
          if (Object.keys(porCategoria).length === 0) html += '<p class="texto-secundario">Sin gastos este mes</p>';
          else Object.keys(porCategoria).forEach(function(cat) { html += '<div class="text-sm">' + cat + ': $' + App.formatearMonto(porCategoria[cat]) + '</div>'; });
          html += '</div>';
          html += '<div class="detalle-seccion"><h5><i class="ph ph-clock"></i> Últimas transacciones</h5>';
          const recientes = transacciones.slice(0, 5);
          if (recientes.length === 0) html += '<p class="texto-secundario">Sin transacciones</p>';
          else recientes.forEach(function(t) { html += '<div class="detalle-transaccion"><div class="detalle-transaccion-info"><div class="detalle-transaccion-descripcion">' + t.descripcion + '</div><div class="detalle-transaccion-categoria">' + t.categoria + '</div></div><div class="detalle-transaccion-monto">$' + App.formatearMonto(t.monto) + '</div></div>'; });
          html += '</div></div>';
          detalleCont.innerHTML = html;
        });
      });
    }

    function cargarAuditoria() {
      const cont = document.getElementById('listaAuditoria');
      if (!cont) return;
      App.obtenerAuditoria(function(registros) {
        if (registros.length === 0) { cont.innerHTML = '<p class="texto-secundario">Sin registros</p>'; return; }
        let html = '';
        registros.forEach(function(r) { html += '<div class="text-sm"><i class="ph ph-clock"></i> ' + r.accion + ' - ' + new Date(r.fecha).toLocaleString() + '</div>'; });
        cont.innerHTML = html;
      });
    }

    function cargarEstadisticas() {
      App.obtenerEstadisticasGlobales(function(est) {
        document.getElementById('statUsuarios').textContent = est.usuarios;
        document.getElementById('statTransacciones').textContent = est.transacciones;
        document.getElementById('statIngresos').textContent = '$' + App.formatearMonto(est.ingresos);
        document.getElementById('statGastos').textContent = '$' + App.formatearMonto(est.gastos);
      });
    }

    // ==================== CARGA INICIAL ====================
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
