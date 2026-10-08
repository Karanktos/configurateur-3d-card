// Modèles 3D (GLB) de 27 meubles : remplacent la construction procédurale (js/catalog.js) quand le fichier est arrivé ; tant qu'il manque, ou s'il est introuvable,
// le meuble reste celui généré par le code. Les fichiers (≈ 3 Mo en tout, chargés un par un à la première utilisation) sont installés en local par HACS à côté de la carte
// (pièces jointes de la release, à plat) ou pris dans un dossier choisi par l'option YAML `assets_url` (voir card.js) ; `assets_url: false` désactive les modèles. Aucun accès internet.
// Repère GLB = repère du meuble : origine au sol au centre de l'emprise, face avant vers +Z, dimensions du GLB = dimensions par défaut (« dims » du manifeste).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import MANIFEST from './models-manifest.js';
import { getTexM, withBump } from './textures.js';

const M = { bases: [], dead: new Set(), good: false, hook: () => {} };
const gl = new Map();   // id -> { st: 'load' | 'ready' | 'fail', scene }
// active les modèles : bases = liste de { base: adresse du dossier terminée par « / », flat: fichiers à plat (models/x.glb → models__x.glb) } essayées dans l'ordre ;
// onModel(id) est appelé quand un modèle arrive (reconstruire les meubles concernés)
export function initModels(bases, onModel) { M.bases = Array.isArray(bases) ? bases : []; M.hook = onModel || M.hook; }
export const modelEntry = (id) => (M.bases.length && MANIFEST[id]) || null;
function modelScene(id) {
  const e = modelEntry(id); if (!e) return null;
  let r = gl.get(id);
  if (!r) {
    r = { st: 'load', scene: null }; gl.set(id, r);
    const tryBase = (i) => {
      while (i < M.bases.length && M.dead.has(i)) i++;   // dossier déjà reconnu absent : inutile de le réinterroger
      if (i >= M.bases.length) { r.st = 'fail'; return; }
      const b = M.bases[i];
      new GLTFLoader().load(b.base + (b.flat ? e.file.replace(/\//g, '__') : e.file), (g) => {
        g.scene.traverse((o) => { if (o.geometry) o.geometry.userData.shared = true; });   // partagée entre les instances : ne pas la libérer avec un meuble
        r.scene = g.scene; r.st = 'ready'; M.good = true; M.hook(id);
      }, undefined, () => { if (!M.good) M.dead.add(i); tryBase(i + 1); });
    };
    tryBase(0);
  }
  return r.st === 'ready' ? r.scene : null;
}

const tone = (c, f) => { const k = new THREE.Color(c); k.lerp(new THREE.Color(f > 0 ? '#ffffff' : '#000000'), Math.abs(f)); return k; };
// textures du pack → textures procédurales de l'édition légère (même échelle : UV en mètres)
const TEX = { 'misc-bois': 'bois', 'misc-tissu': 'tissu', 'misc-laine': 'laine', 'floor-marbre': 'marble', 'wall-pierre': 'stonewall' };

// Couleurs c1..c3 du catalogue (colonne « couleurs » de docs/IMPORT-IA.md) → matériaux du GLB : [nom du matériau, éclaircissement (+) / assombrissement (−)]
const A1 = { c1: [['tissu', 0], ['tissu2', 0.08]], c2: [['pieds', 0]] };
export const SLOTS = {
  canape2: A1, canape3: A1, canape_angle: A1, fauteuil: A1,
  salon_jardin: { c1: [['tissu', 0], ['tissu2', -0.12]], c2: [['bois', 0], ['pieds', 0]] },
  table: { c1: [['bois', 0]] }, tablebasse: { c1: [['bois', 0]] },
  chaise: { c1: [['assise', 0]], c2: [['bois', 0]] }, tabouret: { c1: [['bois', 0]] }, chaise_bar: { c1: [['bois', 0]] },
  ilot: { c1: [['facade', 0]], c2: [['plan', 0]] }, baignoire: { c1: [['ceramique', 0]] },
  meubletv: { c1: [['bois', 0], ['bois2', 0.08]] }, tapis: { c1: [['laine2', 0]], c2: [['laine', 0]] },
  chevet: { c1: [['bois', 0], ['bois2', 0.08]] }, lampe_poser: { c1: [['abatjour', 0]] }, plante: { c1: [['pot', 0]], c2: [['feuille', 0]] },
  voiture1: { c1: [['carrosserie', 0]], c2: [['vitre', 0]] }, barbecue: { c1: [['pierre', 0]], c2: [['pierre2', 0]] },
  chauffeeau: { c1: [['blanc', 0]] }, lavelinge: { c1: [['blanc', 0]] }, seche: { c1: [['blanc', 0]] },
};
const BED = { c1: [['bois', 0], ['tissu', 0]], c2: [['couette', 0], ['linge', 0.6], ['plaid', -0.38]] };
for (const k of ['lit90', 'lit140', 'lit160', 'lit180']) SLOTS[k] = BED;

// retourne { group, parts, glb: true } ou null (modèle absent / pas encore chargé → construction procédurale)
export function glbItem(p, procedural) {
  const e = modelEntry(p.model); if (!e) return null;
  const src = modelScene(p.model); if (!src) return null;
  const g = new THREE.Group(), w = src.clone(true), parts = [], mats = {};
  w.traverse((o) => {
    if (!o.isMesh) return;
    o.material = o.material.clone();   // les matériaux sont propres à chaque instance (découpe des murs, couleurs)
    (mats[o.material.name] ||= []).push(o.material); o.castShadow = o.receiveShadow = true;   // plusieurs maillages peuvent porter le même matériau (portes d'un meuble)
  });
  const [dw, dd, dh] = e.dims; w.scale.set((p.w || dw) / dw, (p.h || dh) / dh, (p.d || dd) / dd);
  if (p.v && (p.model === 'canape_angle' || p.model === 'salon_jardin')) w.scale.x *= -1;   // méridienne côté −x
  g.add(w);
  // textures (bois, tissu, laine, pierre…) ; sur un lit, la finition « Laqué mat » / « Brillant » remplace le bois du cadre
  const bedFin = e.fin && p.fin && p.fin !== 'bois';
  for (const [name, key] of Object.entries(e.texMap || {})) {
    if (!mats[name] || !TEX[key]) continue;
    for (const m of mats[name]) {
      if (bedFin && e.fin.bois === 'cadre' && name === 'bois') m.roughness = p.fin === 'brillant' ? 0.16 : 0.85;
      else { m.map = getTexM(TEX[key]); withBump(m, TEX[key]); m.needsUpdate = true; }
    }
  }
  // couleurs choisies par l'utilisateur : remplacent la couleur d'origine du matériau (le GLB n'en donne qu'une valeur par défaut)
  const slots = SLOTS[p.model] || {};
  for (const c of ['c1', 'c2', 'c3']) if (p[c] && slots[c]) for (const [name, t] of slots[c]) for (const m of mats[name] || []) m.color.copy(t ? tone(p[c], t) : new THREE.Color(p[c]));
  // animations : pivot = origine du nœud nommé
  for (const a of e.anims || []) {
    const o = w.getObjectByName(a.node); if (!o) continue;
    const spec = a.type === 'rot' ? { rot: [a.axis, a.angle] } : a.type === 'slide' ? { slide: a.by } : a.type === 'scale' ? { scale: [a.axis, a.from, a.to] } : null;
    if (spec) parts.push({ o, pos: o.position.clone(), rot0: o.rotation.clone(), ...spec });
  }
  for (const gl2 of e.glow || []) for (const m of mats[gl2.material] || []) { m.emissive = new THREE.Color('#000000'); parts.push({ o: w, pos: w.position.clone(), rot0: w.rotation.clone(), glow: { mat: m, color: gl2.color, int: gl2.intensity } }); }
  // lampe : la lumière et son halo sont ceux de la lampe procédurale du catalogue, déplacés sur le nœud « ampoule »
  if (e.light && procedural) {
    const o = w.getObjectByName(e.light.node), pr = procedural();
    if (o) {
      g.updateMatrixWorld(true); const lp = new THREE.Vector3(); o.getWorldPosition(lp);   // position de l'ampoule dans le repère du meuble
      const keep = []; pr.group.traverse((x) => { if (x.isLight || x.isSprite) keep.push(x); });
      for (const x of keep) { x.position.copy(lp); g.add(x); }
      pr.group.traverse((x) => { if (x.isMesh && !x.isSprite) { x.geometry.dispose(); x.material.dispose(); } });
      for (const a of pr.parts) if (a.light || a.fade) parts.push({ ...a, o: a.light ? a.light.light : a.o });
    }
  }
  return { group: g, parts, glb: true };
}
