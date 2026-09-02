/**
 * sw.js
 * Minimal app-shell cache so the PWA is installable and works offline
 * for previously visited pages. Bump CACHE_NAME whenever shell files change
 * so old caches get cleaned up automatically.
 */
const CACHE_NAME = "lbq-shell-v1";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/i18n.js",
  "./js/storage.js",
  "./js/logo-default.js",
  "./js/utils.js",
  "./js/pdf-generator.js",
  "./js/app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./assets/logo/MB.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch((err) => {
      console.warn("SW install: caching failed for one or more files", err);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Network-first for same-origin navigation/app files, falling back to cache
// when offline. Third-party requests (like the jsPDF CDN) pass straight
// through to the network.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
