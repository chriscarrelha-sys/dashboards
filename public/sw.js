/* Pro Se Wins service worker — conservative offline shell only.
 * Does NOT cache private document contents. Caches the app shell + static assets
 * so the case list and navigation load offline; everything dynamic is network-first. */
const SHELL = 'psw-shell-v1';
const SHELL_ASSETS = ['/', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Never cache API, document files, or auth — always network.
  if (url.pathname.startsWith('/api') || url.pathname.includes('/file') || url.pathname.includes('/manifest/')) return;
  // Static assets: cache-first. Everything else: network-first with shell fallback.
  if (url.pathname.startsWith('/_next/static') || SHELL_ASSETS.includes(url.pathname)) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
  } else {
    e.respondWith(fetch(e.request).catch(() => caches.match('/')));
  }
});
