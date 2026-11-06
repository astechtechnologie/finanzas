const CACHE_NAME = 'finora-cache-v12.80';
const urlsToCache = [
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
  './logo-192.png',
  './logo-512.png',
  './manifest.json'
];

// Instalar el Service Worker y guardar archivos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Archivos cacheados');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activar y limpiar cachés antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Estrategia: Network First (Primero red, si falla, caché)
self.addEventListener('fetch', event => {
  // No interceptar peticiones a Firebase o Google
  if (event.request.url.includes('firestore') || event.request.url.includes('googleapis')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la respuesta es válida, la clonamos y guardamos en caché
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, buscamos en caché
        return caches.match(event.request);
      })
  );
});
