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
          <button class="fm-pestaña" type="button" data-fm-pestana="plan">✨ Plan V2</button>
          <button class="fm-pestaña" type="button" data-fm-pestana="tiendas">🏷️ Tiendas V3</button>
        </div>
        <div id="fmBarraMes" class="fm-barra-mes"><label for="fmMes" id="fmEtiquetaMes">Lista para el mes</label><input type="month" id="fmMes"></div>
        <section id="fmResumenV2" class="fm-resumen-v2" aria-live="polite" hidden></section>
        <section id="fmComparadorV3" class="fm-comparador-v3" aria-live="polite" hidden></section>
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
          <label>Precio total del producto (COP, opcional) <input id="fmPrecioNuevo" type="number" min="0.01" max="1000000000" step="0.01" inputmode="decimal" placeholder="Ej. 22000"></label>
          <label>Tienda donde lo compraste (opcional, solo con precio y fecha) <input id="fmTiendaNueva" maxlength="60" placeholder="Ej. Tienda del barrio"></label>
          <label>Duración aproximada, en días <input id="fmDuracion" type="number" min="1" max="365" value="30" required></label>
          <p class="fm-ayuda">Si ya lo compraste, usa la fecha. Finora calculará cuándo revisarlo. Si aún no lo compraste, irá a la lista del mes seleccionado.</p>
          <div class="fm-acciones"><button id="fmCancelarEditor" type="button" class="fm-btn fm-btn-secundario">Cancelar</button><button type="submit" class="fm-btn fm-btn-primario">Guardar producto</button></div>
        </form>
      </div>
      <div id="fmAccionFecha" class="fm-capa" hidden>
        <form id="fmFechaFormulario" class="fm-cuadro">
          <h3 id="fmFechaTitulo">Registrar fecha</h3><label>Fecha <input type="date" id="fmFechaValor" required></label>
          <label id="fmPrecioCompraGrupo">Precio total pagado (COP, opcional) <input type="number" id="fmPrecioCompra" min="0.01" max="1000000000" step="0.01" inputmode="decimal" placeholder="Ej. 22000"></label>
          <label id="fmTiendaCompraGrupo">Tienda (opcional, solo al registrar precio) <input id="fmTiendaCompra" maxlength="60" placeholder="Ej. Supermercado A"></label>
          <div class="fm-acciones"><button type="button" id="fmCancelarFecha" class="fm-btn fm-btn-secundario">Cancelar</button><button type="submit" class="fm-btn fm-btn-primario">Confirmar</button></div>
        </form>
      </div>
      <div id="fmHistorico" class="fm-capa" hidden>
        <section class="fm-cuadro" role="dialog" aria-modal="true" aria-labelledby="fmHistoricoTitulo">
          <h3 id="fmHistoricoTitulo">Historial de precios</h3>
          <div id="fmHistoricoLista" class="fm-historico-lista"></div>
          <button type="button" class="fm-btn fm-btn-secundario" id="fmCerrarHistorico">Cerrar</button>
        </section>
      </div>
      <div id="fmRegistrarPrecioTienda" class="fm-capa" hidden>
        <form id="fmTiendaFormulario" class="fm-cuadro">
          <h3 id="fmTiendaTitulo">Registrar precio de tienda</h3>
          <p class="fm-ayuda">Anota un precio visto en una tienda, aunque no hayas comprado. No cambia tu despensa ni registra gastos.</p>
          <label>Nombre de la tienda <input id="fmTiendaNombre" maxlength="60" required placeholder="Ej. Supermercado A"></label>
          <div class="fm-form-grid">
            <label>Fecha del precio <input id="fmTiendaFecha" type="date" required></label>
            <label>Cantidad a la que corresponde <input id="fmTiendaCantidad" type="number" min="0.01" max="9999" step="0.01" required></label>
          </div>
          <label>Precio total (COP) <input id="fmTiendaTotal" type="number" min="0.01" max="1000000000" step="0.01" required></label>
          <p id="fmTiendaUnidadNota" class="fm-ayuda"></p>
          <div class="fm-acciones">
            <button id="fmTiendaCancelar" type="button" class="fm-btn fm-btn-secundario">Cancelar</button>
            <button class="fm-btn fm-btn-primario" type="submit">Guardar precio</button>
          </div>
        </form>
      </div>`;
    app.appendChild(pantalla);
    $('fmMes').value = mesLista;
    acceso.addEventListener('click', abrir);
    $('fmCerrar').addEventListener('click', cerrar);
    $('fmNuevo').addEventListener('click', () => editarProducto(null));
    $('fmCancelarEditor').addEventListener('click', () => { $('fmEditor').hidden = true; });
    $('fmCancelarFecha').addEventListener('click', () => { $('fmAccionFecha').hidden = true; });
    $('fmCerrarHistorico').addEventListener('click', () => { $('fmHistorico').hidden = true; });
    $('fmTiendaCancelar').addEventListener('click', () => { $('fmRegistrarPrecioTienda').hidden = true; });
    $('fmTiendaFormulario').addEventListener('submit', guardarPrecioTienda);
    $('fmFormulario').addEventListener('submit', guardarProducto);
    $('fmFechaFormulario').addEventListener('submit', confirmarFecha);
    $('fmGuardarPush').addEventListener('click', guardarAvisosPush);
    $('fmBuscar').addEventListener('input', pintar);
    $('fmMes').addEventListener('change', function () { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(this.value)) { mesLista = this.value; pintar(); } });
    pantalla.querySelectorAll('[data-fm-pestana]').forEach(b => b.addEventListener('click', () => {
      pestaña = b.dataset.fmPestana;
      if (pestaña === 'plan' || pestaña === 'tiendas') {
        mesLista = M.proximoMes(hoy().slice(0,7));
        $('fmMes').value = mesLista;
      }
      $('fmBuscar').value = '';
      pintar();
    }));
    $('fmLista').addEventListener('click', manejarAccionProducto);
    pantalla.addEventListener('keydown', e => { if (e.key === 'Escape' && !enCurso) {
      if (!$('fmEditor').hidden) $('fmEditor').hidden=true;
      else if (!$('fmAccionFecha').hidden) $('fmAccionFecha').hidden=true;
      else if (!$('fmHistorico').hidden) $('fmHistorico').hidden=true;
      else if (!$('fmRegistrarPrecioTienda').hidden) $('fmRegistrarPrecioTienda').hidden=true;
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
    $('fmEditor').hidden = true; $('fmAccionFecha').hidden = true; $('fmHistorico').hidden = true; $('fmRegistrarPrecioTienda').hidden = true;
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
    $('fmBarraMes').hidden = !['lista','plan','tiendas'].includes(pestaña);
    $('fmEtiquetaMes').textContent = pestaña==='plan' || pestaña==='tiendas' ? 'Comparar compras de' : 'Lista para el mes';
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
    const resumen=$('fmResumenV2');
    resumen.hidden = !['lista','plan','tiendas'].includes(pestaña);
    if (!resumen.hidden) pintarResumen(resumen, mesLista);
    $('fmComparadorV3').hidden = pestaña !== 'tiendas';
    if (pestaña === 'tiendas') pintarComparador();
    const buscar=String($('fmBuscar').value||'').trim().toLocaleLowerCase('es');
    let items = pestaña==='lista' ? pendientes : pestaña==='revisar' ? vencidos :
      pestaña==='plan' ? M.sugerencias(productos,mesLista,hoy()) :
      pestaña==='tiendas' ? pendientes : productos;
    items=items.filter(p => !buscar || String(p.nombre||'').toLocaleLowerCase('es').includes(buscar))
      .slice().sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
    if (!items.length) {
      lista.appendChild(elemento('p','fm-vacio',pestaña==='lista'?'Todavía no hay productos en esta lista. Usa «+ Producto» o añade uno desde Despensa.':pestaña==='revisar'?'No hay productos pendientes de revisión.':pestaña==='plan'?'No hay sugerencias para este mes. Tu despensa está al día.':'No tienes productos en tu despensa.'));
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
      if (pestaña==='plan' && p.motivo) info.appendChild(elemento('small','fm-motivo',p.motivo));
      const precio=M.precioEstimado(p);
      info.appendChild(elemento('small','fm-precio','Precio estimado: '+(precio===null?'Sin precio todavía':moneda(precio))));
      const variacion=M.cambioPrecio(p);
      if (variacion!==null) info.appendChild(elemento('small','fm-variacion',
        (variacion>0?'↑ +':variacion<0?'↓ ':'= ')+variacion+' % respecto a la compra anterior (por unidad)'));
      fila.append(icono,info); tarjeta.appendChild(fila);
      const acciones=elemento('div','fm-producto-acciones');
      if (pestaña === 'tiendas') {
        acciones.append(boton('cotizar','+ Registrar precio de tienda','fm-btn-primario',p.id));
        if (M.historialDePrecios(p).length || M.ofertasValidas(p).length) acciones.append(boton('historial-precios','Ver precios guardados','fm-btn-secundario',p.id));
      } else if (pestaña === 'lista') {
        acciones.append(boton('comprar','✓ Compré','fm-btn-primario',p.id),boton('sacar','Quitar de lista','fm-btn-secundario',p.id));
      } else if (pestaña === 'plan') {
        acciones.append(boton('agregar-plan','+ Añadir al mes elegido','fm-btn-primario',p.id));
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
      if (pestaña !== 'tiendas') acciones.append(boton('cotizar','🏷️ Precio en tienda','fm-btn-suave',p.id));
      if (pestaña !== 'tiendas') acciones.append(boton('favorito',p.favorito?'★ Favorito':'☆ Favorito','fm-btn-suave',p.id));
      if (pestaña !== 'tiendas' && (M.historialDePrecios(p).length || M.ofertasValidas(p).length)) acciones.append(boton('historial-precios','Historial de precios','fm-btn-secundario',p.id));
      if (pestaña === 'tiendas') {
        const cot=M.cotizaciones(p,hoy());
        info.appendChild(elemento('small','fm-v3-cotizacion',cot.length ?
          cot.slice(0,2).map(x=>x.tienda+': '+moneda(x.estimado)+' ('+x.fecha+')').join(' · ') :
          'Sin precios recientes por tienda (últimos 90 días).'));
      }
      tarjeta.appendChild(acciones); lista.appendChild(tarjeta);
    }
  }

  function moneda(n) {
    return '$'+Math.round(Number(n)||0).toLocaleString('es-CO',{maximumFractionDigits:0});
  }
  function pintarResumen(contenedor, mes) {
    const datos=M.presupuestoConTiendas(productos,mes,hoy());
    contenedor.replaceChildren();
    const titulo=elemento('div','fm-v2-titulo');
    titulo.append(elemento('strong','','Presupuesto estimado · '+mes), elemento('small','',
      datos.cantidad+' producto(s) en tu lista'));
    const valor=elemento('div','fm-v2-valor',moneda(datos.total));
    const nota=elemento('p','fm-v2-nota', datos.sinPrecio
      ? datos.sinPrecio+' producto(s) sin precio. El total es parcial: registra precios para completar el cálculo.'
      : 'Estimación con tu historial y precios de tienda. Los precios pueden cambiar.');
    contenedor.append(titulo,valor,nota);
    if (pestaña==='plan') {
      const sugeridos=M.sugerencias(productos,mes,hoy());
      const plan=elemento('p','fm-v2-plan',sugeridos.length+' sugerencia(s) para revisar antes de comprar. Nada se agrega sin tu autorización.');
      contenedor.appendChild(plan);
    }
  }
  // V3: los precios de tiendas son referencias manuales, nunca movimientos de dinero.
  let idPrecioTienda=null;
  function abrirPrecioTienda(producto) {
    idPrecioTienda=producto.id;
    $('fmTiendaTitulo').textContent='Precio en tienda · '+String(producto.nombre||'Producto');
    $('fmTiendaNombre').value='';
    $('fmTiendaFecha').value=hoy();
    $('fmTiendaCantidad').value=producto.cantidad||1;
    $('fmTiendaTotal').value='';
    $('fmTiendaUnidadNota').textContent='Indica el precio para esa cantidad de '+(producto.unidad||'unidad')+'. Se compara el precio por unidad.';
    $('fmRegistrarPrecioTienda').hidden=false;
    $('fmTiendaNombre').focus();
  }
  async function guardarPrecioTienda(e) {
    e.preventDefault();
    const id=idPrecioTienda, p=productos.find(x=>x.id===id);
    if(!id||!p) { estado('No se encontró el producto.',true);return; }
    const oferta={tienda:$('fmTiendaNombre').value.trim(),fecha:$('fmTiendaFecha').value,
      cantidad:Number($('fmTiendaCantidad').value),total:Number($('fmTiendaTotal').value)};
    if (!M.tiendaValida(oferta.tienda)||!M.leerFecha(oferta.fecha)||
        M.diferenciaDias(oferta.fecha,hoy())<0 || !M.precioValido(oferta.cantidad)||!M.precioValido(oferta.total)) {
      estado('Revisa tienda, fecha (no futura), cantidad y precio.',true);return;
    }
    await ejecutar(async()=>{
      await actualizarAtomico(id,actual=>M.guardarOferta(actual,oferta));
      $('fmRegistrarPrecioTienda').hidden=true;
    });
  }
  function pintarComparador() {
    const cont=$('fmComparadorV3');cont.replaceChildren();
    const titulo=elemento('h3','','Comparador de tiendas · últimos 90 días');
    const nota=elemento('p','fm-v3-nota','Precios introducidos por ti, no en tiempo real. Son valores proporcionales por unidad: un envase entero puede costar más. Un subtotal parcial NO es el costo completo.');
    cont.append(titulo,nota);
    const lista=productos.filter(p=>p.mesLista===mesLista);
    if(!lista.length){cont.appendChild(elemento('p','fm-v3-vacio','Selecciona productos para este mes desde la pestaña Despensa o Plan V2.'));return;}
    const optim=M.planMasEconomico(productos,mesLista,hoy());
    const caja=elemento('div','fm-v3-mejor');
    caja.append(elemento('strong','','Mejor combinación registrada: '+moneda(optim.total)),
      elemento('small','',optim.sinPrecio ? 'Estimación PARCIAL: faltan precios de '+optim.sinPrecio+' producto(s).' :
        'Estimación completa para '+optim.cantidad+' productos. Podría requerir visitar varias tiendas.'));
    if(optim.conPrecio) {
      const desglose=elemento('div','fm-v3-desglose');
      optim.detalle.forEach(d=>desglose.appendChild(elemento('div','',d.nombre+' — '+(d.estimado===null?'Sin precio reciente':d.tienda+' · '+moneda(d.estimado)))));
      caja.appendChild(desglose);
    }
    cont.appendChild(caja);
    const grupos=M.compararTiendas(productos,mesLista,hoy());
    if (!grupos.length){cont.appendChild(elemento('p','fm-v3-vacio','Aún no hay precios por tienda dentro de los últimos 90 días. Registra uno en cada producto de la lista.'));return;}
    const agrupacion=elemento('div','fm-v3-tiendas');
    grupos.forEach((t,i)=>{
      const item=elemento('article','fm-v3-tienda');
      item.append(elemento('strong','',t.tienda),elemento('span','fm-v3-cobertura',t.completos+'/'+t.cantidad+' productos con precio'));
      item.append(elemento('div','fm-v3-total',moneda(t.total)+(t.esCompleta?' · TOTAL ESTIMADO':' · SUBTOTAL PARCIAL')));
      if(t.faltantes)item.appendChild(elemento('small','',t.faltantes+' producto(s) sin precio en esta tienda.'));
      if (i===0 && t.esCompleta) item.classList.add('fm-v3-tienda-mejor');
      agrupacion.appendChild(item);
    });
    cont.appendChild(agrupacion);
  }
  function mostrarPrecios(p) {
    const lista=$('fmHistoricoLista'); lista.replaceChildren();
    $('fmHistoricoTitulo').textContent='Precios · '+String(p.nombre||'Producto');
    const registros=M.historialDePrecios(p).slice().reverse();

    const ofertas=M.ofertasValidas(p).map(r=>({...r,fuente:'Cotización'}));
    const todas=registros.map(r=>({...r,fuente:'Compra'})).concat(ofertas)
      .sort((a,b)=>b.fecha.localeCompare(a.fecha));
    lista.replaceChildren();
    if (!todas.length) lista.appendChild(elemento('p','','No hay compras ni precios de tiendas registrados.'));
    todas.forEach(r=>{
      const linea=elemento('div','fm-precio-renglon');
      linea.append(elemento('strong','',moneda(r.total)),elemento('span','',
        r.fecha+' · '+r.cantidad+' '+(r.unidad||p.unidad||'unidad')+' · '+(r.tienda||'Tienda no indicada')+' · '+r.fuente));
      lista.appendChild(linea);
    });
    $('fmHistorico').hidden=false;
  }
  async function actualizarAtomico(id, transformar) {
    if (!coleccion) throw new Error('No hay sesión activa.');
    const ref=coleccion.doc(id);
    await App.db.runTransaction(async tx=>{
      const snap=await tx.get(ref);
      if (!snap.exists) throw new Error('El producto fue eliminado.');
      const actual={...snap.data(),id};
      const cambio=transformar(actual);
      if (cambio && Object.keys(cambio).length) tx.update(ref,{...cambio,actualizadoEn:ahora()});
    });
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
    $('fmPrecioNuevo').value = producto?.precioReferencia ?? '';
    $('fmTiendaNueva').value = '';
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
    const precioTexto=$('fmPrecioNuevo').value.trim();
    const precio=precioTexto ? Number(precioTexto) : null;
    const tienda=$('fmTiendaNueva').value.trim();
    if (tienda && !M.tiendaValida(tienda)) { estado('El nombre de la tienda no es válido.',true); return; }
    if (!nombre || nombre.length>70 || !Number.isFinite(cantidad) || cantidad<=0 || cantidad>9999 || !Number.isInteger(duracion) || duracion<1 || duracion>365 || (compra&&!M.leerFecha(compra)) || (precio!==null&&!M.precioValido(precio))) { estado('Revisa nombre, cantidad, duración, fecha y precio.',true); return; }
    if (!editarId && productos.some(p=>String(p.nombre||'').toLocaleLowerCase('es')===nombre.toLocaleLowerCase('es'))) { estado('Ya tienes un producto con ese nombre. Edítalo desde Despensa.',true); return; }
    await ejecutar(async()=>{
      if (!coleccion) throw new Error('No hay sesión activa.');
      if (editarId) {
        await actualizarAtomico(editarId, original=>{
          let cambios={nombre,cantidad,unidad,duracionManual:duracion};
          if (compra && compra!==original.fechaUltimaCompra) {
            cambios={...cambios,...M.alComprar(original,compra)};
            if (precio!==null) cambios={...cambios,...M.guardarPrecioDeCompra({...original,cantidad,unidad},compra,precio,cantidad,tienda)};
          } else {
            // Una referencia editada no inventa un evento de compra.
            if (precio!==null) cambios.precioReferencia=precio;
            if (original.estado==='en_casa' && original.fechaUltimaCompra)
              cambios.fechaRevision=M.fechaRevision(original.fechaUltimaCompra,M.diasEstimados({...original,duracionManual:duracion}));
          }
          return cambios;
        });
      } else {
        const base={ nombre,cantidad,unidad,duracionManual:duracion, duraciones:[], historial:[],
          historialPrecios:[], favorito:false, precioReferencia:compra?null:precio,
          estado:'agotado', fechaUltimaCompra:null,fechaUltimoAgotado:null,fechaRevision:null,mesLista:mesLista,
          creadoPor:uid,creadoEn:ahora(),actualizadoEn:ahora() };
        let producto = compra ? {...base,...M.alComprar(base,compra)} : base;
        if (compra&&precio!==null) producto={...producto,...M.guardarPrecioDeCompra(base,compra,precio,cantidad,tienda)};
        await coleccion.add(producto);
      }
      $('fmEditor').hidden=true;
    });
  }

  let accionFecha = null;
  function pedirFecha(accion, id) {
    accionFecha={accion,id};
    $('fmFechaTitulo').textContent=accion==='comprar'?'¿Cuándo lo compraste?':'¿Cuándo se terminó?';
    $('fmFechaValor').value=hoy();
    $('fmPrecioCompraGrupo').hidden=accion!=='comprar';
    $('fmTiendaCompraGrupo').hidden=accion!=='comprar';
    $('fmTiendaCompra').value='';
    $('fmPrecioCompra').value='';
    $('fmAccionFecha').hidden=false; $('fmFechaValor').focus();
  }
  async function confirmarFecha(e) {
    e.preventDefault();
    if (!accionFecha) return;
    const {accion,id}=accionFecha; const fecha=$('fmFechaValor').value;
    const precioTexto=accion==='comprar' ? $('fmPrecioCompra').value.trim() : '';
    const precio=precioTexto ? Number(precioTexto) : null;
    const tienda=accion==='comprar' ? $('fmTiendaCompra').value.trim() : '';
    if (tienda && !M.tiendaValida(tienda)) { estado('Escribe una tienda válida.',true);return; }
    if (!M.leerFecha(fecha) || (precio!==null&&!M.precioValido(precio))) { estado('Selecciona fecha y precio válidos.',true);return; }
    const p=productos.find(x=>x.id===id);
    if (!p) { estado('No se encontró el producto.',true);return; }
    await ejecutar(async()=>{
      await actualizarAtomico(id,actual=>{
        let cambios=accion==='comprar'?M.alComprar(actual,fecha):M.alAgotar(actual,fecha);
        if (accion==='comprar'&&precio!==null) cambios={...cambios,
          ...M.guardarPrecioDeCompra(actual,fecha,precio,Number(actual.cantidad)||1,tienda)};
        return cambios;
      });
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
    if (accion==='historial-precios') return mostrarPrecios(p);
    if (accion==='cotizar') return abrirPrecioTienda(p);
    if (accion==='comprar' || accion==='agotar') return pedirFecha(accion,id);
    if (accion==='borrar' && !confirm('¿Eliminar «'+p.nombre+'» y su historial de consumo?')) return;
    ejecutar(async()=>{
      if (accion==='borrar') await coleccion.doc(id).delete();
      else if (accion==='sacar') await coleccion.doc(id).update({mesLista:null,actualizadoEn:ahora()});
      else if (accion==='agregar' || accion==='agregar-siguiente' || accion==='agregar-plan') {
        const mes=accion==='agregar-plan' || accion==='agregar' ? mesLista : M.proximoMes(hoy().slice(0,7));
        await actualizarAtomico(id,actual=>{
          if (actual.mesLista && actual.mesLista!==mes) throw new Error('Ya está en la lista de '+actual.mesLista+'. Quítalo primero si quieres cambiarlo de mes.');
          return {mesLista:mes};
        });
        mesLista=mes; $('fmMes').value=mes; pestaña='lista'; pintar();
      } else if (accion==='favorito') {
        await actualizarAtomico(id,actual=>({favorito:actual.favorito!==true}));
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
    // El evento 'storage' no se dispara en la misma pestaña: detectar también
    // el cambio realizado por el selector de perfil original de Finora.
    document.addEventListener('change', e=>{
      if (e.target?.id==='selectorPerfil') setTimeout(()=>iniciar(App.auth.currentUser),0);
    });
    let ambitoDetectado='';
    setInterval(()=>{
      const actual=(App.auth.currentUser?.uid||'')+'|'+(localStorage.getItem('perfilActivo')||'personal')+'|'+(localStorage.getItem('espacioActivoId')||'');
      if (actual!==ambitoDetectado) {
        ambitoDetectado=actual;
        if (App.auth.currentUser && uid && actual.split('|')[0]===uid) {
          const nuevoModo=localStorage.getItem('perfilActivo')==='espacio'?'espacio':'personal';
          const nuevoEspacio=nuevoModo==='espacio'?(localStorage.getItem('espacioActivoId')||''):'';
          if (nuevoModo!==ambito||nuevoEspacio!==espacioId) iniciar(App.auth.currentUser);
        }
      }
    },1500);
  });
})();

