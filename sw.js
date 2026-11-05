const CACHE = "wordspring-v17";
const FILES = ["./", "./?v=17", "./notebook.js?v=17", "./listening.js?v=17", "./knowledge.js?v=17", "./ai-chat.js?v=17", "./backup.js?v=17", "./manifest.webmanifest", "./icon-180.png", "./icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(async response => {
    if (response.ok) {
      try {
        const cache = await caches.open(CACHE);
        await cache.put(event.request, response.clone());
      } catch { /* The network response still works if caching fails. */ }
    }
    return response;
  }).catch(() => caches.match(event.request)));
});
