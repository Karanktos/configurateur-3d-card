// Régénère js/models-manifest.js depuis le manifeste du pack d'assets de l'édition HD.
// Usage : node tools/sync-models.mjs [chemin de materials.json]   (par défaut : ../configurateur-3d-card-hd/assets/materials.json)
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
const src = process.argv[2] || new URL('../../configurateur-3d-card-hd/assets/materials.json', import.meta.url).pathname;
const m = JSON.parse(readFileSync(src, 'utf8')).models, KEEP = ['file', 'dims', 'slots', 'materials', 'nodes', 'anims', 'texMap', 'fin', 'glow', 'light'], out = {};
for (const [k, v] of Object.entries(m)) { out[k] = {}; for (const a of KEEP) if (a in v) out[k][a] = v[a]; }
writeFileSync(new URL('../js/models-manifest.js', import.meta.url), "// Manifeste des 27 modèles 3D (copie de assets/materials.json > models du dépôt configurateur-3d-card-hd). Généré par tools/sync-models.mjs.\nexport default " + JSON.stringify(out) + ';\n');
console.log(Object.keys(out).length, 'modèles');
// copie aussi les fichiers .glb dans assets/models/ (ce que la release publie)
mkdirSync(new URL('../assets/models/', import.meta.url), { recursive: true });
for (const e of Object.values(out)) copyFileSync(resolve(dirname(src), e.file), new URL('../assets/' + e.file, import.meta.url));
