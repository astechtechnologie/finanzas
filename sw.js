const CACHE_NAME = 'finanzas-v9'; // Incrementa este número cada vez que actualices

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

// Instalación: cachear archivos esenciales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ARCHIVOS_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activación: limpiar cachés antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

// Estrategia: network-first (red primero, caché como respaldo)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la respuesta es válida, actualizar caché
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Si no hay red, devolver de caché
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Si es una navegación, devolver index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
