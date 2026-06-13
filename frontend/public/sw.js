// TTransport service worker — Android PWA installability + offline app shell.
//
// Stale-free by design:
//  - HTML navigations: network-first → fresh app on every deploy, cached fallback offline.
//  - Vite hashed assets (JS/CSS/imgs): cache-first → immutable; new deploys ship new hashes.
//  - API calls (/api/*) + cross-origin: never cached → live trip data always hits network.
const CACHE = 'ttransport-shell-v1'

self.addEventListener('install', (event) => {
  // No precache: runtime fetch handler seeds the cache on first online load
  // (you can't install offline, so the first load always populates it).
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Only intercept same-origin, non-API GETs. API + cross-origin go straight to network.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api')) return

  // HTML navigations: network-first, fall back to cached app shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
          return res
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/'))),
    )
    return
  }

  // Static assets: cache-first, populate cache on first fetch.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok) caches.open(CACHE).then((cache) => cache.put(request, res.clone()))
          return res
        }),
    ),
  )
})
