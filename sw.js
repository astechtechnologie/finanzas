const CACHE_NAME = 'finanzas-v11.4'; // ← Incrementa este número en cada actualización

const ARCHIVOS_CACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/firebase-config.js',
  './js/storage.js',
  './js/auth.js',
  './js/charts.js',
  './js/onboarding.js',
  './js/ui-main.js',
  './js/ui-presupuesto.js',
  './js/app.js',
  './manifest.json',
  './icon.svg'
];

// Instalación
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ARCHIVOS_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activación
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

// Estrategia network-first
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
