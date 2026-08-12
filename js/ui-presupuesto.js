// Pantalla de presupuesto – pestañas Gastos e Ingresos
(function() {
  const App = window.App;

  function crearEstructura() {
    var html = '';
    html += '<div class="presupuesto-tabs">';
    html += '<button id="tabPresupuestoGastos" class="presupuesto-tab active">Gastos</button>';
    html += '<button id="tabPresupuestoIngresos" class="presupuesto-tab">Ingresos</button>';
    html += '</div>';
    html += '<div id="presupuestoContenido" class="mt-4"></div>';
    return html;
  }

  function renderizarVista(tipo) {
    var cont = document.getElementById('presupuestoContenido');
    if (!cont) return;
    var mes = App.obtenerMesActual ? App.obtenerMesActual() : new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');

    Promise.all([
      new Promise(function(resolve) { App.obtenerTransacciones(resolve); }),
      new Promise(function(resolve) { App.obtenerCategorias(resolve); }),
      new Promise(function(resolve) { App.obtenerLimitesCategorias(mes, resolve); }),
      new Promise(function(resolve) { App.obtenerHistorialPresupuestos(resolve); })
    ]).then(function(results) {
      var transacciones = results[0];
      var categorias = results[1];
      var limites = results[2];
      var historial = results[3];

      var catsFiltradas = categorias.filter(function(c) { return c.tipo === tipo; });
      var limitesTipo = limites[tipo === 'ingreso' ? 'ingresos' : 'gastos'] || {};
      var transFiltradas = transacciones.filter(function(t) { return t.tipo === tipo && t.fecha && t.fecha.startsWith(mes); });

      var totalReal = transFiltradas.reduce(function(s, t) { return s + t.monto; }, 0);
      var totalPresupuestado = Object.values(limitesTipo).reduce(function(s, v) { return s + v; }, 0);

      var porcentaje = totalPresupuestado > 0 ? (totalReal / totalPresupuestado) * 100 : 0;
      var color = tipo === 'gasto'
        ? (porcentaje > 100 ? '#ef4444' : porcentaje > 80 ? '#f97316' : '#10b981')
        : (porcentaje < 100 ? '#ef4444' : '#10b981');

      var html = '';
      html += '<div class="presupuesto-resumen tarjeta p-5 mb-4">';
      html += '<div class="flex justify-between items-center mb-3">';
      html += '<h3 class="font-bold text-lg">' + (tipo === 'gasto' ? 'Presupuesto de gastos' : 'Meta de ingresos') + '</h3>';
      html += '<span class="text-sm texto-secundario">' + mes + '</span>';
      html += '</div>';
      html += '<div class="flex justify-center mb-4">';
      html += '<canvas id="graficaPresupuesto" class="max-h-40"></canvas>';
      html += '</div>';
      html += '<div class="grid grid-cols-2 gap-2 text-center">';
      html += '<div><p class="text-xs texto-secundario">' + (tipo === 'gasto' ? 'Gastado' : 'Ingresado') + '</p><p class="text-xl font-bold">$' + totalReal.toFixed(2) + '</p></div>';
      html += '<div><p class="text-xs texto-secundario">Presupuesto</p><p class="text-xl font-bold">$' + totalPresupuestado.toFixed(2) + '</p></div>';
      html += '</div>';
      html += '<div class="mt-2 text-center">';

      var diferencia = totalReal - totalPresupuestado;
      if (tipo === 'gasto') {
        if (totalReal > totalPresupuestado) {
          html += '<span class="text-sm font-semibold text-red-500">Excedido por $' + diferencia.toFixed(2) + '</span>';
        } else {
          html += '<span class="text-sm font-semibold text-emerald-500">Restan $' + Math.abs(diferencia).toFixed(2) + '</span>';
        }
      } else {
        if (totalReal >= totalPresupuestado) {
          html += '<span class="text-sm font-semibold text-emerald-500">Meta cumplida</span>';
        } else {
          html += '<span class="text-sm font-semibold text-red-500">Faltan $' + Math.abs(diferencia).toFixed(2) + '</span>';
        }
      }
      html += '</div>';
      html += '</div>';

      html += '<div class="tarjeta p-5 mb-4">';
      html += '<div class="flex justify-between items-center mb-3">';
      html += '<h3 class="font-bold">Categorías</h3>';
      html += '<button id="btnAgregarLimite" class="btn btn-primario btn-sm">Añadir</button>';
      html += '</div>';
      html += '<div id="listaCategoriasPresupuesto" class="space-y-3"></div>';
      html += '<div id="formLimite" class="hidden mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">';
      html += '<select id="selectCategoriaLimite" class="input-field mb-2"></select>';
      html += '<input type="number" id="inputLimiteValor" placeholder="Monto límite" class="input-field mb-2">';
      html += '<div class="flex gap-2">';
      html += '<button id="btnGuardarLimite" class="btn btn-primario flex-1">Guardar</button>';
      html += '<button id="btnCancelarLimite" class="btn btn-outline flex-1">Cancelar</button>';
      html += '</div>';
      html += '</div>';
      html += '</div>';

      cont.innerHTML = html;

      // Gráfico de anillo
      setTimeout(function() {
        if (App.graficaPresupuestoChart) App.graficaPresupuestoChart.destroy();
        var ctx = document.getElementById('graficaPresupuesto');
        if (ctx) {
          ctx = ctx.getContext('2d');
          var p = Math.min(porcentaje, 100);
          App.graficaPresupuestoChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
              datasets: [{
                data: [p, 100 - p],
                backgroundColor: [color, '#e5e7eb'],
                borderWidth: 0
              }]
            },
            options: {
              responsive: true,
              cutout: '80%',
              plugins: { legend: { display: false }, tooltip: { enabled: false } }
            }
          });
        }
      }, 100);

      // Lista de categorías con límites
      var listaEl = document.getElementById('listaCategoriasPresupuesto');
      var listaHtml = '';
      catsFiltradas.forEach(function(c) {
        var limite = limitesTipo[c.nombre] || 0;
        var real = transFiltradas.filter(function(t) { return t.categoria === c.nombre; }).reduce(function(s, t) { return s + t.monto; }, 0);
        var pCat = limite > 0 ? (real / limite) * 100 : 0;
        var colorBarra = pCat > 100 ? '#ef4444' : pCat > 80 ? '#f97316' : '#10b981';
        listaHtml += '<div class="presupuesto-cat-item">';
        listaHtml += '<div class="flex justify-between items-center mb-1">';
        listaHtml += '<span class="font-medium">' + c.emoji + ' ' + c.nombre + '</span>';
        listaHtml += '<span class="text-xs texto-secundario">$' + real.toFixed(2) + ' / $' + limite.toFixed(2) + '</span>';
        listaHtml += '</div>';
        listaHtml += '<div class="progress-bar"><div class="progress-fill" style="width:' + Math.min(pCat, 100) + '%; background-color:' + colorBarra + '; box-shadow:0 0 6px ' + colorBarra + ';"></div></div>';
        listaHtml += '<div class="flex justify-between items-center mt-1">';
        listaHtml += '<span class="text-xs texto-secundario">' + pCat.toFixed(0) + '% usado</span>';
        listaHtml += '<div class="flex gap-2">';
        listaHtml += '<button class="btn-editar-limite text-xs" data-categoria="' + c.nombre + '" data-limite="' + limite + '">Editar</button>';
        listaHtml += '<button class="btn-eliminar-limite text-xs text-red-500" data-categoria="' + c.nombre + '">Eliminar</button>';
        listaHtml += '</div>';
        listaHtml += '</div>';
        listaHtml += '</div>';
      });
      listaEl.innerHTML = listaHtml || '<p class="texto-secundario text-center">No hay categorías</p>';

      // Eventos editar/eliminar
      listaEl.querySelectorAll('.btn-editar-limite').forEach(function(btn) {
        btn.addEventListener('click', function() {
          mostrarFormularioLimite(tipo, this.dataset.categoria, parseFloat(this.dataset.limite));
        });
      });
      listaEl.querySelectorAll('.btn-eliminar-limite').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (confirm('¿Eliminar el límite para ' + this.dataset.categoria + '?')) {
            App.eliminarLimiteCategoria(mes, tipo, this.dataset.categoria, function() {
              App.cargarPantallaPresupuesto();
            });
          }
        });
      });

      // Botón añadir
      document.getElementById('btnAgregarLimite').addEventListener('click', function() {
        mostrarFormularioLimite(tipo);
      });

      // Configurar formulario
      function mostrarFormularioLimite(tipo, categoria, limite) {
        categoria = categoria || '';
        limite = limite || 0;
        var form = document.getElementById('formLimite');
        form.classList.remove('hidden');
        var select = document.getElementById('selectCategoriaLimite');
        select.innerHTML = catsFiltradas.map(function(c) {
          return '<option value="' + c.nombre + '"' + (c.nombre === categoria ? ' selected' : '') + '>' + c.emoji + ' ' + c.nombre + '</option>';
        }).join('');
        document.getElementById('inputLimiteValor').value = limite;
        document.getElementById('btnGuardarLimite').onclick = function() {
          var cat = select.value;
          var val = parseFloat(document.getElementById('inputLimiteValor').value);
          if (!cat || isNaN(val) || val < 0) return;
          App.guardarLimiteCategoria(mes, tipo, cat, val, function() {
            form.classList.add('hidden');
            App.cargarPantallaPresupuesto();
          });
        };
        document.getElementById('btnCancelarLimite').onclick = function() {
          form.classList.add('hidden');
        };
      }
    });
  }

  App.cargarPantallaPresupuesto = function() {
    var contenedor = document.getElementById('contenidoPresupuesto');
    if (!contenedor) return;
    if (!document.getElementById('presupuestoContenido')) {
      contenedor.innerHTML = crearEstructura();
      document.getElementById('tabPresupuestoGastos').addEventListener('click', function() {
        document.getElementById('tabPresupuestoGastos').classList.add('active');
        document.getElementById('tabPresupuestoIngresos').classList.remove('active');
        renderizarVista('gasto');
      });
      document.getElementById('tabPresupuestoIngresos').addEventListener('click', function() {
        document.getElementById('tabPresupuestoIngresos').classList.add('active');
        document.getElementById('tabPresupuestoGastos').classList.remove('active');
        renderizarVista('ingreso');
      });
    }
    if (document.getElementById('tabPresupuestoGastos').classList.contains('active')) {
      renderizarVista('gasto');
    } else {
      renderizarVista('ingreso');
    }
  };
})();
