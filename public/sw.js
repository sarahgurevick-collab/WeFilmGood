// Le service worker de WeFilmGood : il rend le site installable comme
// une application, et affiche une page « hors ligne » quand il n'y a
// pas de réseau.
//
// Volontairement, il ne met AUCUNE page du site en cache : les fiches,
// les messages et les profils sont réservés aux membres connectés, et
// une copie gardée sur le téléphone pourrait être vue par quelqu'un
// d'autre, ou montrer une version périmée. Seule la page hors ligne,
// publique et sans données, est gardée.
const CACHE = "wfg-hors-ligne-v1";
const HORS_LIGNE = "/hors-ligne";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(new Request(HORS_LIGNE, { cache: "reload" }))),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Seules les ouvertures de page sont concernées ; tout le reste
  // (images, données, paiement) passe directement par le réseau.
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(HORS_LIGNE)));
});
