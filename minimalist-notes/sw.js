const CACHE_NAME = 'notes-v3';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './assets/favicon.svg',
    './assets/icon-192.png',
    './assets/icon-512.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

async function putInCache(request, response) {
    // 只快取乾淨的 200；206 會讓 cache.put 直接丟例外
    if (!response || response.status !== 200) return;
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
}

// 導覽請求 → network-first：部署後第一次載入就拿到新版，離線才回退快取
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        await putInCache(request, response);
        return response;
    } catch {
        return (await caches.match(request))
            || (await caches.match('./index.html'))
            || Response.error();
    }
}

// 靜態資源 → 先回快取，背景更新
async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);
    const network = fetch(request)
        .then(async (response) => {
            await putInCache(request, response);
            return response;
        })
        .catch(() => cached || Response.error());

    return cached || network;
}

self.addEventListener('fetch', (e) => {
    const { request } = e;
    if (request.method !== 'GET') return;
    if (new URL(request.url).origin !== self.location.origin) return;

    e.respondWith(
        request.mode === 'navigate'
            ? networkFirst(request)
            : staleWhileRevalidate(request)
    );
});
