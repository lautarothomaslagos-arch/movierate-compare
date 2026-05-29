// Service Worker — MovieRate Compare (Fase H.2)
// =====================================================================
// Estrategia de cache:
//
// - Navegación (documentos HTML): network-first. Si hay red, usamos red.
//   Si no, servimos lo que tengamos cacheado. Si tampoco, devolvemos un
//   fallback minimal "Sin conexión".
//
// - Imágenes de TMDB (image.tmdb.org): cache-first. Las imágenes nunca
//   cambian — un poster es siempre el mismo archivo. Cacheamos para que
//   re-visitas sean instantáneas y la app sea usable offline después de
//   navegar una vez.
//
// - Assets de Next.js (_next/static): cache-first. Build hash en el path
//   garantiza invalidación automática al deploy.
//
// - API routes (/api/*): network-only. Datos dinámicos, no cachear.
//
// - Resto same-origin: network-first con fallback a cache.
// =====================================================================

const VERSION = "movierate-v1";
const RUNTIME_CACHE = `${VERSION}-runtime`;
const IMAGE_CACHE = `${VERSION}-images`;
const ASSET_CACHE = `${VERSION}-assets`;

// Skip waiting al instalar — el SW nuevo toma control de la pestaña al toque
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Limpia caches viejos (de versiones anteriores) al activarse
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Helpers
function isImageTmdb(url) {
  return url.hostname === "image.tmdb.org";
}

function isNextAsset(url) {
  return (
    url.pathname.startsWith("/_next/static") ||
    url.pathname === "/manifest.json" ||
    url.pathname.match(/\.(woff2?|ttf|otf|css|js|svg|ico|png|webp|jpg|jpeg)$/i)
  );
}

function isApi(url) {
  return url.pathname.startsWith("/api/");
}

function isNavigation(request) {
  return request.mode === "navigate" || request.destination === "document";
}

// Cache-first: devuelve del cache si existe, sino va a red y cachea.
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

// Network-first: prueba red primero, si falla usa cache.
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok && request.method === "GET") {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

// Fallback HTML mínimo para navegaciones sin red ni cache.
const OFFLINE_HTML = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Sin conexión · MovieRate</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;font-family:system-ui,sans-serif;background:#0f0c08;color:#f3e7c8;
       display:grid;place-items:center;min-height:100vh;padding:24px;text-align:center}
  h1{font-family:Georgia,serif;font-style:italic;font-size:48px;margin:0 0 16px;letter-spacing:-0.01em}
  p{color:#a89878;max-width:32ch;line-height:1.5;margin:0 0 24px}
  button{background:#e0b870;color:#1a1410;border:0;padding:10px 20px;border-radius:999px;
         font-size:14px;font-weight:500;cursor:pointer}
</style></head>
<body><div>
  <h1>Sin conexión.</h1>
  <p>No te podemos cargar esto ahora. Volvé cuando recuperes internet.</p>
  <button onclick="location.reload()">Reintentar</button>
</div></body></html>`;

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo manejamos GET; el resto va directo a red
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // API: siempre red (sin cachear datos dinámicos)
  if (isApi(url)) {
    return;
  }

  // Imágenes TMDB: cache-first agresivo
  if (isImageTmdb(url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Assets de Next.js (build hash en path = invalidación automática)
  if (url.origin === self.location.origin && isNextAsset(url)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // Navegaciones HTML: network-first con fallback offline
  if (isNavigation(request)) {
    event.respondWith(
      (async () => {
        try {
          return await networkFirst(request, RUNTIME_CACHE);
        } catch {
          return new Response(OFFLINE_HTML, {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
      })()
    );
    return;
  }

  // Resto same-origin: network-first
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
  }
});
