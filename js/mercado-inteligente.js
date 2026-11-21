/* Finora — Mercado inteligente. Módulo independiente (no modifica movimientos). */
(function () {
  'use strict';
  const App = window.App;
  const M = window.FinoraMercadoMotor;
  if (!App || !App.db || !App.auth || !M) {
    console.error('Finora Mercado: revisa el orden de carga de Firebase y mercado-motor.js.');
    return;
  }
  let uid = null, coleccion = null, desconectar = null, generacion = 0;
  let ambito = 'personal', espacioId = '', productos = [], pestaña = 'lista', mesLista = M.fechaLocal().slice(0, 7);
  let enCurso = false, abrirCuandoInicie = new URLSearchParams(location.search).get('mercado') === '1';
  const $ = id => document.getElementById(id);
  const hoy = () => M.fechaLocal();
  const ahora = () => firebase.firestore.FieldValue.serverTimestamp();
  const elemento = (tag, clase, contenido) => {
    const n = document.createElement(tag);
    if (clase) n.className = clase;
    if (contenido != null) n.textContent = String(contenido);
    return n;
  };

  function montarInterfaz() {
    const inicio = $('vistaInicio');
    const app = $('appShell');
    if (!inicio || !app || $('fmAbrirMercado')) return;
    const acceso = elemento('button','fm-acceso');
    acceso.id = 'fmAbrirMercado'; acceso.type = 'button';
    acceso.innerHTML = '<span class="fm-acceso-icono" aria-hidden="true">🛒</span><span class="fm-acceso-texto"><strong>Lista de mercado</strong><small>Compras, despensa y avisos inteligentes</small></span><span id="fmAccesoNumero" class="fm-acceso-contador">0</span><span aria-hidden="true">›</span>';
    const panelCompartido = $('panelFinancieroCompartido');
    if (panelCompartido) panelCompartido.insertAdjacentElement('afterend', acceso);
    else inicio.insertBefore(acceso, inicio.firstChild);

    const pantalla = document.createElement('section');
    pantalla.id = 'fmPantalla'; pantalla.className = 'fm-pantalla'; pantalla.hidden = true;
    pantalla.setAttribute('role', 'dialog'); pantalla.setAttribute('aria-modal', 'true');
    pantalla.setAttribute('aria-labelledby', 'fmTitulo');
    pantalla.innerHTML = `
      <header class="fm-cabecera">
        <button type="button" id="fmCerrar" class="fm-icon-btn" aria-label="Cerrar mercado">←</button>
        <div class="fm-titulo"><h2 id="fmTitulo">Mi mercado</h2><small id="fmSubtitulo">Organiza tus compras con tiempo</small></div>
        <button type="button" id="fmNuevo" class="fm-btn fm-btn-primario">+ Producto</button>
      </header>
      <div class="fm-cuerpo">
        <div id="fmEstado" class="fm-estado" role="status" aria-live="polite"></div>
        <div id="fmAvisos" class="fm-aviso-box" hidden></div>
        <div class="fm-pestañas" role="tablist" aria-label="Secciones de mercado">
          <button class="fm-pestaña active" type="button" data-fm-pestana="lista">🛒 Comprar <span id="fmNumLista">0</span></button>
          <button class="fm-pestaña" type="button" data-fm-pestana="despensa">🏠 Despensa</button>
          <button class="fm-pestaña" type="button" data-fm-pestana="revisar">🔔 Revisar <span id="fmNumRevisar">0</span></button>
        </div>
        <div id="fmBarraMes" class="fm-barra-mes"><label for="fmMes">Lista para el mes</label><input type="month" id="fmMes"></div>
        <div class="fm-busqueda"><input id="fmBuscar" type="search" placeholder="Buscar aceite, arroz, leche..." aria-label="Buscar productos"></div>
        <div id="fmLista" class="fm-tarjetas" aria-live="polite"></div>
        <article class="fm-config"><div><strong>🔔 Avisos de mercado en tu celular</strong><p>Finora te recordará revisar productos próximos a agotarse. También verás los avisos aquí, sin activar push.</p></div>
          <div class="fm-config-campos"><label class="fm-check"><input id="fmPush" type="checkbox"> Activar push</label>
            <label>Hora <input id="fmHoraPush" type="time" value="19:00"></label>
            <button id="fmGuardarPush" type="button" class="fm-btn fm-btn-secundario">Guardar avisos</button></div>
          <small id="fmInfoPush" role="status"></small>
        </article>
        <p class="fm-nota">La lista de mercado no registra gastos ni altera el saldo de tus cuentas. Cuando compres, puedes registrar el gasto por separado en Finora.</p>
      </div>
      <div id="fmEditor" class="fm-capa" hidden>
        <form id="fmFormulario" class="fm-cuadro" autocomplete="off">
          <h3 id="fmEditorTitulo">Nuevo producto</h3>
          <label>Producto <input id="fmNombre" maxlength="70" required placeholder="Ej. Aceite"></label>
          <div class="fm-form-grid"><label>Cantidad <input id="fmCantidad" type="number" min="0.01" max="9999" step="0.01" value="1" required></label>
          <label>Unidad <select id="fmUnidad"><option>unidad</option><option>litro</option><option>kg</option><option>gramos</option><option>paquete</option><option>botella</option><option>bolsa</option><option>caja</option></select></label></div>
          <label>Última compra (opcional) <input id="fmFechaCompra" type="date"></label>
          <label>Duración aproximada, en días <input id="fmDuracion" type="number" min="1" max="365" value="30" required></label>
          <p class="fm-ayuda">Si ya lo compraste, usa la fecha. Finora calculará cuándo revisarlo. Si aún no lo compraste, irá a la lista del mes seleccionado.</p>
          <div class="fm-acciones"><button id="fmCancelarEditor" type="button" class="fm-btn fm-btn-secundario">Cancelar</button><button type="submit" class="fm-btn fm-btn-primario">Guardar producto</button></div>
        </form>
      </div>
      <div id="fmAccionFecha" class="fm-capa" hidden>
        <form id="fmFechaFormulario" class="fm-cuadro">
          <h3 id="fmFechaTitulo">Registrar fecha</h3><label>Fecha <input type="date" id="fmFechaValor" required></label>
          <div class="fm-acciones"><button type="button" id="fmCancelarFecha" class="fm-btn fm-btn-secundario">Cancelar</button><button type="submit" class="fm-btn fm-btn-primario">Confirmar</button></div>
        </form>
      </div>`;
    app.appendChild(pantalla);
    $('fmMes').value = mesLista;
    acceso.addEventListener('click', abrir);
    $('fmCerrar').addEventListener('click', cerrar);
    $('fmNuevo').addEventListener('click', () => editarProducto(null));
    $('fmCancelarEditor').addEventListener('click', () => { $('fmEditor').hidden = true; });
    $('fmCancelarFecha').addEventListener('click', () => { $('fmAccionFecha').hidden = true; });
    $('fmFormulario').addEventListener('submit', guardarProducto);
    $('fmFechaFormulario').addEventListener('submit', confirmarFecha);
    $('fmGuardarPush').addEventListener('click', guardarAvisosPush);
    $('fmBuscar').addEventListener('input', pintar);
    $('fmMes').addEventListener('change', function () { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(this.value)) { mesLista = this.value; pintar(); } });
    pantalla.querySelectorAll('[data-fm-pestana]').forEach(b => b.addEventListener('click', () => {
      pestaña = b.dataset.fmPestana;
      $('fmBuscar').value = '';
      pintar();
    }));
    $('fmLista').addEventListener('click', manejarAccionProducto);
    pantalla.addEventListener('keydown', e => { if (e.key === 'Escape' && !enCurso) {
      if (!$('fmEditor').hidden) $('fmEditor').hidden=true;
      else if (!$('fmAccionFecha').hidden) $('fmAccionFecha').hidden=true;
      else cerrar();
    }});
  }

  function estado(msg, error) {
    const n = $('fmEstado'); if (!n) return;
    n.textContent = msg || ''; n.classList.toggle('fm-error', !!error); n.hidden = !msg;
  }
  function abrir() {
    if (!$('fmPantalla')) return;
    $('fmPantalla').hidden = false;
    document.body.classList.add('fm-abierto');
    pintar(); $('fmBuscar').focus();
  }
  function cerrar() {
    $('fmEditor').hidden = true; $('fmAccionFecha').hidden = true;
    $('fmPantalla').hidden = true; document.body.classList.remove('fm-abierto');
    $('fmAbrirMercado')?.focus();
  }
  function desconectarDatos() {
    generacion++;
    if (desconectar) desconectar(); desconectar = null;
    productos = []; coleccion = null; uid = null;
    if ($('fmAccesoNumero')) $('fmAccesoNumero').textContent = '0';
    if ($('fmPantalla') && !$('fmPantalla').hidden) cerrar();
  }
  async function iniciar(user) {
    desconectarDatos();
    if (!user) { $('fmAbrirMercado')?.setAttribute('hidden', ''); return; }
    uid = user.uid;
    const secuencia = generacion;
    ambito = localStorage.getItem('perfilActivo') === 'espacio' ? 'espacio' : 'personal';
    espacioId = ambito === 'espacio' ? (localStorage.getItem('espacioActivoId') || '') : '';
    $('fmAbrirMercado')?.removeAttribute('hidden');
    estado('Cargando productos…');
    if (ambito === 'espacio') {
      if (!espacioId) { estado('Selecciona un espacio compartido válido.', true); return; }
      try {
        const snap = await App.db.collection('espacios').doc(espacioId).get();
        if (secuencia !== generacion) return;
        if (!snap.exists || !Array.isArray(snap.data().miembros) || !snap.data().miembros.includes(uid)) {
          estado('No tienes permiso para consultar la despensa de ese espacio.', true); return;
        }
      } catch (e) { if (secuencia === generacion) estado('No se pudo verificar el acceso al espacio.', true); return; }
      coleccion = App.db.collection('espacios').doc(espacioId).collection('mercado');
    } else {
      coleccion = App.db.collection('usuarios').doc(uid).collection('mercado');
    }
    $('fmSubtitulo').textContent = ambito === 'espacio' ? 'Mercado compartido con tu espacio' : 'Productos y compras personales';
    desconectar = coleccion.onSnapshot(snap => {
      if (secuencia !== generacion) return;
      productos = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      estado(''); pintar();
      if (abrirCuandoInicie) {
        abrirCuandoInicie=false; abrir();
        const url = new URL(location.href); url.searchParams.delete('mercado');
        history.replaceState(null,'',url.pathname+url.search+url.hash);
      }
    }, err => {
      if (secuencia !== generacion) return;
      console.error('Finora Mercado: lectura fallida',err);
      estado('No se pudieron cargar productos. Revisa tu conexión y las reglas de Firestore.', true);
    });
    cargarAvisosPush(secuencia);
  }

  function textoFecha(fecha) {
    if (!M.leerFecha(fecha)) return 'Sin fecha';
    return new Date(fecha+'T12:00:00').toLocaleDateString('es-CO',{day:'numeric',month:'short',year:'numeric'});
  }
  function boton(accion, texto, tipo, id) {
    const b=elemento('button','fm-btn '+(tipo || 'fm-btn-secundario'),texto);
    b.type='button'; b.dataset.accion=accion; b.dataset.id=id; return b;
  }
  function pintar() {
    const lista=$('fmLista'); if (!lista) return;
    lista.replaceChildren();
    $('fmBarraMes').hidden = pestaña !== 'lista';
    $('fmPantalla').querySelectorAll('[data-fm-pestana]').forEach(b => b.classList.toggle('active',b.dataset.fmPestana===pestaña));
    const pendientes=productos.filter(p => p.mesLista === mesLista);
    const vencidos=productos.filter(p => M.debeRevisarse(p,hoy()));
    const hoyTexto=hoy();
    $('fmNumLista').textContent = pendientes.length;
    $('fmNumRevisar').textContent = vencidos.length;
    const badge=$('fmAccesoNumero');
    if (badge) badge.textContent = productos.filter(p => !!p.mesLista).length + vencidos.length;
    const aviso=$('fmAvisos');
    aviso.hidden = vencidos.length === 0;
    if (vencidos.length) aviso.textContent = '🔔 ' + vencidos.length + ' producto(s) podrían estar por agotarse. Revísalos antes del próximo mercado.';
    const buscar=String($('fmBuscar').value||'').trim().toLocaleLowerCase('es');
    let items = pestaña==='lista' ? pendientes : pestaña==='revisar' ? vencidos : productos;
    items=items.filter(p => !buscar || String(p.nombre||'').toLocaleLowerCase('es').includes(buscar))
      .slice().sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
    if (!items.length) {
      lista.appendChild(elemento('p','fm-vacio',pestaña==='lista'?'Todavía no hay productos en esta lista. Usa «+ Producto» o añade uno desde Despensa.':pestaña==='revisar'?'No hay productos pendientes de revisión.':'No tienes productos en tu despensa.'));
      return;
    }
    for (const p of items) {
      const tarjeta=elemento('article','fm-producto');
      const fila=elemento('div','fm-producto-fila');
      const icono=elemento('span','fm-producto-icono',p.estado==='agotado'?'🛒':'🥫');
      const info=elemento('div','fm-producto-info');
      info.appendChild(elemento('strong','',p.nombre || 'Producto'));
      const detalle=elemento('small','',String(p.cantidad||1)+' '+String(p.unidad||'unidad')+' · '+(p.estado==='agotado'?'Agotado / sin comprar':'En casa'));
      info.appendChild(detalle);
      const previsto=M.diasEstimados(p);
      if (p.estado==='en_casa') {
        info.appendChild(elemento('small','', 'Última compra: '+textoFecha(p.fechaUltimaCompra)+' · Revisión: '+textoFecha(p.fechaRevision)));
        info.appendChild(elemento('small','fm-auxiliar','Consumo estimado: '+previsto+' días'+(Array.isArray(p.duraciones)&&p.duraciones.length?' (aprendido de '+p.duraciones.length+' ciclo/s)':'')));
      } else if (p.fechaUltimoAgotado) {
        info.appendChild(elemento('small','','Se terminó: '+textoFecha(p.fechaUltimoAgotado)));
      }
      if (p.mesLista) info.appendChild(elemento('span','fm-etiqueta','En lista: '+p.mesLista));
      fila.append(icono,info); tarjeta.appendChild(fila);
      const acciones=elemento('div','fm-producto-acciones');
      if (pestaña === 'lista') {
        acciones.append(boton('comprar','✓ Compré','fm-btn-primario',p.id),boton('sacar','Quitar de lista','fm-btn-secundario',p.id));
      } else if (pestaña === 'revisar') {
        acciones.append(boton('agregar-siguiente','Sí, al próximo mercado','fm-btn-primario',p.id),boton('posponer','Aún tengo · +7 días','fm-btn-secundario',p.id),boton('agotar','Se agotó','fm-btn-secundario',p.id));
      } else {
        if (p.estado==='en_casa') acciones.appendChild(boton('agotar','Se acabó','fm-btn-secundario',p.id));
        else acciones.appendChild(boton('comprar','Ya lo compré','fm-btn-primario',p.id));
        if (!p.mesLista) {
          acciones.appendChild(boton('agregar','+ Este mes seleccionado','fm-btn-secundario',p.id));
          if (p.estado==='agotado') acciones.appendChild(boton('agregar-siguiente','+ Próximo mes','fm-btn-secundario',p.id));
        }
        acciones.appendChild(boton('editar','Editar','fm-btn-suave',p.id));
        acciones.appendChild(boton('borrar','Eliminar','fm-btn-peligro',p.id));
      }
      tarjeta.appendChild(acciones); lista.appendChild(tarjeta);
    }
  }

  let editarId = null;
  function editarProducto(producto) {
    editarId=producto?.id||null;
    $('fmEditorTitulo').textContent=producto?'Editar producto':'Nuevo producto';
    $('fmNombre').value=producto?.nombre||'';
    $('fmCantidad').value=producto?.cantidad||1;
    $('fmUnidad').value=producto?.unidad||'unidad';
    $('fmFechaCompra').value=producto?.fechaUltimaCompra||'';
    $('fmDuracion').value=producto?.duracionManual||30;
    $('fmEditor').hidden=false; $('fmNombre').focus();
  }
  async function ejecutar(operacion) {
    if (enCurso) return;
    enCurso=true;
    const botones=$('fmPantalla')?.querySelectorAll('button');
    botones?.forEach(b => b.disabled=true);
    try { await operacion(); estado(''); }
    catch(e) { console.error('Finora Mercado:',e); estado('No se pudo guardar: '+(e.code==='permission-denied'?'permiso denegado por Firestore.':e.message||'error de conexión'),true); }
    finally { enCurso=false; botones?.forEach(b=>b.disabled=false); }
  }
  async function guardarProducto(e) {
    e.preventDefault();
    const nombre=$('fmNombre').value.trim();
    const cantidad=Number($('fmCantidad').value); const unidad=$('fmUnidad').value;
    const compra=$('fmFechaCompra').value;
    const duracion=Number($('fmDuracion').value);
    if (!nombre || nombre.length>70 || !Number.isFinite(cantidad) || cantidad<=0 || cantidad>9999 || !Number.isInteger(duracion) || duracion<1 || duracion>365 || (compra&&!M.leerFecha(compra))) { estado('Revisa el nombre, cantidad, duración y fecha.',true); return; }
    if (!editarId && productos.some(p=>String(p.nombre||'').toLocaleLowerCase('es')===nombre.toLocaleLowerCase('es'))) { estado('Ya tienes un producto con ese nombre. Edítalo desde Despensa.',true); return; }
    await ejecutar(async()=>{
      if (!coleccion) throw new Error('No hay sesión activa.');
      if (editarId) {
        const original=productos.find(p=>p.id===editarId);
        if (!original) throw new Error('El producto ya no existe.');
        let cambios={nombre,cantidad,unidad,duracionManual:duracion,actualizadoEn:ahora()};
        if (compra && compra!==original.fechaUltimaCompra) cambios={...cambios,...M.alComprar(original,compra)};
        else if (original.estado==='en_casa' && original.fechaUltimaCompra) cambios.fechaRevision=M.fechaRevision(original.fechaUltimaCompra,M.diasEstimados({...original,duracionManual:duracion}));
        await coleccion.doc(editarId).update(cambios);
      } else {
        const base={ nombre,cantidad,unidad,duracionManual:duracion, duraciones:[], historial:[],
          estado:'agotado', fechaUltimaCompra:null,fechaUltimoAgotado:null,fechaRevision:null,mesLista:mesLista,
          creadoPor:uid,creadoEn:ahora(),actualizadoEn:ahora() };
        const producto = compra ? {...base,...M.alComprar(base,compra)} : base;
        await coleccion.add(producto);
      }
      $('fmEditor').hidden=true;
    });
  }

  let accionFecha = null;
  function pedirFecha(accion, id) {
    accionFecha={accion,id};
    $('fmFechaTitulo').textContent=accion==='comprar'?'¿Cuándo lo compraste?':'¿Cuándo se terminó?';
    $('fmFechaValor').value=hoy(); $('fmAccionFecha').hidden=false; $('fmFechaValor').focus();
  }
  async function confirmarFecha(e) {
    e.preventDefault();
    if (!accionFecha) return;
    const {accion,id}=accionFecha; const fecha=$('fmFechaValor').value;
    if (!M.leerFecha(fecha)) { estado('Selecciona una fecha válida.',true);return; }
    const p=productos.find(x=>x.id===id);
    if (!p) { estado('No se encontró el producto.',true);return; }
    await ejecutar(async()=>{
      const cambios=accion==='comprar'?M.alComprar(p,fecha):M.alAgotar(p,fecha);
      await coleccion.doc(id).update({...cambios,actualizadoEn:ahora()});
      $('fmAccionFecha').hidden=true;
      if (accion==='agotar') estado('Se registró el agotamiento. Puedes añadirlo al mercado próximo desde Despensa.');
    });
  }
  function manejarAccionProducto(e) {
    const b=e.target.closest('button[data-accion]');
    if (!b || enCurso) return;
    const id=b.dataset.id; const p=productos.find(x=>x.id===id);
    if (!p || !coleccion) return;
    const accion=b.dataset.accion;
    if (accion==='editar') return editarProducto(p);
    if (accion==='comprar' || accion==='agotar') return pedirFecha(accion,id);
    if (accion==='borrar' && !confirm('¿Eliminar «'+p.nombre+'» y su historial de consumo?')) return;
    ejecutar(async()=>{
      if (accion==='borrar') await coleccion.doc(id).delete();
      else if (accion==='sacar') await coleccion.doc(id).update({mesLista:null,actualizadoEn:ahora()});
      else if (accion==='agregar' || accion==='agregar-siguiente') {
        const mes=accion==='agregar' ? mesLista : M.proximoMes(hoy().slice(0,7));
        await coleccion.doc(id).update({mesLista:mes,actualizadoEn:ahora()});
        mesLista=mes; $('fmMes').value=mes; pestaña='lista'; pintar();
      }
      else if (accion==='posponer') await coleccion.doc(id).update({fechaRevision:M.sumarDias(hoy(),7),actualizadoEn:ahora()});
    });
  }

  function zonaHoraria() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota'; }
    catch (_) { return 'America/Bogota'; }
  }
  async function cargarAvisosPush(secuencia) {
    try {
      const s=await App.db.collection('usuarios').doc(uid).get();
      if (secuencia!==generacion) return;
      const p=s.data()?.mercadoPush||{};
      const mismoAmbito=p.modo===ambito && (ambito==='personal'||p.espacioId===espacioId);
      $('fmPush').checked=!!(mismoAmbito&&p.activo);
      $('fmHoraPush').value=/^([01]\d|2[0-3]):[0-5]\d$/.test(p.hora||'')?p.hora:'19:00';
      $('fmInfoPush').textContent='Los avisos automáticos se envían por GitHub Actions, si tienes notificaciones activadas en Ajustes.';
    } catch(e) { if (secuencia===generacion) $('fmInfoPush').textContent='No se pudieron leer las preferencias de push.'; }
  }
  async function guardarAvisosPush() {
    if (!uid) return;
    const activo=$('fmPush').checked;
    const hora=$('fmHoraPush').value;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) { $('fmInfoPush').textContent='Elige una hora válida.'; return; }
    await ejecutar(async()=>{
      const usuarioRef=App.db.collection('usuarios').doc(uid);
      if (activo) {
        const perfil=await usuarioRef.get();
        if (!perfil.get('fcmToken')) throw new Error('Activa primero las notificaciones de Finora en Ajustes.');
        if (typeof Notification==='undefined' || Notification.permission!=='granted') throw new Error('Concede el permiso de notificaciones en este dispositivo.');
      }
      await usuarioRef.update({
        'mercadoPush.activo':activo, 'mercadoPush.hora':hora,
        'mercadoPush.zonaHoraria':zonaHoraria(),
        'mercadoPush.modo':ambito,
        'mercadoPush.espacioId':ambito==='espacio'?espacioId:null
      });
      $('fmInfoPush').textContent=activo?'Avisos de mercado activados.':'Avisos push desactivados. Seguirás viendo alertas dentro de Finora.';
    });
  }
  document.addEventListener('DOMContentLoaded', function () {
    montarInterfaz();
    App.auth.onAuthStateChanged(iniciar);
    window.addEventListener('storage', e=>{
      if (e.key==='perfilActivo'||e.key==='espacioActivoId') iniciar(App.auth.currentUser);
    });
  });
})();
