import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

self.skipWaiting()
self.clients.claim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Cache Google Fonts stylesheets
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
)

// Cache Google Fonts files
registerRoute(
  ({ url }) => url.origin === 'fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
)

// Cache Supabase API calls (reads only - GET requests)
// NetworkFirst: prefer fresh data, fall back to cache when offline
// NOTE: auth endpoints (/auth/v1/) are intentionally excluded - caching
// auth responses can serve stale tokens and leak credentials.
registerRoute(
  ({ url, request }) => {
    if (request.method !== 'GET') return false
    return url.pathname.startsWith('/rest/v1/')
  },
  new NetworkFirst({
    cacheName: 'supabase-api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
)

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title || 'Sandhyavandhanam Reminder'
  const options = {
    body: data.body || 'Time to complete your practice',
    icon: '/icons/pwa-192x192.png',
    badge: '/icons/pwa-192x192.png',
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})