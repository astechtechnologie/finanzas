const CACHE_NAME = 'finanzas-v3';

// Instalación: no cacheamos nada por adelantado
self.addEventListener('install', event => {
  self.skipWaiting(); // Activa el SW inmediatamente
});

// Activación: limpia cachés antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Estrategia: cache-first, luego red
self.addEventListener('fetch', event => {
  // No cachear solicitudes que no sean GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetched = fetch(event.request).then(response => {
        // Si la respuesta es válida, la guardamos en caché
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Si falla la red, devolvemos la caché (o nada)
        return cached;
      });
      return cached || fetched;
    })
  );
});
