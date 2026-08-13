// Pantalla de presupuesto – pestañas Gastos e Ingresos
(function() {
  const App = window.App;

  // ==================== ESTRUCTURA GENERAL ====================
  function crearEstructura() {
    var html = '';
    html += '<div class="presupuesto-tabs">';
    html += '<button id="tabPresupuestoMensual" class="presupuesto-tab active">Presupuesto mensual</button>';
    html += '<button id="tabMetasAhorro" class="presupuesto-tab">Metas de ahorro</button>';
    html += '</div>';
    html += '<div id="presupuestoContenido" class="mt-4"></div>';
    return html;
  }

  // ==================== PRESUPUESTO MENSUAL ====================
  function renderizarPresupuestoMensual() {
    var cont = document.getElementById('presupuestoContenido');
    if (!cont) return;

    // Sub-pestañas Gastos/Ingresos
    var html = '';
    html += '<div class="presupuesto-subtabs">';
    html += '<button id="subtabGastos" class="presupuesto-subtab active">Gastos</button>';
    html += '<button id="subtabIngresos" class="presupuesto-subtab">Ingresos</button>';
    html += '</div>';
    html += '<div id="presupuestoMensualContenido"></div>';
    cont.innerHTML = html;

    document.getElementById('subtabGastos').addEventListener('click', function() {
      document.getElementById('subtabGastos').classList.add('active');
      document.getElementById('subtabIngresos').classList.remove('active');
      renderizarVistaPresupuesto('gasto');
    });
    document.getElementById('subtabIngresos').addEventListener('click', function() {
      document.getElementById('subtabIngresos').classList.add('active');
      document.getElementById('subtabGastos').classList.remove('active');
      renderizarVistaPresupuesto('ingreso');
    });

    // Por defecto mostrar gastos
    renderizarVistaPresupuesto('gasto');
  }

  function renderizarVistaPresupuesto(tipo) {
    var cont = document.getElementById('presupuestoMensualContenido');
    if (!cont) return;
    cont.innerHTML = '<p class="text-center texto-secundario">Cargando...</p>';

    var mes = App.obtenerMesActual ? App.obtenerMesActual() : new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');

    Promise.all([
      new Promise(function(resolve) { App.obtenerTransacciones(resolve); }),
      new Promise(function(resolve) { App.obtenerCategorias(resolve); }),
      new Promise(function(resolve) { App.obtenerLimitesCategorias(mes, resolve); })
    ]).then(function(results) {
      var transacciones = results[0];
      var categorias = results[1];
      var limites = results[2];

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
      // Resumen superior
      html += '<div class="tarjeta p-5 mb-4">';
      html += '<div class="flex justify-between items-center mb-3">';
      html += '<h3 class="font-bold text-lg">' + (tipo === 'gasto' ? 'Presupuesto de gastos' : 'Meta de ingresos') + '</h3>';
      html += '<span class="text-sm texto-secundario">' + mes + '</span>';
      html += '</div>';
      html += '<div class="flex justify-center mb-4">';
      html += '<canvas id="graficaPresupuestoMensual" class="max-h-40"></canvas>';
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

      // Lista de categorías
      html += '<div class="tarjeta p-5">';
      html += '<div class="flex justify-between items-center mb-3">';
      html += '<h3 class="font-bold">Categorías</h3>';
      html += '<button id="btnAgregarLimite" class="btn btn-primario btn-sm">Añadir</button>';
      html += '</div>';
      html += '<div id="listaCategoriasPresupuesto" class="space-y-3"></div>';
      // Formulario oculto
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

      // Dibujar gráfico de anillo
      setTimeout(function() {
        var canvas = document.getElementById('graficaPresupuestoMensual');
        if (canvas) {
          if (App.graficaPresupuestoMensualChart) App.graficaPresupuestoMensualChart.destroy();
          var ctx = canvas.getContext('2d');
          var p = Math.min(porcentaje, 100);
          App.graficaPresupuestoMensualChart = new Chart(ctx, {
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

      // Llenar lista de categorías
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
              renderizarVistaPresupuesto(tipo);
            });
          }
        });
      });

      // Botón añadir
      document.getElementById('btnAgregarLimite').addEventListener('click', function() {
        mostrarFormularioLimite(tipo);
      });

      // Función para mostrar/ocultar formulario
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
            renderizarVistaPresupuesto(tipo);
          });
        };
        document.getElementById('btnCancelarLimite').onclick = function() {
          form.classList.add('hidden');
        };
      }
    });
  }

  // ==================== METAS DE AHORRO (mantener igual) ====================
  function renderizarMetas() {
    var cont = document.getElementById('presupuestoContenido');
    if (!cont) return;
    cont.innerHTML = '<p class="text-center texto-secundario">Cargando metas...</p>';

    App.obtenerMetas(function(metas) {
      var html = '';
      html += '<div class="mb-4">';
      html += '<button id="btnNuevaMeta" class="btn btn-primario w-full">+ Nueva meta de ahorro</button>';
      html += '</div>';
      html += '<div id="formNuevaMeta" class="hidden tarjeta p-4 mb-4">';
      html += '<h3 class="font-bold mb-2">Nueva meta</h3>';
      html += '<input type="text" id="nombreMeta" placeholder="Nombre (ej: PC Gamer)" class="input-field mb-2">';
      html += '<input type="number" id="costoTotalMeta" placeholder="Costo total estimado" class="input-field mb-2">';
      html += '<input type="number" id="ahorroInicialMeta" placeholder="Ahorro inicial (opcional)" class="input-field mb-2">';
      html += '<input type="date" id="fechaLimiteMeta" class="input-field mb-2">';
      html += '<div class="flex gap-2">';
      html += '<button id="btnGuardarMeta" class="btn btn-primario flex-1">Guardar</button>';
      html += '<button id="btnCancelarMeta" class="btn btn-outline flex-1">Cancelar</button>';
      html += '</div>';
      html += '</div>';

      if (metas.length === 0) {
        html += '<p class="text-center texto-secundario py-4">No tienes metas de ahorro. ¡Crea la primera!</p>';
      } else {
        html += '<div class="metas-lista space-y-3">';
        metas.forEach(function(meta) {
          var porcentaje = meta.costoTotal > 0 ? (meta.ahorrado / meta.costoTotal) * 100 : 0;
          var color = porcentaje >= 100 ? '#10b981' : '#3b82f6';
          html += '<div class="meta-card" data-id="' + meta.id + '">';
          html += '<div class="flex justify-between items-center mb-1">';
          html += '<span class="font-bold">' + meta.nombre + '</span>';
          html += '<span class="text-xs texto-secundario">' + (meta.fechaLimite ? new Date(meta.fechaLimite).toLocaleDateString() : 'Sin fecha') + '</span>';
          html += '</div>';
          html += '<div class="progress-bar"><div class="progress-fill" style="width:' + Math.min(porcentaje, 100) + '%; background-color:' + color + ';"></div></div>';
          html += '<div class="flex justify-between text-sm mt-1">';
          html += '<span class="font-semibold">$' + meta.ahorrado.toFixed(2) + '</span>';
          html += '<span class="texto-secundario">de $' + meta.costoTotal.toFixed(2) + '</span>';
          html += '</div>';
          html += '<div class="flex gap-2 mt-2">';
          html += '<button class="btn-detalle-meta btn btn-outline-small flex-1" data-id="' + meta.id + '">Detalle</button>';
          html += '<button class="btn-eliminar-meta text-red-500 text-lg" data-id="' + meta.id + '">✕</button>';
          html += '</div>';
          html += '</div>';
        });
        html += '</div>';
      }

      cont.innerHTML = html;

      document.getElementById('btnNuevaMeta').addEventListener('click', function() {
        document.getElementById('formNuevaMeta').classList.remove('hidden');
      });
      document.getElementById('btnCancelarMeta').addEventListener('click', function() {
        document.getElementById('formNuevaMeta').classList.add('hidden');
      });
      document.getElementById('btnGuardarMeta').addEventListener('click', function() {
        var nombre = document.getElementById('nombreMeta').value.trim();
        var costoTotal = parseFloat(document.getElementById('costoTotalMeta').value);
        var ahorroInicial = parseFloat(document.getElementById('ahorroInicialMeta').value) || 0;
        var fechaLimite = document.getElementById('fechaLimiteMeta').value;
        if (!nombre || isNaN(costoTotal) || costoTotal <= 0) return;
        App.agregarMeta({
          nombre: nombre,
          costoTotal: costoTotal,
          ahorrado: ahorroInicial,
          fechaLimite: fechaLimite || null
        }).then(function() {
          renderizarMetas();
        });
      });

      document.querySelectorAll('.btn-eliminar-meta').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (confirm('¿Eliminar esta meta?')) App.eliminarMeta(this.dataset.id);
        });
      });
      document.querySelectorAll('.btn-detalle-meta').forEach(function(btn) {
        btn.addEventListener('click', function() {
          renderizarDetalleMeta(this.dataset.id);
        });
      });
    });
  }

  function renderizarDetalleMeta(metaId) {
    var cont = document.getElementById('presupuestoContenido');
    if (!cont) return;
    cont.innerHTML = '<p class="text-center texto-secundario">Cargando detalle...</p>';

    App.obtenerMetas(function(metas) {
      var meta = metas.find(function(m) { return m.id === metaId; });
      if (!meta) return;
      App.obtenerItemsMeta(metaId, function(items) {
        var html = '';
        html += '<button id="btnVolverMetas" class="btn btn-outline-small mb-3">← Volver</button>';
        html += '<div class="tarjeta p-4 mb-4">';
        html += '<h3 class="font-bold text-lg">' + meta.nombre + '</h3>';
        html += '<p class="text-sm texto-secundario">Costo total: $' + meta.costoTotal.toFixed(2) + ' | Ahorrado: $' + meta.ahorrado.toFixed(2) + '</p>';
        html += '<div class="progress-bar mt-2"><div class="progress-fill" style="width:' + Math.min((meta.ahorrado / meta.costoTotal) * 100, 100) + '%; background-color:#3b82f6;"></div></div>';
        html += '</div>';

        html += '<div class="tarjeta p-4">';
        html += '<div class="flex justify-between items-center mb-3">';
        html += '<h4 class="font-bold">Desglose de artículos</h4>';
        html += '<button id="btnNuevoItem" class="btn btn-primario btn-sm">+ Añadir</button>';
        html += '</div>';
        html += '<div id="listaItemsMeta" class="space-y-2"></div>';
        html += '<div id="formNuevoItem" class="hidden mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">';
        html += '<input type="text" id="nombreItem" placeholder="Nombre del artículo" class="input-field mb-2">';
        html += '<input type="number" id="costoItem" placeholder="Costo" class="input-field mb-2">';
        html += '<label class="flex items-center gap-2"><input type="checkbox" id="compradoItem"> Comprado</label>';
        html += '<div class="flex gap-2 mt-2">';
        html += '<button id="btnGuardarItem" class="btn btn-primario flex-1">Guardar</button>';
        html += '<button id="btnCancelarItem" class="btn btn-outline flex-1">Cancelar</button>';
        html += '</div>';
        html += '</div>';
        html += '</div>';

        cont.innerHTML = html;

        var lista = document.getElementById('listaItemsMeta');
        if (items.length === 0) {
          lista.innerHTML = '<p class="texto-secundario text-center">Sin artículos</p>';
        } else {
          var itemsHtml = '';
          items.forEach(function(item) {
            itemsHtml += '<div class="item-meta flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">';
            itemsHtml += '<div><span class="font-medium">' + item.nombre + '</span><span class="text-xs texto-secundario ml-2">$' + item.costo.toFixed(2) + '</span></div>';
            itemsHtml += '<div class="flex items-center gap-2">';
            itemsHtml += '<input type="checkbox" class="checkbox-comprado" data-id="' + item.id + '"' + (item.comprado ? ' checked' : '') + '>';
            itemsHtml += '<button class="btn-eliminar-item text-red-500" data-id="' + item.id + '">✕</button>';
            itemsHtml += '</div>';
            itemsHtml += '</div>';
          });
          lista.innerHTML = itemsHtml;
          lista.querySelectorAll('.checkbox-comprado').forEach(function(cb) {
            cb.addEventListener('change', function() {
              App.actualizarItemMeta(metaId, this.dataset.id, { comprado: this.checked });
            });
          });
          lista.querySelectorAll('.btn-eliminar-item').forEach(function(btn) {
            btn.addEventListener('click', function() {
              if (confirm('¿Eliminar este artículo?')) App.eliminarItemMeta(metaId, this.dataset.id);
            });
          });
        }

        document.getElementById('btnNuevoItem').addEventListener('click', function() {
          document.getElementById('formNuevoItem').classList.remove('hidden');
        });
        document.getElementById('btnCancelarItem').addEventListener('click', function() {
          document.getElementById('formNuevoItem').classList.add('hidden');
        });
        document.getElementById('btnGuardarItem').addEventListener('click', function() {
          var nombre = document.getElementById('nombreItem').value.trim();
          var costo = parseFloat(document.getElementById('costoItem').value);
          var comprado = document.getElementById('compradoItem').checked;
          if (!nombre || isNaN(costo) || costo < 0) return;
          App.agregarItemMeta(metaId, { nombre: nombre, costo: costo, comprado: comprado }).then(function() {
            renderizarDetalleMeta(metaId);
          });
        });

        document.getElementById('btnVolverMetas').addEventListener('click', function() {
          renderizarMetas();
        });
      });
    });
  }

  // ==================== CARGA INICIAL ====================
  App.cargarPantallaPresupuesto = function() {
    var contenedor = document.getElementById('contenidoPresupuesto');
    if (!contenedor) return;
    if (!document.getElementById('presupuestoContenido')) {
      contenedor.innerHTML = crearEstructura();
      document.getElementById('tabPresupuestoMensual').addEventListener('click', function() {
        document.getElementById('tabPresupuestoMensual').classList.add('active');
        document.getElementById('tabMetasAhorro').classList.remove('active');
        renderizarPresupuestoMensual();
      });
      document.getElementById('tabMetasAhorro').addEventListener('click', function() {
        document.getElementById('tabMetasAhorro').classList.add('active');
        document.getElementById('tabPresupuestoMensual').classList.remove('active');
        renderizarMetas();
      });
    }
    // Mostrar Presupuesto mensual por defecto
    renderizarPresupuestoMensual();
  };
})();
