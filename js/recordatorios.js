// Finora V2: avisos locales y recordatorios push programados desde Firebase.
// El envío con Finora cerrada utiliza GitHub Actions + FCM, sin Cloud Functions.
(function() {
  'use strict';

  const App = window.App;
  if (!App || !App.auth) return;

  const CLAVE_BASE = 'finora_recordatorio_movimientos_';
  const HORA_DEFECTO = '20:00';
  const INTERVALO_MS = 60 * 1000;
  // Clave pública Web Push (VAPID), igual a la que usa ui-main.js. NO es privada.
  const VAPID_PUBLICA = 'BBi6ZoZTitsdB3U53vlaLFA718CvOo1dvupA7IxoARjlrQLgGb5tUUaUsIyin9-wfY5PYUIKbT4m4rcqVBxIIQg';
  let usuarioId = null;
  let comprobando = false;
  let pushEnEsteDispositivo = false;
  let cancelacionForeground = null;

  function clave(nombre) {
    return CLAVE_BASE + usuarioId + '_' + nombre;
  }

  function fechaLocal(ahora) {
    return [
      ahora.getFullYear(),
      String(ahora.getMonth() + 1).padStart(2, '0'),
      String(ahora.getDate()).padStart(2, '0')
    ].join('-');
  }

  function horaValida(valor) {
    return typeof valor === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
  }

  function zonaHoraria() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';
    } catch (_) {
      return 'America/Bogota';
    }
  }

  // Los datos se guardan en el perfil existente. Las reglas actualizadas de
  // Finora permiten editar estos campos, pero NO el rol de administrador.
  async function guardarConfiguracionRemota() {
    if (!usuarioId) return false;
    const idEnEstaOperacion = usuarioId;
    const config = {
      'recordatorioPush.activo': habilitado(),
      'recordatorioPush.hora': horaConfigurada(),
      'recordatorioPush.zonaHoraria': zonaHoraria()
    };
    try {
      await App.db.collection('usuarios').doc(idEnEstaOperacion).update(config);
      return true;
    } catch (error) {
      console.warn('No se guardó el recordatorio en Firebase:', error);
      if (usuarioId === idEnEstaOperacion) {
        estado('Aviso local activo. No se pudo guardar la configuración en Firebase.');
      }
      return false;
    }
  }

  // Recupera las preferencias guardadas en la cuenta de Firebase.
  async function cargarConfiguracionRemota(id) {
    try {
      const perfil = await App.db.collection('usuarios').doc(id).get();
      if (usuarioId !== id) return;
      const config = perfil.exists && perfil.data() ? perfil.data().recordatorioPush : null;
      if (config && typeof config.activo === 'boolean') {
        localStorage.setItem(clave('activo'), String(config.activo));
        if (horaValida(config.hora)) localStorage.setItem(clave('hora'), config.hora);
      } else if (habilitado()) {
        // Migración de una configuración V1 que solo estaba en el navegador.
        await guardarConfiguracionRemota();
      }
      actualizarControles();
      comprobarRecordatorio();
    } catch (error) {
      console.warn('No se pudieron leer las preferencias remotas:', error);
      actualizarControles();
    }
  }

  function estado(mensaje) {
    const el = document.getElementById('estadoRecordatorioMovimientos');
    if (el) el.textContent = mensaje;
  }

  function ocultarAviso() {
    document.getElementById('avisoRecordatorioMovimientos')?.classList.add('hidden');
  }

  function mostrarAviso() {
    const aviso = document.getElementById('avisoRecordatorioMovimientos');
    if (!aviso || document.getElementById('appShell')?.classList.contains('hidden')) return false;
    aviso.classList.remove('hidden');
    return true;
  }

  function habilitado() {
    return !!usuarioId && localStorage.getItem(clave('activo')) === 'true';
  }

  function horaConfigurada() {
    const hora = usuarioId ? localStorage.getItem(clave('hora')) : null;
    return horaValida(hora) ? hora : HORA_DEFECTO;
  }

  function actualizarControles() {
    const toggle = document.getElementById('toggleRecordatorioMovimientos');
    const hora = document.getElementById('horaRecordatorioMovimientos');
    const permisoBtn = document.getElementById('btnPermisoRecordatorios');
    if (toggle) {
      toggle.checked = habilitado();
      toggle.disabled = !usuarioId;
    }
    if (hora) {
      hora.value = horaConfigurada();
      hora.disabled = !usuarioId;
    }
    if (permisoBtn) {
      permisoBtn.disabled = !usuarioId || !('Notification' in window);
    }
    if (!usuarioId) {
      estado('Inicia sesión para configurar el recordatorio.');
    } else if (!habilitado()) {
      estado('Recordatorio desactivado.');
    } else {
      estado('Recordatorio diario a las ' + horaConfigurada() + (pushEnEsteDispositivo ? ' · Push activado en este dispositivo.' : ' · Activa las alertas push para recibir avisos con Finora cerrada.'));
    }
  }

  async function enviarAvisoDispositivo(fecha) {
    // Si este dispositivo ya recibe push, evitamos una segunda notificación local.
    if (pushEnEsteDispositivo) return false;
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    if (!('serviceWorker' in navigator)) return false;
    try {
      // Utilizar el Service Worker de Finora, no el de Firebase Messaging.
      const registration = await navigator.serviceWorker.getRegistration('./');
      if (!registration || !registration.active) return false;
      await registration.showNotification('Finora · Registra tus movimientos', {
        body: '¿Ya anotaste tus ingresos y gastos de hoy?',
        icon: './logo-192.png',
        badge: './logo-192.png',
        tag: 'finora-recordatorio-' + fecha
      });
      return true;
    } catch (error) {
      console.warn('No se pudo mostrar el aviso del dispositivo:', error);
      return false;
    }
  }

  async function comprobarRecordatorio() {
    if (comprobando || !habilitado()) return;

    const ahora = new Date();
    const hoy = fechaLocal(ahora);
    const horaActual = String(ahora.getHours()).padStart(2, '0') + ':' +
      String(ahora.getMinutes()).padStart(2, '0');
    if (horaActual < horaConfigurada() || localStorage.getItem(clave('ultimoAviso')) === hoy) return;

    comprobando = true;
    const usuarioAlComenzar = usuarioId;
    try {
      let mostrado = false;
      if (document.visibilityState === 'visible') {
        mostrado = mostrarAviso();
      } else {
        mostrado = await enviarAvisoDispositivo(hoy);
      }
      // Solo marcar como enviado cuando efectivamente se ha mostrado algo.
      if (mostrado && usuarioId === usuarioAlComenzar && habilitado()) {
        localStorage.setItem(clave('ultimoAviso'), hoy);
      }
    } finally {
      comprobando = false;
    }
  }

  async function registrarPush() {
    if (!usuarioId || !App.auth.currentUser || App.auth.currentUser.uid !== usuarioId) {
      estado('Primero debes iniciar sesión.');
      return;
    }
    if (!('Notification' in window) || !('serviceWorker' in navigator) ||
        !('PushManager' in window) || !firebase.messaging.isSupported()) {
      estado('Este navegador no admite las notificaciones push de Firebase.');
      return;
    }

    const boton = document.getElementById('btnPermisoRecordatorios');
    if (boton) boton.disabled = true;
    const idAlComenzar = usuarioId;
    try {
      // Solicitud de permiso a partir de un clic real del usuario.
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') {
        estado('Permiso denegado. Seguirás recibiendo avisos cuando abras Finora.');
        return;
      }
      // Usamos exactamente el mismo Service Worker y la misma VAPID que ui-main.js.
      const registro = await navigator.serviceWorker.register(
        '/finanzas/firebase-messaging-sw.js',
        { scope: '/finanzas/firebase-cloud-messaging-push-scope' }
      );
      const token = await firebase.messaging().getToken({
        vapidKey: VAPID_PUBLICA,
        serviceWorkerRegistration: registro
      });
      if (!token) throw new Error('Firebase no devolvió un token.');
      if (usuarioId !== idAlComenzar || App.auth.currentUser?.uid !== idAlComenzar) return;
      // Actualizar directamente: guardarTokenNotificacion() en versiones
      // anteriores absorbía errores y podía aparentar un guardado exitoso.
      // El perfil ya debe existir para conservar las reglas de seguridad.
      await App.db.collection('usuarios').doc(idAlComenzar).update({ fcmToken: token });
      pushEnEsteDispositivo = true;
      localStorage.setItem(clave('pushConfigurado'), 'true');
      const toggleGeneral = document.getElementById('toggleNotificaciones');
      if (toggleGeneral) toggleGeneral.checked = true;
      localStorage.setItem('notificacionesActivas', 'true');
      const guardado = await guardarConfiguracionRemota();
      actualizarControles();
      if (guardado) {
        estado(habilitado()
          ? 'Push activado. Recibirás recordatorios aproximadamente a las ' + horaConfigurada() + ', incluso con Finora cerrada (cuando GitHub Actions esté configurado).'
          : 'Push preparado. Activa el recordatorio diario para empezar a recibir avisos.');
      }
    } catch (error) {
      console.error('No se pudo activar push:', error);
      estado('No se pudo activar push: ' + (error.message || 'Comprueba los permisos del navegador.'));
    } finally {
      if (boton) boton.disabled = false;
    }
  }

  function escucharMensajesEnPrimerPlano() {
    if (cancelacionForeground || !('Notification' in window)) return;
    try {
      if (!firebase.messaging.isSupported()) return;
      cancelacionForeground = firebase.messaging().onMessage(function(payload) {
        if (payload?.data?.tipo !== 'recordatorio_movimientos' || !usuarioId || !habilitado()) return;
        const hoy = fechaLocal(new Date());
        if (localStorage.getItem(clave('ultimoAviso')) === hoy) return;
        if (mostrarAviso()) localStorage.setItem(clave('ultimoAviso'), hoy);
      });
    } catch (error) {
      console.warn('No se pudo escuchar FCM en primer plano:', error);
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('toggleRecordatorioMovimientos');
    const hora = document.getElementById('horaRecordatorioMovimientos');
    const permisoBtn = document.getElementById('btnPermisoRecordatorios');

    toggle?.addEventListener('change', async function() {
      if (!usuarioId) return;
      localStorage.setItem(clave('activo'), String(this.checked));
      if (!this.checked) ocultarAviso();
      actualizarControles();
      await guardarConfiguracionRemota();
      if (this.checked) comprobarRecordatorio();
    });

    hora?.addEventListener('change', async function() {
      if (!usuarioId || !horaValida(this.value)) return;
      localStorage.setItem(clave('hora'), this.value);
      actualizarControles();
      await guardarConfiguracionRemota();
      comprobarRecordatorio();
    });

    permisoBtn?.addEventListener('click', registrarPush);

    document.getElementById('btnCerrarRecordatorioMovimientos')?.addEventListener('click', ocultarAviso);
    document.getElementById('btnRegistrarDesdeRecordatorio')?.addEventListener('click', function() {
      ocultarAviso();
      if (typeof App.cambiarVista === 'function') App.cambiarVista('vistaInicio');
      // Mantiene el flujo existente de creación de movimientos.
      document.getElementById('fabAgregar')?.click();
      document.getElementById('tabGasto')?.click();
    });

    App.auth.onAuthStateChanged(function(usuario) {
      usuarioId = usuario ? usuario.uid : null;
      pushEnEsteDispositivo = !!usuarioId &&
        localStorage.getItem(clave('pushConfigurado')) === 'true' &&
        'Notification' in window && Notification.permission === 'granted';
      ocultarAviso();
      actualizarControles();
      if (usuarioId) {
        escucharMensajesEnPrimerPlano();
        cargarConfiguracionRemota(usuarioId);
      }
    });

    // El interruptor push original de ui-main.js también debe detener los
    // recordatorios si se apaga; el token por sí solo NO determina los envíos.
    document.getElementById('toggleNotificaciones')?.addEventListener('change', function() {
      if (!this.checked && usuarioId) {
        localStorage.setItem(clave('activo'), 'false');
        ocultarAviso();
        actualizarControles();
        guardarConfiguracionRemota();
      }
    });

    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') comprobarRecordatorio();
    });
    window.addEventListener('focus', comprobarRecordatorio);
    window.setInterval(comprobarRecordatorio, INTERVALO_MS);
    actualizarControles();
  });
})();
