/*
 * Finora PWA: actualizaciones seguras sin cambiar Firebase ni módulos financieros.
 * Detección mediante instalación de Service Worker + validadores HTTP de archivos.
 * No necesita servidor, plan de pago ni editar una versión a mano en cada despliegue.
 */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;

  const BASE = new URL('./', document.baseURI);
  const KEY = 'finora:pwa:huella-activa:v1';
  const PENDING = 'finora:pwa:huella-por-aplicar:v1';
  const SNOOZE = 'finora:pwa:aplazar-hasta:v1';
  const CHECK_INTERVAL = 15 * 60 * 1000;
  const MIN_CHECK_GAP = 45 * 1000;
  const TRACKED_FILES = [
    'index.html', 'css/styles.css', 'sw.js',
    'js/app.js', 'js/ui-main.js', 'js/ui-presupuesto.js',
    'js/charts.js', 'js/onboarding.js', 'js/firebase-config.js',
    'js/iconos.js', 'js/panel-compartido.js',
    'js/division-gastos.js', 'js/mercado-motor.js',
    'js/mercado-inteligente.js', 'js/recordatorios.js',
    'js/encabezado-finora.js', 'js/storage.js', 'js/auth.js',
    'js/pwa-actualizaciones.js'
  ];

  let registration = null;
  let candidate = null;
  let waitingWorker = null;
  let checking = false;
  let lastChecked = 0;
  let activating = false;
  let dismissedUntil = 0;

  function readStore(store, key) {
    try { return store.getItem(key); } catch (_) { return null; }
  }
  function writeStore(store, key, value) {
    try { store.setItem(key, value); } catch (_) { /* navegación privada */ }
  }
  function removeStore(store, key) {
    try { store.removeItem(key); } catch (_) { /* navegación privada */ }
  }

  function ui() {
    let banner = document.getElementById('finoraAvisoActualizacion');
    if (banner) return banner;
    banner = document.createElement('aside');
    banner.id = 'finoraAvisoActualizacion';
    banner.className = 'finora-pwa-update';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.hidden = true;
    banner.innerHTML = [
      '<div class="finora-pwa-update__icon" aria-hidden="true">↻</div>',
      '<div class="finora-pwa-update__content">',
      '  <strong>Nueva versión de Finora</strong>',
      '  <span>Actualiza cuando termines de guardar tus movimientos.</span>',
      '  <div class="finora-pwa-update__buttons">',
      '    <button type="button" id="finoraActualizarAhora">Actualizar ahora</button>',
      '    <button type="button" id="finoraActualizarDespues">Más tarde</button>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(banner);
    banner.querySelector('#finoraActualizarAhora').addEventListener('click', applyUpdate);
    banner.querySelector('#finoraActualizarDespues').addEventListener('click', function () {
      dismissedUntil = Date.now() + 10 * 60 * 1000;
      writeStore(localStorage, SNOOZE, String(dismissedUntil));
      banner.hidden = true;
    });
    return banner;
  }

  function offerUpdate() {
    if (Date.now() < dismissedUntil) return;
    const banner = ui();
    banner.hidden = false;
  }

  function applyUpdate() {
    if (activating) return;
    activating = true;
    if (candidate) writeStore(sessionStorage, PENDING, candidate);
    ui().hidden = true;
    // El usuario confirma explícitamente; nunca recargar a mitad de un formulario automáticamente.
    const worker = (registration && registration.waiting) || waitingWorker;
    if (worker) {
      worker.postMessage({ type: 'FINORA_SKIP_WAITING' });
      // Fallback si el navegador no emite controllerchange.
      setTimeout(function () {
        if (activating) location.reload();
      }, 7000);
    } else {
      location.reload();
    }
  }

  async function assetSignature(name) {
    const url = new URL(name, BASE);
    try {
      const res = await fetch(url.href, { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' });
      if (res.status === 404) return `${name}:404`;
      if (!res.ok) throw new Error(`${name}:HTTP${res.status}`);
      const etag = res.headers.get('etag');
      const modified = res.headers.get('last-modified');
      const size = res.headers.get('content-length');
      if (etag) return `${name}:${etag}`;
      if (modified) return `${name}:${modified}:${size || ''}`;
      // Fallback para servidores sin ETag ni Last-Modified.
      const content = await fetch(url.href, { cache: 'no-store', credentials: 'same-origin' });
      if (!content.ok) throw new Error(`${name}:HTTP${content.status}`);
      const bytes = new Uint8Array(await content.arrayBuffer());
      let sum = 2166136261;
      for (let i = 0; i < bytes.length; i++) {
        sum ^= bytes[i];
        sum = Math.imul(sum, 16777619);
      }
      return `${name}:${bytes.length}:${(sum >>> 0).toString(16)}`;
    } catch (error) {
      throw error;
    }
  }

  async function scanFiles() {
    const signatures = await Promise.all(TRACKED_FILES.map(assetSignature));
    return signatures.join('|');
  }

  async function checkForUpdates(force) {
    if (!navigator.onLine || checking) return;
    if (!force && Date.now() - lastChecked < MIN_CHECK_GAP) return;
    checking = true;
    lastChecked = Date.now();
    try {
      if (registration) await registration.update();
      if (registration && registration.waiting && navigator.serviceWorker.controller) {
        waitingWorker = registration.waiting;
        offerUpdate();
      }
      const fingerprint = await scanFiles();
      const pending = readStore(sessionStorage, PENDING);
      const baseline = readStore(localStorage, KEY);
      if (pending && fingerprint === pending) {
        // La nueva página ya se cargó con los archivos esperados.
        writeStore(localStorage, KEY, fingerprint);
        removeStore(sessionStorage, PENDING);
        candidate = null;
      } else if (!baseline) {
        // Primera visita: tomar como base los archivos publicados, sin alerta falsa.
        writeStore(localStorage, KEY, fingerprint);
      } else if (baseline !== fingerprint) {
        candidate = fingerprint;
        offerUpdate();
      }
    } catch (error) {
      // Errores temporales de GitHub Pages no deben generar avisos de actualización falsos.
      console.debug('[Finora PWA] No se pudo comprobar una nueva versión:', error);
    } finally {
      checking = false;
    }
  }

  function watchRegistration(reg) {
    registration = reg;
    function installed(worker) {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        waitingWorker = reg.waiting || worker;
        offerUpdate();
      }
    }
    if (reg.waiting && navigator.serviceWorker.controller) {
      waitingWorker = reg.waiting;
      offerUpdate();
    }
    reg.addEventListener('updatefound', function () {
      const installing = reg.installing;
      if (installing) installing.addEventListener('statechange', function () { installed(installing); });
    });
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (activating) location.reload();
    });
  }

  async function start() {
    dismissedUntil = Number(readStore(localStorage, SNOOZE)) || 0;
    try {
      // scope './' deja /finanzas/firebase-cloud-messaging-push-scope al SW específico de FCM.
      const reg = await navigator.serviceWorker.register(new URL('sw.js', BASE).href, {
        scope: BASE.pathname,
        updateViaCache: 'none'
      });
      watchRegistration(reg);
      await checkForUpdates(true);
    } catch (error) {
      console.error('[Finora PWA] Error al registrar actualizaciones:', error);
    }
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) checkForUpdates(false);
    });
    window.addEventListener('online', function () { checkForUpdates(true); });
    window.addEventListener('focus', function () { checkForUpdates(false); });
    setInterval(function () { if (!document.hidden) checkForUpdates(false); }, CHECK_INTERVAL);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
