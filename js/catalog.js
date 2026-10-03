// Bibliothèque de meubles et d'électroménager (modèles procéduraux paramétrables, façon configurateur IKEA).
// Repère d'un meuble : origine au sol au centre de l'emprise, +x = largeur, +z = FACE AVANT, +y = hauteur.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { boxG } from './util.js';
import { getTexM } from './textures.js';
import { addPart } from './anim.js';

export const CATS = ['Chambre', 'Salon', 'Salle à manger', 'Cuisine', 'Électroménager', 'Salle de bain', 'Bureau', 'Éclairage', 'Déco', 'Extérieur'];
export const FINS = [['mat', 'Laqué mat'], ['bois', 'Bois / décor'], ['brillant', 'Brillant']];

const tone = (c, f) => { const k = new THREE.Color(c); k.lerp(new THREE.Color(f > 0 ? '#ffffff' : '#000000'), Math.abs(f)); return '#' + k.getHexString(); };

// ---- boîte à outils passée à chaque modèle -----------------------------------------------------
function kit(g, p) {
  const parts = [], cache = new Map();
  const K = { parts, g };
  K.m = (c, o = {}) => {
    const key = c + '|' + (o.r ?? '') + (o.m ?? '') + (o.map ?? '') + (o.op ?? '') + (o.em ?? '');
    if (cache.has(key)) return cache.get(key);
    const mt = new THREE.MeshStandardMaterial({
      color: c, roughness: o.r ?? 0.7, metalness: o.m ?? 0, map: o.map ? getTexM(o.map) : null,
      transparent: o.op != null, opacity: o.op ?? 1, depthWrite: o.op == null, side: o.op != null ? THREE.DoubleSide : THREE.FrontSide,
    });
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
const kCols = [['Façades', '#e6e2da'], ['Plan de travail', '#6e6a64']];
function kBase(nd, drawers) {
  return (g, p, K) => {
    const { w, d } = p, h = 0.85, bm = K.body(p.c1), n = nd ?? (w > 0.7 ? 2 : 1), pl = 0.1, bh = h - 0.04 - pl;
    K.box(w - 0.04, pl, d - 0.06, K.black(), 0, pl / 2, -0.02);
    K.carcass(w, bh, d - 0.02, bm, 0, pl, -0.01, g, 0.018);
    K.box(w + 0.002, 0.04, d + 0.02, K.m(p.c2, { r: 0.35 }), 0, h - 0.02, 0.0);
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
  const cm = K.m(p.c2, { r: 0.35 }), bx0 = -w / 2 + 0.12, bw = 0.5, bd = 0.4, zb = -0.02;
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

for (const k of Object.keys(DEFS)) { DEFS[k].fin = DEFS[k].fin === undefined ? 'mat' : DEFS[k].fin; DEFS[k].colors = DEFS[k].colors || []; }
export const ALL = Object.values(DEFS);
