# Configurateur 3D — consignes pour Claude

* Seule copie du code : `js/` (+ `index.html`, `card.js`). `npm i && npm run build` produit `dist/configurateur-3d-card.js`, le fichier installé par HACS :
  le reconstruire et le committer à chaque modification.
* Dépôt **public** : ne jamais y ajouter de données personnelles (entités Home Assistant, plan d'une vraie maison).
* Fichiers volumineux (`catalog.js`, `ui.js`, `core.js`) : Grep puis Read avec offset/limit.
* Format des plans et liste des modèles : `docs/IMPORT-IA.md` (à mettre à jour si on ajoute des modèles, sols, portes ou fenêtres).
