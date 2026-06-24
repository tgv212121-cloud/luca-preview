// Service worker DÉDIÉ au Web Push. Il ne met RIEN en cache (aucun handler
// 'fetch'), donc il ne perturbe pas le chargement de l'app. Son seul rôle :
// afficher une notification quand un push arrive, et ouvrir l'app au clic.
//
// Règle iOS impérative : afficher une notification visible à CHAQUE push reçu,
// sinon iOS révoque l'abonnement.

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  var data = { title: 'Lucas', body: '', url: './' };
  try {
    if (event.data) {
      var recu = event.data.json();
      data.title = recu.title || data.title;
      data.body = recu.body || data.body;
      data.url = recu.url || data.url;
      data.tag = recu.tag;
    }
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'icons/Icon-192.png',
      badge: 'icons/Icon-192.png',
      data: { url: data.url },
      tag: data.tag,
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var cible = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    (async function () {
      var fenetres = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (var i = 0; i < fenetres.length; i++) {
        var f = fenetres[i];
        if ('focus' in f) {
          try { await f.navigate(cible); } catch (e) {}
          return f.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(cible);
    })()
  );
});
