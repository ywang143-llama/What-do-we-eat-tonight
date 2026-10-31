/* Tonight's Kitchen service worker — offline shell + safe runtime caching. */

const VERSION = "v3";
const STATIC_CACHE = `tk-static-${VERSION}`;
const PAGE_CACHE = `tk-pages-${VERSION}`;
const IMAGE_CACHE = `tk-images-${VERSION}`;

const PRECACHE = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      // Individual failures should never block the whole install.
      await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, PAGE_CACHE, IMAGE_CACHE]);
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("tk-") && !keep.has(key))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isCacheableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json" ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|webp|svg|ico)$/.test(url.pathname)
  );
}

// Self-contained fallback: no app chunks required, so it always renders offline.
const OFFLINE_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#FBF4E8">
<title>暂时离线 · 今晚吃什么</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 24px calc(32px + env(safe-area-inset-bottom));
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
      "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    background: #FBF4E8;
    color: #43352B;
    text-align: center;
  }
  .card { width: 100%; max-width: 360px; }
  .bowl {
    width: 88px;
    height: 88px;
    margin: 0 auto;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #F2E4D1;
    font-size: 40px;
  }
  h1 { margin: 22px 0 0; font-size: 22px; line-height: 1.3; }
  p {
    margin: 10px auto 0;
    max-width: 300px;
    color: #7A6A5D;
    font-size: 13px;
    line-height: 1.8;
  }
  .actions { margin-top: 24px; display: flex; gap: 10px; justify-content: center; }
  a, button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 46px;
    padding: 0 22px;
    border-radius: 999px;
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
  }
  .primary { background: #A9553A; color: #fff; border: 1px solid #A9553A; }
  .secondary { background: #FFFDF8; color: #43352B; border: 1px solid #E7D8C4; }
  .tip { margin-top: 24px; color: #9A8A7B; font-size: 11px; }
  :focus-visible { outline: 2px solid #A9553A; outline-offset: 3px; }
</style>
</head>
<body>
<main class="card">
  <div class="bowl">🍲</div>
  <h1>厨房暂时断网了</h1>
  <p>别担心，之前看过的页面还在这里。等网络回来，今晚的菜单就能继续更新。</p>
  <div class="actions">
    <button class="primary" onclick="location.reload()">再试一次</button>
    <a class="secondary" href="/">回厨房</a>
  </div>
  <p class="tip">离线的厨房也可以点进来看看</p>
</main>
</body>
</html>`;

function offlineResponse() {
  return new Response(OFFLINE_HTML, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return offlineResponse();
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await network) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache Supabase auth/data APIs. Storage images are handled below.
  if (
    url.pathname.startsWith("/auth/v1/") ||
    url.pathname.startsWith("/rest/v1/") ||
    url.pathname.startsWith("/realtime/v1/")
  ) {
    return;
  }

  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  if (request.headers.get("RSC") === "1") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin && isCacheableAsset(url)) {
    event.respondWith(
      url.pathname.startsWith("/_next/static/")
        ? cacheFirst(request, STATIC_CACHE)
        : staleWhileRevalidate(request),
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
