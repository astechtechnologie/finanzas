// Pantalla de presupuesto – pestañas Gastos e Ingresos, visual profesional
(function() {
  const App = window.App;

  function crearEstructura() {
    return `
      <div class="presupuesto-tabs">
        <button id="tabPresupuestoGastos" class="presupuesto-tab active">Gastos</button>
        <button id="tabPresupuestoIngresos" class="presupuesto-tab">Ingresos</button>
      </div>
      <div id="presupuestoContenido" class="mt-4"></div>
    `;
  }

  function renderizarVista(tipo) {
    const cont = document.getElementById('presupuestoContenido');
    if (!cont) return;
    const mes = App.obtenerMesActual ? App.obtenerMesActual() : new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0');

    Promise.all([
      new Promise(res => App.obtenerTransacciones(res)),
      new Promise(res => App.obtenerCategorias(res)),
      new Promise(res => App.obtenerLimitesCategorias(mes, res)),
      new Promise(res => App.obtenerHistorialPresupuestos(res))
    ]).then(([transacciones, categorias, limites, historial]) => {
      const catsFiltradas = categorias.filter(c => c.tipo === tipo);
      const limitesTipo = limites[tipo === 'ingreso' ? 'ingresos' : 'gastos'] || {};
      const transFiltradas = transacciones.filter(t => t.tipo === tipo && t.fecha && t.fecha.startsWith(mes));

      const totalReal = transFiltradas.reduce((s, t) => s + t.monto, 0);
      const totalPresupuestado = Object.values(limitesTipo).reduce((s, v) => s + v, 0);

      const porcentaje = totalPresupuestado > 0 ? (totalReal / totalPresupuestado) * 100 : 0;
      const color = tipo === 'gasto'
        ? (porcentaje > 100 ? '#ef4444' : porcentaje > 80 ? '#f97316' : '#10b981')
        : (porcentaje < 100 ? '#ef4444' : '#10b981');

      let html = `
        <div class="presupuesto-resumen tarjeta p-5 mb-4">
          <div class="flex justify-between items-center mb-3">
            <h3 class="font-bold text-lg">${tipo === 'gasto' ? 'Presupuesto de gastos' : 'Meta de ingresos'}</h3>
            <span class="text-sm texto-secundario">${mes}</span>
          </div>
          <div class="flex justify-center mb-4">
            <canvas id="graficaPresupuesto" class="max-h-40"></canvas>
          </div>
          <div class="grid grid-cols-2 gap-2 text-center">
            <div><p class="text-xs texto-secundario">${tipo === 'gasto' ? 'Gastado' : 'Ingresado'}</p><p class="text-xl font-bold">$${totalReal.toFixed(2)}</p></div>
            <div><p class="text-xs texto-secundario">Presupuesto</p><p class="text-xl font-bold">$${totalPresupuestado.toFixed(2)}</p></div>
          </div>
          <div class="mt-2 text-center">
            <span class="text-sm font-semibold ${tipo === 'gasto' ? (totalReal > totalPresupuestado ? 'text-red-500' : 'text-emerald-500') : (totalReal >= totalPresupuestado ? 'text-emerald-500' : 'text-red-500')}">
              ${tipo === 'gasto' ? (totalReal > totalPresupuestado ? 'Excedido por $' + (totalReal - totalPresupuestado).toFixed(2) : 'Restan $' + (totalPresupuestado - totalReal).toFixed(2)) : (totalReal >= totalPresupuestado ? 'Meta cumplida' : 'Faltan $' + (totalPresupuestado - totalReal).toFixed(2))}
            </span>
          </div>
        </div>
        <div class="tarjeta p-5 mb-4">
          <div class="flex justify-between items-center mb-3">
            <h3 class="font-bold">Categorías</h3>
            <button id="btnAgregarLimite" class="btn btn-primario btn-sm">Añadir</button>
          </div>
          <div id="listaCategoriasPresupuesto" class="space-y-3"></div>
          <!-- Formulario oculto para añadir/editar -->
          <div id="formLimite" class="hidden mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <select id="selectCategoriaLimite" class="input-field mb-2"></select>
            <input type="number" id="inputLimiteValor" placeholder="Monto límite" class="input-field mb-2">
            <div class="flex gap-2">
              <button id="btnGuardarLimite" class="btn btn-primario flex-1">Guardar</button>
              <button id="btnCancelarLimite" class="btn btn-outline flex-1">Cancelar</button>
            </div>
          </div>
        </div>
      `;

      cont.innerHTML = html;

      // Gráfico de anillo
      setTimeout(() => {
        if (App.graficaPresupuestoChart) App.graficaPresupuestoChart.destroy();
        const ctx = document.getElementById('graficaPresupuesto')?.getContext('2d');
        if (ctx) {
          const p = Math.min(porcentaje, 100);
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
      const listaEl = document.getElementById('listaCategoriasPresupuesto');
      let listaHtml = '';
      catsFiltradas.forEach(c => {
        const limite = limitesTipo[c.nombre] || 0;
        const real = transFiltradas.filter(t => t.categoria === c.nombre).reduce((s, t) => s + t.monto, 0);
        const pCat = limite > 0 ? (real / limite) * 100 : 0;
        const colorBarra = pCat > 100 ? '#ef4444' : pCat > 80 ? '#f97316' : '#10b981';
        listaHtml += `
          <div class="presupuesto-cat-item">
            <div class="flex justify-between items-center mb-1">
              <span class="font-medium">${c.emoji} ${c.nombre}</span>
              <span class="text-xs texto-secundario">$${real.toFixed(2)} / $${limite.toFixed(2)}</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(pCat, 100)}%; background-color:${colorBarra}; box-shadow:0 0 6px ${colorBarra};"></div></div>
            <div class="flex justify-between items-center mt-1">
              <span class="text-xs texto-secundario">${pCat.toFixed(0)}% usado</span>
              <div class="flex gap-2">
                <button class="btn-editar-limite text-xs" data-categoria="${c.nombre}" data-limite="${limite}">Editar</button>
                <button class="btn-eliminar-limite text-xs text-red-500" data-categoria="${c.nombre}">Eliminar</button>
              </div>
            </div>
          </div>
        `;
      });
      listaEl.innerHTML = listaHtml || '<p class="texto-secundario text-center">No hay categorías</p>';

      // Eventos editar/eliminar
      listaEl.querySelectorAll('.btn-editar-limite').forEach(btn => {
        btn.addEventListener('click', function() {
          mostrarFormularioLimite(tipo, this.dataset.categoria, parseFloat(this.dataset.limite));
        });
      });
      listaEl.querySelectorAll('.btn-eliminar-limite').forEach(btn => {
        btn.addEventListener('click', function() {
          if (confirm('¿Eliminar el límite para ' + this.dataset.categoria + '?')) {
            App.eliminarLimiteCategoria(mes, tipo, this.dataset.categoria, () => {
              App.cargarPantallaPresupuesto();
            });
          }
        });
      });

      // Botón añadir
      document.getElementById('btnAgregarLimite').addEventListener('click', () => {
        mostrarFormularioLimite(tipo);
      });

      // Configurar formulario
      function mostrarFormularioLimite(tipo, categoria = '', limite = 0) {
        const form = document.getElementById('formLimite');
        form.classList.remove('hidden');
        const select = document.getElementById('selectCategoriaLimite');
        select.innerHTML = catsFiltradas.map(c => <option value="${c.nombre}" ${c.nombre === categoria ? 'selected' : ''}>${c.emoji} ${c.nombre}</option>).join('');
        document.getElementById('inputLimiteValor').value = limite || '';
        document.getElementById('btnGuardarLimite').onclick = () => {
          const cat = select.value;
          const val = parseFloat(document.getElementById('inputLimiteValor').value);
          if (!cat || isNaN(val) || val < 0) return;
          App.guardarLimiteCategoria(mes, tipo, cat, val, () => {
            form.classList.add('hidden');
            App.cargarPantallaPresupuesto();
          });
        };
        document.getElementById('btnCancelarLimite').onclick = () => form.classList.add('hidden');
      }
    });
  }

  App.cargarPantallaPresupuesto = function() {
    const contenedor = document.getElementById('contenidoPresupuesto');
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
    // Por defecto mostrar gastos
    if (document.getElementById('tabPresupuestoGastos').classList.contains('active')) {
      renderizarVista('gasto');
    } else {
      renderizarVista('ingreso');
    }
  };
})();
