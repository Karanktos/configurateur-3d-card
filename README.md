# Configurateur 3D pour Home Assistant

Dessinez votre maison en 3D (façon Sims / IKEA : murs, sols, portes, fenêtres, meubles, lumières), puis affichez-la dans un tableau de bord Home Assistant
où elle réagit en direct à vos entités : volets, portes et fenêtres qui s'ouvrent, lumières qui s'allument, capteurs, soleil réel ou simulé.

![Aperçu](docs/apercu.png)

## Installation (HACS)

1. HACS → ⋮ → **Dépôts personnalisés** → collez l'adresse de ce dépôt, catégorie **Tableau de bord** (Dashboard) → Ajouter.
2. Installez **Configurateur 3D**, puis rechargez la page (Ctrl+F5). HACS enregistre la ressource tout seul.
3. Intégrez la carte dans un tableau de bord (section suivante).

## Intégrer le configurateur dans un tableau de bord

Le configurateur est une carte Home Assistant : `custom:configurateur-3d-card`. Le plus simple est de lui dédier une page entière.

1. **Paramètres → Tableaux de bord → Ajouter un tableau de bord → Nouveau tableau de bord vide**. Donnez-lui un titre (par exemple *Configurateur*).
2. Ouvrez ce tableau de bord, cliquez sur ✏️ (en haut à droite), puis sur ⋮ → **Éditeur de configuration brute**.
3. Remplacez tout le contenu par le code suivant, puis **Enregistrer** :

```yaml
views:
  - title: Configurateur
    path: configurateur
    type: panel
    cards:
      - type: custom:configurateur-3d-card
        height: calc(100vh - 56px)
```

4. Fermez l'éditeur et cliquez sur **Terminé**. Si la carte reste vide ou affiche « Custom element doesn't exist », faites Ctrl+F5.

Ce que fait ce code : `type: panel` donne toute la page à une seule carte, `custom:configurateur-3d-card` est la carte du configurateur,
et `height` règle sa hauteur (`calc(100vh - 56px)` = tout l'écran moins la barre du haut ; vous pouvez mettre une valeur fixe comme `700px`).

**Dans un tableau de bord existant** : ✏️ → **Ajouter une carte** → **Manuel**, puis collez seulement :

```yaml
type: custom:configurateur-3d-card
height: 700px
```

Le configurateur s'ouvre avec un petit appartement d'exemple (lumières et capteurs non reliés : cliquez sur un élément puis choisissez l'entité dans le panneau de droite).
Les plans sont enregistrés dans les données de votre utilisateur Home Assistant.

## Publier votre maison

Dans le configurateur, bouton **Publier** : le plan est copié dans une carte en lecture seule (`readonly: true`) d'un tableau de bord de votre choix, créé automatiquement.
La vue publiée a un fond transparent, une barre Auto / Jour / Soir / 3D libre, un panneau **Soleil** (heure, date, direct, orientation, boussole) et, pour les administrateurs,
un mode **⚙ Configurer** (ajouter, déplacer, supprimer capteurs et lumières, relier fenêtres, portes, volets et meubles animés à vos entités, enregistrer dans le tableau de bord).

## 🤖 Créer un plan à partir d'une photo ou d'un croquis (avec une IA)

Une IA (ChatGPT, Claude, Gemini…) peut transformer une photo, un croquis à la main ou un plan en fichier `plan.json` que le configurateur sait ouvrir.

1. Ouvre une conversation avec l'IA et joins ta photo ou ton croquis.
2. Copie-colle ce message (le lien donne à l'IA tout le format du plan) et remplace la dernière ligne par tes cotes :

```text
Lis ce document : https://raw.githubusercontent.com/Karanktos/configurateur-3d-card/main/docs/IMPORT-IA.md
Puis, à partir de la photo jointe, fabrique le fichier plan.json pour le Configurateur 3D en suivant strictement ce document.
Réponds uniquement par le JSON complet, dans un seul bloc de code.
Cotes connues : (ex. le salon fait 5 m de long, la porte d'entrée 0,9 m)
```

3. Copie le JSON reçu dans un fichier texte nommé `plan.json`.
4. Dans le configurateur, clique sur **Ouvrir** et choisis ce fichier, puis corrige à la souris ce qui doit l'être.

Conseils : donne au moins une cote (sans échelle, l'IA devine les dimensions) ; si l'IA répond qu'elle ne peut pas ouvrir le lien, copie le contenu de
[`docs/IMPORT-IA.md`](docs/IMPORT-IA.md) directement dans la conversation. Un plan d'exemple est disponible : [`docs/exemple-plan.json`](docs/exemple-plan.json).
Vérification facultative d'un fichier : `node tools/valider-plan.mjs plan.json`.

## Remarques

* three.js est chargé depuis jsDelivr (version épinglée) : un accès internet est nécessaire au navigateur.
* Au plus 8 lumières (6 sur téléphone) projettent des ombres en même temps (limite des unités de texture du GPU).
* Pas d'étage ni de toit ; les sols sont rectangulaires.

## Développement

```
npm i
npm run build      # produit dist/configurateur-3d-card.js (un seul fichier, ce que HACS installe)
```

Code dans `js/` (état et scène `core.js`, outils `tools.js`, panneaux `ui.js`, pastilles `pins.js`, vue maison `present.js`, liaison Home Assistant `ha.js`,
catalogue de meubles `catalog.js`). Ajouter un meuble : un appel `reg(...)` dans `js/catalog.js`.
Penser à reconstruire `dist/` avant chaque version : HACS installe le fichier du dépôt.

## Licence

MIT
