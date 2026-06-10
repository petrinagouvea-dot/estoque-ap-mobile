// Service Worker para Estoque AP — Funcionalidade Offline

const CACHE_NAME = 'estoque-ap-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
];

// Instalar o Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE).catch(err => {
        console.warn('Alguns recursos não puderam ser cacheados:', err);
        // Continua mesmo se alguns recursos falharem
      });
    })
  );
  self.skipWaiting();
});

// Ativar o Service Worker
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
  self.clients.claim();
});

// Estratégia de cache: Cache primeiro, depois rede
self.addEventListener('fetch', event => {
  // Não cachear requests de API (Google Apps Script)
  if (event.request.url.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => new Response('Offline — tente novamente quando a conexão voltar', {
          status: 503,
          statusText: 'Service Unavailable'
        }))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      // Se estiver em cache, retorna
      if (response) {
        return response;
      }

      // Senão, tenta fetch
      return fetch(event.request)
        .then(response => {
          // Cache assets que tiverem sucesso
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Se falhar, retorna versão em cache ou erro
          return caches.match(event.request).then(cached => {
            return cached || new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        });
    })
  );
});
