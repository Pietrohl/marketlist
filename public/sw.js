const CACHE_NAME = 'gather-shell-v7';
const APP_BASE = new URL(self.registration.scope);
const APP_PATH = APP_BASE.pathname;
const INDEX_URL = new URL('index.html', APP_BASE);
const APP_SHELL = [
  '',
  'index.html',
  'manifest.webmanifest',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'favicon.svg',
  'locales/en.json',
  'locales/pt-BR.json',
].map(path => new URL(path, APP_BASE).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch(INDEX_URL);
    const html = await response.text();
    const buildAssets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
      .map(match => new URL(match[1], APP_BASE))
      .filter(url => url.origin === APP_BASE.origin && url.pathname.startsWith(`${APP_PATH}assets/`))
      .map(url => url.href);
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([...new Set([...APP_SHELL, ...buildAssets])]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('gather-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== APP_BASE.origin || !url.pathname.startsWith(APP_PATH)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) void caches.open(CACHE_NAME).then(cache => cache.put(INDEX_URL, response.clone()));
      return response;
    }).catch(async () => (await caches.match(INDEX_URL)) || (await caches.match(APP_BASE.href))));
    return;
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && (url.pathname.startsWith(`${APP_PATH}assets/`) || url.pathname.startsWith(`${APP_PATH}locales/`))) {
      void caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    }
    return response;
  })));
});
