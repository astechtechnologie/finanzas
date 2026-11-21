/*
 * FINORA · Perfil de usuario y Ajustes V2
 * Módulo independiente. NO reemplaza auth.js, storage.js, ui-main.js ni app.js.
 * Datos: usuarios/{uid}/preferencias/perfil-v2 (solo usuario autenticado).
 */
(function () {
  'use strict';

  const AVATARES = Object.freeze({
    gem: { emoji: '💎', nombre: 'Diamante' },
    user: { emoji: '👤', nombre: 'Persona' },
    sunrise: { emoji: '🌅', nombre: 'Amanecer' },
    leaf: { emoji: '🌿', nombre: 'Naturaleza' },
    fox: { emoji: '🦊', nombre: 'Zorro' },
    cat: { emoji: '🐱', nombre: 'Gato' },
    star: { emoji: '⭐', nombre: 'Estrella' },
    rocket: { emoji: '🚀', nombre: 'Cohete' },
    flower: { emoji: '🌸', nombre: 'Flor' },
    coffee: { emoji: '☕', nombre: 'Café' },
    moon: { emoji: '🌙', nombre: 'Luna' },
    heart: { emoji: '💛', nombre: 'Corazón' }
  });
  const RUTA = ['usuarios', 'preferencias', 'perfil-v2'];
  const NOMBRE_MAX = 60;
  let iniciado = false;
  let usuario = null;
  let cancelarEscucha = null;
  let secuencia = 0;
  let guardando = false;
  let sinGuardar = false;
  let avatarElegido = 'gem';
  let ajustes = { nombre: '', avatar: 'gem', compacto: false };
  let refs = {};

  function elemento(id) { return document.getElementById(id); }
  function leerLocal(clave) { try { return localStorage.getItem(clave); } catch (error) { return null; } }
  function avatarSeguro(key) { return Object.prototype.hasOwnProperty.call(AVATARES, key) ? key : 'gem'; }
  function nombreSeguro(txt) { return String(txt || '').replace(/\s+/g, ' ').trim().slice(0, NOMBRE_MAX); }
  function nombreDesdeAuth(user) { return nombreSeguro(user && user.displayName) || String(user && user.email || 'Usuario').split('@')[0]; }
  function aviso(msg, error) {
    if (!refs.estado) return;
    refs.estado.textContent = msg;
    refs.estado.dataset.error = error ? 'true' : 'false';
  }
  function enlaceAControl(id, abrir) {
    const el = elemento(id);
    if (!el) { aviso('Este ajuste no está disponible en la versión instalada.', true); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (abrir && typeof el.click === 'function') el.click();
    else if (typeof el.focus === 'function') el.focus({ preventScroll: true });
  }
  function crearInterfaz() {
    const vista = elemento('vistaAjustes');
    if (!vista || elemento('fpPerfilV2')) return false;
    const panel = vista.querySelector('.ajustes-panel');
    if (!panel) return false;

    const contenido = document.createElement('section');
    contenido.id = 'fpPerfilV2';
    contenido.className = 'fpv2';
    contenido.setAttribute('aria-labelledby', 'fpTitulo');
    contenido.hidden = true;
    contenido.innerHTML = `
      <div class="fpv2-hero">
        <div class="fpv2-heading"><span class="fpv2-kicker">MI FINORA</span><h3 id="fpTitulo">Mi perfil</h3><p>Personaliza tu cuenta sin modificar tus finanzas.</p></div>
        <div class="fpv2-avatar-grande" id="fpAvatarGrande" aria-hidden="true">💎</div>
        <div class="fpv2-identidad"><strong id="fpNombreActual">Usuario</strong><span id="fpCorreoActual"></span></div>
        <span class="fpv2-sello" id="fpTipoPerfil">Configuración individual</span>
      </div>
      <div class="fpv2-layout">
        <form id="fpFormulario" class="fpv2-card" novalidate>
          <div class="fpv2-card-head"><div><h4>Información personal</h4><p>Tu nombre y avatar se guardan en tu cuenta.</p></div><span aria-hidden="true">✏️</span></div>
          <label class="fpv2-label" for="fpNombre">Nombre para mostrar</label>
          <input class="fpv2-input" id="fpNombre" type="text" maxlength="60" autocomplete="name" placeholder="Escribe tu nombre" required />
          <label class="fpv2-label" for="fpCorreo">Correo electrónico</label>
          <input class="fpv2-input fpv2-input--readonly" id="fpCorreo" type="email" readonly aria-readonly="true" />
          <p class="fpv2-ayuda">El correo no se cambia aquí. La información financiera y los permisos de acceso permanecen intactos.</p>
          <span class="fpv2-label" id="fpAvatarLabel">Elige tu avatar</span>
          <div class="fpv2-avatares" id="fpAvatares" role="group" aria-labelledby="fpAvatarLabel"></div>
          <label class="fpv2-check"><input type="checkbox" id="fpCompacto" /><span><strong>Vista compacta del perfil</strong><small>Muestra los controles de esta sección más juntos.</small></span></label>
          <div class="fpv2-acciones"><button class="fpv2-boton fpv2-boton--principal" type="submit" id="fpGuardar">Guardar cambios</button><span class="fpv2-estado" id="fpEstado" role="status" aria-live="polite"></span></div>
        </form>
        <div class="fpv2-lateral">
          <section class="fpv2-card fpv2-card--secondary" aria-labelledby="fpPersonalizarTitulo">
            <div class="fpv2-card-head"><div><h4 id="fpPersonalizarTitulo">Apariencia</h4><p>Utiliza el tema ya configurado en Finora.</p></div><span aria-hidden="true">🎨</span></div>
            <div class="fpv2-temas" id="fpTemas" role="group" aria-label="Elegir tema visual">
              <button type="button" data-fp-tema="light">☀️ Claro</button>
              <button type="button" data-fp-tema="dark">🌙 Oscuro</button>
              <button type="button" data-fp-tema="system">⚙️ Sistema</button>
            </div>
            <div class="fpv2-estado-linea"><span>Privacidad de montos</span><strong id="fpPrivacidadEstado">—</strong></div>
            <button type="button" class="fpv2-link" data-fp-ir="togglePrivacidadAjustes">Ir al control de privacidad <span aria-hidden="true">→</span></button>
          </section>
          <section class="fpv2-card fpv2-card--secondary" aria-labelledby="fpAccesosTitulo">
            <div class="fpv2-card-head"><div><h4 id="fpAccesosTitulo">Accesos rápidos</h4><p>Las opciones originales de Ajustes siguen disponibles.</p></div><span aria-hidden="true">⚡</span></div>
            <div class="fpv2-accesos">
              <button type="button" data-fp-ir="toggleRecordatorioMovimientos">🔔 <span>Recordatorios</span><span aria-hidden="true">→</span></button>
              <button type="button" data-fp-ir="btnCambiarPasswordAjustes" data-fp-abrir="true">🔒 <span>Cambiar contraseña</span><span aria-hidden="true">→</span></button>
              <button type="button" data-fp-ir="listaCuentasAjustes">💳 <span>Mis cuentas</span><span aria-hidden="true">→</span></button>
              <button type="button" data-fp-ir="btnExportarCSV">📤 <span>Exportar movimientos</span><span aria-hidden="true">→</span></button>
            </div>
          </section>
          <section class="fpv2-card fpv2-card--secondary" aria-labelledby="fpCuentaTitulo">
            <div class="fpv2-card-head"><div><h4 id="fpCuentaTitulo">Estado de la cuenta</h4><p>Información de esta sesión.</p></div><span aria-hidden="true">🛡️</span></div>
            <div class="fpv2-estado-linea"><span>Conexión</span><strong id="fpConexion">—</strong></div>
            <div class="fpv2-estado-linea"><span>Notificaciones del navegador</span><strong id="fpPermiso">—</strong></div>
            <div class="fpv2-estado-linea"><span>Verificación de correo</span><strong id="fpVerificado">—</strong></div>
            <small class="fpv2-nota">Este panel no cambia la contraseña, el rol ni los accesos a espacios compartidos.</small>
          </section>
        </div>
      </div>`;
    const tituloAnterior = panel.querySelector('h2');
    if (tituloAnterior) tituloAnterior.insertAdjacentElement('afterend', contenido);
    else panel.prepend(contenido);
    refs = {
      seccion: contenido, form: elemento('fpFormulario'), nombre: elemento('fpNombre'),
      correo: elemento('fpCorreo'), avatares: elemento('fpAvatares'),
      avatarGrande: elemento('fpAvatarGrande'), nombreActual: elemento('fpNombreActual'),
      correoActual: elemento('fpCorreoActual'), tipoPerfil: elemento('fpTipoPerfil'),
      compacto: elemento('fpCompacto'), guardar: elemento('fpGuardar'),
      estado: elemento('fpEstado'), tema: elemento('fpTemas'),
      privacidad: elemento('fpPrivacidadEstado'), conexion: elemento('fpConexion'),
      permiso: elemento('fpPermiso'), verificado: elemento('fpVerificado')
    };
    crearAvatares();
    configurarEventos();
    actualizarApariencia();
    actualizarEstadoDispositivo();
    return true;
  }
  function crearAvatares() {
    Object.keys(AVATARES).forEach(function (key) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'fpv2-avatar-opcion';
      btn.dataset.avatar = key;
      btn.setAttribute('aria-label', AVATARES[key].nombre);
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = AVATARES[key].emoji;
      refs.avatares.appendChild(btn);
    });
  }
  function elegirAvatar(key) {
    avatarElegido = avatarSeguro(key);
    refs.avatarGrande.textContent = AVATARES[avatarElegido].emoji;
    refs.avatares.querySelectorAll('[data-avatar]').forEach(function (btn) {
      const activo = btn.dataset.avatar === avatarElegido;
      btn.classList.toggle('selected', activo);
      btn.setAttribute('aria-pressed', String(activo));
    });
  }
  function estadoVista() {
    refs.nombreActual.textContent = refs.nombre.value.trim() || nombreDesdeAuth(usuario);
    refs.correoActual.textContent = usuario && usuario.email || '';
    refs.tipoPerfil.textContent = leerLocal('perfilActivo') === 'espacio'
      ? 'Tu perfil individual · Espacio compartido activo'
      : 'Tu perfil individual';
    refs.seccion.classList.toggle('fpv2--compacto', refs.compacto.checked);
  }
  function pintarPerfil(datos) {
    if (!usuario || !refs.form || guardando || sinGuardar) return;
    const nombre = nombreSeguro(datos.nombre) || nombreDesdeAuth(usuario);
    refs.nombre.value = nombre;
    elegirAvatar(avatarSeguro(datos.avatar));
    refs.compacto.checked = datos.compacto === true;
    estadoVista();
  }
  function actualizarEstadoDispositivo() {
    if (!refs.seccion) return;
    refs.conexion.textContent = navigator.onLine ? 'En línea' : 'Sin conexión';
    refs.verificado.textContent = usuario ? (usuario.emailVerified ? 'Verificado' : 'No verificado') : '—';
    const permiso = ('Notification' in window) ? window.Notification.permission : 'unsupported';
    refs.permiso.textContent = { granted: 'Permitidas', denied: 'Bloqueadas', default: 'No configuradas', unsupported: 'No compatible' }[permiso] || 'No disponible';
  }
  function actualizarApariencia() {
    if (!refs.tema) return;
    const selector = elemento('temaSelector');
    const activo = selector ? selector.value : (leerLocal('tema_preferido') || 'system');
    refs.tema.querySelectorAll('[data-fp-tema]').forEach(function (btn) {
      const es = btn.dataset.fpTema === activo;
      btn.classList.toggle('selected', es);
      btn.setAttribute('aria-pressed', String(es));
    });
    const privacidad = elemento('togglePrivacidadAjustes');
    refs.privacidad.textContent = privacidad ? (privacidad.checked ? 'Montos ocultos' : 'Montos visibles') : 'No disponible';
  }
  function configurarEventos() {
    refs.avatares.addEventListener('click', function (ev) {
      const btn = ev.target.closest('[data-avatar]');
      if (!btn || !usuario) return;
      elegirAvatar(btn.dataset.avatar); sinGuardar = true; aviso('Cambios sin guardar.', false);
    });
    refs.nombre.addEventListener('input', function () { sinGuardar = true; estadoVista(); aviso('Cambios sin guardar.', false); });
    refs.compacto.addEventListener('change', function () { sinGuardar = true; estadoVista(); aviso('Cambios sin guardar.', false); });
    refs.form.addEventListener('submit', guardarPerfil);
    refs.tema.addEventListener('click', function (ev) {
      const boton = ev.target.closest('[data-fp-tema]');
      const selector = elemento('temaSelector');
      if (!boton || !selector) return;
      selector.value = boton.dataset.fpTema;
      selector.dispatchEvent(new Event('change', { bubbles: true }));
      actualizarApariencia();
    });
    refs.seccion.querySelectorAll('[data-fp-ir]').forEach(function (btn) {
      btn.addEventListener('click', function () { enlaceAControl(btn.dataset.fpIr, btn.dataset.fpAbrir === 'true'); });
    });
    const temaOriginal = elemento('temaSelector');
    if (temaOriginal) temaOriginal.addEventListener('change', actualizarApariencia);
    const privacidadOriginal = elemento('togglePrivacidadAjustes');
    if (privacidadOriginal) privacidadOriginal.addEventListener('change', actualizarApariencia);
    window.addEventListener('online', actualizarEstadoDispositivo);
    window.addEventListener('offline', actualizarEstadoDispositivo);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { actualizarEstadoDispositivo(); estadoVista(); actualizarApariencia(); }
    });
    const selectorPerfil = elemento('selectorPerfil');
    if (selectorPerfil) selectorPerfil.addEventListener('change', function () { estadoVista(); });
  }
  function rutaUsuario(uid) {
    return window.App.db.collection(RUTA[0]).doc(uid).collection(RUTA[1]).doc(RUTA[2]);
  }
  function limpiarSesion() {
    secuencia++;
    if (typeof cancelarEscucha === 'function') cancelarEscucha();
    cancelarEscucha = null;
    usuario = null;
    guardando = false; sinGuardar = false;
    ajustes = { nombre: '', avatar: 'gem', compacto: false };
    refs.seccion.hidden = true;
    refs.nombre.value = ''; refs.correo.value = ''; refs.nombreActual.textContent = '';
    aviso('', false);
  }
  function iniciarSesion(user) {
    if (!refs.seccion) return;
    limpiarSesion();
    if (!user) return;
    usuario = user;
    const token = ++secuencia;
    refs.seccion.hidden = false;
    refs.correo.value = user.email || '';
    pintarPerfil({ nombre: nombreDesdeAuth(user), avatar: 'gem', compacto: false });
    actualizarEstadoDispositivo();
    aviso('Cargando tu perfil…', false);
    try {
      cancelarEscucha = rutaUsuario(user.uid).onSnapshot(function (doc) {
        if (!usuario || usuario.uid !== user.uid || token !== secuencia) return;
        ajustes = doc.exists ? doc.data() || {} : {};
        pintarPerfil(ajustes);
        if (!sinGuardar && !guardando) aviso('', false);
      }, function (error) {
        if (token !== secuencia) return;
        console.error('[Finora Perfil V2] No se pudo leer el perfil:', error);
        aviso('No se pudo sincronizar tu perfil. Revisa las reglas de Firestore y la conexión.', true);
      });
    } catch (error) {
      console.error('[Finora Perfil V2]', error);
      aviso('No se pudo consultar el perfil.', true);
    }
  }
  async function guardarPerfil(evento) {
    evento.preventDefault();
    if (!usuario || guardando) return;
    const nombre = nombreSeguro(refs.nombre.value);
    if (nombre.length < 2) { aviso('Escribe un nombre de al menos 2 caracteres.', true); refs.nombre.focus(); return; }
    const user = usuario;
    const token = secuencia;
    const datos = { nombre: nombre, avatar: avatarSeguro(avatarElegido), compacto: refs.compacto.checked };
    guardando = true;
    refs.guardar.disabled = true;
    aviso('Guardando…', false);
    try {
      await rutaUsuario(user.uid).set({
        nombre: datos.nombre,
        avatar: datos.avatar,
        compacto: datos.compacto,
        actualizadoEn: window.firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      if (!usuario || usuario.uid !== user.uid || token !== secuencia) return;
      ajustes = datos; sinGuardar = false;
      // Sincroniza el nombre de presentación de Firebase Authentication, sin tocar correo/roles.
      let avisoAuth = '';
      if (nombre !== user.displayName && typeof user.updateProfile === 'function') {
        try { await user.updateProfile({ displayName: nombre }); }
        catch (err) { console.warn('[Finora Perfil V2] Nombre en Auth pendiente:', err); avisoAuth = ' Perfil guardado; no se actualizó el nombre en Authentication.'; }
      }
      if (token !== secuencia) return;
      pintarPerfil(datos);
      aviso('Cambios guardados correctamente.' + avisoAuth, Boolean(avisoAuth));
    } catch (err) {
      if (token !== secuencia) return;
      console.error('[Finora Perfil V2] Error guardando:', err);
      aviso('No fue posible guardar. Revisa tu conexión y permisos de Firestore.', true);
    } finally {
      if (token === secuencia) { guardando = false; refs.guardar.disabled = false; }
    }
  }
  function iniciar() {
    if (iniciado) return;
    if (!window.App || !window.App.auth || !window.App.db || !window.firebase || !window.firebase.firestore) {
      console.warn('[Finora Perfil V2] Firebase no disponible.'); return;
    }
    if (!crearInterfaz()) { console.warn('[Finora Perfil V2] No se encontró vistaAjustes.'); return; }
    iniciado = true;
    window.App.auth.onAuthStateChanged(iniciarSesion);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  else iniciar();
})();
