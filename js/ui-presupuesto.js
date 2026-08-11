// Pantalla de presupuesto (por categorías)
(function() {
  const App = window.App;

  document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('btnIrPresupuesto').addEventListener('click', () => {
      document.getElementById('appScreen').classList.add('hidden');
      document.getElementById('presupuestoScreen').classList.remove('hidden');
      App.cargarPantallaPresupuesto();
    });

    document.getElementById('btnVolverDePresupuesto').addEventListener('click', () => {
      document.getElementById('presupuestoScreen').classList.add('hidden');
      document.getElementById('appScreen').classList.remove('hidden');
    });
  });

  App.cargarPantallaPresupuesto = function() {
    const mes = App.getMesSeleccionado();
    const partes = mes.split('-');
    const nombreMes = new Date(partes[0], partes[1] - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    document.getElementById('tituloMesPresupuesto').textContent = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

    const ahora = new Date();
    const finMes = new Date(partes[0], partes[1], 0).getDate();
    const diaActual = (ahora.getFullYear() == partes[0] && (ahora.getMonth() + 1) == partes[1]) ? ahora.getDate() : 0;
    const diasRest = Math.max(0, finMes - diaActual);
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

      const totalPresupuestado = Object.values(limites).reduce((sum, val) => sum + val, 0);

      document.getElementById('gastoActualPresupuesto').textContent = '$' + totalGastado.toFixed(2);
      document.getElementById('limitePresupuestoValor').textContent = '$' + totalPresupuestado.toFixed(2);

      const diasTranscurridos = diaActual > 0 ? diaActual : finMes;
      const promedio = diasTranscurridos > 0 ? totalGastado / diasTranscurridos : 0;
      document.getElementById('promedioDiario').textContent = '$' + promedio.toFixed(2);
      const proyeccion = promedio * finMes;
      const proyeccionEl = document.getElementById('proyeccionMensual');
      proyeccionEl.textContent = '$' + proyeccion.toFixed(2);
      proyeccionEl.className = 'text-lg font-semibold ' + (totalPresupuestado > 0 && proyeccion > totalPresupuestado ? 'text-red-500' : 'text-emerald-500');

      const porcentajeTotal = totalPresupuestado > 0 ? (totalGastado / totalPresupuestado) * 100 : 0;
      App.dibujarGraficaPresupuesto(porcentajeTotal);

      // Lista de categorías con barras
      const contenedor = document.getElementById('listaPresupuestoCategorias');
      let html = '';
      categorias.forEach(c => {
        const limiteCat = limites[c.nombre] || 0;
        const gastoCat = gastosPorCategoria[c.nombre] || 0;
        const porcentajeCat = limiteCat > 0 ? (gastoCat / limiteCat) * 100 : 0;
        const colorBarra = porcentajeCat >= 100 ? '#ef4444' : porcentajeCat >= 80 ? '#f97316' : '#10b981';
        html +=
          '<div>' +
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
      const contenedorHistorial = document.getElementById('historialPresupuesto');
      let htmlHistorial = '';
      historial.forEach(item => {
        const gastosMesHist = transacciones.filter(t => t.tipo === 'gasto' && t.fecha && t.fecha.startsWith(item.mes))
                                  .reduce((sum, t) => sum + t.monto, 0);
        const cumplio = item.limiteTotal > 0 ? gastosMesHist <= item.limiteTotal : true;
        const color = cumplio ? 'text-emerald-500' : 'text-red-500';
        const nombreMesHist = new Date(item.mes.split('-')[0], item.mes.split('-')[1] - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
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
  };

  // Función global para actualizar límite desde el input
  App.actualizarLimiteCategoria = function(categoria, nuevoLimiteStr) {
    const nuevoLimite = parseFloat(nuevoLimiteStr);
    if (isNaN(nuevoLimite) || nuevoLimite < 0) {
      alert('Ingresa un valor válido.');
      return;
    }
    App.guardarLimiteCategoria(App.getMesSeleccionado(), categoria, nuevoLimite, () => {
      App.cargarPantallaPresupuesto();
    });
  };
})();
