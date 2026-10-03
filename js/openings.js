// Portes et fenêtres : modèles paramétrables avec animation (battants, coulissants, volet roulant).
// Repère local : x le long du mur (centré sur l'ouverture), y depuis le bas de l'ouverture, z dans l'épaisseur (+z = côté A).
import * as THREE from 'three';
import { getTexM } from './textures.js';
import { boxG } from './util.js';
import { addPart } from './anim.js';

export const DOORS = [
  { id: 'battant', name: 'Porte pleine', w: 0.9, h: 2.04, y0: 0 },
  { id: 'vitree', name: 'Porte vitrée', w: 0.9, h: 2.04, y0: 0 },
  { id: 'double', name: 'Double porte', w: 1.4, h: 2.04, y0: 0 },
  { id: 'coulissante', name: 'Porte coulissante', w: 0.9, h: 2.04, y0: 0 },
  { id: 'entree', name: "Porte d'entrée", w: 0.95, h: 2.15, y0: 0 },
  { id: 'passage', name: 'Passage (sans porte)', w: 1.0, h: 2.1, y0: 0 },
  { id: 'sectionnelle', name: 'Porte de garage', w: 2.8, h: 2.25, y0: 0 },
  { id: 'porte_fenetre', name: 'Porte-fenêtre vitrée', w: 0.9, h: 2.15, y0: 0, like: 'vitree' },
  { id: 'double_vitree', name: 'Double porte vitrée', w: 1.4, h: 2.15, y0: 0, like: 'double', glazed: true },
  { id: 'coulissante_vitree', name: 'Porte coulissante vitrée', w: 1.0, h: 2.15, y0: 0, like: 'coulissante', glazed: true },
  { id: 'blindee', name: 'Porte blindée', w: 0.9, h: 2.04, y0: 0, like: 'entree' },
  { id: 'service', name: 'Porte de service', w: 0.83, h: 2.04, y0: 0, like: 'battant' },
  { id: 'cave', name: 'Porte basse (cave)', w: 0.7, h: 1.8, y0: 0, like: 'battant' },
  { id: 'grande_ouverture', name: 'Grande ouverture', w: 1.8, h: 2.1, y0: 0, like: 'passage' },
  { id: 'garage_simple', name: 'Porte de garage simple', w: 2.4, h: 2.1, y0: 0, like: 'sectionnelle' },
  { id: 'garage_double', name: 'Porte de garage double', w: 4.8, h: 2.25, y0: 0, like: 'sectionnelle' },
];
export const WINDOWS = [
  { id: 'fixe', name: 'Fenêtre fixe', w: 1.0, h: 1.0, y0: 0.9 },
  { id: 'battant1', name: '1 vantail', w: 0.7, h: 1.25, y0: 0.9 },
  { id: 'battant2', name: '2 vantaux', w: 1.2, h: 1.25, y0: 0.9 },
  { id: 'coulissant', name: 'Coulissante', w: 1.6, h: 1.25, y0: 0.9 },
  { id: 'baie2', name: 'Baie 2 vantaux', w: 2.0, h: 2.15, y0: 0 },
  { id: 'baie2d', name: 'Baie 2 vantaux mobiles', w: 2.0, h: 2.15, y0: 0, groups: 2 },
  { id: 'baie3', name: 'Baie 3 vantaux', w: 3.0, h: 2.15, y0: 0, groups: 2 },
  { id: 'baie4', name: 'Baie 4 vantaux', w: 4.25, h: 2.15, y0: 0, groups: 2 },
  { id: 'rond', name: 'Œil-de-bœuf', w: 0.7, h: 0.7, y0: 1.4, round: true },
  { id: 'bandeau', name: 'Bandeau haut', w: 1.2, h: 0.45, y0: 1.9, like: 'fixe' },
  { id: 'bandeau_long', name: 'Bandeau long', w: 2.4, h: 0.5, y0: 1.9, like: 'fixe' },
  { id: 'fixe_grande', name: 'Grande fenêtre fixe', w: 1.6, h: 1.3, y0: 0.8, like: 'fixe' },
  { id: 'vitrage_plein', name: 'Vitrage plein pied', w: 2.4, h: 2.15, y0: 0, like: 'fixe' },
  { id: 'petite', name: 'Petite fenêtre (WC, cellier)', w: 0.5, h: 0.6, y0: 1.5, like: 'battant1' },
  { id: 'pf1', name: 'Porte-fenêtre 1 vantail', w: 0.9, h: 2.15, y0: 0, like: 'battant1' },
  { id: 'pf2', name: 'Porte-fenêtre 2 vantaux', w: 1.4, h: 2.15, y0: 0, like: 'battant2' },
  { id: 'battant2_large', name: '2 vantaux large', w: 1.8, h: 1.25, y0: 0.9, like: 'battant2' },
  { id: 'coulissant_petit', name: 'Coulissante 1 m', w: 1.0, h: 1.0, y0: 1.0, like: 'coulissant' },
  { id: 'coulissant_grand', name: 'Coulissante 2,4 m', w: 2.4, h: 1.25, y0: 0.9, like: 'coulissant' },
];
export const modelOf = (o) => (o.kind === 'door' ? DOORS : WINDOWS).find((m) => m.id === o.model) || (o.kind === 'door' ? DOORS : WINDOWS)[0];

export const MATS = [['pvc', 'PVC'], ['alu', 'Aluminium'], ['bois', 'Bois']];
export const GLASSES = [['clair', 'Clair'], ['teinte', 'Teinté'], ['depoli', 'Dépoli'], ['bleute', 'Bleuté']];
export const HANDLES = [['inox', 'Inox'], ['noir', 'Noir'], ['laiton', 'Laiton'], ['blanc', 'Blanc']];

const GLASS = {
  clair: { c: '#bfe2f2', o: 0.28, r: 0.05 }, teinte: { c: '#4d5f6b', o: 0.55, r: 0.05 },
  depoli: { c: '#f2f6f8', o: 0.88, r: 0.55 }, bleute: { c: '#6fa8d6', o: 0.42, r: 0.05 },
};
const HANDLE = {
  inox: { c: '#c9ced3', m: 0.9, r: 0.25 }, noir: { c: '#1c1d20', m: 0.3, r: 0.4 },
  laiton: { c: '#c9a24b', m: 0.9, r: 0.3 }, blanc: { c: '#f3f3f3', m: 0, r: 0.4 },
};
const ANG_DOOR = 1.75, ANG_WIN = 1.6;

export function defaultOpening(kind, model) {
  const m = (kind === 'door' ? DOORS : WINDOWS).find((x) => x.id === model);
  return {
    kind, model, w: m.w, h: m.h, y0: m.y0, mat: kind === 'door' ? 'bois' : 'pvc', frame: '#ffffff', leaf: kind === 'door' ? '#e9e4da' : '#ffffff',
    glass: 'clair', bars: 0, handle: 'inox', hinge: 'L', side: 1, shutter: false, shutterColor: '#d8d4cc', open: 0, shut: 0, ent: '', ent2: '', shutEnt: '',
  };
}

// retourne { group, parts, shutParts }
export function buildOpening(o, t) {
  const m = modelOf(o), mid = m.like || m.id, g = new THREE.Group(), parts = [], shutParts = [];
  const W = o.w, H = o.h, side = o.side || 1, hs = o.hinge === 'R' ? -1 : 1;
  const prof = o.mat === 'alu' ? { r: 0.3, m: 0.7, fw: 0.045, sfw: 0.04, tex: null }
    : o.mat === 'bois' ? { r: 0.72, m: 0, fw: 0.07, sfw: 0.06, tex: 'bois' } : { r: 0.42, m: 0, fw: 0.065, sfw: 0.055, tex: null };
  const fw = prof.fw, fd = Math.min(t, 0.1);
  const mk = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: prof.r, metalness: prof.m, map: getTexM(prof.tex), ...extra });
  const fm = mk(o.frame), lm = o.kind === 'door' ? mk(o.leaf) : fm;
  const gl = GLASS[o.glass] || GLASS.clair;
  const gm = new THREE.MeshStandardMaterial({ color: gl.c, transparent: true, opacity: gl.o, roughness: gl.r, metalness: 0, depthWrite: false, side: THREE.DoubleSide });
  const hd = HANDLE[o.handle] || HANDLE.inox;
  const hm = new THREE.MeshStandardMaterial({ color: hd.c, roughness: hd.r, metalness: hd.m });

  const bx = (p, w, h, d, mt, x, y, z, ns) => {
    const s = new THREE.Mesh(boxG(w, h, d, ns), mt); s.position.set(x, y, z); s.castShadow = s.receiveShadow = true; p.add(s); return s;
  };
  const piv = (p, x, y, z) => { const q = new THREE.Group(); q.position.set(x, y, z); p.add(q); return q; };
  const glassBox = (p, w, h, x, y, z) => { const s = bx(p, w, h, 0.008, gm, x, y, z); s.castShadow = false; s.receiveShadow = false; s.renderOrder = 3; return s; };

  // ---- cadre dormant ----
  if (m.round) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(W / 2 - fw / 2, fw / 2, 10, 48), fm);
    ring.position.set(0, H / 2, 0); ring.scale.z = Math.max(1, fd / fw); ring.castShadow = true; g.add(ring);
    const c = new THREE.Mesh(new THREE.CircleGeometry(W / 2 - fw + 0.01, 48), gm); c.position.set(0, H / 2, 0); c.renderOrder = 3; g.add(c);
    if (o.bars) { bx(g, W - 2 * fw, 0.02, 0.014, fm, 0, H / 2, 0); bx(g, 0.02, W - 2 * fw, 0.014, fm, 0, H / 2, 0); }
    return { group: g, parts, shutParts };
  }
  bx(g, fw, H, fd, fm, -W / 2 + fw / 2, H / 2, 0);
  bx(g, fw, H, fd, fm, W / 2 - fw / 2, H / 2, 0);
  bx(g, W - 2 * fw, fw, fd, fm, 0, H - fw / 2, 0);
  const iw = W - 2 * fw;
  let y1 = fw; // bas de la zone mobile
  if (o.kind === 'window') bx(g, iw, fw, fd, fm, 0, fw / 2, 0);
  else { bx(g, iw, 0.012, fd + 0.02, fm, 0, 0.006, 0); y1 = 0.014; }
  const ih = H - fw - y1;

  // ---- ouvrant de fenêtre ----
  const bars = (s, sw, sh, f) => {
    const n = o.bars || 0;
    for (let k = 1; k < n; k++) {
      bx(s, 0.018, sh - 2 * f, 0.012, fm, f + ((sw - 2 * f) * k) / n, sh / 2, 0);
      bx(s, sw - 2 * f, 0.018, 0.012, fm, sw / 2, f + ((sh - 2 * f) * k) / n, 0);
    }
  };
  const sash = (p, sw, sh, x, y, z, d, handleX) => {
    const f = prof.sfw, s = piv(p, x, y, z);
    bx(s, f, sh, d, fm, f / 2, sh / 2, 0); bx(s, f, sh, d, fm, sw - f / 2, sh / 2, 0);
    bx(s, sw - 2 * f, f, d, fm, sw / 2, f / 2, 0); bx(s, sw - 2 * f, f, d, fm, sw / 2, sh - f / 2, 0);
    glassBox(s, sw - 2 * f + 0.01, sh - 2 * f + 0.01, sw / 2, sh / 2, 0);
    bars(s, sw, sh, f);
    if (handleX != null) { bx(s, 0.02, 0.11, 0.04, hm, handleX, sh / 2, 0); }
    return s;
  };

  // ---- vantail de porte ----
  const leaf = (p, sw, sh, x, y, z, freeRight) => {
    const s = piv(p, x, y, z), th = 0.042, mid = lm;
    const dark = lm.clone(); dark.color = lm.color.clone().multiplyScalar(0.9);
    if (mid === 'vitree' || m.glazed) {
      const f = 0.1, gy0 = sh * 0.36, gy1 = sh - 0.13;
      bx(s, f, sh, th, mid, f / 2, sh / 2, 0); bx(s, f, sh, th, mid, sw - f / 2, sh / 2, 0);
      bx(s, sw - 2 * f, 0.13, th, mid, sw / 2, sh - 0.065, 0);
      bx(s, sw - 2 * f, gy0 - 0.0, th, mid, sw / 2, gy0 / 2, 0);
      bx(s, sw - 2 * f, 0.05, th, mid, sw / 2, gy0 + 0.025, 0);
      glassBox(s, sw - 2 * f, gy1 - gy0 - 0.05, sw / 2, (gy0 + 0.05 + gy1) / 2, 0);
      const n = o.bars || 0; for (let k = 1; k < n; k++) { bx(s, 0.016, gy1 - gy0 - 0.05, 0.012, mid, f + ((sw - 2 * f) * k) / n, (gy0 + 0.05 + gy1) / 2, 0); }
    } else {
      bx(s, sw, sh, th, mid, sw / 2, sh / 2, 0);
      if (mid === 'entree') {
        const gx = freeRight ? sw * 0.28 : sw * 0.72;
        glassBox(s, 0.11, sh * 0.5, gx, sh * 0.66, 0);
        bx(s, 0.14, sh * 0.53, th + 0.006, fm, gx, sh * 0.66, 0).material = fm;
        for (const z2 of [-1, 1]) bx(s, sw - 0.28, sh * 0.2, 0.008, dark, sw / 2, sh * 0.2, z2 * (th / 2));
      } else {
        for (const z2 of [-1, 1]) {
          bx(s, sw - 0.3, sh * 0.34, 0.008, dark, sw / 2, sh * 0.72, z2 * (th / 2));
          bx(s, sw - 0.3, sh * 0.34, 0.008, dark, sw / 2, sh * 0.27, z2 * (th / 2));
        }
      }
    }
    // poignée des deux côtés
    const hx = freeRight ? sw - 0.07 : 0.07, dir = freeRight ? -1 : 1;
    for (const z2 of [-1, 1]) {
      const ro = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.012, 16), hm); ro.rotation.x = Math.PI / 2; ro.position.set(hx, 1.0, z2 * (th / 2 + 0.006)); s.add(ro);
      bx(s, 0.12, 0.018, 0.018, hm, hx + dir * 0.05, 1.0, z2 * (th / 2 + 0.03));
    }
    return s;
  };

  // ================= PORTES =================
  if (o.kind === 'door') {
    const lh = H - fw - y1;
    if (mid === 'passage') {
      // simple encadrement
    } else if (mid === 'double') {
      for (const k of [0, 1]) {
        const h2 = k ? -1 : 1, sw = iw / 2 - 0.002, pv = piv(g, k ? W / 2 - fw : -W / 2 + fw, y1, 0);
        leaf(pv, sw, lh, h2 > 0 ? 0 : -sw, 0, 0, h2 > 0);
        addPart(parts, pv, { rot: ['y', -h2 * side * ANG_DOOR] });
      }
    } else if (mid === 'coulissante') {
      const sw = W + 0.12, zz = side * (t / 2 + 0.04), dirx = hs > 0 ? -1 : 1;
      const pv = piv(g, 0, 0.02, zz), lf = leaf(pv, sw, H + 0.02, -sw / 2, 0, 0, hs < 0);
      addPart(parts, pv, { slide: [dirx * (sw - 0.08), 0, 0] });
      const rail = bx(g, sw * 2 - 0.1, 0.035, 0.035, hm, dirx * (sw / 2 - 0.04), H + 0.07, zz);
      void rail; void lf;
    } else if (mid === 'sectionnelle') {
      // porte sectionnelle : tablier à lames qui s'enroule vers le haut
      const sm = new THREE.MeshStandardMaterial({ color: o.leaf, roughness: 0.5, metalness: 0.2, map: getTexM('lames') });
      const pv = piv(g, 0, H - fw, 0);
      bx(pv, iw, H - fw - y1, 0.04, sm, 0, -(H - fw - y1) / 2, 0, true);
      addPart(parts, pv, { scale: ['y', 1, 0.02] });
    } else {
      const sw = iw - 0.004, pv = piv(g, hs > 0 ? -W / 2 + fw : W / 2 - fw, y1, 0);
      leaf(pv, sw, lh, hs > 0 ? 0 : -sw, 0, 0, hs > 0);
      addPart(parts, pv, { rot: ['y', -hs * side * ANG_DOOR] });
    }
    return { group: g, parts, shutParts };
  }

  // ================= FENÊTRES =================
  const sd = fd * 0.7;
  if (mid === 'fixe') {
    sash(g, iw, ih, -W / 2 + fw, y1, 0, fd * 0.55, null);
  } else if (mid === 'battant1') {
    const pv = piv(g, hs > 0 ? -W / 2 + fw : W / 2 - fw, y1, 0);
    sash(pv, iw - 0.004, ih, hs > 0 ? 0 : -(iw - 0.004), 0, 0, sd, hs > 0 ? iw - 0.06 : -(iw - 0.004) + 0.06);
    addPart(parts, pv, { rot: ['y', -hs * side * ANG_WIN] });
  } else if (mid === 'battant2') {
    for (const k of [0, 1]) {
      const h2 = k ? -1 : 1, sw = iw / 2 - 0.002, pv = piv(g, k ? W / 2 - fw : -W / 2 + fw, y1, 0);
      sash(pv, sw, ih, h2 > 0 ? 0 : -sw, 0, 0, sd, k ? null : sw - 0.05);
      addPart(parts, pv, { rot: ['y', -h2 * side * ANG_WIN] });
    }
  } else if (['coulissant', 'baie2', 'baie2d', 'baie3', 'baie4'].includes(mid)) {
    const n = mid === 'baie4' ? 4 : mid === 'baie3' ? 3 : 2, L = iw / n;
    const rails = n === 4 ? [-0.03, 0.03, 0.03, -0.03] : n === 3 ? [-0.04, 0, 0.04] : [-0.025, 0.025];
    const thick = n >= 3 ? 0.034 : 0.04;
    // sens de glissement et groupe (0 = 1er capteur, 1 = 2e capteur) de chaque vantail
    const mv = n === 4 ? [0, -1, 1, 0] : n === 3 ? [1, 0, -1] : mid === 'baie2d' ? [1, -1] : (hs > 0 ? [1, 0] : [0, -1]);
    const grp = n === 4 ? [0, 0, 1, 0] : n === 3 ? [0, 0, 1] : mid === 'baie2d' ? [0, 1] : [0, 0];
    for (let i = 0; i < n; i++) {
      const pv = piv(g, -W / 2 + fw + i * L - 0.015, y1, rails[i]), slide = mv[i];
      sash(pv, L + 0.03, ih, 0, 0, 0, thick, slide ? (slide > 0 ? L - 0.01 : 0.04) : null);
      if (slide) addPart(parts, pv, { slide: [slide * (L - 0.02), 0, 0], grp: grp[i] });
    }
  }

  // ---- volet roulant (côté extérieur = opposé au sens d'ouverture) ----
  if (o.shutter) {
    const sz = -side * (t / 2 + 0.05);
    const sm = new THREE.MeshStandardMaterial({ color: o.shutterColor, roughness: 0.5, metalness: 0.2, map: getTexM('lames') });
    const cm = new THREE.MeshStandardMaterial({ color: o.shutterColor, roughness: 0.55, metalness: 0.1 });
    bx(g, W + 0.06, 0.2, 0.17, cm, 0, H + 0.1, -side * (t / 2 + 0.07));
    const pv = piv(g, 0, H, sz), cur = bx(pv, W - 0.04, H + 0.02, 0.022, sm, 0, -(H + 0.02) / 2, 0);
    void cur; pv.scale.y = 0.02;
    addPart(shutParts, pv, { scale: ['y', 0.02, 1] });
  }
  return { group: g, parts, shutParts };
}
