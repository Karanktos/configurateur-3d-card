# Pack d'assets réalistes pour le Configurateur 3D (v1)

Textures PBR et HDRI issus de **Poly Haven (CC0)**, préparés avec Blender. Phase 1 : sols, murs, textures de meubles, HDRI.
Les modèles 3D (GLB) viennent en phase 2 : `models` est vide dans `materials.json` pour l'instant.

## Contenu
```
materials.json        catalogue lu par la carte (voir "Conventions")
CREDITS.md            source Poly Haven de chaque image
hdri/white_studio_05_1k.hdr
textures/<cle>/color.jpg | normal.jpg | arm.jpg        (1k)
textures/<cle>/512/color.jpg | normal.jpg | arm.jpg    (variante mobile)
```
Clés : `floor-<mat>` (40 sols, tous les ids du champ "mat" sauf `uni`), `wall-<finition>` (crepi, brique, lambris, beton, pierre, faience ; `peinture` reste sans texture), `misc-<tex>` (bois, tissu, laine, lames, granite). 50 textures au total, environ 33 Mo en 1k et 8 Mo en 512.
`materials.json` contient aussi `floors`, `walls`, `misc` : la table id du moteur -> clé de texture (`null` = pas de texture, comportement actuel).

## Conventions (à respecter dans la carte)
* **color.jpg** : albedo sRGB **recentré** (moyenne ramenée à un gris neutre, 0.80) pour que le sélecteur de couleurs continue de fonctionner (`material.color` x map). `colorDefault` = la couleur à appliquer par défaut pour retrouver l'aspect réel Poly Haven ; `avg` = couleur moyenne d'origine. Si l'utilisateur n'a pas choisi de couleur, utiliser `colorDefault`.
* **normal.jpg** : normales **OpenGL (+Y)**, Non-Color. Désactiver la `bumpMap` quand la normalMap est présente (sinon relief doublé).
* **arm.jpg** : R = occlusion ambiante (aoMap), V = rugosité (roughnessMap, à multiplier par `roughness`), B = métal (0, ignorer). Non-Color. Une seule image, donc 3 unités de texture par matière (color, normal, arm) : compter 3 et non 4 ou 5 dans `budgetShadows()`.
* **size** `[w, h]` en mètres = surface couverte par UNE répétition ; `u = x_monde / size[0]`, `v = z_monde / size[1]`, RepeatWrapping, anisotropie 8. Les UV restent ancrés sur l'origine de la maison.
* **pose: true** (sols à dalles reconstitués : travertin, gres, beton_60/80, marbre*, tile1/2/4) : le calepinage (dalles + joints + quinconce) est déjà dans l'image. Il faut **désactiver** le quinconce/« pose » du moteur pour ces matières ; la rotation `sens` et l'échelle utilisateur restent applicables. `tile` donne la dalle en mètres, `layout` le motif (grid, half, opus).
* **pose: false** : texture photo continue (parquets, pierre, carrelages décoratifs, etc.) ; le moteur peut appliquer sa rotation/échelle, mais le quinconce n'a pas de sens.
* **res** : charger `dir` (1k) sur ordinateur, `dir512` sur petit écran (< 700 px). Chargement paresseux, une matière à la fois ; repli sur la texture procédurale actuelle si un fichier manque.
* **hdri** : `hdri.file` (RGBE, via RGBELoader) remplace `RoomEnvironment` pour `scene.environment` uniquement (pas de fond, la vue publiée est transparente). `intensity` = valeur de départ pour `environmentIntensity` (0.55 aujourd'hui). PMREM calculé une seule fois.

## Points à ajuster côté carte
1. Les albédos Poly Haven sont physiquement plausibles donc plus sombres que les couleurs vives du moteur. Si l'ensemble paraît terne, ajuster `roughness`, `normalScale` ou l'exposition plutôt que le pack.
2. Chaque matière a un `colorDefault` calculé ; les pastilles de couleur du moteur multiplient toujours l'albedo recentré.
3. Les textures sont mises à l'échelle réelle ; `size` de `misc-tissu` et `misc-laine` est petit (≈ 0.27 m), c'est normal (tissage fin).
4. Brancher les `misc-*` sur les clés de texture déjà utilisées par les meubles (`bois` -> misc-bois, etc.).

## Limites connues de cette version
* Aucun contrôle visuel n'a été possible côté Blender pendant la fabrication (pas de rendu d'écran) : les choix de textures reposent sur les étiquettes Poly Haven et des mesures (couleur moyenne, détection de joints). Quelques matières peuvent demander un remplacement ; la clé et la source (`source`) de chacune sont dans `materials.json` et `CREDITS.md`.
* Les sols à dalles reconstitués utilisent une pierre de base répétée en miroir et recadrée hors joints.
