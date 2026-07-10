// JV Fitness · Service Worker NETWORK-FIRST.
// Con internet SIEMPRE baja la última versión publicada (evita quedarse pegado en una versión vieja
// cacheada — el bug del móvil de Pablo). Sin internet, sirve lo último que cacheó (fallback offline).
// Estrategia deliberadamente simple y segura: nunca sirve algo viejo si hay red.
var C = "jvf-cache";
self.addEventListener("install", function (e) { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  // Los chunks de la base España (/data/db/) van a IndexedDB, NO a la caché del SW: cachearlos aquí
  // duplicaría los ~5 MB en Cache Storage sin aportar nada (la app nunca los re-pide una vez importados).
  if (e.request.url.indexOf("/data/db/") >= 0) return;
  e.respondWith(
    fetch(e.request).then(function (r) {
      try { var cc = r.clone(); caches.open(C).then(function (k) { k.put(e.request, cc); }); } catch (_) {}
      return r;
    }).catch(function () { return caches.match(e.request); })
  );
});
