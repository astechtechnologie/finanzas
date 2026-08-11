// Pantalla de presupuesto rediseñada con gestión de categorías de gasto
(function() {
  const App = window.App;

  function crearEstructuraPresupuesto() {
    return `
      <div class="presupuesto-header tarjeta p-5 space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="font-bold text-lg" id="tituloMesPresupuesto"></h2>
          <span class="text-sm texto-secundario" id="diasRestantes"></span>
        </div>
        <div class="flex justify-center">
          <canvas id="graficaPresupuesto" class="max-h-48"></canvas>
        </div>
        <div class="grid grid-cols-2 gap-3 text-center">
          <div><p class="text-xs texto-secundario">Gasto total</p><p id="gastoActualPresupuesto" class="text-xl font-bold text-red-500"></p></div>
          <div><p class="text-xs texto-secundario">Presupuesto total</p><p id="limitePresupuestoValor" class="text-xl font-bold"></p></div>
          <div><p class="text-xs texto-secundario">Promedio diario</p><p id="promedioDiario" class="text-lg font-semibold"></p></div>
          <div><p class="text-xs texto-secundario">Proyección</p><p id="proyeccionMensual" class="text-lg font-semibold"></p></div>
        </div>
      </div>
      <div class="tarjeta p-5 mt-5">
        <div class="flex justify-between items-center mb-4">
          <h2 class="font-bold text-lg">📊 Categorías de gasto</h2>
          <button id="btnAgregarCatPresupuesto" class="btn btn-primario btn-sm">+ Añadir</button>
        </div>
        <div id="listaPresupuestoCategorias" class="space-y-4"></div>
        <!-- Formulario oculto para añadir categoría -->
        <div id="formNuevaCatPresupuesto" class="hidden mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <input type="text" id="nombreNuevaCatPresupuesto" placeholder="Nombre de la categoría" class="w-full p-2 mb-2 rounded-xl bg-white dark:bg-gray-700">
          <input type="number" id="limiteNuevaCatPresupuesto" placeholder="Límite" class="w-full p-2 mb-2 rounded-xl bg-white dark:bg-gray-700">
          <div class="flex gap-2">
            <button id="btnGuardarNuevaCatPresupuesto" class="btn btn-primario flex-1">Guardar</button>
            <button id="btnCancelarNuevaCatPresupuesto" class="btn btn-outline flex-1">Cancelar</button>
          </div>
        </div>
      </div>
      <div class="tarjeta p-5 mt-5">
        <h2 class="font-bold text-lg mb-3">📋 Historial reciente</h2>
        <div id="historialPresupuesto" class="space-y-2 text-sm"></div>
      </div>
    `;
  }

  function cargarDatosPresupuesto(mes) {
    var partes = mes.split('-');
    var nombreMes = new Date(partes[0], partes[1] - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    document.getElementById('tituloMesPresupuesto').textContent = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

    var ahora = new Date();
    var finMes = new Date(partes[0], partes[1], 0).getDate();
    var diaActual = (ahora.getFullYear() == partes[0] && (ahora.getMonth() + 1) == partes[1]) ? ahora.getDate() : 0;
    var diasRest = Math.max(0, finMes - diaActual);
    document.getElementById('diasRestantes').textContent = diasRest + ' días restantes';

    Promise.all([
      new Promise(resolve => App.obtenerTransacciones(resolve)),
      new Promise(resolve => App.obtenerCategorias(resolve)),
      new Promise(resolve => App.obtenerLimitesCategorias(mes, resolve)),
      new Promise(resolve => App.obtenerHistorialPresupuestos(resolve))
    ]).then(([transacciones, categorias, limites, historial]) => {
      const gastosMes = transacciones.filter(t => t.tipo === 'gasto' && t.fecha && t.fecha.startsWith(mes));
      const totalGastado = gastosMes.reduce((sum, t) => sum + t.monto, 0);

      const gastosPorCategoria = {};
      gastosMes.forEach(t => {
        if (!gastosPorCategoria[t.categoria]) gastosPorCategoria[t.categoria] = 0;
        gastosPorCategoria[t.categoria] += t.monto;
      });

      // Solo categorías de tipo 'gasto'
      const categoriasGasto = categorias.filter(c => c.tipo === 'gasto');

      const totalPresupuestado = Object.values(limites).reduce((sum, val) => sum + val, 0);

      document.getElementById('gastoActualPresupuesto').textContent = '$' + totalGastado.toFixed(2);
      document.getElementById('limitePresupuestoValor').textContent = '$' + totalPresupuestado.toFixed(2);

      var diasTranscurridos = diaActual > 0 ? diaActual : finMes;
      var promedio = diasTranscurridos > 0 ? totalGastado / diasTranscurridos : 0;
      document.getElementById('promedioDiario').textContent = '$' + promedio.toFixed(2);
      var proyeccion = promedio * finMes;
      var proyeccionEl = document.getElementById('proyeccionMensual');
      proyeccionEl.textContent = '$' + proyeccion.toFixed(2);
      proyeccionEl.className = 'text-lg font-semibold ' + (totalPresupuestado > 0 && proyeccion > totalPresupuestado ? 'text-red-500' : 'text-emerald-500');

      var porcentajeTotal = totalPresupuestado > 0 ? (totalGastado / totalPresupuestado) * 100 : 0;
      App.dibujarGraficaPresupuesto(porcentajeTotal);

      var contenedor = document.getElementById('listaPresupuestoCategorias');
      var html = '';
      categoriasGasto.forEach(c => {
        var limiteCat = limites[c.nombre] || 0;
        var gastoCat = gastosPorCategoria[c.nombre] || 0;
        var porcentajeCat = limiteCat > 0 ? (gastoCat / limiteCat) * 100 : 0;
        var colorBarra = porcentajeCat >= 100 ? '#ef4444' : porcentajeCat >= 80 ? '#f97316' : '#10b981';
        html += '<div class="presupuesto-cat-card">' +
          '<div class="flex items-center justify-between mb-2">' +
            '<span class="font-medium">' + c.emoji + ' ' + c.nombre + '</span>' +
            '<span class="text-xs texto-secundario">' + porcentajeCat.toFixed(0) + '% usado</span>' +
          '</div>' +
          '<div class="progress-bar mb-2"><div class="progress-fill" style="width:' + Math.min(porcentajeCat, 100) + '%; background-color:' + colorBarra + '; box-shadow:0 0 8px ' + colorBarra + ';"></div></div>' +
          '<div class="flex justify-between items-center text-sm">' +
            '<span class="font-bold">$' + gastoCat.toFixed(2) + ' <span class="texto-secundario text-xs">/ $' + limiteCat.toFixed(2) + '</span></span>' +
            '<div class="flex gap-2">' +
              '<button class="btn-editar-limite text-xs" data-categoria="' + c.nombre + '" data-limite="' + limiteCat + '">Editar</button>' +
              '<button class="btn-eliminar-cat text-xs text-red-500" data-categoria="' + c.nombre + '">Eliminar</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      });
      contenedor.innerHTML = html || '<p class="texto-secundario text-center">No hay categorías de gasto</p>';

      // Eventos para editar límite y eliminar categoría
      document.querySelectorAll('.btn-editar-limite').forEach(btn => {
        btn.addEventListener('click', function() {
          var categoria = this.dataset.categoria;
          var nuevoLimite = prompt('Nuevo límite para ' + categoria, this.dataset.limite);
          if (nuevoLimite !== null && !isNaN(parseFloat(nuevoLimite)) && parseFloat(nuevoLimite) >= 0) {
            App.guardarLimiteCategoria(mes, categoria, parseFloat(nuevoLimite), () => App.cargarPantallaPresupuesto());
          }
        });
      });

      document.querySelectorAll('.btn-eliminar-cat').forEach(btn => {
        btn.addEventListener('click', function() {
          if (confirm('¿Eliminar la categoría ' + this.dataset.categoria + '? Esta acción no borra las transacciones existentes.')) {
            // Eliminar el límite del presupuesto actual (no la categoría en sí)
            App.guardarLimiteCategoria(mes, this.dataset.categoria, 0, () => App.cargarPantallaPresupuesto());
          }
        });
      });

      // Historial (sin cambios)
      var contenedorHistorial = document.getElementById('historialPresupuesto');
      var htmlHistorial = '';
      historial.forEach(item => {
        var gastosMesHist = transacciones.filter(t => t.tipo === 'gasto' && t.fecha && t.fecha.startsWith(item.mes))
                                .reduce((sum, t) => sum + t.monto, 0);
        var cumplio = item.limiteTotal > 0 ? gastosMesHist <= item.limiteTotal : true;
        var color = cumplio ? 'text-emerald-500' : 'text-red-500';
        var nombreMesHist = new Date(item.mes.split('-')[0], item.mes.split('-')[1] - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        htmlHistorial += '<div class="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">' +
          '<span class="font-medium">' + nombreMesHist + '</span>' +
          '<div class="text-right">' +
            '<span class="font-bold ' + color + '">$' + gastosMesHist.toFixed(2) + '</span>' +
            '<span class="text-xs texto-secundario ml-2"> / $' + (item.limiteTotal || 0).toFixed(2) + '</span>' +
          '</div>' +
          '</div>';
      });
      contenedorHistorial.innerHTML = htmlHistorial || '<p class="texto-secundario text-center">Sin datos</p>';
    });
  }

  App.cargarPantallaPresupuesto = function() {
    var contenedor = document.getElementById('contenidoPresupuesto');
    if (!contenedor) return;
    if (!document.getElementById('tituloMesPresupuesto')) {
      contenedor.innerHTML = crearEstructuraPresupuesto();
      // Eventos para añadir categoría
      document.getElementById('btnAgregarCatPresupuesto').addEventListener('click', () => {
        document.getElementById('formNuevaCatPresupuesto').classList.remove('hidden');
      });
      document.getElementById('btnCancelarNuevaCatPresupuesto').addEventListener('click', () => {
        document.getElementById('formNuevaCatPresupuesto').classList.add('hidden');
      });
      document.getElementById('btnGuardarNuevaCatPresupuesto').addEventListener('click', () => {
        var nombre = document.getElementById('nombreNuevaCatPresupuesto').value.trim();
        var limite = parseFloat(document.getElementById('limiteNuevaCatPresupuesto').value);
        if (!nombre || isNaN(limite) || limite < 0) {
          alert('Datos inválidos');
          return;
        }
        // Agregar categoría de gasto y luego establecer límite
        App.agregarCategoria(nombre, '📌', '#10b981', 'gasto').then(() => {
          App.guardarLimiteCategoria(getMes(), nombre, limite, () => {
            document.getElementById('formNuevaCatPresupuesto').classList.add('hidden');
            App.cargarPantallaPresupuesto();
          });
        }).catch(() => {
          // Si la categoría ya existe, solo actualizamos límite
          App.guardarLimiteCategoria(getMes(), nombre, limite, () => {
            document.getElementById('formNuevaCatPresupuesto').classList.add('hidden');
            App.cargarPantallaPresupuesto();
          });
        });
      });
    }
    var mes = (typeof App.obtenerMesActual === 'function') ? App.obtenerMesActual() : new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
    cargarDatosPresupuesto(mes);
  };

  function getMes() {
    return (typeof App.obtenerMesActual === 'function') ? App.obtenerMesActual() : new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
  }
})();
