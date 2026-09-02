/* =========================================================
   STOCKAGE — partagé par les trois pages.
   Ce fichier ne touche jamais à l'affichage. Il ne fait que
   lire et écrire les données, et définir les listes de
   référence (types, unités, jours).
   ========================================================= */

const CLE_STOCKAGE = 'mes-recettes';
const CLE_PLAN = 'mon-plan-semaine';

const TYPES = ['Invités', 'Express', 'Rapide'];

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const REPAS = ['Midi', 'Soir'];

/* Les unités.
   - code     : ce qui est stocké dans les données
   - libelle  : ce qu'on lit dans le menu déroulant
   - affichage: ce qui apparaît sur la fiche
   Le premier élément, code vide, sert aux choses qui se comptent :
   3 courgettes, 1 gousse d'ail. */
const UNITES = [
  { code: '',   libelle: '(aucune)',    affichage: ''        },
  { code: 'CC', libelle: 'CC — c. à café',  affichage: 'c. à c.' },
  { code: 'CS', libelle: 'CS — c. à soupe', affichage: 'c. à s.' },
  { code: 'ML', libelle: 'ML — millilitres', affichage: 'ml'   },
  { code: 'CL', libelle: 'CL — centilitres', affichage: 'cl'   },
  { code: 'DL', libelle: 'DL — décilitres',  affichage: 'dl'   },
  { code: 'L',  libelle: 'L — litres',       affichage: 'l'    },
  { code: 'G',  libelle: 'G — grammes',      affichage: 'g'    },
  { code: 'KG', libelle: 'KG — kilogrammes', affichage: 'kg'   }
];


/* =========================================================
   RECETTES

   Les recettes sont gardées en mémoire une fois lues.
   Sans ce cache, chaque appel à chargerRecettes() refaisait
   un JSON.parse complet PUIS renormalisait tous les
   ingrédients — et la page semaine l'appelle une dizaine de
   fois par affichage. Invisible à dix recettes, poussif à
   deux cents.
   ========================================================= */

// null = pas encore lu. Un tableau vide est une valeur valide,
// d'où le null plutôt qu'un [] comme état initial.
let cacheRecettes = null;


function chargerRecettes() {
  if (cacheRecettes === null) {
    cacheRecettes = lireRecettesDepuisStockage();
  }
  return cacheRecettes;
}


function lireRecettesDepuisStockage() {
  const brut = localStorage.getItem(CLE_STOCKAGE);

  // Au tout premier lancement la clé n'existe pas : getItem renvoie null
  // et JSON.parse(null) ferait planter le script. D'où ce garde-fou.
  if (!brut) return [];

  try {
    const donnees = JSON.parse(brut);
    if (!Array.isArray(donnees)) return [];
    // Les recettes saisies avant les unités sont converties au passage.
    return donnees.map(normaliserRecette);
  } catch (erreur) {
    console.error('Données illisibles dans le stockage :', erreur);
    return [];
  }
}


function sauvegarderRecettes(liste) {
  cacheRecettes = liste;
  localStorage.setItem(CLE_STOCKAGE, JSON.stringify(liste));
}


// Si le carnet est ouvert dans deux onglets, l'écriture faite dans
// l'un rendrait le cache de l'autre faux. L'événement 'storage' est
// justement émis dans les AUTRES onglets : on y vide le cache.
window.addEventListener('storage', function (e) {
  if (e.key === CLE_STOCKAGE) cacheRecettes = null;
  if (e.key === CLE_PLAN) cachePlan = null;
});


function ajouterRecette(recette) {
  const liste = chargerRecettes();
  liste.push(recette);
  sauvegarderRecettes(liste);
}


function supprimerRecette(id) {
  const liste = chargerRecettes().filter(function (r) { return r.id !== id; });
  sauvegarderRecettes(liste);
}


function trouverRecette(id) {
  const trouvee = chargerRecettes().find(function (r) { return r.id === id; });
  return trouvee || null;
}


// map() reconstruit le tableau : chaque recette est gardée telle quelle,
// sauf celle dont l'identifiant correspond.
function mettreAJourRecette(recette) {
  const liste = chargerRecettes().map(function (r) {
    return r.id === recette.id ? recette : r;
  });
  sauvegarderRecettes(liste);
}


/* =========================================================
   INGRÉDIENTS

   Un ingrédient est maintenant un objet :
     { quantite: 20, unite: 'CL', nom: 'crème' }
   Avant, c'était une simple chaîne : "20 cl de crème".
   Les fonctions ci-dessous rattrapent l'ancien format pour
   que tes recettes déjà saisies ne soient pas perdues.
   ========================================================= */

function normaliserRecette(recette) {
  recette.ingredients = (recette.ingredients || []).map(normaliserIngredient);
  return recette;
}


function normaliserIngredient(ingredient) {
  // Déjà au bon format : rien à faire.
  if (ingredient && typeof ingredient === 'object') {
    return {
      quantite: ingredient.quantite === '' || ingredient.quantite === null
        ? null : Number(ingredient.quantite),
      unite: ingredient.unite || '',
      nom: ingredient.nom || ''
    };
  }

  // Ancien format : on tente de découper "20 cl de crème".
  const texte = String(ingredient).trim();
  const decoupe = texte.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);

  if (!decoupe) {
    return { quantite: null, unite: '', nom: texte };
  }

  const quantite = Number(decoupe[1].replace(',', '.'));
  let reste = decoupe[2];
  let unite = '';

  // Le premier mot est-il une unité connue ?
  const premierMot = reste.split(/\s+/)[0].toLowerCase().replace(/\.$/, '');
  const correspondance = UNITES.find(function (u) {
    return u.code !== '' && u.affichage.toLowerCase() === premierMot;
  });

  if (correspondance) {
    unite = correspondance.code;
    reste = reste.slice(reste.indexOf(premierMot) + premierMot.length).trim();
  }

  // "de crème" devient "crème"
  reste = reste.replace(/^(de |d'|du |des )/i, '').trim();

  return { quantite: quantite, unite: unite, nom: reste };
}


/* Les familles d'unités, pour additionner ce qui est additionnable.
   200 ml + 2 dl font 400 ml, mais une cuillère à café ne s'ajoute
   pas à des millilitres : CC et CS restent dans leur coin, parce
   qu'une c. à c. de sel et 5 ml de sel ne s'achètent pas pareil. */
const FAMILLES = {
  ML: { famille: 'volume', versBase: 1 },
  CL: { famille: 'volume', versBase: 10 },
  DL: { famille: 'volume', versBase: 100 },
  L:  { famille: 'volume', versBase: 1000 },
  G:  { famille: 'masse',  versBase: 1 },
  KG: { famille: 'masse',  versBase: 1000 }
};


function familleUnite(code) {
  return FAMILLES[code] ? FAMILLES[code].famille : ('seule:' + code);
}


// Ramène une quantité à l'unité de base de sa famille (ml ou g).
function versBase(quantite, code) {
  return FAMILLES[code] ? quantite * FAMILLES[code].versBase : quantite;
}


// Repasse de l'unité de base à l'unité la plus lisible.
// 1500 g deviennent 1,5 kg ; 250 ml restent 250 ml.
function depuisBase(total, famille) {
  if (famille === 'volume') {
    return total >= 1000
      ? { quantite: total / 1000, unite: 'L' }
      : { quantite: total, unite: 'ML' };
  }
  if (famille === 'masse') {
    return total >= 1000
      ? { quantite: total / 1000, unite: 'KG' }
      : { quantite: total, unite: 'G' };
  }
  // Famille « seule:CODE » : on récupère le code après les deux-points.
  return { quantite: total, unite: famille.split(':')[1] };
}


// Combien de fois faut-il cuisiner la recette pour nourrir la tablée ?
// Une recette pour 1 quand on est 2 à table se fait en double.
function multiplicateur(recette, taille) {
  if (!recette.personnes || recette.personnes <= 0) return 1;
  return Math.max(1, Math.ceil(taille / recette.personnes));
}


// 2,5 plutôt que 2.5 ; 200 plutôt que 200,00.
function formaterNombre(valeur) {
  return String(Math.round(valeur * 100) / 100).replace('.', ',');
}


// La mesure seule : "20 cl", "3", ou "" si rien n'est renseigné.
function formaterMesure(ingredient) {
  const unite = UNITES.find(function (u) { return u.code === ingredient.unite; });
  const morceaux = [];

  if (ingredient.quantite !== null && !isNaN(ingredient.quantite)) {
    morceaux.push(formaterNombre(ingredient.quantite));
  }
  if (unite && unite.affichage) {
    morceaux.push(unite.affichage);
  }

  return morceaux.join(' ');
}


// Transforme un ingrédient en texte lisible : "20 cl crème", "3 courgettes".
function formaterIngredient(ingredient) {
  const mesure = formaterMesure(ingredient);
  return mesure ? mesure + ' ' + ingredient.nom : ingredient.nom;
}


/* =========================================================
   PLAN DE SEMAINE

   Le plan est un objet unique, rangé sous sa propre clé.
   Chaque créneau porte SES contraintes et la recette qui
   lui est attribuée.
   ========================================================= */

function clePlan(jour, repas) {
  return jour + '-' + repas;
}


// Toutes les clés dans l'ordre chronologique : Lundi-Midi, Lundi-Soir, etc.
// L'ordre compte pour propager les restes sur les repas suivants.
function clesOrdonnees() {
  const cles = [];
  JOURS.forEach(function (jour) {
    REPAS.forEach(function (repas) {
      cles.push(clePlan(jour, repas));
    });
  });
  return cles;
}


function planParDefaut() {
  const creneaux = {};

  JOURS.forEach(function (jour, indexJour) {
    REPAS.forEach(function (repas) {
      // La règle demandée : du lundi au vendredi, le midi part au travail.
      const enSemaine = indexJour <= 4;
      const transportable = enSemaine && repas === 'Midi';

      creneaux[clePlan(jour, repas)] = {
        types: TYPES.slice(),      // slice() copie le tableau au lieu de le partager
        vegetarien: false,
        transportable: transportable,
        recetteId: null,
        reste: false               // true = on remange le plat de la veille
      };
    });
  });

  return { taille: 2, creneaux: creneaux };
}


let cachePlan = null;


function chargerPlan() {
  if (cachePlan !== null) return cachePlan;

  const brut = localStorage.getItem(CLE_PLAN);
  if (!brut) {
    cachePlan = planParDefaut();
    return cachePlan;
  }

  try {
    const plan = JSON.parse(brut);
    const defaut = planParDefaut();

    // Si un créneau manque (données anciennes, jour renommé),
    // on le remplace par sa version par défaut plutôt que de planter.
    clesOrdonnees().forEach(function (cle) {
      if (!plan.creneaux || !plan.creneaux[cle]) {
        plan.creneaux = plan.creneaux || {};
        plan.creneaux[cle] = defaut.creneaux[cle];
      }
    });

    plan.taille = plan.taille || 2;
    cachePlan = plan;
  } catch (erreur) {
    console.error('Plan illisible :', erreur);
    cachePlan = planParDefaut();
  }

  return cachePlan;
}


function sauvegarderPlan(plan) {
  cachePlan = plan;
  localStorage.setItem(CLE_PLAN, JSON.stringify(plan));
}
