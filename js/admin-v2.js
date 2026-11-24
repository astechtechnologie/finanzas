/* Finora Admin V2 — capa de interfaz para el panel administrativo existente.
 * Reutiliza los controles originales. No cambia Firebase Auth, roles, datos
 * personales/compartidos ni escribe movimientos. Cargar despues de ui-main.js.
 */
(function () {
  'use strict';

  const MAX_CLIENTES_REPORTE = 10;
  const MAX_MOVIMIENTOS_CLIENTE = 500;
  const MAX_FILAS_VISTA = 80;

  function importe(valor) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
  }

  function resumenMovimientos(filas) {
    return filas.reduce(function (r, t) {
      const monto = importe(t.monto);
      if (t.tipo === 'ingreso') { r.ingresos += monto; r.ingresosN += 1; }
      if (t.tipo === 'gasto') { r.gastos += monto; r.gastosN += 1; }
      r.movimientos += 1;
      return r;
    }, { ingresos: 0, gastos: 0, ingresosN: 0, gastosN: 0, movimientos: 0 });
  }

  function escaparCSV(valor) {
    let texto = String(valor == null ? '' : valor);
    // Evita que Excel interprete contenido importado como fórmulas.
    if (/^[\s]*[=+\-@\t\r]/.test(texto)) texto = "'" + texto;
    return '"' + texto.replace(/"/g, '""') + '"';
  }

  function generarCSV(encabezados, filas) {
    return '\uFEFF' + [encabezados, ...filas].map(function (fila) {
      return fila.map(escaparCSV).join(';');
    }).join('\r\n');
  }

  function fechaISOHoy() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function fechaISOMesInicio() {
    return fechaISOHoy().slice(0, 7) + '-01';
  }

  function fechaValida(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }

  function comoDinero(numero) {
    return '$' + importe(numero).toLocaleString('es-CO', {
      minimumFractionDigits: 0, maximumFractionDigits: 2
    });
  }

  function montoDesdeTexto(texto) {
    const normalizado = String(texto || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = Number(normalizado);
    return Number.isFinite(n) ? n : 0;
  }

  function crear(tipo, clase, contenido) {
    const el = document.createElement(tipo);
    if (clase) el.className = clase;
    if (contenido !== undefined) el.textContent = contenido;
    return el;
  }

  function mostrarMensaje(el, texto, error) {
    if (!el) return;
    el.textContent = texto;
    el.dataset.error = error ? 'true' : 'false';
  }

  function descargar(texto, nombre, mime) {
    const url = URL.createObjectURL(new Blob([texto], { type: mime || 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // Helpers puros exportados solo para ejecutar pruebas locales con Node.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { importe, resumenMovimientos, escaparCSV, generarCSV, fechaValida, montoDesdeTexto };
  }
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  document.addEventListener('DOMContentLoaded', function () {
    const App = window.App;
    const db = App && App.db;
    const auth = App && App.auth;
    const vista = document.getElementById('vistaAdmin');
    const root = vista && vista.querySelector('.admin-dashboard');
    if (!App || !auth || !db || !root) return;

    let montado = false;
    let uidActual = null;
    let montadoUid = null;
    let clientesVinculados = [];
    let movimientosCargados = [];
    let reporteParcial = false;
    let secciones = {};
    let observadores = [];
    let consultaEnCurso = false;

    function asegurarAdmin() {
      return new Promise(function (resolve) {
        if (!auth.currentUser || typeof App.obtenerRolUsuario !== 'function') return resolve(false);
        App.obtenerRolUsuario(function (rol) {
          resolve(rol === 'admin' && !!auth.currentUser && auth.currentUser.uid === uidActual);
        });
      });
    }

    function activarSeccion(nombre) {
      Object.keys(secciones).forEach(function (clave) {
        secciones[clave].hidden = clave !== nombre;
      });
      root.querySelectorAll('.fi-admin-v2__nav-btn').forEach(function (btn) {
        const activo = btn.dataset.section === nombre;
        btn.classList.toggle('active', activo);
        btn.setAttribute('aria-current', activo ? 'page' : 'false');
      });
      const titulos = {
        resumen: ['Resumen', 'Tu cartera de clientes y organizaciones vinculadas'],
        clientes: ['Clientes', 'Vincula y consulta los clientes autorizados'],
        organizaciones: ['Organizaciones', 'Administra tus organizaciones existentes'],
        movimientos: ['Movimientos', 'Consulta de solo lectura, limitada a clientes vinculados'],
        reportes: ['Reportes', 'Filtra movimientos y exporta un resumen CSV'],
        auditoria: ['Auditoría', 'Consulta los registros que realmente existen en Firestore'],
        configuracion: ['Configuración', 'Preferencias y estado del módulo Admin']
      };
      const meta = titulos[nombre] || titulos.resumen;
      root.querySelector('#fiAdminTitle').textContent = meta[0];
      root.querySelector('#fiAdminSubtitle').textContent = meta[1];
      try { localStorage.setItem('finora_admin_v2_seccion_' + uidActual, nombre); } catch (_) {}
      if (nombre === 'movimientos' || nombre === 'reportes') { cargarSelectorClientes(); }
    }

    function reubicar(original, destino) {
      if (original && destino) destino.appendChild(original);
    }

    function instalarInterfaz() {
      if (montado) return;
      const headerOriginal = root.querySelector(':scope > .admin-header');
      const statsOriginal = root.querySelector(':scope > .admin-stats');
      const bloques = Array.from(root.querySelectorAll(':scope > .admin-seccion'));
      const detalleOriginal = root.querySelector(':scope > #detalleUsuarioAdmin');
      if (!headerOriginal || !statsOriginal || bloques.length < 3 || !detalleOriginal) return;
      const [orgOriginal, clientesOriginal, auditOriginal] = bloques;

      const layout = crear('div', 'fi-admin-v2');
      // Plantilla estática; los datos externos se insertan exclusivamente con textContent.
      layout.innerHTML = `
        <aside class="fi-admin-v2__sidebar" aria-label="Menú administrativo">
          <div class="fi-admin-v2__brand"><span class="fi-admin-v2__logo">◆</span><div><b>Finora Admin</b><small>Centro de gestión</small></div></div>
          <nav class="fi-admin-v2__nav" aria-label="Secciones de administración">
            <button type="button" class="fi-admin-v2__nav-btn" data-section="resumen"><i class="ph ph-squares-four"></i> Resumen</button>
            <button type="button" class="fi-admin-v2__nav-btn" data-section="clientes"><i class="ph ph-users"></i> Clientes</button>
            <button type="button" class="fi-admin-v2__nav-btn" data-section="organizaciones"><i class="ph ph-buildings"></i> Organizaciones</button>
            <button type="button" class="fi-admin-v2__nav-btn" data-section="movimientos"><i class="ph ph-list-magnifying-glass"></i> Movimientos</button>
            <button type="button" class="fi-admin-v2__nav-btn" data-section="reportes"><i class="ph ph-chart-bar"></i> Reportes</button>
            <button type="button" class="fi-admin-v2__nav-btn" data-section="auditoria"><i class="ph ph-clock-counter-clockwise"></i> Auditoría</button>
            <button type="button" class="fi-admin-v2__nav-btn" data-section="configuracion"><i class="ph ph-gear"></i> Configuración</button>
          </nav>
          <p class="fi-admin-v2__sidebar-help">Solo se muestran los clientes que tienes vinculados. Los permisos reales dependen de las reglas de Firestore.</p>
        </aside>
        <div class="fi-admin-v2__main">
          <header class="fi-admin-v2__top">
            <div><span class="fi-admin-v2__eyebrow">ADMINISTRACIÓN</span><h2 id="fiAdminTitle">Resumen</h2><p id="fiAdminSubtitle"></p></div>
            <button type="button" class="fi-admin-v2__button fi-admin-v2__button--outline" id="fiAdminGoHome"><i class="ph ph-house"></i> Ir a Inicio</button>
          </header>
          <section class="fi-admin-v2__panel" id="fiAdmin-resumen">
            <div id="fiAdmin-resumen-orig"></div>
            <div class="fi-admin-v2__info-strip"><span>Balance de movimientos mostrados</span><strong id="fiAdminBalanceResumen">—</strong></div>
            <p class="fi-admin-v2__notice">Los indicadores originales consultan hasta los 100 movimientos más recientes por cliente vinculado. No equivalen al saldo bancario ni necesariamente a los totales históricos.</p>
            <div class="fi-admin-v2__shortcuts">
              <button type="button" class="fi-admin-v2__shortcut" data-go="clientes"><i class="ph ph-user-plus"></i><b>Vincular cliente</b><small>Buscar por correo</small></button>
              <button type="button" class="fi-admin-v2__shortcut" data-go="organizaciones"><i class="ph ph-buildings"></i><b>Nueva organización</b><small>Gestionar cartera</small></button>
              <button type="button" class="fi-admin-v2__shortcut" data-go="reportes"><i class="ph ph-file-csv"></i><b>Generar reporte</b><small>Exportar movimientos</small></button>
              <button type="button" class="fi-admin-v2__shortcut" data-go="auditoria"><i class="ph ph-shield-check"></i><b>Ver auditoría</b><small>Consultar registros</small></button>
            </div>
          </section>
          <section class="fi-admin-v2__panel" id="fiAdmin-clientes" hidden>
            <div class="fi-admin-v2__toolbar"><label for="fiAdminBuscarClientes">Buscar entre los clientes vinculados</label><input id="fiAdminBuscarClientes" class="fi-admin-v2__input" type="search" placeholder="Correo o identificador"></div>
            <div id="fiAdmin-clientes-orig"></div><div id="fiAdmin-cliente-detalle"></div>
          </section>
          <section class="fi-admin-v2__panel" id="fiAdmin-organizaciones" hidden>
            <div class="fi-admin-v2__toolbar"><label for="fiAdminBuscarOrganizaciones">Buscar organización</label><input id="fiAdminBuscarOrganizaciones" class="fi-admin-v2__input" type="search" placeholder="Nombre de la organización"></div>
            <div id="fiAdmin-organizaciones-orig"></div>
          </section>
          <section class="fi-admin-v2__panel" id="fiAdmin-movimientos" hidden>
            <h3>Movimientos de clientes vinculados</h3>
            <p class="fi-admin-v2__notice">Consulta limitada a un máximo de 500 movimientos por cliente dentro del periodo elegido. No cambia movimientos ni datos personales.</p>
            <div class="fi-admin-v2__filters">
              <label>Cliente<select id="fiAdminCliente" class="fi-admin-v2__input"><option value="">Cargando…</option></select></label>
              <label>Desde<input id="fiAdminDesde" class="fi-admin-v2__input" type="date"></label>
              <label>Hasta<input id="fiAdminHasta" class="fi-admin-v2__input" type="date"></label>
              <button type="button" id="fiAdminConsultar" class="fi-admin-v2__button">Consultar</button>
            </div>
            <p class="fi-admin-v2__feedback" id="fiAdminResultadoConsulta" role="status"></p>
            <div class="fi-admin-v2__table-wrap"><table class="fi-admin-v2__table"><thead><tr><th>Fecha</th><th>Cliente</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th>Importe</th></tr></thead><tbody id="fiAdminTablaMovimientos"></tbody></table></div>
          </section>
          <section class="fi-admin-v2__panel" id="fiAdmin-reportes" hidden>
            <h3>Reporte de movimientos consultados</h3>
            <p class="fi-admin-v2__notice">Primero ve a <b>Movimientos</b>, selecciona un periodo y pulsa <b>Consultar</b>. Este reporte utiliza únicamente esos registros y señala cuando es parcial.</p>
            <div class="fi-admin-v2__report-grid">
              <div><small>Ingresos consultados</small><strong id="fiAdminRIngresos">—</strong></div>
              <div><small>Gastos consultados</small><strong id="fiAdminRGastos">—</strong></div>
              <div><small>Diferencia de movimientos</small><strong id="fiAdminRNeto">—</strong></div>
              <div><small>Movimientos consultados</small><strong id="fiAdminRCantidad">—</strong></div>
            </div>
            <div id="fiAdminDistribucion" class="fi-admin-v2__categories"></div>
            <p id="fiAdminReporteEstado" class="fi-admin-v2__feedback" role="status">Todavía no has realizado una consulta.</p>
            <button id="fiAdminDescargarCSV" type="button" class="fi-admin-v2__button" disabled><i class="ph ph-download-simple"></i> Exportar movimientos CSV</button>
          </section>
          <section class="fi-admin-v2__panel" id="fiAdmin-auditoria" hidden>
            <p class="fi-admin-v2__notice">Esta sección muestra los registros ya almacenados en <code>usuarios/{uid}/auditoria</code>. No inventa actividad pasada ni registra accesos automáticamente.</p>
            <div id="fiAdmin-auditoria-orig"></div><p id="fiAdminAuditoriaEstado" class="fi-admin-v2__feedback" role="status"></p>
          </section>
          <section class="fi-admin-v2__panel" id="fiAdmin-configuracion" hidden>
            <h3>Preferencias de administración</h3>
            <label class="fi-admin-v2__option">Sección al entrar a Admin<select id="fiAdminSeccionInicial" class="fi-admin-v2__input"><option value="resumen">Resumen</option><option value="clientes">Clientes</option><option value="organizaciones">Organizaciones</option><option value="reportes">Reportes</option></select></label>
            <button type="button" id="fiAdminGuardarPreferencia" class="fi-admin-v2__button">Guardar preferencia</button>
            <p id="fiAdminConfigEstado" class="fi-admin-v2__feedback" role="status"></p>
            <div class="fi-admin-v2__security"><b>Seguridad</b><p>El panel reutiliza el rol <code>admin</code> y las reglas existentes de Firestore. Los roles adicionales, el registro automático de auditoría y la edición avanzada de organizaciones NO están implementados en esta versión.</p></div>
            <button id="fiAdminIrAjustes" type="button" class="fi-admin-v2__button fi-admin-v2__button--outline">Abrir Ajustes generales</button>
          </section>
        </div>`;
      // Reubicar los nodos originales mantiene sus ID, listeners y referencias JS.
      root.replaceChildren(layout);
      reubicar(headerOriginal, layout.querySelector('#fiAdmin-resumen-orig'));
      reubicar(statsOriginal, layout.querySelector('#fiAdmin-resumen-orig'));
      reubicar(clientesOriginal, layout.querySelector('#fiAdmin-clientes-orig'));
      reubicar(orgOriginal, layout.querySelector('#fiAdmin-organizaciones-orig'));
      reubicar(auditOriginal, layout.querySelector('#fiAdmin-auditoria-orig'));
      reubicar(detalleOriginal, layout.querySelector('#fiAdmin-cliente-detalle'));
      vista.classList.add('fi-admin-v2--mounted');
      montado = true;
      montadoUid = uidActual;
      ['resumen','clientes','organizaciones','movimientos','reportes','auditoria','configuracion'].forEach(function (name) {
        secciones[name] = layout.querySelector('#fiAdmin-' + name);
      });
      configurarEventos(layout);
      const pref = localStorage.getItem('finora_admin_v2_inicio_' + uidActual) || 'resumen';
      const selectorInicial = layout.querySelector('#fiAdminSeccionInicial');
      if (selectorInicial) selectorInicial.value = pref;
      activarSeccion(pref);
      actualizarBalanceResumen();
      const stats = layout.querySelector('#fiAdmin-resumen-orig .admin-stats');
      if (stats) { const ob = new MutationObserver(actualizarBalanceResumen); ob.observe(stats,{subtree:true,childList:true,characterData:true}); observadores.push(ob); }
      establecerFiltrosPersistentes();
    }

    function actualizarBalanceResumen() {
      const ingresos = montoDesdeTexto(document.getElementById('statIngresos')?.textContent);
      const gastos = montoDesdeTexto(document.getElementById('statGastos')?.textContent);
      const el = document.getElementById('fiAdminBalanceResumen');
      if (el) el.textContent = comoDinero(ingresos - gastos);
    }

    function establecerFiltrosPersistentes() {
      const clientes = document.getElementById('listaUsuariosAdmin');
      const orgs = document.getElementById('listaOrganizaciones');
      if (clientes) {
        const ob = new MutationObserver(filtrarClientes);
        ob.observe(clientes, {childList:true}); observadores.push(ob);
      }
      if (orgs) {
        const ob = new MutationObserver(filtrarOrganizaciones);
        ob.observe(orgs, {childList:true}); observadores.push(ob);
      }
    }

    function filtrarClientes() {
      const q = (document.getElementById('fiAdminBuscarClientes')?.value || '').trim().toLowerCase();
      document.querySelectorAll('#listaUsuariosAdmin .cliente-card').forEach(function (card) {
        card.hidden = q.length > 0 && !card.textContent.toLowerCase().includes(q);
      });
    }

    function filtrarOrganizaciones() {
      const q = (document.getElementById('fiAdminBuscarOrganizaciones')?.value || '').trim().toLowerCase();
      document.querySelectorAll('#listaOrganizaciones .org-item').forEach(function (item) {
        item.hidden = q.length > 0 && !item.textContent.toLowerCase().includes(q);
      });
    }

    async function cargarSelectorClientes() {
      const selector = document.getElementById('fiAdminCliente');
      if (!selector || !auth.currentUser || !montado) return;
      if (!(await asegurarAdmin())) return;
      try {
        const snap = await db.collection('usuarios').doc(uidActual).collection('vinculados').get();
        if (auth.currentUser?.uid !== uidActual) return;
        clientesVinculados = snap.docs.map(function (d) { return { uid: d.id, email: d.get('email') || d.id }; });
        const previo = selector.value;
        selector.replaceChildren();
        selector.add(new Option('Todos los vinculados (máximo ' + MAX_CLIENTES_REPORTE + ')', 'todos'));
        clientesVinculados.forEach(function (c) { selector.add(new Option(c.email, c.uid)); });
        selector.value = [...selector.options].some(o => o.value === previo) ? previo : 'todos';
        if (!document.getElementById('fiAdminDesde').value) document.getElementById('fiAdminDesde').value = fechaISOMesInicio();
        if (!document.getElementById('fiAdminHasta').value) document.getElementById('fiAdminHasta').value = fechaISOHoy();
      } catch (e) {
        mostrarMensaje(document.getElementById('fiAdminResultadoConsulta'), 'No se pudo consultar la lista de clientes: ' + e.message, true);
      }
    }

    async function consultarMovimientos() {
      const estado = document.getElementById('fiAdminResultadoConsulta');
      if (consultaEnCurso) return;
      if (!(await asegurarAdmin())) { mostrarMensaje(estado, 'Esta acción requiere permiso de administrador.', true); return; }
      const selector = document.getElementById('fiAdminCliente');
      const desde = document.getElementById('fiAdminDesde').value;
      const hasta = document.getElementById('fiAdminHasta').value;
      if (!fechaValida(desde) || !fechaValida(hasta) || desde > hasta) {
        mostrarMensaje(estado, 'Selecciona un rango de fechas válido.', true); return;
      }
      let clientes = selector.value === 'todos' ? clientesVinculados.slice(0, MAX_CLIENTES_REPORTE)
        : clientesVinculados.filter(c => c.uid === selector.value);
      if (!clientes.length) { mostrarMensaje(estado, 'No hay clientes vinculados para consultar.', true); return; }
      consultaEnCurso = true;
      reporteParcial = selector.value === 'todos' && clientesVinculados.length > MAX_CLIENTES_REPORTE;
      movimientosCargados = [];
      const boton = document.getElementById('fiAdminConsultar');
      boton.disabled = true;
      mostrarMensaje(estado, 'Consultando datos autorizados de ' + clientes.length + ' cliente(s)…');
      const errores = [];
      try {
        for (const c of clientes) {
          if (auth.currentUser?.uid !== uidActual) throw new Error('La sesión cambió durante la consulta.');
          try {
            const q = await db.collection('usuarios').doc(c.uid).collection('transacciones')
              .where('fecha','>=',desde).where('fecha','<=',hasta)
              .orderBy('fecha','desc').limit(MAX_MOVIMIENTOS_CLIENTE).get();
            if (q.size >= MAX_MOVIMIENTOS_CLIENTE) reporteParcial = true;
            q.docs.forEach(function (doc) {
              const t = doc.data();
              movimientosCargados.push({
                id: doc.id, cliente: c.email, uid: c.uid, fecha: String(t.fecha || ''),
                tipo: t.tipo === 'ingreso' ? 'ingreso' : t.tipo === 'gasto' ? 'gasto' : 'otro',
                categoria: String(t.categoria || ''), descripcion: String(t.descripcion || ''), monto: importe(t.monto)
              });
            });
          } catch (e) { errores.push(c.email + ': ' + e.message); reporteParcial = true; }
        }
        if (auth.currentUser?.uid !== uidActual) throw new Error('La sesión cambió; vuelve a consultar.');
        movimientosCargados.sort((a,b)=>b.fecha.localeCompare(a.fecha));
        pintarMovimientos();
        pintarReporte();
        mostrarMensaje(estado, 'Se consultaron ' + movimientosCargados.length + ' movimientos. ' +
          (reporteParcial ? 'Resultado PARCIAL por límites o errores. ' : '') +
          (errores.length ? 'No se pudieron leer: ' + errores.join(' | ') : ''), errores.length>0);
      } catch (e) {
        movimientosCargados=[];
        pintarMovimientos(); pintarReporte();
        mostrarMensaje(estado, e.message, true);
      } finally { consultaEnCurso = false; boton.disabled = false; }
    }

    function pintarMovimientos() {
      const tbody = document.getElementById('fiAdminTablaMovimientos');
      tbody.replaceChildren();
      if (!movimientosCargados.length) {
        const celda = crear('td', '', 'No hay movimientos en la consulta.'); celda.colSpan=6;
        const fila=document.createElement('tr');fila.appendChild(celda);tbody.appendChild(fila);return;
      }
      const frag=document.createDocumentFragment();
      movimientosCargados.slice(0,MAX_FILAS_VISTA).forEach(function (t) {
        const fila=document.createElement('tr');
        [t.fecha,t.cliente,t.tipo,t.categoria,t.descripcion,comoDinero(t.monto)].forEach(function (v) {
          fila.appendChild(crear('td','',v));
        });
        frag.appendChild(fila);
      });
      tbody.appendChild(frag);
      if (movimientosCargados.length>MAX_FILAS_VISTA) {
        const fila=document.createElement('tr');const celda=crear('td','', 'Se muestran las primeras ' + MAX_FILAS_VISTA + ' filas; el CSV incluye todas las consultadas.');celda.colSpan=6;fila.appendChild(celda);tbody.appendChild(fila);
      }
    }

    function pintarReporte() {
      const r = resumenMovimientos(movimientosCargados);
      document.getElementById('fiAdminRIngresos').textContent = comoDinero(r.ingresos);
      document.getElementById('fiAdminRGastos').textContent = comoDinero(r.gastos);
      document.getElementById('fiAdminRNeto').textContent = comoDinero(r.ingresos - r.gastos);
      document.getElementById('fiAdminRCantidad').textContent = String(r.movimientos);
      const distribucion = document.getElementById('fiAdminDistribucion');
      distribucion.replaceChildren();
      const sumas = new Map();
      movimientosCargados.filter(t=>t.tipo==='gasto').forEach(function(t){sumas.set(t.categoria||'Sin categoría',(sumas.get(t.categoria||'Sin categoría')||0)+t.monto);});
      const ordenados=[...sumas.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);
      if(ordenados.length){distribucion.appendChild(crear('h4','', 'Mayores categorías de gasto (consulta actual)'));}
      const max=Math.max(1,...ordenados.map(e=>e[1]));
      ordenados.forEach(function (par) {
        const item=crear('div','fi-admin-v2__category');
        const encabezado=crear('div','fi-admin-v2__category-head');
        encabezado.appendChild(crear('span','',par[0]));encabezado.appendChild(crear('b','',comoDinero(par[1])));
        const fondo=crear('div','fi-admin-v2__bar');const progreso=crear('span','');progreso.style.width=Math.max(1,Math.round(par[1]/max*100))+'%';fondo.appendChild(progreso);
        item.appendChild(encabezado);item.appendChild(fondo);distribucion.appendChild(item);
      });
      const texto=movimientosCargados.length ? 'Consulta de ' + movimientosCargados.length + ' movimientos.' : 'Sin registros para el rango seleccionado.';
      mostrarMensaje(document.getElementById('fiAdminReporteEstado'), texto + (reporteParcial ? ' Resultado parcial: no interpretarlo como total histórico.' : ''));
      document.getElementById('fiAdminDescargarCSV').disabled=!movimientosCargados.length;
    }

    function exportarMovimientos() {
      if (!movimientosCargados.length) return;
      const columnas=['Fecha','Cliente','UID','Tipo','Categoría','Descripción','Monto (COP)','ID movimiento'];
      const filas=movimientosCargados.map(t=>[t.fecha,t.cliente,t.uid,t.tipo,t.categoria,t.descripcion,t.monto,t.id]);
      descargar(generarCSV(columnas,filas),'finora_admin_movimientos_'+fechaISOHoy()+'.csv');
    }

    async function exportarAuditoria() {
      const estado=document.getElementById('fiAdminAuditoriaEstado');
      if (!(await asegurarAdmin())) {mostrarMensaje(estado,'Solo un administrador puede exportar auditoría.',true);return;}
      try {
        const snap=await db.collection('usuarios').doc(uidActual).collection('auditoria')
          .orderBy('fecha','desc').limit(500).get();
        if(auth.currentUser?.uid!==uidActual) return;
        if(!snap.size){mostrarMensaje(estado,'No existen registros de auditoría para exportar.');return;}
        const filas=snap.docs.map(function(d){const p=d.data();const f=p.fecha;const fecha=f&&typeof f.toDate==='function'?f.toDate().toISOString():String(f||'');return[fecha,String(p.accion||''),d.id];});
        descargar(generarCSV(['Fecha','Acción','ID'],filas),'finora_admin_auditoria_'+fechaISOHoy()+'.csv');
        mostrarMensaje(estado,'Se exportaron '+filas.length+' registros.'+(snap.size===500?' Máximo de 500: puede ser parcial.':''));
      }catch(e){mostrarMensaje(estado,'No se pudo exportar auditoría: '+e.message,true);}
    }

    function configurarEventos(layout) {
      layout.querySelectorAll('.fi-admin-v2__nav-btn').forEach(function (btn){btn.addEventListener('click',()=>activarSeccion(btn.dataset.section));});
      layout.querySelectorAll('[data-go]').forEach(function (btn){btn.addEventListener('click',function(){activarSeccion(btn.dataset.go);if(btn.dataset.go==='clientes')document.getElementById('emailUsuarioVincular')?.focus();if(btn.dataset.go==='organizaciones'&&document.getElementById('formOrganizacion')?.classList.contains('hidden'))document.getElementById('btnMostrarFormOrg')?.click();});});
      layout.querySelector('#fiAdminBuscarClientes').addEventListener('input',filtrarClientes);
      layout.querySelector('#fiAdminBuscarOrganizaciones').addEventListener('input',filtrarOrganizaciones);
      layout.querySelector('#fiAdminConsultar').addEventListener('click',consultarMovimientos);
      layout.querySelector('#fiAdminDescargarCSV').addEventListener('click',exportarMovimientos);
      layout.querySelector('#fiAdminGuardarPreferencia').addEventListener('click',function(){const v=layout.querySelector('#fiAdminSeccionInicial').value;localStorage.setItem('finora_admin_v2_inicio_'+uidActual,v);mostrarMensaje(layout.querySelector('#fiAdminConfigEstado'),'Preferencia guardada.');});
      layout.querySelector('#fiAdminGoHome').addEventListener('click',function(){document.querySelector('.bottom-nav [data-vista="vistaInicio"]')?.click();});
      layout.querySelector('#fiAdminIrAjustes').addEventListener('click',function(){document.querySelector('.bottom-nav [data-vista="vistaAjustes"]')?.click();});
      const exportador=document.getElementById('btnExportarAuditoria');
      if(exportador)exportador.addEventListener('click',exportarAuditoria);
    }

    auth.onAuthStateChanged(async function (user) {
      if (!user) {
        uidActual = null;
        movimientosCargados = [];
        clientesVinculados = [];
        vista.classList.add('fi-admin-v2--locked');
        vista.classList.remove('activa');
        return;
      }
      // Reiniciar el DOM si otra cuenta inicia sesión en la misma pestaña.
      // Así no quedan listas/suscripciones de un administrador anterior.
      if (montado && montadoUid && montadoUid !== user.uid) {
        window.location.reload();
        return;
      }
      uidActual = user.uid;
      vista.classList.add('fi-admin-v2--locked');
      const esAdmin = await asegurarAdmin();
      if (auth.currentUser?.uid !== uidActual) return;
      if (esAdmin) {
        instalarInterfaz();
        vista.classList.remove('fi-admin-v2--locked');
      } else {
        vista.classList.remove('activa');
      }
    });
  });
})();
