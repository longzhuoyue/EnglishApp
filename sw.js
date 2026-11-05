const CACHE = "wordspring-v19";
const FILES = ["./", "./?v=19", "./notebook.js?v=19", "./listening.js?v=19", "./knowledge.js?v=19", "./ai-chat.js?v=19", "./course-data.js?v=19", "./course.js?v=19", "./backup.js?v=19", "./manifest.webmanifest", "./icon-180.png", "./icon-512.png"];

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
