(function() {
  const App = window.App;

  function crearEstructura() {
    var html = '';
    html += '<div class="presupuesto-tabs">';
    html += '<button id="tabPresupuestoMensual" class="presupuesto-tab active">Presupuesto mensual</button>';
    html += '<button id="tabMetasAhorro" class="presupuesto-tab">Metas de ahorro</button>';
    html += '<button id="tabSuscripciones" class="presupuesto-tab">Suscripciones</button>';
    html += '<button id="tabPrestamos" class="presupuesto-tab">Préstamos</button>';
    html += '</div>';
    html += '<div id="presupuestoContenido" class="mt-4"></div>';
    return html;
  }

  // ==================== PRESUPUESTO MENSUAL ====================
  function renderizarPresupuestoMensual() {
    var cont = document.getElementById('presupuestoContenido');
    if (!cont) return;
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
      html += '<div class="tarjeta p-5 mb-4">';
      html += '<div class="flex justify-between items-center mb-3">';
      html += '<h3 class="font-bold text-lg">' + (tipo === 'gasto' ? 'Presupuesto de gastos' : 'Meta de ingresos') + '</h3>';
      html += '<span class="text-sm texto-secundario">' + mes + '</span>';
      html += '</div>';
      html += '<div class="flex justify-center mb-4"><canvas id="graficaPresupuestoMensual" class="max-h-40"></canvas></div>';
      html += '<div class="grid grid-cols-2 gap-2 text-center">';
      html += '<div><p class="text-xs texto-secundario">' + (tipo === 'gasto' ? 'Gastado' : 'Ingresado') + '</p><p class="text-xl font-bold">$' + App.formatearMonto(totalReal) + '</p></div>';
      html += '<div><p class="text-xs texto-secundario">Presupuesto</p><p class="text-xl font-bold">$' + App.formatearMonto(totalPresupuestado) + '</p></div>';
      html += '</div>';
      html += '<div class="mt-2 text-center">';
      var diferencia = totalReal - totalPresupuestado;
      if (tipo === 'gasto') {
        if (totalReal > totalPresupuestado) html += '<span class="text-sm font-semibold text-red-500">Excedido por $' + App.formatearMonto(diferencia) + '</span>';
        else html += '<span class="text-sm font-semibold text-emerald-500">Restan $' + App.formatearMonto(Math.abs(diferencia)) + '</span>';
      } else {
        if (totalReal >= totalPresupuestado) html += '<span class="text-sm font-semibold text-emerald-500">Meta cumplida</span>';
        else html += '<span class="text-sm font-semibold text-red-500">Faltan $' + App.formatearMonto(Math.abs(diferencia)) + '</span>';
      }
      html += '</div></div>';

      html += '<div class="tarjeta p-5">';
      html += '<div class="flex justify-between items-center mb-3">';
      html += '<h3 class="font-bold">Categorías</h3>';
      html += '<button id="btnAgregarLimite" class="btn btn-primario btn-sm">Añadir</button>';
      html += '</div>';
      html += '<div id="listaCategoriasPresupuesto" class="space-y-3"></div>';
      html += '<div id="formLimite" class="hidden mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">';
      html += '<select id="selectCategoriaLimite" class="input-field mb-2"></select>';
      html += '<input type="number" id="inputLimiteValor" placeholder="Monto límite" class="input-field mb-2">';
      html += '<div class="flex gap-2"><button id="btnGuardarLimite" class="btn btn-primario flex-1">Guardar</button><button id="btnCancelarLimite" class="btn btn-outline flex-1">Cancelar</button></div>';
      html += '</div></div>';
      cont.innerHTML = html;

      setTimeout(function() {
        var canvas = document.getElementById('graficaPresupuestoMensual');
        if (canvas) {
          if (App.graficaPresupuestoMensualChart) App.graficaPresupuestoMensualChart.destroy();
          var ctx = canvas.getContext('2d');
          var p = Math.min(porcentaje, 100);
          App.graficaPresupuestoMensualChart = new Chart(ctx, {
            type: 'doughnut',
            data: { datasets: [{ data: [p, 100 - p], backgroundColor: [color, '#e5e7eb'], borderWidth: 0 }] },
            options: { responsive: true, cutout: '80%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
          });
        }
      }, 100);

      var listaEl = document.getElementById('listaCategoriasPresupuesto');
      var listaHtml = '';
      catsFiltradas.forEach(function(c) {
        var limite = limitesTipo[c.nombre] || 0;
        var real = transFiltradas.filter(function(t) { return t.categoria === c.nombre; }).reduce(function(s, t) { return s + t.monto; }, 0);
        var pCat = limite > 0 ? (real / limite) * 100 : 0;
        var colorBarra = pCat > 100 ? '#ef4444' : pCat > 80 ? '#f97316' : '#10b981';
        listaHtml += '<div class="presupuesto-cat-item">';
        listaHtml += '<div class="flex justify-between items-center mb-1"><span class="font-medium">' + c.emoji + ' ' + c.nombre + '</span><span class="text-xs texto-secundario">$' + App.formatearMonto(real) + ' / $' + App.formatearMonto(limite) + '</span></div>';
        listaHtml += '<div class="progress-bar"><div class="progress-fill" style="width:' + Math.min(pCat, 100) + '%; background-color:' + colorBarra + '; box-shadow:0 0 6px ' + colorBarra + ';"></div></div>';
        listaHtml += '<div class="flex justify-between items-center mt-1"><span class="text-xs texto-secundario">' + pCat.toFixed(0) + '% usado</span><div class="flex gap-2"><button class="btn-editar-limite text-xs" data-categoria="' + c.nombre + '" data-limite="' + limite + '">Editar</button><button class="btn-eliminar-limite text-xs text-red-500" data-categoria="' + c.nombre + '">Eliminar</button></div></div>';
        listaHtml += '</div>';
      });
      listaEl.innerHTML = listaHtml || '<p class="texto-secundario text-center">No hay categorías</p>';

      listaEl.querySelectorAll('.btn-editar-limite').forEach(function(btn) {
        btn.addEventListener('click', function() { mostrarFormularioLimite(tipo, this.dataset.categoria, parseFloat(this.dataset.limite)); });
      });
      listaEl.querySelectorAll('.btn-eliminar-limite').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (confirm('¿Eliminar el límite para ' + this.dataset.categoria + '?')) {
            App.eliminarLimiteCategoria(mes, tipo, this.dataset.categoria, function() { renderizarVistaPresupuesto(tipo); });
          }
        });
      });
      document.getElementById('btnAgregarLimite').addEventListener('click', function() { mostrarFormularioLimite(tipo); });

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
          App.guardarLimiteCategoria(mes, tipo, cat, val, function() { form.classList.add('hidden'); renderizarVistaPresupuesto(tipo); });
        };
        document.getElementById('btnCancelarLimite').onclick = function() { form.classList.add('hidden'); };
      }
    });
  }

  // ==================== METAS DE AHORRO ====================
  function renderizarMetas() {
    var cont = document.getElementById('presupuestoContenido');
    if (!cont) return;
    cont.innerHTML = '<p class="text-center texto-secundario">Cargando metas...</p>';

    App.obtenerMetas(function(metas) {
      var html = '';
      html += '<div class="mb-4"><button id="btnNuevaMeta" class="btn btn-primario w-full">+ Nueva meta de ahorro</button></div>';
      html += '<div id="formNuevaMeta" class="hidden tarjeta p-4 mb-4">';
      html += '<h3 class="font-bold mb-2">Nueva meta</h3>';
      html += '<input type="text" id="nombreMeta" placeholder="Nombre (ej: PC Gamer)" class="input-field mb-2">';
      html += '<input type="number" id="costoTotalMeta" placeholder="Costo total estimado" class="input-field mb-2">';
      html += '<input type="number" id="ahorroInicialMeta" placeholder="Ahorro inicial (opcional)" class="input-field mb-2">';
      html += '<input type="date" id="fechaLimiteMeta" class="input-field mb-2">';
      html += '<div class="flex gap-2"><button id="btnGuardarMeta" class="btn btn-primario flex-1">Guardar</button><button id="btnCancelarMeta" class="btn btn-outline flex-1">Cancelar</button></div>';
      html += '</div>';

      if (metas.length === 0) {
        html += '<p class="text-center texto-secundario py-4">No tienes metas de ahorro. ¡Crea la primera!</p>';
      } else {
        html += '<div class="metas-lista space-y-3">';
        metas.forEach(function(meta) {
          var porcentaje = meta.costoTotal > 0 ? (meta.ahorrado / meta.costoTotal) * 100 : 0;
          var color = porcentaje >= 100 ? '#10b981' : '#3b82f6';
          html += '<div class="meta-card" data-id="' + meta.id + '">';
          html += '<div class="flex justify-between items-center mb-1"><span class="font-bold">' + meta.nombre + '</span><span class="text-xs texto-secundario">' + (meta.fechaLimite ? new Date(meta.fechaLimite).toLocaleDateString() : 'Sin fecha') + '</span></div>';
          html += '<div class="progress-bar"><div class="progress-fill" style="width:' + Math.min(porcentaje, 100) + '%; background-color:' + color + ';"></div></div>';
          html += '<div class="flex justify-between text-sm mt-1"><span class="font-semibold">$' + App.formatearMonto(meta.ahorrado) + '</span><span class="texto-secundario">de $' + App.formatearMonto(meta.costoTotal) + '</span></div>';
          html += '<div class="flex gap-2 mt-2">';
          html += '<button class="btn-detalle-meta btn btn-outline-small flex-1" data-id="' + meta.id + '">Detalle</button>';
          html += '<button class="btn-editar-meta btn btn-outline-small" data-id="' + meta.id + '" data-nombre="' + meta.nombre + '" data-costo="' + meta.costoTotal + '" data-ahorrado="' + meta.ahorrado + '" data-fecha="' + (meta.fechaLimite || '') + '">Editar</button>';
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
        App.agregarMeta({ nombre: nombre, costoTotal: costoTotal, ahorrado: ahorroInicial, fechaLimite: fechaLimite || null }).then(function() { renderizarMetas(); });
      });

      document.querySelectorAll('.btn-eliminar-meta').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (confirm('¿Eliminar esta meta?')) App.eliminarMeta(this.dataset.id);
        });
      });
      document.querySelectorAll('.btn-detalle-meta').forEach(function(btn) {
        btn.addEventListener('click', function() { renderizarDetalleMeta(this.dataset.id); });
      });
      document.querySelectorAll('.btn-editar-meta').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = this.dataset.id;
          var nombreActual = this.dataset.nombre;
          var costoActual = parseFloat(this.dataset.costo);
          var ahorradoActual = parseFloat(this.dataset.ahorrado);
          var fechaActual = this.dataset.fecha || '';
          var formHtml = '<div class="tarjeta p-4 mb-4">';
          formHtml += '<h3 class="font-bold mb-2">Editar meta</h3>';
          formHtml += '<input type="text" id="editNombreMeta" value="' + nombreActual + '" class="input-field mb-2">';
          formHtml += '<input type="number" id="editCostoTotalMeta" value="' + costoActual + '" class="input-field mb-2">';
          formHtml += '<input type="number" id="editAhorradoMeta" value="' + ahorradoActual + '" class="input-field mb-2">';
          formHtml += '<input type="date" id="editFechaLimiteMeta" value="' + fechaActual + '" class="input-field mb-2">';
          formHtml += '<div class="flex gap-2"><button id="btnGuardarEdicionMeta" class="btn btn-primario flex-1">Guardar</button><button id="btnCancelarEdicionMeta" class="btn btn-outline flex-1">Cancelar</button></div>';
          formHtml += '</div>';
          cont.innerHTML = formHtml;
          document.getElementById('btnCancelarEdicionMeta').addEventListener('click', renderizarMetas);
          document.getElementById('btnGuardarEdicionMeta').addEventListener('click', function() {
            var nuevoNombre = document.getElementById('editNombreMeta').value.trim();
            var nuevoCosto = parseFloat(document.getElementById('editCostoTotalMeta').value);
            var nuevoAhorrado = parseFloat(document.getElementById('editAhorradoMeta').value);
            var nuevaFecha = document.getElementById('editFechaLimiteMeta').value;
            if (!nuevoNombre || isNaN(nuevoCosto) || isNaN(nuevoAhorrado)) return;
            App.actualizarMeta(id, { nombre: nuevoNombre, costoTotal: nuevoCosto, ahorrado: nuevoAhorrado, fechaLimite: nuevaFecha || null }).then(renderizarMetas);
          });
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
        html += '<p class="text-sm texto-secundario">Costo total: $' + App.formatearMonto(meta.costoTotal) + ' | Ahorrado: $' + App.formatearMonto(meta.ahorrado) + '</p>';
        html += '<div class="progress-bar mt-2"><div class="progress-fill" style="width:' + Math.min((meta.ahorrado / meta.costoTotal) * 100, 100) + '%; background-color:#3b82f6;"></div></div>';
        html += '</div>';
        html += '<div class="tarjeta p-4">';
        html += '<div class="flex justify-between items-center mb-3"><h4 class="font-bold">Desglose de artículos</h4><button id="btnNuevoItem" class="btn btn-primario btn-sm">+ Añadir</button></div>';
        html += '<div id="listaItemsMeta" class="space-y-2"></div>';
        html += '<div id="formNuevoItem" class="hidden mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">';
        html += '<input type="text" id="nombreItem" placeholder="Nombre del artículo" class="input-field mb-2">';
        html += '<input type="number" id="costoItem" placeholder="Costo" class="input-field mb-2">';
        html += '<label class="flex items-center gap-2"><input type="checkbox" id="compradoItem"> Comprado</label>';
        html += '<div class="flex gap-2 mt-2"><button id="btnGuardarItem" class="btn btn-primario flex-1">Guardar</button><button id="btnCancelarItem" class="btn btn-outline flex-1">Cancelar</button></div>';
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
            itemsHtml += '<div><span class="font-medium">' + item.nombre + '</span><span class="text-xs texto-secundario ml-2">$' + App.formatearMonto(item.costo) + '</span></div>';
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

        document.getElementById('btnNuevoItem').addEventListener('click', function() { document.getElementById('formNuevoItem').classList.remove('hidden'); });
        document.getElementById('btnCancelarItem').addEventListener('click', function() { document.getElementById('formNuevoItem').classList.add('hidden'); });
        document.getElementById('btnGuardarItem').addEventListener('click', function() {
          var nombre = document.getElementById('nombreItem').value.trim();
          var costo = parseFloat(document.getElementById('costoItem').value);
          var comprado = document.getElementById('compradoItem').checked;
          if (!nombre || isNaN(costo) || costo < 0) return;
          App.agregarItemMeta(metaId, { nombre: nombre, costo: costo, comprado: comprado }).then(function() { renderizarDetalleMeta(metaId); });
        });
        document.getElementById('btnVolverMetas').addEventListener('click', renderizarMetas);
      });
    });
  }

  // ==================== SUSCRIPCIONES ====================
  function renderizarSuscripciones() {
    var cont = document.getElementById('presupuestoContenido');
    if (!cont) return;
    cont.innerHTML = '<p class="text-center texto-secundario">Cargando suscripciones...</p>';

    App.obtenerSuscripciones(function(suscripciones) {
      var html = '';
      html += '<div class="mb-4"><button id="btnNuevaSuscripcion" class="btn btn-primario w-full">+ Nueva suscripción</button></div>';
      html += '<div id="formNuevaSuscripcion" class="hidden tarjeta p-4 mb-4">';
      html += '<h3 class="font-bold mb-2">Nueva suscripción</h3>';
      html += '<input type="text" id="nombreSuscripcion" placeholder="Nombre (ej: Netflix)" class="input-field mb-2">';
      html += '<input type="number" id="costoSuscripcion" placeholder="Costo" class="input-field mb-2">';
      html += '<select id="frecuenciaSuscripcion" class="input-field mb-2">';
      html += '<option value="mensual">Mensual</option>';
      html += '<option value="anual">Anual</option>';
      html += '<option value="semanal">Semanal</option>';
      html += '</select>';
      html += '<input type="date" id="proximoCobroSuscripcion" class="input-field mb-2">';
      html += '<input type="number" id="recordatorioSuscripcion" placeholder="Días de anticipación (opcional)" class="input-field mb-2">';
      html += '<div class="flex gap-2"><button id="btnGuardarSuscripcion" class="btn btn-primario flex-1">Guardar</button><button id="btnCancelarSuscripcion" class="btn btn-outline flex-1">Cancelar</button></div>';
      html += '</div>';

      if (suscripciones.length === 0) {
        html += '<p class="text-center texto-secundario py-4">No tienes suscripciones registradas.</p>';
      } else {
        var totalMensual = 0;
        suscripciones.forEach(function(s) {
          if (s.frecuencia === 'mensual') totalMensual += s.costo;
          else if (s.frecuencia === 'semanal') totalMensual += s.costo * 4.33;
          else if (s.frecuencia === 'anual') totalMensual += s.costo / 12;
        });

        html += '<div class="tarjeta p-4 mb-4 text-center">';
        html += '<p class="texto-secundario">Total mensual en suscripciones</p>';
        html += '<p class="text-2xl font-bold">$' + App.formatearMonto(totalMensual) + '</p>';
        html += '</div>';

        html += '<div class="suscripciones-lista space-y-3">';
        suscripciones.forEach(function(s) {
          var proximo = s.proximoCobro ? new Date(s.proximoCobro).toLocaleDateString() : 'Sin fecha';
          html += '<div class="suscripcion-card">';
          html += '<div class="flex justify-between items-center mb-1">';
          html += '<span class="font-bold">' + s.nombre + '</span>';
          html += '<span class="text-xs texto-secundario">' + s.frecuencia + '</span>';
          html += '</div>';
          html += '<div class="flex justify-between text-sm mb-2">';
          html += '<span class="font-semibold">$' + App.formatearMonto(s.costo) + '</span>';
          html += '<span class="texto-secundario">Próximo: ' + proximo + '</span>';
          html += '</div>';
          html += '<div class="flex gap-2">';
          html += '<button class="btn-editar-suscripcion btn btn-outline-small flex-1" data-id="' + s.id + '" data-nombre="' + s.nombre + '" data-costo="' + s.costo + '" data-frecuencia="' + s.frecuencia + '" data-proximo="' + (s.proximoCobro || '') + '" data-recordatorio="' + (s.recordatorio || 0) + '">Editar</button>';
          html += '<button class="btn-eliminar-suscripcion text-red-500 text-lg" data-id="' + s.id + '">✕</button>';
          html += '</div>';
          html += '</div>';
        });
        html += '</div>';
      }
      cont.innerHTML = html;

      document.getElementById('btnNuevaSuscripcion').addEventListener('click', function() {
        document.getElementById('formNuevaSuscripcion').classList.remove('hidden');
      });
      document.getElementById('btnCancelarSuscripcion').addEventListener('click', function() {
        document.getElementById('formNuevaSuscripcion').classList.add('hidden');
      });
      document.getElementById('btnGuardarSuscripcion').addEventListener('click', function() {
        var nombre = document.getElementById('nombreSuscripcion').value.trim();
        var costo = parseFloat(document.getElementById('costoSuscripcion').value);
        var frecuencia = document.getElementById('frecuenciaSuscripcion').value;
        var proximo = document.getElementById('proximoCobroSuscripcion').value;
        var recordatorio = parseInt(document.getElementById('recordatorioSuscripcion').value) || 0;
        if (!nombre || isNaN(costo) || costo <= 0) return;
        App.agregarSuscripcion({ nombre: nombre, costo: costo, frecuencia: frecuencia, proximoCobro: proximo || null, recordatorio: recordatorio }).then(function() { renderizarSuscripciones(); });
      });

      document.querySelectorAll('.btn-eliminar-suscripcion').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (confirm('¿Eliminar esta suscripción?')) App.eliminarSuscripcion(this.dataset.id);
        });
      });

      document.querySelectorAll('.btn-editar-suscripcion').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = this.dataset.id;
          var nombreActual = this.dataset.nombre;
          var costoActual = parseFloat(this.dataset.costo);
          var frecuenciaActual = this.dataset.frecuencia;
          var proximoActual = this.dataset.proximo;
          var recordatorioActual = parseInt(this.dataset.recordatorio) || 0;

          var formHtml = '<div class="tarjeta p-4 mb-4">';
          formHtml += '<h3 class="font-bold mb-2">Editar suscripción</h3>';
          formHtml += '<input type="text" id="editNombreSuscripcion" value="' + nombreActual + '" class="input-field mb-2">';
          formHtml += '<input type="number" id="editCostoSuscripcion" value="' + costoActual + '" class="input-field mb-2">';
          formHtml += '<select id="editFrecuenciaSuscripcion" class="input-field mb-2">';
          formHtml += '<option value="mensual"' + (frecuenciaActual === 'mensual' ? ' selected' : '') + '>Mensual</option>';
          formHtml += '<option value="anual"' + (frecuenciaActual === 'anual' ? ' selected' : '') + '>Anual</option>';
          formHtml += '<option value="semanal"' + (frecuenciaActual === 'semanal' ? ' selected' : '') + '>Semanal</option>';
          formHtml += '</select>';
          formHtml += '<input type="date" id="editProximoCobroSuscripcion" value="' + proximoActual + '" class="input-field mb-2">';
          formHtml += '<input type="number" id="editRecordatorioSuscripcion" value="' + recordatorioActual + '" placeholder="Días de anticipación" class="input-field mb-2">';
          formHtml += '<div class="flex gap-2"><button id="btnGuardarEdicionSuscripcion" class="btn btn-primario flex-1">Guardar</button><button id="btnCancelarEdicionSuscripcion" class="btn btn-outline flex-1">Cancelar</button></div>';
          formHtml += '</div>';
          cont.innerHTML = formHtml;

          document.getElementById('btnCancelarEdicionSuscripcion').addEventListener('click', renderizarSuscripciones);
          document.getElementById('btnGuardarEdicionSuscripcion').addEventListener('click', function() {
            var nuevoNombre = document.getElementById('editNombreSuscripcion').value.trim();
            var nuevoCosto = parseFloat(document.getElementById('editCostoSuscripcion').value);
            var nuevaFrecuencia = document.getElementById('editFrecuenciaSuscripcion').value;
            var nuevoProximo = document.getElementById('editProximoCobroSuscripcion').value;
            var nuevoRecordatorio = parseInt(document.getElementById('editRecordatorioSuscripcion').value) || 0;
            if (!nuevoNombre || isNaN(nuevoCosto) || nuevoCosto <= 0) return;
            App.actualizarSuscripcion(id, { nombre: nuevoNombre, costo: nuevoCosto, frecuencia: nuevaFrecuencia, proximoCobro: nuevoProximo || null, recordatorio: nuevoRecordatorio }).then(renderizarSuscripciones);
          });
        });
      });
    });
  }

  // ==================== PRÉSTAMOS ====================
  function renderizarPrestamos() {
    var cont = document.getElementById('presupuestoContenido');
    if (!cont) return;
    cont.innerHTML = '<p class="text-center texto-secundario">Cargando préstamos...</p>';

    App.obtenerPrestamos(function(prestamos) {
      var html = '';
      html += '<div class="mb-4"><button id="btnNuevoPrestamo" class="btn btn-primario w-full">+ Nuevo préstamo</button></div>';
      html += '<div id="formNuevoPrestamo" class="hidden tarjeta p-4 mb-4">';
      html += '<h3 class="font-bold mb-2">Nuevo préstamo</h3>';
      html += '<input type="text" id="nombrePrestamo" placeholder="Nombre (ej: Juan)" class="input-field mb-2">';
      html += '<input type="number" id="montoPrestamo" placeholder="Monto total" class="input-field mb-2">';
      html += '<select id="tipoPrestamo" class="input-field mb-2">';
      html += '<option value="prestado">Me deben</option>';
      html += '<option value="debo">Yo debo</option>';
      html += '</select>';
      html += '<input type="number" id="pagadoPrestamo" placeholder="Monto pagado (opcional)" class="input-field mb-2">';
      html += '<div class="flex gap-2"><button id="btnGuardarPrestamo" class="btn btn-primario flex-1">Guardar</button><button id="btnCancelarPrestamo" class="btn btn-outline flex-1">Cancelar</button></div>';
      html += '</div>';

      if (prestamos.length === 0) {
        html += '<p class="text-center texto-secundario py-4">No tienes préstamos registrados.</p>';
      } else {
        html += '<div class="prestamos-lista space-y-3">';
        prestamos.forEach(function(p) {
          var montoTotal = p.monto || 0;
          var montoPagado = p.pagado || 0;
          var porcentaje = montoTotal > 0 ? (montoPagado / montoTotal) * 100 : 0;
          var estado = p.tipo === 'prestado' ? 'Me deben' : 'Yo debo';
          html += '<div class="prestamo-card">';
          html += '<div class="prestamo-header">';
          html += '<span class="font-bold">' + p.nombre + ' <span class="text-xs texto-secundario">(' + estado + ')</span></span>';
          html += '<span class="prestamo-monto">$' + App.formatearMonto(montoTotal) + '</span>';
          html += '</div>';
          html += '<div class="progress-bar prestamo-progress"><div class="progress-fill" style="width:' + Math.min(porcentaje, 100) + '%; background-color:' + (porcentaje >= 100 ? '#10b981' : '#f59e0b') + ';"></div></div>';
          html += '<div class="flex justify-between text-sm mb-2">';
          html += '<span>Pagado: $' + App.formatearMonto(montoPagado) + '</span>';
          html += '<span>Pendiente: $' + App.formatearMonto(montoTotal - montoPagado) + '</span>';
          html += '</div>';
          html += '<div class="flex gap-2">';
          html += '<button class="btn-abonar-prestamo btn btn-outline-small flex-1" data-id="' + p.id + '" data-pagado="' + montoPagado + '">Abonar</button>';
          html += '<button class="btn-eliminar-prestamo text-red-500 text-lg" data-id="' + p.id + '">✕</button>';
          html += '</div>';
          html += '</div>';
        });
        html += '</div>';
      }
      cont.innerHTML = html;

      document.getElementById('btnNuevoPrestamo').addEventListener('click', function() {
        document.getElementById('formNuevoPrestamo').classList.remove('hidden');
      });
      document.getElementById('btnCancelarPrestamo').addEventListener('click', function() {
        document.getElementById('formNuevoPrestamo').classList.add('hidden');
      });
      document.getElementById('btnGuardarPrestamo').addEventListener('click', function() {
        var nombre = document.getElementById('nombrePrestamo').value.trim();
        var monto = parseFloat(document.getElementById('montoPrestamo').value);
        var tipo = document.getElementById('tipoPrestamo').value;
        var pagado = parseFloat(document.getElementById('pagadoPrestamo').value) || 0;
        if (!nombre || isNaN(monto) || monto <= 0) return;
        App.agregarPrestamo({ nombre: nombre, monto: monto, tipo: tipo, pagado: pagado }).then(function() { renderizarPrestamos(); });
      });

      document.querySelectorAll('.btn-eliminar-prestamo').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (confirm('¿Eliminar este préstamo?')) App.eliminarPrestamo(this.dataset.id);
        });
      });

      document.querySelectorAll('.btn-abonar-prestamo').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = this.dataset.id;
          var pagadoActual = parseFloat(this.dataset.pagado);
          var nuevoAbono = prompt('Ingrese el monto a abonar:', '0');
          if (nuevoAbono === null) return;
          var abono = parseFloat(nuevoAbono);
          if (isNaN(abono) || abono <= 0) return;
          App.actualizarPrestamo(id, { pagado: pagadoActual + abono }).then(function() { renderizarPrestamos(); });
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

      function setActiveTab(activeId) {
        ['tabPresupuestoMensual', 'tabMetasAhorro', 'tabSuscripciones', 'tabPrestamos'].forEach(function(id) {
          document.getElementById(id).classList.remove('active');
        });
        document.getElementById(activeId).classList.add('active');
      }

      document.getElementById('tabPresupuestoMensual').addEventListener('click', function() {
        setActiveTab('tabPresupuestoMensual');
        renderizarPresupuestoMensual();
      });
      document.getElementById('tabMetasAhorro').addEventListener('click', function() {
        setActiveTab('tabMetasAhorro');
        renderizarMetas();
      });
      document.getElementById('tabSuscripciones').addEventListener('click', function() {
        setActiveTab('tabSuscripciones');
        renderizarSuscripciones();
      });
      document.getElementById('tabPrestamos').addEventListener('click', function() {
        setActiveTab('tabPrestamos');
        renderizarPrestamos();
      });
    }
    // Mostrar presupuesto mensual por defecto
    renderizarPresupuestoMensual();
  };
})();
