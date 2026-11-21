/* Finora - Panel financiero compartido V1.
 * SOLO LECTURA: no modifica movimientos ni datos personales.
 * Se ejecuta únicamente si el perfil activo es «espacio» y el usuario es miembro.
 */
(function () {
  'use strict';
  const App = window.App;
  if (!App || !App.db || !App.auth) return;

  function mesActual() {
    const fecha = new Date();
    return fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0');
  }
  function esMesValido(mes) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(mes || ''); }
  function moverMes(mes, desplazamiento) {
    const [anio, numero] = mes.split('-').map(Number);
    const fecha = new Date(anio, numero - 1 + desplazamiento, 1);
    return fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0');
  }
  function montoValido(valor) {
    const n = Number(valor);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  function calcularResumenCompartido(transacciones, mes, miembros, uidActual) {
    if (!esMesValido(mes)) throw new Error('Mes no válido');
    const categorias = Object.create(null);
    const autores = Object.create(null);
    const porMiembro = [];
    let ingresos = 0, gastos = 0;
    (miembros || []).forEach((id, indice) => {
      if (typeof id !== 'string' || !id) return;
      const nombre = id === uidActual ? 'Tú' : 'Integrante ' + (indice + 1);
      autores[id] = { id, nombre, ingresos: 0, gastos: 0, cantidad: 0 };
      porMiembro.push(autores[id]);
    });
    const sinAutor = { id: '', nombre: 'Sin autor identificado', ingresos: 0, gastos: 0, cantidad: 0 };
    const seleccionados = (transacciones || []).filter(t => t && typeof t.fecha === 'string' && t.fecha.slice(0, 7) === mes && /^\d{4}-\d{2}-\d{2}$/.test(t.fecha));
    seleccionados.forEach(t => {
      const importe = montoValido(t.monto);
      if (!importe || (t.tipo !== 'ingreso' && t.tipo !== 'gasto')) return;
      const autor = autores[t.creadoPor] || sinAutor;
      autor.cantidad++;
      if (t.tipo === 'ingreso') {
        ingresos += importe;
        autor.ingresos += importe;
      } else {
        gastos += importe;
        autor.gastos += importe;
        const categoria = (String(t.categoria || '').trim() || 'Sin categoría');
        categorias[categoria] = (categorias[categoria] || 0) + importe;
      }
    });
    if (sinAutor.cantidad) porMiembro.push(sinAutor);
    const recientes = seleccionados.filter(t => montoValido(t.monto) && (t.tipo === 'ingreso' || t.tipo === 'gasto'))
      .slice().sort((a,b) => b.fecha.localeCompare(a.fecha)).slice(0,6);
    return {
      ingresos, gastos, balance: ingresos - gastos,
      cantidad: seleccionados.length, miembros: porMiembro,
      categorias: Object.keys(categorias).map(nombre => ({ nombre, monto: categorias[nombre] })).sort((a,b) => b.monto - a.monto),
      recientes
    };
  }
  // Expuesta únicamente como función pura para comprobaciones y futuras mejoras.
  App.calcularResumenCompartido = calcularResumenCompartido;

  document.addEventListener('DOMContentLoaded', function () {
    const panel = document.getElementById('panelFinancieroCompartido');
    if (!panel) return;

    let mes = mesActual();
    let espacioId = null;
    let usuarioId = null;
    let nombreEspacio = 'Nuestro espacio';
    let miembros = [];
    let movimientos = [];
    let detenerEspacio = null;
    let detenerMovimientos = null;
    let generacion = 0;
    let secuenciaMovimientos = 0;

    const byId = id => document.getElementById(id);
    const inputMes = byId('fcMes');
    inputMes.value = mes;

    const fmt = valor => (valor < 0 ? '−$' : '$') + (typeof App.formatearMonto === 'function'
      ? App.formatearMonto(Math.abs(valor))
      : Number(Math.abs(valor)).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    const esPrivado = () => localStorage.getItem('ocultarMontos') === 'true';
    const dinero = valor => esPrivado() ? '$ ******' : fmt(valor);
    const crear = (tag, clase, texto) => {
      const el = document.createElement(tag);
      if (clase) el.className = clase;
      if (texto != null) el.textContent = String(texto);
      return el;
    };
    const vaciar = el => { while (el.firstChild) el.removeChild(el.firstChild); };
    function estado(texto, error) {
      byId('fcEstado').textContent = texto;
      byId('fcEstado').classList.toggle('fc-error', Boolean(error));
      byId('fcEstado').hidden = !texto;
      byId('fcContenido').hidden = Boolean(texto);
    }
    function nombreAutor(id) {
      if (id === usuarioId) return 'Tú';
      const posicion = miembros.indexOf(id);
      return posicion < 0 ? 'Sin autor identificado' : 'Integrante ' + (posicion + 1);
    }
    function dibujar() {
      if (!espacioId || !usuarioId || panel.hidden) return;
      const r = calcularResumenCompartido(movimientos, mes, miembros, usuarioId);
      byId('fcTitulo').textContent = nombreEspacio;
      byId('fcSubtitulo').textContent = 'Resumen de los movimientos del espacio compartido';
      byId('fcIngresos').textContent = dinero(r.ingresos);
      byId('fcGastos').textContent = dinero(r.gastos);
      byId('fcBalance').textContent = dinero(r.balance);
      byId('fcBalance').classList.toggle('fc-negativo', r.balance < 0);
      byId('fcNumeroMiembros').textContent = miembros.length + (miembros.length === 1 ? ' integrante' : ' integrantes');
      const cajaMiembros = byId('fcIntegrantes');
      vaciar(cajaMiembros);
      if (!r.miembros.length) cajaMiembros.appendChild(crear('p','fc-vacio','Sin integrantes disponibles.'));
      r.miembros.forEach(m => {
        const fila = crear('div','fc-miembro');
        const encabezado = crear('div','fc-miembro-cabecera');
        encabezado.appendChild(crear('strong','',m.nombre));
        encabezado.appendChild(crear('small','',m.cantidad + (m.cantidad === 1 ? ' movimiento' : ' movimientos')));
        const cifras = crear('div','fc-miembro-cifras');
        const ingresos = crear('span','', 'Ingresos: ' + dinero(m.ingresos));
        const gastos = crear('span','', 'Gastos: ' + dinero(m.gastos));
        cifras.append(ingresos, gastos);
        fila.append(encabezado,cifras);
        cajaMiembros.appendChild(fila);
      });
      const cajaCategorias = byId('fcCategorias');
      vaciar(cajaCategorias);
      if (!r.categorias.length) cajaCategorias.appendChild(crear('p','fc-vacio','Sin gastos en este mes.'));
      r.categorias.slice(0,5).forEach((c, i) => {
        const fila = crear('div','fc-categoria');
        const arriba = crear('div','fc-categoria-cabecera');
        arriba.append(crear('span','fc-categoria-nombre',c.nombre), crear('strong','',dinero(c.monto)));
        const pista = crear('div','fc-barra');
        const barra = crear('span','fc-barra-relleno');
        barra.style.width = (r.gastos ? Math.min(100, Math.max(0, c.monto / r.gastos * 100)) : 0) + '%';
        barra.style.backgroundColor = ['#88ab9a','#dfc157','#a7a1c8','#dc9d87','#92b5be'][i];
        pista.appendChild(barra);
        fila.append(arriba,pista);
        cajaCategorias.appendChild(fila);
      });
      if (r.categorias.length > 5) cajaCategorias.appendChild(crear('small','fc-nota','Y ' + (r.categorias.length - 5) + ' categorías más.'));
      const cajaRecientes = byId('fcRecientes');
      vaciar(cajaRecientes);
      if (!r.recientes.length) cajaRecientes.appendChild(crear('p','fc-vacio','No hay movimientos compartidos en este mes.'));
      r.recientes.forEach(t => {
        const fila = crear('div','fc-movimiento');
        const desc = crear('div','fc-movimiento-info');
        desc.appendChild(crear('strong','',String(t.categoria || 'Sin categoría')));
        const fecha = typeof t.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.fecha)
          ? new Date(t.fecha + 'T12:00:00').toLocaleDateString('es-CO',{day:'numeric',month:'short'}) : 'Sin fecha';
        const nota = t.descripcion && t.descripcion !== 'Sin descripción' ? String(t.descripcion) + ' · ' : '';
        desc.appendChild(crear('small','',nota + fecha + ' · ' + nombreAutor(t.creadoPor)));
        const importe = crear('strong', t.tipo === 'ingreso' ? 'fc-ingreso' : 'fc-gasto', (esPrivado() ? '$ ******' : ((t.tipo === 'ingreso' ? '+' : '−') + fmt(montoValido(t.monto)))));
        fila.append(desc, importe);
        cajaRecientes.appendChild(fila);
      });
      estado('', false);
    }
    function cancelarLecturas() {
      generacion++;
      secuenciaMovimientos++;
      if (typeof detenerMovimientos === 'function') detenerMovimientos();
      if (typeof detenerEspacio === 'function') detenerEspacio();
      detenerMovimientos = null;
      detenerEspacio = null;
      movimientos = [];
      miembros = [];
      espacioId = null;
      usuarioId = null;
    }
    function escucharMovimientos(numero) {
      const consulta = ++secuenciaMovimientos;
      if (typeof detenerMovimientos === 'function') detenerMovimientos();
      detenerMovimientos = null;
      if (!espacioId) return;
      const siguienteMes = moverMes(mes, 1);
      estado('Cargando movimientos compartidos…', false);
      const id = espacioId;
      detenerMovimientos = App.db.collection('espacios').doc(id).collection('transacciones')
        .where('fecha','>=', mes + '-01').where('fecha','<', siguienteMes + '-01')
        .orderBy('fecha','desc').onSnapshot(
          snapshot => {
            if (numero !== generacion || id !== espacioId || consulta !== secuenciaMovimientos) return;
            movimientos = snapshot.docs.map(doc => Object.assign({ id: doc.id }, doc.data()));
            dibujar();
          },
          error => {
            if (numero !== generacion || consulta !== secuenciaMovimientos) return;
            console.error('Panel compartido: error al consultar movimientos', error);
            estado('No se pudieron consultar los movimientos del espacio. Comprueba tus permisos y conexión.', true);
          }
        );
    }
    function iniciar( usuario ) {
      cancelarLecturas();
      const id = localStorage.getItem('espacioActivoId');
      const modoEspacio = localStorage.getItem('perfilActivo') === 'espacio';
      panel.hidden = !(usuario && id && modoEspacio);
      if (panel.hidden) return;
      espacioId = id;
      usuarioId = usuario.uid;
      mes = mesActual();
      inputMes.value = mes;
      const numero = generacion;
      estado('Comprobando acceso al espacio…', false);
      detenerEspacio = App.db.collection('espacios').doc(id).onSnapshot(
        snapshot => {
          if (numero !== generacion) return;
          if (!snapshot.exists) { if (detenerMovimientos) detenerMovimientos(); detenerMovimientos = null; estado('Este espacio ya no existe.', true); return; }
          const datos = snapshot.data() || {};
          const lista = Array.isArray(datos.miembros) ? datos.miembros.filter(x => typeof x === 'string') : [];
          if (!lista.includes(usuarioId)) {
            if (detenerMovimientos) detenerMovimientos();
            detenerMovimientos = null;
            movimientos = [];
            estado('No tienes acceso a este espacio. Selecciona tu perfil Personal.', true);
            return;
          }
          nombreEspacio = String(datos.nombre || 'Nuestro espacio');
          miembros = lista;
          byId('fcTitulo').textContent = nombreEspacio;
          if (!detenerMovimientos) escucharMovimientos(numero);
          else dibujar();
        },
        error => {
          if (numero !== generacion) return;
          console.error('Panel compartido: error al verificar espacio', error);
          estado('No se pudo verificar la pertenencia al espacio. Revisa las reglas de Firestore.', true);
        }
      );
    }

    byId('fcMesAnterior').addEventListener('click', () => {
      mes = moverMes(mes,-1); inputMes.value=mes;
      if (espacioId && miembros.includes(usuarioId)) escucharMovimientos(generacion);
    });
    byId('fcMesSiguiente').addEventListener('click', () => {
      mes = moverMes(mes,1); inputMes.value=mes;
      if (espacioId && miembros.includes(usuarioId)) escucharMovimientos(generacion);
    });
    inputMes.addEventListener('change', function () {
      if (!esMesValido(this.value)) { this.value=mes; return; }
      mes = this.value;
      if (espacioId && miembros.includes(usuarioId)) escucharMovimientos(generacion);
    });
    byId('fcRegistrarGasto').addEventListener('click', function () {
      if (localStorage.getItem('perfilActivo') !== 'espacio') return;
      const botonGasto = document.getElementById('tabGasto');
      if (botonGasto) botonGasto.click();
    });
    const ajustesPrivacidad = document.getElementById('togglePrivacidadAjustes');
    if (ajustesPrivacidad) ajustesPrivacidad.addEventListener('change', () => { if (espacioId) dibujar(); });
    const botonPrivacidad = document.getElementById('btnTogglePrivacidad');
    if (botonPrivacidad) botonPrivacidad.addEventListener('click', () => { if (espacioId) setTimeout(dibujar,0); });
    window.addEventListener('storage', event => {
      if (event.key === 'ocultarMontos') { if (espacioId) dibujar(); }
      if (event.key === 'perfilActivo' || event.key === 'espacioActivoId') {
        iniciar(App.auth.currentUser);
      }
    });
    App.auth.onAuthStateChanged(iniciar);
  });
})();
