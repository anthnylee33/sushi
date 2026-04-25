/* Minimal service worker for sushi PWA.
 *
 * Strategy:
 *   - On install: cache the app shell (index.html and the current icons).
 *   - On activate: purge any old caches (bumped via CACHE_VERSION).
 *   - On fetch:
 *       * Navigation requests (SPA entry points) use network-first with a
 *         cached index.html fallback, so the app opens offline.
 *       * Same-origin GET requests use a cache-first strategy and populate
 *         the runtime cache on first successful fetch. Vite's hashed asset
 *         filenames mean stale entries stay correct — updated bundles are
 *         served from the network on their first request.
 *
 * This file is intentionally plain JS so it can be shipped as-is from
 * /public without going through Vite's module transform.
 */

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `sushi-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `sushi-runtime-${CACHE_VERSION}`;

const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa-icon.svg',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests: prefer fresh HTML, fall back to cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() =>
          caches.match('/index.html').then(
            (cached) => cached ?? new Response('Offline', { status: 503 }),
          ),
        ),
    );
    return;
  }

  // Cache-first for static assets (including Vite's hashed /assets/* bundles).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match('/index.html').then(
            (fallback) => fallback ?? new Response('Offline', { status: 503 }),
          ),
        );
    }),
  );
});
