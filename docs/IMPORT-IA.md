# Fabriquer un plan à partir d'une photo ou d'un croquis (pour une IA)

Ce document explique à une IA (ChatGPT, Claude, Gemini…) comment produire un **fichier `plan.json`** que le Configurateur 3D sait ouvrir
(bouton **Ouvrir** de la barre du haut). Donne-lui ce fichier, ta photo / ton croquis, et les dimensions que tu connais.

## Consigne à copier-coller pour l'IA

> Tu es chargé de convertir la photo / le croquis joint en un fichier JSON pour le Configurateur 3D, en suivant strictement le document
> `docs/IMPORT-IA.md`. Demande-moi d'abord une cote de référence si le croquis n'en porte aucune (longueur d'un mur, largeur d'une porte…).
> Réponds uniquement par le JSON complet (un seul bloc), sans commentaire. N'utilise que les identifiants de modèles listés dans le document.
> Vérifie : identifiants uniques, `wall` des ouvertures = id d'un mur existant, `s` compris entre 0 et la longueur du mur, `nid` supérieur à tous les identifiants.

## Repère et unités

* Mètres. **x** vers la droite (est), **z** vers le bas du plan (sud) ; le nord est en haut (z négatif). L'origine (0, 0) est le coin nord-ouest de la maison.
* **y** (hauteur) n'est pas dans les coordonnées : hauteur du mur `h`, hauteur d'un meuble `h`, surélévation `elev`.
* Rotation `rot` d'un meuble en degrés (0 = face avant vers le sud (le bas du plan), 90 = vers l'est, 180 = vers le nord, 270 = vers l'ouest).
* Épaisseur de mur courante : 0,2 m (extérieur), 0,1 m (cloison). Hauteur sous plafond courante : 2,5 m.

## Structure du fichier

```json
{ "walls": [], "openings": [], "floors": [], "items": [], "markers": [], "lights": [], "meta": { "rot": 0, "v": 2, "plot": true }, "nid": 100 }
```

`id` : entier unique pour chaque mur, ouverture, sol, meuble, pastille, groupe de lumières. `nid` = plus grand id + 1.

### Murs (`walls`)
```json
{ "id": 1, "x1": 0, "z1": 0, "x2": 10, "z2": 0, "t": 0.2, "h": 2.5, "fa": { "c": "#f2efe9", "f": "peinture" }, "fb": { "c": "#e9e1d2", "f": "crepi" } }
```
Un mur va du point (x1, z1) au point (x2, z2). Les murs extérieurs sont tracés **dans le sens horaire** (nord vers l'est, est vers le sud, sud vers l'ouest, ouest vers le nord) :
la **face A (`fa`) est alors l'intérieur**, la face B (`fb`) l'extérieur. Les cloisons : mettre la face A du côté de la pièce principale.
`c` = couleur hexadécimale ; `f` = finition : `peinture` (Peinture), `crepi` (Crépi), `brique` (Briques), `lambris` (Lambris bois), `beton` (Béton), `pierre` (Pierre), `faience` (Faïence métro).

### Sols (`floors`) — rectangles
```json
{ "id": 7, "x": 0, "z": 0, "w": 6.5, "d": 7, "mat": "parquet", "color": "#e0bb8c", "scale": 1 }
```
(x, z) = coin nord-ouest, `w` = largeur (est-ouest), `d` = profondeur (nord-sud). Un sol par pièce rectangulaire (une pièce en L = deux rectangles). La taille du motif (`scale`) va de 0,4 à 2,5 (1 = taille réelle du carreau ou de la lame) ; une valeur hors de cette plage est ramenée dans les limites au chargement.
`mat` : `parquet` (Parquet), `tile4` (Carrelage 25 cm), `tile2` (Carrelage 50 cm), `tile1` (Grande dalle 1 m), `marbre` (Marbre), `beton` (Béton ciré), `moquette` (Moquette), `pierre` (Pierre naturelle), `damier` (Damier), `chevron` (Parquet en chevron), `planches` (Parquet larges lames), `hexa` (Carreaux hexagonaux), `terrazzo` (Terrazzo), `terrasse` (Terrasse bois), `paves` (Pavés), `pelouse` (Pelouse), `travertin_30x60` (Travertin 30 × 60), `travertin_40x40` (Travertin 40 × 40), `travertin_60x60` (Travertin 60 × 60), `travertin_90x60` (Travertin 90 × 60), `travertin_60x120` (Travertin 60 × 120), `travertin_opus` (Travertin opus (formats mixtes)), `gres_30` (Grès cérame 30 × 30), `gres_60` (Grès cérame 60 × 60), `gres_80` (Grès cérame 80 × 80), `gres_60x120` (Grès cérame 60 × 120), `beton_60` (Effet béton 60 × 60), `beton_80` (Effet béton 80 × 80), `marbre_60` (Effet marbre 60 × 60), `marbre_60x120` (Effet marbre 60 × 120), `bois_gres` (Grès effet bois 20 × 120), `stratifie` (Parquet stratifié (lames clipsables)), `vinyle` (Sol vinyle lames PVC), `ciment` (Carreaux de ciment), `tomette` (Tomettes hexagonales), `zellige` (Zellige), `ardoise` (Ardoise), `uni` (Uni (résine)).

### Ouvertures (`openings`) : portes et fenêtres
```json
{ "id": 20, "kind": "door", "model": "battant", "wall": 1, "s": 2.0, "w": 0.9, "h": 2.04, "y0": 0, "mat": "bois", "frame": "#ffffff", "leaf": "#e9e4da",
  "glass": "clair", "bars": 0, "handle": "inox", "hinge": "L", "side": 1, "shutter": false, "shutFlip": 0, "shutterColor": "#d8d4cc", "open": 0, "shut": 0, "ent": "", "ent2": "", "shutEnt": "" }
```
`wall` = id du mur ; `s` = distance en mètres, le long du mur, entre son point de départ (x1, z1) et le **centre** de l'ouverture (l'ouverture doit tenir dans le mur : `w/2 <= s <= longueur - w/2`).
`kind` = `door` ou `window`. `y0` = hauteur de l'allège (bas de l'ouverture), `h` = hauteur. `mat` : `pvc`, `alu`, `bois`. `hinge` : `L` ou `R` (charnière à gauche / à droite) ;
`side` : 1 ou -1 (sens d'ouverture, de l'intérieur vers l'extérieur ou l'inverse). `shutter: true` ajoute un volet roulant, placé du côté opposé au sens d'ouverture (`shutFlip: 1` le met de l'autre côté du mur). Laisser `ent`, `ent2`, `shutEnt` vides (entités Home Assistant, à relier ensuite).

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

### Meubles (`items`)
```json
{ "id": 31, "model": "canape3", "x": 2.6, "z": 3.9, "rot": 90, "elev": 0, "w": 2.1, "d": 0.92, "h": 0.82, "fin": "mat", "v": 0, "open": 0, "c1": "#9aa5a8", "c2": "#5a4636", "ent": "" }
```
(x, z) = **centre** du meuble ; `w` (largeur), `d` (profondeur), `h` (hauteur) peuvent être modifiés (garder entre 0,6 et 2 fois la valeur par défaut) ; `c1`, `c2`… = couleurs ; `fin` : `mat`, `bois` ou `brillant`.
`elev` = surélévation (meuble mural). Les éléments « posés » (plaque de cuisson, micro-ondes, évier à poser, petit électroménager) prennent `elev` = hauteur du plan de travail sous eux (0,85 pour un meuble bas de cuisine).
Pour un plan de travail : `"plan": "strat"` (valeurs : `strat`, `bois`, `pierre`, `granit`, `marbre`, `quartz`, `beton`, `inox`).

**Lumières** : un groupe dans `lights` (`{ "id": 52, "name": "Lumière séjour", "ent": "", "ic": "mdi:ceiling-light", "x": 3.2, "z": 3.5, "h": 2 }`), et ses points lumineux dans `items`
avec `"model": "spot"` (ou `plafonnier`, `suspension`, `applique`…), `"grp": 52` (id du groupe) et `"elev": 2.26`.

**Pastilles / capteurs** (`markers`) : `{ "id": 62, "x": 8.0, "z": 0.1, "ic": "mdi:window-closed-variant", "h": 2, "title": "Fenêtre chambre", "action": "auto", "ent": "" }`.

### Méta
`"meta": { "rot": 0, "v": 2, "plot": true }` : `rot` = orientation réelle du nord (degrés, 0 si inconnu), `plot: true` ajoute le terrain autour de la maison.

## Méthode conseillée

1. Repérer l'échelle (une cote écrite, ou une porte = 0,9 m) ; l'indiquer en commentaire à l'utilisateur si c'est une estimation.
2. Placer l'origine au coin nord-ouest de la maison ; relever les murs extérieurs puis les cloisons. Aligner les points sur une grille de 0,1 m.
3. Ajouter les sols (un par pièce), puis les portes et fenêtres (`wall` + `s`), puis les gros meubles.
4. Vérifier avec `node tools/valider-plan.mjs plan.json` (contrôle des références et des identifiants).
5. Ouvrir le fichier dans le Configurateur (**Ouvrir**), corriger à la souris.

## Modèles de meubles disponibles (`model`)

Colonnes : identifiant — nom — largeur × profondeur × hauteur (m) — surélévation par défaut — couleurs (c1, c2…).


### Chambre

* `lit90` — Lit simple 90 — 0.98×2×0.85 — couleurs : Cadre, Linge de lit
* `lit140` — Lit double 140 — 1.48×2.05×0.95 — couleurs : Cadre, Linge de lit
* `lit160` — Lit double 160 — 1.68×2.1×1.05 — couleurs : Cadre, Linge de lit
* `chevet` — Table de chevet — 0.45×0.4×0.5 — couleurs : Corps, Pieds
* `commode` — Commode 3 tiroirs — 0.8×0.45×0.85 — couleurs : Corps, Pieds
* `armoire2` — Armoire 2 portes — 1×0.58×2 — couleurs : Façades
* `armoire3` — Armoire 3 portes — 1.5×0.58×2 — couleurs : Façades
* `coiffeuse` — Coiffeuse avec miroir — 1×0.45×1.5 — couleurs : Corps, Pieds
* `banc_lit` — Banc de bout de lit — 1.2×0.4×0.45 — couleurs : Assise, Pieds
* `armoire_coulissante` — Armoire portes coulissantes — 2×0.62×2.3 — couleurs : Corps, Portes
* `commode6` — Commode 6 tiroirs — 1.4×0.5×0.78 — couleurs : Corps, Poignées
* `chiffonnier` — Chiffonnier 5 tiroirs — 0.7×0.45×1.3 — couleurs : Corps, Poignées
* `chevet_susp` — Chevet suspendu — 0.4×0.3×0.25 — elev 0.45 — couleurs : Corps, Poignées
* `dressing_ouvert` — Dressing ouvert — 1.6×0.55×2 — couleurs : Corps, Penderie
* `tete_de_lit` — Tête de lit capitonnée — 1.8×0.1×1.2 — elev 0.3 — couleurs : Tissu

### Salon

* `canape2` — Canapé 2 places — 1.6×0.9×0.82 — couleurs : Tissu, Pieds
* `canape3` — Canapé 3 places — 2.1×0.92×0.82 — couleurs : Tissu, Pieds
* `canape_angle` — Canapé d'angle — 2.6×1.7×0.82 — couleurs : Tissu, Pieds, Variante
* `canape_conv` — Canapé convertible — 2×0.92×0.85 — couleurs : Tissu, Pieds
* `fauteuil` — Fauteuil — 0.85×0.88×0.84 — couleurs : Tissu, Pieds
* `tablebasse` — Table basse — 1×0.55×0.42 — couleurs : Plateau, Pieds
* `tablebasse_r` — Table basse ronde — 0.8×0.8×0.4 — couleurs : Plateau, Pied
* `meubletv` — Meuble TV — 1.6×0.4×0.5 — couleurs : Façades, Pieds
* `tv` — TV 55" sur pied — 1.25×0.2×0.75
* `tv_mur` — TV 55" murale — 1.25×0.06×0.72 — elev 0.9
* `biblio` — Bibliothèque — 0.8×0.28×2.02 — couleurs : Corps
* `pouf` — Pouf — 0.5×0.5×0.4 — couleurs : Tissu
* `gueridon` — Table d'appoint ronde — 0.5×0.5×0.55 — couleurs : Plateau, Pied
* `console` — Console d'entrée — 1×0.3×0.8 — couleurs : Plateau, Structure
* `etagere_cubes` — Étagère à cubes 4×4 — 1.5×0.39×1.5 — couleurs : Corps, Casiers
* `poele` — Poêle à bois — 0.5×0.45×1.1 — couleurs : Corps, Vitre
* `fauteuil_coque` — Fauteuil coque — 0.8×0.8×0.85 — couleurs : Coque, Pied
* `bergere` — Bergère — 0.78×0.82×1 — couleurs : Tissu, Pieds
* `chauffeuse` — Chauffeuse — 0.75×0.85×0.8 — couleurs : Tissu, Pieds
* `table_basse_carree` — Table basse carrée — 0.8×0.8×0.38 — couleurs : Plateau, Pieds
* `enfilade` — Enfilade basse — 1.8×0.4×0.55 — couleurs : Corps, Poignées
* `meuble_tv_tiroirs` — Meuble TV 2 tiroirs — 1.5×0.4×0.45 — couleurs : Corps, Poignées
* `biblio_haute` — Bibliothèque haute 5 niveaux — 0.8×0.3×2 — couleurs : Corps, Poignées
* `vitrine_salon` — Vitrine — 0.8×0.4×1.8 — couleurs : Corps, Poignées
* `etagere_murale` — Étagères murales (lot de 3) — 0.8×0.22×0.6 — elev 1.2 — couleurs : Planches

### Salle à manger

* `buffet` — Buffet — 1.6×0.45×0.85 — couleurs : Façades, Pieds
* `table` — Table à manger — 1.6×0.9×0.75 — couleurs : Plateau, Pieds
* `table_r` — Table ronde — 1.1×1.1×0.75 — couleurs : Plateau, Pied
* `chaise` — Chaise — 0.45×0.5×0.88 — couleurs : Assise, Pieds
* `tabouret` — Tabouret de bar — 0.38×0.38×0.75 — couleurs : Assise, Structure
* `banc` — Banc — 1.4×0.35×0.45 — couleurs : Assise, Pieds
* `vaisselier` — Vaisselier vitré — 1.2×0.45×1.9 — couleurs : Corps, Poignées
* `table_haute` — Table haute (bar) — 1.2×0.6×1 — couleurs : Plateau, Pieds
* `table_extensible` — Table extensible 2,2 m — 2.2×1×0.75 — couleurs : Plateau, Pieds
* `chaise_bar` — Chaise de bar — 0.42×0.45×1 — couleurs : Assise, Pieds
* `chaise_visiteur` — Chaise coque — 0.48×0.52×0.82 — couleurs : Coque, Pieds

### Cuisine

* `kbas60` — Meuble bas 60 (1 porte) — 0.6×0.6×0.85 — couleurs : Façades, Plan de travail — option `plan=strat|bois|pierre|granit|marbre|quartz|beton|inox`
* `kbas80` — Meuble bas 80 (2 portes) — 0.8×0.6×0.85 — couleurs : Façades, Plan de travail — option `plan=strat|bois|pierre|granit|marbre|quartz|beton|inox`
* `ktiroirs` — Meuble bas 60 (3 tiroirs) — 0.6×0.6×0.85 — couleurs : Façades, Plan de travail — option `plan=strat|bois|pierre|granit|marbre|quartz|beton|inox`
* `khaut` — Meuble haut 60 — 0.6×0.35×0.7 — elev 1.45 — couleurs : Façades
* `kevier` — Évier 120 + meuble — 1.2×0.6×0.85 — couleurs : Façades, Plan de travail — option `plan=strat|bois|pierre|granit|marbre|quartz|beton|inox`
* `ilot` — Îlot central — 1.8×0.9×0.92 — couleurs : Caissons, Plan — option `plan=strat|bois|pierre|granit|marbre|quartz|beton|inox`
* `colonne_four` — Colonne four + micro-ondes — 0.6×0.6×2.1 — couleurs : Façades
* `kbas40` — Meuble bas 40 — 0.4×0.6×0.85 — couleurs : Façades, Plan de travail — option `plan=strat|bois|pierre|granit|marbre|quartz|beton|inox`
* `kbas120` — Meuble bas 120 (4 tiroirs / portes) — 1.2×0.6×0.85 — couleurs : Façades, Plan de travail — option `plan=strat|bois|pierre|granit|marbre|quartz|beton|inox`
* `kbas_four` — Meuble bas pour four — 0.6×0.6×0.85 — couleurs : Façades, Plan de travail — option `plan=strat|bois|pierre|granit|marbre|quartz|beton|inox`
* `khaut40` — Meuble haut 40 — 0.4×0.35×0.7 — elev 1.45 — couleurs : Façades
* `khaut80` — Meuble haut 80 — 0.8×0.35×0.7 — elev 1.45 — couleurs : Façades
* `khaut_vitre` — Meuble haut vitré 60 — 0.6×0.35×0.7 — elev 1.45 — couleurs : Cadre
* `colonne_frigo` — Colonne pour réfrigérateur — 0.6×0.6×2.1 — couleurs : Façades, Plan de travail
* `colonne_rangement` — Colonne de rangement — 0.6×0.6×2.1 — couleurs : Façades, Plan de travail
* `plan_travail` — Plan de travail seul — 1.2×0.6×0.04 — elev 0.85 — couleurs : Teinte — option `plan=strat|bois|pierre|granit|marbre|quartz|beton|inox`
* `desserte` — Desserte à roulettes — 0.6×0.4×0.85 — couleurs : Plateaux, Structure
* `hotte_ilot` — Hotte îlot — 0.9×0.5×1.1 — elev 1.55 — couleurs : Inox
* `evier_pose` — Évier à poser (1 bac + égouttoir) — 0.8×0.5×0.2 — couleurs : Inox

### Électroménager

* `frigo` — Réfrigérateur combiné — 0.6×0.65×1.85 — couleurs : Façade
* `frigo_us` — Réfrigérateur américain — 0.9×0.7×1.78 — couleurs : Façade
* `lavelinge` — Lave-linge hublot — 0.6×0.6×0.85
* `seche` — Sèche-linge — 0.6×0.6×0.85
* `lavevaisselle` — Lave-vaisselle — 0.6×0.6×0.85 — couleurs : Façade
* `cuisiniere` — Cuisinière 4 feux + four — 0.6×0.62×0.85 — couleurs : Façade
* `four` — Four encastrable — 0.6×0.55×0.6 — elev 0.9 — couleurs : Façade
* `micro` — Micro-ondes — 0.5×0.38×0.3 — elev 0.9 — couleurs : Corps
* `hotte` — Hotte aspirante — 0.6×0.5×0.85 — elev 1.55 — couleurs : Corps
* `clim` — Climatiseur mural — 0.9×0.22×0.3 — elev 2 — couleurs : Corps
* `chauffeeau` — Chauffe-eau 200 L — 0.55×0.55×1.6 — couleurs : Cuve
* `radiateur` — Radiateur panneau — 1×0.1×0.6 — elev 0.15 — couleurs : Corps
* `congelateur` — Congélateur coffre — 1×0.65×0.85 — couleurs : Corps
* `plaque_induction` — Plaque de cuisson — 0.6×0.52×0.01 — couleurs : Verre
* `cave_vin` — Cave à vin — 0.6×0.6×0.85 — couleurs : Corps
* `cafetiere` — Machine à café — 0.2×0.3×0.35 — couleurs : Corps
* `bouilloire` — Bouilloire — 0.2×0.2×0.25 — couleurs : Corps
* `grille_pain` — Grille-pain — 0.3×0.17×0.2 — couleurs : Corps

### Salle de bain

* `vasque` — Meuble vasque 80 — 0.8×0.46×0.85 — couleurs : Meuble, Vasque
* `miroir` — Miroir mural — 0.6×0.04×0.8 — elev 1.1 — couleurs : Cadre
* `wc` — WC avec réservoir — 0.4×0.7×0.8
* `baignoire` — Baignoire 170 — 1.7×0.75×0.58 — couleurs : Coque
* `douche` — Cabine de douche 90 — 0.9×0.9×2.1 — couleurs : Profilés
* `seche_serv` — Sèche-serviettes — 0.5×0.1×1.2 — elev 0.3 — couleurs : Corps
* `double_vasque` — Meuble double vasque — 1.4×0.5×0.85 — couleurs : Meuble, Vasques
* `meuble_colonne` — Colonne de salle de bain — 0.35×0.3×1.7 — couleurs : Corps
* `baignoire_ilot` — Baignoire îlot — 0.8×1.7×0.6 — couleurs : Cuve
* `douche_ital` — Douche à l'italienne — 1.2×0.9×2 — couleurs : Receveur
* `wc_suspendu` — WC suspendu — 0.36×0.52×0.4
* `lave_mains` — Lave-mains — 0.45×0.25×0.85 — couleurs : Vasque
* `sous_vasque` — Meuble sous vasque 80 — 0.8×0.46×0.85 — couleurs : Meuble, Vasque
* `porte_serviettes` — Sèche-serviettes — 0.5×0.1×1.2 — elev 0.3 — couleurs : Chrome
* `panier_linge` — Panier à linge — 0.4×0.3×0.6 — couleurs : Osier

### Bureau

* `bureau` — Bureau avec caisson — 1.4×0.7×0.74 — couleurs : Plateau, Structure
* `chaise_bureau` — Chaise de bureau — 0.6×0.6×1 — couleurs : Tissu, Base
* `bureau_debout` — Bureau assis-debout — 1.4×0.7×1 — couleurs : Plateau, Structure
* `etagere_livres` — Bibliothèque basse — 1.2×0.3×0.8 — couleurs : Corps
* `caisson_roulant` — Caisson à roulettes — 0.42×0.55×0.6 — couleurs : Corps, Poignées
* `bureau_angle` — Bureau d'angle — 1.6×1.4×0.74 — couleurs : Plateau, Structure
* `etagere_bureau` — Étagère de bureau — 0.8×0.3×1.2 — couleurs : Corps, Poignées

### Déco

* `tapis` — Tapis 200×300 — 2×3×0.015 — couleurs : Couleur, Bordure
* `tapis_r` — Tapis rond Ø 160 — 1.6×1.6×0.015 — couleurs : Couleur
* `plante` — Plante en pot — 0.5×0.5×1.3 — couleurs : Pot, Feuillage
* `tableau` — Cadre décoratif — 0.8×0.03×0.6 — elev 1.4 — couleurs : Cadre, Toile
* `miroir_rond` — Miroir rond — 0.7×0.04×0.7 — elev 1.1 — couleurs : Cadre
* `cadres` — Trois cadres — 1×0.03×0.5 — elev 1.4 — couleurs : Cadres, Images
* `vase` — Vase avec fleurs — 0.25×0.25×0.7 — couleurs : Vase, Fleurs
* `rideau` — Rideau — 1.6×0.12×2.4 — couleurs : Tissu
* `horloge` — Horloge murale — 0.4×0.04×0.4 — elev 1.7 — couleurs : Cadre
* `palmier` — Grande plante (palmier) — 0.8×0.8×1.8 — couleurs : Pot, Feuillage
* `plaid_pouf` — Coussins (lot de 3) — 0.5×0.2×0.4 — elev 0.4 — couleurs : Tissu

### Éclairage

* `lampadaire` — Lampadaire — 0.4×0.4×1.6 — couleurs : Structure, Abat-jour
* `plafonnier` — Plafonnier — 0.28×0.28×0.03 — elev 2.26
* `spot` — Spot encastré — 0.12×0.12×0.02 — elev 2.26
* `reglette` — Réglette LED — 1.2×0.08×0.04 — elev 2.24
* `applique` — Applique murale — 0.12×0.12×0.2 — elev 1.9
* `projecteur` — Projecteur — 0.14×0.26×0.14 — elev 2.3
* `potelet` — Potelet extérieur — 0.14×0.14×0.62
* `suspension` — Suspension — 0.44×0.44×0.2 — elev 1.85 — couleurs : Abat-jour
* `lampe_poser` — Lampe à poser — 0.25×0.25×0.45 — couleurs : Abat-jour
* `lustre` — Lustre à 5 branches — 0.7×0.7×0.5 — elev 2
* `rail` — Rail de 3 spots — 1×0.1×0.12 — elev 2.3
* `lanterne` — Lanterne murale extérieure — 0.18×0.2×0.3 — elev 2
* `liseuse` — Liseuse de chevet — 0.1×0.25×0.1 — elev 1.2
* `lampadaire_arc` — Lampadaire arc — 0.5×1.6×2.1

### Extérieur

* `voiture1` — Voiture compacte — 1.72×4.06×1.4 — couleurs : Carrosserie, Vitres
* `voiture2` — Voiture berline — 1.72×4.03×1.46 — couleurs : Carrosserie, Vitres
* `table_jardin` — Table de jardin — 1.6×0.9×0.74 — couleurs : Plateau, Pieds
* `chaise_jardin` — Chaise de jardin — 0.55×0.58×0.85 — couleurs : Assise, Pieds
* `transat` — Transat — 0.6×1.6×0.85 — couleurs : Toile, Structure
* `parasol` — Parasol — 2.6×2.6×2.5 — couleurs : Toile, Mât
* `barbecue` — Barbecue — 1.2×0.6×1.05 — couleurs : Corps, Plan
* `arbre` — Arbre — 2.5×2.5×4 — couleurs : Feuillage, Tronc
* `haie` — Haie — 3×0.6×1.4 — couleurs : Feuillage
* `piscine` — Piscine — 6×3×0.3 — couleurs : Eau, Margelle
* `pergola` — Pergola — 3×3×2.5 — couleurs : Structure, Lames
* `abri_jardin` — Abri de jardin — 2×1.6×2.2 — couleurs : Murs, Toit
* `banc_jardin` — Banc de jardin — 1.5×0.55×0.85 — couleurs : Lames, Structure
* `bac_potager` — Bac potager — 1.2×0.8×0.4 — couleurs : Bois, Terre
* `jardiniere` — Jardinière fleurie — 0.8×0.25×0.35 — couleurs : Bac, Fleurs
* `cloture` — Palissade (panneau) — 1.8×0.05×1.5 — couleurs : Lames
* `portillon` — Portillon — 1×0.05×1.2 — couleurs : Cadre
* `carport` — Abri voiture (carport) — 3×5.5×2.5 — couleurs : Structure, Toit
* `trampoline` — Trampoline — 3×3×0.9 — couleurs : Toile, Cadre

### Enfant

* `lit70` — Lit enfant 70×140 — 0.78×1.45×0.7 — couleurs : Cadre, Linge de lit
* `lit_cabane` — Lit cabane — 1×2×1.6 — couleurs : Bois, Linge
* `bureau_enfant` — Bureau enfant — 1×0.55×0.62 — couleurs : Plateau, Pieds
* `rangement_jouets` — Rangement à bacs — 1×0.4×0.7 — couleurs : Cadre, Bacs
* `tipi` — Tipi de jeu — 1.1×1.1×1.4 — couleurs : Toile, Mâts

### Entrée

* `porte_manteaux` — Porte-manteaux mural — 0.8×0.1×0.25 — elev 1.5 — couleurs : Planche, Patères
* `meuble_chaussures` — Meuble à chaussures — 0.8×0.3×1.1 — couleurs : Corps, Poignées
* `banc_chaussures` — Banc à chaussures — 1×0.35×0.5 — couleurs : Assise, Structure
* `miroir_pied` — Miroir sur pied — 0.5×0.4×1.6 — couleurs : Cadre
* `portant` — Portant à vêtements — 1×0.45×1.65 — couleurs : Structure
