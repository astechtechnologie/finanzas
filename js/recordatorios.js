// Finora: recordatorio local para registrar ingresos y gastos.
// No programa mensajes FCM ni funciona como alarma con la PWA cerrada.
(function() {
  'use strict';

  const App = window.App;
  if (!App || !App.auth) return;

  const CLAVE_BASE = 'finora_recordatorio_movimientos_';
  const HORA_DEFECTO = '20:00';
  const INTERVALO_MS = 60 * 1000;
  let usuarioId = null;
  let comprobando = false;

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
      estado('Recordatorio diario activo a las ' + horaConfigurada() + '.');
    }
  }

  async function enviarAvisoDispositivo(fecha) {
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

  document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('toggleRecordatorioMovimientos');
    const hora = document.getElementById('horaRecordatorioMovimientos');
    const permisoBtn = document.getElementById('btnPermisoRecordatorios');

    toggle?.addEventListener('change', function() {
      if (!usuarioId) return;
      localStorage.setItem(clave('activo'), String(this.checked));
      if (!this.checked) ocultarAviso();
      actualizarControles();
      if (this.checked) comprobarRecordatorio();
    });

    hora?.addEventListener('change', function() {
      if (!usuarioId || !horaValida(this.value)) return;
      localStorage.setItem(clave('hora'), this.value);
      actualizarControles();
      comprobarRecordatorio();
    });

    permisoBtn?.addEventListener('click', async function() {
      if (!('Notification' in window)) {
        estado('Este navegador no admite notificaciones del dispositivo.');
        return;
      }
      try {
        const permiso = await Notification.requestPermission();
        if (permiso === 'granted') {
          estado('Avisos del dispositivo permitidos. Mantén la pestaña abierta para los recordatorios automáticos.');
        } else {
          estado('Permiso no concedido. Seguirás viendo avisos dentro de Finora.');
        }
      } catch (error) {
        estado('No fue posible solicitar el permiso. Se usarán avisos dentro de Finora.');
      }
    });

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
      ocultarAviso();
      actualizarControles();
      if (usuarioId) comprobarRecordatorio();
    });

    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') comprobarRecordatorio();
    });
    window.addEventListener('focus', comprobarRecordatorio);
    window.setInterval(comprobarRecordatorio, INTERVALO_MS);
    actualizarControles();
  });
})();
