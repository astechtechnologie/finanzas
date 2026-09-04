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
      var totalPresupuestado = 0;
      Object.keys(limitesTipo).forEach(function(cat) {
        totalPresupuestado += limitesTipo[cat].limite || 0;
      });

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
        var limiteCat = (limitesTipo[c.nombre] && limitesTipo[c.nombre].limite) || 0;
        var subcats = (limitesTipo[c.nombre] && limitesTipo[c.nombre].subcategorias) || {};
        var realCat = transFiltradas.filter(function(t) { return t.categoria === c.nombre; }).reduce(function(s, t) { return s + t.monto; }, 0);
        var pCat = limiteCat > 0 ? (realCat / limiteCat) * 100 : 0;
        var colorBarra = pCat > 100 ? '#ef4444' : pCat > 80 ? '#f97316' : '#10b981';

        listaHtml += '<div class="presupuesto-cat-item">';
        listaHtml += '<div class="flex justify-between items-center mb-1"><span class="font-medium">' + c.emoji + ' ' + c.nombre + '</span><span class="text-xs texto-secundario">$' + App.formatearMonto(realCat) + ' / $' + App.formatearMonto(limiteCat) + '</span></div>';
        listaHtml += '<div class="progress-bar"><div class="progress-fill" style="width:' + Math.min(pCat, 100) + '%; background-color:' + colorBarra + '; box-shadow:0 0 6px ' + colorBarra + ';"></div></div>';
        listaHtml += '<div class="flex justify-between items-center mt-1"><span class="text-xs texto-secundario">' + pCat.toFixed(0) + '% usado</span><div class="flex gap-2"><button class="btn-editar-limite text-xs" data-categoria="' + c.nombre + '" data-limite="' + limiteCat + '">Editar</button><button class="btn-eliminar-limite text-xs text-red-500" data-categoria="' + c.nombre + '">Eliminar</button></div></div>';

        // Subcategorías
        if (Object.keys(subcats).length > 0) {
          listaHtml += '<div class="ml-4 mt-2">';
          Object.keys(subcats).forEach(function(sub) {
            var limiteSub = subcats[sub].limite || 0;
            var realSub = transFiltradas.filter(function(t) { return t.categoria === c.nombre && t.subcategoria === sub; }).reduce(function(s, t) { return s + t.monto; }, 0);
            var pSub = limiteSub > 0 ? (realSub / limiteSub) * 100 : 0;
            listaHtml += '<div class="subcat-item">';
            listaHtml += '<div class="flex justify-between text-sm">';
            listaHtml += '<span>' + sub + '</span>';
            listaHtml += '<span>$' + App.formatearMonto(realSub) + ' / $' + App.formatearMonto(limiteSub) + '</span>';
            listaHtml += '</div>';
            listaHtml += '<div class="progress-bar"><div class="progress-fill" style="width:' + Math.min(pSub, 100) + '%; background-color:' + (pSub > 100 ? '#ef4444' : '#10b981') + ';"></div></div>';
            listaHtml += '</div>';
          });
          listaHtml += '</div>';
        }

        listaHtml += '<button class="btn-agregar-subcat text-xs text-blue-500" data-categoria="' + c.nombre + '">+ Añadir subcategoría</button>';
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
      listaEl.querySelectorAll('.btn-agregar-subcat').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var categoria = this.dataset.categoria;
          var nombre = prompt('Nombre de la subcategoría:');
          if (nombre) {
            var limite = parseFloat(prompt('Límite para ' + nombre + ':'));
            if (!isNaN(limite) && limite >= 0) {
              App.guardarLimiteSubcategoria(mes, tipo, categoria, nombre, limite, function() {
                renderizarVistaPresupuesto(tipo);
              });
            }
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

      document.getElementById('btnNuevaMeta').addEventListener('click', function() { document.getElementById('formNuevaMeta').classList.remove('hidden'); });
      document.getElementById('btnCancelarMeta').addEventListener('click', function() { document.getElementById('formNuevaMeta').classList.add('hidden'); });
      document.getElementById('btnGuardarMeta').addEventListener('click', function() {
        var nombre = document.getElementById('nombreMeta').value.trim();
        var costoTotal = parseFloat(document.getElementById('costoTotalMeta').value);
        var ahorroInicial = parseFloat(document.getElementById('ahorroInicialMeta').value) || 0;
        var fechaLimite = document.getElementById('fechaLimiteMeta').value;
        if (!nombre || isNaN(costoTotal) || costoTotal <= 0) return;
        App.agregarMeta({ nombre: nombre, costoTotal: costoTotal, ahorrado: ahorroInicial, fechaLimite: fechaLimite || null }).then(function() { renderizarMetas(); });
      });

      document.querySelectorAll('.btn-eliminar-meta').forEach(function(btn) {
        btn.addEventListener('click', function() { if (confirm('¿Eliminar esta meta?')) App.eliminarMeta(this.dataset.id); });
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
    // ... (mantener igual que antes, no es relevante para presupuesto con subcategorías)
  }

  // ==================== SUSCRIPCIONES ====================
  function renderizarSuscripciones() {
    // ... (mantener igual)
  }

  // ==================== PRÉSTAMOS ====================
  function renderizarPrestamos() {
    // ... (mantener igual)
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
    renderizarPresupuestoMensual();
  };
})();
