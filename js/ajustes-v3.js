/*
 * FINORA — AJUSTES V3 (aditivo)
 * Reordena controles existentes sin clonarlos ni reemplazar sus eventos.
 * No escribe en Firestore ni modifica Auth, transacciones, presupuestos o espacios.
 * Preferencias visuales nuevas: localStorage por UID y por dispositivo.
 */
(function () {
  'use strict';
  const VERSION = '3.0.0';
  const KEY = 'finora.ajustes-v3:';
  const SECCIONES = [
    { id: 'perfil', titulo: 'Mi perfil', icono: '👤', subtitulo: 'Nombre, avatar y datos de tu cuenta', buscar: 'perfil usuario nombre avatar correo' },
    { id: 'apariencia', titulo: 'Apariencia', icono: '🎨', subtitulo: 'Tema y accesibilidad', buscar: 'tema claro oscuro pantalla fuente letra tamaño animaciones compacto' },
    { id: 'avisos', titulo: 'Notificaciones', icono: '🔔', subtitulo: 'Avisos push y recordatorios', buscar: 'notificaciones firebase avisos hora alertas permisos mensajes' },
    { id: 'finanzas', titulo: 'Mis finanzas', icono: '💳', subtitulo: 'Cuentas y métodos de pago', buscar: 'cuentas financiera banco tarjetas métodos pago' },
    { id: 'compartido', titulo: 'Espacio compartido', icono: '👥', subtitulo: 'Administración de tu espacio actual', buscar: 'pareja grupo espacio compartido invitación miembros' },
    { id: 'seguridad', titulo: 'Seguridad', icono: '🔒', subtitulo: 'Privacidad y acceso', buscar: 'privacidad ocultar montos cambiar contraseña cerrar sesión' },
    { id: 'datos', titulo: 'Mis datos', icono: '📁', subtitulo: 'Exportaciones y preferencias', buscar: 'datos csv exportar movimientos guardar respaldo' },
    { id: 'aplicacion', titulo: 'Aplicación', icono: '📱', subtitulo: 'Diagnóstico, conexión y actualizaciones', buscar: 'pwa service worker versiones conexión actualizar diagnóstico' }
  ];
  const DEFAULT = Object.freeze({ densidad: 'normal', texto: 'normal', movimiento: false });
  let userId = null;
  let elementos = null;
  let activa = 'perfil';
  let preferencias = { ...DEFAULT };
  let iniciado = false;
  const byId = id => document.getElementById(id);
  const texto = (el, value) => { if (el) el.textContent = String(value); };

  function almacenamientoLeer(uid) {
    if (!uid) return { ...DEFAULT };
    try {
      const o = JSON.parse(localStorage.getItem(KEY + uid) || '{}');
      if (!o || typeof o !== 'object' || Array.isArray(o)) return { ...DEFAULT };
      return {
        densidad: o.densidad === 'compacta' ? 'compacta' : 'normal',
        texto: o.texto === 'grande' ? 'grande' : 'normal',
        movimiento: o.movimiento === true
      };
    } catch (_) { return { ...DEFAULT }; }
  }
  function almacenamientoGuardar() {
    if (!userId) return;
    try { localStorage.setItem(KEY + userId, JSON.stringify(preferencias)); }
    catch (_) { mostrarMensaje('El navegador no permite guardar estas preferencias.', true); }
  }
  function aplicarPreferencias() {
    if (!elementos) return;
    elementos.vista.dataset.av3Densidad = preferencias.densidad;
    elementos.vista.dataset.av3Texto = preferencias.texto;
    // Se aplica exclusivamente a ajustes para no variar la estructura financiera.
    elementos.vista.classList.toggle('av3-reduce-motion', preferencias.movimiento);
    for (const b of elementos.root.querySelectorAll('[data-av3-setting]')) {
      const clave = b.dataset.av3Setting;
      const val = b.dataset.av3Value;
      const selected = String(preferencias[clave]) === val;
      b.classList.toggle('av3-selected', selected);
      b.setAttribute('aria-pressed', String(selected));
    }
    const check = byId('av3Movimiento');
    if (check) check.checked = preferencias.movimiento;
  }
  function mostrarMensaje(mensaje, error) {
    if (!elementos) return;
    const el = byId('av3Estado');
    texto(el, mensaje);
    if (el) el.dataset.error = error ? 'true' : 'false';
  }
  function elegirSeccion(id, enfocar) {
    if (!elementos || !SECCIONES.some(s => s.id === id)) return;
    activa = id;
    for (const s of SECCIONES) {
      const panel = byId('av3Panel-' + s.id);
      if (panel) panel.hidden = s.id !== id;
      const b = elementos.root.querySelector('[data-av3-ir="' + s.id + '"]');
      if (b) {
        const ok = s.id === id;
        b.classList.toggle('av3-activo', ok);
        b.setAttribute('aria-current', ok ? 'page' : 'false');
      }
    }
    const seccion = SECCIONES.find(s => s.id === id);
    texto(byId('av3TituloSeccion'), seccion.titulo);
    texto(byId('av3SubtituloSeccion'), seccion.subtitulo);
    if (enfocar) {
      const principal = byId('av3TituloSeccion');
      if (principal) { principal.setAttribute('tabindex', '-1'); principal.focus({ preventScroll: true }); }
      // Desplazamiento solo al navegar, no cuando se actualizan datos.
      elementos.root.scrollIntoView({ behavior: preferencias.movimiento ? 'auto' : 'smooth', block: 'start' });
    }
  }
  function construirCard(titulo, descripcion, extraClase) {
    const s = document.createElement('section');
    s.className = 'av3-card' + (extraClase ? ' ' + extraClase : '');
    const h = document.createElement('div');
    h.className = 'av3-card-head';
    const t = document.createElement('h3');
    t.textContent = titulo;
    const p = document.createElement('p');
    p.textContent = descripcion;
    h.append(t, p); s.append(h);
    return s;
  }
  function crearInterfaz() {
    const vista = byId('vistaAjustes');
    const panelOriginal = vista && vista.querySelector('.ajustes-panel');
    if (!vista || !panelOriginal || byId('av3Root')) return false;
    const originales = Array.from(panelOriginal.children);
    const root = document.createElement('div');
    root.id = 'av3Root'; root.className = 'av3';
    root.innerHTML = `
      <div class="av3-portada">
        <div class="av3-portada__icono" aria-hidden="true">◆</div>
        <div class="av3-portada__texto"><p class="av3-eyebrow">FINORA · CONFIGURACIÓN</p>
          <h2>Ajustes a tu manera</h2><p>Todo tu perfil y tus preferencias, en un solo lugar.</p></div>
        <div class="av3-portada__sesion"><span class="av3-punto" id="av3Punto"></span>
          <span id="av3ConexionSuperior">Comprobando conexión</span><small id="av3Contexto">Perfil personal</small></div>
      </div>
      <div class="av3-grid">
        <aside class="av3-sidebar" aria-label="Navegar por ajustes">
          <label class="av3-busqueda" for="av3Buscar"><span aria-hidden="true">⌕</span>
            <input id="av3Buscar" type="search" autocomplete="off" placeholder="Buscar un ajuste..." aria-label="Buscar ajustes" /></label>
          <nav class="av3-menu" aria-label="Secciones de ajustes"></nav>
          <p class="av3-sidebar-nota">Tus movimientos y datos financieros no se alteran al personalizar esta pantalla.</p>
        </aside>
        <main class="av3-area" id="av3Area">
          <header class="av3-area-header"><div><p class="av3-eyebrow">PREFERENCIAS</p>
          <h2 id="av3TituloSeccion" tabindex="-1">Mi perfil</h2><p id="av3SubtituloSeccion"></p></div>
          <span class="av3-version">V3</span></header>
          <div class="av3-paneles"></div>
          <p class="av3-estado" id="av3Estado" role="status" aria-live="polite"></p>
        </main>
      </div>`;
    const nav = root.querySelector('.av3-menu');
    const paneles = root.querySelector('.av3-paneles');
    for (const s of SECCIONES) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'av3-nav';
      b.dataset.av3Ir = s.id; b.dataset.av3Buscar = s.buscar;
      const i = document.createElement('span'); i.className = 'av3-nav-icono'; i.setAttribute('aria-hidden', 'true'); i.textContent = s.icono;
      const tx = document.createElement('span'); tx.className = 'av3-nav-texto'; tx.textContent = s.titulo;
      const arrow = document.createElement('span'); arrow.className = 'av3-nav-arrow'; arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '›';
      b.append(i, tx, arrow); nav.appendChild(b);
      const sec = document.createElement('section');
      sec.id = 'av3Panel-' + s.id; sec.className = 'av3-panel'; sec.hidden = s.id !== 'perfil';
      sec.setAttribute('aria-label', s.titulo);
      paneles.appendChild(sec);
    }
    panelOriginal.appendChild(root);
    vista.classList.add('av3-ready');
    elementos = { vista, root, panelOriginal };
    const config = {
      apariencia: construirCard('Tema y personalización', 'El selector de tema original sigue funcionando.'),
      avisos: construirCard('Recordatorios y avisos', 'Los avisos automáticos continúan utilizando tu configuración actual.'),
      finanzas: construirCard('Cuentas y medios de pago', 'Administra tus cuentas y métodos sin cambiar los movimientos.'),
      compartido: construirCard('Tu espacio compartido', 'Estas opciones utilizan los permisos y funciones existentes.'),
      seguridad: construirCard('Privacidad y contraseña', 'La seguridad real depende de Firebase y sus reglas.'),
      datos: construirCard('Exportación de movimientos', 'Tu exportación CSV existente conserva su funcionamiento.'),
      aplicacion: construirCard('Estado y diagnóstico', 'Comprueba conexión y nuevas versiones sin borrar información.')
    };
    for (const [id, card] of Object.entries(config)) byId('av3Panel-' + id).append(card);

    // Mover nodos originales (no copiar ni sustituir controles).
    for (const nodo of originales) {
      if (nodo.matches('h2')) { nodo.classList.add('av3-original-heading'); continue; }
      if (nodo.id === 'fpPerfilV2') { byId('av3Panel-perfil').append(nodo); continue; }
      const contiene = id => nodo.id === id || Boolean(nodo.querySelector('#' + id));
      const etiqueta = (nodo.textContent || '').trim().toLowerCase();
      let destino = 'aplicacion';
      if (contiene('temaSelector')) destino = 'apariencia';
      else if (contiene('toggleNotificaciones') || contiene('toggleRecordatorioMovimientos') || contiene('configRecordatorioMovimientos')) destino = 'avisos';
      else if (contiene('listaCuentasAjustes') || contiene('btnGestionarMetodos') || contiene('panelMetodosPago') || (etiqueta === 'mis cuentas')) destino = 'finanzas';
      else if (contiene('panelEspacioCompartido') || etiqueta === 'espacio compartido (pareja)') destino = 'compartido';
      else if (contiene('togglePrivacidadAjustes') || contiene('btnCambiarPasswordAjustes') || contiene('panelCambioPassword') || contiene('btnLogout')) destino = 'seguridad';
      else if (contiene('btnExportarCSV')) destino = 'datos';
      config[destino].appendChild(nodo);
    }
    if (!byId('fpPerfilV2')) {
      const nota = construirCard('Perfil no disponible', 'Para editar nombre y avatar conserva instalado el módulo Perfil y Ajustes V2 (perfil-ajustes.js).');
      byId('av3Panel-perfil').append(nota);
    }
    añadirControlesNuevos();
    enlazarEventos();
    elegirSeccion('perfil', false);
    return true;
  }

  function añadirControlesNuevos() {
    const apariencia = byId('av3Panel-apariencia');
    const card = construirCard('Comodidad visual', 'Estas preferencias se guardan solo en este dispositivo y por usuario.');
    card.innerHTML += `
      <div class="av3-control"><div><strong>Espaciado</strong><small>Reduce la separación entre tarjetas de Ajustes.</small></div>
        <div class="av3-segmentos" role="group" aria-label="Espaciado en ajustes">
          <button type="button" data-av3-setting="densidad" data-av3-value="normal">Normal</button>
          <button type="button" data-av3-setting="densidad" data-av3-value="compacta">Compacto</button>
        </div></div>
      <div class="av3-control"><div><strong>Tamaño del texto</strong><small>Amplía las etiquetas de esta pantalla.</small></div>
        <div class="av3-segmentos" role="group" aria-label="Tamaño de texto en ajustes">
          <button type="button" data-av3-setting="texto" data-av3-value="normal">Normal</button>
          <button type="button" data-av3-setting="texto" data-av3-value="grande">Grande</button>
        </div></div>
      <label class="av3-control av3-control--check"><div><strong>Reducir movimiento</strong>
          <small>Evita las animaciones decorativas de Ajustes.</small></div>
          <input type="checkbox" id="av3Movimiento" /></label>`;
    apariencia.appendChild(card);

    const datos = byId('av3Panel-datos');
    const dataCard = construirCard('Preferencias visuales', 'Puedes exportar tus ajustes visuales o restablecerlos sin eliminar movimientos.');
    dataCard.innerHTML += `<div class="av3-acciones">
      <button type="button" id="av3ExportarPrefs" class="av3-boton av3-boton--secundario">Descargar preferencias</button>
      <button type="button" id="av3ResetPrefs" class="av3-boton av3-boton--peligro">Restablecer apariencia</button></div>
      <p class="av3-nota">Esta descarga contiene solo las preferencias de Ajustes V3; no es una copia de seguridad de tus finanzas.</p>`;
    datos.appendChild(dataCard);

    const avisos = byId('av3Panel-avisos');
    const avisoCard = construirCard('Estado de permisos', 'Esto consulta el permiso del navegador; no modifica tus tokens de Firebase.');
    avisoCard.innerHTML += `<div class="av3-resumen-linea"><span>Notificaciones del navegador</span><strong id="av3PermisoPush">—</strong></div>
       <button type="button" class="av3-boton av3-boton--secundario" id="av3SolicitarPush">Solicitar permiso del navegador</button>
       <p class="av3-nota">Conceder permiso no garantiza recibir avisos: deben estar activados en los controles originales y configurado Firebase Messaging.</p>`;
    avisos.appendChild(avisoCard);

    const compartido = byId('av3Panel-compartido');
    const info = construirCard('Perfil en uso', 'El selector Personal / Compartido de la barra superior permanece sin cambios.');
    info.innerHTML += `<div class="av3-resumen-linea"><span>Perfil activo</span><strong id="av3PerfilActivo">—</strong></div>`;
    compartido.prepend(info);

    const app = byId('av3Panel-aplicacion');
    const diag = construirCard('Comprobación de funcionamiento', 'Diagnóstico local sin recopilar contraseñas ni datos financieros.');
    diag.innerHTML += `<div class="av3-diagnostico">
      <div class="av3-resumen-linea"><span>Conexión</span><strong id="av3Conexion">—</strong></div>
      <div class="av3-resumen-linea"><span>Service Worker PWA</span><strong id="av3SW">—</strong></div>
      <div class="av3-resumen-linea"><span>Firebase Auth</span><strong id="av3Auth">—</strong></div>
      <div class="av3-resumen-linea"><span>Versión de Ajustes</span><strong>${VERSION}</strong></div></div>
      <div class="av3-acciones"><button type="button" class="av3-boton av3-boton--secundario" id="av3Diagnosticar">Comprobar estado</button>
      <button type="button" class="av3-boton av3-boton--primario" id="av3BuscarVersion">Buscar actualización</button></div>
      <p class="av3-nota">La búsqueda solicita una comprobación al Service Worker. Solo se instalará una versión nueva conforme a la lógica PWA que ya tienes configurada.</p>`;
    app.append(diag);
  }

  function enlazarEventos() {
    const root = elementos.root;
    root.querySelectorAll('[data-av3-ir]').forEach(b => b.addEventListener('click', () => elegirSeccion(b.dataset.av3Ir, true)));
    byId('av3Buscar').addEventListener('input', e => {
      const q = String(e.target.value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      root.querySelectorAll('[data-av3-ir]').forEach(b => {
        const txt = (b.textContent + ' ' + b.dataset.av3Buscar).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        b.hidden = Boolean(q) && !txt.includes(q);
      });
    });
    root.querySelectorAll('[data-av3-setting]').forEach(b => b.addEventListener('click', () => {
      if (!userId) { mostrarMensaje('Inicia sesión para guardar tus preferencias.', true); return; }
      preferencias[b.dataset.av3Setting] = b.dataset.av3Value;
      almacenamientoGuardar(); aplicarPreferencias(); mostrarMensaje('Preferencia guardada en este dispositivo.', false);
    }));
    byId('av3Movimiento').addEventListener('change', e => {
      if (!userId) { e.target.checked = false; mostrarMensaje('Inicia sesión para guardar tus preferencias.', true); return; }
      preferencias.movimiento = Boolean(e.target.checked);
      almacenamientoGuardar(); aplicarPreferencias(); mostrarMensaje('Preferencia guardada en este dispositivo.', false);
    });
    byId('av3ResetPrefs').addEventListener('click', () => {
      if (!userId) return;
      preferencias = { ...DEFAULT }; almacenamientoGuardar(); aplicarPreferencias(); mostrarMensaje('Solo se restablecieron las preferencias visuales de Ajustes V3.', false);
    });
    byId('av3ExportarPrefs').addEventListener('click', exportarPreferencias);
    byId('av3Diagnosticar').addEventListener('click', actualizarDiagnostico);
    byId('av3BuscarVersion').addEventListener('click', buscarActualizacion);
    byId('av3SolicitarPush').addEventListener('click', pedirPermisoPush);
    const select = byId('selectorPerfil');
    if (select) select.addEventListener('change', actualizarPerfilActivo);
    window.addEventListener('online', actualizarDiagnostico);
    window.addEventListener('offline', actualizarDiagnostico);
    // Perfil V2 tiene accesos rápidos a controles existentes; mostrar panel primero.
    const perfil = byId('fpPerfilV2');
    if (perfil) perfil.addEventListener('click', e => {
      const boton = e.target.closest('[data-fp-ir]');
      if (!boton) return;
      const rutas = {
        togglePrivacidadAjustes: 'seguridad',
        toggleRecordatorioMovimientos: 'avisos',
        btnCambiarPasswordAjustes: 'seguridad',
        listaCuentasAjustes: 'finanzas',
        btnExportarCSV: 'datos'
      };
      const ruta = rutas[boton.dataset.fpIr];
      if (ruta) elegirSeccion(ruta, false);
    }, true);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) actualizarDiagnostico();
    });
  }
  function actualizarPerfilActivo() {
    const select = byId('selectorPerfil');
    const label = select && select.selectedOptions.length ? select.selectedOptions[0].textContent.trim() : 'No disponible';
    texto(byId('av3PerfilActivo'), label);
    texto(byId('av3Contexto'), label);
  }
  function actualizarDiagnostico() {
    if (!elementos) return;
    const online = navigator.onLine !== false;
    texto(byId('av3Conexion'), online ? 'Con conexión' : 'Sin conexión');
    texto(byId('av3ConexionSuperior'), online ? 'Conectado' : 'Sin conexión');
    const dot = byId('av3Punto');
    if (dot) dot.classList.toggle('av3-offline', !online);
    texto(byId('av3Auth'), window.App && window.App.auth && window.App.auth.currentUser ? 'Sesión iniciada' : 'Sin sesión');
    const push = 'Notification' in window ? Notification.permission : 'no compatible';
    texto(byId('av3PermisoPush'), ({ granted: 'Permitidas', denied: 'Bloqueadas', default: 'Sin configurar' })[push] || 'No compatible');
    actualizarPerfilActivo();
    if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistration) {
      const url = obtenerBasePWA();
      navigator.serviceWorker.getRegistration(url).then(reg => {
        if (!elementos) return;
        texto(byId('av3SW'), reg && reg.active ? 'Activo' : reg ? 'Instalándose' : 'No registrado');
      }).catch(() => texto(byId('av3SW'), 'No disponible'));
    } else texto(byId('av3SW'), 'No compatible');
  }
  function obtenerBasePWA() {
    const manifest = document.querySelector('link[rel="manifest"]');
    try { return new URL('.', manifest ? manifest.href : location.href).href; }
    catch (_) { return location.href; }
  }
  async function buscarActualizacion() {
    const boton = byId('av3BuscarVersion');
    if (!('serviceWorker' in navigator)) return mostrarMensaje('Este navegador no admite Service Workers.', true);
    boton.disabled = true;
    try {
      const reg = await navigator.serviceWorker.getRegistration(obtenerBasePWA());
      if (!reg) return mostrarMensaje('No hay una PWA registrada para esta dirección.', true);
      await reg.update();
      mostrarMensaje(reg.waiting ? 'Hay una actualización instalada esperando tu confirmación.' : 'Se solicitó la comprobación. Si hay una nueva versión, Finora mostrará su aviso de actualización.', false);
      actualizarDiagnostico();
    } catch (e) { mostrarMensaje('No se pudo comprobar la actualización. Revisa la conexión y vuelve a intentar.', true); }
    finally { boton.disabled = false; }
  }
  async function pedirPermisoPush() {
    if (!('Notification' in window)) return mostrarMensaje('Tu navegador no admite estas notificaciones.', true);
    if (Notification.permission === 'denied') return mostrarMensaje('Las notificaciones están bloqueadas. Actívalas desde los ajustes del navegador o dispositivo.', true);
    try {
      const permiso = await Notification.requestPermission();
      actualizarDiagnostico();
      mostrarMensaje(permiso === 'granted' ? 'Permiso concedido. Comprueba también los avisos push de Finora.' : 'No se concedió el permiso. Puedes revisar la configuración del navegador.', permiso !== 'granted');
    } catch (_) { mostrarMensaje('No fue posible solicitar permiso en este navegador.', true); }
  }
  function exportarPreferencias() {
    if (!userId) return mostrarMensaje('Debes iniciar sesión.', true);
    const datos = { app: 'Finora', modulo: 'Ajustes V3', version: VERSION, exportado: new Date().toISOString(), preferenciasVisuales: { ...preferencias } };
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'finora-preferencias-v3.json';
    a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    mostrarMensaje('Preferencias exportadas. Esto no incluye movimientos ni contraseñas.', false);
  }
  function aplicarSesion(usuario) {
    userId = usuario && usuario.uid ? usuario.uid : null;
    preferencias = almacenamientoLeer(userId);
    aplicarPreferencias(); actualizarDiagnostico();
    if (!userId) elegirSeccion('perfil', false);
  }
  function iniciar() {
    if (iniciado) return;
    if (!crearInterfaz()) return;
    iniciado = true;
    if (window.App && window.App.auth && typeof window.App.auth.onAuthStateChanged === 'function') {
      window.App.auth.onAuthStateChanged(aplicarSesion);
    } else {
      console.warn('[Finora Ajustes V3] No se encontró Firebase Auth.');
      aplicarSesion(null);
    }
    actualizarDiagnostico();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  else iniciar();
})();
