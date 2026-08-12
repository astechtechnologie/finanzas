(function() {
  const App = window.App;

  function getMes() {
    return (typeof App.obtenerMesActual === 'function') ? App.obtenerMesActual() : new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
  }

  document.addEventListener('DOMContentLoaded', function() {
    var mesSeleccionado = getMes();
    var tipoTransaccion = 'ingreso';

    var vistas = {
      inicio: document.getElementById('vistaInicio'),
      presupuesto: document.getElementById('vistaPresupuesto'),
      categorias: document.getElementById('vistaCategorias'),
      ajustes: document.getElementById('vistaAjustes')
    };
    var navItems = document.querySelectorAll('.nav-item');
    var titulo = document.getElementById('tituloSeccion');
    var modal = document.getElementById('modalTransaccion');
    var modalEditar = document.getElementById('modalEditarTransaccion');
    var fab = document.getElementById('fabAgregar');
    var filtroMes = document.getElementById('filtroMesHeader');

    if (!vistas.inicio) return;

    function cambiarVista(nombreVista) {
      var clave = nombreVista.replace('vista', '').toLowerCase();
      Object.values(vistas).forEach(function(v) { v.classList.remove('activa'); });
      vistas[clave].classList.add('activa');

      navItems.forEach(function(item) { item.classList.remove('active'); });
      var itemActivo = document.querySelector('[data-vista="' + nombreVista + '"]');
      if (itemActivo) itemActivo.classList.add('active');

      var titulos = { inicio: 'Inicio', presupuesto: 'Presupuesto', categorias: 'Categorías', ajustes: 'Ajustes' };
      titulo.textContent = titulos[clave];

      if (clave === 'presupuesto' && typeof App.cargarPantallaPresupuesto === 'function') {
        App.cargarPantallaPresupuesto();
      }
      if (clave === 'categorias') {
        renderizarListaCategorias();
      }
    }

    navItems.forEach(function(item) {
      item.addEventListener('click', function() {
        cambiarVista(this.dataset.vista);
      });
    });

    // Filtro de mes
    filtroMes.value = mesSeleccionado;
    filtroMes.addEventListener('change', function() {
      mesSeleccionado = filtroMes.value;
      if (App.auth.currentUser) App.obtenerTransacciones(function(t) { actualizarDashboard(t); });
    });

    // FAB
    fab.addEventListener('click', function() { modal.classList.remove('hidden'); });

    // Modal Agregar
    document.getElementById('btnCancelarModal').addEventListener('click', function() { modal.classList.add('hidden'); });
    document.getElementById('btnGuardarModal').addEventListener('click', function() {
      var cat = document.getElementById('categoria').value;
      var desc = document.getElementById('descripcion').value.trim();
      var monto = document.getElementById('monto').value;
      var fecha = document.getElementById('fecha').value;
      if (!cat || !desc || !monto) return;
      App.agregarTransaccion(tipoTransaccion, cat, desc, monto, fecha);
      modal.classList.add('hidden');
      document.getElementById('descripcion').value = '';
      document.getElementById('monto').value = '';
    });

    // Pestañas tipo
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

    // Modal Editar
    document.getElementById('btnCancelarEditar').addEventListener('click', function() { modalEditar.classList.add('hidden'); });
    document.getElementById('btnGuardarEditar').addEventListener('click', function() {
      var id = document.getElementById('idTransaccionEditar').value;
      var cat = document.getElementById('categoriaEditar').value;
      var desc = document.getElementById('descripcionEditar').value.trim();
      var monto = parseFloat(document.getElementById('montoEditar').value);
      var fecha = document.getElementById('fechaEditar').value;
      if (!id || !cat || !desc || isNaN(monto)) return;
      App.actualizarTransaccion(id, { categoria: cat, descripcion: desc, monto: monto, fecha: fecha });
      modalEditar.classList.add('hidden');
    });

    // Exportar CSV
    document.getElementById('btnExportarCSV').addEventListener('click', function() {
      App.obtenerTransacciones(function(todas) {
        var filtradas = todas.filter(function(t) { return t.fecha && t.fecha.startsWith(mesSeleccionado); });
        var csv = 'Tipo,Categoría,Descripción,Monto,Fecha\n';
        filtradas.forEach(function(t) {
          csv += t.tipo + ',' + t.categoria + ',' + t.descripcion + ',' + t.monto + ',' + t.fecha + '\n';
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

    // ========== DASHBOARD MEJORADO ==========
    function actualizarDashboard(transacciones) {
      // Filtradas del mes actual
      var filtradas = transacciones.filter(function(t) { return t.fecha && t.fecha.startsWith(mesSeleccionado); });
      var ingresos = 0, gastos = 0;
      filtradas.forEach(function(t) { t.tipo === 'ingreso' ? ingresos += t.monto : gastos += t.monto; });
      var balance = ingresos - gastos;

      // Totales principales
      document.getElementById('totalIngresos').textContent = '$' + ingresos.toFixed(2);
      document.getElementById('totalGastos').textContent = '$' + gastos.toFixed(2);
      var bel = document.getElementById('balance');
      bel.textContent = '$' + balance.toFixed(2);
      bel.className = balance >= 0 ? 'text-emerald-500' : 'text-red-500';

      // --- KPIs ---
      // Días transcurridos del mes actual
      var partes = mesSeleccionado.split('-');
      var año = parseInt(partes[0]), mesNum = parseInt(partes[1]);
      var ahora = new Date();
      var diasEnMes = new Date(año, mesNum, 0).getDate();
      var diaActual = (ahora.getFullYear() === año && (ahora.getMonth() + 1) === mesNum) ? ahora.getDate() : diasEnMes;
      var diasTranscurridos = Math.min(diaActual, diasEnMes);

      // Promedio diario
      var promedioDiario = diasTranscurridos > 0 ? gastos / diasTranscurridos : 0;
      document.getElementById('kpiPromedioDiario').textContent = '$' + promedioDiario.toFixed(2);

      // Categoría de gasto más usada (por monto total)
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

      // Ahorro (% de ingresos no gastados)
      var porcentajeAhorro = ingresos > 0 ? ((ingresos - gastos) / ingresos) * 100 : 0;
      document.getElementById('kpiAhorro').textContent = porcentajeAhorro.toFixed(1) + '%';
      document.getElementById('kpiAhorro').className = 'kpi-valor ' + (porcentajeAhorro >= 0 ? 'text-emerald-500' : 'text-red-500');

      // Comparativa vs mes anterior
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
        variacionEl.textContent = signo + ' $' + Math.abs(diff).toFixed(2);
        variacionEl.className = 'kpi-valor ' + (diff < 0 ? 'text-emerald-500' : 'text-red-500');
      }

      // --- Lista de movimientos (igual que antes) ---
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
          html += '<div class="movimiento-item">' +
            '<span class="emoji">' + emoji + '</span>' +
            '<div class="descripcion"><strong>' + t.descripcion + '</strong><small>' + new Date(t.fecha + 'T00:00:00').toLocaleDateString() + '</small></div>' +
            '<span class="' + color + ' font-bold">' + (t.tipo === 'ingreso' ? '+' : '-') + '$' + t.monto.toFixed(2) + '</span>' +
            '<button class="btn-editar" data-id="' + t.id + '" data-tipo="' + t.tipo + '" data-cat="' + t.categoria + '" data-desc="' + t.descripcion + '" data-monto="' + t.monto + '" data-fecha="' + t.fecha + '">✏️</button>' +
            '<button class="btn-delete" data-id="' + t.id + '">✕</button>' +
            '</div>';
        });
        lista.innerHTML = html;
        // Eventos editar y eliminar
        lista.querySelectorAll('.btn-editar').forEach(function(b) {
          b.addEventListener('click', function() {
            document.getElementById('idTransaccionEditar').value = this.dataset.id;
            document.getElementById('fechaEditar').value = this.dataset.fecha;
            document.getElementById('descripcionEditar').value = this.dataset.desc;
            document.getElementById('montoEditar').value = this.dataset.monto;
            var tipo = this.dataset.tipo;
            var selectEditar = document.getElementById('categoriaEditar');
            var filtradasCat = (App.categoriasState || []).filter(function(c) { return c.tipo === tipo; });
            selectEditar.innerHTML = filtradasCat.map(function(c) {
              return '<option value="' + c.nombre + '"' + (c.nombre === this.dataset.cat ? ' selected' : '') + '>' + c.emoji + ' ' + c.nombre + '</option>';
            }.bind(this)).join('');
            modalEditar.classList.remove('hidden');
          });
        });
        lista.querySelectorAll('.btn-delete').forEach(function(b) {
          b.addEventListener('click', function() {
            if (confirm('¿Eliminar esta transacción?')) App.eliminarTransaccion(this.dataset.id);
          });
        });
      }

      // Gráfico de tendencia
      if (typeof App.actualizarGraficaTendencia === 'function') {
        App.actualizarGraficaTendencia(transacciones, mesSeleccionado);
      }
    }

    function llenarSelectCategorias() {
      var select = document.getElementById('categoria');
      if (!select) return;
      var filtradas = (App.categoriasState || []).filter(function(c) { return c.tipo === tipoTransaccion; });
      select.innerHTML = filtradas.map(function(c) {
        return '<option value="' + c.nombre + '">' + c.emoji + ' ' + c.nombre + '</option>';
      }).join('');
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
          if (confirm('¿Eliminar esta categoría?')) {
            App.eliminarCategoria(this.dataset.id);
          }
        });
      });
    }

    App.cargarDatosIniciales = function() {
      App.obtenerCategorias(function(cats) {
        App.categoriasState = cats;
        llenarSelectCategorias();
        renderizarListaCategorias();
        App.obtenerTransacciones(function(t) { actualizarDashboard(t); });
      });
    };

    // Formulario de categoría
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
