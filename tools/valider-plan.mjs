// Vérifie un fichier plan.json avant de l'ouvrir dans le Configurateur :  node tools/valider-plan.mjs plan.json [--fix]
// Contrôles : identifiants uniques, références (ouvertures → murs, points lumineux → groupes), position le long du mur, modèles connus, nid.
// --fix : corrige nid et recadre les ouvertures qui dépassent du mur (écrit plan.fixed.json).
import { readFileSync, writeFileSync } from 'node:fs';
const [,, file, flag] = process.argv;
if (!file) { console.error('usage : node tools/valider-plan.mjs plan.json [--fix]'); process.exit(2); }
const plan = JSON.parse(readFileSync(file, 'utf8'));
const doc = readFileSync(new URL('../docs/IMPORT-IA.md', import.meta.url), 'utf8');
const known = new Set([...doc.matchAll(/^\* `([a-z0-9_]+)` — /gm)].map((m) => m[1]));
const errs = [], warns = [], ids = new Map();
const A = (k) => plan[k] || [];
for (const k of ['walls', 'openings', 'floors', 'items', 'markers', 'lights']) for (const e of A(k)) {
  if (!Number.isFinite(e.id)) errs.push(`${k} : élément sans id numérique`);
  else if (ids.has(e.id)) errs.push(`id ${e.id} en double (${ids.get(e.id)} et ${k})`); else ids.set(e.id, k);
}
const walls = new Map(A('walls').map((w) => [w.id, w]));
for (const w of A('walls')) { if (![w.x1, w.z1, w.x2, w.z2, w.t, w.h].every(Number.isFinite)) errs.push(`mur ${w.id} : coordonnées/épaisseur/hauteur invalides`); else if (Math.hypot(w.x2 - w.x1, w.z2 - w.z1) < 0.2) errs.push(`mur ${w.id} : trop court`); }
for (const o of A('openings')) {
  const w = walls.get(o.wall);
  if (!w) { errs.push(`ouverture ${o.id} : mur ${o.wall} inexistant`); continue; }
  if (!known.has(o.model)) errs.push(`ouverture ${o.id} : modèle « ${o.model} » inconnu`);
  const L = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
  if (o.s - o.w / 2 < 0 || o.s + o.w / 2 > L) { warns.push(`ouverture ${o.id} dépasse du mur ${w.id} (s=${o.s}, w=${o.w}, longueur ${L.toFixed(2)})`); if (flag === '--fix') o.s = Math.min(L - o.w / 2, Math.max(o.w / 2, o.s)); }
  if (o.y0 + o.h > w.h + 0.01) warns.push(`ouverture ${o.id} plus haute que le mur ${w.id}`);
}
const groups = new Set(A('lights').map((l) => l.id));
for (const i of A('items')) {
  if (!known.has(i.model)) errs.push(`meuble ${i.id} : modèle « ${i.model} » inconnu`);
  if (i.grp != null && !groups.has(i.grp)) errs.push(`point lumineux ${i.id} : groupe ${i.grp} inexistant`);
  if (![i.x, i.z, i.w, i.d, i.h].every(Number.isFinite)) errs.push(`meuble ${i.id} : x, z, w, d ou h invalide`);
}
for (const f of A('floors')) if (![f.x, f.z, f.w, f.d].every(Number.isFinite) || f.w <= 0 || f.d <= 0) errs.push(`sol ${f.id} : rectangle invalide`);
const maxId = Math.max(0, ...ids.keys());
if (!(plan.nid > maxId)) { warns.push(`nid (${plan.nid}) doit être > ${maxId}`); if (flag === '--fix') plan.nid = maxId + 1; }
console.log(`${A('walls').length} murs, ${A('openings').length} ouvertures, ${A('floors').length} sols, ${A('items').length} meubles, ${A('markers').length} pastilles, ${A('lights').length} groupes de lumières`);
warns.forEach((w) => console.log('  ⚠', w)); errs.forEach((e) => console.log('  ✘', e));
if (flag === '--fix') { const out = file.replace(/\.json$/, '') + '.fixed.json'; writeFileSync(out, JSON.stringify(plan, null, 1)); console.log('écrit :', out); }
console.log(errs.length ? `✘ ${errs.length} erreur(s)` : '✔ plan valide');
process.exit(errs.length ? 1 : 0);
