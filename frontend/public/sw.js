// StockFlow's service worker (a small helper the browser runs for the installed app).
// Its only job: when a page can't load (the laptop's servers are off, or there is no internet),
// show offline.html, a friendly page with a "Try again" button, instead of the browser's error.
// Everything else (pictures, scripts, the API) goes to the network as usual: nothing old is kept.

const CACHE = "stockflow-offline-v1";
const OFFLINE_PAGE = "/offline.html";

// When it is installed: keep a copy of the offline page
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE_PAGE)));
  self.skipWaiting();
});

// A new version: remove the copies of older versions, and start helping the open pages now
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Opening a page: from the network; if that fails, the offline page
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return; // not a page: the browser handles it as usual
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_PAGE)));
});
