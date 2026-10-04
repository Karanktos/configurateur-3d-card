// Pack d'assets réalistes (textures PBR + HDRI Poly Haven, CC0) : assets/materials.json décrit les matières.
// Tout est facultatif : tant qu'un fichier manque, la matière reste celle générée par le code (js/textures.js, js/texgen.js).
//   * clé de matière « pbr:<clé du manifest> » : circule dans le moteur à la place du nom de texture procédurale (UV, matériaux, murs).
//   * chargement paresseux, une matière à la fois, à la première utilisation ;
//   * 1k sur ordinateur, 512 sur petit écran (ou si les fichiers 1k sont absents : décision unique par sondage d'un fichier).
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const SMALL = Math.min(screen.width, screen.height) < 700;
export const A = { base: '', q: '', flat: false, man: null, ready: false, res: SMALL ? '512' : '1k', failed: new Set() };
const hooks = { change: () => {}, tex: () => {} };   // change : la liste des matières utilisables a changé (reconstruire) ; tex : une image vient d'arriver (redessiner)
const reg = new Map();   // clé -> { st: 'idle'|'load'|'ready'|'fail', t: { color, normal, arm }, users: [[matériau, mode]], mclone }

// Unités de texture occupées par une matière PBR dans le shader : color, normal, ao, rugosité. Le fichier arm.jpg sert à la fois d'aoMap et de
// roughnessMap, mais ce sont deux échantillonneurs distincts (mesuré sur le programme compilé : voir tests) donc 4 et non 3.
export const PBR_UNITS = 4;
const AO_K = 0.7;   // l'occlusion cuite dans arm.jpg est marquée (moyenne 0,65 à 0,99) : atténuée pour ne pas ternir les sols

export const pbrActive = () => !!(A.ready && A.man);
const entryOf = (k) => (A.ready && A.man && !A.failed.has(k) && A.man.textures && A.man.textures[k]) || null;
const keyFrom = (tbl, id) => { const k = A.man && A.man[tbl] && A.man[tbl][id]; return k && entryOf(k) ? 'pbr:' + k : null; };
export const floorPbr = (id) => keyFrom('floors', id);
export const wallPbr = (id) => keyFrom('walls', id);
export const miscPbr = (kind) => keyFrom('misc', kind);
export const isPbr = (key) => typeof key === 'string' && key.startsWith('pbr:');
export const pbrEntry = (key) => entryOf(key.slice(4));
export const pbrSize = (key) => { const e = pbrEntry(key); return e ? e.size : [1, 1]; };
export const pbrDefaultColor = (tbl, id) => { const k = A.man && A.man[tbl] && A.man[tbl][id]; const e = k && entryOf(k); return e ? e.colorDefault : null; };
export const pbrFixedPose = (id) => { const k = A.man && A.man.floors && A.man.floors[id]; const e = k && entryOf(k); return !!(e && e.pose); };

// mode « à plat » (édition HD installée par HACS) : HACS dépose les pièces jointes d'une release dans un seul dossier, sans sous-dossiers
// → textures/floor-parquet/512/color.jpg devient textures__floor-parquet__512__color.jpg
const url = (rel) => A.base + (A.flat ? rel.replace(/\//g, '__') : rel) + A.q;
const probe = (u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(true); i.onerror = () => ok(false); i.src = u; });

// bases : adresse (ou liste d'adresses, ou { base, flat }) du dossier d'assets, essayées dans l'ordre ; la première qui fournit un materials.json valide est retenue
export async function initAssets(bases, h, skip) {
  Object.assign(hooks, h || {});
  for (const k of [].concat(skip || [])) A.failed.add(String(k));   // matières écartées par la configuration (assets_skip)
  for (const b of [].concat(bases || []).filter(Boolean)) {
    try {
      const base = typeof b === 'string' ? b : b.base, u = new URL(base, location.href), q = u.search; u.search = '';
      A.base = u.href.endsWith('/') ? u.href : u.href + '/'; A.q = q; A.flat = !!(b && b.flat);
      const r = await fetch(url('materials.json'), { cache: 'no-cache' });
      if (!r.ok) continue;
      const m = await r.json();
      if (!m || typeof m !== 'object' || !m.textures) continue;
      A.man = m;
      if (A.res === '1k') {   // un seul sondage : si le premier fichier 1k manque, tout le pack passe en 512
        const e = Object.values(m.textures)[0];
        if (!e || !(await probe(url(e.dir + '/' + e.maps.color)))) A.res = '512';
      }
      A.ready = true; hooks.change();
      return true;
    } catch (e) { /* adresse suivante */ }
  }
  return false;
}

function configure(t, color) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = SMALL ? 4 : 8;
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true; return t;
}
const loadImg = (u, color) => new Promise((ok, ko) => new THREE.TextureLoader().load(u, (t) => ok(configure(t, color)), undefined, () => ko(new Error(u))));

function entry(key) { let r = reg.get(key); if (!r) reg.set(key, (r = { st: 'idle', t: {}, users: [] })); return r; }

async function loadSet(e) {
  const out = {};
  for (const res of A.res === '1k' ? ['1k', '512'] : ['512']) {   // repli par matière si un fichier 1k manque
    const dir = res === '1k' ? e.dir : e.dir512 || e.dir;
    try {
      out.color = await loadImg(url(dir + '/' + e.maps.color), true);
      await Promise.all([['normal', false], ['arm', false]].map(([k, c]) => (e.maps[k] ? loadImg(url(dir + '/' + e.maps[k]), c).then((t) => { out[k] = t; }, () => {}) : null)));
      return out;
    } catch (err) { /* essai suivant */ }
  }
  return null;
}

// charge (une fois) les images d'une matière ; échec = la matière est retirée du pack, le moteur reconstruit avec la texture procédurale
export function ensure(key) {
  const k = key.startsWith('pbr:') ? key.slice(4) : key, r = entry(k), e = A.man && A.man.textures[k];
  if (r.st !== 'idle' || !e) return r;
  r.st = 'load';
  loadSet(e).then((t) => {
    if (!t) { r.st = 'fail'; A.failed.add(k); hooks.change(); return; }
    r.t = t; r.st = 'ready';
    for (const [m, mode] of r.users.splice(0)) applyMaps(m, k, mode);
    hooks.tex();
  });
  return r;
}

// branche les images sur un matériau. mode 'uv' : les UV sont déjà exprimés en périodes (sols, murs) ; 'm' : UV en mètres (meubles) → répétition 1/size
function applyMaps(m, k, mode) {
  const r = entry(k), e = A.man.textures[k]; let t = r.t;
  if (mode === 'm') {
    if (!r.mclone) {
      r.mclone = {};
      for (const [n, x] of Object.entries(r.t)) { const c = x.clone(); c.repeat.set(1 / e.size[0], 1 / e.size[1]); c.needsUpdate = true; r.mclone[n] = c; }
    }
    t = r.mclone;
  }
  m.map = t.color || null; m.bumpMap = null;   // la normale remplace le relief tiré de la couleur
  m.normalMap = t.normal || null; if (t.normal) m.normalScale = new THREE.Vector2(e.normalScale ?? 1, e.normalScale ?? 1);
  m.aoMap = t.arm || null; m.roughnessMap = t.arm || null; m.aoMapIntensity = AO_K;
  m.roughness = e.roughness ?? 1; m.needsUpdate = true;
}

// matériau de sol / mur : couleur unie le temps que les images arrivent (jamais une texture à la mauvaise échelle)
export function pbrMaterial(key, color) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 1 }), k = key.slice(4), r = ensure(k);
  if (r.st === 'ready') applyMaps(m, k, 'uv'); else r.users.push([m, 'uv']);
  return m;
}
// meuble : le matériau garde sa texture procédurale jusqu'à l'arrivée des images
export function attachMisc(m, kind) {
  const pk = miscPbr(kind); if (!pk) return m;
  const k = pk.slice(4), r = ensure(k);
  if (r.st === 'ready') applyMaps(m, k, 'm'); else r.users.push([m, 'm']);
  return m;
}

// HDRI : remplace RoomEnvironment pour scene.environment seulement, PMREM calculé une fois
export function loadHdri(renderer, onEnv) {
  const h = A.man && A.man.hdri; if (!h || !h.file) return;
  new RGBELoader().load(url(h.file), (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer), env = pm.fromEquirectangular(tex).texture;
    tex.dispose(); pm.dispose(); onEnv(env, h.intensity);
  }, undefined, (e) => { console.warn('HDRI', e && e.message); /* absent : on garde RoomEnvironment */ });
}
