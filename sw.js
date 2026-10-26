'use strict';

// Bump CACHE when any app file changes so phones pick up the new version.
const CACHE = 'birds-v12';
const FILES = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'zip.js',
  'manifest.webmanifest',
  'data/species.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'fonts/literata-latin-400-normal.woff2',
  'fonts/literata-latin-ext-400-normal.woff2',
  'fonts/literata-latin-400-italic.woff2',
  'fonts/literata-latin-ext-400-italic.woff2',
  'fonts/literata-latin-500-normal.woff2',
  'fonts/literata-latin-ext-500-normal.woff2',
];

// cache: 'reload' skips the browser's own HTTP cache, so a new version never stores stale copies
// of files that GitHub Pages served a few minutes earlier.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(FILES.map((file) =>
        fetch(new Request(file, { cache: 'reload' })).then((res) => {
          if (!res.ok) throw new Error(`${file}: ${res.status}`);
          return cache.put(file, res);
        })
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache first so the app opens with no signal; fall back to the network for anything else.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((hit) => hit || fetch(event.request))
  );
});
