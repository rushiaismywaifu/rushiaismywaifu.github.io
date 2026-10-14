// Bump this version whenever the app shell changes. New workers wait until
// existing tabs close, so one session never mixes different shell versions.
const CACHE_PREFIX = 'discord-quest-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const APP_ROOT = new URL('./', self.location.href);
const INDEX_URL = new URL('index.html', APP_ROOT).href;
const ASSETS = [
  './index.html',
  './manifest.webmanifest',
  './assets/favicon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './styles/tokens.css',
  './styles/layout.css',
  './styles/components.css',
  './styles/responsive.css',
  './js/app.js',
  './js/config.js',
  './js/data.js',
  './js/utils.js',
  './js/view.js',
  './js/pwa.js',
].map(path => new URL(path, APP_ROOT).href);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(
      ASSETS.map(url => new Request(url, {cache: 'reload'})),
    )),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Other tools on the same GitHub Pages origin own their own caches.
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const {request} = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== APP_ROOT.origin) return;

  // Only handle the app entry and explicitly listed shell assets. Never cache
  // remote quest data, media, unrelated pages, or unknown paths as HTML.
  url.search = '';
  const isEntry = request.mode === 'navigate'
    && (url.href === APP_ROOT.href || url.href === INDEX_URL);
  const cacheKey = isEntry ? INDEX_URL : url.href;
  if (!ASSETS.includes(cacheKey)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(cacheKey)) || fetch(request);
  })());
});
