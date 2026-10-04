// Textures « photo » calculées pixel par pixel (bruit de valeur, fBm, Voronoï) : veinage du bois, strates et alvéoles du travertin,
// dallage en pierre irrégulière, mur de pierres, terre cuite, béton nuancé, marbre veiné, gazon.
// Les textures restent presque neutres (légères nuances de teinte) : la couleur choisie par l'utilisateur est multipliée dessus.
// Toutes bouclent sans raccord (motif répétable) ; le relief (bump) est tiré de leur luminance.

const cv = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
// résolution : 1 sur ordinateur ; réduite sur les petits écrans (calcul ≈ 3 × plus rapide, différence invisible à cette taille)
let Q = 1;
export function setTexQuality(q) { Q = q; }
const qn = (n) => Math.max(64, Math.round(n * Q));
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// ---- bruit ----
function hash(i, j, s) { let h = (i * 374761393 + j * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
// bruit de valeur lissé ; px, py > 0 : période entière (bruit répétable)
function vnoise(x, y, s, px = 0, py = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  let x0 = xi, x1 = xi + 1, y0 = yi, y1 = yi + 1;
  if (px) { x0 = ((x0 % px) + px) % px; x1 = ((x1 % px) + px) % px; }
  if (py) { y0 = ((y0 % py) + py) % py; y1 = ((y1 % py) + py) % py; }
  const a = hash(x0, y0, s), b = hash(x1, y0, s), c = hash(x0, y1, s), d = hash(x1, y1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, oct = 4, px = 0, py = 0) {
  let sum = 0, amp = 0.5, f = 1, n = 0;
  for (let o = 0; o < oct; o++) { sum += amp * vnoise(x * f, y * f, s + o * 17, px * f, py * f); n += amp; amp *= 0.5; f *= 2; }
  return sum / n;
}
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function out(c, w, h, fn) {   // fn(x, y) → [r, g, b] dans [0, 1]
  const x = c.getContext('2d', { willReadFrequently: true }), img = x.createImageData(w, h), d = img.data;
  for (let j = 0, k = 0; j < h; j++) for (let i = 0; i < w; i++, k += 4) { const p = fn(i, j); d[k] = p[0] * 255; d[k + 1] = p[1] * 255; d[k + 2] = p[2] * 255; d[k + 3] = 255; }
  x.putImageData(img, 0, 0); return c;
}
const P3 = [0, 0, 0];
const rgb = (v, warm = 0) => { P3[0] = clamp01(v * (1 + warm)); P3[1] = clamp01(v); P3[2] = clamp01(v * (1 - warm * 1.2)); return P3; };

// ---- bois : veinage le long de u (m), à travers v (m) ; s = graine de la pièce ----
function grain(u, v, s, k = 1) {
  const g = fbm(u * 1.1 + s, v * 26 * k + s * 3.1, s, 4);               // veines longues et ondulées
  const f = vnoise(u * 9 + s, v * 230 * k, s + 5);                       // fibres fines
  const ring = 0.5 + 0.5 * Math.sin((v * 55 * k + g * 9 + Math.sin(u * 0.8 + s) * 1.4) * Math.PI);
  return 0.84 + 0.2 * g - 0.09 * ring * ring * ring + 0.05 * (f - 0.5);
}

// ---- marbre : veines fines et ramifiées (sinus perturbé par un bruit turbulent, épaisseur régulière) + voile nuageux ----
// u, v en m ; per > 0 : u, v ∈ [0, 1[ sur un motif répétable de per mètres (fréquences arrondies à un nombre entier de périodes)
function marbleVein(u, v, s, per = 0) {
  const N = (f, seed, oct) => { if (!per) return fbm(u * f, v * f, seed, oct); const F = Math.max(1, Math.round(f * per)); return fbm(u * F, v * F, seed, oct, F, F); };
  const a = hash(s, 3, 7) * Math.PI, ca = per ? 2 : Math.cos(a) * 2.2, sa = per ? 1 : Math.sin(a) * 2.2, cb = per ? -1 : -1.3, sb = per ? 3 : 3;
  const w = N(1.4, s + 5, 4) * 3.4, w2 = N(2.6, s + 9, 3) * 2.6;
  const d1 = Math.abs(Math.sin((u * ca + v * sa + w) * Math.PI));          // 0 sur une veine principale
  const d2 = Math.abs(Math.sin((u * cb + v * sb + w2 + w) * Math.PI));     // veinules secondaires, en biais
  const f1 = smooth(0.3, 0.62, N(1.8, s + 13, 2)), f2 = smooth(0.45, 0.7, N(2.2, s + 15, 2));   // les veines s'estompent par endroits
  const main = 0.5 * Math.exp(-d1 * d1 * 1100) + 0.1 * Math.exp(-d1 * d1 * 45), sec = 0.3 * Math.exp(-d2 * d2 * 2600) + 0.05 * Math.exp(-d2 * d2 * 120);
  return (0.965 + 0.06 * N(2.4, s + 21, 3)) * (1 - main * f1 - sec * f2);
}

// ---- lames de parquet / terrasse (mêmes options que l'ancien générateur) ----
// o : { W, H (m), rows, ppm, minL, maxL (m), joint (px), bg (0-255), base, vary, seed }
export function boardsPix(o) {
  const ppm = o.ppm * Q, cw = Math.round(o.W * ppm), ch = Math.round(o.H * ppm), c = cv(cw, ch), r = rng(o.seed), rh = ch / o.rows, j = Math.max(1.5, o.joint * Q), bg = o.bg / 255;
  const rows = [];
  for (let i = 0; i < o.rows; i++) {
    const ls = []; let tot = 0;
    while (tot < cw) { const l = (o.minL + r() * (o.maxL - o.minL)) * ppm; ls.push(l); tot += l; }
    const k = cw / tot; let px = r() * cw;
    const idx = new Int16Array(cw), loc = new Float32Array(cw), bs = [];
    ls.forEach((l0, n) => {
      const len = l0 * k, b = { len, tone: ((o.base ?? 210) + (r() - 0.5) * (o.vary ?? 40)) / 255, warm: (r() - 0.5) * 0.08, s: Math.floor(r() * 9000) + 11, knot: r() < 0.3 ? [r() * len, 0.25 + r() * 0.5, (4 + r() * 6) * Q] : null };
      bs.push(b);
      for (let t = 0; t < Math.ceil(len); t++) { const X = Math.floor(px + t) % cw; idx[X] = n; loc[X] = t + (px - Math.floor(px)); }
      px += len;
    });
    rows.push({ idx, loc, bs });
  }
  return out(c, cw, ch, (x, y) => {
    const i = Math.min(o.rows - 1, Math.floor(y / rh)), row = rows[i], b = row.bs[row.idx[x]], u = row.loc[x], v = y - i * rh;
    if (u < j / 2 || u > b.len - j / 2 || v < j / 2 || v > rh - j / 2) return rgb(bg);
    let val = b.tone * grain(u / ppm, v / ppm, b.s);
    if (b.knot) { const dx = (u - b.knot[0]) / (b.knot[2] * 2.2), dy = (v - b.knot[1] * rh) / b.knot[2], dd = Math.sqrt(dx * dx + dy * dy); if (dd < 2.2) val *= 1 - 0.28 * Math.max(0, 1 - dd) - 0.06 * (0.5 + 0.5 * Math.sin(dd * 9)) * (1 - dd / 2.2); }
    const e = Math.min(u - j / 2, b.len - j / 2 - u, v - j / 2, rh - j / 2 - v) / Q;   // chanfrein : bords légèrement plus sombres
    if (e < 2) val *= 0.9 + 0.05 * e;
    return rgb(val, b.warm);
  });
}

// ---- carrelages, dalles, pierres taillées : mêmes options que slabTex (tw, th, nx, ny, stagger, rows, style, seed, joint, base, vary, k) ----
export function slabPix(o) {
  const rows = o.rows || Array.from({ length: o.ny }, (_, j) => ({ h: o.th, ws: Array(o.nx).fill(o.tw), off: o.k != null ? (o.k ? ((j % o.k) * o.tw) / o.k : 0) : (j % 2) * (o.stagger || 0) * o.tw }));
  const W = rows[0].ws.reduce((a, b) => a + b, 0), H = rows.reduce((a, r) => a + r.h, 0);
  const ppm = Q * Math.min(640 / Math.min(W, H), 1400 / Math.max(W, H)), cw = Math.round(W * ppm), ch = Math.round(H * ppm), c = cv(cw, ch), r = rng(o.seed || 5);
  const st = o.style || 'gres', jt = Math.max(1.6, (o.joint ?? 0.004) * ppm);
  const grout = st === 'travertin' ? 0.74 : st === 'terre' ? 0.66 : st === 'ardoise' ? 0.42 : 0.58;
  // lignes de dalles : pour chaque ligne, index de dalle et coordonnée locale de chaque colonne de pixels
  let y0 = 0;
  const L = rows.map((row) => {
    const rh = row.h * ppm, idx = new Int16Array(cw), loc = new Float32Array(cw), ts = []; let px = (row.off || 0) * ppm;
    row.ws.forEach((wv, n) => {
      const tw = wv * ppm; ts.push({ tw, tone: ((o.base ?? 222) + (r() - 0.5) * (o.vary ?? 22)) / 255, warm: (r() - 0.5) * (st === 'terre' ? 0.16 : st === 'travertin' ? 0.07 : 0.03), s: Math.floor(r() * 9000) + 7 });
      for (let t = 0; t < Math.ceil(tw); t++) { const X = ((Math.floor(px + t) % cw) + cw) % cw; idx[X] = n; loc[X] = t + (px - Math.floor(px)); }
      px += tw;
    });
    const R0 = { y0, rh, idx, loc, ts }; y0 += rh; return R0;
  });
  const rowOf = new Int16Array(ch); L.forEach((R0, n) => { for (let y = Math.floor(R0.y0); y < Math.min(ch, Math.ceil(R0.y0 + R0.rh)); y++) rowOf[y] = n; });
  return out(c, cw, ch, (x, y) => {
    const R0 = L[rowOf[y]], t = R0.ts[R0.idx[x]], u = R0.loc[x], v = y - R0.y0;
    const e = Math.min(u, t.tw - u, v, R0.rh - v);
    if (e < jt / 2) return rgb(t.tone * grout + 0.03 * vnoise(u * 0.7, v * 0.7, t.s + 3));
    const um = u / ppm, vm = v / ppm; let val = t.tone;
    if (st === 'travertin') {
      const band = fbm(um * 0.45 + t.s, vm * 16 + t.s * 0.3, t.s, 5);                          // strates fines, horizontales
      const cloud = fbm(um * 1.6, vm * 1.6, t.s + 9, 3);
      val *= 0.95 + 0.09 * cloud - 0.08 * smooth(0.55, 0.75, band) + 0.04 * smooth(0.32, 0.15, band);
      const pit = vnoise(um * 16 + t.s, vm * 70, t.s + 4);                                           // petites alvéoles allongées dans le sens des strates
      if (pit > 0.9) val *= 0.9 - (pit - 0.9) * 1.2;
      val += 0.025 * (vnoise(u * 0.9, v * 0.9, t.s + 21) - 0.5);
    } else if (st === 'marbre') {
      val *= marbleVein(um, vm, t.s);
    } else if (st === 'beton') {
      val *= 0.9 + 0.2 * fbm(um * 1.6, vm * 1.6, t.s, 5); if (vnoise(u * 0.5, v * 0.5, t.s + 13) > 0.93) val *= 0.9;
    } else if (st === 'bois') {
      val *= grain(um, vm, t.s, 1.2);
    } else if (st === 'ardoise') {
      val *= 0.85 + 0.28 * fbm(um * 0.9, vm * 7, t.s, 5); val += 0.04 * (vnoise(u * 1.3, v * 1.3, t.s + 7) - 0.5);
    } else if (st === 'terre') {
      val *= 0.86 + 0.22 * fbm(um * 3, vm * 3, t.s, 4); if (vnoise(um * 60, vm * 60, t.s) > 0.9) val *= 0.92;
    } else {   // grès cérame : très léger nuage + moucheture fine
      val *= 0.96 + 0.07 * fbm(um * 2, vm * 2, t.s, 4); val += 0.02 * (vnoise(u * 1.1, v * 1.1, t.s + 5) - 0.5);
    }
    if (e < jt / 2 + 1.5) val *= 0.93;   // arête de la dalle
    return rgb(val, t.warm);
  });
}

// ---- pierres irrégulières (Voronoï répétable sur une grille gx × gy de germes) ----
// o : { size (px), gx, gy, sy (étirement vertical), joint (0-1), mortar (0-1), seed, base, vary, palette: écarts de teinte }
function voronoiPix(o) {
  const W = qn(o.w), H = qn(o.h), c = cv(W, H), r = rng(o.seed), cx = W / o.gx, cy = H / o.gy, S = [];
  for (let j = 0; j < o.gy; j++) for (let i = 0; i < o.gx; i++) S.push({ x: (i + 0.04 + r() * 0.92) * cx, y: (j + 0.04 + r() * 0.92) * cy, tone: (o.base + (r() - 0.5) * o.vary) / 255, warm: (r() - 0.5) * (o.hue ?? 0.14), s: Math.floor(r() * 9000) });
  return out(c, W, H, (x, y) => {
    const gi = Math.floor(x / cx), gj = Math.floor(y / cy); let d1 = 1e9, d2 = 1e9, best = null, bx = 0, by = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      let ii = gi + di, jj = gj + dj, ox = 0, oy = 0;
      if (ii < 0) { ii += o.gx; ox = -W; } else if (ii >= o.gx) { ii -= o.gx; ox = W; }
      if (jj < 0) { jj += o.gy; oy = -H; } else if (jj >= o.gy) { jj -= o.gy; oy = H; }
      const s = S[jj * o.gx + ii], dx = s.x + ox - x, dy = (s.y + oy - y) * (o.sy || 1), d = dx * dx + dy * dy;
      if (d < d1) { d2 = d1; d1 = d; best = s; bx = s.x + ox; by = s.y + oy; } else if (d < d2) d2 = d;
    }
    // joints irréguliers (bruit répétable) ; texture de la pierre en coordonnées locales à son germe (continue au raccord du motif)
    const edge = (Math.sqrt(d2) - Math.sqrt(d1)) / Math.min(cx, cy), wob = 0.06 * (fbm((x / W) * 40, (y / H) * 40, 9, 2, 40, 40) - 0.5);
    if (edge + wob < o.joint) return rgb(o.mortar + 0.05 * (vnoise((x / W) * 600, (y / H) * 600, 4, 600, 600) - 0.5));
    const lx = (x - bx) / cx, ly = (y - by) / cy, e = edge + wob, G = o.grain || 300;
    let val = best.tone * (0.86 + 0.24 * fbm(lx * 1.3 + best.s, ly * 1.3, best.s, 4));
    val *= 0.93 + 0.14 * vnoise((x / W) * G, (y / H) * G * (H / W), best.s + 3, G, Math.round(G * (H / W)));   // grain fin de la pierre
    val *= (1 - (o.round || 0.12)) + (o.round || 0.12) * smooth(o.joint, o.joint + (o.bevel || 0.06), e);   // arêtes arrondies, plus sombres
    if (o.relief) val *= 1 + o.relief * (0.25 - 0.5 * (lx + ly));   // pierres bombées éclairées par le haut
    return rgb(val, best.warm);
  });
}
export const opusPix = () => voronoiPix({ w: 1024, h: 1024, gx: 5, gy: 5, joint: 0.035, mortar: 0.6, seed: 77, base: 214, vary: 46, hue: 0.12, round: 0.1, bevel: 0.03 });   // dallage opus incertum (motif 2 × 2 m)
export const stoneWallPix = () => voronoiPix({ w: 1024, h: 768, gx: 9, gy: 10, sy: 1.7, joint: 0.06, mortar: 0.55, seed: 91, base: 210, vary: 60, hue: 0.14, round: 0.3, bevel: 0.16, relief: 0.35 });   // mur de pierres (motif 1,6 × 1,2 m)

// ---- bois des meubles (répétable, veinage le long de x) ----
export function woodPix() {
  const n = qn(512), c = cv(n);
  return out(c, n, n, (x, y) => {
    const u = x / n, v = y / n, g = fbm(u * 4, v * 40, 3, 4, 4, 40), f = vnoise(u * 32, v * 400, 5, 32, 400);
    const ring = 0.5 + 0.5 * Math.sin((v * 36 + g * 7) * Math.PI * 2);
    return rgb(0.86 + 0.2 * g - 0.1 * ring * ring * ring + 0.05 * (f - 0.5), 0.02);
  });
}
// ---- marbre en grandes plaques (répétable : plans de travail, sol « Marbre ») ----
export function marblePix() {
  const n = qn(768), c = cv(n);
  return out(c, n, n, (x, y) => rgb(0.985 * marbleVein(x / n, y / n, 41, 1.2), -0.01));
}
// ---- gravier (répétable) : petits cailloux arrondis éclairés par le haut, gravillons sombres entre eux ----
export function gravelPix() {
  const n = qn(768), g = 96, cell = n / g, c = cv(n), r = rng(17), SX = new Float32Array(g * g), SY = new Float32Array(g * g), T = new Float32Array(g * g), WM = new Float32Array(g * g);
  for (let k = 0; k < g * g; k++) { SX[k] = ((k % g) + 0.12 + r() * 0.76) * cell; SY[k] = (Math.floor(k / g) + 0.12 + r() * 0.76) * cell; T[k] = 0.62 + r() * 0.45; WM[k] = (r() - 0.5) * 0.16; }
  return out(c, n, n, (x, y) => {
    const gi = Math.floor(x / cell), gj = Math.floor(y / cell); let d1 = 1e9, d2 = 1e9, b = 0, bx = 0, by = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      let ii = gi + di, jj = gj + dj, ox = 0, oy = 0;
      if (ii < 0) { ii += g; ox = -n; } else if (ii >= g) { ii -= g; ox = n; }
      if (jj < 0) { jj += g; oy = -n; } else if (jj >= g) { jj -= g; oy = n; }
      const k = jj * g + ii, dx = SX[k] + ox - x, dy = SY[k] + oy - y, d = dx * dx + dy * dy;
      if (d < d1) { d2 = d1; d1 = d; b = k; bx = SX[k] + ox; by = SY[k] + oy; } else if (d < d2) d2 = d;
    }
    const big = 0.94 + 0.1 * fbm((x / n) * 3, (y / n) * 3, 18, 3, 3, 3), edge = (Math.sqrt(d2) - Math.sqrt(d1)) / cell;
    if (edge < 0.07) return rgb(0.38 * big + 0.1 * hash(x, y, 19));
    const ox = (x - bx) / cell, oy = (y - by) / cell, lit = 1 - 0.6 * (ox + oy);   // galet bombé éclairé par le haut à gauche
    return rgb(T[b] * big * (0.62 + 0.38 * smooth(0.07, 0.42, edge)) * (0.84 + 0.16 * lit), WM[b]);
  });
}
// ---- laine des tapis (répétable) : mèches serrées, poils un peu plus clairs au sommet ----
export function woolPix() {
  const n = qn(512), c = cv(n);
  return out(c, n, n, (x, y) => {
    const u = x / n, v = y / n, tuft = vnoise(u * 160, v * 160, 41, 160, 160), cl = fbm(u * 6, v * 6, 42, 3, 6, 6);
    return rgb(0.8 + 0.12 * tuft * tuft + 0.08 * cl + 0.04 * (vnoise(u * 400, v * 400, 43, 400, 400) - 0.5), 0.01);
  });
}
// ---- béton ciré (répétable) ----
export function concretePix() {
  const n = qn(512), c = cv(n);
  return out(c, n, n, (x, y) => {
    const u = x / n, v = y / n; let val = 0.8 + 0.22 * fbm(u * 4, v * 4, 31, 5, 4, 4);
    if (vnoise(u * 256, v * 256, 32, 256, 256) > 0.94) val *= 0.88;
    return rgb(val + 0.02 * (vnoise(u * 768, v * 768, 33, 768, 768) - 0.5));
  });
}
// ---- gazon (répétable) ----
export function grassPix() {
  const n = qn(512), c = cv(n);
  return out(c, n, n, (x, y) => {
    const u = x / n, v = y / n, patch = fbm(u * 6, v * 6, 71, 4, 6, 6), blade = vnoise(u * 180, v * 60, 72, 180, 60);
    const val = 0.62 + 0.3 * patch + 0.22 * (blade - 0.5); return rgb(val, (patch - 0.5) * 0.25);
  });
}
