// Pantalla de presupuesto (por categorías) – genera el HTML dinámicamente
(function() {
  const App = window.App;

  // Plantilla HTML de la vista presupuesto
  function crearEstructuraPresupuesto() {
    return `
      <div id="presupuestoMesInfo" class="tarjeta p-5 space-y-4">
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
        <h2 class="font-bold text-lg mb-4">📊 Presupuesto por categoría</h2>
        <div id="listaPresupuestoCategorias" class="space-y-4"></div>
      </div>
      <div class="tarjeta p-5 mt-5">
        <h2 class="font-bold text-lg mb-3">📋 Historial reciente</h2>
        <div id="historialPresupuesto" class="space-y-2 text-sm"></div>
      </div>
    `;
  }

  // Cargar datos reales en la estructura
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
      new Promise(function(resolve) { App.obtenerTransacciones(resolve); }),
      new Promise(function(resolve) { App.obtenerCategorias(resolve); }),
      new Promise(function(resolve) { App.obtenerLimitesCategorias(mes, resolve); }),
      new Promise(function(resolve) { App.obtenerHistorialPresupuestos(resolve); })
    ]).then(function(results) {
      var transacciones = results[0];
      var categorias = results[1];
      var limites = results[2];
      var historial = results[3];

      var gastosMes = transacciones.filter(function(t) { return t.tipo === 'gasto' && t.fecha && t.fecha.startsWith(mes); });
      var totalGastado = gastosMes.reduce(function(sum, t) { return sum + t.monto; }, 0);

      var gastosPorCategoria = {};
      gastosMes.forEach(function(t) {
        if (!gastosPorCategoria[t.categoria]) gastosPorCategoria[t.categoria] = 0;
        gastosPorCategoria[t.categoria] += t.monto;
      });

      var totalPresupuestado = Object.values(limites).reduce(function(sum, val) { return sum + val; }, 0);

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

      // Lista de categorías con barras
      var contenedor = document.getElementById('listaPresupuestoCategorias');
      var html = '';
      categorias.forEach(function(c) {
        var limiteCat = limites[c.nombre] || 0;
        var gastoCat = gastosPorCategoria[c.nombre] || 0;
        var porcentajeCat = limiteCat > 0 ? (gastoCat / limiteCat) * 100 : 0;
        var colorBarra = porcentajeCat >= 100 ? '#ef4444' : porcentajeCat >= 80 ? '#f97316' : '#10b981';
        html += '<div>' +
          '<div class="flex items-center justify-between mb-1">' +
            '<span class="font-medium text-sm">' + c.emoji + ' ' + c.nombre + '</span>' +
            '<span class="text-xs texto-secundario">$' + gastoCat.toFixed(2) + ' / $' + limiteCat.toFixed(2) + '</span>' +
          '</div>' +
          '<div class="progress-bar"><div class="progress-fill" style="width:' + Math.min(porcentajeCat, 100) + '%; background-color:' + colorBarra + '; box-shadow:0 0 8px ' + colorBarra + ';"></div></div>' +
          '<div class="flex items-center justify-between mt-1">' +
            '<span class="text-xs texto-secundario">' + porcentajeCat.toFixed(0) + '% usado</span>' +
            '<div class="flex items-center gap-1">' +
              '<input type="number" class="w-20 text-xs p-1 bg-gray-50 dark:bg-gray-800 rounded-lg text-right" placeholder="Límite" value="' + (limiteCat || '') + '" onchange="App.actualizarLimiteCategoria(\'' + c.nombre + '\', this.value)">' +
            '</div>' +
          '</div>' +
        '</div>';
      });
      contenedor.innerHTML = html || '<p class="texto-secundario text-center">No hay categorías</p>';

      // Historial
      var contenedorHistorial = document.getElementById('historialPresupuesto');
      var htmlHistorial = '';
      historial.forEach(function(item) {
        var gastosMesHist = transacciones.filter(function(t) { return t.tipo === 'gasto' && t.fecha && t.fecha.startsWith(item.mes); })
                                .reduce(function(sum, t) { return sum + t.monto; }, 0);
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

  // Función principal que se llama desde ui-main.js
  App.cargarPantallaPresupuesto = function() {
    var contenedor = document.getElementById('contenidoPresupuesto');
    if (!contenedor) {
      console.error('No se encontró #contenidoPresupuesto');
      return;
    }
    // Construir la estructura si no existe ya
    if (!document.getElementById('tituloMesPresupuesto')) {
      contenedor.innerHTML = crearEstructuraPresupuesto();
    }
    var mes = (typeof App.obtenerMesActual === 'function') ? App.obtenerMesActual() : new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
    cargarDatosPresupuesto(mes);
  };

  // Función global para actualizar límite desde el input
  App.actualizarLimiteCategoria = function(categoria, nuevoLimiteStr) {
    var nuevoLimite = parseFloat(nuevoLimiteStr);
    if (isNaN(nuevoLimite) || nuevoLimite < 0) {
      alert('Ingresa un valor válido.');
      return;
    }
    App.guardarLimiteCategoria(App.obtenerMesActual(), categoria, nuevoLimite, function() {
      App.cargarPantallaPresupuesto();
    });
  };
})();
