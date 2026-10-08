// Escaliers : droit (marches suspendues), quart tournant avec palier, demi-tour avec palier, demi-tour balancé, hélicoïdal.
// Même repère que catalog.js : origine au sol au centre, +x largeur, +z face avant. On arrive par la face avant (+z) et on monte vers l'arrière (-z).
// w × d = emprise, h = hauteur à franchir (sol fini à sol fini). Le nombre de marches découle des dimensions (giron ≈ 26 cm), sauf pour le droit et l'hélicoïdal.
// Variante : sens du virage vu de celui qui monte (à gauche / à droite).
import * as THREE from 'three';

const TH = 0.04, GIRON = 0.26;
const RP = { k: 'rp', l: 'Main courante', list: [[1, 'Avec'], [0, 'Sans']], def: 1 };
const SW = { k: 'sw', l: 'Largeur des marches (m)', min: 0.6, max: 1.4, step: 0.05, def: 0.8, unit: 'm' };
const VAR = ['Virage à gauche', 'Virage à droite'];

export function registerEscaliers(reg) {
  // ----- outils communs -----
  const tools = (g, p, K) => {
    const wood = K.m(p.c1, { r: 0.6 }), white = K.m(p.c2, { r: 0.45 }), metal = K.m('#2e3338', { r: 0.35, m: 0.6 });
    const tread = (w, d, x, top, z) => K.box(w, TH, d, wood, x, top - TH / 2, z);
    const slab = (w, d, x, top, z) => K.box(w, TH * 1.5, d, wood, x, top - TH * 0.75, z);
    const wedge = (pts, top) => {   // marche balancée : polygone [x, z] dont la face supérieure est à la hauteur « top »
      const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))), { depth: TH, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, wood); m.position.y = top - TH; m.castShadow = m.receiveShadow = true; g.add(m); return m;
    };
    const beam = (a, b, wd = 0.04, ht = 0.22) => {   // limon : poutre entre deux points [x, y, z]
      const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), m = K.box(wd, ht, v.length(), white, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), v.normalize()); return m;
    };
    const post = (x, z, y0, y1) => K.box(0.05, y1 - y0, 0.05, white, x, (y0 + y1) / 2, z);
    const rail = (pts) => {   // main courante : tube suivant la ligne de nez de marches + poteaux aux extrémités
      K.tube(pts, 0.022, metal);
      for (const q of [pts[0], pts[pts.length - 1]]) K.cyl(0.014, 0.014, 0.9, metal, q[0], q[1] - 0.45, q[2], null, 8);
    };
    return { s: p.v ? -1 : 1, sw: Math.max(0.5, Math.min(p.sw || 0.8, p.w - 0.1, p.d - 0.1)), rp: +(p.rp ?? 1), tread, slab, wedge, beam, post, rail };
  };
  const common = { fin: null, lock: false };

  // ---------- droit : marches « flottantes » entre deux limons inclinés ----------
  reg('escalier_droit', 'Structure', 'Escalier droit (marches suspendues)', 0.58, 3.42, 2.4, 1290, [['Marches', '#f2f3f3'], ['Limons', '#ffffff']], (g, p, K) => {
    const T = tools(g, p, K), nb = Math.round(p.nb || 12), run = p.d - 0.22, tw = p.w - 0.05, r = p.h / (nb + 1);
    for (let i = 1; i <= nb; i++) T.tread(tw, 0.22, 0, r * i, run / 2 - (run * i) / (nb + 1));
    const len = Math.hypot(run, p.h), ang = Math.atan2(p.h, run);
    for (const s of [-1, 1]) { const st = K.box(0.035, 0.24, len, K.m(p.c2, { r: 0.45 }), s * (p.w / 2 - 0.0175), p.h / 2 + 0.06, 0); st.rotation.x = ang; }
    if (T.rp) for (const s of [-1, 1]) T.rail([[s * (p.w / 2 - 0.02), 0.9, run / 2], [s * (p.w / 2 - 0.02), r * nb + 0.9, run / 2 - (run * nb) / (nb + 1)]]);
  }, { ...common, fields: [{ k: 'nb', l: 'Nombre de marches', min: 6, max: 20, step: 1, def: 12, unit: '' }], selects: [{ ...RP, def: 0 }] });

  // ---------- quart tournant avec palier ----------
  reg('escalier_quart', 'Structure', 'Escalier quart tournant (palier)', 2.2, 3.0, 2.5, 1890, [['Marches', '#c8a57a'], ['Limons', '#ffffff']], (g, p, K) => {
    const T = tools(g, p, K), { s, sw } = T, w = p.w, d = p.d;
    const n1 = Math.max(2, Math.round((d - sw) / GIRON)), n2 = Math.max(2, Math.round((w - sw) / GIRON)), N = n1 + 1 + n2, r = p.h / (N + 1);
    const t1 = (d - sw) / n1, t2 = (w - sw) / n2, xc = s * (w / 2 - sw / 2), zl = -d / 2 + sw / 2, xin = xc - s * sw / 2;
    for (let k = 0; k < n1; k++) T.tread(sw, t1, xc, r * (k + 1), d / 2 - (k + 0.5) * t1);
    T.slab(sw, sw, xc, r * (n1 + 1), zl);
    for (let k = 0; k < n2; k++) T.tread(t2, sw, xin - s * (k + 0.5) * t2, r * (n1 + 2 + k), zl);
    for (const e of [-1, 1]) {   // limons des deux volées
      T.beam([xc + e * sw / 2, r - 0.12, d / 2], [xc + e * sw / 2, r * (n1 + 1) - 0.12, -d / 2 + sw]);
      T.beam([xin, r * (n1 + 1) - 0.12, zl + e * sw / 2], [-s * w / 2, r * N - 0.12, zl + e * sw / 2]);
    }
    for (const a of [-1, 1]) for (const b of [-1, 1]) T.post(xc + a * (sw / 2 - 0.03), zl + b * (sw / 2 - 0.03), 0, r * (n1 + 1) - 0.06);
    if (T.rp) { const xo = s * (w / 2 - 0.02), zo = -d / 2 + 0.02; T.rail([[xo, 0.9, d / 2], [xo, r * (n1 + 1) + 0.9, zo]]); T.rail([[xo, r * (n1 + 1) + 0.9, zo], [-s * w / 2, r * N + 0.9, zo]]); }
  }, { ...common, variants: VAR, fields: [SW], selects: [RP] });

  // ---------- demi-tour avec palier ----------
  reg('escalier_demi_tour', 'Structure', 'Escalier demi-tour (palier)', 1.9, 2.4, 2.5, 2190, [['Marches', '#c8a57a'], ['Limons', '#ffffff']], (g, p, K) => {
    const T = tools(g, p, K), { s, sw } = T, w = p.w, d = p.d;
    const nA = Math.max(2, Math.round((d - sw) / GIRON)), N = 2 * nA + 1, r = p.h / (N + 1), tA = (d - sw) / nA, xA = s * (w / 2 - sw / 2), zl = -d / 2 + sw / 2;
    for (let k = 0; k < nA; k++) { T.tread(sw, tA, xA, r * (k + 1), d / 2 - (k + 0.5) * tA); T.tread(sw, tA, -xA, r * (nA + 2 + k), -d / 2 + sw + (k + 0.5) * tA); }
    T.slab(w, sw, 0, r * (nA + 1), zl);
    for (const e of [-1, 1]) {
      T.beam([xA + e * sw / 2, r - 0.12, d / 2], [xA + e * sw / 2, r * (nA + 1) - 0.12, -d / 2 + sw]);
      T.beam([-xA + e * sw / 2, r * (nA + 1) - 0.12, -d / 2 + sw], [-xA + e * sw / 2, r * N - 0.12, d / 2]);
    }
    for (const a of [-1, 1]) for (const b of [-1, 1]) T.post(a * (w / 2 - 0.03), zl + b * (sw / 2 - 0.03), 0, r * (nA + 1) - 0.06);
    if (T.rp) { const xo = s * (w / 2 - 0.02), zo = -d / 2 + 0.02, y = r * (nA + 1) + 0.9; T.rail([[xo, 0.9, d / 2], [xo, y, zo], [-xo, y, zo], [-xo, r * N + 0.9, d / 2]]); }
  }, { ...common, variants: VAR, fields: [SW], selects: [RP] });

  // ---------- demi-tour balancé : six marches triangulaires autour d'un noyau central ----------
  reg('escalier_balance', 'Structure', 'Escalier demi-tour balancé', 1.9, 1.9, 2.5, 2390, [['Marches', '#c8a57a'], ['Limons', '#ffffff']], (g, p, K) => {
    const T = tools(g, p, K), { s, sw } = T, w = p.w, d = p.d, NW = 6;
    const nA = Math.max(2, Math.round((d - sw) / GIRON)), N = 2 * nA + NW, r = p.h / (N + 1), tA = (d - sw) / nA, xA = s * (w / 2 - sw / 2);
    const zf0 = -d / 2, zf1 = -d / 2 + sw, hit = (f) => {   // intersection du rayon issu du pivot (0, zf1) avec le contour du palier
      const c = Math.cos(f), n = Math.sin(f), sx = Math.abs(c) > 1e-6 ? (w / 2) / Math.abs(c) : 1e9, sz = n > 1e-6 ? (zf1 - zf0) / n : 1e9, t = Math.min(sx, sz);
      return [s * c * t, zf1 - n * t];
    };
    const corner = Math.atan2(zf1 - zf0, w / 2);
    for (let k = 0; k < nA; k++) { T.tread(sw, tA, xA, r * (k + 1), d / 2 - (k + 0.5) * tA); T.tread(sw, tA, -xA, r * (nA + NW + 1 + k), zf1 + (k + 0.5) * tA); }
    for (let k = 0; k < NW; k++) {
      const f0 = (k * Math.PI) / NW, f1 = ((k + 1) * Math.PI) / NW, pts = [[0, zf1], hit(f0)];
      for (const c of [corner, Math.PI - corner]) if (c > f0 + 1e-6 && c < f1 - 1e-6) pts.push(hit(c));
      pts.push(hit(f1)); T.wedge(pts, r * (nA + 1 + k));
    }
    K.cyl(0.05, 0.05, p.h * 0.65, K.m(p.c2, { r: 0.45 }), 0, p.h * 0.325, zf1, null, 12);
    for (const [x, z] of [[w / 2 - 0.03, zf0 + 0.03], [-w / 2 + 0.03, zf0 + 0.03]]) T.post(x, z, 0, r * (nA + 3));
    for (const e of [-1, 1]) T.beam([xA + e * sw / 2, r - 0.12, d / 2], [xA + e * sw / 2, r * nA - 0.12, zf1]);
    for (const e of [-1, 1]) T.beam([-xA + e * sw / 2, r * (nA + NW) - 0.12, zf1], [-xA + e * sw / 2, r * N - 0.12, d / 2]);
    if (T.rp) {
      const xo = s * (w / 2 - 0.02), y0 = r * nA + 0.9, path = [[xo, 0.9, d / 2], [xo, y0, zf1 - 0.02]];
      for (let k = 1; k < NW; k++) { const q = hit((k * Math.PI) / NW); path.push([q[0] * 0.97, r * (nA + k) + 0.9, q[1] + (zf1 - q[1]) * 0.03]); }
      path.push([-xo, r * (nA + NW) + 0.9, zf1 - 0.02], [-xo, r * N + 0.9, d / 2]); T.rail(path);
    }
  }, { ...common, variants: VAR, fields: [SW], selects: [RP] });

  // ---------- hélicoïdal (colimaçon) ----------
  reg('escalier_colimacon', 'Structure', 'Escalier hélicoïdal (colimaçon)', 1.5, 1.5, 2.5, 1790, [['Marches', '#c8a57a'], ['Colonne', '#ffffff']], (g, p, K) => {
    const T = tools(g, p, K), s = T.s, N = Math.round(p.nb || 13), r = p.h / (N + 1), R = Math.min(p.w, p.d) / 2, ri = 0.07, da = Math.PI / 6, metal = K.m('#2e3338', { r: 0.35, m: 0.6 });
    const at = (a, rad) => [s * Math.sin(a) * rad, Math.cos(a) * rad];
    for (let k = 0; k < N; k++) {
      const a0 = k * da, a1 = a0 + da * 1.12, pts = [at(a0, ri), at(a0, R)];
      for (let j = 1; j <= 3; j++) pts.push(at(a0 + ((a1 - a0) * j) / 3, R));
      pts.push(at(a1, ri)); T.wedge(pts, r * (k + 1));
    }
    K.cyl(0.055, 0.055, p.h + 0.9, K.m(p.c2, { r: 0.45 }), 0, (p.h + 0.9) / 2, 0, null, 16);
    if (T.rp) {
      const pts = []; for (let k = 0; k <= N; k++) { const q = at(k * da + da * 0.5, R - 0.03); pts.push([q[0], r * k + 0.9 + r * 0.5, q[1]]); }
      K.tube(pts, 0.022, metal); for (let k = 0; k <= N; k += 2) { const q = at(k * da + da * 0.5, R - 0.03); K.cyl(0.012, 0.012, 0.9, metal, q[0], r * k + r * 0.5 + 0.45, q[1], null, 8); }
    }
  }, { ...common, variants: ['Sens horaire', 'Sens anti-horaire'], fields: [{ k: 'nb', l: 'Nombre de marches', min: 8, max: 20, step: 1, def: 13, unit: '' }], selects: [RP] });
}
