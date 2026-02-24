// ===== VetPro Service Worker - Versão Avançada =====

const CACHE_NAME = 'vetpro-cache-v2';
const STATIC_CACHE = 'vetpro-static-v2';
const DYNAMIC_CACHE = 'vetpro-dynamic-v2';
const API_CACHE = 'vetpro-api-v1';

// Arquivos estáticos para cache inicial
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Tempo de expiração do cache de API (em ms)
const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// ===== Ciclo de Vida =====

// Install - Pre-cache de recursos estáticos
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      // Pula a fase de espera para ativar imediatamente
      return self.skipWaiting();
    })
  );
});

// Activate - Limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('vetpro-') && name !== CACHE_NAME && name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== API_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Assume controle imediatamente
      return self.clients.claim();
    })
  );
});

// ===== Fetch - Estratégias de Cache =====

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-GET
  if (request.method !== 'GET') {
    return;
  }

  // Estratégia para API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(apiCacheStrategy(request));
    return;
  }

  // Estratégia para recursos estáticos
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Estratégia padrão - Network First
  event.respondWith(networkFirstStrategy(request));
});

// ===== Estratégias de Cache =====

/**
 * Cache First - Para assets estáticos
 * Tenta cache primeiro, senão busca na rede
 */
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Atualiza cache em background
    fetchAndCache(request, DYNAMIC_CACHE);
    return cachedResponse;
  }
  
  return fetch(request);
}

/**
 * Network First - Para páginas e recursos dinâmicos
 * Tenta rede primeiro, senão usa cache
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Retorna página offline se disponível
    return caches.match('/');
  }
}

/**
 * API Cache - Estratégia Stale-While-Revalidate
 * Retorna cache imediatamente, atualiza em background
 */
async function apiCacheStrategy(request) {
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // Se both falharem, retorna erro
      return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    });

  // Retorna cache imediatamente se disponível e "fresco"
  if (cachedResponse) {
    const cachedTime = cachedResponse.headers.get('sw-cached-time');
    
    if (cachedTime && Date.now() - parseInt(cachedTime) < API_CACHE_DURATION) {
      // Atualiza em background
      fetchPromise.then(() => {}).catch(() => {});
      return cachedResponse;
    }
  }

  // Se não tem cache ou está velho, espera rede
  try {
    const networkResponse = await fetchPromise;
    return networkResponse;
  } catch (e) {
    return cachedResponse || new Response(
      JSON.stringify({ error: 'Offline', noCache: true }), 
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Fetch e armazena em cache
 */
async function fetchAndCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    // Silencioso - apenas log
  }
}

// ===== Utilitários =====

function isStaticAsset(pathname) {
  const staticExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', 
    '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot',
    '.webp', '.avif'
  ];
  
  return staticExtensions.some((ext) => pathname.endsWith(ext));
}

// ===== Mensagens do Client =====

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearAllCaches();
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  console.log('[SW] All caches cleared');
}

// ===== Background Sync (Futuro) =====

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-consultations') {
    event.waitUntil(syncConsultations());
  }
});

async function syncConsultations() {
  // Implementar sincronização de consultas offline
  console.log('[SW] Syncing consultations...');
}

// ===== Push Notifications (Futuro) =====

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body || 'Nova notificação do VetPro',
    icon: '/logo.png',
    badge: '/badge.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'VetPro', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
