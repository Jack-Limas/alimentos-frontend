/*
 * AlimentaIQ service worker (registered only in production as /sw.js?v=<app version>).
 *
 * - Precaches the translated offline page (es, en), the assets it needs and the icon.
 * - /_next/static: cache-first (hashed file names never change).
 * - Navigations: network-first, then the cached copy, then the offline page.
 * - Never touches /api, other origins (the backend lives on its own origin),
 *   non-GET requests or anything carrying an Authorization header.
 * - Cached responses keep their own headers, COOP/COEP included, so a page
 *   served from the cache is still cross-origin isolated.
 * - A new version waits until the page asks for it (SKIP_WAITING) and then
 *   deletes the caches of older versions.
 */
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const STATIC_CACHE = `aiq-static-${VERSION}`;
const PAGES_CACHE = `aiq-pages-${VERSION}`;
const OFFLINE_PAGES = { es: '/es/offline', en: '/en/offline' };
const PRECACHE = [OFFLINE_PAGES.es, OFFLINE_PAGES.en, '/icon.svg'];

/** What to do with a request: 'bypass' | 'cache-first' | 'network-first'. */
function strategyFor({ url, method, mode, hasAuthorization, origin }) {
  if (method !== 'GET' || hasAuthorization) return 'bypass';
  const target = new URL(url);
  if (target.origin !== origin) return 'bypass';
  if (target.pathname === '/api' || target.pathname.startsWith('/api/')) return 'bypass';
  if (target.pathname.startsWith('/_next/static/')) return 'cache-first';
  // The login page is never kept: nothing about authentication is cached.
  if (mode === 'navigate')
    return /\/login(\/|$)/.test(target.pathname) ? 'network-only' : 'network-first';
  return 'bypass';
}

function offlinePageFor(pathname) {
  return pathname === '/en' || pathname.startsWith('/en/') ? OFFLINE_PAGES.en : OFFLINE_PAGES.es;
}

/** Caches of other versions (to delete on activate). */
function staleCaches(names, version) {
  return names.filter((name) => name.startsWith('aiq-') && !name.endsWith(`-${version}`));
}

/** The /_next/static files an HTML page references (scripts, styles, fonts). */
function assetsIn(html) {
  const found = new Set();
  for (const match of html.matchAll(/["'(](\/_next\/static\/[^"')\s]+)["')]/g)) found.add(match[1]);
  return [...found];
}

/** Only complete, same-origin, successful responses are stored. */
function cacheable(response) {
  return Boolean(response) && response.ok && response.type === 'basic';
}

self.aiqSw = {
  VERSION,
  STATIC_CACHE,
  PAGES_CACHE,
  PRECACHE,
  strategyFor,
  offlinePageFor,
  staleCaches,
  assetsIn,
  cacheable,
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGES_CACHE);
      await pages.addAll(PRECACHE);
      // The offline page must render without the network: keep its assets too.
      const statics = await caches.open(STATIC_CACHE);
      for (const page of [OFFLINE_PAGES.es, OFFLINE_PAGES.en]) {
        const response = await pages.match(page);
        if (response) await statics.addAll(assetsIn(await response.text()));
      }
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await Promise.all(
        staleCaches(await caches.keys(), VERSION).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const strategy = strategyFor({
    url: request.url,
    method: request.method,
    mode: request.mode,
    hasAuthorization: request.headers.has('authorization'),
    origin: self.location.origin,
  });
  if (strategy === 'bypass') return;

  if (strategy === 'cache-first') {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (cacheable(response)) {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (strategy === 'network-first' && cacheable(response)) {
          const cache = await caches.open(PAGES_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = strategy === 'network-first' ? await caches.match(request) : undefined;
        return (
          cached ||
          (await caches.match(offlinePageFor(new URL(request.url).pathname))) ||
          Response.error()
        );
      }
    })(),
  );
});
