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

    dibujar('graficaIngresos', ingresosData, 'graficaIngresosChart', '#e8c84c');
    dibujar('graficaGastos', gastosData, 'graficaGastosChart', '#4d4d4d');
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
          { label: 'Ingresos', data: ingresosPorMes, backgroundColor: '#e8c84c' },
          { label: 'Gastos', data: gastosPorMes, backgroundColor: '#4d4d4d' }
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
    const color = porcentaje < 50 ? '#e8c84c' : porcentaje < 80 ? '#f59e0b' : porcentaje < 100 ? '#f97316' : '#ff4444';
    App.graficaPresupuestoChart = new Chart(ctx, {
      type: 'doughnut',
      data: { datasets: [{ data: [p, 100 - p], backgroundColor: [color, '#e5e7eb'], borderWidth: 0 }] },
      options: { responsive: true, cutout: '80%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });
  };
  App.dibujarGraficaTorta = function(filtradas, categorias) {
  const gastosData = filtradas.filter(function(t) { return t.tipo === 'gasto'; });
  
  if (gastosData.length === 0) {
    if (App.graficaTortaChart) App.graficaTortaChart.destroy();
    return;
  }

  const agrupado = {};
  gastosData.forEach(function(t) { 
    agrupado[t.categoria] = (agrupado[t.categoria] || 0) + t.monto; 
  });

  const nombres = Object.keys(agrupado);
  const montos = Object.values(agrupado);
  
  // Asignar colores según la categoría
  const colores = nombres.map(function(nombre) {
    const cat = categorias.find(function(c) { return c.nombre === nombre; });
    return cat ? cat.color : '#e8c84c'; // Dorado por defecto
  });

  if (App.graficaTortaChart) App.graficaTortaChart.destroy();
  const ctx = document.getElementById('graficaGastosTorta')?.getContext('2d');
  if (!ctx) return;

  App.graficaTortaChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: nombres.map(n => n.charAt(0).toUpperCase() + n.slice(1)),
      datasets: [{
        data: montos,
        backgroundColor: colores,
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { 
          position: 'right',
          labels: { boxWidth: 12, font: { size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.label || '';
              let value = context.parsed || 0;
              let total = context.dataset.data.reduce((a, b) => a + b, 0);
              let porcentaje = Math.round((value / total) * 100);
              return label + ': $' + App.formatearMonto(value) + ' (' + porcentaje + '%)';
            }
          }
        }
      }
    }
  });
};
// ===== GRÁFICA DONA CON CLICS =====
App.dibujarGraficaDona = function(transacciones, tipoFiltro) {
  const canvas = document.getElementById('graficaDonaInicio');
  const textoCentro = document.getElementById('textoCentroDona');
  if (!canvas) return;

  // Agrupamos por categoría
  const datosPorCategoria = {};
  let total = 0;

  transacciones.forEach(t => {
    if (t.tipo === tipoFiltro) {
      datosPorCategoria[t.categoria] = (datosPorCategoria[t.categoria] || 0) + t.monto;
      total += t.monto;
    }
  });

  const labels = Object.keys(datosPorCategoria);
  const data = Object.values(datosPorCategoria);

  if (App.chartDonaInstance) {
    App.chartDonaInstance.destroy();
  }

  if (total === 0) {
    if (textoCentro) {
      textoCentro.innerHTML = `No hubo<br>${tipoFiltro === 'gasto' ? 'gastos' : 'ingresos'}<br>en este periodo`;
      textoCentro.classList.remove('hidden');
    }
    
    App.chartDonaInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Sin datos'],
        datasets: [{
          data: [1],
          backgroundColor: ['#d1d5db'],
          borderWidth: 0,
          cutout: '75%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
      }
    });
  } else {
    if (textoCentro) textoCentro.classList.add('hidden');

    const colores = ['#7a9c86', '#f2d057', '#e5989b', '#8e9aaf', '#c9ada7', '#9a8c98', '#d4a373', '#a3b18a'];

    App.chartDonaInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colores.slice(0, labels.length),
          borderWidth: 0,
          cutout: '75%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        // AQUÍ AGREGAMOS LA DETECCIÓN DE CLICS
        onClick: (e, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const categoriaSeleccionada = labels[index];
            if (typeof App.mostrarDetalleCategoria === 'function') {
              App.mostrarDetalleCategoria(categoriaSeleccionada, transacciones, tipoFiltro);
            }
          }
        }
      }
    });
  }
};
})();
