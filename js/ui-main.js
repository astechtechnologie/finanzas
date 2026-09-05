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
    var filtroMetodo = document.getElementById('filtroMetodoPago');

    if (!vistas.inicio) return;

    // ==================== NAVEGACIÓN ====================
    function cambiarVista(nombreVista) {
      const clave = nombreVista.replace('vista', '').toLowerCase();
      if (!vistas[clave]) return;

      Object.values(vistas).forEach(function(v) { v.classList.remove('activa'); });
      vistas[clave].classList.add('activa');

      navItems.forEach(function(item) { item.classList.remove('active'); });
      const itemActivo = document.querySelector('[data-vista="' + nombreVista + '"]');
      if (itemActivo) itemActivo.classList.add('active');

      const titulos = { inicio: 'Inicio', presupuesto: 'Presupuesto', categorias: 'Categorías', ajustes: 'Ajustes', admin: 'Admin' };
      titulo.textContent = titulos[clave];

      if (clave === 'presupuesto' && typeof App.cargarPantallaPresupuesto === 'function') {
        App.cargarPantallaPresupuesto();
      }
      if (clave === 'categorias') {
        renderizarListaCategorias();
      }
      if (clave === 'admin') {
        cargarOrganizaciones();
        cargarUsuariosAdmin();
      }
    }

    // Exponer globalmente
    App.cambiarVista = function(nombre) {
      cambiarVista(nombre);
    };

    navItems.forEach(function(item) {
      item.addEventListener('click', function() {
        cambiarVista(this.dataset.vista);
      });
    });

    // ==================== ACCESOS DIRECTOS ====================
    document.getElementById('btnAccesoGasto').addEventListener('click', function() {
      tipoTransaccion = 'gasto';
      document.getElementById('tabGasto').classList.add('active');
      document.getElementById('tabIngreso').classList.remove('active');
      llenarSelectCategorias();
      modal.classList.remove('hidden');
    });

    document.getElementById('btnAccesoIngreso').addEventListener('click', function() {
      tipoTransaccion = 'ingreso';
      document.getElementById('tabIngreso').classList.add('active');
      document.getElementById('tabGasto').classList.remove('active');
      llenarSelectCategorias();
      modal.classList.remove('hidden');
    });

    document.getElementById('btnAccesoPresupuesto').addEventListener('click', function() {
      cambiarVista('vistaPresupuesto');
    });

    document.getElementById('btnAccesoMetas').addEventListener('click', function() {
      cambiarVista('vistaPresupuesto');
      setTimeout(function() {
        document.getElementById('tabMetasAhorro')?.click();
      }, 300);
    });

    // ==================== FILTROS ====================
    filtroMes.value = mesSeleccionado;
    filtroMes.addEventListener('change', function() {
      mesSeleccionado = filtroMes.value;
      if (App.auth.currentUser) App.obtenerTransacciones(function(t) { actualizarDashboard(t); });
    });

    filtroMetodo.addEventListener('change', function() {
      if (App.auth.currentUser) App.obtenerTransacciones(function(t) { actualizarDashboard(t); });
    });

    // ==================== FAB ====================
    fab.addEventListener('click', function() { modal.classList.remove('hidden'); });

    // ==================== MODAL AGREGAR ====================
    document.getElementById('btnCancelarModal').addEventListener('click', function() { modal.classList.add('hidden'); });
    document.getElementById('btnGuardarModal').addEventListener('click', function() {
      var cat = document.getElementById('categoria').value;
      var subcat = document.getElementById('subcategoria').value || null;
      var desc = document.getElementById('descripcion').value.trim();
      var montoLimpio = document.getElementById('monto').value.trim().replace(/\./g, '').replace(',', '.');
      var monto = parseFloat(montoLimpio) || 0;
      var fecha = document.getElementById('fecha').value;
      var metodoPago = document.getElementById('metodoPago').value || null;
      if (!cat || !desc || !monto) return;
      App.agregarTransaccion(tipoTransaccion, cat, subcat, desc, monto, fecha, metodoPago);
      modal.classList.add('hidden');
      document.getElementById('descripcion').value = '';
      document.getElementById('monto').value = '';
    });

    document.getElementById('tabIngreso').addEventListener('click', function() {
      tipoTransaccion = 'ingreso';
      document.getElementById('tabIngreso').classList.add('active');
      document.getElementById('tabGasto').classList.remove('active');
      llenarSelectCategorias();
    });
    document.getElementById('tabGasto').addEventListener('click', function() {
      tipoTransaccion = 'gasto';
      document.getElementById('tabGasto').classList.add('active');
      document.getElementById('tabIngreso').classList.remove('active');
      llenarSelectCategorias();
    });

    document.getElementById('fecha').value = new Date().toISOString().split('T')[0];

    // ==================== MODAL EDITAR ====================
    document.getElementById('btnCancelarEditar').addEventListener('click', function() { modalEditar.classList.add('hidden'); });
    document.getElementById('btnGuardarEditar').addEventListener('click', function() {
      var id = document.getElementById('idTransaccionEditar').value;
      var cat = document.getElementById('categoriaEditar').value;
      var subcat = document.getElementById('subcategoriaEditar').value || null;
      var desc = document.getElementById('descripcionEditar').value.trim();
      var montoLimpio = document.getElementById('montoEditar').value.trim().replace(/\./g, '').replace(',', '.');
      var monto = parseFloat(montoLimpio) || 0;
      var fecha = document.getElementById('fechaEditar').value;
      var metodoPago = document.getElementById('metodoPagoEditar').value || null;
      if (!id || !cat || !desc || isNaN(monto)) return;
      App.actualizarTransaccion(id, { categoria: cat, subcategoria: subcat, descripcion: desc, monto: monto, fecha: fecha, metodoPago: metodoPago });
      modalEditar.classList.add('hidden');
    });

    // ==================== EXPORTAR CSV ====================
    document.getElementById('btnExportarCSV').addEventListener('click', function() {
      App.obtenerTransacciones(function(todas) {
        var filtradas = todas.filter(function(t) { return t.fecha && t.fecha.startsWith(mesSeleccionado); });
        var csv = 'Tipo,Categoría,Subcategoría,Descripción,Monto,Fecha,Método de pago\n';
        filtradas.forEach(function(t) {
          csv += t.tipo + ',' + t.categoria + ',' + (t.subcategoria || '') + ',' + t.descripcion + ',' + t.monto + ',' + t.fecha + ',' + (t.metodoPago || '') + '\n';
        });
        var blob = new Blob([csv], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'finanzas-' + mesSeleccionado + '.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
    });

    // ==================== MÉTODOS DE PAGO ====================
    document.getElementById('btnGestionarMetodos').addEventListener('click', function() {
      document.getElementById('panelMetodosPago').classList.toggle('hidden');
      renderizarListaMetodosPago();
    });
    document.getElementById('btnAgregarMetodoPago').addEventListener('click', function() {
      var nombre = document.getElementById('nombreMetodoPago').value.trim();
      if (!nombre) return;
      App.agregarMetodoPago(nombre);
      document.getElementById('nombreMetodoPago').value = '';
    });

    function renderizarListaMetodosPago() {
      var lista = document.getElementById('listaMetodosPago');
      if (metodosPago.length === 0) {
        lista.innerHTML = '<p class="texto-secundario">No hay métodos de pago</p>';
        return;
      }
      var html = '';
      metodosPago.forEach(function(m) {
        html += '<div class="metodo-pago-item">' +
          '<span>' + m.nombre + '</span>' +
          '<button class="btn-delete" data-id="' + m.id + '">✕</button>' +
          '</div>';
      });
      lista.innerHTML = html;
      lista.querySelectorAll('.btn-delete').forEach(function(btn) {
        btn.addEventListener('click', function() {
          App.eliminarMetodoPago(this.dataset.id);
        });
      });
    }

    // ==================== DASHBOARD ====================
    function actualizarDashboard(transacciones) {
      var filtradas = transacciones.filter(function(t) { return t.fecha && t.fecha.startsWith(mesSeleccionado); });
      var metodoSeleccionado = filtroMetodo.value;
      if (metodoSeleccionado) filtradas = filtradas.filter(function(t) { return t.metodoPago === metodoSeleccionado; });

      var ingresos = 0, gastos = 0;
      filtradas.forEach(function(t) { t.tipo === 'ingreso' ? ingresos += t.monto : gastos += t.monto; });

      document.getElementById('totalIngresos').textContent = '$' + App.formatearMonto(ingresos);
      document.getElementById('totalGastos').textContent = '$' + App.formatearMonto(gastos);
      var balance = ingresos - gastos;
      var bel = document.getElementById('balance');
      bel.textContent = '$' + App.formatearMonto(balance);
      bel.className = balance >= 0 ? 'text-emerald-500' : 'text-red-500';

      var partes = mesSeleccionado.split('-');
      var año = parseInt(partes[0]), mesNum = parseInt(partes[1]);
      var ahora = new Date();
      var diasEnMes = new Date(año, mesNum, 0).getDate();
      var diaActual = (ahora.getFullYear() === año && (ahora.getMonth() + 1) === mesNum) ? ahora.getDate() : diasEnMes;
      var diasTranscurridos = Math.min(diaActual, diasEnMes);
      var promedioDiario = diasTranscurridos > 0 ? gastos / diasTranscurridos : 0;
      document.getElementById('kpiPromedioDiario').textContent = '$' + App.formatearMonto(promedioDiario);

      var gastosPorCat = {};
      filtradas.filter(function(t) { return t.tipo === 'gasto'; }).forEach(function(t) {
        if (!gastosPorCat[t.categoria]) gastosPorCat[t.categoria] = 0;
        gastosPorCat[t.categoria] += t.monto;
      });
      var catTop = Object.keys(gastosPorCat).reduce(function(a, b) { return gastosPorCat[a] > gastosPorCat[b] ? a : b; }, '');
      if (catTop) {
        var catObj = (App.categoriasState || []).find(function(c) { return c.nombre === catTop; });
        document.getElementById('kpiCategoriaTop').textContent = (catObj ? catObj.emoji + ' ' : '') + catTop;
      } else {
        document.getElementById('kpiCategoriaTop').textContent = 'Sin datos';
      }

      var porcentajeAhorro = ingresos > 0 ? ((ingresos - gastos) / ingresos) * 100 : 0;
      var kpiAhorroEl = document.getElementById('kpiAhorro');
      kpiAhorroEl.textContent = porcentajeAhorro.toFixed(1) + '%';
      kpiAhorroEl.className = 'kpi-valor ' + (porcentajeAhorro >= 0 ? 'text-emerald-500' : 'text-red-500');

      var mesAnterior = (mesNum === 1) ? (año - 1) + '-12' : año + '-' + String(mesNum - 1).padStart(2, '0');
      var gastosMesAnterior = transacciones.filter(function(t) { return t.tipo === 'gasto' && t.fecha && t.fecha.startsWith(mesAnterior); })
                                    .reduce(function(s, t) { return s + t.monto; }, 0);
      var diff = gastos - gastosMesAnterior;
      var variacionEl = document.getElementById('kpiVariacion');
      if (gastosMesAnterior === 0) {
        variacionEl.textContent = 'Nuevo';
        variacionEl.className = 'kpi-valor';
      } else {
        var signo = diff > 0 ? '↑' : '↓';
        variacionEl.textContent = signo + ' $' + App.formatearMonto(Math.abs(diff));
        variacionEl.className = 'kpi-valor ' + (diff < 0 ? 'text-emerald-500' : 'text-red-500');
      }

      App.obtenerMetas(function(metas) {
        var totalAhorradoMetas = metas.reduce(function(s, m) { return s + (m.ahorrado || 0); }, 0);
        var metasActivas = metas.filter(function(m) { return m.ahorrado < m.costoTotal; }).length;
        document.getElementById('kpiMetas').textContent = metasActivas + ' activas';
        document.getElementById('kpiAhorroMetas').textContent = '$' + App.formatearMonto(totalAhorradoMetas);
      });

      var lista = document.getElementById('listaTransacciones');
      if (filtradas.length === 0) {
        lista.innerHTML = '<p class="texto-secundario text-center">No hay movimientos</p>';
      } else {
        var html = '';
        var cats = App.categoriasState || [];
        filtradas.sort(function(a, b) { return (b.fecha + b.id).localeCompare(a.fecha + a.id); });
        filtradas.forEach(function(t) {
          var cat = cats.find(function(c) { return c.nombre === t.categoria; });
          var emoji = cat ? cat.emoji : '📌';
          var color = t.tipo === 'ingreso' ? 'text-emerald-500' : 'text-red-500';
          var fecha = new Date(t.fecha + 'T00:00:00').toLocaleDateString();
          var metodoInfo = t.metodoPago ? ' · ' + t.metodoPago : '';
          var subInfo = t.subcategoria ? ' · ' + t.subcategoria : '';
          html += '<div class="movimiento-item">' +
            '<span class="emoji">' + emoji + '</span>' +
            '<div class="descripcion"><strong>' + t.descripcion + '</strong><small>' + fecha + metodoInfo + subInfo + '</small></div>' +
            '<span class="' + color + ' font-bold">' + (t.tipo === 'ingreso' ? '+' : '-') + '$' + App.formatearMonto(t.monto) + '</span>' +
            '<button class="btn-editar" data-id="' + t.id + '" data-tipo="' + t.tipo + '" data-cat="' + t.categoria + '" data-subcat="' + (t.subcategoria || '') + '" data-desc="' + t.descripcion + '" data-monto="' + t.monto + '" data-fecha="' + t.fecha + '" data-metodo="' + (t.metodoPago || '') + '">✏️</button>' +
            '<button class="btn-delete" data-id="' + t.id + '">✕</button>' +
            '</div>';
        });
        lista.innerHTML = html;
        lista.querySelectorAll('.btn-editar').forEach(function(b) {
          b.addEventListener('click', function() {
            document.getElementById('idTransaccionEditar').value = this.dataset.id;
            document.getElementById('fechaEditar').value = this.dataset.fecha;
            document.getElementById('descripcionEditar').value = this.dataset.desc;
            document.getElementById('montoEditar').value = this.dataset.monto;
            var tipo = this.dataset.tipo;
            var selectEditar = document.getElementById('categoriaEditar');
            var catsFiltradas = (App.categoriasState || []).filter(function(c) { return c.tipo === tipo; });
            selectEditar.innerHTML = catsFiltradas.map(function(c) {
              return '<option value="' + c.nombre + '"' + (c.nombre === this.dataset.cat ? ' selected' : '') + '>' + c.emoji + ' ' + c.nombre + '</option>';
            }.bind(this)).join('');
            document.getElementById('metodoPagoEditar').value = this.dataset.metodo;
            document.getElementById('subcategoriaEditar').value = this.dataset.subcat;
            modalEditar.classList.remove('hidden');
          });
        });
        lista.querySelectorAll('.btn-delete').forEach(function(b) {
          b.addEventListener('click', function() {
            if (confirm('¿Eliminar esta transacción?')) App.eliminarTransaccion(this.dataset.id);
          });
        });
      }

      if (typeof App.actualizarGraficaTendencia === 'function') {
        App.actualizarGraficaTendencia(transacciones, mesSeleccionado);
      }
    }

    // ==================== FUNCIONES AUXILIARES ====================
    function llenarSelectCategorias() {
      var select = document.getElementById('categoria');
      if (!select) return;
      var cats = (App.categoriasState || []).filter(function(c) { return c.tipo === tipoTransaccion; });
      select.innerHTML = cats.map(function(c) {
        return '<option value="' + c.nombre + '">' + c.emoji + ' ' + c.nombre + '</option>';
      }).join('');
      llenarSelectSubcategorias();
    }

    function llenarSelectSubcategorias() {
      var select = document.getElementById('subcategoria');
      if (!select) return;
      var catSeleccionada = document.getElementById('categoria').value;
      var subcats = App.subcategoriasPorCategoria[catSeleccionada] || [];
      var html = '<option value="">Sin subcategoría</option>';
      subcats.forEach(function(sub) {
        html += '<option value="' + sub + '">' + sub + '</option>';
      });
      select.innerHTML = html;
    }

    document.getElementById('categoria').addEventListener('change', llenarSelectSubcategorias);

    function llenarSelectMetodosPago() {
      var selectAgregar = document.getElementById('metodoPago');
      var selectEditar = document.getElementById('metodoPagoEditar');
      var filtroSelect = document.getElementById('filtroMetodoPago');
      var opciones = '<option value="">Método de pago (opcional)</option>';
      metodosPago.forEach(function(m) { opciones += '<option value="' + m.nombre + '">' + m.nombre + '</option>'; });
      if (selectAgregar) selectAgregar.innerHTML = opciones;
      if (selectEditar) selectEditar.innerHTML = opciones;
      if (filtroSelect) {
        filtroSelect.innerHTML = '<option value="">Todos los métodos de pago</option>' + metodosPago.map(function(m) { return '<option value="' + m.nombre + '">' + m.nombre + '</option>'; }).join('');
      }
    }

    function renderizarListaCategorias() {
      var cont = document.getElementById('listaCategorias');
      if (!cont) return;
      if (!App.categoriasState || App.categoriasState.length === 0) {
        cont.innerHTML = '<p class="texto-secundario text-center py-4">No hay categorías</p>';
        return;
      }
      var html = '';
      App.categoriasState.forEach(function(c) {
        html += '<div class="cat-card">' +
          '<div class="cat-info">' +
            '<span class="cat-emoji">' + c.emoji + '</span>' +
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

    // ==================== ADMIN ====================
    function cargarOrganizaciones() {
      var cont = document.getElementById('listaOrganizaciones');
      if (!cont) return;
      App.obtenerOrganizaciones(function(orgs) {
        if (orgs.length === 0) {
          cont.innerHTML = '<p class="texto-secundario text-center py-2">Sin organizaciones</p>';
          return;
        }
        var html = '';
        orgs.forEach(function(org) {
          html += '<div class="org-item">' +
            '<span>' + org.nombre + '</span>' +
            '<button class="btn-eliminar-org" data-id="' + org.id + '">✕</button>' +
            '</div>';
        });
        cont.innerHTML = html;
        cont.querySelectorAll('.btn-eliminar-org').forEach(function(btn) {
          btn.addEventListener('click', function() {
            if (confirm('¿Eliminar organización?')) App.eliminarOrganizacion(this.dataset.id);
          });
        });
      });
    }

    document.getElementById('btnCrearOrganizacion').addEventListener('click', function() {
      var nombre = document.getElementById('nombreOrganizacion').value.trim();
      if (nombre) {
        App.crearOrganizacion(nombre).then(function() {
          document.getElementById('nombreOrganizacion').value = '';
          cargarOrganizaciones();
        });
      }
    });

    function cargarUsuariosAdmin() {
      var cont = document.getElementById('listaUsuariosAdmin');
      if (!cont) return;
      App.obtenerUsuariosVinculados(function(usuarios) {
        if (usuarios.length === 0) {
          cont.innerHTML = '<p class="texto-secundario text-center py-4">No hay usuarios vinculados</p>';
          return;
        }
        var html = '';
        usuarios.forEach(function(usuario) {
          html += '<div class="usuario-admin-card">' +
            '<span class="font-medium">' + usuario.email + '</span>' +
            '<div class="flex gap-2">' +
              '<button class="btn-ver-usuario-admin text-xs" data-uid="' + usuario.uid + '">Ver</button>' +
              '<button class="btn-eliminar-vinculo text-red-500" data-uid="' + usuario.uid + '">✕</button>' +
            '</div>' +
          '</div>';
        });
        cont.innerHTML = html;

        cont.querySelectorAll('.btn-eliminar-vinculo').forEach(function(btn) {
          btn.addEventListener('click', function() {
            if (confirm('¿Eliminar vinculación?')) {
              App.eliminarVinculacion(this.dataset.uid);
            }
          });
        });

        cont.querySelectorAll('.btn-ver-usuario-admin').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var uid = this.dataset.uid;
            App.obtenerTransaccionesDeUsuario(uid, function(transacciones) {
              var detalleCont = document.getElementById('detalleUsuarioAdmin');
              if (!detalleCont) return;
              var detalleHtml = '<h4 class="font-bold mt-4">Transacciones</h4>';
              if (transacciones.length === 0) {
                detalleHtml += '<p class="texto-secundario">Sin transacciones</p>';
              } else {
                transacciones.forEach(function(t) {
                  detalleHtml += '<div class="text-sm">' + t.descripcion + ' - $' + App.formatearMonto(t.monto) + '</div>';
                });
              }
              detalleCont.innerHTML = detalleHtml;
            });
          });
        });
      });
    }

    document.getElementById('btnVincularUsuario').addEventListener('click', function() {
      var email = document.getElementById('emailUsuarioVincular').value.trim();
      if (email) {
        App.vincularUsuarioPorEmail(email, function() {
          document.getElementById('emailUsuarioVincular').value = '';
          cargarUsuariosAdmin();
        });
      }
    });

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
        App.obtenerRolUsuario(function(rol) {
          var btnAdmin = document.getElementById('btnAdmin');
          if (btnAdmin) {
            if (rol === 'admin') btnAdmin.classList.remove('hidden');
            else btnAdmin.classList.add('hidden');
          }
        });
      });
    };

    var formCat = document.getElementById('formCategoria');
    if (formCat) {
      formCat.addEventListener('submit', function(e) {
        e.preventDefault();
        var nombre = document.getElementById('nombreCategoria').value.trim();
        var emoji = document.getElementById('emojiCategoria').value.trim() || '📌';
        var color = document.getElementById('colorCategoria').value;
        var tipo = document.getElementById('tipoCategoria').value;
        if (!nombre) return;
        App.agregarCategoria(nombre, emoji, color, tipo);
        formCat.reset();
        document.getElementById('colorCategoria').value = '#10b981';
        document.getElementById('emojiCategoria').value = '';
      });
    }
  });
})();
