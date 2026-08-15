// charts.js – Gráficas
(function() {
  const App = window.App;
  App.graficaIngresosChart = null;
  App.graficaGastosChart = null;
  App.graficaTendenciaChart = null;
  App.graficaPresupuestoMensualChart = null;
  App.graficaPresupuestoChart = null;

  App.actualizarGraficas = function(filtradas, cats) {
    const ingresosData = filtradas.filter(function(t) { return t.tipo === 'ingreso'; });
    const gastosData = filtradas.filter(function(t) { return t.tipo === 'gasto'; });

    function agrupar(datos) {
      const agg = {};
      datos.forEach(function(t) { agg[t.categoria] = (agg[t.categoria] || 0) + t.monto; });
      return agg;
    }

    function dibujar(ctxId, datos, chartRef, colorDefault) {
      const agg = agrupar(datos);
      const nombres = Object.keys(agg);
      const montos = Object.values(agg);
      const fondos = nombres.map(function(n) {
        const cat = cats.find(function(c) { return c.nombre === n; });
        return cat ? cat.color : colorDefault;
      });
      if (App[chartRef]) App[chartRef].destroy();
      const ctx = document.getElementById(ctxId)?.getContext('2d');
      if (!ctx || nombres.length === 0) { App[chartRef] = null; return; }
      App[chartRef] = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: nombres, datasets: [{ data: montos, backgroundColor: fondos }] },
        options: { responsive: true, plugins: { legend: { display: false } }, cutout: '65%' }
      });
    }

    dibujar('graficaIngresos', ingresosData, 'graficaIngresosChart', '#10b981');
    dibujar('graficaGastos', gastosData, 'graficaGastosChart', '#ef4444');
  };

  App.actualizarGraficaTendencia = function(todas, mesActual) {
    const [año, mes] = mesActual.split('-').map(Number);
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(año, mes - 1 - i, 1);
      meses.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
    }
    const ingresosPorMes = meses.map(function(m) { return todas.filter(function(t) { return t.tipo === 'ingreso' && t.fecha && t.fecha.startsWith(m); }).reduce(function(s, t) { return s + t.monto; }, 0); });
    const gastosPorMes = meses.map(function(m) { return todas.filter(function(t) { return t.tipo === 'gasto' && t.fecha && t.fecha.startsWith(m); }).reduce(function(s, t) { return s + t.monto; }, 0); });
    const etiquetas = meses.map(function(m) { return new Date(m + '-01').toLocaleDateString('es-ES', { month: 'short' }); });

    if (App.graficaTendenciaChart) App.graficaTendenciaChart.destroy();
    const ctx = document.getElementById('graficaTendencia')?.getContext('2d');
    if (!ctx) return;
    App.graficaTendenciaChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [
          { label: 'Ingresos', data: ingresosPorMes, backgroundColor: '#10b981' },
          { label: 'Gastos', data: gastosPorMes, backgroundColor: '#ef4444' }
        ]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { display: false } }
      }
    });
  };

  App.dibujarGraficaPresupuesto = function(porcentaje) {
    if (App.graficaPresupuestoChart) App.graficaPresupuestoChart.destroy();
    const ctx = document.getElementById('graficaPresupuesto')?.getContext('2d');
    if (!ctx) return;
    const p = Math.min(porcentaje, 100);
    const color = porcentaje < 50 ? '#10b981' : porcentaje < 80 ? '#f59e0b' : porcentaje < 100 ? '#f97316' : '#ef4444';
    App.graficaPresupuestoChart = new Chart(ctx, {
      type: 'doughnut',
      data: { datasets: [{ data: [p, 100 - p], backgroundColor: [color, '#e5e7eb'], borderWidth: 0 }] },
      options: { responsive: true, cutout: '80%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });
  };
})();
