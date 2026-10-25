'use strict';

// Bump CACHE when any app file changes so phones pick up the new version.
const CACHE = 'birds-v10';
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

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
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
