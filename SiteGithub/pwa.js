/* =========================================================
   Enregistrement du service worker.
   Chargé par les trois pages.
   ========================================================= */

// Le service worker exige https, ou localhost pour le développement.
// Un fichier ouvert en file:// ne peut pas en avoir : le site
// marchera quand même, simplement sans mode hors ligne.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function (erreur) {
      console.log('Mode hors ligne indisponible :', erreur.message);
    });
  });
}
