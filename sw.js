/**
 * Service Worker для Монополии России
 * Обеспечивает кэширование и офлайн работу
 */

const CACHE_NAME = 'monopoly-russia-v1.0.0';
const STATIC_CACHE = 'monopoly-russia-static-v1.0.0';
const DYNAMIC_CACHE = 'monopoly-russia-dynamic-v1.0.0';

// Файлы для кэширования
const STATIC_FILES = [
    '/',
    '/src/index.html',
    '/src/style.css',
    '/js/main.js',
    '/js/config.js',
    '/js/utils.js',
    '/js/game.js',
    '/js/board.js',
    '/js/player.js',
    '/js/ui.js',
    '/js/audio.js',
    '/dist/index.html',
    '/dist/style.min.css',
    '/dist/game.min.js'
];

// Стратегии кэширования
const CACHE_STRATEGIES = {
    // Кэширование статических ресурсов
    STATIC: 'static',
    // Кэширование с обновлением
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
    // Сеть с fallback на кэш
    NETWORK_FIRST: 'network-first',
    // Кэш с fallback на сеть
    CACHE_FIRST: 'cache-first'
};

// Установка Service Worker
self.addEventListener('install', event => {
    console.log('🔄 Service Worker: Установка...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('📦 Service Worker: Кэширование статических файлов');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('✅ Service Worker: Установка завершена');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ Service Worker: Ошибка установки', error);
            })
    );
});

// Активация Service Worker
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker: Активация...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('🗑️ Service Worker: Удаление старого кэша', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker: Активация завершена');
                return self.clients.claim();
            })
    );
});

// Перехват запросов
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Пропускаем неподходящие запросы
    if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
        return;
    }
    
    // Определяем стратегию кэширования
    const strategy = getCacheStrategy(request);
    
    event.respondWith(
        handleRequest(request, strategy)
            .catch(error => {
                console.error('❌ Service Worker: Ошибка обработки запроса', error);
                return handleOfflineFallback(request);
            })
    );
});

// Определение стратегии кэширования
function getCacheStrategy(request) {
    const url = new URL(request.url);
    
    // Статические ресурсы
    if (url.pathname.match(/\.(css|js|html|woff2|woff|ttf|eot)$/)) {
        return CACHE_STRATEGIES.STATIC;
    }
    
    // API запросы
    if (url.pathname.startsWith('/api/')) {
        return CACHE_STRATEGIES.NETWORK_FIRST;
    }
    
    // Изображения
    if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
        return CACHE_STRATEGIES.CACHE_FIRST;
    }
    
    // По умолчанию
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
}

// Обработка запросов
async function handleRequest(request, strategy) {
    switch (strategy) {
        case CACHE_STRATEGIES.STATIC:
            return handleStaticCache(request);
        case CACHE_STRATEGIES.CACHE_FIRST:
            return handleCacheFirst(request);
        case CACHE_STRATEGIES.NETWORK_FIRST:
            return handleNetworkFirst(request);
        case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
            return handleStaleWhileRevalidate(request);
        default:
            return fetch(request);
    }
}

// Статическое кэширование
async function handleStaticCache(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        throw new Error('Не удалось загрузить статический ресурс');
    }
}

// Кэш первым
async function handleCacheFirst(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // Обновляем кэш в фоне
        fetch(request)
            .then(response => {
                if (response.ok) {
                    cache.put(request, response);
                }
            })
            .catch(() => {
                // Игнорируем ошибки обновления кэша
            });
        
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        throw new Error('Ресурс недоступен');
    }
}

// Сеть первым
async function handleNetworkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw new Error('Ресурс недоступен и не найден в кэше');
    }
}

// Устаревший с обновлением
async function handleStaleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request)
        .then(networkResponse => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => {
            // Игнорируем ошибки сети
        });
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        return await fetchPromise;
    } catch (error) {
        throw new Error('Ресурс недоступен');
    }
}

// Офлайн fallback
async function handleOfflineFallback(request) {
    const url = new URL(request.url);
    
    // Для HTML запросов показываем офлайн страницу
    if (request.headers.get('accept').includes('text/html')) {
        const cache = await caches.open(STATIC_CACHE);
        const offlinePage = await cache.match('/src/index.html');
        
        if (offlinePage) {
            return new Response(offlinePage.body, {
                status: 200,
                statusText: 'OK',
                headers: {
                    'Content-Type': 'text/html',
                    'X-Offline': 'true'
                }
            });
        }
    }
    
    // Для других запросов возвращаем ошибку
    return new Response('Офлайн режим', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
            'Content-Type': 'text/plain'
        }
    });
}

// Обработка сообщений от основного потока
self.addEventListener('message', event => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
        case 'GET_CACHE_INFO':
            getCacheInfo().then(info => {
                event.ports[0].postMessage(info);
            });
            break;
        case 'CLEAR_CACHE':
            clearCache().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
        default:
            console.log('Service Worker: Неизвестный тип сообщения', type);
    }
});

// Получение информации о кэше
async function getCacheInfo() {
    const cacheNames = await caches.keys();
    const cacheInfo = {};
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        cacheInfo[cacheName] = {
            size: requests.length,
            urls: requests.map(req => req.url)
        };
    }
    
    return cacheInfo;
}

// Очистка кэша
async function clearCache() {
    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
}

// Периодическая очистка старых записей
self.addEventListener('periodicsync', event => {
    if (event.tag === 'cleanup-cache') {
        event.waitUntil(cleanupOldCache());
    }
});

// Очистка старого кэша
async function cleanupOldCache() {
    const cache = await caches.open(DYNAMIC_CACHE);
    const requests = await cache.keys();
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 дней
    
    for (const request of requests) {
        const response = await cache.match(request);
        const dateHeader = response.headers.get('date');
        
        if (dateHeader) {
            const responseDate = new Date(dateHeader).getTime();
            if (now - responseDate > maxAge) {
                await cache.delete(request);
            }
        }
    }
}

self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    data = event.data.json();
  }
  const title = data.title || 'Monopoly Russia';
  const options = {
    body: data.body || 'У вас новое уведомление!',
    icon: 'icons/icon-192x192.png',
    badge: 'icons/icon-72x72.png',
    data: data.url || '/' // Можно добавить переход по клику
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (let client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

console.log('🎲 Service Worker: Монополия России загружен'); 