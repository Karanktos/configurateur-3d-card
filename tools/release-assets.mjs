// Prépare release/ : le JS de la carte + tous les fichiers d'assets/ « à plat », prêts à être joints à une release GitHub.
// HACS (catégorie plugin) télécharge toutes les pièces jointes de la release dans /config/www/community/<dépôt>/ SANS sous-dossiers :
// textures/floor-parquet/512/color.jpg  →  textures__floor-parquet__512__color.jpg  (la carte fait la même conversion, voir js/assets.js).
import { readdirSync, statSync, copyFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
const out = 'release';
rmSync(out, { recursive: true, force: true }); mkdirSync(out);
if (!existsSync('dist/configurateur-3d-card.js')) throw new Error('dist/ absent : lancer npm run build');
copyFileSync('dist/configurateur-3d-card.js', join(out, 'configurateur-3d-card.js'));
let n = 1, bytes = statSync('dist/configurateur-3d-card.js').size;
const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name !== 'README.md') {
  const flat = relative('assets', p).split(sep).join('__'); copyFileSync(p, join(out, flat)); n++; bytes += statSync(p).size; } } };
walk('assets');
console.log(`release/ : ${n} fichiers, ${(bytes / 1048576).toFixed(1)} Mo`);
if (n > 900) throw new Error('GitHub limite une release à 1000 pièces jointes');
