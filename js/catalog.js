// Bibliothèque de meubles et d'électroménager (modèles procéduraux paramétrables, façon configurateur IKEA).
// Repère d'un meuble : origine au sol au centre de l'emprise, +x = largeur, +z = FACE AVANT, +y = hauteur.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { boxG } from './util.js';
import { getTexM, withBump } from './textures.js';
import { addPart } from './anim.js';
import { registerKitchen, KDEF, KSTYLE_KEYS } from './kitchen.js';
import { registerMore } from './catalog3.js';
import { registerIkea } from './catalog4.js';

export const CATS = ['Chambre', 'Salon', 'Salle à manger', 'Cuisine', 'Électroménager', 'Salle de bain', 'Bureau', 'Éclairage', 'Déco', 'Extérieur'];
export const FINS = [['mat', 'Laqué mat'], ['bois', 'Bois / décor'], ['brillant', 'Brillant']];

const tone = (c, f) => { const k = new THREE.Color(c); k.lerp(new THREE.Color(f > 0 ? '#ffffff' : '#000000'), Math.abs(f)); return '#' + k.getHexString(); };

// ---- boîte à outils passée à chaque modèle -----------------------------------------------------
function kit(g, p) {
  const parts = [], cache = new Map();
  const K = { parts, g };
  K.m = (c, o = {}) => {
    if (!o.map && o.op == null && !o.m && (o.r ?? 0.7) >= 0.93) o = { ...o, map: 'tissu' };   // surfaces très mates = textiles : léger tissage
    const key = c + '|' + (o.r ?? '') + (o.m ?? '') + (o.map ?? '') + (o.op ?? '') + (o.em ?? '');
    if (cache.has(key)) return cache.get(key);
    const P = {
      color: c, roughness: o.r ?? 0.7, metalness: o.m ?? 0, map: o.map ? getTexM(o.map) : null,
      transparent: o.op != null, opacity: o.op ?? 1, depthWrite: o.op == null, side: o.op != null ? THREE.DoubleSide : THREE.FrontSide,
    };
    // textiles : lustre velouté rasant (sheen) comme un vrai tissu
    const mt = withBump(o.map === 'tissu' ? new THREE.MeshPhysicalMaterial({ ...P, sheen: 0.8, sheenRoughness: 0.55, sheenColor: new THREE.Color(c).lerp(new THREE.Color('#ffffff'), 0.35) }) : new THREE.MeshStandardMaterial(P), o.map);
    cache.set(key, mt); return mt;
  };
  K.body = (c) => (p.fin === 'bois' ? K.m(c, { r: 0.62, map: 'bois' }) : p.fin === 'brillant' ? K.m(c, { r: 0.16 }) : K.m(c, { r: 0.85 }));
  K.inox = () => K.m('#c3c8cd', { r: 0.28, m: 0.85 });
  K.black = () => K.m('#1b1c1f', { r: 0.45 });
  K.glass = () => K.m('#9fc4d6', { r: 0.05, op: 0.35 });
  K.white = () => K.m('#f4f4f2', { r: 0.35 });
  const place = (o, mt, x, y, z, par) => { o.material = mt; o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; (par || g).add(o); return o; };
  K.box = (w, h, d, mt, x, y, z, par) => place(new THREE.Mesh(boxG(w, h, d)), mt, x, y, z, par);
  K.rbox = (w, h, d, r, mt, x, y, z, par) => place(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.max(0.002, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)))), mt, x, y, z, par);
  K.cyl = (rt, rb, h, mt, x, y, z, par, seg = 28) => place(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg)), mt, x, y, z, par);
  K.sph = (r, mt, x, y, z, par, sx = 1, sy = 1, sz = 1) => { const o = place(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2)), mt, x, y, z, par); o.scale.set(sx, sy, sz); return o; };
  K.piv = (x, y, z, par) => { const q = new THREE.Group(); q.position.set(x, y, z); (par || g).add(q); return q; };
  K.add = (o, spec) => addPart(parts, o, spec);
  // caisson ouvert devant : y = bas, centre en (x,z)
  K.carcass = (w, h, d, mt, x, y, z, par, th = 0.018, back = true) => {
    K.box(th, h, d, mt, x - w / 2 + th / 2, y + h / 2, z, par); K.box(th, h, d, mt, x + w / 2 - th / 2, y + h / 2, z, par);
    K.box(w - 2 * th, th, d, mt, x, y + h - th / 2, z, par); K.box(w - 2 * th, th, d, mt, x, y + th / 2, z, par);
    if (back) K.box(w - 2 * th, h - 2 * th, 0.008, mt, x, y + h / 2, z - d / 2 + 0.004, par);
  };
  // porte de meuble : x = centre, y = bas, zf = plan avant ; hinge 1 = charnière à gauche, -1 = à droite
  K.cdoor = (w, h, mt, x, y, zf, hinge = 1, par, o = {}) => {
    const th = 0.019, pv = K.piv(x - hinge * w / 2, y, zf + th / 2, par);
    K.box(w - 0.004, h, th, mt, hinge * w / 2, h / 2, 0, pv);
    const hm = o.hm || K.inox(), hx = hinge * (w - 0.05);
    if (o.knob) K.cyl(0.012, 0.012, 0.025, hm, hx, o.hy ?? h * 0.55, th / 2 + 0.012, pv).rotation.x = Math.PI / 2;
    else if (!o.nohandle) K.box(0.012, o.hlen ?? Math.min(0.2, h * 0.3), 0.016, hm, hx, o.hy ?? (h > 1 ? h * 0.5 : h - 0.12), th / 2 + 0.014, pv);
    K.add(pv, { rot: ['y', -hinge * 1.7] });
    return pv;
  };
  // tiroir : zf = plan avant ; travel = course de sortie
  K.drawer = (w, h, d, mt, x, y, zf, par, o = {}) => {
    const pv = K.piv(x, y, zf, par), th = 0.019, tm = o.tray || K.m('#e9e6df', { r: 0.8 });
    K.box(w - 0.004, h - 0.004, th, mt, 0, h / 2, -th / 2, pv);
    const bw = w - 0.08, bd = d - 0.06, bh = h * 0.62;
    K.box(bw, 0.01, bd, tm, 0, 0.035, -th - bd / 2, pv);
    K.box(0.01, bh, bd, tm, -bw / 2, 0.035 + bh / 2, -th - bd / 2, pv); K.box(0.01, bh, bd, tm, bw / 2, 0.035 + bh / 2, -th - bd / 2, pv);
    K.box(bw, bh, 0.01, tm, 0, 0.035 + bh / 2, -th - bd, pv);
    if (o.knob) K.cyl(0.013, 0.013, 0.025, o.hm || K.inox(), 0, h / 2, 0.012, pv).rotation.x = Math.PI / 2;
    else if (!o.nohandle) K.box(Math.min(0.16, w * 0.4), 0.012, 0.016, o.hm || K.inox(), 0, h - 0.035, 0.008, pv);
    K.add(pv, { slide: [0, 0, o.travel ?? d * 0.6] });
    return pv;
  };
  K.legs = (w, d, hgt, r, mt, inset = 0.06, par) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.cyl(r, r * 0.8, hgt, mt, sx * (w / 2 - inset), hgt / 2, sz * (d / 2 - inset), par, 12);
  };
  return K;
}

export function buildItem(p) {
  const def = DEFS[p.model], g = new THREE.Group(), K = kit(g, p);
  def.build(g, p, K);
  return { group: g, parts: K.parts };
}
export const defOf = (id) => DEFS[id];
export function defaultItem(model) {
  const d = DEFS[model], o = { model, x: 0, z: 0, rot: 0, elev: d.elev || 0, w: d.w, d: d.d, h: d.h, fin: d.fin || 'mat', v: 0, open: 0 };
  (d.colors || []).forEach((c, i) => { o['c' + (i + 1)] = c[1]; });
  (d.fields || []).forEach((f) => { o[f.k] = f.def; });
  (d.selects || []).forEach((s) => { o[s.k] = s.def; });
  if (d.kmod) for (const k of KSTYLE_KEYS) o[k] = KDEF[k];   // meuble de cuisine : style par défaut (remplacé par le style mémorisé de la cuisine)
  o.ent = '';
  return o;
}

// ================================ modèles =================================================================
const DEFS = {};
const reg = (id, cat, name, w, d, h, price, colors, build, extra = {}) => { DEFS[id] = { id, cat, name, w, d, h, price, colors, build, ...extra }; };
const WOOD = '#d9c3a5', WHITE = '#f1efea', GREY = '#8f9aa0', ANTH = '#4b5359';

// ---------- CHAMBRE ----------
function bed(g, p, K) {
  const { w, d, h } = p, { box, rbox, piv, m, body } = K, fm = body(p.c1), mt = m('#f3f1ec', { r: 0.9 }), li = m(p.c2, { r: 0.95 }), pil = m(tone(p.c2, 0.35), { r: 0.95 });
  box(w, 0.2, d, fm, 0, 0.2, 0);
  K.legs(w, d, 0.1, 0.03, fm, 0.05);
  box(w, h - 0.1, 0.07, fm, 0, 0.1 + (h - 0.1) / 2, -d / 2 + 0.035);
  box(w, 0.32, 0.05, fm, 0, 0.26, d / 2 - 0.025);
  rbox(w - 0.08, 0.22, d - 0.14, 0.05, mt, 0, 0.41, 0.02);
  const np = w > 1.2 ? 2 : 1;
  for (let i = 0; i < np; i++) rbox(np === 2 ? 0.6 : 0.55, 0.14, 0.4, 0.06, pil, np === 2 ? (i ? 1 : -1) * (w / 4) : 0, 0.59, -d / 2 + 0.4);
  const L = d - 0.7, dv = piv(0, 0.52, d / 2 - 0.05);
  rbox(w - 0.03, 0.09, L, 0.04, li, 0, 0.045, -L / 2, dv);
  K.add(dv, { scale: ['z', 1, 0.3] }); K.add(dv, { scale: ['y', 1, 2.3] });
}
const bedColors = [['Cadre', WOOD], ['Linge de lit', '#9db4c0']];
reg('lit90', 'Chambre', 'Lit simple 90', 0.98, 2.0, 0.85, 129, bedColors, bed, { anim: 'Défaire / refaire le lit', fin: 'bois' });
reg('lit140', 'Chambre', 'Lit double 140', 1.48, 2.05, 0.95, 249, bedColors, bed, { anim: 'Défaire / refaire le lit', fin: 'bois' });
reg('lit160', 'Chambre', 'Lit double 160', 1.68, 2.1, 1.05, 299, bedColors, bed, { anim: 'Défaire / refaire le lit', fin: 'bois' });

reg('chevet', 'Chambre', 'Table de chevet', 0.45, 0.4, 0.5, 39, [['Corps', WHITE], ['Pieds', '#8a5a3c']], (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1);
  K.legs(w, d, 0.12, 0.02, K.m(p.c2), 0.04);
  K.carcass(w, h - 0.12, d, bm, 0, 0.12, 0, g);
  K.drawer(w - 0.04, (h - 0.12) * 0.5, d - 0.02, bm, 0, 0.12 + (h - 0.12) * 0.5 - 0.01, d / 2, g, { knob: true, travel: 0.22 });
  K.box(w - 0.04, 0.01, d - 0.04, bm, 0, 0.12 + (h - 0.12) * 0.5 - 0.02, 0);
}, { anim: 'Ouvrir le tiroir' });

reg('commode', 'Chambre', 'Commode 3 tiroirs', 0.8, 0.45, 0.85, 129, [['Corps', WHITE], ['Pieds', '#8a5a3c']], (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1), n = 3, bh = h - 0.12, dh = bh / n;
  K.legs(w, d, 0.12, 0.022, K.m(p.c2), 0.05); K.carcass(w, bh, d, bm, 0, 0.12, 0, g, 0.02);
  for (let i = 0; i < n; i++) K.drawer(w - 0.04, dh - 0.01, d - 0.03, bm, 0, 0.12 + i * dh + 0.015, d / 2 + 0.002, g, { travel: 0.28 * (i === 2 ? 0.8 : 1) });
}, { anim: 'Ouvrir les tiroirs' });

function wardrobe(g, p, K) {
  const { w, d, h } = p, bm = K.body(p.c1), n = Math.max(2, Math.round(w / 0.5)), dw = w / n;
  K.carcass(w, h, d, bm, 0, 0, 0, g, 0.02);
  K.cyl(0.012, 0.012, w - 0.06, K.inox(), 0, h - 0.25, 0, g).rotation.z = Math.PI / 2;
  K.box(w - 0.04, 0.02, d - 0.04, bm, 0, h - 0.45, 0.0);
  K.box(w - 0.04, 0.02, d - 0.04, bm, 0, 0.45, 0.0);
  for (let i = 0; i < n; i++) K.cdoor(dw, h - 0.03, bm, -w / 2 + (i + 0.5) * dw, 0.015, d / 2, i < n / 2 ? 1 : -1, g, { hy: h * 0.5, hlen: 0.3 });
}
reg('armoire2', 'Chambre', 'Armoire 2 portes', 1.0, 0.58, 2.0, 189, [['Façades', WHITE]], wardrobe, { anim: 'Ouvrir les portes' });
reg('armoire3', 'Chambre', 'Armoire 3 portes', 1.5, 0.58, 2.0, 269, [['Façades', WHITE]], wardrobe, { anim: 'Ouvrir les portes' });

// ---------- SALON ----------
function sofaParts(g, p, K, o) {
  const { d, h } = p, w = o.w ?? p.w, cx = o.cx ?? 0, fab = K.m(p.c1, { r: 0.95 }), fab2 = K.m(tone(p.c1, 0.08), { r: 0.95 }), lg = K.m(p.c2, { r: 0.5 });
  const dm = o.dm ?? d, zc = o.zc ?? 0, sh = 0.28;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.cyl(0.025, 0.02, 0.1, lg, cx + sx * (w / 2 - 0.08), 0.05, zc + sz * (dm / 2 - 0.08), null, 12);
  K.rbox(w, 0.18, dm, 0.03, fab, cx, 0.19, zc);
  for (const sx of o.arms ?? [-1, 1]) K.rbox(0.2, 0.5, dm, 0.07, fab, cx + sx * (w / 2 - 0.1), 0.1 + 0.25 + 0.06, zc);
  const iw = w - 0.4 * ((o.arms ?? [-1, 1]).length === 2 ? 1 : 0.5), n = Math.max(1, Math.round(iw / 0.62)), sw = iw / n;
  const xs = cx + (o.arms && o.arms.length === 1 ? -o.arms[0] * 0.1 : 0);
  K.rbox(w, h - sh, 0.22, 0.07, fab, cx, sh + (h - sh) / 2, zc - dm / 2 + 0.11);
  const backs = [];
  for (let i = 0; i < n; i++) {
    const x = xs - iw / 2 + (i + 0.5) * sw;
    K.rbox(sw - 0.01, 0.16, dm - 0.24, 0.05, fab, x, sh + 0.08, zc + 0.12);
    const b = K.rbox(sw - 0.02, 0.4, 0.17, 0.07, fab2, x, sh + 0.16 + 0.2, zc - dm / 2 + 0.3); b.rotation.x = -0.12; backs.push(b);
  }
  return { backs };
}
const sofaCols = [['Tissu', '#9aa5a8'], ['Pieds', '#5a4636']];
const sofa = (g, p, K) => { sofaParts(g, p, K, {}); };
reg('canape2', 'Salon', 'Canapé 2 places', 1.6, 0.9, 0.82, 399, sofaCols, sofa);
reg('canape3', 'Salon', 'Canapé 3 places', 2.1, 0.92, 0.82, 549, sofaCols, sofa);
reg('canape_angle', 'Salon', "Canapé d'angle", 2.6, 1.7, 0.82, 899, [...sofaCols, ['Variante', '#000000']], (g, p, K) => {
  const s = p.v ? -1 : 1, dm = 0.95;
  sofaParts(g, p, K, { arms: [-s], dm, zc: -p.d / 2 + dm / 2 });
  const cw = 0.95, fab = K.m(p.c1, { r: 0.95 }), cl = p.d - dm;
  K.rbox(cw, 0.18, cl, 0.03, fab, s * (p.w / 2 - cw / 2), 0.19, p.d / 2 - cl / 2);
  K.rbox(cw - 0.02, 0.16, cl - 0.02, 0.05, fab, s * (p.w / 2 - cw / 2), 0.44, p.d / 2 - cl / 2);
  K.rbox(0.2, 0.5, cl, 0.07, fab, s * (p.w / 2 - 0.1), 0.41, p.d / 2 - cl / 2);
}, { variants: ['Chaise longue à droite', 'Chaise longue à gauche'] });
reg('canape_conv', 'Salon', 'Canapé convertible', 2.0, 0.92, 0.85, 479, sofaCols, (g, p, K) => {
  const { backs } = sofaParts(g, p, K, {}), pv = K.piv(0, 0.28, -p.d / 2 + 0.22);
  backs.forEach((b) => { pv.attach(b); });
  K.add(pv, { rot: ['x', -1.25] });
}, { anim: 'Déplier en lit', fin: null });
reg('fauteuil', 'Salon', 'Fauteuil', 0.85, 0.88, 0.84, 199, sofaCols, sofa);

reg('tablebasse', 'Salon', 'Table basse', 1.0, 0.55, 0.42, 79, [['Plateau', WOOD], ['Pieds', ANTH]], (g, p, K) => {
  const { w, d, h } = p; K.box(w, 0.04, d, K.body(p.c1), 0, h - 0.02, 0); K.legs(w, d, h - 0.04, 0.02, K.m(p.c2, { m: 0.4, r: 0.4 }), 0.05);
  K.box(w - 0.14, 0.02, d - 0.14, K.body(p.c1), 0, 0.12, 0);
}, { fin: 'bois' });
reg('tablebasse_r', 'Salon', 'Table basse ronde', 0.8, 0.8, 0.4, 69, [['Plateau', '#f1efea'], ['Pied', '#c9a24b']], (g, p, K) => {
  const { w, d, h } = p; const t = K.cyl(0.5, 0.5, 0.035, K.body(p.c1), 0, h - 0.017, 0); t.scale.set(w, 1, d);
  for (const a of [0, 2.1, 4.2]) K.cyl(0.013, 0.013, h - 0.03, K.m(p.c2, { m: 0.8, r: 0.3 }), Math.cos(a) * w * 0.3, (h - 0.03) / 2, Math.sin(a) * d * 0.3, null, 12);
});

function sideboard(g, p, K) {
  const { w, d, h } = p, bm = K.body(p.c1), n = Math.max(2, Math.round(w / 0.55)), lh = 0.15, bh = h - lh, dw = (w - 0.04) / n;
  K.legs(w, d, lh, 0.02, K.m(p.c2), 0.06); K.carcass(w, bh, d, bm, 0, lh, 0, g, 0.02);
  for (let i = 1; i < n; i++) K.box(0.018, bh - 0.04, d - 0.04, bm, -w / 2 + 0.02 + i * dw, lh + bh / 2, 0);
  K.box(w - 0.04, 0.018, d - 0.04, bm, 0, lh + bh / 2, 0);
  for (let i = 0; i < n; i++) K.cdoor(dw, bh - 0.025, bm, -w / 2 + 0.02 + (i + 0.5) * dw, lh + 0.012, d / 2, i % 2 ? -1 : 1, g, { knob: true, hy: bh * 0.65 });
}
const sbCols = [['Façades', WHITE], ['Pieds', '#8a5a3c']];
reg('meubletv', 'Salon', 'Meuble TV', 1.6, 0.4, 0.5, 149, sbCols, sideboard, { anim: 'Ouvrir les portes' });
reg('buffet', 'Salle à manger', 'Buffet', 1.6, 0.45, 0.85, 249, sbCols, sideboard, { anim: 'Ouvrir les portes' });

function tvBuild(stand) {
  return (g, p, K) => {
    const { w, d, h } = p, sh = stand ? 0.1 : 0, scr = K.m('#0b0c0f', { r: 0.15, m: 0.1 }), fr = K.black();
    K.box(w, h - sh, 0.035, fr, 0, sh + (h - sh) / 2, 0);
    const face = K.box(w - 0.03, h - sh - 0.03, 0.004, scr, 0, sh + (h - sh) / 2, 0.019);
    K.add(face, { glow: { mat: scr, color: '#3b78c8', int: 1.1 } });
    if (stand) { K.box(w * 0.4, 0.015, d * 0.9, fr, 0, 0.0075, 0); K.box(0.06, sh, 0.03, fr, 0, sh / 2, -0.01); }
    else K.box(w * 0.5, h * 0.4, 0.025, fr, 0, h / 2, -0.03);
  };
}
reg('tv', 'Salon', 'TV 55" sur pied', 1.25, 0.2, 0.75, 499, [], tvBuild(true), { anim: 'Allumer / éteindre', fin: null });
reg('tv_mur', 'Salon', 'TV 55" murale', 1.25, 0.06, 0.72, 499, [], tvBuild(false), { anim: 'Allumer / éteindre', elev: 0.9, fin: null });

reg('biblio', 'Salon', 'Bibliothèque', 0.8, 0.28, 2.02, 59, [['Corps', WHITE]], (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1), n = Math.round(h / 0.38);
  K.carcass(w, h, d, bm, 0, 0, 0, g, 0.02); K.box(w - 0.04, 0.12, d - 0.02, bm, 0, 0.06, 0.0);
  for (let i = 1; i < n; i++) K.box(w - 0.04, 0.018, d - 0.02, bm, 0, (h * i) / n, 0);
  // quelques livres
  const cs = ['#b5523f', '#3f6b8a', '#d1a64a', '#4f7a55', '#e8e0d0'];
  for (let i = 0; i < n - 1; i++) { let x = -w / 2 + 0.06; for (let k = 0; k < 5 + (i % 3) && x < w / 2 - 0.12; k++) { const bw = 0.025 + ((i * 7 + k * 3) % 4) * 0.008, bh2 = 0.2 + ((i + k) % 3) * 0.03; K.box(bw, bh2, d * 0.6, K.m(cs[(i + k) % 5], { r: 0.8 }), x + bw / 2, (h * (i + 1)) / n + 0.009 + bh2 / 2, 0.0); x += bw + 0.004; } }
}, { fin: 'mat' });

// ---------- SALLE À MANGER ----------
reg('table', 'Salle à manger', 'Table à manger', 1.6, 0.9, 0.75, 229, [['Plateau', WOOD], ['Pieds', ANTH]], (g, p, K) => {
  const { w, d, h } = p; K.box(w, 0.04, d, K.body(p.c1), 0, h - 0.02, 0); K.legs(w, d, h - 0.04, 0.03, K.m(p.c2, { m: 0.4, r: 0.4 }), 0.07);
}, { fin: 'bois' });
reg('table_r', 'Salle à manger', 'Table ronde', 1.1, 1.1, 0.75, 199, [['Plateau', WHITE], ['Pied', '#8a5a3c']], (g, p, K) => {
  const { w, d, h } = p; const t = K.cyl(0.5, 0.5, 0.035, K.body(p.c1), 0, h - 0.017, 0, null, 48); t.scale.set(w, 1, d);
  K.cyl(0.04, 0.05, h - 0.04, K.m(p.c2), 0, (h - 0.04) / 2, 0); const b = K.cyl(0.22, 0.22, 0.03, K.m(p.c2), 0, 0.015, 0); b.scale.set(w, 1, d);
}, { fin: 'bois' });
reg('chaise', 'Salle à manger', 'Chaise', 0.45, 0.5, 0.88, 49, [['Assise', '#d6a69a'], ['Pieds', '#5a4636']], (g, p, K) => {
  const { w, d, h } = p, lm = K.m(p.c2, { r: 0.55 }), sh = h * 0.5;
  K.legs(w, d * 0.9, sh, 0.017, lm, 0.03); K.rbox(w, 0.04, d * 0.9, 0.012, K.m(p.c1, { r: 0.9 }), 0, sh + 0.02, 0.02);
  for (const sx of [-1, 1]) K.box(0.03, h - sh, 0.03, lm, sx * (w / 2 - 0.035), sh + (h - sh) / 2, -d * 0.45 + 0.03 + 0.02);
  K.rbox(w - 0.04, 0.2, 0.025, 0.01, K.m(p.c1, { r: 0.9 }), 0, h - 0.13, -d * 0.45 + 0.05);
});
reg('tabouret', 'Salle à manger', 'Tabouret de bar', 0.38, 0.38, 0.75, 59, [['Assise', '#2e3338'], ['Structure', '#c3c8cd']], (g, p, K) => {
  const { w, h } = p, lm = K.m(p.c2, { m: 0.8, r: 0.3 });
  K.cyl(w / 2, w / 2, 0.05, K.m(p.c1, { r: 0.8 }), 0, h - 0.025, 0, null, 32);
  for (const a of [0.8, 2.4, 3.9, 5.5]) { const l = K.cyl(0.012, 0.012, h - 0.05, lm, Math.cos(a) * w * 0.32, (h - 0.05) / 2, Math.sin(a) * w * 0.32, null, 10); }
  const r = new THREE.Mesh(new THREE.TorusGeometry(w * 0.34, 0.01, 8, 28), lm); r.rotation.x = Math.PI / 2; r.position.y = h * 0.35; g.add(r);
});

// ---------- CUISINE ----------
// plan de travail : matière au choix (liste « plan » de l'élément), teinte = couleur « Plan de travail » pour le stratifié, le granit et le quartz
const WT = [['strat', 'Stratifié'], ['bois', 'Bois massif'], ['pierre', 'Pierre naturelle'], ['granit', 'Granit'], ['marbre', 'Marbre'], ['quartz', 'Quartz / céramique'], ['beton', 'Béton ciré'], ['inox', 'Inox']];
const WTSEL = { k: 'plan', l: 'Matière du plan de travail', list: WT, def: 'strat' };
function wt(K, p) {
  switch (p.plan) {
    case 'bois': return K.m('#d9b58a', { r: 0.55, map: 'bois' });
    case 'pierre': return K.m('#cdbfa6', { r: 0.7, map: 'stone' });
    case 'granit': return K.m(p.c2, { r: 0.22, map: 'granite' });
    case 'marbre': return K.m('#ffffff', { r: 0.15, map: 'marble' });
    case 'quartz': return K.m(p.c2, { r: 0.12 });
    case 'beton': return K.m('#b8b6b0', { r: 0.85, map: 'concrete' });
    case 'inox': return K.m('#c3c8cd', { r: 0.25, m: 0.9 });
    default: return K.m(p.c2, { r: 0.4 });
  }
}
const kCols = [['Façades', '#e6e2da'], ['Plan de travail', '#6e6a64']];
function kBase(nd, drawers) {
  return (g, p, K) => {
    const { w, d } = p, h = 0.85, bm = K.body(p.c1), n = nd ?? (w > 0.7 ? 2 : 1), pl = 0.1, bh = h - 0.04 - pl;
    K.box(w - 0.04, pl, d - 0.06, K.black(), 0, pl / 2, -0.02);
    K.carcass(w, bh, d - 0.02, bm, 0, pl, -0.01, g, 0.018);
    K.box(w + 0.002, 0.04, d + 0.02, wt(K, p), 0, h - 0.02, 0.0);
    if (drawers) { const dh = bh / 3; for (let i = 0; i < 3; i++) K.drawer(w - 0.02, dh - 0.01, d - 0.05, bm, 0, pl + i * dh + 0.01, d / 2 - 0.01, g, { travel: 0.3 }); }
    else { const dw = (w - 0.004) / n; for (let i = 0; i < n; i++) K.cdoor(dw, bh - 0.01, bm, -w / 2 + (i + 0.5) * dw, pl + 0.005, d / 2 - 0.01, n === 1 ? 1 : i === 0 ? 1 : -1, g, { hy: bh - 0.12, hlen: 0.18 }); }
  };
}
reg('kbas60', 'Cuisine', 'Meuble bas 60 (1 porte)', 0.6, 0.6, 0.85, 89, kCols, kBase(1, false), { anim: 'Ouvrir la porte' });
reg('kbas80', 'Cuisine', 'Meuble bas 80 (2 portes)', 0.8, 0.6, 0.85, 109, kCols, kBase(2, false), { anim: 'Ouvrir les portes' });
reg('ktiroirs', 'Cuisine', 'Meuble bas 60 (3 tiroirs)', 0.6, 0.6, 0.85, 139, kCols, kBase(0, true), { anim: 'Ouvrir les tiroirs' });
reg('khaut', 'Cuisine', 'Meuble haut 60', 0.6, 0.35, 0.7, 69, [['Façades', '#e6e2da']], (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1), n = w > 0.7 ? 2 : 1, dw = (w - 0.004) / n;
  K.carcass(w, h, d - 0.02, bm, 0, 0, -0.01, g, 0.018); K.box(w - 0.04, 0.016, d - 0.06, bm, 0, h / 2, -0.02);
  for (let i = 0; i < n; i++) K.cdoor(dw, h - 0.01, bm, -w / 2 + (i + 0.5) * dw, 0.005, d / 2 - 0.01, n === 1 ? 1 : i === 0 ? 1 : -1, g, { hy: 0.12, hlen: 0.15 });
}, { elev: 1.45, anim: 'Ouvrir la porte' });
reg('kevier', 'Cuisine', 'Évier 120 + meuble', 1.2, 0.6, 0.85, 249, kCols, (g, p, K) => {
  const { w, d } = p, h = 0.85, bm = K.body(p.c1), pl = 0.1, bh = h - 0.04 - pl, ix = K.inox();
  K.box(w - 0.04, pl, d - 0.06, K.black(), 0, pl / 2, -0.02); K.carcass(w, bh, d - 0.02, bm, 0, pl, -0.01, g, 0.018);
  const cm = wt(K, p), bx0 = -w / 2 + 0.12, bw = 0.5, bd = 0.4, zb = -0.02;
  // plan de travail percé d'une cuve
  K.box(bx0 - -w / 2, 0.04, d, cm, (-w / 2 + bx0) / 2, h - 0.02, 0);
  K.box(w / 2 - (bx0 + bw), 0.04, d, cm, (bx0 + bw + w / 2) / 2, h - 0.02, 0);
  K.box(bw, 0.04, d / 2 + zb - bd / 2, cm, bx0 + bw / 2, h - 0.02, -d / 2 + (d / 2 + zb - bd / 2) / 2);
  K.box(bw, 0.04, d / 2 - zb - bd / 2, cm, bx0 + bw / 2, h - 0.02, d / 2 - (d / 2 - zb - bd / 2) / 2);
  K.box(bw, 0.01, bd, ix, bx0 + bw / 2, h - 0.17, zb); K.box(bw, 0.15, 0.01, ix, bx0 + bw / 2, h - 0.095, zb - bd / 2); K.box(bw, 0.15, 0.01, ix, bx0 + bw / 2, h - 0.095, zb + bd / 2);
  K.box(0.01, 0.15, bd, ix, bx0, h - 0.095, zb); K.box(0.01, 0.15, bd, ix, bx0 + bw, h - 0.095, zb);
  const fx = bx0 + bw + 0.1; K.cyl(0.015, 0.015, 0.25, ix, fx, h + 0.125, -d / 2 + 0.08, null, 12);
  K.box(0.02, 0.02, 0.17, ix, fx, h + 0.25, -d / 2 + 0.16);
  const dw = (w - 0.004) / 2;
  for (let i = 0; i < 2; i++) K.cdoor(dw, bh - 0.01, bm, -w / 2 + (i + 0.5) * dw, pl + 0.005, d / 2 - 0.01, i === 0 ? 1 : -1, g, { hy: bh - 0.12, hlen: 0.18 });
}, { anim: 'Ouvrir les portes' });

registerKitchen(reg, wt, WTSEL);   // cuisine modulaire (js/kitchen.js)

// ---------- ÉLECTROMÉNAGER ----------
function fridge(kind) {
  return (g, p, K) => {
    const { w, d, h } = p, bm = K.m(p.c1, { r: kind === 'us' ? 0.3 : 0.35, m: kind === 'us' ? 0.7 : 0.1 }), inner = K.m('#f2f4f5', { r: 0.4 }), ix = K.inox();
    K.carcass(w, h - 0.03, d - 0.02, inner, 0, 0.03, -0.01, g, 0.03); K.box(w - 0.04, 0.03, d - 0.06, K.black(), 0, 0.015, 0);
    const sh = (n, x, ww, y0, y1) => { for (let i = 1; i < n; i++) K.box(ww, 0.008, d - 0.12, K.glass(), x, y0 + ((y1 - y0) * i) / n, -0.02); };
    if (kind === 'us') {
      sh(4, -w / 4, w / 2 - 0.08, 0.1, h - 0.1); sh(3, w / 4, w / 2 - 0.08, 0.1, h - 0.1); K.box(0.02, h - 0.06, d - 0.06, inner, 0, h / 2, 0);
      for (const hg of [1, -1]) {
        // hg = 1 : porte gauche (charnière à gauche) ; hg = -1 : porte droite
        const dw = w / 2, pv = K.piv(-hg * w / 2, 0.03, d / 2, g);
        K.box(dw - 0.006, h - 0.03, 0.05, bm, hg * dw / 2, (h - 0.03) / 2, 0, pv);
        K.box(0.02, 0.5, 0.03, ix, hg * (dw - 0.045), (h - 0.03) * 0.55, 0.04, pv);
        K.add(pv, { rot: ['y', -hg * 1.75] });
      }
    } else {
      const fh = Math.round((h * 0.3) * 100) / 100;
      sh(3, 0, w - 0.1, 0.1, h - fh - 0.05); K.box(w - 0.06, 0.02, d - 0.1, inner, 0, h - fh, -0.02);
      for (const [y0, y1] of [[0.03, h - fh - 0.005], [h - fh + 0.005, h - 0.005]]) {
        const pv = K.piv(w / 2, y0, d / 2, g);
        K.box(w - 0.004, y1 - y0, 0.05, bm, -w / 2, (y1 - y0) / 2, 0, pv); K.box(0.02, Math.min(0.5, (y1 - y0) * 0.6), 0.03, ix, -w + 0.05, (y1 - y0) * (y1 > h - fh ? 0.4 : 0.7), 0.04, pv);
        K.add(pv, { rot: ['y', 1.8] });
      }
    }
  };
}
reg('frigo', 'Électroménager', 'Réfrigérateur combiné', 0.6, 0.65, 1.85, 549, [['Façade', '#f3f3f1']], fridge('combi'), { anim: 'Ouvrir les portes', lock: true, fin: null });
reg('frigo_us', 'Électroménager', 'Réfrigérateur américain', 0.9, 0.7, 1.78, 1099, [['Façade', '#b5babf']], fridge('us'), { anim: 'Ouvrir les portes', lock: true, fin: null });

function washer(dry) {
  return (g, p, K) => {
    const { w, d, h } = p, bm = K.white(), r = 0.23;
    K.box(w, h, d, bm, 0, h / 2, 0);
    K.box(w - 0.02, 0.07, 0.02, K.m('#d8dadb', { r: 0.4 }), 0, h - 0.06, d / 2 + 0.002);
    K.cyl(0.025, 0.025, 0.02, K.inox(), -w / 2 + 0.1, h - 0.06, d / 2 + 0.015).rotation.x = Math.PI / 2;
    K.box(0.09, 0.03, 0.01, K.m('#0d1b2a', { r: 0.2 }), w / 2 - 0.12, h - 0.06, d / 2 + 0.012);
    const cy = (h - 0.1) / 2 - 0.0, hole = K.cyl(r + 0.02, r + 0.02, 0.01, K.black(), 0, cy, d / 2 + 0.004); hole.rotation.x = Math.PI / 2;
    const drum = K.cyl(r, r - 0.02, 0.3, K.m('#8d9399', { r: 0.4, m: 0.7 }), 0, cy, d / 2 - 0.15); drum.rotation.x = Math.PI / 2; drum.material = K.m('#5a5f66', { r: 0.4, m: 0.6 });
    const pv = K.piv(-r - 0.02, cy, d / 2 + 0.004, g);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.01, 0.03, 12, 40), dry ? K.m('#aab0b5', { m: 0.7, r: 0.3 }) : K.m('#d7dadc', { r: 0.3 })); ring.position.set(r + 0.02, 0, 0.03); ring.castShadow = true; pv.add(ring);
    const gl = K.cyl(r, r, 0.04, K.m(dry ? '#8a8f94' : '#7da3b5', { r: 0.05, op: 0.55 }), r + 0.02, 0, 0.03, pv); gl.rotation.x = Math.PI / 2;
    K.add(pv, { rot: ['y', -1.95] });
  };
}
reg('lavelinge', 'Électroménager', 'Lave-linge hublot', 0.6, 0.6, 0.85, 449, [], washer(false), { anim: 'Ouvrir le hublot', lock: true, fin: null });
reg('seche', 'Électroménager', 'Sèche-linge', 0.6, 0.6, 0.85, 549, [], washer(true), { anim: 'Ouvrir le hublot', lock: true, fin: null });

reg('lavevaisselle', 'Électroménager', 'Lave-vaisselle', 0.6, 0.6, 0.85, 479, [['Façade', '#c3c8cd']], (g, p, K) => {
  const { w, d, h } = p, bm = K.m(p.c1, { r: 0.3, m: 0.7 }), inner = K.m('#b4bbc0', { r: 0.4, m: 0.6 });
  K.carcass(w, h - 0.05, d - 0.02, inner, 0, 0.05, -0.01, g, 0.02); K.box(w - 0.04, 0.05, d - 0.06, K.black(), 0, 0.025, 0);
  for (const y of [0.2, 0.45]) { K.box(w - 0.08, 0.012, d - 0.12, K.black(), 0, y, -0.02); K.box(w - 0.08, 0.1, 0.006, K.black(), 0, y + 0.05, -d / 2 + 0.1); }
  const pv = K.piv(0, 0.06, d / 2, g);
  K.box(w - 0.006, h - 0.07, 0.04, bm, 0, (h - 0.07) / 2, 0, pv); K.box(w * 0.7, 0.025, 0.03, K.inox(), 0, h - 0.1, 0.03, pv);
  K.add(pv, { rot: ['x', 1.5] });
}, { anim: 'Ouvrir la porte', lock: true, fin: null });

reg('cuisiniere', 'Électroménager', 'Cuisinière 4 feux + four', 0.6, 0.62, 0.85, 599, [['Façade', '#2b2d31']], (g, p, K) => {
  const { w, d, h } = p, bm = K.m(p.c1, { r: 0.3, m: 0.4 }), blk = K.black();
  K.box(w, h - 0.04, d, bm, 0, (h - 0.04) / 2, 0); K.box(w, 0.04, d, blk, 0, h - 0.02, 0);
  for (const [x, z, r] of [[-0.15, -0.14, 0.07], [0.15, -0.14, 0.055], [-0.15, 0.12, 0.055], [0.15, 0.12, 0.07]]) { K.cyl(r, r, 0.012, K.m('#6b6f75', { m: 0.6, r: 0.4 }), x, h + 0.004, z); K.cyl(r * 0.45, r * 0.45, 0.018, blk, x, h + 0.01, z); }
  for (let i = 0; i < 5; i++) K.cyl(0.02, 0.02, 0.02, K.inox(), -0.2 + i * 0.1, h - 0.06, d / 2 + 0.01, null, 14).rotation.x = Math.PI / 2;
  const oh = h * 0.55, y0 = 0.05;
  const cav = K.box(w - 0.1, oh, 0.012, K.m('#1a1a1c', { r: 0.8 }), 0, y0 + oh / 2, d / 2 + 0.003);
  const gm = K.m('#ff9a3c', { r: 0.6 }); const lamp = K.box(w - 0.14, 0.02, 0.01, gm, 0, y0 + oh - 0.03, d / 2 + 0.012); K.add(lamp, { glow: { mat: gm, color: '#ff8a1c', int: 2 } });
  const pv = K.piv(0, y0, d / 2 + 0.01, g);
  K.box(w - 0.08, oh, 0.035, bm, 0, oh / 2, 0, pv); K.box(w - 0.18, oh * 0.55, 0.01, K.m('#0c0d10', { r: 0.1, op: 0.85 }), 0, oh * 0.5, 0.02, pv);
  K.cyl(0.012, 0.012, w * 0.7, K.inox(), 0, oh - 0.04, 0.07, pv).rotation.z = Math.PI / 2;
  K.add(pv, { rot: ['x', 1.55] });
  void cav;
}, { anim: 'Ouvrir le four', lock: true, fin: null });

reg('four', 'Électroménager', 'Four encastrable', 0.6, 0.55, 0.6, 389, [['Façade', '#1d1e21']], (g, p, K) => {
  const { w, d, h } = p, bm = K.m(p.c1, { r: 0.25, m: 0.3 });
  K.box(w, h, d, K.m('#c3c8cd', { r: 0.4, m: 0.6 }), 0, h / 2, 0); K.box(w, h * 0.22, 0.02, bm, 0, h - h * 0.11, d / 2 + 0.003);
  for (let i = 0; i < 4; i++) K.cyl(0.015, 0.015, 0.015, K.inox(), -0.18 + i * 0.12, h - h * 0.11, d / 2 + 0.017, null, 12).rotation.x = Math.PI / 2;
  const oh = h * 0.7, y0 = 0.02;
  K.box(w - 0.08, oh, 0.012, K.m('#17171a', { r: 0.9 }), 0, y0 + oh / 2, d / 2 + 0.003);
  const gm = K.m('#ff9a3c', { r: 0.6 }); const lamp = K.box(w - 0.14, 0.02, 0.01, gm, 0, y0 + oh - 0.03, d / 2 + 0.012); K.add(lamp, { glow: { mat: gm, color: '#ff8a1c', int: 2 } });
  const pv = K.piv(0, y0, d / 2 + 0.01, g);
  K.box(w - 0.04, oh, 0.035, bm, 0, oh / 2, 0, pv); K.box(w - 0.14, oh * 0.6, 0.01, K.m('#0c0d10', { r: 0.1, op: 0.85 }), 0, oh * 0.5, 0.02, pv);
  K.cyl(0.011, 0.011, w * 0.65, K.inox(), 0, oh - 0.035, 0.06, pv).rotation.z = Math.PI / 2;
  K.add(pv, { rot: ['x', 1.55] });
}, { anim: 'Ouvrir le four', elev: 0.9, lock: true, fin: null });

reg('micro', 'Électroménager', 'Micro-ondes', 0.5, 0.38, 0.3, 129, [['Corps', '#d5d8db']], (g, p, K) => {
  const { w, d, h } = p, bm = K.m(p.c1, { r: 0.35, m: 0.4 });
  K.box(w, h, d, bm, 0, h / 2, 0);
  const cx = -w / 2 + (w * 0.7) / 2 + 0.02, cw = w * 0.68;
  K.box(cw - 0.03, h - 0.06, 0.01, K.m('#1a1a1c', { r: 0.8 }), cx, h / 2, d / 2 + 0.003);
  K.box(w * 0.22, h - 0.06, 0.012, K.black(), w / 2 - 0.1 - 0.0, h / 2, d / 2 + 0.004);
  K.cyl(0.02, 0.02, 0.015, K.inox(), w / 2 - 0.1, h * 0.35, d / 2 + 0.016, null, 12).rotation.x = Math.PI / 2;
  const pv = K.piv(cx - cw / 2 + 0.01, 0.015, d / 2 + 0.008, g);
  K.box(cw - 0.01, h - 0.03, 0.02, bm, (cw - 0.01) / 2, (h - 0.03) / 2, 0, pv); K.box(cw - 0.08, h - 0.1, 0.008, K.m('#101215', { r: 0.1, op: 0.8 }), (cw - 0.01) / 2 - 0.01, (h - 0.03) / 2, 0.013, pv);
  K.box(0.012, h * 0.6, 0.02, K.inox(), cw - 0.04, (h - 0.03) / 2, 0.025, pv);
  K.add(pv, { rot: ['y', -1.8] });
}, { anim: 'Ouvrir la porte', elev: 0.9, lock: true, fin: null });

reg('hotte', 'Électroménager', 'Hotte aspirante', 0.6, 0.5, 0.85, 249, [['Corps', '#c3c8cd']], (g, p, K) => {
  const { w, d, h } = p, bm = K.m(p.c1, { r: 0.3, m: 0.7 });
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.55, w * 0.72, 0.18, 4, 1), bm); tr.rotation.y = Math.PI / 4; tr.scale.z = d / w; tr.position.y = 0.09; tr.castShadow = true; g.add(tr);
  K.box(0.3, h - 0.18, 0.22, bm, 0, 0.18 + (h - 0.18) / 2, -d / 2 + 0.2);
  const lm = K.m('#fff6dc', { r: 0.4 }); const lamp = K.box(0.3, 0.01, 0.12, lm, 0, 0.002, 0.0); K.add(lamp, { glow: { mat: lm, color: '#ffe9a8', int: 1.6 } });
}, { anim: 'Allumer l\'éclairage', elev: 1.55, lock: true, fin: null });

reg('clim', 'Électroménager', 'Climatiseur mural', 0.9, 0.22, 0.3, 599, [['Corps', '#f4f4f2']], (g, p, K) => {
  const { w, d, h } = p, bm = K.m(p.c1, { r: 0.35 });
  K.rbox(w, h, d, 0.05, bm, 0, h / 2, 0); K.box(w - 0.1, 0.012, 0.01, K.m('#cfd3d6'), 0, h * 0.72, d / 2 + 0.002);
  const led = K.m('#33ff99', { r: 0.4 }); const l = K.box(0.02, 0.01, 0.005, led, w / 2 - 0.08, h * 0.82, d / 2 + 0.003); K.add(l, { glow: { mat: led, color: '#33ff99', int: 2.5 } });
  const pv = K.piv(0, 0.07, d / 2 - 0.01, g); K.box(w - 0.1, 0.07, 0.015, bm, 0, -0.035, 0, pv);
  K.add(pv, { rot: ['x', -0.75] });
}, { anim: 'Mettre en marche', elev: 2.0, lock: true, fin: null });

reg('chauffeeau', 'Électroménager', 'Chauffe-eau 200 L', 0.55, 0.55, 1.6, 649, [['Cuve', '#f3f3f1']], (g, p, K) => {
  const { w, h } = p, bm = K.m(p.c1, { r: 0.35 });
  K.cyl(w / 2, w / 2, h - 0.1, bm, 0, h / 2, 0, null, 40); const cap = K.sph(w / 2, bm, 0, h - 0.06, 0); cap.scale.y = 0.35;
  K.cyl(w / 2 + 0.005, w / 2 + 0.005, 0.1, K.black(), 0, 0.05, 0, null, 40);
  const led = K.m('#ff6a2c', { r: 0.4 }); const l = K.box(0.04, 0.02, 0.01, led, 0, 1.1, w / 2 + 0.003); K.add(l, { glow: { mat: led, color: '#ff6a2c', int: 3 } });
  K.cyl(0.015, 0.015, 0.2, K.m('#b87333', { m: 0.9, r: 0.3 }), -0.1, h + 0.0, 0.0, null, 10); K.cyl(0.015, 0.015, 0.2, K.m('#2d6bd1', { m: 0.2 }), 0.1, h + 0.0, 0.0, null, 10);
}, { anim: 'Voyant de chauffe', lock: true, fin: null });

reg('radiateur', 'Électroménager', 'Radiateur panneau', 1.0, 0.1, 0.6, 129, [['Corps', '#f4f4f2']], (g, p, K) => {
  const { w, d, h } = p, bm = K.m(p.c1, { r: 0.4 });
  K.rbox(w, h, 0.045, 0.012, bm, 0, h / 2, -d / 2 + 0.03); K.rbox(w, h, 0.045, 0.012, bm, 0, h / 2, 0.02);
  for (let i = 0; i < 24; i++) K.box(0.004, h - 0.02, 0.06, bm, -w / 2 + 0.03 + (i * (w - 0.06)) / 23, h / 2, 0.0);
}, { elev: 0.15, fin: null });

// ---------- SALLE DE BAIN ----------
reg('vasque', 'Salle de bain', 'Meuble vasque 80', 0.8, 0.46, 0.85, 289, [['Meuble', '#8fa6b8'], ['Vasque', '#ffffff']], (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1), cm = K.m(p.c2, { r: 0.1 }), lh = 0.12, bh = h - 0.2 - lh;
  K.legs(w, d, lh, 0.015, K.inox(), 0.04); K.carcass(w, bh, d, bm, 0, lh, 0, g, 0.018);
  const dw = (w - 0.004) / 2; for (let i = 0; i < 2; i++) K.cdoor(dw, bh - 0.01, bm, -w / 2 + (i + 0.5) * dw, lh + 0.005, d / 2, i === 0 ? 1 : -1, g, { hy: bh - 0.12, hlen: 0.15 });
  K.rbox(w + 0.02, 0.2, d + 0.02, 0.035, cm, 0, h - 0.1, 0); K.rbox(w * 0.55, 0.035, d * 0.72, 0.03, K.m('#e9eef0', { r: 0.1 }), 0, h + 0.0, 0.02);
  K.cyl(0.015, 0.015, 0.2, K.inox(), 0, h + 0.1, -d / 2 + 0.07, null, 12); K.box(0.02, 0.02, 0.13, K.inox(), 0, h + 0.2, -d / 2 + 0.13);
}, { anim: 'Ouvrir les portes' });
reg('miroir', 'Salle de bain', 'Miroir mural', 0.6, 0.04, 0.8, 49, [['Cadre', '#2e3338']], (g, p, K) => {
  const { w, d, h } = p; K.box(w, h, d, K.m(p.c1, { r: 0.5 }), 0, h / 2, 0); K.box(w - 0.04, h - 0.04, 0.004, K.m('#dfe9ee', { r: 0.03, m: 1 }), 0, h / 2, d / 2 + 0.001);
}, { elev: 1.1, fin: null });
reg('wc', 'Salle de bain', 'WC avec réservoir', 0.4, 0.7, 0.8, 199, [], (g, p, K) => {
  const { w, d, h } = p, cm = K.m('#f6f6f4', { r: 0.12 });
  K.rbox(w - 0.02, 0.35, 0.2, 0.03, cm, 0, 0.35 + 0.15, -d / 2 + 0.12);
  const bowl = K.cyl(0.19, 0.12, 0.4, cm, 0, 0.2, 0.0, null, 32); bowl.scale.z = 1.6; bowl.position.z = 0.0 + 0.05;
  const ring = K.cyl(0.2, 0.2, 0.03, cm, 0, 0.415, 0.05, null, 32); ring.scale.z = 1.65;
  const pv = K.piv(0, 0.43, -d / 2 + 0.22, g);
  const lid = K.cyl(0.19, 0.19, 0.025, cm, 0, 0.0125, 0.0, pv, 32); lid.scale.z = 1.5; lid.position.z = 0.28;
  K.add(pv, { rot: ['x', -1.5] });
  K.cyl(0.02, 0.02, 0.02, K.inox(), 0, 0.64, -d / 2 + 0.12);
}, { anim: 'Relever l\'abattant', fin: null });
reg('baignoire', 'Salle de bain', 'Baignoire 170', 1.7, 0.75, 0.58, 449, [['Coque', '#f6f6f4']], (g, p, K) => {
  const { w, d, h } = p, cm = K.m(p.c1, { r: 0.12 }), t = 0.07, wm = K.m('#cfe6ee', { r: 0.05, op: 0.65 });
  K.rbox(w, h - 0.0, d, 0.12, K.m('#e9e7e1', { r: 0.6 }), 0, h / 2, 0).visible = false;
  K.box(w, h, t, cm, 0, h / 2, d / 2 - t / 2); K.box(w, h, t, cm, 0, h / 2, -d / 2 + t / 2);
  K.box(t, h, d, cm, -w / 2 + t / 2, h / 2, 0); K.box(t, h, d, cm, w / 2 - t / 2, h / 2, 0);
  K.box(w - 2 * t, 0.12, d - 2 * t, cm, 0, 0.06, 0); K.box(w - 2 * t - 0.02, 0.003, d - 2 * t - 0.02, wm, 0, h * 0.72, 0);
  K.cyl(0.015, 0.015, 0.25, K.inox(), w / 2 - 0.15, h + 0.12, 0.0, null, 12);
}, { fin: null });
reg('douche', 'Salle de bain', 'Cabine de douche 90', 0.9, 0.9, 2.1, 399, [['Profilés', '#c3c8cd']], (g, p, K) => {
  const { w, d, h } = p, pm = K.m(p.c1, { m: 0.8, r: 0.3 }), gm = K.m('#bcd9e6', { r: 0.05, op: 0.28 });
  K.box(w, 0.07, d, K.m('#f6f6f4', { r: 0.2 }), 0, 0.035, 0); K.box(w - 0.14, 0.004, d - 0.14, K.m('#e1e5e6', { r: 0.4 }), 0, 0.072, 0);
  K.box(0.012, h - 0.07, d, gm, -w / 2 + 0.006, 0.07 + (h - 0.07) / 2, 0);
  K.box(0.03, h - 0.07, 0.03, pm, -w / 2 + 0.015, 0.07 + (h - 0.07) / 2, d / 2 - 0.015);
  const gh = h - 0.1, half = w / 2;
  K.box(half, gh, 0.01, gm, -w / 2 + half / 2 + 0.03, 0.08 + gh / 2, d / 2 - 0.01); // vantail fixe
  const pv = K.piv(0, 0.08, d / 2 + 0.015, g); K.box(half, gh, 0.01, gm, w / 2 - half / 2 - 0.02, gh / 2, 0, pv);
  K.box(0.02, gh, 0.02, pm, w / 2 - half - 0.0 + 0.0, gh / 2, 0.0, pv); K.box(0.02, gh * 0.4, 0.025, pm, w / 2 - 0.045, gh / 2, 0.0, pv);
  K.add(pv, { slide: [-half + 0.06, 0, 0] });
  K.box(w, 0.025, 0.025, pm, 0, h - 0.0125, d / 2 - 0.0125); K.cyl(0.012, 0.012, 1.3, K.inox(), -w / 2 + 0.05, 1.45, -d / 2 + 0.04, null, 12);
  K.cyl(0.11, 0.11, 0.015, K.inox(), -w / 2 + 0.05, 2.0, -d / 2 + 0.15, null, 24);
}, { anim: 'Ouvrir la porte coulissante', fin: null });
reg('seche_serv', 'Salle de bain', 'Sèche-serviettes', 0.5, 0.1, 1.2, 199, [['Corps', '#f4f4f2']], (g, p, K) => {
  const { w, d, h } = p, bm = K.m(p.c1, { r: 0.4 });
  for (const sx of [-1, 1]) K.cyl(0.02, 0.02, h, bm, sx * (w / 2 - 0.02), h / 2, 0, null, 14);
  const n = Math.round(h / 0.1); for (let i = 0; i < n; i++) K.cyl(0.011, 0.011, w - 0.04, bm, 0, 0.06 + i * ((h - 0.12) / (n - 1)), 0, null, 10).rotation.z = Math.PI / 2;
}, { elev: 0.3, fin: null });

// ---------- BUREAU ----------
reg('bureau', 'Bureau', 'Bureau avec caisson', 1.4, 0.7, 0.74, 179, [['Plateau', WHITE], ['Structure', ANTH]], (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1), lm = K.m(p.c2, { m: 0.4, r: 0.45 });
  K.box(w, 0.035, d, bm, 0, h - 0.0175, 0); K.box(0.04, h - 0.035, d - 0.1, lm, -w / 2 + 0.02, (h - 0.035) / 2, 0); K.box(w - 0.5, 0.2, 0.02, lm, -0.2, h - 0.14, -d / 2 + 0.1);
  const cw = 0.42, cx = w / 2 - cw / 2 - 0.0, ch = h - 0.035;
  K.carcass(cw, ch, d - 0.06, bm, cx, 0, 0, g, 0.018);
  for (let i = 0; i < 3; i++) K.drawer(cw - 0.03, ch / 3 - 0.012, d - 0.1, bm, cx, i * (ch / 3) + 0.008, d / 2 - 0.03, g, { travel: 0.3 });
}, { anim: 'Ouvrir les tiroirs', fin: 'mat' });
reg('chaise_bureau', 'Bureau', 'Chaise de bureau', 0.6, 0.6, 1.0, 129, [['Tissu', '#2e3338'], ['Base', '#1b1c1f']], (g, p, K) => {
  const { w, d, h } = p, fab = K.m(p.c1, { r: 0.9 }), bm = K.m(p.c2, { r: 0.5, m: 0.3 }), sy = 0.45;
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2, arm = K.box(0.3, 0.025, 0.04, bm, Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15); arm.rotation.y = -a; K.cyl(0.025, 0.025, 0.04, bm, Math.cos(a) * 0.3, 0.02, Math.sin(a) * 0.3, null, 10); }
  K.cyl(0.03, 0.03, sy - 0.1, K.inox(), 0, 0.1 + (sy - 0.1) / 2, 0, null, 14);
  K.rbox(0.5, 0.08, 0.5, 0.04, fab, 0, sy, 0.02); const b = K.rbox(0.46, 0.5, 0.07, 0.04, fab, 0, sy + 0.32, -0.23); b.rotation.x = -0.08;
  for (const sx of [-1, 1]) { K.box(0.03, 0.2, 0.03, bm, sx * 0.27, sy + 0.1, 0.0); K.box(0.06, 0.03, 0.26, fab, sx * 0.27, sy + 0.21, 0.0); }
});

// ---------- DÉCO ----------
reg('tapis', 'Déco', 'Tapis 200×300', 2.0, 3.0, 0.015, 119, [['Couleur', '#c9b79c'], ['Bordure', '#8a7e6d']], (g, p, K) => {
  K.rbox(p.w, 0.015, p.d, 0.005, K.m(p.c2, { r: 1 }), 0, 0.0075, 0); K.rbox(p.w - 0.1, 0.017, p.d - 0.1, 0.005, K.m(p.c1, { r: 1 }), 0, 0.009, 0);
}, { fin: null });
reg('tapis_r', 'Déco', 'Tapis rond Ø 160', 1.6, 1.6, 0.015, 89, [['Couleur', '#9aa5a8']], (g, p, K) => {
  const t = K.cyl(0.5, 0.5, 0.015, K.m(p.c1, { r: 1 }), 0, 0.0075, 0, null, 48); t.scale.set(p.w, 1, p.d);
}, { fin: null });
reg('plante', 'Déco', 'Plante en pot', 0.5, 0.5, 1.3, 39, [['Pot', '#d9c3a5'], ['Feuillage', '#4f7a55']], (g, p, K) => {
  const { w, h } = p, pot = K.cyl(w * 0.34, w * 0.26, h * 0.25, K.m(p.c1, { r: 0.7 }), 0, h * 0.125, 0, null, 24);
  K.cyl(0.015, 0.02, h * 0.45, K.m('#5a4636'), 0, h * 0.4, 0, null, 8);
  const lm = K.m(p.c2, { r: 0.8 }); const pts = [[0, 0.62, 0, 0.2], [0.14, 0.5, 0.05, 0.16], [-0.13, 0.52, -0.06, 0.17], [0.05, 0.78, -0.05, 0.16], [-0.08, 0.72, 0.1, 0.14], [0.12, 0.9, 0.0, 0.1], [-0.05, 0.95, -0.03, 0.1]];
  for (const [x, yy, z, r] of pts) K.sph(r * (w / 0.5), lm, x * (w / 0.5), h * yy, z * (w / 0.5), null, 1, 0.9, 1);
  void pot;
}, { fin: null });
reg('lampadaire', 'Éclairage', 'Lampadaire', 0.4, 0.4, 1.6, 59, [['Structure', '#2e3338'], ['Abat-jour', '#f1ead8']], (g, p, K) => {
  const { w, h } = p, bm = K.m(p.c1, { m: 0.6, r: 0.4 });
  K.cyl(w / 2 * 0.8, w / 2 * 0.8, 0.02, bm, 0, 0.01, 0); K.cyl(0.012, 0.012, h - 0.25, bm, 0, (h - 0.25) / 2, 0, null, 10);
  const sm = new THREE.MeshStandardMaterial({ color: p.c2, roughness: 0.9, side: THREE.DoubleSide, emissive: '#000000' });
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(w / 2 * 0.75, w / 2, 0.28, 32, 1, true), sm); sh.position.y = h - 0.18; sh.castShadow = true; g.add(sh);
  const light = new THREE.PointLight('#ffd9a0', 0, 6, 2); light.position.y = h - 0.2; g.add(light);
  K.add(sh, { glow: { mat: sm, color: '#ffcf80', int: 1.2 } }); K.add(sh, { light: { light, int: 6 } });
}, { anim: 'Allumer / éteindre', fin: null });
reg('tableau', 'Déco', 'Cadre décoratif', 0.8, 0.03, 0.6, 29, [['Cadre', '#2e3338'], ['Toile', '#d6a69a']], (g, p, K) => {
  const { w, d, h } = p; K.box(w, h, d, K.m(p.c1, { r: 0.5 }), 0, h / 2, 0); K.box(w - 0.06, h - 0.06, 0.004, K.m(p.c2, { r: 0.8 }), 0, h / 2, d / 2 + 0.001);
  K.box((w - 0.06) * 0.5, (h - 0.06) * 0.45, 0.004, K.m(tone(p.c2, -0.3), { r: 0.8 }), -w * 0.1, h * 0.55, d / 2 + 0.003);
}, { elev: 1.4, fin: null });


// ---------- EXTÉRIEUR : voitures (visibles seulement quand la personne liée est à la maison, voir « Visible si » dans le panneau) ----------
// profil de carrosserie extrudé sur la largeur, d'après les modèles de la carte plan-3d ; l'avant est du côté +z du meuble
function carBuild(o) {
  return (g, p, K) => {
    const { L, W } = o, m = L / 2, fx = m - o.fo, bx = fx - o.wb, R = 0.4, v = m - o.cowl, rz = o.roofZ;
    const mk = (c, r, mt = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt });
    const body = mk(p.c1, 0.5, 0.2), glass = mk(p.c2, 0.05, 0.3), tyre = mk('#121212', 0.9), rim = mk('#9a9da2', 0.3, 0.7), head = mk('#e6eaee', 0.15, 0.2), tail = mk('#9a1414', 0.3), plate = mk('#1b1c1f', 0.7);
    const car = new THREE.Group(), add = (mesh, x, y, z) => { mesh.position.set(x, y, z); mesh.castShadow = true; car.add(mesh); return mesh; };
    const ext = (shape, depth, mat, bev) => {
      const geo = new THREE.ExtrudeGeometry(shape, { depth: depth - 2 * bev, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 24 });
      geo.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, -(depth - 2 * bev) / 2, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1));
      const me = new THREE.Mesh(geo, mat); me.castShadow = me.receiveShadow = true; car.add(me); return me;
    };
    const y = new THREE.Shape();
    y.moveTo(0.1 - m, 0.36); y.quadraticCurveTo(0.12 - m, 0.22, 0.3 - m, 0.22); y.lineTo(bx - R, 0.22); y.lineTo(bx - R, 0.31); y.absarc(bx, 0.31, R, Math.PI, 0, true); y.lineTo(bx + R, 0.22);
    y.lineTo(fx - R, 0.22); y.lineTo(fx - R, 0.31); y.absarc(fx, 0.31, R, Math.PI, 0, true); y.lineTo(fx + R, 0.22); y.lineTo(m - 0.18, 0.23); y.quadraticCurveTo(m + 0.01, 0.25, m, 0.46);
    y.quadraticCurveTo(m - 0.01, 0.66, m - 0.28, 0.72); y.quadraticCurveTo(v + 0.3, 0.84, v, 0.9); y.lineTo(0.25 - m, o.beltR); y.quadraticCurveTo(0.02 - m, o.beltR, -m, 0.8); y.quadraticCurveTo(-m - 0.02, 0.5, 0.1 - m, 0.36);
    ext(y, W, body, 0.08);
    const S2 = v - o.ws, M = -m + o.rh, x = new THREE.Shape();
    x.moveTo(v + 0.02, 0.86); x.quadraticCurveTo(v - 0.35 * o.ws, rz - 0.12, S2, rz - 0.02); x.quadraticCurveTo((S2 + M) / 2, rz + 0.03, M, rz - 0.05); x.quadraticCurveTo(0.08 - m, rz - 0.2, 0.1 - m, o.beltR - 0.02); x.lineTo(v + 0.02, 0.86);
    ext(x, W - 0.3, glass, 0.1);
    const k = new THREE.Shape();
    k.moveTo(S2 + 0.02, rz + 0.1); k.quadraticCurveTo((S2 + M) / 2, rz + 0.175, M - 0.02, rz + 0.07); k.lineTo(M - 0.02, rz + 0.04); k.quadraticCurveTo((S2 + M) / 2, rz + 0.14, S2 + 0.02, rz + 0.065); k.lineTo(S2 + 0.02, rz + 0.1);
    ext(k, W - 0.4, body, 0.03);
    for (const pz of o.pillars) add(new THREE.Mesh(new THREE.BoxGeometry(W - 0.26, rz - 0.8, 0.07), body), 0, (rz + 0.9) / 2, -pz);
    for (const sx of [-1, 1]) for (const ax of [fx, bx]) {
      const t = add(new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.21, 24), tyre), sx * (W / 2 - 0.13), 0.31, -ax); t.rotation.z = Math.PI / 2;
      const r = add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 20), rim), sx * (W / 2 - 0.13), 0.31, -ax); r.rotation.z = Math.PI / 2;
    }
    for (const sx of [-1, 1]) {
      add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), head), sx * (W / 2 - 0.3), 0.64, -(m - 0.07)).scale.set(1.4, 0.55, 0.5);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 10), tail), sx * (W / 2 - 0.2), 0.83, -(0.05 - m)).scale.set(1.1, 0.8, 0.4);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), body), sx * (W / 2 + 0.03), 0.97, -(v - 0.12)).scale.set(1.1, 0.7, 0.8);
    }
    add(new THREE.Mesh(new THREE.BoxGeometry(W - 0.7, 0.14, 0.06), plate), 0, 0.4, -m);
    add(new THREE.Mesh(new THREE.BoxGeometry(W - 0.5, 0.12, 0.06), plate), 0, 0.36, -(0.02 - m));
    car.rotation.y = Math.PI;                       // l'avant du modèle d'origine est du côté −z : on le retourne vers +z
    car.scale.set(p.w / W, p.h / (rz + 0.1), p.d / L);
    g.add(car); void K;
  };
}
const carCols = [['Carrosserie', '#101114'], ['Vitres', '#26303a']];
reg('voiture1', 'Extérieur', 'Voiture compacte', 1.72, 4.06, 1.4, 0, carCols, carBuild({ L: 4.06, W: 1.72, wb: 2.51, fo: 0.82, cowl: 1.12, ws: 0.8, rh: 0.5, roofZ: 1.31, beltR: 0.98, pillars: [0.12] }), { fin: null, lock: true });
reg('voiture2', 'Extérieur', 'Voiture berline', 1.72, 4.03, 1.46, 0, carCols, carBuild({ L: 4.03, W: 1.72, wb: 2.54, fo: 0.8, cowl: 1.02, ws: 0.72, rh: 0.3, roofZ: 1.36, beltR: 0.96, pillars: [0.28, -0.62] }), { fin: null, lock: true });


// ---------- ÉCLAIRAGE (points lumineux reliables à une entité Home Assistant) ----------
let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,240,210,1)'); gr.addColorStop(0.18, 'rgba(255,200,130,0.55)'); gr.addColorStop(1, 'rgba(255,170,90,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace; glowTex.userData = { shared: true };
  return glowTex;
}
const LUX = 4; // les intensités d'origine (three r147) sont à multiplier pour le rendu physique actuel
// d'après la carte plan-3d : spot = projecteur à cône (sinon lumière ponctuelle), i = intensité, a = demi-angle, pen = pénombre, sh = ombres portées (pas de fuite de lumière à travers les murs)
const LP = {
  spot: { spot: 1, i: 3, a: 0.62, pen: 0.8, size: 0.7, sh: 0 }, reglette: { spot: 1, i: 2.6, a: 1.15, pen: 1, size: 1.2, sh: 0 }, plafonnier: { spot: 0, i: 1.5, size: 0.9, sh: 1 },
  applique: { spot: 1, i: 1.8, a: 1.2, pen: 0.75, size: 0.9, sh: 1 }, projecteur: { spot: 1, i: 2.6, a: 0.7, pen: 0.6, size: 0.9, sh: 1 }, potelet: { spot: 0, i: 1, size: 0.7, sh: 1 },
  suspension: { spot: 0, i: 1.6, size: 0.9, sh: 1 },
  lampe: { spot: 0, i: 1.0, size: 0.8, sh: 0 }, lustre: { spot: 0, i: 1.8, size: 1.1, sh: 1 }, rail: { spot: 1, i: 2.8, a: 0.6, pen: 0.8, size: 0.7, sh: 0 },
  lanterne: { spot: 0, i: 1.3, size: 0.9, sh: 1 }, liseuse: { spot: 1, i: 1.4, a: 0.8, pen: 0.8, size: 0.6, sh: 0 }, arc: { spot: 0, i: 1.7, size: 1.0, sh: 1 },
};
const SMALL = Math.min(screen.width, screen.height) < 700;
function fixture(type) {
  return (g, p, K) => {
    const q = LP[type], pw = p.pw ?? 1, dist = p.dist ?? 7.5, tilt = ((p.tilt ?? 35) * Math.PI) / 180;
    const bm = new THREE.MeshStandardMaterial({ color: type === 'potelet' ? '#4b4f55' : '#ebe8e1', emissive: '#ffe3b0', emissiveIntensity: 0, roughness: 0.5, metalness: 0.1 });
    let body, lp = [0, -0.1, 0], tg = [0, -3, 0];
    if (type === 'spot') { body = K.cyl(0.06, 0.06, 0.02, bm, 0, 0, 0, null, 16); lp = [0, -0.03, 0]; }
    else if (type === 'reglette') { body = K.box(p.w, 0.04, 0.08, bm, 0, 0, 0); lp = [0, -0.04, 0]; }
    else if (type === 'plafonnier') { body = K.cyl(0.14 * (p.w / 0.28), 0.14 * (p.w / 0.28), 0.03, bm, 0, 0, 0, null, 28); lp = [0, -0.12, 0]; }
    else if (type === 'applique') { body = K.box(0.12, 0.2, 0.12, bm, 0, 0, 0.0); lp = [0, 0, 0.2]; tg = [0, -Math.sin(tilt) * 2.4, 0.2 + Math.cos(tilt) * 2.4]; }
    else if (type === 'projecteur') { body = K.box(0.14, 0.14, 0.26, bm, 0, 0, 0); body.rotation.x = tilt; lp = [0, -0.14 * Math.sin(tilt), 0.14 * Math.cos(tilt)]; tg = [0, -4 * Math.sin(tilt), 4 * Math.cos(tilt)]; }
    else if (type === 'potelet') {
      K.cyl(0.05, 0.05, 0.5, K.m('#908a93', { m: 0.6, r: 0.4 }), 0, 0.25, 0, null, 12);
      body = K.cyl(0.07, 0.07, 0.1, bm, 0, 0.55, 0, null, 16); lp = [0, 0.62, 0];
    } else if (type === 'lampe') {
      K.cyl(0.07, 0.09, 0.03, K.m('#c9a24b', { m: 0.7, r: 0.4 }), 0, 0.015, 0, null, 16); K.cyl(0.012, 0.012, p.h * 0.55, K.m('#c9a24b', { m: 0.7, r: 0.4 }), 0, p.h * 0.3, 0, null, 8);
      body = K.cyl(0.09 * (p.w / 0.25), 0.12 * (p.w / 0.25), p.h * 0.45, bm, 0, p.h * 0.72, 0, null, 24); lp = [0, p.h * 0.7, 0];
    } else if (type === 'lustre') {
      K.cyl(0.004, 0.004, 0.25, K.black(), 0, 0.15, 0, null, 6); body = K.cyl(0.05, 0.05, 0.08, bm, 0, 0, 0, null, 16); lp = [0, -0.05, 0];
      for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283, r = 0.3 * (p.w / 0.7); K.box(r, 0.012, 0.012, K.m('#c9a24b', { m: 0.8, r: 0.3 }), Math.cos(a) * r / 2, -0.03, Math.sin(a) * r / 2).rotation.y = -a; K.cyl(0.018, 0.018, 0.1, bm, Math.cos(a) * r, 0.02, Math.sin(a) * r, null, 8); }
    } else if (type === 'rail') {
      K.box(p.w, 0.03, 0.04, K.black(), 0, 0.045, 0);
      body = K.box(0.07, 0.07, 0.1, bm, 0, -0.005, 0); body.rotation.x = tilt * 0.6; for (const sx of [-1, 1]) { const s = K.box(0.07, 0.07, 0.1, bm, sx * p.w * 0.35, -0.005, 0); s.rotation.x = tilt * 0.6; }
      lp = [0, -0.07, 0.05]; tg = [0, -3 * Math.sin(tilt), 3 * Math.cos(tilt)];
    } else if (type === 'lanterne') {
      K.box(0.1, 0.16, 0.04, K.black(), 0, 0, -0.1); body = K.box(0.14, 0.22, 0.14, bm, 0, 0, 0); K.cyl(0.0, 0.1, 0.06, K.black(), 0, 0.14, 0, null, 4); lp = [0, 0, 0.05];
    } else if (type === 'liseuse') {
      K.box(0.05, 0.12, 0.02, K.black(), 0, 0, -0.03); K.box(0.012, 0.012, 0.2, K.m('#c9a24b', { m: 0.7 }), 0, 0.0, 0.07); body = K.cyl(0.04, 0.06, 0.07, bm, 0, -0.03, 0.18, null, 16); body.rotation.x = Math.PI / 2 - 0.5; lp = [0, -0.07, 0.2]; tg = [0, -Math.sin(tilt) * 1.2, 0.2 + Math.cos(tilt) * 1.2];
    } else if (type === 'arc') {
      K.cyl(0.2, 0.22, 0.04, K.m('#2e3338', { m: 0.4, r: 0.5 }), 0, 0.02, -0.1, null, 24); K.cyl(0.012, 0.012, p.h - 0.2, K.m('#2e3338', { m: 0.4, r: 0.5 }), 0, (p.h - 0.2) / 2, -0.1, null, 8);
      for (let i = 0; i <= 8; i++) { const t = i / 8, z = -0.1 + t * (p.d - 0.3), y = p.h - 0.2 + Math.sin(t * Math.PI * 0.5) * 0.18 - t * t * 0.15; K.sph(0.014, K.m('#2e3338', { m: 0.4, r: 0.5 }), 0, y, z); }
      body = K.sph(0.16, bm, 0, p.h - 0.37, p.d - 0.3, null, 1, 0.8, 1); lp = [0, p.h - 0.45, p.d - 0.3];
    } else { // suspension
      K.cyl(0.004, 0.004, 0.6, K.black(), 0, 0.3, 0, null, 6);
      body = K.cyl(0.05, 0.22, 0.2, bm, 0, 0, 0, null, 28); lp = [0, -0.05, 0];
    }
    const col = '#ffd9a0';
    const light = q.spot ? new THREE.SpotLight(col, 0, dist, q.a, q.pen, 1.5) : new THREE.PointLight(col, 0, dist, 2);
    if (q.sh) { light.castShadow = true; light.userData.sh = true; light.shadow.mapSize.set(SMALL ? 256 : 512, SMALL ? 256 : 512); light.shadow.bias = -0.004; light.shadow.normalBias = 0.02; light.shadow.camera.near = 0.05; }
    light.position.set(...lp); light.visible = false; g.add(light);
    if (q.spot) { light.target.position.set(...tg); g.add(light.target); }
    const spm = new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffc880', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
    const sp = new THREE.Sprite(spm); sp.position.set(lp[0], lp[1], lp[2]); sp.scale.setScalar(type === 'reglette' ? p.w + 0.3 : q.size); sp.renderOrder = 5; sp.visible = false; g.add(sp);
    K.add(body, { glow: { mat: bm, color: '#ffe3b0', int: 2.2 } });
    K.add(body, { light: { light, int: q.i * pw * LUX } });
    K.add(sp, { fade: { mat: spm, max: 0.9 } });
  };
}
const LFIELDS = [{ k: 'pw', l: 'Puissance', min: 0.3, max: 2.5, step: 0.05, def: 1, unit: 'x' }, { k: 'dist', l: 'Portée', min: 2, max: 14, step: 0.5, def: 7.5, unit: 'm' }];
const TFIELD = { k: 'tilt', l: 'Inclinaison', min: 0, max: 80, step: 1, def: 35, unit: '°' };
const lx = { fin: null, lock: false, anim: 'Allumer / éteindre' };
reg('plafonnier', 'Éclairage', 'Plafonnier', 0.28, 0.28, 0.03, 39, [], fixture('plafonnier'), { ...lx, elev: 2.26, fields: LFIELDS });
reg('spot', 'Éclairage', 'Spot encastré', 0.12, 0.12, 0.02, 12, [], fixture('spot'), { ...lx, elev: 2.26, fields: LFIELDS });
reg('reglette', 'Éclairage', 'Réglette LED', 1.2, 0.08, 0.04, 29, [], fixture('reglette'), { ...lx, elev: 2.24, fields: LFIELDS });
reg('applique', 'Éclairage', 'Applique murale', 0.12, 0.12, 0.2, 35, [], fixture('applique'), { ...lx, elev: 1.9, fields: [...LFIELDS, TFIELD] });
reg('projecteur', 'Éclairage', 'Projecteur', 0.14, 0.26, 0.14, 45, [], fixture('projecteur'), { ...lx, elev: 2.3, fields: [...LFIELDS, { ...TFIELD, def: 40 }] });
reg('potelet', 'Éclairage', 'Potelet extérieur', 0.14, 0.14, 0.62, 59, [], fixture('potelet'), { ...lx, fields: LFIELDS });
reg('suspension', 'Éclairage', 'Suspension', 0.44, 0.44, 0.2, 59, [['Abat-jour', '#f1ead8']], fixture('suspension'), { ...lx, elev: 1.85, fields: LFIELDS });

// ======================= CATALOGUE ÉTENDU =======================================================
const FAB = '#9aa5a8', DARK = '#2e3338', OAK = '#c8a57a', WALNUT = '#7a5638';
// ---------- Chambre ----------
reg('lit70', 'Chambre', 'Lit enfant 70×140', 0.78, 1.45, 0.7, 99, bedColors, bed, { anim: 'Défaire / refaire le lit', fin: 'bois' });
reg('coiffeuse', 'Chambre', 'Coiffeuse avec miroir', 1.0, 0.45, 1.5, 149, [['Corps', WHITE], ['Pieds', OAK]], (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1), lm = K.m(p.c2, { r: 0.5 });
  K.box(w, 0.03, d, bm, 0, 0.74, 0); K.legs(w, d, 0.73, 0.022, lm, 0.04);
  K.box(w * 0.4, 0.14, d - 0.05, bm, w * 0.28, 0.65, 0);
  K.drawer(w * 0.4 - 0.02, 0.12, d - 0.1, bm, w * 0.28, 0.585, d / 2 - 0.03, g, { travel: 0.3 });
  const mr = K.m('#dfe8ec', { r: 0.05, m: 0.6 }); K.rbox(w * 0.7, h - 0.9, 0.02, 0.01, bm, 0, 0.78 + (h - 0.9) / 2 + 0.02, -d / 2 + 0.03);
  K.box(w * 0.7 - 0.06, h - 0.96, 0.006, mr, 0, 0.78 + (h - 0.9) / 2 + 0.02, -d / 2 + 0.045);
  K.rbox(0.42, 0.07, 0.34, 0.03, K.m('#d6a69a', { r: 0.9 }), -w * 0.18, 0.43, d * 0.35);
}, { anim: 'Ouvrir le tiroir' });
reg('banc_lit', 'Chambre', 'Banc de bout de lit', 1.2, 0.4, 0.45, 69, [['Assise', '#9db4c0'], ['Pieds', WALNUT]], (g, p, K) => {
  K.legs(p.w, p.d, p.h - 0.1, 0.02, K.m(p.c2, { r: 0.5 }), 0.05); K.rbox(p.w, 0.1, p.d, 0.04, K.m(p.c1, { r: 0.9 }), 0, p.h - 0.05, 0);
});
reg('armoire_coulissante', 'Chambre', 'Armoire portes coulissantes', 2.0, 0.62, 2.3, 399, [['Corps', WHITE], ['Portes', '#c9c2b4']], (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1), dm = K.body(p.c2);
  K.carcass(w, h, d - 0.03, bm, 0, 0, -0.015, g, 0.02);
  const n = 2, pw = w / n + 0.02;
  for (let i = 0; i < n; i++) {
    const pv = K.piv((i ? 1 : -1) * (w / 4), 0.02, d / 2 - 0.02 - (i ? 0.025 : 0));
    K.box(pw - 0.01, h - 0.04, 0.02, dm, 0, (h - 0.04) / 2, 0, pv); K.box(0.012, 0.5, 0.012, K.inox(), (i ? -1 : 1) * (pw / 2 - 0.05), 1.0, 0.014, pv);
    K.add(pv, { slide: [(i ? 1 : -1) * (w / 2 - 0.04), 0, 0] });
  }
}, { anim: 'Ouvrir les portes', fin: 'mat' });
// ---------- Salon ----------
reg('pouf', 'Salon', 'Pouf', 0.5, 0.5, 0.4, 49, [['Tissu', '#d6a69a']], (g, p, K) => {
  const t = K.cyl(0.5, 0.48, 1, K.m(p.c1, { r: 0.95 }), 0, p.h / 2, 0, null, 36); t.scale.set(p.w, p.h, p.d);
}, { fin: null });
reg('gueridon', 'Salon', 'Table d\'appoint ronde', 0.5, 0.5, 0.55, 59, [['Plateau', WHITE], ['Pied', '#c9a24b']], (g, p, K) => {
  const t = K.cyl(0.5, 0.5, 0.03, K.body(p.c1), 0, p.h - 0.015, 0, null, 40); t.scale.set(p.w, 1, p.d);
  K.cyl(0.015, 0.015, p.h - 0.03, K.m(p.c2, { m: 0.8, r: 0.3 }), 0, (p.h - 0.03) / 2, 0, null, 8); const b = K.cyl(0.5, 0.5, 0.015, K.m(p.c2, { m: 0.8, r: 0.3 }), 0, 0.0075, 0, null, 32); b.scale.set(p.w * 0.6, 1, p.d * 0.6);
});
reg('console', 'Salon', 'Console d\'entrée', 1.0, 0.3, 0.8, 99, [['Plateau', WOOD], ['Structure', ANTH]], (g, p, K) => {
  K.box(p.w, 0.03, p.d, K.body(p.c1), 0, p.h - 0.015, 0); K.box(p.w - 0.1, 0.02, p.d - 0.06, K.body(p.c1), 0, 0.22, 0); K.legs(p.w, p.d, p.h - 0.03, 0.015, K.m(p.c2, { m: 0.5, r: 0.4 }), 0.04);
}, { fin: 'bois' });
reg('etagere_cubes', 'Salon', 'Étagère à cubes 4×4', 1.5, 0.39, 1.5, 149, [['Corps', WHITE], ['Casiers', '#9db4c0']], (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1), n = 4, th = 0.018, cw = (w - th) / n, ch = (h - th) / n;
  for (let i = 0; i <= n; i++) { K.box(w, th, d, bm, 0, i * ch + th / 2, 0); K.box(th, h, d, bm, -w / 2 + th / 2 + i * cw, h / 2, 0); }
  K.box(w, h, 0.006, bm, 0, h / 2, -d / 2 + 0.003);
  [[1, 2], [2, 0], [0, 3], [3, 1]].forEach(([cx, cy]) => K.box(cw - th - 0.01, ch - th - 0.01, 0.34, K.m(p.c2, { r: 0.85 }), -w / 2 + th + cw * cx + cw / 2 - 0.005, cy * ch + th + (ch - th) / 2, 0.0));
}, { fin: 'mat' });
reg('poele', 'Salon', 'Poêle à bois', 0.5, 0.45, 1.1, 899, [['Corps', '#1b1c1f'], ['Vitre', '#ffb26b']], (g, p, K) => {
  const { w, d, h } = p, bm = K.m(p.c1, { r: 0.5, m: 0.5 });
  K.box(w, h * 0.78, d, bm, 0, 0.12 + h * 0.39 * 0.8, 0); K.legs(w, d, 0.12, 0.02, bm, 0.05);
  K.box(w * 0.58, h * 0.32, 0.01, K.m(p.c2, { r: 0.3, em: 0.4 }), 0, 0.12 + h * 0.3, d / 2 + 0.003);
  K.cyl(0.07, 0.07, 1.4, bm, 0, h * 0.8 + 0.12 + 0.7, -0.05, null, 16);
}, { fin: null });
// ---------- Salle à manger / cuisine ----------
reg('banc', 'Salle à manger', 'Banc', 1.4, 0.35, 0.45, 69, [['Assise', WOOD], ['Pieds', ANTH]], (g, p, K) => {
  K.box(p.w, 0.04, p.d, K.body(p.c1), 0, p.h - 0.02, 0); K.legs(p.w, p.d, p.h - 0.04, 0.022, K.m(p.c2, { m: 0.4, r: 0.4 }), 0.06);
}, { fin: 'bois' });
reg('vaisselier', 'Salle à manger', 'Vaisselier vitré', 1.2, 0.45, 1.9, 299, [['Corps', '#e9e6df'], ['Poignées', '#c9a24b']], (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1), hm = K.m(p.c2, { m: 0.8, r: 0.3 });
  K.carcass(w, h, d, bm, 0, 0, 0, g, 0.02); K.box(w - 0.04, 0.02, d - 0.02, bm, 0, 0.9, 0); K.box(w - 0.04, 0.02, d - 0.04, bm, 0, 1.3, 0);
  K.cdoor(w / 2 - 0.004, 0.86, bm, -w / 4, 0.02, d / 2 - 0.0, 1, g, { hm }); K.cdoor(w / 2 - 0.004, 0.86, bm, w / 4, 0.02, d / 2, -1, g, { hm });
  K.cdoor(w / 2 - 0.004, 0.84, K.glass(), -w / 4, 1.05, d / 2, 1, g, { hm }); K.cdoor(w / 2 - 0.004, 0.84, K.glass(), w / 4, 1.05, d / 2, -1, g, { hm });
}, { anim: 'Ouvrir les portes', fin: 'mat' });
reg('ilot', 'Cuisine', 'Îlot central', 1.8, 0.9, 0.92, 799, [['Caissons', '#8fa6b8'], ['Plan', '#e8e4dc']], (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1);
  K.box(w, h - 0.06, d - 0.1, bm, 0, (h - 0.06) / 2 + 0.03, -0.03); K.box(w, 0.06, d, wt(K, p), 0, h - 0.03, 0.0);
  K.box(w, 0.03, d - 0.14, K.m('#1b1c1f'), 0, 0.015, -0.03);
  for (let i = 0; i < 3; i++) K.drawer(w / 3 - 0.02, 0.26, 0.5, bm, -w / 3 + i * (w / 3), 0.08 + 0.0, d / 2 - 0.08, g, { travel: 0.3 });
}, { anim: 'Ouvrir les tiroirs' });
reg('colonne_four', 'Cuisine', 'Colonne four + micro-ondes', 0.6, 0.6, 2.1, 499, [['Façades', '#e9e6df']], (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1);
  K.carcass(w, h, d, bm, 0, 0, 0, g, 0.018); K.box(w - 0.04, 0.5, d - 0.04, bm, 0, 0.26, 0);
  K.box(w - 0.02, 0.58, 0.02, bm, 0, 0.29, d / 2 - 0.01);
  K.box(w - 0.1, 0.45, 0.02, K.black(), 0, 1.0, d / 2 - 0.01); K.box(w - 0.14, 0.3, 0.012, K.glass(), 0, 1.0, d / 2 + 0.003);
  K.box(w - 0.1, 0.28, 0.02, K.black(), 0, 1.5, d / 2 - 0.01); K.box(w - 0.14, 0.18, 0.012, K.glass(), 0, 1.5, d / 2 + 0.003);
  K.box(w - 0.02, 0.3, 0.02, bm, 0, 1.92, d / 2 - 0.01);
}, { fin: 'mat' });
// ---------- Bureau ----------
reg('bureau_debout', 'Bureau', 'Bureau assis-debout', 1.4, 0.7, 1.0, 399, [['Plateau', OAK], ['Structure', '#1b1c1f']], (g, p, K) => {
  const { w, d, h } = p, lm = K.m(p.c2, { m: 0.5, r: 0.4 });
  K.box(w, 0.03, d, K.body(p.c1), 0, h - 0.015, 0); for (const sx of [-1, 1]) { K.box(0.06, h - 0.03, 0.06, lm, sx * (w / 2 - 0.12), (h - 0.03) / 2, 0); K.box(0.06, 0.04, d - 0.1, lm, sx * (w / 2 - 0.12), 0.02, 0); }
  K.box(w - 0.2, 0.05, 0.05, lm, 0, h - 0.06, -d / 2 + 0.1);
}, { fin: 'bois' });
reg('etagere_livres', 'Bureau', 'Bibliothèque basse', 1.2, 0.3, 0.8, 129, [['Corps', WALNUT]], (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1), th = 0.018; K.carcass(w, h, d, bm, 0, 0, 0, g, th);
  for (let i = 1; i < 3; i++) K.box(w - 2 * th, th, d - 0.02, bm, 0, (h * i) / 3, 0);
  const cols = ['#c97b63', '#4f7a55', '#d9b44a', '#6d8fa3', '#8a5a3c'];
  for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) K.box(0.03 + (k % 3) * 0.008, h / 3 - 0.07 - (k % 2) * 0.03, d - 0.1, K.m(cols[(r + k) % 5], { r: 0.8 }), -w / 2 + 0.1 + k * 0.045 + r * 0.02, (h * r) / 3 + th + (h / 3 - 0.07 - (k % 2) * 0.03) / 2, 0);
}, { fin: 'bois' });
// ---------- Salle de bain ----------
reg('double_vasque', 'Salle de bain', 'Meuble double vasque', 1.4, 0.5, 0.85, 449, [['Meuble', '#8fa6b8'], ['Vasques', '#ffffff']], (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1), wm = K.m(p.c2, { r: 0.12 });
  K.box(w, h - 0.12, d, bm, 0, (h - 0.12) / 2 + 0.0, 0); K.box(w + 0.02, 0.04, d + 0.02, K.m('#e8e4dc', { r: 0.3 }), 0, h - 0.02, 0);
  for (const sx of [-1, 1]) { K.rbox(0.44, 0.1, 0.36, 0.05, wm, sx * w * 0.25, h + 0.02, 0.0); K.cyl(0.012, 0.012, 0.14, K.inox(), sx * w * 0.25, h + 0.09, -d * 0.3, null, 10); K.drawer(w / 2 - 0.03, 0.4, d - 0.08, bm, sx * w * 0.25, 0.12, d / 2 - 0.0, g, { travel: 0.35 }); }
}, { anim: 'Ouvrir les tiroirs' });
reg('meuble_colonne', 'Salle de bain', 'Colonne de salle de bain', 0.35, 0.3, 1.7, 159, [['Corps', WHITE]], (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1); K.carcass(w, h, d, bm, 0, 0, 0, g, 0.016);
  for (let i = 1; i < 4; i++) K.box(w - 0.03, 0.016, d - 0.02, bm, 0, (h * i) / 4, 0);
  K.cdoor(w - 0.004, h / 2 - 0.01, bm, 0, 0.01, d / 2, 1, g); K.cdoor(w - 0.004, h / 2 - 0.03, bm, 0, h / 2 + 0.01, d / 2, 1, g);
}, { anim: 'Ouvrir les portes' });
reg('baignoire_ilot', 'Salle de bain', 'Baignoire îlot', 0.8, 1.7, 0.6, 1290, [['Cuve', '#ffffff']], (g, p, K) => {
  const wm = K.m(p.c1, { r: 0.1 }); const o = K.cyl(0.5, 0.42, p.h, wm, 0, p.h / 2, 0, null, 40); o.scale.set(p.w, 1, p.d); const w2 = K.cyl(0.5, 0.42, 0.02, K.m('#bfe2f2', { r: 0.05, op: 0.6 }), 0, p.h - 0.1, 0, null, 40); w2.scale.set(p.w * 0.84, 1, p.d * 0.88);
  K.cyl(0.015, 0.015, 0.8, K.inox(), 0, 0.4, -p.d * 0.35, null, 8);
}, { fin: null });
reg('douche_ital', 'Salle de bain', 'Douche à l\'italienne', 1.2, 0.9, 2.0, 549, [['Receveur', '#cfd2d4']], (g, p, K) => {
  const { w, d, h } = p; K.box(w, 0.02, d, K.m(p.c1, { r: 0.6 }), 0, 0.01, 0); K.box(0.01, h, d * 0.9, K.glass(), -w / 2 + 0.005, h / 2, 0); K.box(w * 0.8, h, 0.01, K.glass(), 0.0, h / 2, d / 2 - 0.005);
  K.cyl(0.012, 0.012, 1.1, K.inox(), w / 2 - 0.05, 1.5, -d / 2 + 0.05, null, 8); K.cyl(0.11, 0.11, 0.012, K.inox(), w / 2 - 0.05, 2.0, -d / 2 + 0.12, null, 20);
}, { fin: null });
// ---------- Déco ----------
reg('miroir_rond', 'Déco', 'Miroir rond', 0.7, 0.04, 0.7, 59, [['Cadre', '#c9a24b']], (g, p, K) => {
  const t = K.cyl(0.5, 0.5, 0.03, K.m(p.c1, { m: 0.8, r: 0.3 }), 0, p.h / 2, 0, null, 48); t.scale.set(p.w, 1, p.h); t.rotation.x = Math.PI / 2;
  const m2 = K.cyl(0.47, 0.47, 0.006, K.m('#dfe8ec', { r: 0.05, m: 0.7 }), 0, p.h / 2, 0.012, null, 48); m2.scale.set(p.w, 1, p.h); m2.rotation.x = Math.PI / 2;
}, { elev: 1.1, fin: null });
reg('cadres', 'Déco', 'Trois cadres', 1.0, 0.03, 0.5, 49, [['Cadres', '#2e3338'], ['Images', '#8fa6b8']], (g, p, K) => {
  for (let i = 0; i < 3; i++) { const w = p.w / 3 - 0.03, x = -p.w / 3 + i * (p.w / 3); K.box(w, p.h * (i === 1 ? 1 : 0.8), p.d, K.m(p.c1, { r: 0.6 }), x, p.h / 2, 0); K.box(w - 0.04, p.h * (i === 1 ? 1 : 0.8) - 0.04, 0.004, K.m(tone(p.c2, (i - 1) * 0.25), { r: 0.9 }), x, p.h / 2, p.d / 2 + 0.001); }
}, { elev: 1.4, fin: null });
reg('vase', 'Déco', 'Vase avec fleurs', 0.25, 0.25, 0.7, 29, [['Vase', '#d9c3a5'], ['Fleurs', '#c97b63']], (g, p, K) => {
  K.cyl(0.35 * p.w, 0.28 * p.w, p.h * 0.4, K.m(p.c1, { r: 0.3 }), 0, p.h * 0.2, 0, null, 24);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.283, r = 0.1 * p.w * 2; K.cyl(0.004, 0.004, p.h * 0.5, K.m('#4f7a55'), Math.cos(a) * r * 0.5, p.h * 0.62, Math.sin(a) * r * 0.5, null, 5); K.sph(0.05, K.m(p.c2, { r: 0.8 }), Math.cos(a) * r, p.h * 0.88, Math.sin(a) * r); }
}, { fin: null });
reg('rideau', 'Déco', 'Rideau', 1.6, 0.12, 2.4, 79, [['Tissu', '#e8dccb']], (g, p, K) => {
  const n = 14, mt = K.m(p.c1, { r: 0.95 }); for (let i = 0; i < n; i++) K.box(p.w / n + 0.01, p.h, 0.04, mt, -p.w / 2 + (i + 0.5) * (p.w / n), p.h / 2, (i % 2) * 0.04 - 0.02);
  K.cyl(0.012, 0.012, p.w + 0.1, K.m('#c9a24b', { m: 0.8 }), 0, p.h + 0.02, 0, null, 8).rotation.z = Math.PI / 2;
}, { fin: null });
// ---------- Extérieur ----------
reg('table_jardin', 'Extérieur', 'Table de jardin', 1.6, 0.9, 0.74, 189, [['Plateau', '#8a5a3c'], ['Pieds', '#2e3338']], (g, p, K) => {
  K.box(p.w, 0.04, p.d, K.body(p.c1), 0, p.h - 0.02, 0); K.legs(p.w, p.d, p.h - 0.04, 0.03, K.m(p.c2, { m: 0.5, r: 0.5 }), 0.07);
}, { fin: 'bois' });
reg('chaise_jardin', 'Extérieur', 'Chaise de jardin', 0.55, 0.58, 0.85, 59, [['Assise', '#4b5359'], ['Pieds', '#2e3338']], (g, p, K) => {
  const lm = K.m(p.c2, { m: 0.5, r: 0.5 }), sh = p.h * 0.52; K.legs(p.w, p.d * 0.9, sh, 0.017, lm, 0.04); K.box(p.w, 0.03, p.d * 0.9, K.m(p.c1, { r: 0.8 }), 0, sh, 0.02);
  for (const sx of [-1, 1]) K.box(0.025, p.h - sh, 0.025, lm, sx * (p.w / 2 - 0.04), sh + (p.h - sh) / 2, -p.d * 0.4); K.rbox(p.w - 0.06, 0.28, 0.025, 0.01, K.m(p.c1, { r: 0.8 }), 0, p.h - 0.2, -p.d * 0.4);
});
reg('transat', 'Extérieur', 'Transat', 0.6, 1.6, 0.85, 129, [['Toile', '#d9c3a5'], ['Structure', '#8a5a3c']], (g, p, K) => {
  const lm = K.m(p.c2, { r: 0.6 }), tm = K.m(p.c1, { r: 0.95 }); for (const sx of [-1, 1]) { K.box(0.03, 0.03, p.d * 0.95, lm, sx * (p.w / 2 - 0.02), 0.3, 0); K.box(0.03, 0.4, 0.03, lm, sx * (p.w / 2 - 0.02), 0.15, p.d * 0.35); K.box(0.03, 0.4, 0.03, lm, sx * (p.w / 2 - 0.02), 0.15, -p.d * 0.35); }
  K.box(p.w - 0.1, 0.03, p.d * 0.55, tm, 0, 0.34, p.d * 0.2); const b = K.box(p.w - 0.1, 0.03, p.d * 0.4, tm, 0, 0.55, -p.d * 0.33); b.rotation.x = 0.7;
});
reg('parasol', 'Extérieur', 'Parasol', 2.6, 2.6, 2.5, 189, [['Toile', '#e8dccb'], ['Mât', '#2e3338']], (g, p, K) => {
  K.cyl(0.02, 0.025, p.h, K.m(p.c2, { m: 0.5, r: 0.5 }), 0, p.h / 2, 0, null, 10); K.cyl(0.25, 0.25, 0.05, K.m('#8d8b86', { r: 0.8 }), 0, 0.025, 0, null, 20);
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.4, 16, 1, true), K.m(p.c1, { r: 0.9 })); c.material = K.m(p.c1, { r: 0.9 }); c.scale.set(p.w, p.h * 0.18, p.d); c.position.set(0, p.h - 0.2 * p.h * 0.18 * 1.2, 0); c.castShadow = true; g.add(c);
}, { fin: null });
reg('barbecue', 'Extérieur', 'Barbecue', 1.2, 0.6, 1.05, 249, [['Corps', '#1b1c1f'], ['Plan', '#8a5a3c']], (g, p, K) => {
  const bm = K.m(p.c1, { r: 0.5, m: 0.5 }); K.box(p.w * 0.6, 0.35, p.d, bm, -p.w * 0.2, 0.7, 0); K.legs(p.w * 0.6, p.d, 0.55, 0.02, bm, 0.05); const s = K.cyl(0.5, 0.5, 0.2, bm, -p.w * 0.2, 0.95, 0, null, 24); s.scale.set(p.w * 0.55, 1, p.d * 0.85);
  K.box(p.w * 0.3, 0.03, p.d, K.m(p.c2, { r: 0.7 }), p.w * 0.32, 0.8, 0); K.box(p.w * 0.3, 0.3, p.d - 0.05, bm, p.w * 0.32, 0.6, 0);
}, { fin: null });
reg('arbre', 'Extérieur', 'Arbre', 2.5, 2.5, 4.0, 0, [['Feuillage', '#4f7a55'], ['Tronc', '#5a4636']], (g, p, K) => {
  K.cyl(0.05 * p.w / 2.5 * 1.5, 0.09 * p.w / 2.5 * 1.5, p.h * 0.45, K.m(p.c2, { r: 0.9 }), 0, p.h * 0.225, 0, null, 10);
  const lm = K.m(p.c1, { r: 0.9 }); [[0, 0.68, 0, 0.4], [0.25, 0.58, 0.1, 0.28], [-0.25, 0.6, -0.1, 0.3], [0.05, 0.85, 0.05, 0.28], [-0.1, 0.55, 0.25, 0.26]].forEach(([x, y, z, r]) => K.sph(r * p.w, lm, x * p.w, y * p.h, z * p.w, null, 1, p.h / p.w * 0.45, 1));
}, { fin: null });
reg('haie', 'Extérieur', 'Haie', 3.0, 0.6, 1.4, 0, [['Feuillage', '#4f7a55']], (g, p, K) => {
  K.rbox(p.w, p.h, p.d, 0.15, K.m(p.c1, { r: 0.95 }), 0, p.h / 2, 0);
}, { fin: null });
reg('piscine', 'Extérieur', 'Piscine', 6.0, 3.0, 0.3, 0, [['Eau', '#6fb7d6'], ['Margelle', '#e8e4dc']], (g, p, K) => {
  K.box(p.w + 0.5, 0.05, p.d + 0.5, K.m(p.c2, { r: 0.8 }), 0, 0.025, 0); K.box(p.w, 0.06, p.d, K.m(p.c1, { r: 0.05, op: 0.8 }), 0, 0.06, 0);
}, { fin: null, lock: false });
reg('pergola', 'Extérieur', 'Pergola', 3.0, 3.0, 2.5, 899, [['Structure', '#4b5359'], ['Lames', '#8a5a3c']], (g, p, K) => {
  const lm = K.m(p.c1, { m: 0.4, r: 0.5 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(0.1, p.h, 0.1, lm, sx * (p.w / 2 - 0.05), p.h / 2, sz * (p.d / 2 - 0.05));
  K.box(p.w, 0.1, 0.1, lm, 0, p.h - 0.05, p.d / 2 - 0.05); K.box(p.w, 0.1, 0.1, lm, 0, p.h - 0.05, -p.d / 2 + 0.05);
  const n = 12; for (let i = 0; i < n; i++) K.box(p.w - 0.1, 0.05, 0.06, K.m(p.c2, { r: 0.7 }), 0, p.h - 0.12, -p.d / 2 + 0.15 + (i * (p.d - 0.3)) / (n - 1));
}, { fin: null });
reg('abri_jardin', 'Extérieur', 'Abri de jardin', 2.0, 1.6, 2.2, 599, [['Murs', '#8a5a3c'], ['Toit', '#4b5359']], (g, p, K) => {
  K.box(p.w, p.h - 0.2, p.d, K.m(p.c1, { r: 0.8, map: 'bois' }), 0, (p.h - 0.2) / 2, 0); K.box(p.w + 0.2, 0.08, p.d + 0.2, K.m(p.c2, { r: 0.7 }), 0, p.h - 0.1, 0);
  K.box(0.7, 1.7, 0.03, K.m(tone(p.c1, -0.2), { r: 0.8 }), 0, 0.85, p.d / 2 + 0.005);
}, { fin: null });

// ---------- Éclairage supplémentaire ----------
reg('lampe_poser', 'Éclairage', 'Lampe à poser', 0.25, 0.25, 0.45, 49, [['Abat-jour', '#f1ead8']], fixture('lampe'), { ...lx, fields: LFIELDS });
reg('lustre', 'Éclairage', 'Lustre à 5 branches', 0.7, 0.7, 0.5, 149, [], fixture('lustre'), { ...lx, elev: 2.0, fields: LFIELDS });
reg('rail', 'Éclairage', 'Rail de 3 spots', 1.0, 0.1, 0.12, 79, [], fixture('rail'), { ...lx, elev: 2.3, fields: [...LFIELDS, { ...TFIELD, def: 30 }] });
reg('lanterne', 'Éclairage', 'Lanterne murale extérieure', 0.18, 0.2, 0.3, 45, [], fixture('lanterne'), { ...lx, elev: 2.0, fields: LFIELDS });
reg('liseuse', 'Éclairage', 'Liseuse de chevet', 0.1, 0.25, 0.1, 35, [], fixture('liseuse'), { ...lx, elev: 1.2, fields: [...LFIELDS, TFIELD] });
reg('lampadaire_arc', 'Éclairage', 'Lampadaire arc', 0.5, 1.6, 2.1, 189, [], fixture('arc'), { ...lx, fields: LFIELDS });

// ======================= CATALOGUE ÉTENDU (2) : rangements génériques, cuisine, entrée, enfant… ====
// élément de rangement générique : n portes et/ou tiroirs, avec ou sans pieds
const unit = (o = {}) => (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1), hm = K.m(p.c2, { m: 0.7, r: 0.3 }), lg = o.legs ?? 0, th = 0.018, dr = o.drawers || 0, nd = o.doors || 0;
  if (lg) K.legs(w, d, lg, 0.02, K.m(p.c2, { r: 0.5 }), 0.05, g);
  K.carcass(w, h - lg, d, bm, 0, lg, 0, g, th);
  const bodyH = h - lg - 2 * th; let y = lg + th;
  const drH = dr ? bodyH * (o.drawerFrac ?? (nd ? 0.45 : 1)) / dr : 0;
  for (let i = 0; i < dr; i++) { K.drawer(w - 2 * th - 0.004, drH - 0.01, d - 0.08, bm, 0, y + 0.005, d / 2, g, { hm, travel: 0.3 }); y += drH; }
  const rest = lg + th + bodyH - y;
  if (nd && rest > 0.1) { const dw = (w - 2 * th - 0.004) / nd; for (let i = 0; i < nd; i++) K.cdoor(dw, rest - 0.006, o.glass ? K.glass() : bm, -w / 2 + th + (i + 0.5) * dw + 0.002, y + 0.003, d / 2, nd === 1 ? 1 : i < nd / 2 ? 1 : -1, g, { hm }); }
  else if (!dr) for (let i = 1; i <= (o.shelves ?? 3); i++) K.box(w - 2 * th, th, d - 0.02, bm, 0, lg + (h - lg) * i / ((o.shelves ?? 3) + 1), 0, g);
  if (o.shelves && nd) for (let i = 1; i <= o.shelves; i++) K.box(w - 2 * th, th, d - 0.04, bm, 0, y + (rest * i) / (o.shelves + 1), -0.01, g);
};
const stCols = [['Corps', WHITE], ['Poignées', '#c3c8cd']];
const woodCols = [['Corps', WOOD], ['Poignées', '#2e3338']];
const A_P = { anim: 'Ouvrir les portes' }, A_T = { anim: 'Ouvrir les tiroirs' };
// ---------- Chambre ----------
reg('commode6', 'Chambre', 'Commode 6 tiroirs', 1.4, 0.5, 0.78, 249, stCols, unit({ drawers: 6, legs: 0.08 }), A_T);
reg('chiffonnier', 'Chambre', 'Chiffonnier 5 tiroirs', 0.7, 0.45, 1.3, 189, stCols, unit({ drawers: 5, legs: 0.08 }), A_T);
reg('chevet_susp', 'Chambre', 'Chevet suspendu', 0.4, 0.3, 0.25, 39, woodCols, unit({ drawers: 1 }), { ...A_T, elev: 0.45 });
reg('dressing_ouvert', 'Chambre', 'Dressing ouvert', 1.6, 0.55, 2.0, 229, [['Corps', WHITE], ['Penderie', '#c3c8cd']], (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1), th = 0.02;
  K.box(th, h, d, bm, -w / 2 + th / 2, h / 2, 0); K.box(th, h, d, bm, w / 2 - th / 2, h / 2, 0); K.box(th, h, d, bm, 0, h / 2, 0); K.box(w, th, d, bm, 0, h - th / 2, 0); K.box(w, th, d, bm, 0, 0.1, 0);
  K.cyl(0.012, 0.012, w / 2 - 0.05, K.m(p.c2, { m: 0.8, r: 0.3 }), -w / 4, h - 0.25, 0, null, 8).rotation.z = Math.PI / 2;
  for (let i = 0; i < 4; i++) K.box(w / 2 - 0.05, th, d - 0.04, bm, w / 4, 0.3 + i * 0.4, 0);
  for (let i = 0; i < 5; i++) K.box(0.4, 0.5, 0.012, K.m(['#c97b63', '#9db4c0', '#e8dccb', '#4f7a55', '#d9b44a'][i], { r: 0.95 }), -w / 4 + (i - 2) * 0.1, h - 0.55, 0);
});
reg('tete_de_lit', 'Chambre', 'Tête de lit capitonnée', 1.8, 0.1, 1.2, 149, [['Tissu', '#9aa5a8']], (g, p, K) => {
  const mt = K.m(p.c1, { r: 0.95 }); for (let i = 0; i < 4; i++) K.rbox(p.w / 4 - 0.01, p.h, p.d, 0.03, mt, -p.w * 3 / 8 + i * (p.w / 4), p.h / 2, 0);
}, { elev: 0.3, fin: null });
// ---------- Enfant ----------
reg('lit_cabane', 'Enfant', 'Lit cabane', 1.0, 2.0, 1.6, 299, [['Bois', '#e8dccb'], ['Linge', '#d6a69a']], (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1); K.box(w, 0.15, d, bm, 0, 0.2, 0); K.rbox(w - 0.06, 0.18, d - 0.1, 0.05, K.m('#f3f1ec', { r: 0.9 }), 0, 0.37, 0); K.rbox(0.5, 0.12, 0.35, 0.05, K.m(p.c2, { r: 0.95 }), 0, 0.5, -d / 2 + 0.3);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(0.05, h - 0.1, 0.05, bm, sx * (w / 2 - 0.03), (h - 0.1) / 2 + 0.05, sz * (d / 2 - 0.03));
  for (const sz of [-1, 1]) { const r = K.box(w * 0.62, 0.05, 0.05, bm, -w / 4 + 0.0, h - 0.3, sz * (d / 2 - 0.03)); r.rotation.z = 0.9; const r2 = K.box(w * 0.62, 0.05, 0.05, bm, w / 4, h - 0.3, sz * (d / 2 - 0.03)); r2.rotation.z = -0.9; }
}, { fin: 'bois' });
reg('bureau_enfant', 'Enfant', 'Bureau enfant', 1.0, 0.55, 0.62, 99, [['Plateau', WHITE], ['Pieds', '#9db4c0']], (g, p, K) => { K.box(p.w, 0.03, p.d, K.body(p.c1), 0, p.h - 0.015, 0); K.legs(p.w, p.d, p.h - 0.03, 0.025, K.m(p.c2, { r: 0.6 }), 0.05); });
reg('rangement_jouets', 'Enfant', 'Rangement à bacs', 1.0, 0.4, 0.7, 129, [['Cadre', WHITE], ['Bacs', '#d9b44a']], (g, p, K) => {
  const { w, d, h } = p, bm = K.body(p.c1), cols = ['#d9b44a', '#6d8fa3', '#c97b63', '#7d9a7a']; K.carcass(w, h, d, bm, 0, 0, 0, g, 0.018); K.box(0.018, h, d - 0.02, bm, 0, h / 2, 0);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) K.drawer(w / 2 - 0.03, h / 2 - 0.03, d - 0.06, K.m(cols[r * 2 + c], { r: 0.7 }), (c ? 1 : -1) * w / 4, r * h / 2 + 0.02, d / 2, g, { travel: 0.25, nohandle: true, tray: K.m(cols[r * 2 + c], { r: 0.7 }) });
}, A_T);
reg('tipi', 'Enfant', 'Tipi de jeu', 1.1, 1.1, 1.4, 79, [['Toile', '#f1ead8'], ['Mâts', '#c8a57a']], (g, p, K) => {
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 4, 1, true), K.m(p.c1, { r: 0.95 })); c.scale.set(p.w * 1.35, p.h, p.d * 1.35); c.position.y = p.h / 2; c.rotation.y = Math.PI / 4; c.castShadow = true; g.add(c);
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2, m = K.cyl(0.012, 0.012, p.h * 1.08, K.m(p.c2), Math.cos(a) * p.w * 0.25, p.h / 2, Math.sin(a) * p.d * 0.25, null, 6); m.rotation.z = Math.cos(a) * 0.38; m.rotation.x = -Math.sin(a) * 0.38; }
}, { fin: null });
// ---------- Salon ----------
reg('fauteuil_coque', 'Salon', 'Fauteuil coque', 0.8, 0.8, 0.85, 249, [['Coque', '#d6a69a'], ['Pied', '#c8a57a']], (g, p, K) => {
  const s = K.sph(0.5, K.m(p.c1, { r: 0.8 }), 0, 0.5, 0, null, p.w * 0.9, p.h * 0.55, p.d * 0.9); K.rbox(p.w * 0.75, 0.12, p.d * 0.6, 0.05, K.m(tone(p.c1, 0.2), { r: 0.95 }), 0, 0.42, 0.06); void s;
  K.cyl(0.03, 0.05, 0.25, K.m(p.c2, { r: 0.5 }), 0, 0.125, 0, null, 12); K.cyl(0.25, 0.28, 0.03, K.m(p.c2, { r: 0.5 }), 0, 0.015, 0, null, 24);
}, { fin: null });
reg('bergere', 'Salon', 'Bergère', 0.78, 0.82, 1.0, 279, sofaCols, (g, p, K) => { sofaParts(g, p, K, {}); const b = K.rbox(p.w - 0.1, 0.35, 0.1, 0.05, K.m(p.c1, { r: 0.95 }), 0, 0.95, -p.d / 2 + 0.1); b.rotation.x = -0.1; }, { fin: null });
reg('chauffeuse', 'Salon', 'Chauffeuse', 0.75, 0.85, 0.8, 149, sofaCols, sofa);
reg('table_basse_carree', 'Salon', 'Table basse carrée', 0.8, 0.8, 0.38, 99, [['Plateau', WHITE], ['Pieds', '#2e3338']], (g, p, K) => { K.box(p.w, 0.04, p.d, K.body(p.c1), 0, p.h - 0.02, 0); K.box(p.w - 0.1, 0.02, p.d - 0.1, K.body(p.c1), 0, 0.12, 0); K.legs(p.w, p.d, p.h - 0.04, 0.015, K.m(p.c2, { m: 0.5, r: 0.4 }), 0.04); });
reg('enfilade', 'Salon', 'Enfilade basse', 1.8, 0.4, 0.55, 229, woodCols, unit({ doors: 3, drawers: 0, legs: 0.12 }), A_P);
reg('meuble_tv_tiroirs', 'Salon', 'Meuble TV 2 tiroirs', 1.5, 0.4, 0.45, 159, woodCols, unit({ drawers: 2, legs: 0.1 }), A_T);
reg('biblio_haute', 'Salon', 'Bibliothèque haute 5 niveaux', 0.8, 0.3, 2.0, 119, stCols, unit({ shelves: 4 }));
reg('vitrine_salon', 'Salon', 'Vitrine', 0.8, 0.4, 1.8, 279, [['Corps', '#2e3338'], ['Poignées', '#c9a24b']], unit({ doors: 2, glass: true, shelves: 3, drawers: 1, drawerFrac: 0.25 }), A_P);
reg('etagere_murale', 'Salon', 'Étagères murales (lot de 3)', 0.8, 0.22, 0.6, 39, [['Planches', OAK]], (g, p, K) => { for (let i = 0; i < 3; i++) K.box(p.w, 0.025, p.d, K.body(p.c1), 0, i * p.h / 2 + 0.0125, 0); }, { elev: 1.2, fin: 'bois' });
// ---------- Salle à manger ----------
reg('table_haute', 'Salle à manger', 'Table haute (bar)', 1.2, 0.6, 1.0, 169, [['Plateau', OAK], ['Pieds', '#1b1c1f']], (g, p, K) => { K.box(p.w, 0.035, p.d, K.body(p.c1), 0, p.h - 0.0175, 0); K.legs(p.w, p.d, p.h - 0.035, 0.025, K.m(p.c2, { m: 0.5, r: 0.4 }), 0.06); K.box(p.w - 0.15, 0.02, 0.02, K.m(p.c2), 0, 0.3, 0); }, { fin: 'bois' });
reg('table_extensible', 'Salle à manger', 'Table extensible 2,2 m', 2.2, 1.0, 0.75, 349, [['Plateau', OAK], ['Pieds', ANTH]], (g, p, K) => { K.box(p.w, 0.04, p.d, K.body(p.c1), 0, p.h - 0.02, 0); K.box(0.01, 0.03, p.d - 0.02, K.m('#3a3a3a'), 0, p.h - 0.04, 0); K.legs(p.w, p.d, p.h - 0.04, 0.035, K.m(p.c2, { m: 0.4, r: 0.4 }), 0.08); }, { fin: 'bois' });
reg('chaise_bar', 'Salle à manger', 'Chaise de bar', 0.42, 0.45, 1.0, 79, [['Assise', '#d9c3a5'], ['Pieds', '#1b1c1f']], (g, p, K) => {
  const lm = K.m(p.c2, { m: 0.6, r: 0.4 }), sh = p.h * 0.7; K.legs(p.w, p.d, sh, 0.015, lm, 0.04); K.rbox(p.w, 0.04, p.d, 0.015, K.m(p.c1, { r: 0.8 }), 0, sh + 0.02, 0); K.rbox(p.w - 0.04, 0.2, 0.025, 0.01, K.m(p.c1, { r: 0.8 }), 0, p.h - 0.15, -p.d / 2 + 0.03); K.box(p.w - 0.08, 0.015, 0.015, lm, 0, 0.3, 0);
});
reg('chaise_visiteur', 'Salle à manger', 'Chaise coque', 0.48, 0.52, 0.82, 69, [['Coque', '#9db4c0'], ['Pieds', '#c8a57a']], (g, p, K) => {
  K.legs(p.w, p.d * 0.9, p.h * 0.5, 0.015, K.m(p.c2, { r: 0.5 }), 0.05); K.rbox(p.w, 0.05, p.d * 0.9, 0.025, K.m(p.c1, { r: 0.7 }), 0, p.h * 0.5 + 0.025, 0.02); K.rbox(p.w, p.h * 0.45, 0.05, 0.03, K.m(p.c1, { r: 0.7 }), 0, p.h * 0.75, -p.d * 0.4);
});
// ---------- Cuisine ----------
reg('kbas40', 'Cuisine', 'Meuble bas 40', 0.4, 0.6, 0.85, 69, kCols, kBase(1, false), { anim: 'Ouvrir la porte' });
reg('kbas120', 'Cuisine', 'Meuble bas 120 (4 tiroirs / portes)', 1.2, 0.6, 0.85, 189, kCols, kBase(3, false), A_P);
reg('kbas_four', 'Cuisine', 'Meuble bas pour four', 0.6, 0.6, 0.85, 129, kCols, (g, p, K) => {
  const { w, d } = p, h = 0.85, bm = K.body(p.c1), pl = 0.1;
  K.box(w - 0.04, pl, d - 0.06, K.black(), 0, pl / 2, -0.02); K.carcass(w, h - 0.04 - pl, d - 0.02, bm, 0, pl, -0.01, g, 0.018); K.box(w + 0.002, 0.04, d + 0.02, wt(K, p), 0, h - 0.02, 0);
  K.box(w - 0.06, 0.52, 0.02, K.black(), 0, 0.42, d / 2 - 0.02); K.box(w - 0.12, 0.34, 0.012, K.glass(), 0, 0.42, d / 2 - 0.008); K.box(w - 0.06, 0.02, 0.02, K.inox(), 0, 0.72, d / 2 + 0.0);
}, { fin: 'mat' });
reg('khaut40', 'Cuisine', 'Meuble haut 40', 0.4, 0.35, 0.7, 49, [['Façades', '#e6e2da']], (g, p, K) => { const bm = K.body(p.c1); K.carcass(p.w, p.h, p.d - 0.02, bm, 0, 0, -0.01, g, 0.018); K.cdoor(p.w - 0.004, p.h - 0.01, bm, 0, 0.005, p.d / 2 - 0.01, 1, g, { hy: 0.12, hlen: 0.15 }); }, { elev: 1.45, anim: 'Ouvrir la porte' });
reg('khaut80', 'Cuisine', 'Meuble haut 80', 0.8, 0.35, 0.7, 79, [['Façades', '#e6e2da']], (g, p, K) => { const bm = K.body(p.c1), dw = (p.w - 0.004) / 2; K.carcass(p.w, p.h, p.d - 0.02, bm, 0, 0, -0.01, g, 0.018); for (let i = 0; i < 2; i++) K.cdoor(dw, p.h - 0.01, bm, -p.w / 2 + (i + 0.5) * dw, 0.005, p.d / 2 - 0.01, i ? -1 : 1, g, { hy: 0.12, hlen: 0.15 }); }, { elev: 1.45, anim: 'Ouvrir les portes' });
reg('khaut_vitre', 'Cuisine', 'Meuble haut vitré 60', 0.6, 0.35, 0.7, 89, [['Cadre', '#e6e2da']], (g, p, K) => { const bm = K.body(p.c1); K.carcass(p.w, p.h, p.d - 0.02, bm, 0, 0, -0.01, g, 0.018); K.box(p.w - 0.04, 0.016, p.d - 0.06, bm, 0, p.h / 2, -0.02); K.cdoor(p.w - 0.004, p.h - 0.01, K.glass(), 0, 0.005, p.d / 2 - 0.01, 1, g, { hy: 0.12, hlen: 0.15 }); }, { elev: 1.45, anim: 'Ouvrir la porte' });
reg('colonne_frigo', 'Cuisine', 'Colonne pour réfrigérateur', 0.6, 0.6, 2.1, 189, kCols, (g, p, K) => { const { w, d, h } = p, bm = K.body(p.c1); K.carcass(w, h, d, bm, 0, 0, 0, g, 0.018); K.cdoor(w - 0.004, 0.4, bm, 0, h - 0.41, d / 2, 1, g); K.box(w - 0.1, h - 0.5, d - 0.1, K.m('#f3f3f1', { r: 0.4 }), 0, (h - 0.5) / 2 + 0.02, -0.02); }, A_P);
reg('colonne_rangement', 'Cuisine', 'Colonne de rangement', 0.6, 0.6, 2.1, 229, kCols, unit({ doors: 2, shelves: 3 }), A_P);
reg('plan_travail', 'Cuisine', 'Plan de travail seul', 1.2, 0.6, 0.04, 59, [['Teinte', '#6e6a64']], (g, p, K) => { K.box(p.w, p.h, p.d, wt(K, p), 0, p.h / 2, 0); }, { elev: 0.85, fin: null });
reg('desserte', 'Cuisine', 'Desserte à roulettes', 0.6, 0.4, 0.85, 89, [['Plateaux', OAK], ['Structure', '#1b1c1f']], (g, p, K) => { const lm = K.m(p.c2, { m: 0.5, r: 0.4 }); for (const y of [0.15, 0.5, p.h - 0.015]) K.box(p.w, 0.03, p.d, K.body(p.c1), 0, y, 0); K.legs(p.w, p.d, p.h - 0.03, 0.015, lm, 0.03); }, { fin: 'bois' });
reg('hotte_ilot', 'Cuisine', 'Hotte îlot', 0.9, 0.5, 1.1, 449, [['Inox', '#c3c8cd']], (g, p, K) => { K.box(p.w, 0.06, p.d, K.inox(), 0, 0.03, 0); K.box(0.3, p.h - 0.06, 0.3, K.inox(), 0, 0.06 + (p.h - 0.06) / 2, 0); }, { elev: 1.55, fin: null });
// ---------- Entrée ----------
reg('porte_manteaux', 'Entrée', 'Porte-manteaux mural', 0.8, 0.1, 0.25, 39, [['Planche', OAK], ['Patères', '#1b1c1f']], (g, p, K) => { K.box(p.w, p.h, 0.02, K.body(p.c1), 0, p.h / 2, 0); for (let i = 0; i < 4; i++) K.cyl(0.015, 0.015, 0.08, K.m(p.c2, { m: 0.5 }), -p.w * 3 / 8 + i * (p.w / 4), p.h / 2, 0.05, null, 10).rotation.x = Math.PI / 2; }, { elev: 1.5, fin: 'bois' });
reg('meuble_chaussures', 'Entrée', 'Meuble à chaussures', 0.8, 0.3, 1.1, 99, stCols, (g, p, K) => { const { w, d, h } = p, bm = K.body(p.c1); K.carcass(w, h, d, bm, 0, 0, 0, g, 0.018); for (let i = 0; i < 3; i++) { const pv = K.piv(0, 0.02 + i * (h / 3), d / 2); K.box(w - 0.04, h / 3 - 0.03, 0.018, bm, 0, (h / 3 - 0.03) / 2, 0, pv); K.box(0.2, 0.012, 0.02, K.inox(), 0, h / 3 - 0.08, 0.018, pv); K.add(pv, { rot: ['x', -0.7] }); } }, { anim: 'Ouvrir les rabats' });
reg('banc_chaussures', 'Entrée', 'Banc à chaussures', 1.0, 0.35, 0.5, 119, [['Assise', '#9aa5a8'], ['Structure', OAK]], (g, p, K) => { const lm = K.m(p.c2, { r: 0.5 }); K.legs(p.w, p.d, p.h - 0.08, 0.02, lm, 0.04); K.rbox(p.w, 0.07, p.d, 0.03, K.m(p.c1, { r: 0.9 }), 0, p.h - 0.035, 0); K.box(p.w - 0.1, 0.02, p.d - 0.04, lm, 0, 0.12, 0); K.box(p.w - 0.1, 0.02, p.d - 0.04, lm, 0, 0.27, 0); });
reg('miroir_pied', 'Entrée', 'Miroir sur pied', 0.5, 0.4, 1.6, 79, [['Cadre', '#2e3338']], (g, p, K) => { const m = K.rbox(p.w, p.h, 0.03, 0.01, K.m(p.c1, { r: 0.6 }), 0, p.h / 2 + 0.1, 0); m.rotation.x = -0.1; K.box(p.w - 0.06, p.h - 0.06, 0.006, K.m('#dfe8ec', { r: 0.05, m: 0.7 }), 0, p.h / 2 + 0.1, 0.017).rotation.x = -0.1; K.box(0.04, 0.03, p.d, K.m(p.c1), -p.w / 2 + 0.05, 0.015, -0.05); K.box(0.04, 0.03, p.d, K.m(p.c1), p.w / 2 - 0.05, 0.015, -0.05); }, { fin: null });
reg('portant', 'Entrée', 'Portant à vêtements', 1.0, 0.45, 1.65, 49, [['Structure', '#1b1c1f']], (g, p, K) => { const lm = K.m(p.c1, { m: 0.6, r: 0.4 }); for (const sx of [-1, 1]) { K.box(0.025, p.h, 0.025, lm, sx * (p.w / 2 - 0.03), p.h / 2, 0); K.box(0.025, 0.025, p.d, lm, sx * (p.w / 2 - 0.03), 0.02, 0); } K.cyl(0.012, 0.012, p.w - 0.06, lm, 0, p.h - 0.03, 0, null, 8).rotation.z = Math.PI / 2; K.box(p.w - 0.06, 0.02, 0.02, lm, 0, 0.1, 0); }, { fin: null });
// ---------- Bureau ----------
reg('caisson_roulant', 'Bureau', 'Caisson à roulettes', 0.42, 0.55, 0.6, 79, stCols, unit({ drawers: 3, legs: 0.05 }), A_T);
reg('bureau_angle', 'Bureau', "Bureau d'angle", 1.6, 1.4, 0.74, 299, [['Plateau', WHITE], ['Structure', ANTH]], (g, p, K) => { const lm = K.m(p.c2, { m: 0.4, r: 0.45 }), bm = K.body(p.c1), t = 0.6; K.box(p.w, 0.035, t, bm, 0, p.h - 0.0175, -p.d / 2 + t / 2); K.box(t, 0.035, p.d - t, bm, p.w / 2 - t / 2, p.h - 0.0175, t / 2); for (const [x, z] of [[-p.w / 2 + 0.05, -p.d / 2 + 0.05], [-p.w / 2 + 0.05, -p.d / 2 + t - 0.05], [p.w / 2 - 0.05, -p.d / 2 + 0.05], [p.w / 2 - 0.05, p.d / 2 - 0.05], [p.w / 2 - t + 0.05, p.d / 2 - 0.05]]) K.cyl(0.025, 0.02, p.h - 0.035, lm, x, (p.h - 0.035) / 2, z, null, 10); }, { fin: 'bois' });
reg('etagere_bureau', 'Bureau', 'Étagère de bureau', 0.8, 0.3, 1.2, 89, [['Corps', WALNUT], ['Poignées', '#2e3338']], unit({ shelves: 3 }), { fin: 'bois' });
// ---------- Salle de bain ----------
reg('wc_suspendu', 'Salle de bain', 'WC suspendu', 0.36, 0.52, 0.4, 249, [], (g, p, K) => { const wm = K.m('#ffffff', { r: 0.1 }); K.rbox(p.w, 0.35, p.d, 0.12, wm, 0, 0.22, 0); K.rbox(p.w - 0.04, 0.03, p.d - 0.06, 0.02, K.m('#f3f1ec', { r: 0.4 }), 0, 0.42, 0); }, { elev: 0.0, fin: null });
reg('lave_mains', 'Salle de bain', 'Lave-mains', 0.45, 0.25, 0.85, 129, [['Vasque', '#ffffff']], (g, p, K) => { const wm = K.m(p.c1, { r: 0.1 }); K.rbox(p.w, 0.14, p.d, 0.06, wm, 0, p.h - 0.07, 0); K.cyl(0.04, 0.05, p.h - 0.15, wm, 0, (p.h - 0.15) / 2, -p.d / 2 + 0.07, null, 14); K.cyl(0.01, 0.01, 0.12, K.inox(), 0, p.h + 0.04, -p.d / 2 + 0.03, null, 8); }, { fin: null });
reg('sous_vasque', 'Salle de bain', 'Meuble sous vasque 80', 0.8, 0.46, 0.85, 229, [['Meuble', '#e8dccb'], ['Vasque', '#ffffff']], (g, p, K) => { const { w, d, h } = p, bm = K.body(p.c1); K.box(w, h - 0.12, d, bm, 0, (h - 0.12) / 2, 0); K.box(w + 0.02, 0.04, d + 0.02, K.m(p.c2, { r: 0.12 }), 0, h - 0.02, 0); K.rbox(0.5, 0.1, 0.36, 0.05, K.m(p.c2, { r: 0.1 }), 0, h + 0.02, 0); for (let i = 0; i < 2; i++) K.drawer(w - 0.04, 0.2, d - 0.1, bm, 0, 0.06 + i * 0.3, d / 2, g, { travel: 0.3 }); }, A_T);
reg('porte_serviettes', 'Salle de bain', 'Sèche-serviettes', 0.5, 0.1, 1.2, 189, [['Chrome', '#c3c8cd']], (g, p, K) => { const lm = K.m(p.c1, { m: 0.9, r: 0.2 }); for (const sx of [-1, 1]) K.box(0.025, p.h, 0.04, lm, sx * (p.w / 2 - 0.015), p.h / 2, 0); for (let i = 0; i < 8; i++) K.box(p.w - 0.04, 0.02, 0.025, lm, 0, 0.1 + i * ((p.h - 0.2) / 7), 0.015); }, { elev: 0.3, fin: null });
reg('panier_linge', 'Salle de bain', 'Panier à linge', 0.4, 0.3, 0.6, 29, [['Osier', '#c8a57a']], (g, p, K) => { const t = K.cyl(0.5, 0.45, 1, K.m(p.c1, { r: 0.95 }), 0, p.h / 2, 0, null, 24); t.scale.set(p.w, p.h, p.d); const c = K.cyl(0.5, 0.5, 0.03, K.m(tone(p.c1, 0.15), { r: 0.9 }), 0, p.h + 0.01, 0, null, 24); c.scale.set(p.w * 1.02, 1, p.d * 1.02); }, { fin: null });
// ---------- Électroménager ----------
reg('congelateur', 'Électroménager', 'Congélateur coffre', 1.0, 0.65, 0.85, 349, [['Corps', '#f3f3f1']], (g, p, K) => { K.rbox(p.w, p.h, p.d, 0.02, K.m(p.c1, { r: 0.35 }), 0, p.h / 2, 0); const pv = K.piv(0, p.h, -p.d / 2); K.rbox(p.w + 0.01, 0.04, p.d + 0.01, 0.015, K.m(p.c1, { r: 0.35 }), 0, 0.02, p.d / 2, pv); K.add(pv, { rot: ['x', -1.1] }); }, { anim: 'Ouvrir le couvercle', fin: null });
reg('plaque_induction', 'Électroménager', 'Plaque de cuisson', 0.6, 0.52, 0.01, 299, [['Verre', '#1b1c1f']], (g, p, K) => { K.box(p.w, p.h, p.d, K.m(p.c1, { r: 0.1 }), 0, p.h / 2, 0); for (const [x, z, r] of [[-0.15, -0.12, 0.09], [0.15, -0.12, 0.07], [-0.15, 0.12, 0.07], [0.15, 0.12, 0.09]]) { const c = K.cyl(r, r, 0.002, K.m('#555a60', { r: 0.4 }), x, p.h + 0.001, z, null, 24); void c; } }, { onTop: true, fin: null });
reg('cave_vin', 'Électroménager', 'Cave à vin', 0.6, 0.6, 0.85, 399, [['Corps', '#1b1c1f']], (g, p, K) => { K.rbox(p.w, p.h, p.d, 0.02, K.m(p.c1, { r: 0.4 }), 0, p.h / 2, 0); K.box(p.w - 0.08, p.h - 0.1, 0.012, K.glass(), 0, p.h / 2, p.d / 2 + 0.002); for (let i = 0; i < 4; i++) K.box(p.w - 0.1, 0.01, 0.03, K.m('#c8a57a'), 0, 0.15 + i * 0.18, p.d / 2 - 0.01); }, { fin: null });
// ---------- Déco ----------
reg('horloge', 'Déco', 'Horloge murale', 0.4, 0.04, 0.4, 29, [['Cadre', '#1b1c1f']], (g, p, K) => { const c = K.cyl(0.5, 0.5, 0.04, K.m(p.c1, { r: 0.5 }), 0, p.h / 2, 0, null, 36); c.scale.set(p.w, 1, p.h); c.rotation.x = Math.PI / 2; const f = K.cyl(0.45, 0.45, 0.005, K.m('#f3f1ec', { r: 0.6 }), 0, p.h / 2, 0.02, null, 36); f.scale.set(p.w, 1, p.h); f.rotation.x = Math.PI / 2; K.box(0.012, p.h * 0.32, 0.006, K.black(), 0, p.h / 2 + p.h * 0.14, 0.026); K.box(p.w * 0.26, 0.012, 0.006, K.black(), p.w * 0.1, p.h / 2, 0.028); }, { elev: 1.7, fin: null });
reg('palmier', 'Déco', 'Grande plante (palmier)', 0.8, 0.8, 1.8, 89, [['Pot', '#d9c3a5'], ['Feuillage', '#4f7a55']], (g, p, K) => { K.cyl(p.w * 0.25, p.w * 0.2, 0.3, K.m(p.c1, { r: 0.7 }), 0, 0.15, 0, null, 20); K.cyl(0.02, 0.03, p.h * 0.6, K.m('#5a4636'), 0, 0.3 + p.h * 0.3, 0, null, 8); for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.283, l = K.sph(0.3, K.m(p.c2, { r: 0.8 }), Math.cos(a) * p.w * 0.3, p.h * 0.82 - (i % 2) * 0.12, Math.sin(a) * p.w * 0.3, null, 1.3, 0.18, 0.45); l.rotation.y = -a; l.rotation.z = 0.35; } }, { fin: null });
reg('plaid_pouf', 'Déco', 'Coussins (lot de 3)', 0.5, 0.2, 0.4, 29, [['Tissu', '#d6a69a']], (g, p, K) => { for (let i = 0; i < 3; i++) { const c = K.rbox(0.4, 0.4, 0.1, 0.05, K.m(tone(p.c1, (i - 1) * 0.2), { r: 0.95 }), (i - 1) * 0.28, 0.2, 0); c.rotation.z = (i - 1) * 0.12; } }, { elev: 0.4, fin: null });
// ---------- Extérieur ----------
reg('banc_jardin', 'Extérieur', 'Banc de jardin', 1.5, 0.55, 0.85, 129, [['Lames', '#8a5a3c'], ['Structure', '#2e3338']], (g, p, K) => { const bm = K.body(p.c1), lm = K.m(p.c2, { m: 0.5, r: 0.5 }); for (let i = 0; i < 4; i++) K.box(p.w, 0.025, 0.09, bm, 0, p.h * 0.5, p.d / 2 - 0.08 - i * 0.1); for (let i = 0; i < 3; i++) { const b = K.box(p.w, 0.09, 0.02, bm, 0, p.h * 0.65 + i * 0.1, -p.d / 2 + 0.05 - i * 0.015); b.rotation.x = -0.15; } for (const sx of [-1, 1]) { K.box(0.04, p.h, 0.04, lm, sx * (p.w / 2 - 0.05), p.h / 2, -p.d / 2 + 0.05); K.box(0.04, p.h * 0.5, 0.04, lm, sx * (p.w / 2 - 0.05), p.h * 0.25, p.d / 2 - 0.05); } }, { fin: 'bois' });
reg('bac_potager', 'Extérieur', 'Bac potager', 1.2, 0.8, 0.4, 69, [['Bois', '#8a5a3c'], ['Terre', '#4a3a2c']], (g, p, K) => { const bm = K.m(p.c1, { r: 0.9, map: 'bois' }); for (const sz of [-1, 1]) K.box(p.w, p.h, 0.03, bm, 0, p.h / 2, sz * (p.d / 2 - 0.015)); for (const sx of [-1, 1]) K.box(0.03, p.h, p.d - 0.06, bm, sx * (p.w / 2 - 0.015), p.h / 2, 0); K.box(p.w - 0.06, p.h - 0.08, p.d - 0.06, K.m(p.c2, { r: 1 }), 0, (p.h - 0.08) / 2, 0); }, { fin: null });
reg('jardiniere', 'Extérieur', 'Jardinière fleurie', 0.8, 0.25, 0.35, 39, [['Bac', '#d9c3a5'], ['Fleurs', '#c97b63']], (g, p, K) => { K.box(p.w, p.h * 0.7, p.d, K.m(p.c1, { r: 0.7 }), 0, p.h * 0.35, 0); for (let i = 0; i < 9; i++) K.sph(0.06 + (i % 3) * 0.01, K.m(i % 2 ? p.c2 : '#4f7a55', { r: 0.8 }), -p.w * 0.4 + i * (p.w * 0.1), p.h * 0.8, ((i % 3) - 1) * p.d * 0.2); }, { fin: null });
reg('cloture', 'Extérieur', 'Palissade (panneau)', 1.8, 0.05, 1.5, 59, [['Lames', '#8a5a3c']], (g, p, K) => { const bm = K.m(p.c1, { r: 0.9, map: 'bois' }); const n = 12; for (let i = 0; i < n; i++) K.box(p.w / n - 0.01, p.h - (i % 2) * 0.06, 0.02, bm, -p.w / 2 + (i + 0.5) * (p.w / n), (p.h - (i % 2) * 0.06) / 2, 0); for (const y of [0.25, p.h - 0.25]) K.box(p.w, 0.06, 0.025, bm, 0, y, -0.02); }, { fin: null });
reg('portillon', 'Extérieur', 'Portillon', 1.0, 0.05, 1.2, 149, [['Cadre', '#2e3338']], (g, p, K) => { const lm = K.m(p.c1, { m: 0.5, r: 0.5 }); for (const sx of [-1, 1]) K.box(0.05, p.h, 0.05, lm, sx * (p.w / 2 - 0.025), p.h / 2, 0); const pv = K.piv(-p.w / 2 + 0.05, 0, 0); K.box(p.w - 0.1, 0.04, 0.03, lm, (p.w - 0.1) / 2, 0.1, 0, pv); K.box(p.w - 0.1, 0.04, 0.03, lm, (p.w - 0.1) / 2, p.h - 0.1, 0, pv); for (let i = 0; i < 9; i++) K.box(0.02, p.h - 0.2, 0.02, lm, 0.05 + i * ((p.w - 0.2) / 8), p.h / 2, 0, pv); K.add(pv, { rot: ['y', -1.3] }); }, { anim: 'Ouvrir', fin: null });
reg('carport', 'Extérieur', 'Abri voiture (carport)', 3.0, 5.5, 2.5, 1290, [['Structure', '#4b5359'], ['Toit', '#c9c2b4']], (g, p, K) => { const lm = K.m(p.c1, { m: 0.4, r: 0.5 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(0.12, p.h, 0.12, lm, sx * (p.w / 2 - 0.06), p.h / 2, sz * (p.d / 2 - 0.06)); K.box(p.w + 0.3, 0.1, p.d + 0.3, K.m(p.c2, { r: 0.6 }), 0, p.h + 0.05, 0); }, { fin: null });
reg('trampoline', 'Extérieur', 'Trampoline', 3.0, 3.0, 0.9, 249, [['Toile', '#1b1c1f'], ['Cadre', '#4f7a55']], (g, p, K) => { const t = K.cyl(0.5, 0.5, 0.02, K.m(p.c1, { r: 0.9 }), 0, p.h * 0.7, 0, null, 40); t.scale.set(p.w, 1, p.d); const r = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 8, 40), K.m(p.c2, { r: 0.7 })); r.rotation.x = Math.PI / 2; r.scale.set(p.w, p.d, 1); r.position.y = p.h * 0.7; g.add(r); for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; K.cyl(0.015, 0.015, p.h * 0.7, K.m('#8d8b86', { m: 0.6 }), Math.cos(a) * p.w * 0.5, p.h * 0.35, Math.sin(a) * p.d * 0.5, null, 8); } }, { fin: null });

// ---------- sous-catégories (comme les rayons d'un catalogue) ----------
// éléments avec plan de travail : choix de la matière
for (const id of ['kbas40', 'kbas60', 'kbas80', 'kbas120', 'ktiroirs', 'kbas_four', 'kevier', 'ilot', 'plan_travail']) if (DEFS[id]) DEFS[id].selects = [WTSEL];
// surfaces qui portent d'autres éléments, et éléments qui se posent dessus (hauteur calculée automatiquement)
for (const id of ['kbas40', 'kbas60', 'kbas80', 'kbas120', 'ktiroirs', 'kbas_four', 'kevier', 'ilot', 'plan_travail', 'desserte', 'table', 'table_r', 'table_extensible', 'table_haute', 'bureau', 'bureau_debout', 'bureau_angle', 'buffet', 'commode', 'commode6', 'chiffonnier', 'console', 'enfilade', 'meuble_tv_tiroirs', 'meubletv', 'tablebasse', 'table_basse_carree', 'gueridon', 'chevet', 'lavelinge', 'seche', 'lavevaisselle', 'sous_vasque', 'double_vasque']) if (DEFS[id]) DEFS[id].surf = true;
reg('evier_pose', 'Cuisine', 'Évier à poser (1 bac + égouttoir)', 0.8, 0.5, 0.2, 189, [['Inox', '#c3c8cd']], (g, p, K) => {
  const ix = K.m(p.c1, { m: 0.9, r: 0.25 }), { w, d } = p, bw = w * 0.55;
  K.box(w, 0.02, d, ix, 0, 0.01, 0); K.box(w, 0.04, 0.02, ix, 0, 0.04, d / 2 - 0.01); K.box(w, 0.04, 0.02, ix, 0, 0.04, -d / 2 + 0.01); K.box(0.02, 0.04, d, ix, -w / 2 + 0.01, 0.04, 0); K.box(0.02, 0.04, d, ix, w / 2 - 0.01, 0.04, 0);
  K.box(bw, 0.001, d - 0.1, K.m('#8f979d', { m: 0.8, r: 0.35 }), -w / 2 + bw / 2 + 0.03, 0.045, 0);
  for (let i = 0; i < 6; i++) K.box(w - bw - 0.12, 0.004, 0.012, ix, w / 2 - (w - bw) / 2 + 0.03, 0.049, -d / 2 + 0.08 + i * ((d - 0.16) / 5));
  K.cyl(0.012, 0.012, 0.22, ix, -w / 2 + bw + 0.06, 0.13, -d / 2 + 0.05, null, 10); const sp = K.box(0.012, 0.012, 0.14, ix, -w / 2 + bw + 0.06, 0.24, -d / 2 + 0.12); void sp;
}, { onTop: true, fin: null });
if (DEFS.micro) DEFS.micro.onTop = true;
const SMALLAPP = (id, name, w, d, h, price, build) => reg(id, 'Électroménager', name, w, d, h, price, [['Corps', '#d5d8db']], build, { onTop: true, fin: null });
SMALLAPP('cafetiere', 'Machine à café', 0.2, 0.3, 0.35, 89, (g, p, K) => { const bm = K.m(p.c1, { r: 0.3, m: 0.5 }); K.box(p.w, p.h, p.d * 0.5, bm, 0, p.h / 2, -p.d * 0.25); K.box(p.w, 0.04, p.d, bm, 0, 0.02, 0); K.cyl(0.04, 0.04, 0.09, K.black(), 0, 0.09, p.d * 0.15, null, 14); });
SMALLAPP('bouilloire', 'Bouilloire', 0.2, 0.2, 0.25, 39, (g, p, K) => { K.cyl(0.09, 0.1, p.h * 0.85, K.m(p.c1, { r: 0.3, m: 0.6 }), 0, p.h * 0.43, 0, null, 20); K.box(0.02, p.h * 0.6, 0.04, K.black(), p.w * 0.55, p.h * 0.5, 0); });
SMALLAPP('grille_pain', 'Grille-pain', 0.3, 0.17, 0.2, 35, (g, p, K) => { K.rbox(p.w, p.h, p.d, 0.04, K.m(p.c1, { r: 0.3, m: 0.5 }), 0, p.h / 2, 0); K.box(p.w * 0.7, 0.01, 0.03, K.black(), 0, p.h, -0.03); K.box(p.w * 0.7, 0.01, 0.03, K.black(), 0, p.h, 0.03); });
{ const m = registerMore(reg, { unit, sofaParts, bed, wardrobe, tone, WOOD, WHITE, ANTH, OAK, WALNUT }); m.surf.forEach((id) => { DEFS[id].surf = true; }); m.free.forEach((id) => { DEFS[id].free = true; }); }
registerIkea(reg, { unit, sofaParts, bed, wardrobe, tone, WOOD, WHITE, OAK });   // série inspirée des gammes IKEA (js/catalog4.js)
for (const id of ['table_lack', 'buffet_hemnes', 'commode_nordli', 'commode_kullen', 'table_norden', 'table_ekedalen', 'table_ingatorp', 'table_applaro', 'bureau_micke', 'vasque_godmorgon', 'chaussures_hemnes', 'table_enfant_mammut']) DEFS[id].surf = true;
for (const id of ['table_lack', 'fauteuil_oreilles', 'desserte_raskog', 'table_norden', 'table_ekedalen', 'table_ingatorp', 'chaise_teodores', 'chaise_ingolf', 'chaise_odger', 'chaise_markus', 'caisson_helmer', 'table_enfant_mammut', 'table_applaro', 'chaise_applaro', 'bain_soleil']) DEFS[id].free = true;   // meubles inspirés des grandes enseignes (js/catalog3.js)
const SUBS = {
  Salon: { 'Canapés et fauteuils': ['canape2', 'canape3', 'canape_angle', 'canape_conv', 'fauteuil', 'fauteuil_coque', 'bergere', 'chauffeuse'], 'Tables': ['tablebasse', 'tablebasse_r', 'table_basse_carree', 'gueridon'], 'Meubles TV': ['meubletv', 'meuble_tv_tiroirs', 'tv', 'tv_mur'], 'Rangements': ['biblio', 'biblio_haute', 'enfilade', 'vitrine_salon', 'etagere_cubes', 'etagere_murale', 'console'], 'Chauffage': ['poele'], 'Confort': ['pouf'] },
  'Salle à manger': { 'Tables': ['table', 'table_r', 'table_extensible', 'table_haute'], 'Chaises et bancs': ['chaise', 'chaise_visiteur', 'chaise_bar', 'tabouret', 'banc'], 'Rangements': ['buffet', 'vaisselier'] },
  Cuisine: { 'Îlots et accessoires': ['evier_pose', 'ilot', 'desserte', 'hotte_ilot'] },
  Chambre: { 'Lits': ['lit90', 'lit140', 'lit160', 'tete_de_lit'], 'Armoires et dressings': ['armoire2', 'armoire3', 'armoire_coulissante', 'dressing_ouvert'], 'Commodes et chevets': ['commode', 'commode6', 'chiffonnier', 'chevet', 'chevet_susp'], 'Coiffeuses et bancs': ['coiffeuse', 'banc_lit'] },
  Enfant: { 'Lits': ['lit70', 'lit_cabane'], 'Bureau et jeux': ['bureau_enfant', 'tipi'], 'Rangements': ['rangement_jouets'] },
  'Salle de bain': { 'Sanitaires': ['wc', 'wc_suspendu', 'vasque', 'lave_mains'], 'Meubles': ['sous_vasque', 'double_vasque', 'meuble_colonne', 'miroir', 'panier_linge'], 'Bain et douche': ['baignoire', 'baignoire_ilot', 'douche', 'douche_ital'], 'Accessoires': ['porte_serviettes', 'seche_serv'] },
  Bureau: { 'Bureaux': ['bureau', 'bureau_angle', 'bureau_debout'], 'Sièges': ['chaise_bureau'], 'Rangements': ['caisson_roulant', 'etagere_bureau', 'etagere_livres'] },
  'Entrée': { 'Rangements': ['meuble_chaussures', 'banc_chaussures', 'portant'], 'Accessoires': ['porte_manteaux', 'miroir_pied'] },
  'Électroménager': { 'Froid': ['frigo', 'frigo_us', 'congelateur', 'cave_vin'], 'Cuisson': ['cuisiniere', 'four', 'micro', 'hotte', 'plaque_induction'], 'Petit électroménager': ['cafetiere', 'bouilloire', 'grille_pain'], 'Lavage': ['lavelinge', 'seche', 'lavevaisselle'], 'Chauffage et eau': ['radiateur', 'chauffeeau', 'clim'] },
  'Éclairage': { 'Plafond': ['plafonnier', 'spot', 'reglette', 'suspension', 'lustre', 'rail'], 'Murales': ['applique', 'liseuse', 'lanterne'], 'À poser et sur pied': ['lampadaire', 'lampadaire_arc', 'lampe_poser'], 'Extérieur': ['projecteur', 'potelet'] },
  'Déco': { 'Tapis': ['tapis', 'tapis_r'], 'Plantes': ['plante', 'palmier', 'vase'], 'Murs': ['tableau', 'cadres', 'miroir_rond', 'horloge'], 'Textile': ['rideau', 'plaid_pouf'] },
  'Extérieur': { 'Mobilier de jardin': ['table_jardin', 'chaise_jardin', 'banc_jardin', 'transat', 'parasol', 'barbecue'], 'Végétation': ['arbre', 'haie', 'bac_potager', 'jardiniere'], 'Aménagements': ['piscine', 'pergola', 'abri_jardin', 'carport', 'trampoline', 'cloture', 'portillon'], 'Véhicules': ['voiture1', 'voiture2'] },
};
for (const [cat, subs] of Object.entries(SUBS)) for (const [sub, ids] of Object.entries(subs)) for (const id of ids) { if (DEFS[id]) { DEFS[id].cat = cat; DEFS[id].sub = sub; } else console.warn('catalogue : modèle inconnu', id); }
// anciens meubles de cuisine : remplacés par la cuisine modulaire, toujours acceptés dans les plans existants mais masqués dans la bibliothèque
for (const id of ['kbas40', 'kbas60', 'kbas80', 'kbas120', 'ktiroirs', 'kbas_four', 'khaut40', 'khaut', 'khaut80', 'khaut_vitre', 'colonne_frigo', 'colonne_four', 'colonne_rangement', 'kevier', 'plan_travail']) if (DEFS[id]) { DEFS[id].hidden = true; DEFS[id].cat = 'Cuisine'; DEFS[id].sub = 'Anciens modèles'; }
for (const d of Object.values(DEFS)) d.sub = d.sub || 'Autres';
CATS.length = 0; CATS.push('Salon', 'Cuisine', 'Salle à manger', 'Chambre', 'Enfant', 'Salle de bain', 'Bureau', 'Entrée', 'Électroménager', 'Éclairage', 'Déco', 'Extérieur');

for (const k of Object.keys(DEFS)) { DEFS[k].fin = DEFS[k].fin === undefined ? 'mat' : DEFS[k].fin; DEFS[k].colors = DEFS[k].colors || []; }
export const ALL = Object.values(DEFS);
