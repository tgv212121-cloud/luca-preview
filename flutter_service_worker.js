'use strict';
// Service worker « kill switch ». Remplace l'ancien service worker resté en
// cache sur les appareils : il vide les caches, se désinscrit lui-même, puis
// recharge les onglets pour servir la version à jour (désormais sans cache).
self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    try {
      var keys = await caches.keys();
      await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    } catch (e) {}
    try {
      await self.registration.unregister();
    } catch (e) {}
    try {
      var clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(function (c) { c.navigate(c.url); });
    } catch (e) {}
  })());
});

// Aucune interception de requêtes : tout passe directement au réseau.
self.addEventListener('fetch', function (event) {});
