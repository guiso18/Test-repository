/* =========================================================
   SERVICE WORKER

   Il garde une copie des fichiers du site dans le navigateur.
   Résultat : le carnet s'ouvre instantanément, et fonctionne
   sans réseau — au magasin, dans le train, en cuisine.

   IMPORTANT — à faire à chaque modification du site :
   change le numéro de VERSION ci-dessous. C'est le seul
   signal qui dit au navigateur de recharger les fichiers.
   Sans ça, ton téléphone continuera d'afficher l'ancienne
   version indéfiniment, même après un envoi sur GitHub.
   ========================================================= */

const VERSION = 'carnet-v1';

// Les chemins sont relatifs (./) et non absolus (/), parce que
// sur GitHub Pages le site vit dans un sous-dossier :
// https://ton-compte.github.io/nom-du-depot/
const FICHIERS = [
  './',
  './index.html',
  './ajouter.html',
  './semaine.html',
  './style.css',
  './stockage.js',
  './liste.js',
  './ajouter.js',
  './semaine.js',
  './pwa.js',
  './manifest.json',
  './favicon.svg',
  './icone-192.png',
  './icone-512.png',
  './icone-maskable-512.png',
  './icone-apple-180.png'
];


// À l'installation : on met tout en cache d'un coup.
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION)
      .then(function (cache) { return cache.addAll(FICHIERS); })
      .then(function () { return self.skipWaiting(); })
  );
});


// À l'activation : on supprime les caches des versions précédentes.
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (noms) {
      return Promise.all(noms.map(function (nom) {
        if (nom !== VERSION) return caches.delete(nom);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});


// À chaque requête : on sert la copie locale si elle existe.
self.addEventListener('fetch', function (e) {
  // On ne s'occupe que des lectures de nos propres fichiers.
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(function (reponse) {
      if (reponse) return reponse;

      return fetch(e.request).then(function (reseau) {
        // On garde au passage ce qu'on vient de télécharger.
        const copie = reseau.clone();
        caches.open(VERSION).then(function (cache) {
          cache.put(e.request, copie);
        });
        return reseau;
      }).catch(function () {
        // Hors ligne et fichier jamais vu : pour une navigation,
        // on renvoie la page d'accueil plutôt qu'une erreur.
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
