/*
 * Finora PWA · Service Worker v13
 * Solo administra la interfaz de Finora. NO registra Firebase Messaging.
 * Publicado en GitHub Pages bajo /finanzas/ (también admite otro subdirectorio).
 * Actualiza sin interrumpir: espera FINORA_SKIP_WAITING desde el usuario.
 */
'use strict';

const CACHE_NAME = 'finora-pwa-v17';
const APP_SCOPE = self.registration.scope;
const ROOT_URL = new URL(APP_SCOPE);

// Si alguno de estos falla, la actualización no se activa y queda el SW anterior.
const ESSENTIAL = ['index.html', 'css/styles.css'];
// Recursos extra: un 404 aislado no debe bloquear toda la actualización.
const OPTIONAL = [
  'logo-192.png', 'logo-512.png', 'icon.svg', 'manifest.json',
  'js/firebase-config.js', 'js/storage.js', 'js/auth.js',
  'js/charts.js', 'js/onboarding.js', 'js/iconos.js',
  'js/ui-main.js', 'js/ui-presupuesto.js', 'js/app.js',
  'js/recordatorios.js', 'js/panel-compartido.js',
  'js/division-gastos.js', 'js/mercado-motor.js',
  'js/mercado-inteligente.js', 'js/encabezado-finora.js',
  'js/pwa-actualizaciones.js'
];

const absolute = (path) => new URL(path, APP_SCOPE).toString();

async function preload(cache, path) {
  // 'reload' evita precargar desde una caché HTTP vieja.
  const url = absolute(path);
  const response = await fetch(new Request(url, { cache: 'reload' }));
  if (!response.ok || response.type === 'opaque') {
    throw new Error(`No se pudo precargar ${path}: HTTP ${response.status}`);
  }
  await cache.put(url, response.clone());
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Primero asegurar que el núcleo esté listo.
    await Promise.all(ESSENTIAL.map((path) => preload(cache, path)));
    // Después intentar el resto sin bloquear el reemplazo por un 404 opcional.
    const results = await Promise.allSettled(OPTIONAL.map((path) => preload(cache, path)));
    results.forEach((item, i) => {
      if (item.status === 'rejected') console.warn('[Finora PWA] Recurso opcional no guardado:', OPTIONAL[i]);
    });
    // No llamar a skipWaiting(): se solicita tras pulsar "Actualizar ahora".
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((name) =>
      name !== CACHE_NAME && (/^finora-cache-/.test(name) || /^finora-pwa-/.test(name))
    ).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FINORA_SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});

function inAppScope(url) {
  return url.origin === ROOT_URL.origin && url.pathname.startsWith(ROOT_URL.pathname);
}

function isManagedAsset(request, url) {
  if (request.mode === 'navigate') return true;
  // No interceptar peticiones Firebase, APIs externas, ni el Service Worker de FCM.
  if (/\/(sw|firebase-messaging-sw)\.js$/.test(url.pathname)) return false;
  if (request.destination === 'document' || request.destination === 'style' ||
      request.destination === 'script' || request.destination === 'image' ||
      request.destination === 'font' || request.destination === 'manifest') return true;
  return /\.(?:html|css|js|json|png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(url.pathname);
}

function isSafeToStore(response) {
  return response && response.ok && response.type !== 'opaque' &&
    (response.type === 'basic' || response.type === 'default');
}

async function fromNetworkFirst(request, isNavigation) {
  const cache = await caches.open(CACHE_NAME);
  let networkResponse;
  try {
    // Una navegación nueva y los assets JavaScript/CSS deben consultar la red.
    networkResponse = await fetch(request, { cache: 'no-cache' });
    if (isSafeToStore(networkResponse)) {
      try {
        await cache.put(request, networkResponse.clone());
        if (isNavigation) await cache.put(absolute('index.html'), networkResponse.clone());
      } catch (error) {
        console.warn('[Finora PWA] Sin espacio de caché:', error);
      }
      return networkResponse;
    }
    // Con servidor temporalmente caído, usar interfaz cacheada; con 404 NO ocultar el error.
    if (networkResponse.status < 500) return networkResponse;
  } catch (error) {
    // Sin red: buscar caché solo de ESTA versión; no mezclar scripts de versiones viejas.
  }
  const fallback = isNavigation
    ? await cache.match(absolute('index.html'))
    : await cache.match(request, { ignoreSearch: true });
  return fallback || networkResponse || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return; // La comprobación de versión usa HEAD y no se intercepta.
  const url = new URL(request.url);
  if (!inAppScope(url) || !isManagedAsset(request, url)) return;
  if (/\/(sw|firebase-messaging-sw)\.js$/.test(url.pathname)) return;
  event.respondWith(fromNetworkFirst(request, request.mode === 'navigate'));
});
