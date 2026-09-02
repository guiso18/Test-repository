# Le carnet — cuisine maison

Carnet de recettes personnel et planificateur de repas. Trois pages : consulter
le carnet, composer la semaine, ajouter une recette. Aucun serveur, aucune base
de données, aucune dépendance externe : du HTML, du CSS et du JavaScript.

## Développement en local

Ouvrir le dossier dans VS Code, puis clic droit sur `index.html` →
**Open with Live Server**.

Ne pas ouvrir les fichiers en double-cliquant dessus. En `file://`, le
navigateur traite chaque page comme un site différent : les trois pages ne
partageraient plus le même stockage, et le mode hors ligne ne fonctionnerait
pas.

Pour tester depuis le téléphone sur le réseau local, activer
`liveServer.settings.useLocalIp` dans les réglages de VS Code, puis ouvrir
`http://<ip-de-l-ordinateur>:5500` sur le téléphone.

## Mise en ligne sur GitHub Pages

1. Créer un dépôt sur GitHub, par exemple `carnet-recettes`.
2. Envoyer le contenu de ce dossier :

   ```bash
   git init
   git add .
   git commit -m "Première version du carnet"
   git branch -M main
   git remote add origin https://github.com/<compte>/carnet-recettes.git
   git push -u origin main
   ```

3. Dans le dépôt : **Settings → Pages → Source: Deploy from a branch**,
   branche `main`, dossier `/ (root)`. Enregistrer.
4. Au bout d'une minute, le site est en ligne à l'adresse
   `https://<compte>.github.io/carnet-recettes/`.

Tous les chemins du projet sont relatifs (`./style.css` et non `/style.css`),
ce qui est indispensable : sur GitHub Pages le site vit dans un sous-dossier.

## Installation sur le téléphone

Ouvrir l'adresse du site dans le navigateur du téléphone, puis :

- **Android / Chrome** : menu ⋮ → *Ajouter à l'écran d'accueil*.
- **iPhone / Safari** : bouton Partager → *Sur l'écran d'accueil*.

Le carnet s'ouvre alors en plein écran, sans barre d'adresse, et fonctionne
sans réseau.

## Après chaque modification

Le service worker garde une copie des fichiers sur l'appareil. Si le numéro de
version ne change pas, le téléphone continuera d'afficher l'ancienne version
même après un `git push`.

**Modifier `VERSION` en haut de `sw.js`** (`carnet-v1` → `carnet-v2`, etc.)
avant chaque envoi.

## Où sont mes recettes ?

Dans le `localStorage` du navigateur, pas dans le dépôt. Chaque appareil a donc
son propre carnet, et vider le cache du navigateur les efface.

Pour transférer les recettes d'un appareil à un autre : page **Ajouter** →
*Exporter en fichier*, puis *Importer un fichier* sur l'autre appareil.
À faire de temps en temps, c'est la seule sauvegarde qui existe.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `index.html` / `liste.js` | Consulter le carnet, filtrer par catégorie |
| `semaine.html` / `semaine.js` | Plan de la semaine, tirage, liste de courses |
| `ajouter.html` / `ajouter.js` | Créer et modifier une recette |
| `stockage.js` | Lecture/écriture des données, unités, conversions |
| `style.css` | Toute la mise en forme |
| `sw.js` / `pwa.js` / `manifest.json` | Installation et mode hors ligne |

`stockage.js` est le seul fichier à réécrire le jour où les données passeront
sur un vrai serveur. Les autres n'en sauront rien.
