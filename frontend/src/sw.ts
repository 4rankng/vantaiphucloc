/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

// Precache manifest injected by workbox via vite-plugin-pwa injectManifest
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Navigation fallback (SPA)
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// API caching — NetworkFirst with expiration
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

// ── Workbox imports (resolved at build time) ───────────────────────

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { NavigationRoute, registerRoute, createHandlerBoundToURL } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
