/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

const manifest = self.__WB_MANIFEST ?? []
precacheAndRoute(manifest)
cleanupOutdatedCaches()

if (manifest.length > 0) {
  registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))
} else {
  self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
      event.respondWith(fetch(event.request))
    }
  })
}

registerRoute(
  /^\/api\/.*/i,
  new NetworkFirst({
    networkTimeoutSeconds: 30,
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 }),
    ],
  }),
  'GET',
)

// ── Version check: skip /version endpoint caching ────────────────────────
// The version endpoint must always hit the network — never cache it.
registerRoute(
  /\/api\/v1\/version$/i,
  new NetworkFirst({ networkTimeoutSeconds: 5, cacheName: 'no-cache' }),
  'GET',
)

// ── Message handlers from main thread ───────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data?.type === 'FORCE_UPDATE') {
    // Delete all caches, then claim all clients so they reload
    event.waitUntil(
      caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
        .then(() => self.clients.claim())
        .then(() => {
          return self.clients.matchAll().then(clients => {
            for (const client of clients) {
              client.postMessage({ type: 'FORCE_RELOAD' })
            }
          })
        })
    )
  }
})

// When new SW activates, claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// ── Push notification handler ──────────────────────────────────────

self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string } = {}
  if (event.data) {
    try {
      data = event.data.json()
    } catch {
      data.body = event.data.text()
    }
  }

  const title = data.title || 'Vận tải Phúc Lộc'
  const options: NotificationOptions = {
    body: data.body || 'Bạn có thông báo mới',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: '/' },
    vibrate: [100, 50, 100],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Notification click handler ─────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = (event.notification.data?.url as string) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
