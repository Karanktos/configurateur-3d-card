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

---

## 🤖 Section réservée aux IA — créer un plan à partir d'une photo ou d'un croquis

*Pour l'utilisateur : copie tout ce chapitre (jusqu'à la fin) dans ChatGPT, Claude, Gemini…, joins ta photo ou ton croquis et donne quelques cotes (ex. « le salon fait 5 m de long »).
L'IA te renvoie un fichier `plan.json` : enregistre-le, puis ouvre-le dans le configurateur avec le bouton **Ouvrir**. Vérification facultative : `node tools/valider-plan.mjs plan.json`.
Plan d'exemple : [`docs/exemple-plan.json`](docs/exemple-plan.json). Liste complète des 164 modèles de meubles (identifiants, tailles, couleurs) : [`docs/IMPORT-IA.md`](docs/IMPORT-IA.md#modèles-de-meubles-disponibles-model).*

**Instructions pour l'IA** — le texte ci-dessous est destiné à l'IA qui lit ce document.

### Consigne à copier-coller pour l'IA

> Tu es chargé de convertir la photo / le croquis joint en un fichier JSON pour le Configurateur 3D, en suivant strictement le document
> `docs/IMPORT-IA.md`. Demande-moi d'abord une cote de référence si le croquis n'en porte aucune (longueur d'un mur, largeur d'une porte…).
> Réponds uniquement par le JSON complet (un seul bloc), sans commentaire. N'utilise que les identifiants de modèles listés dans le document.
> Vérifie : identifiants uniques, `wall` des ouvertures = id d'un mur existant, `s` compris entre 0 et la longueur du mur, `nid` supérieur à tous les identifiants.

### Repère et unités

* Mètres. **x** vers la droite (est), **z** vers le bas du plan (sud) ; le nord est en haut (z négatif). L'origine (0, 0) est le coin nord-ouest de la maison.
* **y** (hauteur) n'est pas dans les coordonnées : hauteur du mur `h`, hauteur d'un meuble `h`, surélévation `elev`.
* Rotation `rot` d'un meuble en degrés (0 = face avant vers le sud (le bas du plan), 90 = vers l'est, 180 = vers le nord, 270 = vers l'ouest).
* Épaisseur de mur courante : 0,2 m (extérieur), 0,1 m (cloison). Hauteur sous plafond courante : 2,5 m.

### Structure du fichier

```json
{ "walls": [], "openings": [], "floors": [], "items": [], "markers": [], "lights": [], "meta": { "rot": 0, "v": 2, "plot": true }, "nid": 100 }
```

`id` : entier unique pour chaque mur, ouverture, sol, meuble, pastille, groupe de lumières. `nid` = plus grand id + 1.

#### Murs (`walls`)
```json
{ "id": 1, "x1": 0, "z1": 0, "x2": 10, "z2": 0, "t": 0.2, "h": 2.5, "fa": { "c": "#f2efe9", "f": "peinture" }, "fb": { "c": "#e9e1d2", "f": "crepi" } }
```
Un mur va du point (x1, z1) au point (x2, z2). Les murs extérieurs sont tracés **dans le sens horaire** (nord vers l'est, est vers le sud, sud vers l'ouest, ouest vers le nord) :
la **face A (`fa`) est alors l'intérieur**, la face B (`fb`) l'extérieur. Les cloisons : mettre la face A du côté de la pièce principale.
`c` = couleur hexadécimale ; `f` = finition : `peinture` (Peinture), `crepi` (Crépi), `brique` (Briques), `lambris` (Lambris bois), `beton` (Béton), `pierre` (Pierre), `faience` (Faïence métro).

#### Sols (`floors`) — rectangles
```json
{ "id": 7, "x": 0, "z": 0, "w": 6.5, "d": 7, "mat": "parquet", "color": "#e0bb8c", "scale": 1 }
```
(x, z) = coin nord-ouest, `w` = largeur (est-ouest), `d` = profondeur (nord-sud). Un sol par pièce rectangulaire (une pièce en L = deux rectangles).
`mat` : `parquet` (Parquet), `tile4` (Carrelage 25 cm), `tile2` (Carrelage 50 cm), `tile1` (Grande dalle 1 m), `marbre` (Marbre), `beton` (Béton ciré), `moquette` (Moquette), `pierre` (Pierre naturelle), `damier` (Damier), `chevron` (Parquet en chevron), `planches` (Parquet larges lames), `hexa` (Carreaux hexagonaux), `terrazzo` (Terrazzo), `terrasse` (Terrasse bois), `paves` (Pavés), `pelouse` (Pelouse), `uni` (Uni (résine)).

#### Ouvertures (`openings`) : portes et fenêtres
```json
{ "id": 20, "kind": "door", "model": "battant", "wall": 1, "s": 2.0, "w": 0.9, "h": 2.04, "y0": 0, "mat": "bois", "frame": "#ffffff", "leaf": "#e9e4da",
  "glass": "clair", "bars": 0, "handle": "inox", "hinge": "L", "side": 1, "shutter": false, "shutterColor": "#d8d4cc", "open": 0, "shut": 0, "ent": "", "ent2": "", "shutEnt": "" }
```
`wall` = id du mur ; `s` = distance en mètres, le long du mur, entre son point de départ (x1, z1) et le **centre** de l'ouverture (l'ouverture doit tenir dans le mur : `w/2 <= s <= longueur - w/2`).
`kind` = `door` ou `window`. `y0` = hauteur de l'allège (bas de l'ouverture), `h` = hauteur. `mat` : `pvc`, `alu`, `bois`. `hinge` : `L` ou `R` (charnière à gauche / à droite) ;
`side` : 1 ou -1 (sens d'ouverture, de l'intérieur vers l'extérieur ou l'inverse). `shutter: true` ajoute un volet roulant. Laisser `ent`, `ent2`, `shutEnt` vides (entités Home Assistant, à relier ensuite).

Modèles de **portes** (`model` : nom, largeur × hauteur par défaut) :
* `battant` — Porte pleine (0.9×2.04 m)
* `vitree` — Porte vitrée (0.9×2.04 m)
* `double` — Double porte (1.4×2.04 m)
* `coulissante` — Porte coulissante (0.9×2.04 m)
* `entree` — Porte d'entrée (0.95×2.15 m)
* `passage` — Passage (sans porte) (1×2.1 m)
* `sectionnelle` — Porte de garage (2.8×2.25 m)
* `porte_fenetre` — Porte-fenêtre vitrée (0.9×2.15 m)
* `double_vitree` — Double porte vitrée (1.4×2.15 m)
* `coulissante_vitree` — Porte coulissante vitrée (1×2.15 m)
* `blindee` — Porte blindée (0.9×2.04 m)
* `service` — Porte de service (0.83×2.04 m)
* `cave` — Porte basse (cave) (0.7×1.8 m)
* `grande_ouverture` — Grande ouverture (1.8×2.1 m)
* `garage_simple` — Porte de garage simple (2.4×2.1 m)
* `garage_double` — Porte de garage double (4.8×2.25 m)

Modèles de **fenêtres** (`y0` par défaut entre parenthèses) :
* `fixe` — Fenêtre fixe (1×1 m, allège 0.9 m)
* `battant1` — 1 vantail (0.7×1.25 m, allège 0.9 m)
* `battant2` — 2 vantaux (1.2×1.25 m, allège 0.9 m)
* `coulissant` — Coulissante (1.6×1.25 m, allège 0.9 m)
* `baie2` — Baie 2 vantaux (2×2.15 m, allège 0 m)
* `baie2d` — Baie 2 vantaux mobiles (2×2.15 m, allège 0 m)
* `baie3` — Baie 3 vantaux (3×2.15 m, allège 0 m)
* `baie4` — Baie 4 vantaux (4.25×2.15 m, allège 0 m)
* `rond` — Œil-de-bœuf (0.7×0.7 m, allège 1.4 m)
* `bandeau` — Bandeau haut (1.2×0.45 m, allège 1.9 m)
* `bandeau_long` — Bandeau long (2.4×0.5 m, allège 1.9 m)
* `fixe_grande` — Grande fenêtre fixe (1.6×1.3 m, allège 0.8 m)
* `vitrage_plein` — Vitrage plein pied (2.4×2.15 m, allège 0 m)
* `petite` — Petite fenêtre (WC, cellier) (0.5×0.6 m, allège 1.5 m)
* `pf1` — Porte-fenêtre 1 vantail (0.9×2.15 m, allège 0 m)
* `pf2` — Porte-fenêtre 2 vantaux (1.4×2.15 m, allège 0 m)
* `battant2_large` — 2 vantaux large (1.8×1.25 m, allège 0.9 m)
* `coulissant_petit` — Coulissante 1 m (1×1 m, allège 1 m)
* `coulissant_grand` — Coulissante 2,4 m (2.4×1.25 m, allège 0.9 m)

#### Meubles (`items`)
```json
{ "id": 31, "model": "canape3", "x": 2.6, "z": 3.9, "rot": 90, "elev": 0, "w": 2.1, "d": 0.92, "h": 0.82, "fin": "mat", "v": 0, "open": 0, "c1": "#9aa5a8", "c2": "#5a4636", "ent": "" }
```
(x, z) = **centre** du meuble ; `w` (largeur), `d` (profondeur), `h` (hauteur) peuvent être modifiés (garder entre 0,6 et 2 fois la valeur par défaut) ; `c1`, `c2`… = couleurs ; `fin` : `mat`, `bois` ou `brillant`.
`elev` = surélévation (meuble mural). Les éléments « posés » (plaque de cuisson, micro-ondes, évier à poser, petit électroménager) prennent `elev` = hauteur du plan de travail sous eux (0,85 pour un meuble bas de cuisine).
Pour un plan de travail : `"plan": "strat"` (valeurs : `strat`, `bois`, `pierre`, `granit`, `marbre`, `quartz`, `beton`, `inox`).

**Lumières** : un groupe dans `lights` (`{ "id": 52, "name": "Lumière séjour", "ent": "", "ic": "mdi:ceiling-light", "x": 3.2, "z": 3.5, "h": 2 }`), et ses points lumineux dans `items`
avec `"model": "spot"` (ou `plafonnier`, `suspension`, `applique`…), `"grp": 52` (id du groupe) et `"elev": 2.26`.

**Pastilles / capteurs** (`markers`) : `{ "id": 62, "x": 8.0, "z": 0.1, "ic": "mdi:window-closed-variant", "h": 2, "title": "Fenêtre chambre", "action": "auto", "ent": "" }`.

#### Méta
`"meta": { "rot": 0, "v": 2, "plot": true }` : `rot` = orientation réelle du nord (degrés, 0 si inconnu), `plot: true` ajoute le terrain autour de la maison.

### Méthode conseillée

1. Repérer l'échelle (une cote écrite, ou une porte = 0,9 m) ; l'indiquer en commentaire à l'utilisateur si c'est une estimation.
2. Placer l'origine au coin nord-ouest de la maison ; relever les murs extérieurs puis les cloisons. Aligner les points sur une grille de 0,1 m.
3. Ajouter les sols (un par pièce), puis les portes et fenêtres (`wall` + `s`), puis les gros meubles.
4. Vérifier avec `node tools/valider-plan.mjs plan.json` (contrôle des références et des identifiants).
5. Ouvrir le fichier dans le Configurateur (**Ouvrir**), corriger à la souris.

### Meubles : identifiants des modèles

La liste complète des meubles (`model`), avec dimensions par défaut, surélévation et couleurs, est dans [`docs/IMPORT-IA.md`](https://raw.githubusercontent.com/Karanktos/configurateur-3d-card/main/docs/IMPORT-IA.md)
(lien « brut » à lire par l'IA). Un exemple de plan complet : [`docs/exemple-plan.json`](https://raw.githubusercontent.com/Karanktos/configurateur-3d-card/main/docs/exemple-plan.json).
Identifiants courants : `canape2`, `canape3`, `fauteuil`, `tablebasse`, `meubletv`, `table`, `chaise`, `lit90`, `lit140`, `lit160`, `armoire2`, `armoire3`, `commode`, `kbas60`, `kbas80`, `ktiroirs`, `khaut`, `kevier`, `frigo`, `cuisiniere`, `lavelinge`, `wc`, `vasque`, `baignoire`, `douche`, `bureau`, `plante`, `tapis`, `spot`, `plafonnier`.
