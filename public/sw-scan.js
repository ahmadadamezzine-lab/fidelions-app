// public/sw-scan.js
//
// Service worker minimal pour le mode "marche sans connexion" de l'écran de
// scan employé (pages/scan/[token].js). Portée volontairement limitée à
// /scan/ (voir l'appel à navigator.serviceWorker.register avec
// {scope: "/scan/"}) — il ne touche à rien d'autre sur le site.
//
// Stratégie "stale-while-revalidate" pour les requêtes GET de même
// origine : on sert immédiatement la version en cache si elle existe (donc
// la page se recharge même hors connexion, une fois qu'elle a été ouverte
// au moins une fois avec du réseau), tout en la rafraîchissant en
// arrière-plan dès que le réseau est disponible. Les requêtes vers les
// API (/api/...) ne sont PAS mises en cache : leurs données changent tout
// le temps et doivent rester fraîches — c'est la file d'actions côté page
// (voir enqueueStamp/flushQueue) qui gère la vraie logique hors-ligne pour
// l'ajout de points, pas ce service worker.

const CACHE_NAME = "fidelions-scan-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // jamais les API — toujours frais

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => null);

      // Sert le cache tout de suite s'il existe (rapide, marche hors-ligne),
      // sinon attend le réseau.
      return cached || (await networkFetch) || new Response("Hors connexion.", { status: 503 });
    })
  );
});
