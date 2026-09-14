/* Harax service worker — offline shell & smart caching.
   Strategy:
   - navigations: network-first, fall back to a friendly offline page
   - static assets (icons, uploads, fonts): cache-first, fill cache on the fly
   - /api/* and non-GET: always live — never cache personal data
*/
const VERSION = "harax-v1";
const SHELL = ["/", "/offline.html", "/icon-192.png", "/icon-512.png", "/icon-maskable-192.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // live data, always

  // page navigations: try the network, show offline page when down
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/offline.html").then((r) => r || caches.match("/"))
      )
    );
    return;
  }

  // everything else (icons, uploaded photos, fonts): cache-first
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return res;
        })
    )
  );
});
