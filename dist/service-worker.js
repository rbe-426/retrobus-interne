// Service Worker pour RétroBus Essonne PWA
const CACHE_NAME = 'retrobus-essonne-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installation...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Service Worker: Cache ouvert');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('❌ Service Worker: Erreur cache:', error);
      })
  );
  
  // Force l'activation immédiate
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activation...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Supprimer les anciens caches
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Prendre le contrôle immédiatement
  return self.clients.claim();
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignorer les schémas non-HTTP/HTTPS (chrome-extension, data, blob, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Ignorer les requêtes vers l'API (toujours fetch depuis le réseau)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('railway.app')) {
    return;
  }
  
  // Stratégie: Network-first, fallback sur cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Vérifier si la réponse est valide
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Cloner la réponse car elle ne peut être consommée qu'une fois
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME)
          .then((cache) => {
            // Double vérification du schéma avant de mettre en cache
            if (request.url.startsWith('http')) {
              cache.put(request, responseToCache);
            }
          })
          .catch((error) => {
            console.warn('⚠️ Service Worker: Cache put failed:', error.message);
          });
        
        return response;
      })
      .catch(() => {
        // Si le réseau échoue, essayer le cache
        return caches.match(request)
          .then((response) => {
            if (response) {
              console.log('📦 Service Worker: Serving from cache:', request.url);
              return response;
            }
            
            // Si pas en cache, retourner une réponse d'erreur basique
            return new Response('Offline - Resource not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Messages du Service Worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ Service Worker RétroBus Essonne chargé');
