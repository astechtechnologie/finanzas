// ui-main.js – Lógica de la interfaz principal
(function() {
  const App = window.App;

  function getMes() {
    return (typeof App.obtenerMesActual === 'function') ? App.obtenerMesActual() : new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
  }

  document.addEventListener('DOMContentLoaded', function() {
    let mesSeleccionado = getMes();
    let tipoTransaccion = 'ingreso';
    let metodosPago = [];
    App.subcategoriasPorCategoria = {};
    App.cuentaActual = 'personal';
    let modoActual = localStorage.getItem('espacioActivoId') || 'personal';
    let filtroTipoCategoria = 'gasto';
    let ocultarMontos = localStorage.getItem('ocultarMontos') === 'true';

    // === VARIABLES PARA EL NUEVO INICIO ===
    let tipoVerde = 'gasto';
    let filtroTiempo = 'mes';
    let offsetTiempo = 0;

    const vistas = {
      inicio: document.getElementById('vistaInicio'),
      presupuesto: document.getElementById('vistaPresupuesto'),
      categorias: document.getElementById('vistaCategorias'),
      ajustes: document.getElementById('vistaAjustes'),
      admin: document.getElementById('vistaAdmin')
    };

    const navItems = document.querySelectorAll('.nav-item');
    const titulo = document.getElementById('tituloSeccion');
    const modal = document.getElementById('modalTransaccion');
    const modalEditar = document.getElementById('modalEditarTransaccion');
    const fab = document.getElementById('fabAgregar');
    const selectorCuenta = document.getElementById('selectorCuenta');

    if (!vistas.inicio) return;

    // ==================== AUXILIARES ====================
    function addListener(id, callback) {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', callback);
    }

    let unsubscribeTransacciones = null;

    function recargarTransacciones() {
      if (unsubscribeTransacciones) unsubscribeTransacciones();
      // Traemos todas las transacciones de la cuenta, sin filtro de mes,
      // para poder calcular Día/Semana/Mes/Año localmente.
      unsubscribeTransacciones = App.obtenerTransacciones(
        function(t) { actualizarDashboard(t); },
        App.cuentaActual,
        null // Sin filtro de mes en Firestore
      );
    }

    // ==================== SALUDO ====================
    const horaActual = new Date().getHours();
    let saludo = 'Buenos días';
    if (horaActual >= 12 && horaActual < 18) saludo = 'Buenas tardes';
    else if (horaActual >= 18) saludo = 'Buenas noches';
    const saludoEl = document.getElementById('saludoUsuario');
    if (saludoEl) saludoEl.textContent = saludo;

    // ==================== PRIVACIDAD ====================
    function aplicarPrivacidad() {
      const elementos = document.querySelectorAll('.monto-sensible');
      const icono = document.getElementById('btnTogglePrivacidad')?.querySelector('i');
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
      const toggleAjustes = document.getElementById('togglePrivacidadAjustes');
      if (toggleAjustes) toggleAjustes.checked = ocultarMontos;
      localStorage.setItem('ocultarMontos', ocultarMontos);
    }

    addListener('btnTogglePrivacidad', function() {
      ocultarMontos = !ocultarMontos;
      aplicarPrivacidad();
      recargarTransacciones();
    });

    const togglePrivacidadAjustes = document.getElementById('togglePrivacidadAjustes');
    if (togglePrivacidadAjustes) {
      togglePrivacidadAjustes.addEventListener('change', function() {
        ocultarMontos = this.checked;
        aplicarPrivacidad();
        recargarTransacciones();
      });
    }

    setTimeout(aplicarPrivacidad, 100);

    // ==================== CUENTAS ====================
    function cargarCuentas() {
      App.obtenerCuentas(function(cuentas) {
        const select = document.getElementById('selectorCuenta');
        if (select) {
          select.innerHTML = cuentas.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
          if (!App.cuentaActual || App.cuentaActual === 'personal') {
            const personal = cuentas.find(c => c.nombre === 'Personal');
            if (personal) App.cuentaActual = personal.id;
            else if (cuentas.length > 0) App.cuentaActual = cuentas[0].id;
          }
          select.value = App.cuentaActual;
        }
        const listaAjustes = document.getElementById('listaCuentasAjustes');
        if (listaAjustes) {
          const fragment = document.createDocumentFragment();
          cuentas.forEach(c => {
            const div = document.createElement('div');
            div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;';
            div.innerHTML = `<div style="display: flex; align-items: center; gap: 8px;"><i class="ph ph-bank" style="color: ${c.color || '#e8c84c'};"></i> <span style="font-size: 14px;">${c.nombre}</span></div>`;
            if (c.nombre !== 'Personal') {
              const btn = document.createElement('button');
              btn.className = 'btn-delete-cuenta-ajustes';
              btn.dataset.id = c.id;
              btn.style.cssText = 'background: none; border: none; color: #ef4444; cursor: pointer;';
              btn.innerHTML = '<i class="ph ph-trash"></i>';
              btn.addEventListener('click', function() {
                if (confirm('¿Eliminar esta cuenta? Los movimientos asociados quedarán huérfanos.')) {
                  App.eliminarCuenta(this.dataset.id).then(cargarCuentas);
                }
              });
              div.appendChild(btn);
            }
            fragment.appendChild(div);
          });
          listaAjustes.innerHTML = '';
          listaAjustes.appendChild(fragment);
        }
        recargarTransacciones();
      });
    }

    if (selectorCuenta) {
      selectorCuenta.addEventListener('change', function() {
        App.cuentaActual = this.value;
        recargarTransacciones();
      });
    }

    addListener('btnNuevaCuenta', function() {
      const nombre = prompt('Nombre de la nueva cuenta:');
      if (nombre) {
        const tipo = prompt('Tipo (personal/empresa/otro):', 'empresa');
        App.agregarCuenta(nombre, tipo, '#e8c84c').then(cargarCuentas);
      }
    });

    addListener('btnAgregarCuentaAjustes', function() {
      const input = document.getElementById('nuevaCuentaNombre');
      const nombre = input.value.trim();
      if (!nombre) return;
      App.agregarCuenta(nombre, 'personal', '#e8c84c').then(() => {
        input.value = '';
        cargarCuentas();
      });
    });

    // ==================== NAVEGACIÓN ====================
    function cambiarVista(nombreVista) {
      const clave = nombreVista.replace('vista', '').toLowerCase();
      Object.keys(vistas).forEach(key => vistas[key]?.classList.remove('activa'));
      vistas[clave]?.classList.add('activa');

      navItems.forEach(item => item.classList.remove('active'));
      document.querySelector(`[data-vista="${nombreVista}"]`)?.classList.add('active');

      const titulos = { inicio: 'Inicio', presupuesto: 'Presupuesto', categorias: 'Categorías', ajustes: 'Ajustes', admin: 'Admin' };
      if (titulo) titulo.textContent = titulos[clave] || 'Inicio';

      if (clave === 'presupuesto' && typeof App.cargarPantallaPresupuesto === 'function') App.cargarPantallaPresupuesto();

      if (clave === 'categorias') {
        App.obtenerLimitesCategorias(mesSeleccionado, function(limites) {
          App.subcategoriasPorCategoria = {};
          const gastos = limites.gastos || {};
          Object.keys(gastos).forEach(cat => {
            App.subcategoriasPorCategoria[cat] = Object.keys(gastos[cat].subcategorias || {});
          });
          renderizarListaCategorias();
        });
      }

      if (clave === 'admin') {
        if (typeof App.cargarOrganizaciones === 'function') App.cargarOrganizaciones();
        if (typeof App.cargarUsuariosAdmin === 'function') App.cargarUsuariosAdmin();
        if (typeof App.cargarAuditoria === 'function') App.cargarAuditoria();
        if (typeof App.cargarEstadisticas === 'function') App.cargarEstadisticas();
      }

      setTimeout(aplicarPrivacidad, 50);
    }

    App.cambiarVista = cambiarVista;
    navItems.forEach(item => item.addEventListener('click', function() { cambiarVista(this.dataset.vista); }));

    // ==================== EVENTOS DEL NUEVO INICIO ====================
    
    // Pestañas GASTOS / INGRESOS
    document.querySelectorAll('.tab-verde').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-verde').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        tipoVerde = this.dataset.tipoVerde;
        recargarTransacciones();
      });
    });

    // Botones Día/Semana/Mes/Año/Período
    document.querySelectorAll('.filtro-tiempo').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.filtro-tiempo').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        filtroTiempo = this.dataset.filtro;
        offsetTiempo = 0;
        recargarTransacciones();
      });
    });

    // Flechas de navegación
    addListener('btnMesAnteriorGrafico', function() {
      offsetTiempo--;
      recargarTransacciones();
    });
    addListener('btnMesSiguienteGrafico', function() {
      offsetTiempo++;
      recargarTransacciones();
    });

    // Botón de Menú (las 3 rayitas)
    const btnMenu = document.querySelector('.inicio-top-bar .btn-icon-white');
    if (btnMenu) {
      btnMenu.addEventListener('click', function() {
        App.cambiarVista('vistaAjustes');
      });
    }

    // ==================== ICONOS ====================
    const iconosConNombre = [
      { icon: 'ph-fork-knife', name: 'Comida' }, { icon: 'ph-bowl-food', name: 'Alimentación' },
      { icon: 'ph-coffee', name: 'Café' }, { icon: 'ph-cooking-pot', name: 'Olla' },
      { icon: 'ph-beer-bottle', name: 'Cerveza' }, { icon: 'ph-wine', name: 'Vino' },
      { icon: 'ph-hamburger', name: 'Hamburguesa' }, { icon: 'ph-pizza', name: 'Pizza' },
      { icon: 'ph-cake', name: 'Pastel' }, { icon: 'ph-cookie', name: 'Galleta' },
      { icon: 'ph-carrot', name: 'Verdura' }, { icon: 'ph-apple-logo', name: 'Manzana' },
      { icon: 'ph-car', name: 'Auto' }, { icon: 'ph-bus', name: 'Transporte' },
      { icon: 'ph-bicycle', name: 'Bicicleta' }, { icon: 'ph-motorbike', name: 'Moto' },
      { icon: 'ph-airplane', name: 'Viajes' }, { icon: 'ph-train', name: 'Tren' },
      { icon: 'ph-taxi', name: 'Taxi' }, { icon: 'ph-gas-pump', name: 'Gasolina' },
      { icon: 'ph-ship', name: 'Barco' }, { icon: 'ph-truck', name: 'Camión' },
      { icon: 'ph-house', name: 'Casa' }, { icon: 'ph-shopping-cart', name: 'Súper' },
      { icon: 'ph-shopping-bag', name: 'Compras' }, { icon: 'ph-t-shirt', name: 'Ropa' },
      { icon: 'ph-sneaker', name: 'Zapatos' }, { icon: 'ph-washing-machine', name: 'Lavadora' },
      { icon: 'ph-couch', name: 'Muebles' }, { icon: 'ph-lightbulb', name: 'Servicios' },
      { icon: 'ph-drop', name: 'Agua' }, { icon: 'ph-fire', name: 'Luz/Gas' },
      { icon: 'ph-heartbeat', name: 'Salud' }, { icon: 'ph-first-aid', name: 'Botiquín' },
      { icon: 'ph-pill', name: 'Medicinas' }, { icon: 'ph-stethoscope', name: 'Médico' },
      { icon: 'ph-tooth', name: 'Dentista' }, { icon: 'ph-scissors', name: 'Peluquería' },
      { icon: 'ph-barbell', name: 'Gimnasio' }, { icon: 'ph-person-simple-run', name: 'Correr' },
      { icon: 'ph-devices', name: 'Tecnología' }, { icon: 'ph-laptop', name: 'Computadora' },
      { icon: 'ph-device-mobile', name: 'Celular' }, { icon: 'ph-game-controller', name: 'Juegos' },
      { icon: 'ph-music-notes', name: 'Música' }, { icon: 'ph-film-slate', name: 'Cine' },
      { icon: 'ph-tv', name: 'Televisión' }, { icon: 'ph-headphones', name: 'Audífonos' },
      { icon: 'ph-camera', name: 'Cámara' }, { icon: 'ph-book-open', name: 'Educación' },
      { icon: 'ph-money', name: 'Salario' }, { icon: 'ph-credit-card', name: 'Tarjeta' },
      { icon: 'ph-bank', name: 'Banco' }, { icon: 'ph-wallet', name: 'Billetera' },
      { icon: 'ph-briefcase', name: 'Trabajo' }, { icon: 'ph-chart-line-up', name: 'Inversión' },
      { icon: 'ph-piggy-bank', name: 'Ahorro' }, { icon: 'ph-receipt', name: 'Factura' },
      { icon: 'ph-hand-coins', name: 'Préstamo' }, { icon: 'ph-coin', name: 'Moneda' },
      { icon: 'ph-users', name: 'Familia' }, { icon: 'ph-baby', name: 'Bebé' },
      { icon: 'ph-dog', name: 'Perro' }, { icon: 'ph-cat', name: 'Gato' },
      { icon: 'ph-paw-print', name: 'Mascota' }, { icon: 'ph-gift', name: 'Regalos' },
      { icon: 'ph-tag', name: 'Otros' }, { icon: 'ph-target', name: 'Metas' },
      { icon: 'ph-star', name: 'Favorito' }, { icon: 'ph-flag', name: 'Bandera' },
      { icon: 'ph-trophy', name: 'Logro' }, { icon: 'ph-medal', name: 'Medalla' },
      { icon: 'ph-tent', name: 'Camping' }, { icon: 'ph-tree', name: 'Naturaleza' },
      { icon: 'ph-umbrella', name: 'Lluvia' }, { icon: 'ph-sun', name: 'Sol' }
    ];

    function generarListaIconos(filtro = '') {
      const cont = document.getElementById('listaIconosCategoria');
      if (!cont) return;
      const textoBusqueda = filtro.toLowerCase();
      const filtrados = iconosConNombre.filter(i => i.name.toLowerCase().includes(textoBusqueda) || i.icon.toLowerCase().includes(textoBusqueda));
      if (filtrados.length === 0) {
        cont.innerHTML = '<p style="color: #666; text-align: center; grid-column: span 4; margin-top: 20px;">No se encontraron iconos</p>';
        return;
      }
      cont.innerHTML = filtrados.map(i => `
        <div class="icono-item" data-icono="${i.icon}" data-nombre="${i.name}">
          <div class="circulo"><i class="ph ${i.icon}"></i></div>
          <span>${i.name}</span>
        </div>`).join('');
      cont.querySelectorAll('.icono-item').forEach(btn => {
        btn.addEventListener('click', function() {
          const icono = this.dataset.icono;
          document.getElementById('iconoCategoria').value = icono;
          document.getElementById('btnMostrarIconos').innerHTML = `<i class="ph ${icono}"></i>`;
          document.getElementById('selectorIconosModal').classList.add('hidden');
        });
      });
    }

    addListener('btnMostrarIconos', function() {
      document.getElementById('selectorIconosModal').classList.remove('hidden');
      generarListaIconos();
    });
    addListener('btnCerrarSelectorIconos', function() {
      document.getElementById('selectorIconosModal').classList.add('hidden');
    });

    // Colores
    const coloresDisponibles = ['#4a148c', '#e8c84c', '#f48fb1', '#66bb6a', '#d4e157', '#ec407a', '#ef9a9a', '#42a5f5', '#ff7043', '#26a69a', '#8d6e63', '#9e9e9e'];
    const contenedorColores = document.getElementById('contenedorColores');

    if (contenedorColores) {
      let html = coloresDisponibles.map((color, index) => 
        `<div class="color-circle ${index === 1 ? 'active' : ''}" data-color="${color}" style="background-color: ${color};"></div>`
      ).join('');
      html += `
        <label class="color-circle" style="background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red); display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; overflow: hidden;">
          <i class="ph ph-eyedropper" style="color: white; font-size: 16px; text-shadow: 0 1px 2px rgba(0,0,0,0.5);"></i>
          <input type="color" id="customColorPicker" style="position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer;">
        </label>`;
      contenedorColores.innerHTML = html;

      contenedorColores.querySelectorAll('.color-circle[data-color]').forEach(circle => {
        circle.addEventListener('click', function() {
          contenedorColores.querySelectorAll('.color-circle').forEach(c => c.classList.remove('active'));
          this.classList.add('active');
          document.getElementById('colorCategoria').value = this.dataset.color;
          const btn = document.getElementById('btnMostrarIconos');
          if (btn) btn.style.background = this.dataset.color;
        });
      });

      const customPicker = document.getElementById('customColorPicker');
      if (customPicker) {
        customPicker.addEventListener('input', function() {
          const nuevoColor = this.value;
          contenedorColores.querySelectorAll('.color-circle').forEach(c => c.classList.remove('active'));
          document.getElementById('colorCategoria').value = nuevoColor;
          this.parentElement.style.background = nuevoColor;
          this.parentElement.classList.add('active');
          const btn = document.getElementById('btnMostrarIconos');
          if (btn) btn.style.background = nuevoColor;
        });
      }
    }

    // ==================== MODAL TRANSACCIÓN ====================
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

    addListener('btnAccesoGasto', () => abrirModalTransaccion('gasto'));
    addListener('btnAccesoIngreso', () => abrirModalTransaccion('ingreso'));
    addListener('tabIngreso', () => abrirModalTransaccion('ingreso'));
    addListener('tabGasto', () => abrirModalTransaccion('gasto'));
    if (fab) fab.addEventListener('click', () => abrirModalTransaccion('ingreso'));

    addListener('btnAccesoPresupuesto', () => cambiarVista('vistaPresupuesto'));
    addListener('btnAccesoMetas', () => {
      cambiarVista('vistaPresupuesto');
      setTimeout(() => document.getElementById('tabMetasAhorro')?.click(), 300);
    });

    // ==================== GUARDAR TRANSACCIÓN ====================
    addListener('btnCerrarModalX', () => modal?.classList.add('hidden'));
    
    function guardarTransaccion() {
      const chipActivo = document.querySelector('#chipsCategorias .chip-categoria.activo');
      const cat = chipActivo ? chipActivo.dataset.nombre : '';
      const subcat = document.getElementById('subcategoria').value || null;
      const desc = document.getElementById('descripcion').value.trim();
      const montoLimpio = document.getElementById('monto').value.trim().replace(/\./g, '').replace(',', '.');
      const monto = parseFloat(montoLimpio) || 0;
      const fecha = document.getElementById('fecha').value;
      const metodoPago = document.getElementById('metodoPago').value || null;

      if (!cat) { alert('Por favor, selecciona una categoría.'); return; }
      if (!monto || monto <= 0) { alert('Por favor, escribe un monto mayor a 0.'); return; }

      App.agregarTransaccion(tipoTransaccion, cat, subcat, desc || 'Sin descripción', monto, fecha, metodoPago, App.cuentaActual);
      
      if (modal) modal.classList.add('hidden');
      document.getElementById('descripcion').value = '';
      document.getElementById('monto').value = '';
      document.getElementById('categoria').value = '';
    }

    addListener('btnGuardarModalQuick', guardarTransaccion);

    // ==================== SUBCATEGORÍA ====================
    addListener('btnAgregarSubcategoria', function() {
      const chipActivo = document.querySelector('#chipsCategorias .chip-categoria.activo');
      const catSeleccionada = chipActivo ? chipActivo.dataset.nombre : '';
      if (!catSeleccionada) { alert('Primero selecciona una categoría.'); return; }
      const nombreSub = prompt(`Nombre de la nueva subcategoría para "${catSeleccionada}":`);
      if (!nombreSub || !nombreSub.trim()) return;
      const subLimpia = nombreSub.trim().toLowerCase();

      App.agregarSubcategoria(catSeleccionada, subLimpia).then(function() {
        if (!App.subcategoriasPorCategoria[catSeleccionada]) App.subcategoriasPorCategoria[catSeleccionada] = [];
        if (!App.subcategoriasPorCategoria[catSeleccionada].includes(subLimpia)) {
          App.subcategoriasPorCategoria[catSeleccionada].push(subLimpia);
        }
        const select = document.getElementById('subcategoria');
        if (select) {
          select.innerHTML = '<option value="">Sin subcategoría</option>' + 
            App.subcategoriasPorCategoria[catSeleccionada].map(sub => `<option value="${sub}" ${sub === subLimpia ? 'selected' : ''}>${sub}</option>`).join('');
        }
        alert('Subcategoría agregada.');
      }).catch(function(error) {
        console.error(error);
        alert('Error al crear subcategoría: ' + error.message);
      });
    });

    // ==================== CHIPS DE CATEGORÍA ====================
    function renderizarChipsCategorias() {
      const cont = document.getElementById('chipsCategorias');
      if (!cont) return;
      const cats = (App.categoriasState || []).filter(c => c.tipo === tipoTransaccion);
      const selectHidden = document.getElementById('categoria');

      if (cats.length === 0) {
        cont.innerHTML = '<p class="texto-secundario text-sm">No hay categorías</p>';
        return;
      }

      cont.innerHTML = cats.map((c, index) => `
        <div class="chip-categoria ${index === 0 ? 'activo' : ''}" data-nombre="${c.nombre}">
          <i class="ph ${c.icono}"></i><span>${c.nombre}</span>
        </div>`).join('');

      if (cats.length > 0) selectHidden.value = cats[0].nombre;

      cont.querySelectorAll('.chip-categoria').forEach(chip => {
        chip.addEventListener('click', function() {
          cont.querySelectorAll('.chip-categoria').forEach(c => c.classList.remove('activo'));
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
      const cat = document.getElementById('categoria').value;
      const subcats = App.subcategoriasPorCategoria[cat] || [];
      select.innerHTML = '<option value="">Sin subcategoría</option>' + 
        subcats.map(sub => `<option value="${sub}">${sub}</option>`).join('');
    }

    const fechaInput = document.getElementById('fecha');
    if (fechaInput) fechaInput.value = new Date().toISOString().split('T')[0];

    // ==================== EDITAR TRANSACCIÓN ====================
    addListener('btnCancelarEditar', () => modalEditar?.classList.add('hidden'));
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
      App.actualizarTransaccion(id, { categoria: cat, subcategoria: subcat, descripcion: desc || 'Sin descripción', monto, fecha, metodoPago });
      modalEditar?.classList.add('hidden');
    });

    // ==================== EXPORTAR CSV ====================
    addListener('btnExportarCSV', function() {
      App.obtenerTransacciones(function(todas) {
        let csv = 'Tipo,Categoría,Subcategoría,Descripción,Monto,Fecha,Método de pago\n';
        todas.forEach(t => {
          csv += `${t.tipo},${t.categoria},${t.subcategoria || ''},${t.descripcion},${t.monto},${t.fecha},${t.metodoPago || ''}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finanzas-${mesSeleccionado}.csv`;
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
      lista.innerHTML = metodosPago.map(m => `<div class="metodo-pago-item"><span>${m.nombre}</span><button class="btn-delete" data-id="${m.id}">✕</button></div>`).join('');
      lista.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function() { App.eliminarMetodoPago(this.dataset.id); });
      });
    }

    function llenarSelectMetodosPago() {
      const opciones = '<option value="">Sin método</option>' + metodosPago.map(m => `<option value="${m.nombre}">${m.nombre}</option>`).join('');
      const sAgregar = document.getElementById('metodoPago');
      const sEditar = document.getElementById('metodoPagoEditar');
      if (sAgregar) sAgregar.innerHTML = opciones;
      if (sEditar) sEditar.innerHTML = opciones;
    }

    // ==================== DASHBOARD (NUEVA LÓGICA) ====================
    function cargarFiltros() {
      const selectCat = document.getElementById('filtroCategoriaMov');
      const selectMet = document.getElementById('filtroMetodoPago');
      if (selectCat && App.categoriasState) {
        selectCat.innerHTML = '<option value="">Todas las categorías</option>' + 
          App.categoriasState.map(c => `<option value="${c.nombre}">${c.nombre.charAt(0).toUpperCase() + c.nombre.slice(1)}</option>`).join('');
      }
      if (selectMet) {
        selectMet.innerHTML = '<option value="">Todos los métodos</option>' + 
          metodosPago.map(m => `<option value="${m.nombre}">${m.nombre}</option>`).join('');
      }
    }

    addListener('filtroCategoriaMov', () => recargarTransacciones());
    addListener('filtroMetodoPago', () => recargarTransacciones());

    function actualizarDashboard(transacciones) {
      // 1. Calcular fechas según el filtro (Día/Semana/Mes/Año)
      const hoy = new Date();
      let inicioPeriodo, finPeriodo;
      
      if (filtroTiempo === 'dia') {
        const fechaRef = new Date(hoy);
        fechaRef.setDate(hoy.getDate() + offsetTiempo);
        inicioPeriodo = new Date(fechaRef.setHours(0,0,0,0));
        finPeriodo = new Date(fechaRef.setHours(23,59,59,999));
      } else if (filtroTiempo === 'semana') {
        const diaSemana = hoy.getDay() === 0 ? 7 : hoy.getDay();
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - diaSemana + 1 + (offsetTiempo * 7));
        inicioPeriodo = new Date(lunes.setHours(0,0,0,0));
        finPeriodo = new Date(lunes);
        finPeriodo.setDate(lunes.getDate() + 6);
        finPeriodo.setHours(23,59,59,999);
      } else if (filtroTiempo === 'mes') {
        const mesRef = new Date(hoy.getFullYear(), hoy.getMonth() + offsetTiempo, 1);
        inicioPeriodo = new Date(mesRef.getFullYear(), mesRef.getMonth(), 1);
        finPeriodo = new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0, 23, 59, 59);
      } else if (filtroTiempo === 'ano') {
        const anoRef = hoy.getFullYear() + offsetTiempo;
        inicioPeriodo = new Date(anoRef, 0, 1);
        finPeriodo = new Date(anoRef, 11, 31, 23, 59, 59);
      } else {
        inicioPeriodo = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        finPeriodo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
      }

      // 2. Formatear texto del rango
      const elTextoRango = document.getElementById('textoRangoFechas');
      if (elTextoRango) {
        const opciones = { day: 'numeric', month: 'short' };
        if (filtroTiempo === 'ano') {
          elTextoRango.textContent = inicioPeriodo.getFullYear();
        } else if (filtroTiempo === 'dia') {
          elTextoRango.textContent = inicioPeriodo.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        } else {
          elTextoRango.textContent = inicioPeriodo.toLocaleDateString('es-ES', opciones) + ' – ' + finPeriodo.toLocaleDateString('es-ES', opciones);
        }
      }

      // 3. Filtrar transacciones por el rango de fechas
      const filtradasPorFecha = transacciones.filter(t => {
        if (!t.fecha) return false;
        // Parseamos la fecha asegurando que sea un objeto Date
        const fechaTrans = new Date(t.fecha + 'T12:00:00'); 
        return fechaTrans >= inicioPeriodo && fechaTrans <= finPeriodo;
      });

      // 4. Actualizar Balance Total en el Header (SOLO CON LOS DATOS DEL PERÍODO)
      let balancePeriodo = 0;
      filtradasPorFecha.forEach(t => {
        if (t.tipo === 'ingreso') balancePeriodo += t.monto;
        else balancePeriodo -= t.monto;
      });
      const elBalanceHeader = document.getElementById('balanceTotalHeader');
      if (elBalanceHeader) elBalanceHeader.textContent = '$' + App.formatearMonto(balancePeriodo);

      // 5. Dibujar Gráfica Dona
      if (typeof App.dibujarGraficaDona === 'function') {
        App.dibujarGraficaDona(filtradasPorFecha, tipoVerde);
      }

      // 6. Actualizar tarjetas de Ingresos y Gastos del PERÍODO
      let ingresosPeriodo = 0, gastosPeriodo = 0;
      filtradasPorFecha.forEach(t => t.tipo === 'ingreso' ? ingresosPeriodo += t.monto : gastosPeriodo += t.monto);

      const elIngresos = document.getElementById('totalIngresos');
      const elGastos = document.getElementById('totalGastos');
      if (elIngresos) elIngresos.textContent = '$' + App.formatearMonto(ingresosPeriodo);
      if (elGastos) elGastos.textContent = '$' + App.formatearMonto(gastosPeriodo);

      if (ocultarMontos) {
        [elIngresos, elGastos, elBalanceHeader].forEach(el => {
          if (el) { el.dataset.valorOriginal = el.textContent; el.textContent = '$ ******'; }
        });
      }
    }

    // ==================== DETALLE POR CATEGORÍA (CLIC EN GRÁFICA) ====================
    App.mostrarDetalleCategoria = function(nombreCategoria, transacciones, tipo) {
      // 1. Filtrar solo las transacciones de esa categoría y tipo
      const transaccionesFiltradas = transacciones.filter(t => t.categoria === nombreCategoria && t.tipo === tipo);
      
      // 2. Calcular el total
      let total = 0;
      transaccionesFiltradas.forEach(t => total += t.monto);

      // 3. Actualizar el modal
      document.getElementById('tituloDetalleCat').textContent = 'Categoría: ' + nombreCategoria.charAt(0).toUpperCase() + nombreCategoria.slice(1);
      document.getElementById('totalDetalleCat').textContent = '$' + App.formatearMonto(total);

      // 4. Generar la lista
      const lista = document.getElementById('listaDetalleCat');
      if (transaccionesFiltradas.length === 0) {
        lista.innerHTML = '<p class="texto-secundario text-center">No hay movimientos</p>';
      } else {
        // Ordenar por fecha descendente
        transaccionesFiltradas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        
        lista.innerHTML = transaccionesFiltradas.map(t => `
          <div class="mov-detalle-item">
            <div class="info">
              <span class="desc">${t.descripcion}</span>
              <span class="fecha">${t.fecha} ${t.subcategoria ? '• ' + t.subcategoria : ''}</span>
            </div>
            <span class="monto" style="color: ${t.tipo === 'ingreso' ? '#10b981' : '#ef4444'};">
              ${t.tipo === 'ingreso' ? '+' : '-'}$${App.formatearMonto(t.monto)}
            </span>
          </div>
        `).join('');
      }

      // 5. Mostrar el modal
      document.getElementById('modalDetalleCategoria').classList.remove('hidden');
    };

    // Evento para cerrar el modal
    addListener('btnCerrarDetalleCat', function() {
      document.getElementById('modalDetalleCategoria').classList.add('hidden');
    });

    // ==================== LISTA DE CATEGORÍAS ====================
    function renderizarListaCategorias() {
      const cont = document.getElementById('listaCategorias');
      if (!cont) return;
      if (!App.categoriasState || App.categoriasState.length === 0) {
        cont.innerHTML = '<p class="texto-secundario text-center py-4">No hay categorías</p>';
        return;
      }
      const catsFiltradas = App.categoriasState.filter(c => c.tipo === filtroTipoCategoria);
      if (catsFiltradas.length === 0) {
        cont.innerHTML = '<p class="texto-secundario text-center py-4">No hay categorías de este tipo</p>';
        return;
      }

      const fragment = document.createDocumentFragment();
      catsFiltradas.forEach(c => {
        const div = document.createElement('div');
        div.className = 'cat-card';
        div.style.cssText = 'background: white; border-radius: 12px; padding: 15px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #f0f0f0;';
        div.innerHTML = `
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="width: 45px; height: 45px; border-radius: 50%; background: ${c.color || '#e8c84c'}; display: flex; align-items: center; justify-content: center; font-size: 20px; color: white;">
              <i class="ph ${c.icono}"></i>
            </div>
            <div style="display: flex; flex-direction: column;">
              <span style="font-weight: 600; font-size: 15px; color: #333; text-transform: capitalize;">${c.nombre}</span>
              <span style="font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 10px; margin-top: 3px; width: fit-content; background: ${c.tipo === 'ingreso' ? '#fef3c7; color: #92400e;' : '#e5e7eb; color: #374151;'}">${c.tipo.toUpperCase()}</span>
            </div>
          </div>
          <div style="display: flex; gap: 10px; color: #888;">
            <button class="btn-editar-cat" data-id="${c.id}" data-nombre="${c.nombre}" data-icono="${c.icono}" data-color="${c.color}" data-tipo="${c.tipo}" style="background: none; border: none; cursor: pointer; color: #f97316; font-size: 18px;"><i class="ph ph-pencil-simple"></i></button>
            <button class="btn-delete-cat" data-id="${c.id}" style="background: none; border: none; cursor: pointer; color: #888; font-size: 18px;"><i class="ph ph-x"></i></button>
          </div>`;
        fragment.appendChild(div);
      });
      cont.innerHTML = '';
      cont.appendChild(fragment);

      cont.querySelectorAll('.btn-editar-cat').forEach(btn => btn.addEventListener('click', function() { abrirEdicionCategoria(this.dataset); }));
      cont.querySelectorAll('.btn-delete-cat').forEach(btn => btn.addEventListener('click', function() { if (confirm('¿Eliminar esta categoría?')) App.eliminarCategoria(this.dataset.id); }));
    }

    document.querySelectorAll('.btn-filtro-cat').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.btn-filtro-cat').forEach(b => {
          b.classList.remove('active');
          b.style.background = 'var(--bg-card)';
          b.style.color = 'var(--text-color)';
        });
        this.classList.add('active');
        this.style.background = 'var(--primary-color)';
        this.style.color = 'var(--primary-text)';
        filtroTipoCategoria = this.dataset.tipo;
        renderizarListaCategorias();
      });
    });

    function abrirEdicionCategoria(datos) {
      document.getElementById('idCategoriaEditar').value = datos.id;
      document.getElementById('nombreCategoria').value = datos.nombre;
      document.getElementById('tipoCategoria').value = datos.tipo;
      
      const radioGasto = document.querySelector('input[name="tipoCategoriaRadio"][value="gasto"]');
      const radioIngreso = document.querySelector('input[name="tipoCategoriaRadio"][value="ingreso"]');
      if (datos.tipo === 'gasto') { radioGasto.checked = true; radioIngreso.checked = false; }
      else { radioGasto.checked = false; radioIngreso.checked = true; }

      const icono = datos.icono || 'ph-tag';
      document.getElementById('iconoCategoria').value = icono;
      const btnMostrar = document.getElementById('btnMostrarIconos');
      btnMostrar.innerHTML = `<i class="ph ${icono}"></i>`;
      btnMostrar.style.background = datos.color || '#e8c84c';

      const color = datos.color || '#e8c84c';
      document.getElementById('colorCategoria').value = color;
      document.querySelectorAll('#contenedorColores .color-circle').forEach(c => {
        c.classList.remove('active');
        if (c.dataset.color === color) c.classList.add('active');
      });

      document.getElementById('tituloFormCategoria').textContent = 'Editar categoría';
      document.getElementById('btnSubmitCategoria').textContent = 'Guardar cambios';
      document.getElementById('btnCancelarEdicionCat').classList.remove('hidden');
      document.getElementById('vistaCategorias').scrollIntoView({ behavior: 'smooth' });
    }

    addListener('btnCancelarEdicionCat', function() {
      document.getElementById('idCategoriaEditar').value = '';
      document.getElementById('tituloFormCategoria').textContent = 'Mis categorías';
      document.getElementById('btnSubmitCategoria').textContent = 'Añadir';
      document.getElementById('btnCancelarEdicionCat').classList.add('hidden');
      document.getElementById('formCategoria').reset();
      document.getElementById('colorCategoria').value = '#e8c84c';
      document.getElementById('iconoCategoria').value = 'ph-tag';
      const btnMostrar = document.getElementById('btnMostrarIconos');
      btnMostrar.innerHTML = '<i class="ph ph-tag"></i>';
      btnMostrar.style.background = '#b0c4c0';
    });

    // Formulario de categoría
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
          App.actualizarCategoria(idEditar, { nombre: nombre.toLowerCase(), icono, color, tipo }).then(function() {
            document.getElementById('btnCancelarEdicionCat').click();
            App.obtenerCategorias(function(cats) { App.categoriasState = cats; renderizarListaCategorias(); renderizarChipsCategorias(); cargarFiltros(); });
          });
        } else {
          App.agregarCategoria(nombre, icono, color, tipo).then(function() {
            App.obtenerCategorias(function(cats) { App.categoriasState = cats; renderizarChipsCategorias(); renderizarListaCategorias(); cargarFiltros(); });
          });
          document.getElementById('btnCancelarEdicionCat').click();
        }
      });
    }

    // ==================== ADMIN (BÁSICO) ====================
    App.cargarOrganizaciones = function() {
      const cont = document.getElementById('listaOrganizaciones');
      if (!cont) return;
      App.obtenerOrganizaciones(function(orgs) {
        if (orgs.length === 0) { cont.innerHTML = '<p class="texto-secundario text-center py-2">Sin organizaciones</p>'; return; }
        cont.innerHTML = orgs.map(org => `
          <div class="org-item">
            <span><i class="ph ph-building"></i> ${org.nombre}</span>
            <button class="btn-eliminar-org" data-id="${org.id}">✕</button>
          </div>`).join('');
        cont.querySelectorAll('.btn-eliminar-org').forEach(btn => {
          btn.addEventListener('click', function() { if (confirm('¿Eliminar organización?')) App.eliminarOrganizacion(this.dataset.id); });
        });
      });
    };

    addListener('btnMostrarFormOrg', function() {
      document.getElementById('formOrganizacion').classList.toggle('hidden');
    });

    addListener('btnCrearOrganizacion', function() {
      const nombre = document.getElementById('nombreOrganizacion').value.trim();
      if (nombre) {
        App.crearOrganizacion(nombre).then(function() {
          document.getElementById('nombreOrganizacion').value = '';
          App.cargarOrganizaciones();
        });
      }
    });

    App.cargarUsuariosAdmin = function() {
      const cont = document.getElementById('listaUsuariosAdmin');
      if (!cont) return;
      App.obtenerUsuariosVinculados(function(usuarios) {
        if (usuarios.length === 0) { cont.innerHTML = '<p class="texto-secundario text-center py-4">No hay clientes vinculados</p>'; return; }
        
        let html = '';
        usuarios.forEach(usuario => {
          const inicial = (usuario.email || '?').charAt(0).toUpperCase();
          html += `<div class="cliente-card">
            <div class="cliente-header">
              <div class="cliente-avatar">${inicial}</div>
              <div class="cliente-info"><div class="cliente-nombre">${usuario.email}</div></div>
            </div>
            <div class="cliente-acciones">
              <button class="btn-eliminar-cliente" data-uid="${usuario.uid}"><i class="ph ph-trash"></i> Eliminar</button>
            </div>
          </div>`;
        });
        cont.innerHTML = html;
        cont.querySelectorAll('.btn-eliminar-cliente').forEach(btn => {
          btn.addEventListener('click', function() {
            if (confirm('¿Eliminar cliente?')) App.eliminarVinculacion(this.dataset.uid);
          });
        });
      });
    };

    addListener('btnBuscarUsuario', function() {
      const email = document.getElementById('emailUsuarioVincular').value.trim();
      const resultado = document.getElementById('resultadoBusqueda');
      if (!resultado) return;
      if (!email) { resultado.innerHTML = '<p style="color: red;">Escribe un email</p>'; return; }
      resultado.innerHTML = '<p>Buscando...</p>';
      App.buscarUsuarioPorEmail(email, function(res) {
        if (!res.encontrado) {
          resultado.innerHTML = `<p style="color: red;">❌ ${res.mensaje || 'No encontrado'}</p>`;
          return;
        }
        resultado.innerHTML = `
          <div style="padding: 10px; background: #f0f0f0; border-radius: 8px;">
            <p><strong>${res.usuario.email}</strong></p>
            <button id="btnConfirmarVinculo" class="btn btn-primario" style="margin-top: 5px;">Confirmar vínculo</button>
          </div>`;
        document.getElementById('btnConfirmarVinculo').addEventListener('click', function() {
          App.vincularUsuarioPorEmail(res.usuario.email, function() {
            resultado.innerHTML = '';
            document.getElementById('emailUsuarioVincular').value = '';
            App.cargarUsuariosAdmin();
          });
        });
      });
    });

    App.cargarAuditoria = function() {
      const cont = document.getElementById('listaAuditoria');
      if (!cont) return;
      App.obtenerAuditoria(function(registros) {
        if (registros.length === 0) { cont.innerHTML = '<p class="texto-secundario">Sin registros</p>'; return; }
        cont.innerHTML = registros.map(r => 
          `<div class="text-sm"><i class="ph ph-clock"></i> ${r.accion} - ${new Date(r.fecha).toLocaleString()}</div>`
        ).join('');
      });
    };

    App.cargarEstadisticas = function() {
      App.obtenerEstadisticasGlobales(function(est) {
        const elUsuarios = document.getElementById('statUsuarios');
        const elTransacciones = document.getElementById('statTransacciones');
        const elIngresos = document.getElementById('statIngresos');
        const elGastos = document.getElementById('statGastos');
        if (elUsuarios) elUsuarios.textContent = est.usuarios;
        if (elTransacciones) elTransacciones.textContent = est.transacciones;
        if (elIngresos) elIngresos.textContent = '$' + App.formatearMonto(est.ingresos);
        if (elGastos) elGastos.textContent = '$' + App.formatearMonto(est.gastos);
      });
    };

    // ==================== NOTIFICACIONES ====================
    const toggleNotificaciones = document.getElementById('toggleNotificaciones');
    let timerNotificacion = null;

    function programarNotificacion() {
      if (Notification.permission === 'granted') {
        const ahora = new Date();
        const horaRecordatorio = new Date();
        horaRecordatorio.setHours(20, 0, 0, 0);
        if (horaRecordatorio <= ahora) horaRecordatorio.setDate(horaRecordatorio.getDate() + 1);
        const msHastaRecordatorio = horaRecordatorio - ahora;
        if (timerNotificacion) clearTimeout(timerNotificacion);
        timerNotificacion = setTimeout(() => {
          if (Notification.permission === 'granted') {
            new Notification('Finora - Recordatorio', { body: 'No olvides registrar tus gastos de hoy 💰', icon: 'logo-192.png' });
          }
          programarNotificacion();
        }, msHastaRecordatorio);
        localStorage.setItem('notificacionesActivas', 'true');
      }
    }

    if (toggleNotificaciones) {
      const notificacionesActivas = localStorage.getItem('notificacionesActivas') === 'true';
      toggleNotificaciones.checked = notificacionesActivas;
      if (notificacionesActivas) programarNotificacion();
      toggleNotificaciones.addEventListener('change', function() {
        if (this.checked) {
          if (!("Notification" in window)) { alert('Tu navegador no soporta notificaciones.'); this.checked = false; return; }
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              programarNotificacion();
              alert('¡Notificaciones activadas! Te recordaremos a las 8 PM.');
            } else {
              alert('Debes permitir las notificaciones.');
              this.checked = false;
            }
          });
        } else {
          if (timerNotificacion) clearTimeout(timerNotificacion);
          localStorage.setItem('notificacionesActivas', 'false');
        }
      });
    }

        // ==================== CARGA INICIAL ====================
    App.cargarDatosIniciales = function() {
      cargarCuentas();
      App.obtenerCategorias(function(cats) {
        App.categoriasState = cats;
        App.subcategoriasPorCategoria = {};
        cats.forEach(c => { if (c.subcategorias && Array.isArray(c.subcategorias)) App.subcategoriasPorCategoria[c.nombre] = c.subcategorias; });
        renderizarListaCategorias();
        
        App.obtenerMetodosPago(function(metodos) {
          metodosPago = metodos;
          llenarSelectMetodosPago();
          cargarFiltros();
        });
        App.actualizarBotonAdmin();

        // NUEVO: Cargar la interfaz de espacios compartidos
        if (typeof App.cargarUIEspacios === 'function') {
          App.cargarUIEspacios();
        }
      });
    };

    // ==================== LÓGICA DE ESPACIOS COMPARTIDOS ====================
    App.cargarUIEspacios = function() {
  const panel = document.getElementById('panelEspacioCompartido');
  const selectPerfil = document.getElementById('selectorPerfil');
  const selectorCuenta = document.getElementById('selectorCuenta');
  const btnNuevaCuenta = document.getElementById('btnNuevaCuenta');
  
  if (!panel || !selectPerfil) return;

  const espacioActivoId = localStorage.getItem('espacioActivoId');
  const nombreEspacioActivo = localStorage.getItem('espacioActivoNombre') || 'Compartido';

  // 1. Actualizar el Selector de Perfiles
  if (espacioActivoId) {
    selectPerfil.innerHTML = `
      <option value="personal">👤 Personal</option>
      <option value="${espacioActivoId}">🏠 ${nombreEspacioActivo}</option>
    `;
    // Si estamos en el espacio, ocultamos el selector de cuentas
    if (selectorCuenta) selectorCuenta.style.display = 'none';
    if (btnNuevaCuenta) btnNuevaCuenta.style.display = 'none';
  } else {
    selectPerfil.innerHTML = '<option value="personal">👤 Personal</option>';
    if (selectorCuenta) selectorCuenta.style.display = 'block';
    if (btnNuevaCuenta) btnNuevaCuenta.style.display = 'inline-flex';
  }
  selectPerfil.value = modoActual;

  // Evento para cambiar de perfil
  selectPerfil.addEventListener('change', function() {
    modoActual = this.value;
    if (modoActual === 'personal') {
      localStorage.removeItem('espacioActivoId'); // Borrar para que use personal
    } else {
      localStorage.setItem('espacioActivoId', modoActual);
    }
    window.location.reload();
  });

  // 2. Renderizar el panel de Ajustes
  if (espacioActivoId) {
    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <div>
          <strong style="color: #166534;">Espacio: ${nombreEspacioActivo}</strong>
          <p style="font-size: 12px; color: #15803d;">Estás compartiendo datos.</p>
        </div>
        <button id="btnSalirEspacio" class="btn btn-peligro" style="padding: 6px 12px; font-size: 12px;">Salir</button>
      </div>
    `;
    document.getElementById('btnSalirEspacio').addEventListener('click', function() {
      if (confirm('¿Salir del espacio compartido? Volverás a tus finanzas personales.')) {
        localStorage.removeItem('espacioActivoId');
        localStorage.removeItem('espacioActivoNombre');
        modoActual = 'personal';
        window.location.reload();
      }
    });
  } else {
    panel.innerHTML = `
      <button id="btnCrearEspacio" class="btn btn-primario w-full" style="margin-bottom: 8px;">Crear Espacio</button>
      <button id="btnUnirseEspacio" class="btn btn-outline w-full">Unirse con Código</button>
    `;

    document.getElementById('btnCrearEspacio').addEventListener('click', function() {
      const nombre = prompt('Nombre del espacio (ej: Nuestra Casa):');
      if (nombre) {
        App.crearEspacioCompartido(nombre, function(espacioId, codigo) {
          alert(`¡Espacio creado! Tu código de invitación es: ${codigo}\nCompártelo con tu pareja.`);
          localStorage.setItem('espacioActivoId', espacioId);
          localStorage.setItem('espacioActivoNombre', nombre);
          window.location.reload();
        });
      }
    });

    document.getElementById('btnUnirseEspacio').addEventListener('click', function() {
      const codigo = prompt('Ingresa el código de invitación (ej: PAREJA-1234):');
      if (codigo) {
        App.unirseAEspacio(codigo.toUpperCase(), function(espacioId, nombre) {
          alert(`¡Te has unido al espacio: ${nombre}!`);
          localStorage.setItem('espacioActivoId', espacioId);
          localStorage.setItem('espacioActivoNombre', nombre);
          window.location.reload();
        }).catch(function(error) {
          alert('Error: ' + error.message);
        });
      }
    });
  }
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

  }); // <--- CIERRE DEL DOMContentLoaded

})();
