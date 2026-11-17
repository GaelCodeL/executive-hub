const CACHE_NAME = 'executive-hub-shell-v2'
const BASE_PATH = new URL(self.registration.scope).pathname
const APP_SHELL = ['', 'index.html', 'manifest.webmanifest', 'icon.svg'].map((path) => new URL(path, self.registration.scope).toString())

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
      }
      return response
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match(new URL('index.html', self.registration.scope).toString())))
  )
})
