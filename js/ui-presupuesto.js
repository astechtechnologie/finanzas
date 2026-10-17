(function() {
  const App = window.App;

  // ==================== ESTRUCTURA GENERAL ====================
  function crearEstructura() {
    var html = '';
    html += '<div class="presupuesto-tabs">';
    html += '<button id="tabPresupuestoMensual" class="presupuesto-tab active"><i class="ph ph-wallet"></i> Presupuesto</button>';
    html += '<button id="tabMetasAhorro" class="presupuesto-tab"><i class="ph ph-piggy-bank"></i> Metas</button>';
    html += '<button id="tabSuscripciones" class="presupuesto-tab"><i class="ph ph-repeat"></i> Suscripciones</button>';
    html += '<button id="tabPrestamos" class="presupuesto-tab"><i class="ph ph-handshake"></i> Préstamos</button>';
    html += '</div>';
    html += '<div id="presupuestoContenido" class="mt-4"></div>';
    return html;
  }

  // ==================== PRESUPUESTO MENSUAL ====================
  function renderizarPresupuestoMensual() {
    const cont = document.getElementById('presupuestoContenido');
    if (!cont) return;

    const mes = typeof App.obtenerMesActual === 'function' ? App.obtenerMesActual() : new Date().toISOString().slice(0, 7);
    
    cont.innerHTML = '<p class="text-center texto-secundario">Cargando presupuesto...</p>';

    App.obtenerCategorias(function(categorias) {
      const catGastos = categorias.filter(c => c.tipo === 'gasto');

      if (catGastos.length === 0) {
        cont.innerHTML = `<div class="card" style="padding: 20px; text-align: center;">
          <p>No tienes categorías de gasto.</p>
          <button onclick="App.cambiarVista('vistaCategorias')" class="btn btn-primario mt-2">Crear Categorías</button>
        </div>`;
        return;
      }

      App.obtenerLimitesCategorias(mes, function(limites) {
        const limitesGastos = limites.gastos || {};
        
        App.obtenerTransacciones(function(transacciones) {
          const gastosPorCategoria = {};
          transacciones.forEach(t => {
            if (t.tipo === 'gasto' && t.fecha && t.fecha.startsWith(mes)) {
              gastosPorCategoria[t.categoria] = (gastosPorCategoria[t.categoria] || 0) + t.monto;
            }
          });

          let html = `
            <div class="card" style="padding: 20px; background: #1c1c1e; color: white; border-radius: 16px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <h3 style="margin: 0 0 5px 0; font-size: 14px; color: #aaa;">Presupuesto de este mes</h3>
                  <p style="margin: 0; font-size: 12px; color: #888;">Escribe un límite y presiona el check.</p>
                </div>
                <button id="btnCopiarPresupuesto" style="background: rgba(232, 200, 76, 0.2); color: #e8c84c; border: 1px solid #e8c84c; padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                  <i class="ph ph-copy"></i> Copiar anterior
                </button>
              </div>
            </div>
            <div class="card" style="padding: 15px;">
          `;

          catGastos.forEach(cat => {
            const limite = limitesGastos[cat.nombre] ? limitesGastos[cat.nombre].limite : 0;
            const gastado = gastosPorCategoria[cat.nombre] || 0;
            
            let porcentaje = limite > 0 ? (gastado / limite) * 100 : 0;
            let colorBarra = '#e8c84c';
            if (porcentaje >= 100) colorBarra = '#ef4444';
            else if (porcentaje >= 80) colorBarra = '#f97316';

            html += `
              <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px; color: ${cat.color};"><i class="ph ${cat.icono}"></i></span>
                    <strong style="text-transform: capitalize;">${cat.nombre}</strong>
                  </div>
                  <div style="display: flex; align-items: center; gap: 5px;">
                    <span style="color: #666; font-weight: bold;">$</span>
                    <input type="number" id="limite-${cat.nombre}" value="${limite || ''}" placeholder="0" style="width: 80px; padding: 6px; border: 1px solid #ddd; border-radius: 6px; outline: none; text-align: right;">
                    <button class="btn-guardar-limite" data-categoria="${cat.nombre}" style="background: #e8c84c; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; color: black; font-weight: bold;">
                      <i class="ph ph-check"></i>
                    </button>
                  </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-bottom: 5px;">
                  <span>Gastado: $${App.formatearMonto(gastado)}</span>
                  <span>${limite > 0 ? Math.round(porcentaje) + '%' : 'Sin límite'}</span>
                </div>
                
                <div style="width: 100%; height: 8px; background: #eee; border-radius: 4px; overflow: hidden;">
                  <div style="width: ${Math.min(porcentaje, 100)}%; height: 100%; background: ${colorBarra}; transition: width 0.3s;"></div>
                </div>
              </div>
            `;
          });

          html += `</div>`;
          cont.innerHTML = html;

          cont.querySelectorAll('.btn-guardar-limite').forEach(btn => {
            btn.addEventListener('click', function() {
              const categoria = this.dataset.categoria;
              const input = document.getElementById('limite-' + categoria);
              const nuevoLimite = parseFloat(input.value) || 0;
              const btnOriginal = this;

              btnOriginal.innerHTML = '...';

              App.guardarLimiteCategoria(mes, 'gasto', categoria, nuevoLimite, function() {
                btnOriginal.innerHTML = '<i class="ph ph-check"></i>';
                btnOriginal.style.background = '#10b981';
                btnOriginal.style.color = 'white';
                
                setTimeout(() => {
                  btnOriginal.innerHTML = '<i class="ph ph-check"></i>';
                  btnOriginal.style.background = '#e8c84c';
                  btnOriginal.style.color = 'black';
                  renderizarPresupuestoMensual();
                }, 1000);
              });
            });
          });

          // Lógica para copiar presupuesto del mes anterior
          const btnCopiar = document.getElementById('btnCopiarPresupuesto');
          if (btnCopiar) {
            btnCopiar.addEventListener('click', function() {
              const [year, month] = mes.split('-');
              const fechaAnterior = new Date(year, month - 2, 1);
              const mesAnterior = fechaAnterior.getFullYear() + '-' + String(fechaAnterior.getMonth() + 1).padStart(2, '0');

              if (!confirm('¿Copiar los límites del mes anterior (' + mesAnterior + ')? Esto sobrescribirá los límites actuales.')) return;

              this.innerHTML = 'Copiando...';

              App.obtenerLimitesCategorias(mesAnterior, function(limitesAnteriores) {
                const gastosAnteriores = limitesAnteriores.gastos || {};
                let catKeys = Object.keys(gastosAnteriores);
                
                if (catKeys.length === 0) {
                  alert('No hay presupuesto guardado en el mes anterior.');
                  btnCopiar.innerHTML = '<i class="ph ph-copy"></i> Copiar anterior';
                  return;
                }

                let pendientes = catKeys.length;
                catKeys.forEach(function(cat) {
                  App.guardarLimiteCategoria(mes, 'gasto', cat, gastosAnteriores[cat].limite, function() {
                    pendientes--;
                    if (pendientes === 0) {
                      alert('Presupuesto copiado exitosamente.');
                      renderizarPresupuestoMensual();
                    }
                  });
                });
              });
            });
          }
        });
      });
    });
  }

  // ==================== METAS DE AHORRO ====================
  function renderizarMetas() {
    const cont = document.getElementById('presupuestoContenido');
    if (!cont) return;

    cont.innerHTML = '<p class="text-center texto-secundario">Cargando metas...</p>';

    App.obtenerMetas(function(metas) {
      let html = '<button id="btnNuevaMeta" class="btn btn-primario w-full mb-3"><i class="ph ph-plus"></i> Nueva meta</button>';
      html += '<div id="listaMetas" class="metas-lista"></div>';
      cont.innerHTML = html;

      const lista = document.getElementById('listaMetas');
      if (metas.length === 0) {
        lista.innerHTML = '<p class="texto-secundario text-center">No hay metas</p>';
      } else {
        lista.innerHTML = metas.map(m => {
          const porcentaje = m.costoTotal > 0 ? (m.ahorrado / m.costoTotal) * 100 : 0;
          const completada = porcentaje >= 100;
          return `<div class="meta-card" style="background: white; padding: 15px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <strong style="font-size: 16px;">${m.nombre} ${completada ? '🎉' : ''}</strong>
              ${!completada ? `<button class="btn-aportar-meta" data-id="${m.id}" data-nombre="${m.nombre}" style="background: #e8c84c; border: none; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer;">Aportar</button>` : ''}
            </div>
            <div class="progress-bar" style="height: 8px; background: #eee; border-radius: 4px; margin: 8px 0; overflow: hidden;">
              <div class="progress-fill" style="width:${Math.min(porcentaje,100)}%; height: 100%; background:${completada ? '#10b981' : '#e8c84c'};"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #666;">
              <span>Ahorrado: $${App.formatearMonto(m.ahorrado)}</span>
              <span>Meta: $${App.formatearMonto(m.costoTotal)}</span>
            </div>
          </div>`;
        }).join('');

        // Evento para aportar a una meta
        lista.querySelectorAll('.btn-aportar-meta').forEach(btn => {
          btn.addEventListener('click', function() {
            const id = this.dataset.id;
            const nombre = this.dataset.nombre;
            const monto = parseFloat(prompt(`¿Cuánto deseas aportar a "${nombre}"?`));
            
            if (monto && monto > 0) {
              this.textContent = '...';
              App.aportarMeta(id, monto).then(() => {
                renderizarMetas();
              }).catch(err => {
                alert('Error al aportar: ' + err);
                this.textContent = 'Aportar';
              });
            }
          });
        });
      }

      document.getElementById('btnNuevaMeta').addEventListener('click', () => {
        const nombre = prompt('Nombre de la meta:');
        const costo = parseFloat(prompt('Costo total:'));
        if (nombre && costo > 0) {
          App.agregarMeta({ nombre, costoTotal: costo, ahorrado: 0 }).then(() => renderizarMetas());
        }
      });
    });
  }

  // ==================== SUSCRIPCIONES ====================
  function renderizarSuscripciones() {
    var cont = document.getElementById('presupuestoContenido');
    if (!cont) return;
    cont.innerHTML = '<p class="texto-secundario">Cargando suscripciones...</p>';

    App.obtenerSuscripciones(function(subs) {
      if (subs.length === 0) {
        cont.innerHTML = '<p class="texto-secundario">No hay suscripciones</p>';
        return;
      }
      var totalMensual = 0;
      subs.forEach(function(s) { totalMensual += s.costo; });
      var html = '<p class="font-bold">Total mensual: $' + App.formatearMonto(totalMensual) + '</p>';
      subs.forEach(function(s) {
        html += '<div class="suscripcion-card" style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 5px;">' + s.nombre + ' - $' + App.formatearMonto(s.costo) + '</div>';
      });
      html += '<button id="btnNuevaSuscripcion" class="btn btn-primario w-full mt-3"><i class="ph ph-plus"></i> Nueva suscripción</button>';
      cont.innerHTML = html;

      document.getElementById('btnNuevaSuscripcion').addEventListener('click', function() {
        var nombre = prompt('Nombre:');
        var costo = parseFloat(prompt('Costo mensual:'));
        if (nombre && costo > 0) {
          App.agregarSuscripcion({ nombre: nombre, costo: costo, frecuencia: 'mensual' }).then(function() {
            renderizarSuscripciones();
          });
        }
      });
    });
  }

  // ==================== PRÉSTAMOS ====================
  function renderizarPrestamos() {
    const cont = document.getElementById('presupuestoContenido');
    if (!cont) return;
    cont.innerHTML = '<p class="texto-secundario">Cargando préstamos...</p>';

    App.obtenerPrestamos(function(prestamos) {
      if (prestamos.length === 0) {
        cont.innerHTML = '<p class="texto-secundario">No hay préstamos</p>';
        return;
      }
      cont.innerHTML = prestamos.map(p => `
        <div class="prestamo-card" style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
          <strong>${p.nombre}</strong> - $${App.formatearMonto(p.monto)} (${p.tipo})
          <br><small>Pagado: $${App.formatearMonto(p.pagado)}</small>
        </div>
      `).join('');
    });
  }

  // ==================== CARGA INICIAL ====================
  App.cargarPantallaPresupuesto = function() {
    const contenedor = document.getElementById('contenidoPresupuesto');
    if (!contenedor) return;

    if (!document.getElementById('presupuestoContenido')) {
      contenedor.innerHTML = crearEstructura();
      
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

      function setActiveTab(activeId) {
        ['tabPresupuestoMensual', 'tabMetasAhorro', 'tabSuscripciones', 'tabPrestamos'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.classList.remove('active');
        });
        const elActivo = document.getElementById(activeId);
        if (elActivo) elActivo.classList.add('active');
      }
    }
    renderizarPresupuestoMensual();
  };
})();
