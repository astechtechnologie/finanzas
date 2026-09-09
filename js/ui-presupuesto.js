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

  // ==================== PRESUPUESTO MENSUAL (ASISTENTE) ====================
  function renderizarPresupuestoMensual() {
    const cont = document.getElementById('presupuestoContenido');
    if (!cont) return;

    let ingresos = 0;
    let categoriasPresupuesto = [];

    function mostrarPaso1() {
      cont.innerHTML = `
        <div class="presupuesto-asistente">
          <h3>Paso 1: Ingresa tus ingresos</h3>
          <p>¿Cuánto dinero recibes este mes?</p>
          <input type="number" id="inputIngresos" placeholder="Ej: 3000000" class="input-field">
          <button id="btnPaso1" class="btn btn-primario w-full mt-2">Continuar</button>
        </div>
      `;
      document.getElementById('btnPaso1').addEventListener('click', () => {
        ingresos = parseFloat(document.getElementById('inputIngresos').value) || 0;
        if (ingresos <= 0) return alert('Ingresa un monto válido');
        mostrarPaso2();
      });
    }

    function mostrarPaso2() {
      cont.innerHTML = `
        <div class="presupuesto-asistente">
          <h3>Paso 2: Asigna límites</h3>
          <p>Distribuye tus gastos por categoría</p>
          <div id="listaCategoriasPaso2"></div>
          <p>Total asignado: <strong id="totalAsignado">$0</strong></p>
          <p>Restante: <strong id="restanteAsignado">$${App.formatearMonto(ingresos)}</strong></p>
          <button id="btnPaso2" class="btn btn-primario w-full mt-2">Continuar</button>
        </div>
      `;

      App.obtenerCategorias(function(cats) {
        categoriasPresupuesto = cats.filter(c => c.tipo === 'gasto');
        const lista = document.getElementById('listaCategoriasPaso2');
        lista.innerHTML = categoriasPresupuesto.map(c => {
          return `<div class="cat-presupuesto-item">
            <span><i class="ph ${c.icono}"></i> ${c.nombre}</span>
            <input type="number" class="input-limite-cat" data-cat="${c.nombre}" placeholder="Límite" class="input-field">
          </div>`;
        }).join('');

        lista.querySelectorAll('.input-limite-cat').forEach(input => {
          input.addEventListener('input', actualizarTotales);
        });
      });

      function actualizarTotales() {
        let total = 0;
        document.querySelectorAll('.input-limite-cat').forEach(inp => {
          total += parseFloat(inp.value) || 0;
        });
        document.getElementById('totalAsignado').textContent = '$' + App.formatearMonto(total);
        document.getElementById('restanteAsignado').textContent = '$' + App.formatearMonto(ingresos - total);
      }

      document.getElementById('btnPaso2').addEventListener('click', () => {
        mostrarPaso3();
      });
    }

    function mostrarPaso3() {
      let totalAsignado = 0;
      document.querySelectorAll('.input-limite-cat').forEach(inp => {
        totalAsignado += parseFloat(inp.value) || 0;
      });

      cont.innerHTML = `
        <div class="presupuesto-asistente">
          <h3>Paso 3: Resumen</h3>
          <p>Ingresos: $${App.formatearMonto(ingresos)}</p>
          <p>Total asignado: $${App.formatearMonto(totalAsignado)}</p>
          <p>Restante para ahorro: $${App.formatearMonto(ingresos - totalAsignado)}</p>
          <button id="btnGuardarPresupuesto" class="btn btn-primario w-full mt-2">Guardar presupuesto</button>
        </div>
      `;

      document.getElementById('btnGuardarPresupuesto').addEventListener('click', () => {
        const mes = App.obtenerMesActual();
        document.querySelectorAll('.input-limite-cat').forEach(inp => {
          App.guardarLimiteCategoria(mes, 'gasto', inp.dataset.cat, parseFloat(inp.value) || 0, () => {});
        });
        alert('Presupuesto guardado correctamente');
        renderizarPresupuestoMensual(); // Volver a mostrar
      });
    }

    mostrarPaso1();
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
          return `<div class="meta-card">
            <strong>${m.nombre}</strong>
            <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(porcentaje,100)}%; background:#e8c84c;"></div></div>
            <small>${App.formatearMonto(m.ahorrado)} de ${App.formatearMonto(m.costoTotal)}</small>
          </div>`;
        }).join('');
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
    const cont = document.getElementById('presupuestoContenido');
    if (!cont) return;
    cont.innerHTML = '<p class="texto-secundario">Cargando suscripciones...</p>';
    App.obtenerSuscripciones(function(subs) {
      if (subs.length === 0) {
        cont.innerHTML = '<p class="texto-secundario">No hay suscripciones</p>';
        return;
      }
      let totalMensual = 0;
      subs.forEach(s => totalMensual += s.costo);
      cont.innerHTML = `
        <p class="font-bold">Total mensual: $${App.formatearMonto(totalMensual)}</p>
        ${subs.map(s => <div class="suscripcion-card">${s.nombre} - $${App.formatearMonto(s.costo)}</div>).join('')}
        <button id="btnNuevaSuscripcion" class="btn btn-primario w-full mt-3"><i class="ph ph-plus"></i> Nueva suscripción</button>
      `;
      document.getElementById('btnNuevaSuscripcion').addEventListener('click', () => {
        const nombre = prompt('Nombre:');
        const costo = parseFloat(prompt('Costo mensual:'));
        if (nombre && costo > 0) {
          App.agregarSuscripcion({ nombre, costo, frecuencia: 'mensual' }).then(() => renderizarSuscripciones());
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
        <div class="prestamo-card">
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
          document.getElementById(id).classList.remove('active');
        });
        document.getElementById(activeId).classList.add('active');
      }
    }
    renderizarPresupuestoMensual();
  };
})();
