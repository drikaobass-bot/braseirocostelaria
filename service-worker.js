/* ============================================================
   BRASEIRO COSTELARIA — Service Worker
   Estratégia: Cache First para assets, Network First para HTML
   ============================================================ */

const CACHE_VERSION = 'v1.0.2';
const CACHE_STATIC  = `braseiro-static-${CACHE_VERSION}`;
const CACHE_DYNAMIC = `braseiro-dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/admin.js',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/logo/logo.png'
];

/* ── Install ───────────────────────────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(async cache => {
      // Adiciona assets um a um para evitar que a falha de um arquivo isole todo o cache
      await Promise.allSettled(
        STATIC_ASSETS.map(url => 
          fetch(new Request(url, { cache: 'reload' }))
            .then(res => {
              if (res.ok) return cache.put(url, res);
            })
            .catch(err => console.warn(`[SW] Falha ao pré-cachear: ${url}`, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

/* ── Activate ──────────────────────────────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('braseiro-') && k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch ─────────────────────────────────────────────────── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignorar requisições não-GET (POST, PUT, DELETE) e requisições externas (WhatsApp, APIs, CDN)
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // 2. HTML / Documentos: Network First
  if (request.headers.get('accept')?.includes('text/html') || request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // 3. Assets estáticos (CSS, JS, Imagens, Fontes): Cache First
  event.respondWith(cacheFirst(request));
});

/* ── Estratégia: Cache First ──────────────────────────────── */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);

    // Salvar no cache dinâmico se a resposta for válida
    if (response && response.status === 200 && response.type === 'basic') {
      const cache = await caches.open(CACHE_DYNAMIC);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Retorna fallback se for imagem ou offline
    return caches.match('/index.html');
  }
}

/* ── Estratégia: Network First ────────────────────────────── */
async function networkFirst(request) {
  try {
    const response = await fetch(request);

    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || caches.match('/index.html');
  }
}
