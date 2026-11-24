/* FINORA — Conciliación financiera V1
 * Aditivo: NO convierte ingresos/gastos, NO altera documentos importados,
 * NO crea movimientos financieros al registrar transferencias.
 * Requiere Firebase compat y los parches mínimos de ui-main.js indicados en README.
 */
(function () {
  'use strict';
  const App = window.App = window.App || {};
  const MAX_MONTO = 1e12;
  const FECHA = /^\d{4}-\d{2}-\d{2}$/;
  const estado = {
    uid: null, cuentas: [], aperturas: new Map(), transferencias: [],
    cuentasListas: false, aperturasListas: false, transferenciasListas: false,
    unsub: [], revision: 0
  };
  const dom = id => document.getElementById(id);
  const formato = n => Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const redondear = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const hoy = () => fechaLocal(new Date());
  function fechaLocal(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fechaValida(s) {
    if (typeof s !== 'string' || !FECHA.test(s)) return false;
    const d = new Date(s + 'T12:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }
  function montoValido(n, permitirCero) {
    return typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= MAX_MONTO && (permitirCero || n > 0);
  }
  function numeroEntrada(v) {
    if (String(v).trim() === '') return NaN;
    return Number(String(v).trim().replace(',', '.'));
  }
  function perfilPersonal() { return (localStorage.getItem('perfilActivo') || 'personal') !== 'espacio'; }
  function uidActual() { return App.auth && App.auth.currentUser && App.auth.currentUser.uid; }
  function refUsuario() { return App.db.collection('usuarios').doc(estado.uid); }
  function cuentaDisponible(id) { return estado.cuentas.some(c => c.id === id); }
  function limpiarSuscripciones() {
    estado.unsub.forEach(fn => { try { fn(); } catch (_) {} });
    estado.unsub = [];
  }
  function avisarCambio() { window.dispatchEvent(new CustomEvent('finora:conciliacion-actualizada')); }
  function emitirEstado() { actualizarInterfaz(); avisarCambio(); }

  // Motor puro: calcula un saldo por cuenta hasta el cierre del periodo solicitado.
  // Saldo inicial corresponde al comienzo de fechaInicio. No suma movimientos previos.
  function calcularPuro({ cuentaId, transacciones, transferencias, apertura, fechaCorte, saldoLegacy }) {
    const corte = typeof fechaCorte === 'string' ? fechaCorte : fechaLocal(fechaCorte);
    if (!cuentaId || !fechaValida(corte)) return { saldo: Number(saldoLegacy) || 0, modo: 'no-disponible', transferencias: 0 };
    const ancla = apertura && fechaValida(apertura.fechaInicio) && montoValido(apertura.saldoInicial, true)
      ? apertura : null;
    if (ancla && corte < ancla.fechaInicio) {
      return { saldo: Number(saldoLegacy) || 0, modo: 'antes-del-saldo-inicial', transferencias: 0 };
    }
    const desde = ancla ? ancla.fechaInicio : null;
    let totalMovimientos = ancla ? Number(ancla.saldoInicial) : (Number(saldoLegacy) || 0);
    if (ancla) {
      for (const t of transacciones || []) {
        const m = Number(t.monto);
        if (!fechaValida(t.fecha) || t.fecha < desde || t.fecha > corte || !Number.isFinite(m)) continue;
        if (t.tipo === 'ingreso') totalMovimientos += m;
        else if (t.tipo === 'gasto') totalMovimientos -= m;
      }
    }
    let efectoTransferencias = 0;
    for (const tr of transferencias || []) {
      const m = Number(tr.monto);
      if (!fechaValida(tr.fecha) || tr.fecha > corte || (desde && tr.fecha < desde) || !montoValido(m, false)) continue;
      if (tr.origenCuentaId === cuentaId) efectoTransferencias -= m;
      if (tr.destinoCuentaId === cuentaId) efectoTransferencias += m;
    }
    return {
      saldo: redondear(totalMovimientos + efectoTransferencias),
      modo: ancla ? 'con-saldo-inicial' : 'sin-saldo-inicial',
      fechaInicio: ancla ? ancla.fechaInicio : null,
      transferencias: redondear(efectoTransferencias)
    };
  }

  App.Conciliacion = {
    calcularPuro,
    resolverSaldo({ cuentaId, transacciones, finPeriodo, saldoOriginal }) {
      if (!perfilPersonal() || !estado.uid || estado.uid !== uidActual()) {
        return { saldo: saldoOriginal, modo: 'compartido' };
      }
      if (!estado.cuentasListas || !estado.aperturasListas || !estado.transferenciasListas) {
        return { saldo: saldoOriginal, modo: 'cargando' };
      }
      return calcularPuro({
        cuentaId,
        transacciones,
        transferencias: estado.transferencias,
        apertura: estado.aperturas.get(cuentaId),
        fechaCorte: fechaLocal(finPeriodo),
        saldoLegacy: saldoOriginal
      });
    },
    mostrarEstado(resultado) {
      const cifra = dom('balanceTotalHeader');
      if (!cifra || !cifra.parentElement) return;
      let etiqueta = dom('fc1EtiquetaSaldo');
      if (!etiqueta) {
        etiqueta = document.createElement('span');
        etiqueta.id = 'fc1EtiquetaSaldo';
        etiqueta.className = 'fc1-etiqueta-saldo';
        cifra.insertAdjacentElement('afterend', etiqueta);
      }
      const textos = {
        'con-saldo-inicial': 'Saldo calculado con apertura del ' + resultado.fechaInicio,
        'sin-saldo-inicial': 'Saldo de movimientos: falta configurar el saldo inicial',
        'antes-del-saldo-inicial': 'Periodo anterior a la fecha de apertura configurada',
        'cargando': 'Comprobando saldos de la cuenta…',
        'compartido': '',
        'no-disponible': 'Saldo de movimientos'
      };
      etiqueta.textContent = textos[resultado.modo] || '';
      etiqueta.hidden = resultado.modo === 'compartido';
    }
  };

  function cargarDatosUsuario(usuario) {
    limpiarSuscripciones();
    const revision = ++estado.revision;
    estado.uid = usuario ? usuario.uid : null;
    estado.cuentas = [];
    estado.aperturas = new Map();
    estado.transferencias = [];
    estado.cuentasListas = estado.aperturasListas = estado.transferenciasListas = false;
    actualizarInterfaz();
    if (!usuario) return;
    const base = refUsuario();
    const specs = [
      ['cuentas', snap => {
        estado.cuentas = snap.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
        estado.cuentasListas = true;
      }],
      ['saldos_iniciales', snap => {
        estado.aperturas = new Map(snap.docs.map(d => [d.id, d.data()]));
        estado.aperturasListas = true;
      }],
      ['transferencias_cuentas', snap => {
        estado.transferencias = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
        estado.transferenciasListas = true;
      }]
    ];
    for (const [coleccion, aplicar] of specs) {
      const cancel = base.collection(coleccion).onSnapshot(snap => {
        if (revision !== estado.revision || estado.uid !== uidActual()) return;
        aplicar(snap);
        emitirEstado();
      }, err => {
        console.error('[Conciliación Finora] No se pudo leer ' + coleccion, err);
        if (revision !== estado.revision) return;
        mostrarMensaje('Error al cargar ' + coleccion + ': ' + (err.message || err), true);
      });
      estado.unsub.push(cancel);
    }
  }

  function agregarOpciones(select, cuentas, seleccion, placeholder) {
    if (!select) return;
    select.replaceChildren();
    if (placeholder) select.add(new Option(placeholder, ''));
    cuentas.forEach(c => select.add(new Option(c.nombre || 'Cuenta sin nombre', c.id)));
    if (seleccion && cuentas.some(c => c.id === seleccion)) select.value = seleccion;
    else if (!placeholder && cuentas.length) select.value = cuentas[0].id;
  }
  function actualizarInterfaz() {
    const panel = dom('fc1Panel');
    if (!panel) return;
    const personal = perfilPersonal();
    panel.hidden = !personal;
    if (!personal) return;
    const select = dom('fc1Cuenta');
    const predeterminada = estado.cuentas.find(c => c.id === App.cuentaActual) || estado.cuentas.find(c => String(c.nombre || '').toLowerCase() === 'personal');
    const selected = (select && select.value) || (predeterminada && predeterminada.id);
    agregarOpciones(select, estado.cuentas, selected);
    const actual = estado.cuentas.find(c => c.id === (select && select.value));
    const saldo = actual && estado.aperturas.get(actual.id);
    if (actual && saldo) {
      // No sobrescribir datos mientras el usuario está editando.
      if (document.activeElement !== dom('fc1SaldoInicial')) dom('fc1SaldoInicial').value = saldo.saldoInicial;
      if (document.activeElement !== dom('fc1FechaInicial')) dom('fc1FechaInicial').value = saldo.fechaInicio;
    } else if (document.activeElement !== dom('fc1SaldoInicial')) {
      dom('fc1SaldoInicial').value = '';
    }
    const origen = dom('fc1Origen');
    const destino = dom('fc1Destino');
    const o = origen && origen.value;
    const d = destino && destino.value;
    agregarOpciones(origen, estado.cuentas, o);
    agregarOpciones(destino, estado.cuentas, d);
    if (estado.cuentas.length > 1 && origen && destino && origen.value === destino.value) {
      destino.value = estado.cuentas.find(c => c.id !== origen.value).id;
    }
    dom('fc1Transferir').disabled = estado.cuentas.length < 2;
    dom('fc1InfoCuentas').textContent = estado.cuentas.length < 2
      ? 'Necesitas dos cuentas personales para transferir. Puedes crear otra con el botón + del encabezado.'
      : 'Transferencias entre tus cuentas, sin generar ingresos ni gastos.';
    renderTransferencias();
  }
  function mostrarMensaje(texto, error) {
    const el = dom('fc1Estado');
    if (!el) return;
    el.textContent = texto;
    el.classList.toggle('fc1-error', Boolean(error));
  }
  function renderTransferencias() {
    const lista = dom('fc1ListaTransferencias');
    if (!lista) return;
    lista.replaceChildren();
    const items = [...estado.transferencias].sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || ''))).slice(0, 20);
    if (!items.length) {
      const p = document.createElement('p'); p.className = 'fc1-mutado'; p.textContent = 'Todavía no hay transferencias registradas.'; lista.appendChild(p); return;
    }
    for (const tr of items) {
      const origen = estado.cuentas.find(c => c.id === tr.origenCuentaId);
      const destino = estado.cuentas.find(c => c.id === tr.destinoCuentaId);
      const item = document.createElement('div'); item.className = 'fc1-item';
      const detalle = document.createElement('div');
      const nom = document.createElement('strong');
      nom.textContent = (origen ? origen.nombre : 'Cuenta anterior') + ' → ' + (destino ? destino.nombre : 'Cuenta anterior');
      const nota = document.createElement('small');
      nota.textContent = tr.fecha + ' · ' + (tr.nota ? String(tr.nota).slice(0, 100) : 'Transferencia entre cuentas');
      detalle.append(nom, nota);
      const importe = document.createElement('strong');
      importe.textContent = localStorage.getItem('ocultarMontos') === 'true' ? '$ ••••••' : '$' + formato(tr.monto);
      const borrar = document.createElement('button'); borrar.type = 'button'; borrar.className = 'fc1-borrar';
      borrar.textContent = 'Eliminar'; borrar.dataset.fc1Borrar = tr.id;
      borrar.setAttribute('aria-label', 'Eliminar transferencia del ' + tr.fecha);
      item.append(detalle, importe, borrar); lista.appendChild(item);
    }
  }
  function prepararInterfaz() {
    const destino = dom('av3Panel-finanzas') || dom('vistaAjustes')?.querySelector('.ajustes-panel');
    if (!destino || dom('fc1Panel')) return;
    const seccion = document.createElement('section');
    seccion.id = 'fc1Panel'; seccion.className = 'fc1-panel';
    seccion.innerHTML = `
      <div class="fc1-cabecera"><span class="fc1-chispa">◆ CONCILIACIÓN FINANCIERA · V1</span>
        <h3>Saldo inicial y transferencias</h3>
        <p>El saldo inicial es el dinero que había <strong>al comenzar el día elegido</strong>. No se registra como ingreso. Revisa los movimientos de esa fecha antes de establecerlo.</p></div>
      <div class="fc1-cuadricula">
        <form id="fc1FormSaldo" class="fc1-tarjeta">
          <h4>1. Saldo inicial por cuenta</h4>
          <label for="fc1Cuenta">Cuenta</label><select id="fc1Cuenta" required></select>
          <label for="fc1FechaInicial">Fecha de apertura (inicio del día)</label><input type="date" id="fc1FechaInicial" required>
          <label for="fc1SaldoInicial">Saldo disponible al comenzar ese día (COP)</label><input id="fc1SaldoInicial" type="number" step="0.01" inputmode="decimal" placeholder="Ej. 500000" required>
          <div class="fc1-botones"><button type="submit" class="fc1-primario">Guardar saldo inicial</button><button id="fc1Quitar" type="button" class="fc1-secundario">Quitar</button></div>
          <p class="fc1-mutado">No inventes una cifra para eliminar el negativo. Si desconoces el saldo inicial, déjalo sin configurar y revisa los ingresos faltantes.</p>
        </form>
        <form id="fc1FormTransferencia" class="fc1-tarjeta">
          <h4>2. Transferencia entre cuentas</h4>
          <label for="fc1Origen">Desde</label><select id="fc1Origen" required></select>
          <label for="fc1Destino">Hacia</label><select id="fc1Destino" required></select>
          <label for="fc1Monto">Importe (COP)</label><input id="fc1Monto" type="number" step="0.01" min="0.01" placeholder="Ej. 100000" required>
          <label for="fc1FechaTrans">Fecha en que ocurrió</label><input id="fc1FechaTrans" type="date" required>
          <label for="fc1NotaTrans">Nota (opcional)</label><input id="fc1NotaTrans" maxlength="120" placeholder="Ej. Transferencia a ahorros">
          <button id="fc1Transferir" type="submit" class="fc1-primario">Guardar transferencia</button>
          <p class="fc1-mutado" id="fc1InfoCuentas"></p>
        </form>
      </div>
      <div class="fc1-tarjeta"><h4>3. Auditar ingresos por mes</h4>
        <p class="fc1-mutado">Compara cuántos ingresos y gastos quedaron registrados en el año seleccionado. Esta revisión no modifica datos.</p>
        <div class="fc1-filtros"><label for="fc1Anio">Año</label><input id="fc1Anio" type="number" min="2000" max="2100" step="1">
        <button id="fc1Auditar" type="button" class="fc1-secundario">Revisar ingresos</button></div>
        <div class="fc1-tabla-wrap" id="fc1Auditoria"></div>
      </div>
      <div class="fc1-tarjeta"><h4>Últimas transferencias</h4><div id="fc1ListaTransferencias"></div></div>
      <p class="fc1-estado" id="fc1Estado" role="status" aria-live="polite"></p>
      <p class="fc1-mutado">Las salidas antiguas clasificadas como “Ahorro de emergencia” seguirán siendo gastos hasta que las revises individualmente. Esta herramienta no las convierte automáticamente.</p>`;
    destino.appendChild(seccion);
    dom('fc1FechaInicial').value = new Date().getFullYear() + '-01-01';
    dom('fc1FechaTrans').value = hoy();
    dom('fc1Anio').value = new Date().getFullYear();

    dom('fc1Cuenta').addEventListener('change', () => {
      const a = estado.aperturas.get(dom('fc1Cuenta').value);
      dom('fc1SaldoInicial').value = a ? a.saldoInicial : '';
      dom('fc1FechaInicial').value = a ? a.fechaInicio : new Date().getFullYear() + '-01-01';
    });
    dom('fc1FormSaldo').addEventListener('submit', guardarSaldoInicial);
    dom('fc1Quitar').addEventListener('click', quitarSaldoInicial);
    dom('fc1FormTransferencia').addEventListener('submit', guardarTransferencia);
    dom('fc1ListaTransferencias').addEventListener('click', borrarTransferencia);
    dom('fc1Auditar').addEventListener('click', auditarIngresos);
    const togglePrivacidad = dom('togglePrivacidadAjustes');
    if (togglePrivacidad) togglePrivacidad.addEventListener('change', renderTransferencias);
    const btnPrivacidad = dom('btnTogglePrivacidad');
    if (btnPrivacidad) btnPrivacidad.addEventListener('click', () => window.setTimeout(renderTransferencias, 0));
    actualizarInterfaz();
  }
  function validarSesionYCuenta(id) {
    if (!perfilPersonal() || !estado.uid || estado.uid !== uidActual()) throw new Error('Debes estar en tu perfil Personal.');
    if (!estado.cuentasListas || !cuentaDisponible(id)) throw new Error('La cuenta seleccionada no existe o aún no ha cargado.');
  }
  async function guardarSaldoInicial(e) {
    e.preventDefault();
    const boton = e.submitter || dom('fc1FormSaldo').querySelector('[type=submit]');
    const cuenta = dom('fc1Cuenta').value;
    const saldo = numeroEntrada(dom('fc1SaldoInicial').value);
    const fechaInicio = dom('fc1FechaInicial').value;
    try {
      validarSesionYCuenta(cuenta);
      if (!montoValido(saldo, true)) throw new Error('Escribe un saldo inicial válido.');
      if (!fechaValida(fechaInicio) || fechaInicio > hoy()) throw new Error('Selecciona una fecha de apertura válida, no futura.');
      if (!window.confirm('¿Confirmas que $' + formato(saldo) + ' era tu saldo AL COMENZAR el ' + fechaInicio + '? No se añadirá como ingreso.')) return;
      boton.disabled = true;
      await refUsuario().collection('saldos_iniciales').doc(cuenta).set({
        saldoInicial: redondear(saldo), fechaInicio,
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      mostrarMensaje('Saldo inicial guardado. Se recalculará el acumulado sin cambiar movimientos.', false);
    } catch (error) { mostrarMensaje(error.message || 'No se pudo guardar el saldo inicial.', true); }
    finally { boton.disabled = false; }
  }
  async function quitarSaldoInicial() {
    const cuenta = dom('fc1Cuenta').value;
    try {
      validarSesionYCuenta(cuenta);
      if (!window.confirm('¿Quitar el saldo inicial de esta cuenta? Los movimientos no se borrarán.')) return;
      dom('fc1Quitar').disabled = true;
      await refUsuario().collection('saldos_iniciales').doc(cuenta).delete();
      mostrarMensaje('Saldo inicial quitado. Se mostrará el saldo calculado desde los movimientos.', false);
    } catch (error) { mostrarMensaje(error.message || 'No se pudo quitar el saldo inicial.', true); }
    finally { dom('fc1Quitar').disabled = false; }
  }
  async function guardarTransferencia(e) {
    e.preventDefault();
    const boton = dom('fc1Transferir');
    const origenCuentaId = dom('fc1Origen').value;
    const destinoCuentaId = dom('fc1Destino').value;
    const monto = numeroEntrada(dom('fc1Monto').value);
    const fecha = dom('fc1FechaTrans').value;
    const nota = dom('fc1NotaTrans').value.trim();
    try {
      validarSesionYCuenta(origenCuentaId);
      if (!cuentaDisponible(destinoCuentaId) || origenCuentaId === destinoCuentaId) throw new Error('Selecciona dos cuentas distintas.');
      if (!montoValido(monto, false)) throw new Error('El importe debe ser mayor que cero.');
      if (!fechaValida(fecha) || fecha > hoy()) throw new Error('Escribe la fecha real de la transferencia; no puede ser futura.');
      if (!window.confirm('¿Registrar transferencia de $' + formato(monto) + ' sin generar un ingreso ni un gasto?')) return;
      boton.disabled = true;
      await refUsuario().collection('transferencias_cuentas').add({
        tipo: 'transferencia_entre_cuentas', origenCuentaId, destinoCuentaId,
        monto: redondear(monto), fecha, nota, creadoPor: estado.uid,
        creadoEn: firebase.firestore.FieldValue.serverTimestamp()
      });
      dom('fc1Monto').value = ''; dom('fc1NotaTrans').value = '';
      mostrarMensaje('Transferencia registrada. No se añadió a ingresos ni gastos.', false);
    } catch (error) { mostrarMensaje(error.message || 'No se pudo guardar la transferencia.', true); }
    finally { boton.disabled = estado.cuentas.length < 2; }
  }
  async function borrarTransferencia(e) {
    const boton = e.target.closest('[data-fc1-borrar]');
    if (!boton) return;
    const id = boton.dataset.fc1Borrar;
    if (!estado.transferencias.some(t => t.id === id)) return;
    if (!window.confirm('¿Eliminar esta transferencia? Solo cambia el saldo calculado, no los movimientos financieros.')) return;
    try {
      if (!perfilPersonal() || estado.uid !== uidActual()) throw new Error('Sesión diferente: vuelve a iniciar sesión.');
      boton.disabled = true;
      await refUsuario().collection('transferencias_cuentas').doc(id).delete();
      mostrarMensaje('Transferencia eliminada.', false);
    } catch (error) { mostrarMensaje(error.message || 'No se pudo eliminar.', true); boton.disabled = false; }
  }
  async function auditarIngresos() {
    const btn = dom('fc1Auditar');
    const cuentaId = dom('fc1Cuenta').value;
    const anio = Number(dom('fc1Anio').value);
    const salida = dom('fc1Auditoria');
    try {
      validarSesionYCuenta(cuentaId);
      if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) throw new Error('Selecciona un año válido.');
      btn.disabled = true;
      salida.textContent = 'Consultando movimientos de esta cuenta…';
      const q = await refUsuario().collection('transacciones').where('espacioId', '==', cuentaId).limit(5000).get();
      const meses = Array.from({ length: 12 }, (_, i) => ({ mes: String(i + 1).padStart(2, '0'), nIngresos: 0, ingresos: 0, nGastos: 0, gastos: 0 }));
      q.forEach(doc => {
        const d = doc.data();
        if (!fechaValida(d.fecha) || !d.fecha.startsWith(String(anio) + '-')) return;
        const fila = meses[Number(d.fecha.slice(5, 7)) - 1];
        const m = Number(d.monto);
        if (!fila || !Number.isFinite(m)) return;
        if (d.tipo === 'ingreso') { fila.nIngresos++; fila.ingresos += m; }
        if (d.tipo === 'gasto') { fila.nGastos++; fila.gastos += m; }
      });
      const tabla = document.createElement('table');
      const cabeza = tabla.createTHead().insertRow();
      for (const s of ['Mes', 'Ingresos', 'Importe ingresos', 'Gastos', 'Importe gastos']) {
        const th = document.createElement('th'); th.textContent = s; cabeza.appendChild(th);
      }
      const cuerpo = tabla.createTBody();
      meses.forEach(f => {
        const tr = cuerpo.insertRow();
        for (const v of [f.mes, f.nIngresos, '$' + formato(f.ingresos), f.nGastos, '$' + formato(f.gastos)]) {
          const td = tr.insertCell(); td.textContent = v;
        }
        if (f.nIngresos === 0 && f.nGastos > 0) tr.className = 'fc1-fila-advertencia';
      });
      salida.replaceChildren(tabla);
      if (q.size === 5000) mostrarMensaje('Se alcanzó el límite de 5.000 registros. Esta auditoría podría estar incompleta; no se cambió ningún dato.', true);
      else mostrarMensaje('Auditoría completada. Un mes sin ingresos no demuestra un error: compara con tus extractos.', false);
    } catch (err) {
      salida.textContent = '';
      mostrarMensaje('No fue posible auditar ingresos: ' + (err.message || err), true);
    } finally { btn.disabled = false; }
  }
  function iniciar() {
    prepararInterfaz();
    if (!App.auth || typeof App.auth.onAuthStateChanged !== 'function') {
      mostrarMensaje('No se encontró Firebase Authentication.', true); return;
    }
    App.auth.onAuthStateChanged(cargarDatosUsuario);
    window.addEventListener('storage', e => {
      if (e.key === 'perfilActivo') actualizarInterfaz();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
