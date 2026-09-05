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
        ? (porcentaje > 100 ? '#ff4444' : porcentaje > 80 ? '#f97316' : '#e8c84c')
        : (porcentaje < 100 ? '#ff4444' : '#e8c84c');

      var html = '';

      html += '<div class="presupuesto-resumen">';
      html += '<div class="presupuesto-resumen-header">';
      html += '<span class="texto-secundario">' + (tipo === 'gasto' ? 'Total gastado' : 'Total ingresado') + '</span>';
      html += '<span class="texto-secundario">' + mes + '</span>';
      html += '</div>';
      html += '<div class="presupuesto-montos">';
      html += '<span class="presupuesto-gasto">$' + App.formatearMonto(totalReal) + '</span>';
      html += '<span class="texto-secundario">de $' + App.formatearMonto(totalPresupuestado) + '</span>';
      html += '</div>';
      html += '<div class="progress-bar presupuesto-progress"><div class="progress-fill" style="width:' + Math.min(porcentaje, 100) + '%; background-color:' + color + ';"></div></div>';
      html += '<p class="presupuesto-detalle">';
      if (tipo === 'gasto') {
        if (totalReal > totalPresupuestado) html += 'Has excedido tu presupuesto por $' + App.formatearMonto(totalReal - totalPresupuestado);
        else html += 'Te quedan $' + App.formatearMonto(totalPresupuestado - totalReal) + ' disponibles';
      } else {
        if (totalReal >= totalPresupuestado) html += 'Has alcanzado tu meta de ingresos';
        else html += 'Te faltan $' + App.formatearMonto(totalPresupuestado - totalReal) + ' para tu meta';
      }
      html += '</p>';
      html += '</div>';

      html += '<button id="btnAgregarLimite" class="btn btn-primario btn-agregar-categoria"><i class="ph ph-plus"></i> Añadir categoría</button>';

      html += '<div class="categorias-presupuesto">';
      catsFiltradas.forEach(function(c) {
        var limiteCat = (limitesTipo[c.nombre] && limitesTipo[c.nombre].limite) || 0;
        var subcats = (limitesTipo[c.nombre] && limitesTipo[c.nombre].subcategorias) || {};
        var realCat = transFiltradas.filter(function(t) { return t.categoria === c.nombre; }).reduce(function(s, t) { return s + t.monto; }, 0);
        var pCat = limiteCat > 0 ? (realCat / limiteCat) * 100 : 0;
        var colorBarra = pCat > 100 ? '#ff4444' : pCat > 80 ? '#f97316' : '#e8c84c';

        html += '<div class="categoria-presupuesto">';
        html += '<div class="categoria-header" data-cat="' + c.nombre + '">';
        html += '<div class="categoria-info">';
        html += '<span class="categoria-emoji">' + c.emoji + '</span>';
        html += '<span class="categoria-nombre">' + c.nombre + '</span>';
        html += '<span class="categoria-porcentaje">' + pCat.toFixed(0) + '%</span>';
        html += '</div>';
        html += '<button class="btn-expandir" data-cat="' + c.nombre + '"><i class="ph ph-caret-down"></i></button>';
        html += '</div>';
        html += '<div class="categoria-progress"><div class="progress-bar"><div class="progress-fill" style="width:' + Math.min(pCat, 100) + '%; background-color:' + colorBarra + ';"></div></div></div>';
        html += '<div class="categoria-detalles">';
        html += '<span class="texto-secundario">$' + App.formatearMonto(realCat) + ' de $' + App.formatearMonto(limiteCat) + '</span>';
        html += '<div class="categoria-acciones">';
        html += '<button class="btn-editar-limite" data-categoria="' + c.nombre + '" data-limite="' + limiteCat + '"><i class="ph ph-pencil-simple"></i></button>';
        html += '<button class="btn-eliminar-limite" data-categoria="' + c.nombre + '"><i class="ph ph-trash"></i></button>';
        html += '</div>';
        html += '</div>';

        html += '<div class="subcategorias-lista hidden" data-subcategorias="' + c.nombre + '">';
        if (Object.keys(subcats).length > 0) {
          Object.keys(subcats).forEach(function(sub) {
            var limiteSub = subcats[sub].limite || 0;
            var realSub = transFiltradas.filter(function(t) { return t.categoria === c.nombre && t.subcategoria === sub; }).reduce(function(s, t) { return s + t.monto; }, 0);
            var pSub = limiteSub > 0 ? (realSub / limiteSub) * 100 : 0;
            html += '<div class="subcategoria-item">';
            html += '<div class="subcategoria-header">';
            html += '<span class="subcategoria-nombre">' + sub + '</span>';
            html += '<span class="texto-secundario">$' + App.formatearMonto(realSub) + ' / $' + App.formatearMonto(limiteSub) + '</span>';
            html += '</div>';
            html += '<div class="progress-bar subcategoria-progress"><div class="progress-fill" style="width:' + Math.min(pSub, 100) + '%; background-color:' + (pSub > 100 ? '#ff4444' : '#e8c84c') + ';"></div></div>';
            html += '</div>';
          });
        } else {
          html += '<p class="texto-secundario text-sm">Sin subcategorías</p>';
        }
        html += '<button class="btn-agregar-subcat" data-categoria="' + c.nombre + '"><i class="ph ph-plus"></i> Añadir subcategoría</button>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';

      html += '<div id="formLimite" class="hidden form-limite">';
      html += '<h3 class="form-titulo">Añadir límite</h3>';
      html += '<select id="selectCategoriaLimite" class="input-field mb-2"></select>';
      html += '<input type="number" id="inputLimiteValor" placeholder="Monto límite" class="input-field mb-2">';
      html += '<div class="flex gap-2">';
      html += '<button id="btnGuardarLimite" class="btn btn-primario flex-1">Guardar</button>';
      html += '<button id="btnCancelarLimite" class="btn btn-outline flex-1">Cancelar</button>';
      html += '</div>';
      html += '</div>';

      cont.innerHTML = html;

      cont.querySelectorAll('.categoria-header, .btn-expandir').forEach(function(el) {
        el.addEventListener('click', function() {
          var cat = this.dataset.cat || this.parentElement.dataset.cat;
          var sublist = cont.querySelector('[data-subcategorias="' + cat + '"]');
          if (sublist) sublist.classList.toggle('hidden');
        });
      });

      document.getElementById('btnAgregarLimite').addEventListener('click', function() {
        mostrarFormularioLimite(tipo);
      });

      cont.querySelectorAll('.btn-editar-limite').forEach(function(btn) {
        btn.addEventListener('click', function() {
          mostrarFormularioLimite(tipo, this.dataset.categoria, parseFloat(this.dataset.limite));
        });
      });

      cont.querySelectorAll('.btn-eliminar-limite').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (confirm('¿Eliminar el límite para ' + this.dataset.categoria + '?')) {
            App.eliminarLimiteCategoria(mes, tipo, this.dataset.categoria, function() {
              renderizarVistaPresupuesto(tipo);
            });
          }
        });
      });

      cont.querySelectorAll('.btn-agregar-subcat').forEach(function(btn) {
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

  // Metas, Suscripciones y Préstamos ya definidos en el archivo anterior; se omiten aquí por brevedad.
  // Se deben incluir exactamente igual que en la versión completa proporcionada antes.

})();
