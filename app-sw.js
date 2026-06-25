// Service worker du SHELL de l'app : permet de LANCER Lucas sans reseau.
//
// - PRE-CHARGEMENT a l'installation : on cache tout de suite les fichiers vitaux
//   pour que le lancement hors-ligne ne depende pas du hasard des fetchs.
// - NETWORK-FIRST sur le code de l'app : en ligne on prend TOUJOURS la derniere
//   version (jamais bloque sur une vieille), hors-ligne on sert le cache.
// - CACHE-FIRST sur CanvasKit et les assets (gros et immuables).
//
// CanvasKit est servi en LOCAL (build --no-web-resources-cdn), donc cachable et
// disponible hors-ligne.

const CACHE = 'lucas-shell-v3';

const SHELL = [
  './',
  'index.html',
  'flutter.js',
  'flutter_bootstrap.js',
  'main.dart.js',
  'manifest.json',
  'favicon.png',
  'canvaskit/canvaskit.js',
  'canvaskit/canvaskit.wasm',
  'assets/AssetManifest.bin.json',
  'assets/AssetManifest.json',
  'assets/FontManifest.json',
  'assets/NOTICES',
  'assets/fonts/MaterialIcons-Regular.otf',
  'icons/Icon-192.png',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    (async function () {
      try {
        const cache = await caches.open(CACHE);
        // add individuel + allSettled : un fichier manquant ne casse pas tout.
        await Promise.allSettled(
          SHELL.map(function (u) {
            return cache.add(u);
          })
        );
      } catch (e) {}
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    (async function () {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter(function (k) {
              return k.indexOf('lucas-shell') === 0 && k !== CACHE;
            })
            .map(function (k) {
              return caches.delete(k);
            })
        );
      } catch (e) {}
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const memeOrigine = url.origin === self.location.origin;
  // Polices texte que CanvasKit telecharge depuis Google : a cacher aussi,
  // sinon le texte ne s'affiche pas hors-ligne (les icones, elles, sont locales).
  const estPoliceTexte = url.hostname === 'fonts.gstatic.com';

  if (!memeOrigine && !estPoliceTexte) return;
  // version.json doit rester frais (detection des mises a jour).
  if (memeOrigine && url.pathname.endsWith('version.json')) return;

  const estAsset =
    estPoliceTexte ||
    url.pathname.indexOf('/canvaskit/') !== -1 ||
    url.pathname.indexOf('/assets/') !== -1;

  if (estAsset) {
    // Cache-first : gros fichiers immuables.
    event.respondWith(
      (async function () {
        const cached = await caches.match(req);
        if (cached) return cached;
        const fresh = await fetch(req);
        if (fresh && (fresh.status === 200 || fresh.type === 'opaque')) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      })()
    );
    return;
  }

  // Code de l'app : network-first (toujours frais en ligne, cache en secours).
  event.respondWith(
    (async function () {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.status === 200) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === 'navigate') {
          const idx =
            (await caches.match('./')) || (await caches.match('index.html'));
          if (idx) return idx;
        }
        throw e;
      }
    })()
  );
});
