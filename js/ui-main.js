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

        const listaAjustes = document.getElementById('listaCuentasAjustes');
        if (listaAjustes) {
          let html = '';
          cuentas.forEach(function(c) {
            html += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;">';
            html += '<div style="display: flex; align-items: center; gap: 8px;"><i class="ph ph-bank" style="color: ' + (c.color || '#e8c84c') + ';"></i> <span style="font-size: 14px;">' + c.nombre + '</span></div>';
            if (c.nombre !== 'Personal') {
              html += '<button class="btn-delete-cuenta-ajustes" data-id="' + c.id + '" style="background: none; border: none; color: #ef4444; cursor: pointer;"><i class="ph ph-trash"></i></button>';
            }
            html += '</div>';
          });
          listaAjustes.innerHTML = html;

          listaAjustes.querySelectorAll('.btn-delete-cuenta-ajustes').forEach(function(btn) {
            btn.addEventListener('click', function() {
              if (confirm('¿Eliminar esta cuenta? Los movimientos asociados quedarán huérfanos.')) {
                App.eliminarCuenta(this.dataset.id).then(function() { cargarCuentas(); });
              }
            });
          });
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

    addListener('btnNuevaCuenta', function() {
      const nombre = prompt('Nombre de la nueva cuenta:');
      if (nombre) {
        const tipo = prompt('Tipo (personal/empresa/otro):', 'empresa');
        App.agregarCuenta(nombre, tipo, '#e8c84c').then(function() {
          cargarCuentas();
        });
      }
    });

    addListener('btnAgregarCuentaAjustes', function() {
      const input = document.getElementById('nuevaCuentaNombre');
      const nombre = input.value.trim();
      if (!nombre) return;
      App.agregarCuenta(nombre, 'personal', '#e8c84c').then(function() {
        input.value = '';
        cargarCuentas();
      });
    });

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
      
      setTimeout(aplicarPrivacidad, 50);
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

    // ==================== ABRIR MODAL ====================
    function abrirModalTransaccion(tipo) {
      tipoTransaccion = tipo;
      
      if (tipo === 'ingreso') {
        document.getElementById('tabIngreso')?.classList.add('active');
        document.getElementById('tabGasto')?.classList.remove('active');
      } else {
        document.getElementById('tabGasto')?.classList.add('active');
        document.getElementById('tabIngreso')?.classList.remove('active');
      }

      document.getElementById('categoria').value = '';
      renderizarChipsCategorias();
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
      
      App.agregarTransaccion(tipoTransaccion, cat, subcat, descFinal, monto, fecha, metodoPago, cuentaId);
      
      if (modal) modal.classList.add('hidden');
      document.getElementById('descripcion').value = '';
      document.getElementById('monto').value = '';
      document.getElementById('categoria').value = '';
    }

    addListener('btnGuardarModalQuick', guardarTransaccion);
    addListener('btnGuardarModal', guardarTransaccion);

    // ==================== NUEVA SUBCATEGORÍA ====================
    addListener('btnAgregarSubcategoria', function() {
      const catSeleccionada = document.getElementById('categoria').value;
      if (!catSeleccionada) {
        alert('Primero selecciona una categoría principal.');
        return;
      }

      const nombreSub = prompt('Nombre de la nueva subcategoría para "' + catSeleccionada + '":');
      if (!nombreSub || nombreSub.trim() === '') return;

      const subLimpia = nombreSub.trim().toLowerCase();

      App.agregarSubcategoria(catSeleccionada, subLimpia).then(function() {
        if (!App.subcategoriasPorCategoria[catSeleccionada]) {
          App.subcategoriasPorCategoria[catSeleccionada] = [];
        }
        if (!App.subcategoriasPorCategoria[catSeleccionada].includes(subLimpia)) {
          App.subcategoriasPorCategoria[catSeleccionada].push(subLimpia);
        }
        
        llenarSelectSubcategorias();
        document.getElementById('subcategoria').value = subLimpia;
        
        alert('Subcategoría agregada con éxito.');
      }).catch(function(error) {
        console.error(error);
        alert('Error al crear la subcategoría: ' + error.message);
      });
    });

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
        const activo = index === 0 ? ' activo' : '';
        html += '<div class="chip-categoria' + activo + '" data-nombre="' + c.nombre + '">' +
          '<i class="ph ' + c.icono + '"></i>' +
          '<span>' + c.nombre + '</span>' +
          '</div>';
      });
      cont.innerHTML = html;

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

    const fechaInput = document.getElementById('fecha');
    if (fechaInput) fechaInput.value = new Date().toISOString().split('T')[0];

    // ==================== EDITAR TRANSACCIÓN ====================
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

      if (!id || !cat || isNaN(monto)) return;

      const descFinal = desc || 'Sin descripción';
      App.actualizarTransaccion(id, { categoria: cat, subcategoria: subcat, descripcion: descFinal, monto: monto, fecha: fecha, metodoPago: metodoPago });
      modalEditar?.classList.add('hidden');
    });

    // ==================== EXPORTAR CSV ====================
    addListener('btnExportarCSV', function() {
      App.obtenerTransacciones(function(todas) {
        const filtradas = todas.filter(function(t) { return t.fecha && t.fecha.startsWith(mesSeleccionado) && (t.espacioId || 'personal') === App.cuentaActual; });
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
      }, App.cuentaActual);
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

    function llenarSelectMetodosPago() {
      const selectAgregar = document.getElementById('metodoPago');
      const selectEditar = document.getElementById('metodoPagoEditar');
      const filtroSelect = document.getElementById('filtroMetodoPago');

      let opciones = '<option value="">Sin método</option>';
      metodosPago.forEach(function(m) { opciones += '<option value="' + m.nombre + '">' + m.nombre + '</option>'; });

      if (selectAgregar) selectAgregar.innerHTML = opciones;
      if (selectEditar) selectEditar.innerHTML = opciones;
      if (filtroSelect) {
        filtroSelect.innerHTML = '<option value="">Todos los métodos</option>' + metodosPago.map(function(m) { return '<option value="' + m.nombre + '">' + m.nombre + '</option>'; }).join('');
      }
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

      App.obtenerLimitesCategorias(mesSeleccionado, function(limites) {
        const limitesGastos = limites.gastos || {};
        let totalPresupuesto = 0;
        Object.keys(limitesGastos).forEach(cat => totalPresupuesto += (limitesGastos[cat].limite || 0));
        if (totalPresupuesto > 0) {
          const porcentaje = (gastos / totalPresupuesto) * 100;
          const barraRapida = document.getElementById('barraPresupuestoRapida');
          const fill = document.getElementById('fillPresupuestoRapido');
          if (barraRapida && fill) {
            barraRapida.classList.remove('hidden');
            fill.style.width = Math.min(porcentaje, 100) + '%';
            fill.style.backgroundColor = porcentaje > 100 ? '#ff4444' : porcentaje > 80 ? '#f97316' : '#e8c84c';
          }
        }
      });

      const lista = document.getElementById('listaTransacciones');
      if (!lista) return;
      if (filtradas.length === 0) {
        lista.innerHTML = '<p class="texto-secundario text-center">No hay movimientos</p>';
      } else {
        let html = '';
        filtradas.forEach(function(t) {
          const montoStr = '$' + App.formatearMonto(t.monto);
          html += '<div class="movimiento-item" style="display: flex; justify-content: space-between; align-items: center;">' +
            '<div><span>' + t.descripcion + '</span>' + (t.subcategoria ? '<br><small style="color:#888;">' + t.categoria + ' / ' + t.subcategoria + '</small>' : '') + '</div>' +
            '<div style="display: flex; align-items: center; gap: 10px;">' +
              '<span class="monto-sensible">' + (ocultarMontos ? '$ ******' : montoStr) + '</span>' +
              '<button class="btn-edit-mov" data-id="' + t.id + '" data-tipo="' + t.tipo + '" data-cat="' + t.categoria + '" data-subcat="' + (t.subcategoria || '') + '" data-desc="' + t.descripcion + '" data-monto="' + t.monto + '" data-fecha="' + t.fecha + '" data-metodo="' + (t.metodoPago || '') + '" style="background: none; border: none; cursor: pointer; color: #666;"><i class="ph ph-pencil"></i></button>' +
              '<button class="btn-delete" data-id="' + t.id + '">✕</button>' +
            '</div>' +
            '</div>';
        });
        lista.innerHTML = html;

        lista.querySelectorAll('.btn-edit-mov').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const d = this.dataset;
            document.getElementById('idTransaccionEditar').value = d.id;
            document.getElementById('fechaEditar').value = d.fecha;
            document.getElementById('descripcionEditar').value = d.desc;
            document.getElementById('montoEditar').value = d.monto;
            
            const selectCatEdit = document.getElementById('categoriaEditar');
            const catsFiltradas = (App.categoriasState || []).filter(c => c.tipo === d.tipo);
            selectCatEdit.innerHTML = catsFiltradas.map(c => `<option value="${c.nombre}" ${c.nombre === d.cat ? 'selected' : ''}>${c.nombre}</option>`).join('');

            const selectMetodoEdit = document.getElementById('metodoPagoEditar');
            selectMetodoEdit.innerHTML = '<option value="">Sin método</option>' + metodosPago.map(m => `<option value="${m.nombre}" ${m.nombre === d.metodo ? 'selected' : ''}>${m.nombre}</option>`).join('');

            modalEditar?.classList.remove('hidden');
          });
        });

        lista.querySelectorAll('.btn-delete').forEach(function(btn) {
          btn.addEventListener('click', function() {
            if (confirm('¿Eliminar este movimiento?')) App.eliminarTransaccion(this.dataset.id);
          });
        });
      }

      if (typeof App.actualizarGraficaTendencia === 'function') App.actualizarGraficaTendencia(filtradas, mesSeleccionado);
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
      }, 1500); 
      
      cargarCuentas();

      App.obtenerCategorias(function(cats) {
        App.categoriasState = cats;
        
        // CARGAR SUBCATEGORÍAS EXISTENTES
        App.subcategoriasPorCategoria = {};
        cats.forEach(function(c) {
          if (c.subcategorias && Array.isArray(c.subcategorias)) {
            App.subcategoriasPorCategoria[c.nombre] = c.subcategorias;
          }
        });

        renderizarListaCategorias();

        App.obtenerMetodosPago(function(metodos) {
          metodosPago = metodos;
          llenarSelectMetodosPago();
        });

        App.obtenerTransacciones(function(t) { actualizarDashboard(t); }, App.cuentaActual);
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
        const idEditar = document.getElementById('idCategoriaEditar').value;

        if (!nombre) return;

        if (idEditar) {
          App.actualizarCategoria(idEditar, { 
            nombre: nombre.toLowerCase(), 
            icono: icono, 
            color: color, 
            tipo: tipo 
          }).then(function() {
            cancelarEdicionCategoria();
            App.obtenerCategorias(function(cats) { 
              App.categoriasState = cats; 
              renderizarListaCategorias(); 
              renderizarChipsCategorias(); 
            });
          });
        } else {
          App.agregarCategoria(nombre, icono, color, tipo).then(function() {
            App.obtenerCategorias(function(cats) { 
              App.categoriasState = cats; 
              renderizarChipsCategorias(); 
              renderizarListaCategorias();
            });
          });

          formCat.reset();
          document.getElementById('colorCategoria').value = '#e8c84c';
          document.getElementById('iconoCategoria').value = 'ph-house';
          document.getElementById('btnMostrarIconos').innerHTML = '<i class="ph ph-house"></i>';
        }
      });
    }

  });
})();
