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

      navItems.forEach(function(item) {
        item.classList.remove('active');
      });
      const itemActivo = document.querySelector('[data-vista="' + nombreVista + '"]');
      if (itemActivo) itemActivo.classList.add('active');

      const titulos = { inicio: 'Inicio', presupuesto: 'Presupuesto', categorias: 'Categorías', ajustes: 'Ajustes', admin: 'Admin' };
      if (titulo) titulo.textContent = titulos[clave] || 'Inicio';

      if (clave === 'presupuesto' && typeof App.cargarPantallaPresupuesto === 'function') {
        App.cargarPantallaPresupuesto();
      }
      if (clave === 'categorias') {
        renderizarListaCategorias();
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
      item.addEventListener('click', function() {
        cambiarVista(this.dataset.vista);
      });
    });

    // ==================== ACCESOS DIRECTOS ====================
    function addListener(id, callback) {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', callback);
    }

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
      setTimeout(function() {
        document.getElementById('tabMetasAhorro')?.click();
      }, 300);
    });

    // ==================== FILTRO DE MES ====================
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
      if (metodosPago.length === 0) {
        lista.innerHTML = '<p class="texto-secundario">No hay métodos de pago</p>';
        return;
      }
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
      if (filtradas.length === 0) {
        lista.innerHTML = '<p class="texto-secundario text-center">No hay movimientos</p>';
      } else {
        let html = '';
        filtradas.forEach(function(t) {
          html += '<div class="movimiento-item"><span>' + t.descripcion + '</span><span>$' + App.formatearMonto(t.monto) + '</span></div>';
        });
        lista.innerHTML = html;
      }

      if (typeof App.actualizarGraficaTendencia === 'function') {
        App.actualizarGraficaTendencia(transacciones, mesSeleccionado);
      }
    }

    // ==================== FUNCIONES AUXILIARES ====================
    function llenarSelectCategorias() {
      const select = document.getElementById('categoria');
      if (!select) return;
      const cats = (App.categoriasState || []).filter(function(c) { return c.tipo === tipoTransaccion; });
      select.innerHTML = cats.map(function(c) {
        return '<option value="' + c.nombre + '">' + c.emoji + ' ' + c.nombre + '</option>';
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

    function llenarSelectMetodosPago() {
      const selectAgregar = document.getElementById('metodoPago');
      const selectEditar = document.getElementById('metodoPagoEditar');
      const filtroSelect = document.getElementById('filtroMetodoPago');
      let opciones = '<option value="">Método de pago (opcional)</option>';
      metodosPago.forEach(function(m) { opciones += '<option value="' + m.nombre + '">' + m.nombre + '</option>'; });
      if (selectAgregar) selectAgregar.innerHTML = opciones;
      if (selectEditar) selectEditar.innerHTML = opciones;
      if (filtroSelect) {
        filtroSelect.innerHTML = '<option value="">Todos los métodos de pago</option>' + metodosPago.map(function(m) { return '<option value="' + m.nombre + '">' + m.nombre + '</option>'; }).join('');
      }
    }

    function renderizarListaCategorias() {
      const cont = document.getElementById('listaCategorias');
      if (!cont) return;
      if (!App.categoriasState || App.categoriasState.length === 0) {
        cont.innerHTML = '<p class="texto-secundario text-center py-4">No hay categorías</p>';
        return;
      }
      let html = '';
      App.categoriasState.forEach(function(c) {
        html += '<div class="cat-card"><div class="cat-info"><span class="cat-emoji">' + c.emoji + '</span><div class="cat-detalles"><span class="cat-nombre">' + c.nombre + '</span><span class="cat-tipo ' + c.tipo + '">' + c.tipo + '</span></div></div><button class="btn-delete-cat" data-id="' + c.id + '">✕</button></div>';
      });
      cont.innerHTML = html;
      cont.querySelectorAll('.btn-delete-cat').forEach(function(b) {
        b.addEventListener('click', function() {
          if (confirm('¿Eliminar esta categoría?')) App.eliminarCategoria(this.dataset.id);
        });
      });
    }

    // ==================== ADMIN ====================
    function cargarOrganizaciones() {
      const cont = document.getElementById('listaOrganizaciones');
      if (!cont) return;
      App.obtenerOrganizaciones(function(orgs) {
        if (orgs.length === 0) {
          cont.innerHTML = '<p class="texto-secundario text-center py-2">Sin organizaciones</p>';
          return;
        }
        let html = '';
        orgs.forEach(function(org) {
          html += '<div class="org-item"><span><i class="ph ph-building"></i> ' + org.nombre + '</span><button class="btn-eliminar-org" data-id="' + org.id + '">✕</button></div>';
        });
        cont.innerHTML = html;
        cont.querySelectorAll('.btn-eliminar-org').forEach(function(btn) {
          btn.addEventListener('click', function() {
            if (confirm('¿Eliminar organización?')) App.eliminarOrganizacion(this.dataset.id);
          });
        });
      });
    }

    addListener('btnCrearOrganizacion', function() {
      const nombre = document.getElementById('nombreOrganizacion').value.trim();
      if (nombre) {
        App.crearOrganizacion(nombre).then(function() {
          document.getElementById('nombreOrganizacion').value = '';
          cargarOrganizaciones();
        });
      }
    });

    addListener('btnMostrarFormOrg', function() {
      document.getElementById('formOrganizacion').classList.toggle('hidden');
    });

    addListener('btnExportarAuditoria', function() {
      App.obtenerAuditoria(function(registros) {
        let csv = 'Acción,Detalle,Fecha\n';
        registros.forEach(function(r) {
          csv += r.accion + ',' + r.detalle + ',' + new Date(r.fecha).toLocaleString() + '\n';
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'auditoria.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
    });

    function cargarUsuariosAdmin() {
      const cont = document.getElementById('listaUsuariosAdmin');
      if (!cont) return;
      App.obtenerUsuariosVinculados(function(usuarios) {
        if (usuarios.length === 0) {
          cont.innerHTML = '<p class="texto-secundario text-center py-4">No hay usuarios vinculados</p>';
          return;
        }
        let html = '';
        usuarios.forEach(function(usuario) {
          App.obtenerUsuarioPorId(usuario.uid, function(datos) {
            const rol = datos ? (datos.rol || 'normal') : 'normal';
            const estado = datos ? (datos.activo !== false) : true;
            usuario.rol = rol;
            usuario.activo = estado;

            html += '<div class="usuario-admin-card">';
            html += '<div class="usuario-admin-info"><span class="font-medium">' + usuario.email + '</span><span class="texto-secundario text-xs">Rol: ' + rol + ' | ' + (estado ? 'Activo' : 'Inactivo') + '</span></div>';
            html += '<div class="usuario-admin-acciones">';
            html += '<button class="btn-ver-usuario-admin text-xs" data-uid="' + usuario.uid + '">Ver</button>';
            html += '<button class="btn-cambiar-rol text-xs" data-uid="' + usuario.uid + '" data-rol="' + rol + '">Rol</button>';
            html += '<button class="btn-toggle-estado text-xs" data-uid="' + usuario.uid + '" data-activo="' + estado + '">' + (estado ? 'Desactivar' : 'Activar') + '</button>';
            html += '<button class="btn-eliminar-vinculo text-red-500" data-uid="' + usuario.uid + '">✕</button>';
            html += '</div></div>';

            cont.innerHTML = html;

            cont.querySelectorAll('.btn-eliminar-vinculo').forEach(function(btn) {
              btn.addEventListener('click', function() {
                if (confirm('¿Eliminar vinculación?')) App.eliminarVinculacion(this.dataset.uid);
              });
            });
            cont.querySelectorAll('.btn-ver-usuario-admin').forEach(function(btn) {
              btn.addEventListener('click', function() { verDetalleUsuario(this.dataset.uid); });
            });
            cont.querySelectorAll('.btn-cambiar-rol').forEach(function(btn) {
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
    }

    addListener('btnVincularUsuario', function() {
      const email = document.getElementById('emailUsuarioVincular').value.trim();
      if (email) {
        App.vincularUsuarioPorEmail(email, function() {
          document.getElementById('emailUsuarioVincular').value = '';
          cargarUsuariosAdmin();
        });
      }
    });

    function verDetalleUsuario(usuarioUid) {
      const detalleCont = document.getElementById('detalleUsuarioAdmin');
      if (!detalleCont) return;
      App.obtenerTransaccionesDeUsuario(usuarioUid, function(transacciones) {
        let totalIngresos = 0, totalGastos = 0;
        transacciones.forEach(function(t) { if (t.tipo === 'ingreso') totalIngresos += t.monto; else totalGastos += t.monto; });
        let html = '<div class="admin-detalle"><h4 class="font-bold">Resumen del usuario</h4><p>Ingresos: $' + App.formatearMonto(totalIngresos) + '</p><p>Gastos: $' + App.formatearMonto(totalGastos) + '</p><hr class="my-2"><h5 class="font-semibold">Últimas transacciones</h5>';
        if (transacciones.length === 0) html += '<p class="texto-secundario">Sin transacciones</p>';
        else transacciones.slice(0, 10).forEach(function(t) { html += '<div class="text-sm">' + t.descripcion + ' - $' + App.formatearMonto(t.monto) + '</div>'; });
        html += '</div>';
        detalleCont.innerHTML = html;
      });
    }

    function cargarAuditoria() {
      const cont = document.getElementById('listaAuditoria');
      if (!cont) return;
      App.obtenerAuditoria(function(registros) {
        if (registros.length === 0) {
          cont.innerHTML = '<p class="texto-secundario">Sin registros</p>';
          return;
        }
        let html = '';
        registros.forEach(function(r) {
          html += '<div class="text-sm"><i class="ph ph-clock"></i> ' + r.accion + ' - ' + new Date(r.fecha).toLocaleString() + '</div>';
        });
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
        App.obtenerMetodosPago(function(metodos) {
          metodosPago = metodos;
          llenarSelectMetodosPago();
          renderizarListaMetodosPago();
        });
        App.obtenerLimitesCategorias(mesSeleccionado, function(limites) {
          App.subcategoriasPorCategoria = {};
          var gastos = limites.gastos || {};
          Object.keys(gastos).forEach(function(cat) {
            var subcats = gastos[cat].subcategorias || {};
            App.subcategoriasPorCategoria[cat] = Object.keys(subcats);
          });
          llenarSelectSubcategorias();
        });
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
        const emoji = document.getElementById('emojiCategoria').value.trim() || '📌';
        const color = document.getElementById('colorCategoria').value;
        const tipo = document.getElementById('tipoCategoria').value;
        if (!nombre) return;
        App.agregarCategoria(nombre, emoji, color, tipo);
        formCat.reset();
        document.getElementById('colorCategoria').value = '#10b981';
        document.getElementById('emojiCategoria').value = '';
      });
    }
  });
})();
