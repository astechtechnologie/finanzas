/* Finora — División de gastos y balance entre dos integrantes (V1)
 * Módulo independiente del perfil Personal.
 * Los gastos divididos se guardan UNA sola vez en espacios/{id}/transacciones.
 * Los abonos se guardan APARTE en espacios/{id}/liquidaciones.
 * Requiere la regla adicional de Firestore incluida en el paquete.
 */
(function () {
  'use strict';
  const App = window.App;
  if (!App || !App.db || !App.auth) return;

  const MAX_MONTO = 1000000000;
  const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

  function centavos(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero > 0 && numero <= MAX_MONTO
      ? Math.round(numero * 100) : 0;
  }
  function fechaValida(fecha) {
    if (typeof fecha !== 'string' || !FECHA_RE.test(fecha)) return false;
    const fechaDate = new Date(fecha + 'T12:00:00');
    return !Number.isNaN(fechaDate.getTime()) &&
      fechaDate.getFullYear() === Number(fecha.slice(0, 4)) &&
      fechaDate.getMonth() + 1 === Number(fecha.slice(5, 7)) &&
      fechaDate.getDate() === Number(fecha.slice(8, 10));
  }
  function repartoValido(division, miembros) {
    if (!division || !Array.isArray(miembros) || miembros.length !== 2) return false;
    const [a, b] = miembros;
    if (a === b || !miembros.includes(division.pagadoPor) || !division.porcentajes) return false;
    const porcentajes = division.porcentajes;
    const pa = porcentajes[a], pb = porcentajes[b];
    return typeof pa === 'number' && typeof pb === 'number' &&
      Number.isFinite(pa) && Number.isFinite(pb) && pa >= 0 && pb >= 0 &&
      pa <= 100 && pb <= 100 && Math.abs(pa + pb - 100) < 0.000001;
  }
  function construirReparto(miembros, pagadoPor, porcentajeA, uid) {
    if (!Array.isArray(miembros) || miembros.length !== 2 || miembros[0] === miembros[1]) {
      throw new Error('Se requieren exactamente dos integrantes.');
    }
    const p = Number(porcentajeA);
    if (!miembros.includes(pagadoPor) || !Number.isFinite(p) || p < 0 || p > 100) {
      throw new Error('La distribución o el pagador no es válido.');
    }
    const porcentajes = {};
    porcentajes[miembros[0]] = p;
    porcentajes[miembros[1]] = 100 - p;
    return { version: 1, pagadoPor, porcentajes, actualizadoPor: uid };
  }
  function calcularBalance(transacciones, liquidaciones, miembros) {
    if (!Array.isArray(miembros) || miembros.length !== 2 || miembros[0] === miembros[1]) {
      return { disponible: false, netos: {}, deudor: null, acreedor: null, deuda: 0,
        totalDividido: 0, cantidadDivididos: 0, sinDividir: 0, abonos: 0, cantidadAbonos: 0 };
    }
    const [a, b] = miembros;
    const netos = { [a]: 0, [b]: 0 }; // centavos: positivo = tiene dinero a favor
    let totalDividido = 0, cantidadDivididos = 0, sinDividir = 0;
    for (const gasto of (transacciones || [])) {
      if (!gasto || gasto.tipo !== 'gasto') continue;
      const importe = centavos(gasto.monto);
      if (!importe) continue;
      if (!repartoValido(gasto.division, miembros)) { sinDividir++; continue; }
      const pa = gasto.division.porcentajes[a];
      const parteA = Math.round(importe * pa / 100);
      const parteB = importe - parteA; // ajuste exacto de centavos
      netos[a] -= parteA;
      netos[b] -= parteB;
      netos[gasto.division.pagadoPor] += importe;
      totalDividido += importe;
      cantidadDivididos++;
    }
    let abonos = 0, cantidadAbonos = 0;
    for (const ajuste of (liquidaciones || [])) {
      if (!ajuste || ajuste.tipo !== 'ajuste_entre_integrantes') continue;
      if (!miembros.includes(ajuste.pagador) || !miembros.includes(ajuste.receptor) || ajuste.pagador === ajuste.receptor) continue;
      const importe = centavos(ajuste.monto);
      if (!importe) continue;
      // El deudor que paga recupera parte de su saldo negativo.
      netos[ajuste.pagador] += importe;
      netos[ajuste.receptor] -= importe;
      abonos += importe;
      cantidadAbonos++;
    }
    // Por construcción, netos[a] + netos[b] = 0.
    const saldoA = netos[a];
    const deudaCentavos = Math.abs(saldoA);
    return {
      disponible: true,
      netos: { [a]: netos[a] / 100, [b]: netos[b] / 100 },
      deudor: saldoA < 0 ? a : saldoA > 0 ? b : null,
      acreedor: saldoA > 0 ? a : saldoA < 0 ? b : null,
      deuda: deudaCentavos / 100,
      totalDividido: totalDividido / 100,
      cantidadDivididos, sinDividir,
      abonos: abonos / 100, cantidadAbonos
    };
  }

  // Funciones puras disponibles para testear sin Firebase.
  window.FinoraDivision = { calcularBalance, construirReparto, repartoValido, fechaValida };

  document.addEventListener('DOMContentLoaded', function () {
    const panel = document.getElementById('panelFinancieroCompartido');
    if (!panel) return;
    const raiz = document.createElement('section');
    raiz.className = 'fd-root';
    raiz.id = 'finoraDivision';
    raiz.hidden = true;
    // Esta plantilla es estática: no se inserta texto de Firebase mediante innerHTML.
    raiz.innerHTML = `
      <div class="fd-head">
        <div><span class="fd-eyebrow">FINANZAS EN PAREJA</span>
          <h3>División de gastos</h3>
          <p>Reparte gastos y consulta el saldo acumulado entre integrantes.</p></div>
        <button type="button" class="fd-btn fd-btn-gold" id="fdCrear"><span aria-hidden="true">＋</span> Gasto dividido</button>
      </div>
      <div id="fdEstado" class="fd-estado" role="status" aria-live="polite">Comprobando integrantes…</div>
      <div id="fdContenido" hidden>
        <div class="fd-grid">
          <article class="fd-card fd-balance"><p class="fd-card-label">Balance entre integrantes · Acumulado</p>
            <h4 id="fdQuienDebe">Sin saldos pendientes</h4>
            <strong id="fdDeuda" class="fd-cantidad">$0</strong>
            <p id="fdBalanceDescripcion" class="fd-ayuda">Incluye todos los gastos divididos y abonos registrados, sin importar el mes.</p>
            <button type="button" id="fdAbonar" class="fd-btn fd-btn-outline">Registrar un abono</button></article>
          <article class="fd-card"><p class="fd-card-label">Distribución acumulada</p>
            <div id="fdIntegrantes" class="fd-dos-personas"></div>
            <div class="fd-metricas"><span id="fdCantidadDivididos">0 gastos divididos</span><span id="fdTotalDividido">$0</span></div>
            <p class="fd-ayuda">Un gasto dividido se contabiliza una sola vez en Finora. Los abonos no cuentan como ingresos ni gastos.</p></article>
        </div>
        <article class="fd-card"><div class="fd-titulo-fila"><div><h4>Gastos compartidos</h4><p>También puedes dividir gastos que ya registraste.</p></div><span id="fdPendientes" class="fd-pill">0 por dividir</span></div>
          <div id="fdListaGastos" class="fd-lista"></div></article>
        <article class="fd-card"><div class="fd-titulo-fila"><div><h4>Abonos registrados</h4><p>Pagos entre integrantes. No modifican el balance general del hogar.</p></div></div>
          <div id="fdListaAbonos" class="fd-lista"></div></article>
      </div>
      <div class="fd-overlay" id="fdModal" hidden role="dialog" aria-modal="true" aria-labelledby="fdModalTitulo">
        <div class="fd-dialog">
          <div class="fd-dialog-head"><h3 id="fdModalTitulo">Registrar gasto dividido</h3>
            <button type="button" class="fd-cerrar" id="fdCerrar" aria-label="Cerrar">×</button></div>
          <form id="fdFormulario">
            <div id="fdNuevoCampos">
              <label class="fd-campo">Monto del gasto (COP)<input id="fdMonto" type="number" min="0.01" max="1000000000" step="0.01" inputmode="decimal" required></label>
              <label class="fd-campo">Categoría<select id="fdCategoria" required></select></label>
              <label class="fd-campo">Fecha<input id="fdFecha" type="date" required></label>
              <label class="fd-campo">Descripción (opcional)<input id="fdDescripcion" type="text" maxlength="150" placeholder="Ej. Mercado de la semana"></label>
            </div>
            <div id="fdEditarResumen" class="fd-edicionsummary" hidden></div>
            <label class="fd-campo">¿Quién pagó el gasto?<select id="fdPagador" required></select></label>
            <div class="fd-reparto">
              <div class="fd-titulo-fila"><strong>¿Cómo se divide?</strong><button type="button" id="fdMitad" class="fd-enlace">50 / 50</button></div>
              <label class="fd-campo" id="fdEtiquetaPorcentaje">Porcentaje del primer integrante
                <input id="fdPorcentaje" type="range" min="0" max="100" step="1" value="50"></label>
              <div id="fdPorcentajes" class="fd-partes"></div>
              <p class="fd-ayuda">La división se calcula sobre el monto completo. Puedes ajustarla después.</p>
            </div>
            <div id="fdErrorFormulario" class="fd-error" role="alert" hidden></div>
            <div class="fd-acciones"><button type="button" id="fdCancelar" class="fd-btn fd-btn-outline">Cancelar</button>
              <button type="submit" id="fdGuardar" class="fd-btn fd-btn-gold">Guardar gasto</button></div>
          </form>
        </div>
      </div>
      <div class="fd-overlay" id="fdModalAbono" hidden role="dialog" aria-modal="true" aria-labelledby="fdModalAbonoTitulo">
        <div class="fd-dialog"><div class="fd-dialog-head"><h3 id="fdModalAbonoTitulo">Registrar abono</h3>
          <button type="button" id="fdCerrarAbono" class="fd-cerrar" aria-label="Cerrar">×</button></div>
          <form id="fdFormularioAbono">
            <p id="fdResumenAbono" class="fd-ayuda"></p>
            <label class="fd-campo">Monto abonado (COP)<input id="fdMontoAbono" type="number" min="0.01" max="1000000000" step="0.01" required></label>
            <label class="fd-campo">Fecha del abono<input id="fdFechaAbono" type="date" required></label>
            <div id="fdErrorAbono" class="fd-error" role="alert" hidden></div>
            <div class="fd-acciones"><button type="button" id="fdCancelarAbono" class="fd-btn fd-btn-outline">Cancelar</button>
              <button type="submit" id="fdGuardarAbono" class="fd-btn fd-btn-gold">Registrar abono</button></div>
            <p class="fd-ayuda">Registro informativo: Finora no realiza ni comprueba transferencias bancarias.</p>
          </form></div>
      </div>
    `;
    panel.appendChild(raiz);
    const $ = selector => raiz.querySelector(selector);
    const caja = (tag, clase, texto) => {
      const el = document.createElement(tag);
      if (clase) el.className = clase;
      if (texto !== undefined) el.textContent = String(texto);
      return el;
    };
    const limpiar = el => { while (el.firstChild) el.removeChild(el.firstChild); };
    const hoy = () => {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };
    const formato = n => typeof App.formatearMonto === 'function'
      ? App.formatearMonto(n) : Number(n).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const ocultarMontos = () => localStorage.getItem('ocultarMontos') === 'true';
    const moneda = n => ocultarMontos() ? '$ ******' : '$' + formato(Number(n) || 0);
    const nombre = uid => uid === estado.uid ? 'Tú' : 'Integrante ' + (estado.miembros.indexOf(uid) + 1);
    const db = App.db;
    const estado = { uid: null, espacio: null, miembros: [], transacciones: [], abonos: [], categorias: [],
      ready: { gastos: false, abonos: false }, stop: [], gen: 0, editId: null, busy: false, foco: null };

    function ponerEstado(mensaje, error) {
      $('#fdEstado').textContent = mensaje;
      $('#fdEstado').classList.toggle('fd-error', Boolean(error));
      $('#fdEstado').hidden = !mensaje;
      $('#fdContenido').hidden = Boolean(mensaje);
    }
    function comprobarSesion() {
      const usuario = App.auth.currentUser;
      const espacio = localStorage.getItem('espacioActivoId');
      if (!usuario || !espacio || localStorage.getItem('perfilActivo') !== 'espacio' ||
          estado.uid !== usuario.uid || estado.espacio !== espacio || estado.miembros.length !== 2 ||
          !estado.miembros.includes(usuario.uid)) {
        throw new Error('Selecciona tu espacio compartido y comprueba que tenga dos integrantes.');
      }
    }
    function ruta(nombreColeccion) { return db.collection('espacios').doc(estado.espacio).collection(nombreColeccion); }
    function cerrarModal(id) {
      $(id).hidden = true;
      document.body.classList.remove('fd-dialog-abierto');
      if (estado.foco && typeof estado.foco.focus === 'function') estado.foco.focus();
    }
    function abrirModal(id, foco) {
      estado.foco = document.activeElement;
      $(id).hidden = false;
      document.body.classList.add('fd-dialog-abierto');
      setTimeout(() => $(foco)?.focus(), 0);
    }
    function errorFormulario(selector, mensaje) {
      const el = $(selector);
      el.hidden = !mensaje;
      el.textContent = mensaje || '';
    }
    function llenarIntegrantes() {
      const select = $('#fdPagador');
      limpiar(select);
      estado.miembros.forEach(uid => {
        const opt = document.createElement('option');
        opt.value = uid;
        opt.textContent = nombre(uid);
        select.appendChild(opt);
      });
      select.value = estado.uid;
      $('#fdEtiquetaPorcentaje').firstChild.textContent = 'Porcentaje de ' + nombre(estado.miembros[0]);
    }
    function llenarCategorias() {
      const select = $('#fdCategoria');
      const anterior = select.value;
      limpiar(select);
      const nombres = Array.from(new Set(estado.categorias.filter(c => c && c.tipo !== 'ingreso')
        .map(c => String(c.nombre || '').trim()).filter(Boolean)));
      if (!nombres.length) {
        select.appendChild(new Option('Crea primero una categoría de gasto', ''));
      } else {
        select.appendChild(new Option('Selecciona una categoría', ''));
        nombres.sort((a,b) => a.localeCompare(b, 'es')).forEach(n => select.appendChild(new Option(n.charAt(0).toUpperCase()+n.slice(1),n)));
      }
      if (nombres.includes(anterior)) select.value = anterior;
    }
    function pintarPartes() {
      const a = estado.miembros[0], b = estado.miembros[1];
      if (!a || !b) return;
      const pa = Number($('#fdPorcentaje').value), pb = 100 - pa;
      const total = estado.editId
        ? (estado.transacciones.find(t => t.id === estado.editId)?.monto || 0)
        : Number($('#fdMonto').value || 0);
      const cent = centavos(total);
      const impA = Math.round(cent * pa / 100) / 100;
      const impB = (cent - Math.round(cent * pa / 100)) / 100;
      const cont = $('#fdPorcentajes');
      limpiar(cont);
      [[a, pa, impA],[b,pb,impB]].forEach(([id,pct,imp]) => {
        const item = caja('div','fd-parte');
        item.append(caja('strong','',nombre(id)),caja('span','',pct + ' %'),caja('b','',moneda(imp)));
        cont.appendChild(item);
      });
    }
    function pintarBalance() {
      if (!estado.ready.gastos || !estado.ready.abonos) return;
      const r = calcularBalance(estado.transacciones, estado.abonos, estado.miembros);
      if (!r.disponible) return;
      $('#fdQuienDebe').textContent = r.deudor
        ? (r.deudor === estado.uid ? 'Le debes a ' + nombre(r.acreedor) : nombre(r.deudor) + ' te debe')
        : 'Están al día';
      $('#fdDeuda').textContent = moneda(r.deuda);
      $('#fdDeuda').classList.toggle('fd-deuda-positiva', Boolean(r.deudor && r.deudor !== estado.uid));
      $('#fdBalanceDescripcion').textContent = r.deudor
        ? 'Saldo pendiente después de los abonos registrados. Este balance reúne todos los gastos divididos del historial.'
        : 'No hay saldos pendientes por los gastos divididos registrados.';
      $('#fdCantidadDivididos').textContent = r.cantidadDivididos + (r.cantidadDivididos === 1 ? ' gasto dividido' : ' gastos divididos');
      $('#fdTotalDividido').textContent = moneda(r.totalDividido);
      $('#fdPendientes').textContent = r.sinDividir + ' por dividir';
      const lista = $('#fdIntegrantes');
      limpiar(lista);
      estado.miembros.forEach(uid => {
        const fila = caja('div','fd-miembro');
        fila.append(caja('span','',nombre(uid)),caja('strong','',moneda(r.netos[uid])));
        lista.appendChild(fila);
      });
      $('#fdAbonar').disabled = !r.deudor || r.deudor !== estado.uid;
      $('#fdAbonar').title = (!r.deudor || r.deudor !== estado.uid)
        ? 'Solo quien debe dinero puede registrar su propio abono.' : '';
      const gastos = estado.transacciones.filter(t => t && t.tipo === 'gasto' && centavos(t.monto) > 0)
        .slice().sort((a,b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0,12);
      const cajaGastos = $('#fdListaGastos');
      limpiar(cajaGastos);
      if (!gastos.length) cajaGastos.appendChild(caja('p','fd-vacio','Todavía no hay gastos compartidos.'));
      gastos.forEach(t => {
        const fila = caja('div','fd-fila');
        const info = caja('div','fd-info');
        info.append(caja('strong','',String(t.categoria || 'Sin categoría')),
          caja('small','',String(t.descripcion || 'Sin descripción') + ' · ' + String(t.fecha || 'Sin fecha')));
        const valido = repartoValido(t.division,estado.miembros);
        info.appendChild(caja('span',valido ? 'fd-etiqueta fd-ok' : 'fd-etiqueta',valido ? 'Dividido' : 'Sin dividir'));
        const acciones = caja('div','fd-fila-acciones');
        acciones.appendChild(caja('b','',moneda(t.monto)));
        const boton = caja('button','fd-btn fd-btn-mini',valido ? 'Editar división' : 'Dividir');
        boton.type = 'button'; boton.dataset.accion = 'dividir'; boton.dataset.id = t.id;
        acciones.appendChild(boton);
        fila.append(info,acciones);
        cajaGastos.appendChild(fila);
      });
      const cajaAbonos = $('#fdListaAbonos');
      limpiar(cajaAbonos);
      const abonos = estado.abonos.filter(p => p && p.tipo === 'ajuste_entre_integrantes' &&
        estado.miembros.includes(p.pagador) && estado.miembros.includes(p.receptor))
        .slice().sort((a,b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0,10);
      if (!abonos.length) cajaAbonos.appendChild(caja('p','fd-vacio','Aún no se han registrado abonos.'));
      abonos.forEach(p => {
        const fila = caja('div','fd-fila');
        const info = caja('div','fd-info');
        info.append(caja('strong','',nombre(p.pagador) + ' → ' + nombre(p.receptor)),
          caja('small','',String(p.fecha || 'Sin fecha')));
        const acciones = caja('div','fd-fila-acciones');
        acciones.appendChild(caja('b','',moneda(p.monto)));
        if (p.creadoPor === estado.uid) {
          const btn = caja('button','fd-btn fd-btn-mini fd-btn-rojo','Eliminar');
          btn.type = 'button'; btn.dataset.accion = 'eliminarAbono'; btn.dataset.id = p.id;
          acciones.appendChild(btn);
        }
        fila.append(info,acciones); cajaAbonos.appendChild(fila);
      });
      ponerEstado('',false);
    }
    function liberar() {
      estado.gen++;
      estado.stop.forEach(s => { try { s(); } catch (e) { /* noop */ } });
      estado.stop = [];
      estado.espacio = null; estado.uid = null; estado.miembros = [];
      estado.transacciones = []; estado.abonos = []; estado.categorias = [];
      estado.ready = { gastos: false, abonos: false };
      raiz.hidden = true;
      $('#fdModal').hidden = true;
      $('#fdModalAbono').hidden = true;
      document.body.classList.remove('fd-dialog-abierto');
    }
    function suspenderAcceso(mensaje, error) {
      estado.stop.slice(1).forEach(s => { try { s(); } catch(e) {} });
      estado.stop.length = Math.min(estado.stop.length,1);
      estado.miembros = [];
      estado.transacciones = [];
      estado.abonos = [];
      estado.ready = { gastos: false, abonos: false };
      $('#fdModal').hidden = true;
      $('#fdModalAbono').hidden = true;
      document.body.classList.remove('fd-dialog-abierto');
      ponerEstado(mensaje,error);
    }
    function activar(user) {
      liberar();
      const espacio = localStorage.getItem('espacioActivoId');
      if (!user || !espacio || localStorage.getItem('perfilActivo') !== 'espacio') return;
      estado.uid = user.uid;
      estado.espacio = espacio;
      raiz.hidden = false;
      const gen = estado.gen;
      ponerEstado('Verificando acceso al espacio compartido…', false);
      const ref = db.collection('espacios').doc(espacio);
      estado.stop.push(ref.onSnapshot(snapshot => {
        if (gen !== estado.gen) return;
        if (!snapshot.exists) { suspenderAcceso('Este espacio ya no existe.', true); return; }
        const datos = snapshot.data() || {};
        const miembros = Array.isArray(datos.miembros) ? datos.miembros.filter(x => typeof x === 'string' && x) : [];
        if (!miembros.includes(estado.uid)) { suspenderAcceso('No perteneces a este espacio.', true); return; }
        if (miembros.length !== 2 || miembros[0] === miembros[1]) {
          suspenderAcceso('La división requiere exactamente dos integrantes. Invita a tu pareja o revisa los miembros del espacio.', false);
          return;
        }
        if (estado.miembros.join('|') !== miembros.join('|')) {
          estado.stop.slice(1).forEach(s => { try { s(); } catch (e) {} });
          estado.stop.length = 1;
          estado.miembros = miembros;
          estado.ready = { gastos: false, abonos: false };
          estado.transacciones = []; estado.abonos = [];
          $('#fdContenido').hidden = true;
          llenarIntegrantes();
          estado.stop.push(ruta('transacciones').onSnapshot(snap => {
            if (gen !== estado.gen) return;
            estado.transacciones = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
            estado.ready.gastos = true;
            pintarBalance();
          }, error => { console.error('Finora division: transacciones',error); ponerEstado('No pudimos cargar los gastos compartidos.', true); }));
          estado.stop.push(ruta('liquidaciones').onSnapshot(snap => {
            if (gen !== estado.gen) return;
            estado.abonos = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
            estado.ready.abonos = true;
            pintarBalance();
          }, error => { console.error('Finora division: liquidaciones',error); ponerEstado('Faltan permisos para consultar abonos. Publica las reglas incluidas en el paquete.', true); }));
          estado.stop.push(ruta('categorias').onSnapshot(snap => {
            if (gen !== estado.gen) return;
            estado.categorias = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
            llenarCategorias();
          }, error => console.warn('No se pudieron cargar categorías compartidas', error)));
        }
        if (!estado.ready.gastos || !estado.ready.abonos) ponerEstado('Calculando los saldos de la pareja…', false);
        else pintarBalance();
      }, error => { console.error('Finora division: espacio',error); ponerEstado('Error verificando integrantes del espacio.', true); }));
    }

    function abrirFormularioGasto(id) {
      try { comprobarSesion(); } catch (e) { alert(e.message); return; }
      estado.editId = id || null;
      errorFormulario('#fdErrorFormulario','');
      $('#fdFormulario').reset();
      $('#fdPorcentaje').value = '50';
      $('#fdPagador').value = estado.uid;
      $('#fdFecha').value = hoy();
      const antiguo = id && estado.transacciones.find(t => t.id === id);
      if (id && (!antiguo || antiguo.tipo !== 'gasto')) return;
      $('#fdNuevoCampos').hidden = Boolean(id);
      $('#fdMonto').required = !id;
      $('#fdCategoria').required = !id;
      $('#fdFecha').required = !id;
      $('#fdEditarResumen').hidden = !id;
      $('#fdModalTitulo').textContent = id ? 'Editar división del gasto' : 'Registrar gasto dividido';
      $('#fdGuardar').textContent = id ? 'Guardar división' : 'Guardar gasto';
      if (id) {
        $('#fdEditarResumen').textContent = String(antiguo.categoria || 'Gasto') + ' · ' + moneda(antiguo.monto) + ' · ' + String(antiguo.fecha || '');
        if (repartoValido(antiguo.division,estado.miembros)) {
          $('#fdPagador').value = antiguo.division.pagadoPor;
          $('#fdPorcentaje').value = String(antiguo.division.porcentajes[estado.miembros[0]]);
        }
      }
      pintarPartes();
      abrirModal('#fdModal', '#fdPagador');
    }

    async function guardarGasto(ev) {
      ev.preventDefault();
      if (estado.busy) return;
      estado.busy = true;
      $('#fdGuardar').disabled = true;
      errorFormulario('#fdErrorFormulario','');
      try {
        comprobarSesion();
        const id = estado.editId;
        const reparto = construirReparto(estado.miembros, $('#fdPagador').value, Number($('#fdPorcentaje').value), estado.uid);
        reparto.actualizadoEn = firebase.firestore.FieldValue.serverTimestamp();
        const coleccion = ruta('transacciones');
        if (id) {
          const docRef = coleccion.doc(id);
          await db.runTransaction(async tx => {
            const snap = await tx.get(docRef);
            if (!snap.exists || snap.data().tipo !== 'gasto') throw new Error('El gasto ya no existe o dejó de ser un gasto.');
            tx.update(docRef, { division: reparto });
          });
        } else {
          const monto = Number($('#fdMonto').value);
          const categoria = $('#fdCategoria').value;
          const fecha = $('#fdFecha').value;
          const descripcion = $('#fdDescripcion').value.trim();
          if (!centavos(monto)) throw new Error('Ingresa un monto mayor a cero y no superior a $1.000.000.000.');
          if (!categoria) throw new Error('Selecciona una categoría de gasto compartida.');
          if (!fechaValida(fecha)) throw new Error('Selecciona una fecha válida.');
          if (descripcion.length > 150) throw new Error('La descripción es demasiado larga.');
          await coleccion.add({
            tipo: 'gasto', categoria, subcategoria: null,
            descripcion: descripcion || 'Sin descripción', monto,
            fecha, metodoPago: null, espacioId: 'compartido',
            creadoPor: estado.uid, division: reparto
          });
        }
        cerrarModal('#fdModal');
      } catch (error) {
        console.error('Finora: guardar gasto dividido', error);
        errorFormulario('#fdErrorFormulario',error.message || 'No se pudo guardar. Revisa la conexión y los permisos.');
      } finally { estado.busy = false; $('#fdGuardar').disabled = false; }
    }

    function abrirAbono() {
      try { comprobarSesion(); } catch(e) { alert(e.message); return; }
      const r = calcularBalance(estado.transacciones, estado.abonos, estado.miembros);
      if (!r.deudor || r.deudor !== estado.uid) {
        alert('Solo quien debe dinero puede registrar el abono en su cuenta.'); return;
      }
      errorFormulario('#fdErrorAbono','');
      $('#fdFormularioAbono').reset();
      $('#fdMontoAbono').value = r.deuda.toFixed(2);
      $('#fdFechaAbono').value = hoy();
      $('#fdResumenAbono').textContent = 'Le pagarás a ' + nombre(r.acreedor) + '. Saldo pendiente: ' + moneda(r.deuda);
      abrirModal('#fdModalAbono','#fdMontoAbono');
    }

    async function guardarAbono(ev) {
      ev.preventDefault();
      if (estado.busy) return;
      estado.busy = true;
      $('#fdGuardarAbono').disabled = true;
      errorFormulario('#fdErrorAbono','');
      try {
        comprobarSesion();
        const r = calcularBalance(estado.transacciones, estado.abonos, estado.miembros);
        const monto = Number($('#fdMontoAbono').value);
        const fecha = $('#fdFechaAbono').value;
        if (!centavos(monto)) throw new Error('Escribe un monto válido.');
        if (!fechaValida(fecha)) throw new Error('Selecciona una fecha válida.');
        if (r.deudor !== estado.uid || !r.acreedor || centavos(monto) > centavos(r.deuda)) {
          throw new Error('El monto supera la deuda pendiente o no tienes un saldo que pagar.');
        }
        if (!window.confirm('¿Registrar un abono de ' + moneda(monto) + ' a ' + nombre(r.acreedor) + '?')) return;
        await ruta('liquidaciones').add({
          tipo: 'ajuste_entre_integrantes', pagador: estado.uid, receptor: r.acreedor,
          monto: Math.round(monto*100)/100, fecha,
          creadoPor: estado.uid,
          creadoEn: firebase.firestore.FieldValue.serverTimestamp()
        });
        cerrarModal('#fdModalAbono');
      } catch(error) {
        console.error('Finora: guardar abono',error);
        errorFormulario('#fdErrorAbono',error.message || 'No se pudo guardar el abono.');
      } finally { estado.busy = false; $('#fdGuardarAbono').disabled = false; }
    }

    async function eliminarAbono(id) {
      if (estado.busy) return;
      try {
        comprobarSesion();
        const p = estado.abonos.find(a => a.id === id);
        if (!p || p.creadoPor !== estado.uid) throw new Error('Solo puedes borrar tus propios abonos.');
        if (!window.confirm('¿Eliminar este abono? El saldo pendiente volverá a calcularse.')) return;
        estado.busy = true;
        await ruta('liquidaciones').doc(id).delete();
      } catch (error) {
        console.error('Finora: eliminar abono',error);
        alert(error.message || 'No se pudo eliminar el abono.');
      } finally { estado.busy = false; }
    }

    $('#fdCrear').addEventListener('click',() => abrirFormularioGasto(null));
    $('#fdListaGastos').addEventListener('click',e => {
      const boton = e.target.closest('button[data-accion="dividir"]');
      if (boton) abrirFormularioGasto(boton.dataset.id);
    });
    $('#fdListaAbonos').addEventListener('click',e => {
      const boton = e.target.closest('button[data-accion="eliminarAbono"]');
      if (boton) eliminarAbono(boton.dataset.id);
    });
    $('#fdAbonar').addEventListener('click',abrirAbono);
    $('#fdPorcentaje').addEventListener('input',pintarPartes);
    $('#fdMonto').addEventListener('input',pintarPartes);
    $('#fdMitad').addEventListener('click',() => { $('#fdPorcentaje').value='50'; pintarPartes(); });
    $('#fdFormulario').addEventListener('submit',guardarGasto);
    $('#fdFormularioAbono').addEventListener('submit',guardarAbono);
    [['#fdCerrar','#fdModal'],['#fdCancelar','#fdModal'],['#fdCerrarAbono','#fdModalAbono'],['#fdCancelarAbono','#fdModalAbono']]
      .forEach(([boton,modal]) => $(boton).addEventListener('click',() => { if (!estado.busy) cerrarModal(modal); }));
    ['#fdModal','#fdModalAbono'].forEach(id => $(id).addEventListener('click',e => {
      if (e.target === $(id) && !estado.busy) cerrarModal(id);
    }));
    document.addEventListener('keydown',e => {
      if (e.key !== 'Escape' || estado.busy) return;
      if (!$('#fdModal').hidden) cerrarModal('#fdModal');
      if (!$('#fdModalAbono').hidden) cerrarModal('#fdModalAbono');
    });
    const priv = document.getElementById('togglePrivacidadAjustes');
    if (priv) priv.addEventListener('change',pintarBalance);
    window.addEventListener('storage',e => {
      if (e.key === 'ocultarMontos') pintarBalance();
      if (e.key === 'perfilActivo' || e.key === 'espacioActivoId') activar(App.auth.currentUser);
    });
    App.auth.onAuthStateChanged(activar);
  });
})();
