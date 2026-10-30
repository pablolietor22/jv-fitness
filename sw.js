// JV Fitness · Service Worker NETWORK-FIRST.
// Con internet SIEMPRE baja la última versión publicada (evita quedarse pegado en una versión vieja
// cacheada — el bug del móvil de Pablo). Sin internet, sirve lo último que cacheó (fallback offline).
// Estrategia deliberadamente simple y segura: nunca sirve algo viejo si hay red.
// Lote 2a · T1 (auditoría de seguridad web 30-10, hallazgo 6): el SW cacheaba TODO lo que pasaba, también lo de
// terceros (Open-Meteo con latitud y longitud en la URL, jsDelivr, Open Food Facts…), sin límite ni caducidad.
// Ahora SOLO intercepta y cachea su propio origen; lo de terceros va directo a la red, sin pasar por aquí.
// El nombre sube a «-v2»: al activarse, esta versión BORRA las cachés viejas (la «jvf-cache» sin versión
// guardaba respuestas de terceros). Para forzar otra limpieza en el futuro, sube el sufijo.
var C = "jvf-cache-v2";
self.addEventListener("install", function (e) { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== C; }).map(function (k) { return caches.delete(k); }));
    }).catch(function () { /* si no se pudo limpiar no pasa nada: la siguiente activación lo reintenta; lo que importa es tomar el control */ })
      .then(function () { return self.clients.claim(); })
  );
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  // Solo el mismo origen: lo de terceros NO se intercepta (sin respondWith el navegador lo pide él mismo, sin caché).
  var u; try { u = new URL(e.request.url); } catch (_) { return; }
  if (u.origin !== self.location.origin) return;
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
