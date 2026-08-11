// charts.js – gráficas de dona y tendencia
(function() {
  const App = window.App;
  App.graficaIngresosChart = null;
  App.graficaGastosChart = null;
  App.graficaTendenciaChart = null;

  App.actualizarGraficas = (filtradas, cats) => {
    // ... (código existente sin cambios, o si no lo tienes, usa este:)
    const ingresosData = filtradas.filter(t => t.tipo==='ingreso');
    const gastosData = filtradas.filter(t => t.tipo==='gasto');
    const agrupar = arr => {
      const agg = {};
      arr.forEach(t => { agg[t.categoria] = (agg[t.categoria]||0) + t.monto; });
      return agg;
    };
    const dibujar = (ctxId, datos, chartRef, colorDef) => {
      const agg = agrupar(datos);
      const nombres = Object.keys(agg);
      const montos = Object.values(agg);
      const fondos = nombres.map(n => {
        const cat = cats.find(c => c.nombre===n);
        return cat ? cat.color : colorDef;
      });
      if (App[chartRef]) App[chartRef].destroy();
      const ctx = document.getElementById(ctxId)?.getContext('2d');
      if (!ctx || nombres.length===0) return;
      App[chartRef] = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: nombres, datasets: [{ data: montos, backgroundColor: fondos }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    };
    dibujar('graficaIngresos', ingresosData, 'graficaIngresosChart', '#10b981');
    dibujar('graficaGastos', gastosData, 'graficaGastosChart', '#ef4444');
  };

  App.actualizarGraficaTendencia = (todas, mesActual) => {
    // Obtener últimos 6 meses
    const meses = [];
    const [año, mes] = mesActual.split('-').map(Number);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(año, mes - 1 - i, 1);
      meses.push(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'));
    }
    const ingresosPorMes = meses.map(m => todas.filter(t => t.tipo==='ingreso' && t.fecha?.startsWith(m)).reduce((s,t)=>s+t.monto,0));
    const gastosPorMes = meses.map(m => todas.filter(t => t.tipo==='gasto' && t.fecha?.startsWith(m)).reduce((s,t)=>s+t.monto,0));
    const etiquetas = meses.map(m => new Date(m+'-01').toLocaleDateString('es-ES', { month:'short' }));

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
})();
