# Configurateur 3D pour Home Assistant

Dessinez votre maison en 3D (façon Sims / IKEA : murs, sols, portes, fenêtres, meubles, lumières), puis affichez-la dans un tableau de bord Home Assistant
où elle réagit en direct à vos entités : volets, portes et fenêtres qui s'ouvrent, lumières qui s'allument, capteurs, soleil réel ou simulé.

![Aperçu](docs/apercu.png)

## Installation (HACS)

1. HACS → ⋮ → **Dépôts personnalisés** → collez l'adresse de ce dépôt, catégorie **Tableau de bord** (Dashboard) → Ajouter.
2. Installez **Configurateur 3D**, puis rechargez la page (Ctrl+F5). HACS enregistre la ressource tout seul.
3. Créez un tableau de bord (Paramètres → Tableaux de bord → Ajouter → *Nouveau tableau de bord vide*), ouvrez-le, puis ✏️ → ⋮ → **Éditeur de configuration brute**
   et remplacez tout le contenu par :

```yaml
views:
  - title: Configurateur
    path: configurateur
    type: panel
    cards:
      - type: custom:configurateur-3d-card
        height: calc(100vh - 56px)
```

Enregistrez, puis Ctrl+F5 si la carte ne s'affiche pas.

Le configurateur s'ouvre avec un petit appartement d'exemple. Les plans sont enregistrés dans les données de votre utilisateur Home Assistant.

## Publier votre maison

Dans le configurateur, bouton **Publier** : le plan est copié dans une carte en lecture seule (`readonly: true`) d'un tableau de bord de votre choix, créé automatiquement.
La vue publiée a un fond transparent, une barre Auto / Jour / Soir / 3D libre, un panneau **Soleil** (heure, date, direct, orientation, boussole) et, pour les administrateurs,
un mode **⚙ Configurer** (ajouter, déplacer, supprimer capteurs et lumières, relier fenêtres, portes, volets et meubles animés à vos entités, enregistrer dans le tableau de bord).

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
