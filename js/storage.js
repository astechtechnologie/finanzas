(function() {
  const App = window.App;

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

  function renderizarPresupuestoMensual() {
    var cont = document.getElementById('presupuestoContenido');
    if (!cont) return;

    var ingresos = 0;
    var mesPresupuesto = App.obtenerMesActual ? App.obtenerMesActual() : '';
    var categoriasPresupuesto = [];

    function mostrarPaso0() {
      cont.innerHTML = '<div class="presupuesto-asistente">' +
        '<h3>Elige el mes</h3>' +
        '<input type="month" id="inputMesPresupuesto" class="input-field" value="' + mesPresupuesto + '">' +
        '<button id="btnPaso0" class="btn btn-primario w-full mt-2">Continuar</button>' +
        '</div>';
      document.getElementById('btnPaso0').addEventListener('click', function() {
        mesPresupuesto = document.getElementById('inputMesPresupuesto').value;
        mostrarPaso1();
      });
    }

    function mostrarPaso1() {
      cont.innerHTML = '<div class="presupuesto-asistente">' +
        '<h3>Ingresos del mes</h3>' +
        '<p>¿Cuánto dinero recibirás en ' + mesPresupuesto + '?</p>' +
        '<input type="number" id="inputIngresos" placeholder="Ej: 3000000" class="input-field">' +
        '<button id="btnPaso1" class="btn btn-primario w-full mt-2">Continuar</button>' +
        '</div>';
      document.getElementById('btnPaso1').addEventListener('click', function() {
        ingresos = parseFloat(document.getElementById('inputIngresos').value) || 0;
        if (ingresos <= 0) { alert('Ingresa un monto válido'); return; }
        mostrarPaso2();
      });
    }

    function mostrarPaso2() {
      cont.innerHTML = '<div class="presupuesto-asistente">' +
        '<h3>Distribuye tus gastos</h3>' +
        '<p>Asigna un límite a cada categoría</p>' +
        '<div id="listaCategoriasPaso2"></div>' +
        '<hr>' +
        '<p>Total asignado: <strong id="totalAsignado">$0</strong></p>' +
        '<p>Restante: <strong id="restanteAsignado">$' + App.formatearMonto(ingresos) + '</strong></p>' +
        '<button id="btnPaso2" class="btn btn-primario w-full mt-2">Revisar resumen</button>' +
        '</div>';

      App.obtenerCategorias(function(cats) {
        categoriasPresupuesto = cats.filter(function(c) { return c.tipo === 'gasto'; });
        var lista = document.getElementById('listaCategoriasPaso2');
        var html = '';
        categoriasPresupuesto.forEach(function(c) {
          html += '<div class="cat-presupuesto-item">' +
            '<span><i class="ph ' + c.icono + '"></i> ' + c.nombre + '</span>' +
            '<input type="number" class="input-limite-cat" data-cat="' + c.nombre + '" placeholder="0" class="input-field">' +
            '</div>';
        });
        lista.innerHTML = html;

        lista.querySelectorAll('.input-limite-cat').forEach(function(input) {
          input.addEventListener('input', actualizarTotales);
        });
      });

      function actualizarTotales() {
        var total = 0;
        document.querySelectorAll('.input-limite-cat').forEach(function(inp) {
          total += parseFloat(inp.value) || 0;
        });
        document.getElementById('totalAsignado').textContent = '$' + App.formatearMonto(total);
        var restante = ingresos - total;
        var restanteEl = document.getElementById('restanteAsignado');
        restanteEl.textContent = '$' + App.formatearMonto(restante);
        restanteEl.style.color = restante < 0 ? '#ff4444' : 'inherit';
      }

      document.getElementById('btnPaso2').addEventListener('click', mostrarPaso3);
    }

    function mostrarPaso3() {
      var totalAsignado = 0;
      document.querySelectorAll('.input-limite-cat').forEach(function(inp) {
        totalAsignado += parseFloat(inp.value) || 0;
      });
      var ahorro = ingresos - totalAsignado;

      cont.innerHTML = '<div class="presupuesto-asistente">' +
        '<h3>Resumen del presupuesto</h3>' +
        '<p>Mes: ' + mesPresupuesto + '</p>' +
        '<p>Ingresos: $' + App.formatearMonto(ingresos) + '</p>' +
        '<p>Total gastos: $' + App.formatearMonto(totalAsignado) + '</p>' +
        '<p>Ahorro: $' + App.formatearMonto(ahorro) + '</p>' +
        '<button id="btnGuardarPresupuesto" class="btn btn-primario w-full mt-2">Guardar presupuesto</button>' +
        '</div>';

      document.getElementById('btnGuardarPresupuesto').addEventListener('click', function() {
        document.querySelectorAll('.input-limite-cat').forEach(function(inp) {
          App.guardarLimiteCategoria(mesPresupuesto, 'gasto', inp.dataset.cat, parseFloat(inp.value) || 0, function() {});
        });
        alert('Presupuesto guardado');
        renderizarPresupuestoMensual();
      });
    }

    mostrarPaso0();
  }

  // ==================== METAS ====================
  function renderizarMetas() {
    var cont = document.getElementById('presupuestoContenido');
    if (!cont) return;
    cont.innerHTML = '<p class="texto-secundario">Cargando metas...</p>';
    App.obtenerMetas(function(metas) {
      var html = '<button id="btnNuevaMeta" class="btn btn-primario w-full mb-3"><i class="ph ph-plus"></i> Nueva meta</button>';
      html += '<div id="listaMetas" class="metas-lista"></div>';
      cont.innerHTML = html;
      var lista = document.getElementById('listaMetas');
      if (metas.length === 0) {
        lista.innerHTML = '<p class="texto-secundario text-center">No hay metas</p>';
      } else {
        var htmlMetas = '';
        metas.forEach(function(m) {
          var p = m.costoTotal > 0 ? (m.ahorrado / m.costoTotal) * 100 : 0;
          htmlMetas += '<div class="meta-card">' +
            '<strong>' + m.nombre + '</strong>' +
            '<div class="progress-bar"><div class="progress-fill" style="width:' + Math.min(p, 100) + '%; background:#e8c84c;"></div></div>' +
            '<small>' + App.formatearMonto(m.ahorrado) + ' de ' + App.formatearMonto(m.costoTotal) + '</small>' +
            '</div>';
        });
        lista.innerHTML = htmlMetas;
      }
      document.getElementById('btnNuevaMeta').addEventListener('click', function() {
        var nombre = prompt('Nombre de la meta:');
        var costo = parseFloat(prompt('Costo total:'));
        if (nombre && costo > 0) {
          App.agregarMeta({ nombre: nombre, costoTotal: costo, ahorrado: 0 }).then(function() { renderizarMetas(); });
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
      var total = 0;
      subs.forEach(function(s) { total += s.costo; });
      var html = '<p class="font-bold">Total mensual: $' + App.formatearMonto(total) + '</p>';
      subs.forEach(function(s) {
        html += '<div class="suscripcion-card">' + s.nombre + ' - $' + App.formatearMonto(s.costo) + '</div>';
      });
      html += '<button id="btnNuevaSuscripcion" class="btn btn-primario w-full mt-3"><i class="ph ph-plus"></i> Nueva suscripción</button>';
      cont.innerHTML = html;
      document.getElementById('btnNuevaSuscripcion').addEventListener('click', function() {
        var nombre = prompt('Nombre:');
        var costo = parseFloat(prompt('Costo mensual:'));
        if (nombre && costo > 0) {
          App.agregarSuscripcion({ nombre: nombre, costo: costo, frecuencia: 'mensual' }).then(function() { renderizarSuscripciones(); });
        }
      });
    });
  }

  // ==================== PRÉSTAMOS ====================
  function renderizarPrestamos() {
    var cont = document.getElementById('presupuestoContenido');
    if (!cont) return;
    cont.innerHTML = '<p class="texto-secundario">Cargando préstamos...</p>';
    App.obtenerPrestamos(function(prestamos) {
      if (prestamos.length === 0) {
        cont.innerHTML = '<p class="texto-secundario">No hay préstamos</p>';
        return;
      }
      var html = '';
      prestamos.forEach(function(p) {
        html += '<div class="prestamo-card">' +
          '<strong>' + p.nombre + '</strong> - $' + App.formatearMonto(p.monto) + ' (' + p.tipo + ')' +
          '<br><small>Pagado: $' + App.formatearMonto(p.pagado) + '</small>' +
          '</div>';
      });
      cont.innerHTML = html;
    });
  }

  // ==================== INICIALIZACIÓN ====================
  App.cargarPantallaPresupuesto = function() {
    var contenedor = document.getElementById('contenidoPresupuesto');
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
        ['tabPresupuestoMensual', 'tabMetasAhorro', 'tabSuscripciones', 'tabPrestamos'].forEach(function(id) {
          document.getElementById(id).classList.remove('active');
        });
        document.getElementById(activeId).classList.add('active');
      }
    }
    renderizarPresupuestoMensual();
  };
  // ===== CUENTAS =====
App.obtenerCuentas = function(callback) {
  const userId = uid();
  return db.collection('usuarios/' + userId + '/cuentas').onSnapshot(function(snap) {
    const cuentas = [];
    snap.forEach(function(doc) { cuentas.push(Object.assign({ id: doc.id }, doc.data())); });
    if (cuentas.length === 0) {
      db.collection('usuarios/' + userId + '/cuentas').add({ nombre: 'Personal', tipo: 'personal', color: '#e8c84c' });
      return;
    }
    callback(cuentas);
  });
};

App.agregarCuenta = function(nombre, tipo, color) {
  const userId = uid();
  return db.collection('usuarios/' + userId + '/cuentas').add({
    nombre: nombre.trim(),
    tipo: tipo || 'personal',
    color: color || '#e8c84c'
  });
};

App.eliminarCuenta = function(cuentaId) {
  const userId = uid();
  return db.collection('usuarios/' + userId + '/cuentas').doc(cuentaId).delete();
};
})();
