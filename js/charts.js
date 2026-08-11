// Gráficas de la aplicación
(function() {
  const App = window.App;
  App.graficaIngresosChart = null;
  App.graficaGastosChart = null;
  App.graficaPresupuestoChart = null;

  App.actualizarGraficas = function(transaccionesFiltradas, categoriasState) {
    const ingresosData = transaccionesFiltradas.filter(t => t.tipo === 'ingreso');
    const gastosData = transaccionesFiltradas.filter(t => t.tipo === 'gasto');

    function agrupar(datos) {
      const agg = {};
      datos.forEach(t => {
        if (!agg[t.categoria]) agg[t.categoria] = 0;
        agg[t.categoria] += t.monto;
      });
      return agg;
    }

    function dibujar(ctxId, datos, chartVarRef, colorDefault) {
      const agg = agrupar(datos);
      const nombres = Object.keys(agg);
      const montos = Object.values(agg);
      const fondos = nombres.map(nombre => {
        const cat = categoriasState.find(c => c.nombre === nombre);
        return cat ? cat.color : colorDefault;
      });
      if (App[chartVarRef]) App[chartVarRef].destroy();
      const ctx = document.getElementById(ctxId).getContext('2d');
      if (nombres.length === 0) {
        App[chartVarRef] = null;
        return null;
      }
      const chart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: nombres, datasets: [{ data: montos, backgroundColor: fondos, borderWidth: 2, borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-tarjeta').trim() || '#ffffff' }] },
        options: { responsive: true, plugins: { legend: { display: false } }, cutout: '65%' }
      });
      App[chartVarRef] = chart;
      return chart;
    }

    dibujar('graficaIngresos', ingresosData, 'graficaIngresosChart', '#10b981');
    dibujar('graficaGastos', gastosData, 'graficaGastosChart', '#ef4444');
  };

  App.dibujarGraficaPresupuesto = function(porcentaje) {
    if (App.graficaPresupuestoChart) App.graficaPresupuestoChart.destroy();
    const ctx = document.getElementById('graficaPresupuesto').getContext('2d');
    const porcentajeValido = Math.min(porcentaje, 100);
    const color = porcentaje < 50 ? '#10b981' : porcentaje < 80 ? '#f59e0b' : porcentaje < 100 ? '#f97316' : '#ef4444';
    App.graficaPresupuestoChart = new Chart(ctx, {
      type: 'doughnut',
      data: { datasets: [{ data: [porcentajeValido, 100 - porcentajeValido], backgroundColor: [color, '#e5e7eb'], borderWidth: 0 }] },
      options: { responsive: true, cutout: '80%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });
  };
})();
