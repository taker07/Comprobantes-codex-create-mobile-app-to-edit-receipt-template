const CACHE_NAME = 'comprobantes-v18';
const ASSETS = [
  '.',
  'index.html',
  'styles.css',
  'app.js',
  'template-renderer.js',
  'template-designer.html',
  'template-designer.css',
  'template-designer.js',
  'manifest.webmanifest',
  'icon.svg',
  'bbva-logo.png',
  'bbva-logo.svg',
  'templates/index.json',
  'templates/defaults/bbva.standard.json',
  'templates/defaults/banorte.detail.json',
  'templates/defaults/banorte.base.json',
  'templates/assets/banorte-cb.png',
  'templates/assets/banorte-detail.jpg',
  'templates/assets/bbva-share.jpg',
  'templates/assets/fonts/Montserrat-Variable.ttf',
  'templates/assets/fonts/Montserrat-OFL.txt',
  'templates/assets/fonts/Inter-Variable.ttf',
  'templates/assets/fonts/Inter-OFL.txt',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});

