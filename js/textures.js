// Textures procédurales (canvas) pour sols, murs et menuiseries.
// Chaque texture est en niveaux de gris : la « couleur » choisie par l'utilisateur est multipliée dessus.
import * as THREE from 'three';
import { hexToRgb } from './util.js';
import { boardsPix, slabPix, opusPix, stoneWallPix, woodPix, concretePix, grassPix, marblePix, gravelPix, setTexQuality } from './texgen.js';
setTexQuality(Math.min(screen.width, screen.height) < 700 ? 0.6 : 1);   // textures calculées moins finement sur téléphone

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const cv = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const grey = (v) => `rgb(${v | 0},${v | 0},${v | 0})`;

// dessine une forme avec bouclage sur les bords du canevas (texture répétable)
function wrapDraw(c, fn) {
  for (const dx of [-c.width, 0, c.width]) for (const dy of [-c.height, 0, c.height]) fn(dx, dy);
}
function noise(x, c, amp, seed, alpha = 1) {
  const r = rng(seed), img = x.getImageData(0, 0, c.width, c.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 2 * amp * alpha; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(img, 0, 0);
}
function blotches(c, x, n, seed, a) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const px = r() * c.width, py = r() * c.height, rr = 20 + r() * 90, dark = r() < 0.5;
    wrapDraw(c, (dx, dy) => {
      const g = x.createRadialGradient(px + dx, py + dy, 0, px + dx, py + dy, rr);
      g.addColorStop(0, dark ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(px + dx - rr, py + dy - rr, rr * 2, rr * 2);
    });
  }
}

// rangées de lames qui couvrent exactement la période du motif (veinage calculé pixel par pixel : js/texgen.js)
const boards = boardsPix;

const GEN = {
  // parquet classique : lames de 12,5 cm de large et 0,6 à 1,2 m de long (motif 2 × 1 m)
  parquet: () => boards({ W: 2, H: 1, rows: 8, ppm: 512, minL: 0.6, maxL: 1.2, joint: 2, bg: 165, base: 226, vary: 34, seed: 7 }),
  tile(n, k = 0) {   // k : rangées décalées de 1/k de carreau (pose en quinconce) ; le motif compte alors un multiple de k rangées
    return () => {
      const ny = k ? k * Math.ceil(n / k) : n, s = 512 / n, c = cv(512, Math.round(ny * s)), x = c.getContext('2d', { willReadFrequently: true }), r = rng(11 + n);
      x.fillStyle = grey(120); x.fillRect(0, 0, 512, c.height);
      for (let j = 0; j < ny; j++) for (let i = 0; i < n; i++) {
        const t = 226 + r() * 22, off = k ? ((j % k) * s) / k : 0, m = n > 2 ? 2 : 3;
        for (const ox of [-512, 0]) {
          const x0 = i * s + off + ox, g = x.createLinearGradient(x0, j * s, x0 + s, (j + 1) * s);
          g.addColorStop(0, grey(t + 6)); g.addColorStop(1, grey(t - 8)); x.fillStyle = g; x.fillRect(x0 + m, j * s + m, s - 2 * m, s - 2 * m);
        }
      }
      noise(x, c, 4, 5);
      return c;
    };
  },
  carpet() {
    const c = cv(256), x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = grey(205); x.fillRect(0, 0, 256, 256);
    noise(x, c, 26, 31);
    const r = rng(32); x.strokeStyle = 'rgba(0,0,0,0.07)';
    for (let i = 0; i < 700; i++) { const px = r() * 256, py = r() * 256; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 5, py + (r() - 0.5) * 5); x.stroke(); }
    return c;
  },
  checker() {
    const c = cv(512), x = c.getContext('2d', { willReadFrequently: true });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? grey(110) : grey(250); x.fillRect(i * 128, j * 128, 128, 128); }
    noise(x, c, 4, 61);
    return c;
  },
  crepi() {
    const c = cv(512), x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = grey(236); x.fillRect(0, 0, 512, 512);
    noise(x, c, 14, 71); blotches(c, x, 30, 72, 0.04);
    return c;
  },
  // briques 22 × 6,5 cm : motif de 4 briques × 15 rangées (0,88 × 0,975 m)
  brique() {
    const c = cv(704, 780), x = c.getContext('2d', { willReadFrequently: true }), r = rng(81);
    x.fillStyle = grey(200); x.fillRect(0, 0, 704, 780);
    for (let j = 0; j < 15; j++) for (let i = -1; i < 4; i++) {
      const px = i * 176 + (j % 2 ? 88 : 0), py = j * 52, t = 165 + r() * 70;
      x.fillStyle = grey(t); x.fillRect(px + 3, py + 3, 170, 46);
      if (px + 176 > 704) { x.fillRect(px - 704 + 3, py + 3, 170, 46); }
    }
    noise(x, c, 12, 82);
    return c;
  },
  lambris() {
    const c = cv(512), x = c.getContext('2d', { willReadFrequently: true }), r = rng(91);
    for (let i = 0; i < 5; i++) {
      const t = 205 + r() * 35, px = i * 102.4;
      x.fillStyle = grey(t); x.fillRect(px, 0, 102.4, 512);
      x.strokeStyle = 'rgba(60,40,20,0.10)';
      for (let k = 0; k < 16; k++) { const xx = px + 6 + r() * 90; x.beginPath(); x.moveTo(xx, 0); x.bezierCurveTo(xx + 4, 170, xx - 4, 340, xx + 1, 512); x.stroke(); }
      x.fillStyle = 'rgba(0,0,0,0.38)'; x.fillRect(px, 0, 3, 512);
      x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(px + 3, 0, 2, 512);
    }
    return c;
  },
  // faïence « métro » 20 × 10 cm : motif 0,4 × 0,4 m
  metro() {
    const c = cv(512), x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = grey(190); x.fillRect(0, 0, 512, 512);
    for (let j = 0; j < 4; j++) for (let i = -1; i < 2; i++) {
      const px = i * 256 + (j % 2 ? 128 : 0), py = j * 128;
      const g = x.createLinearGradient(px, py, px + 256, py + 128); g.addColorStop(0, grey(255)); g.addColorStop(1, grey(236));
      x.fillStyle = g; x.fillRect(px + 4, py + 4, 248, 120);
    }
    return c;
  },
  lames() { // volet roulant : lames horizontales de 4 cm, motif de 0,32 m
    const c = cv(64, 512), x = c.getContext('2d', { willReadFrequently: true });
    for (let j = 0; j < 8; j++) {
      const g = x.createLinearGradient(0, j * 64, 0, j * 64 + 64); g.addColorStop(0, grey(250)); g.addColorStop(0.8, grey(215)); g.addColorStop(1, grey(120));
      x.fillStyle = g; x.fillRect(0, j * 64, 64, 64);
    }
    return c;
  },
};

// ---- matières supplémentaires (sols) ----
GEN.chevron = () => {   // parquet en chevron : lames à 45° qui se rejoignent en pointe
  const c = cv(512), x = c.getContext('2d', { willReadFrequently: true }), r = rng(31);
  x.fillStyle = grey(95); x.fillRect(0, 0, 512, 512);
  for (const half of [0, 1]) {
    x.save(); x.beginPath(); x.rect(half ? 256 : 0, 0, 256, 512); x.clip();
    if (half) { x.translate(512, 0); x.scale(-1, 1); }
    const tones = Array.from({ length: 8 }, () => 200 + r() * 42), gr = Array.from({ length: 8 }, () => Array.from({ length: 6 }, () => 6 + r() * 48));
    for (let n = -9; n <= 9; n++) {
      const c0 = n * 64, m = ((n % 8) + 8) % 8, tone = tones[m], g = x.createLinearGradient(0, 0, 256, 256);
      g.addColorStop(0, grey(tone + 8)); g.addColorStop(1, grey(tone - 10));
      x.fillStyle = g; x.beginPath(); x.moveTo(0, c0 + 2); x.lineTo(260, c0 + 262); x.lineTo(260, c0 + 262 + 60); x.lineTo(0, c0 + 62); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(60,40,20,0.12)'; x.lineWidth = 1;
      for (const o of gr[m]) { x.beginPath(); x.moveTo(0, c0 + o); x.lineTo(256, c0 + 256 + o); x.stroke(); }
    }
    x.restore();
  }
  noise(x, c, 6, 32); return c;
};
GEN.plank = () => boards({ W: 3, H: 1, rows: 5, ppm: 400, minL: 1.2, maxL: 2.2, joint: 2, bg: 140, base: 224, vary: 36, seed: 41 });   // larges lames : 20 cm × 1,2 à 2,2 m (motif 3 × 1 m)
GEN.hex = () => {   // carreaux hexagonaux (carreaux de ciment), motif de 1 m × 0,866 m
  const c = cv(512, 443), x = c.getContext('2d', { willReadFrequently: true }), r = rng(51), R = 443 / 6, Rh = 128 / Math.sqrt(3);   // 4 rangées exactement sur la hauteur du motif
  const tones = Array.from({ length: 16 }, () => 205 + r() * 40);
  x.fillStyle = grey(95); x.fillRect(0, 0, 512, 443);
  for (let row = -1; row <= 5; row++) for (let col = -1; col <= 5; col++) {
    const cx = col * 128 + (row & 1 ? 64 : 0), cy = row * R * 1.5, tone = tones[(((row % 4) + 4) % 4) * 4 + (((col % 4) + 4) % 4)];
    x.fillStyle = grey(tone); x.beginPath();
    for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; x.lineTo(cx + (Rh - 2.2) * Math.cos(a), cy + (R - 2.2) * Math.sin(a)); }
    x.closePath(); x.fill();
  }
  noise(x, c, 5, 52); return c;
};
GEN.granite = () => {   // granit : fond moucheté fin (motif de 60 cm)
  const c = cv(256), x = c.getContext('2d', { willReadFrequently: true }), r = rng(101);
  x.fillStyle = grey(190); x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5200; i++) { x.fillStyle = grey(70 + r() * 185); const s = 0.8 + r() * 2.2, px = r() * 256, py = r() * 256; for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) x.fillRect(px + ox, py + oy, s, s); }
  noise(x, c, 10, 102); return c;
};
GEN.terrazzo = () => {
  const c = cv(512), x = c.getContext('2d', { willReadFrequently: true }), r = rng(61);
  x.fillStyle = grey(232); x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 520; i++) {
    const cx = r() * 512, cy = r() * 512, s = 3 + r() * 11, tone = 90 + r() * 140;
    for (const [ox, oy] of [[0, 0], [512, 0], [-512, 0], [0, 512], [0, -512]]) {
      x.fillStyle = grey(tone); x.beginPath();
      for (let k = 0; k < 6; k++) { const a = r() * 6.283, rr = s * (0.55 + r() * 0.5); x.lineTo(cx + ox + rr * Math.cos(a), cy + oy + rr * Math.sin(a)); }
      x.closePath(); x.fill();
    }
  }
  noise(x, c, 4, 62); return c;
};
GEN.deck = () => boards({ W: 3, H: 0.98, rows: 7, ppm: 400, minL: 1.5, maxL: 3, joint: 9, bg: 60, base: 205, vary: 46, seed: 81 });   // terrasse : lames de 14 cm espacées (motif 3 × 0,98 m)
GEN.pavers = () => {   // pavés 25 × 12,5 cm en appareil décalé
  const c = cv(512), x = c.getContext('2d', { willReadFrequently: true }), r = rng(91);
  x.fillStyle = grey(80); x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) for (let k = -1; k < 4; k++) {
    const px = k * 128 + (i & 1 ? 64 : 0), tone = 175 + r() * 60; x.fillStyle = grey(tone); x.fillRect(px + 2, i * 64 + 2, 124, 60);
  }
  noise(x, c, 9, 92); return c;
};
// ---- carrelages et dalles « grand format » (travertin, grès cérame, effet béton / marbre / bois…) ----
// o : { tw, th, nx, ny, stagger, rows, style, seed, joint, base, vary } ; la période du motif est nx·tw × ny·th (m) — rows = [{ h, ws:[…] }] pour un calepinage libre (opus)
const slabTex = (o) => () => slabPix(o);   // calepinage + matière calculés pixel par pixel (js/texgen.js)
const SLABS = {
  travertin_30x60: { tw: 0.3, th: 0.6, nx: 4, ny: 2, stagger: 0.5, style: 'travertin', seed: 201, base: 226, vary: 18 },
  travertin_40x40: { tw: 0.4, th: 0.4, nx: 3, ny: 3, style: 'travertin', seed: 202, base: 226, vary: 18 },
  travertin_60x60: { tw: 0.6, th: 0.6, nx: 2, ny: 2, style: 'travertin', seed: 203, base: 226, vary: 16 },
  travertin_90x60: { tw: 0.9, th: 0.6, nx: 2, ny: 2, stagger: 0.5, style: 'travertin', seed: 206, base: 226, vary: 16 },
  travertin_60x120: { tw: 0.6, th: 1.2, nx: 2, ny: 2, stagger: 0.5, style: 'travertin', seed: 204, base: 226, vary: 16 },
  travertin_opus: { rows: [{ h: 0.3, ws: [0.6, 0.3, 0.3] }, { h: 0.6, ws: [0.3, 0.6, 0.3] }, { h: 0.3, ws: [0.3, 0.3, 0.6] }], style: 'travertin', seed: 205, base: 226, vary: 20 },
  gres_30: { tw: 0.3, th: 0.3, nx: 4, ny: 4, seed: 211, joint: 0.003, base: 224, vary: 10 },
  gres_60: { tw: 0.6, th: 0.6, nx: 2, ny: 2, seed: 212, joint: 0.003, base: 224, vary: 10 },
  gres_80: { tw: 0.8, th: 0.8, nx: 2, ny: 2, seed: 213, joint: 0.002, base: 224, vary: 10 },
  gres_60x120: { tw: 0.6, th: 1.2, nx: 2, ny: 2, stagger: 0.5, seed: 214, joint: 0.002, base: 224, vary: 10 },
  beton_60: { tw: 0.6, th: 0.6, nx: 2, ny: 2, style: 'beton', seed: 221, joint: 0.003, base: 212, vary: 12 },
  beton_80: { tw: 0.8, th: 0.8, nx: 2, ny: 2, style: 'beton', seed: 222, joint: 0.002, base: 212, vary: 12 },
  marbre_60: { tw: 0.6, th: 0.6, nx: 2, ny: 2, style: 'marbre', seed: 231, joint: 0.002, base: 238, vary: 8 },
  marbre_60x120: { tw: 0.6, th: 1.2, nx: 2, ny: 2, stagger: 0.5, style: 'marbre', seed: 232, joint: 0.002, base: 238, vary: 8 },
  bois_gres: { tw: 1.2, th: 0.2, nx: 1, ny: 6, stagger: 0.37, style: 'bois', seed: 241, joint: 0.002, base: 214, vary: 30 },
  stratifie: { tw: 1.38, th: 0.19, nx: 1, ny: 6, stagger: 0.33, style: 'bois', seed: 242, joint: 0.0015, base: 216, vary: 26 },
  vinyle: { tw: 1.22, th: 0.18, nx: 1, ny: 6, stagger: 0.4, style: 'bois', seed: 243, joint: 0.001, base: 220, vary: 20 },
  ardoise: { tw: 0.4, th: 0.4, nx: 3, ny: 3, style: 'ardoise', seed: 251, joint: 0.004, base: 150, vary: 40 },
};
SLABS.terre_cuite = { tw: 0.3, th: 0.3, nx: 4, ny: 4, style: 'terre', seed: 261, joint: 0.006, base: 205, vary: 40 };
SLABS.terre_cuite_rect = { tw: 0.4, th: 0.2, nx: 3, ny: 6, stagger: 0.5, style: 'terre', seed: 262, joint: 0.006, base: 205, vary: 40 };
for (const [k, o] of Object.entries(SLABS)) GEN[k] = slabTex(o);
const slabSize = (o) => { const rows = o.rows || Array.from({ length: o.ny }, () => ({ h: o.th, ws: Array(o.nx).fill(o.tw) })); return [rows[0].ws.reduce((a, b) => a + b, 0), rows.reduce((a, r) => a + r.h, 0)]; };
GEN.ciment = () => {   // carreaux de ciment 20 × 20 cm, motif géométrique (période 0,8 m)
  const c = cv(512), x = c.getContext('2d', { willReadFrequently: true }), r = rng(261), t = 128;
  x.fillStyle = grey(215); x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const ox = i * t, oy = j * t, rot = (i + j) % 2;
    x.save(); x.beginPath(); x.rect(ox + 2, oy + 2, t - 4, t - 4); x.clip(); x.translate(ox + t / 2, oy + t / 2); if (rot) x.rotate(Math.PI / 4 * 0);
    x.fillStyle = grey(228); x.fillRect(-t / 2, -t / 2, t, t);
    x.fillStyle = grey(110); x.beginPath(); x.moveTo(0, -t * 0.46); x.lineTo(t * 0.46, 0); x.lineTo(0, t * 0.46); x.lineTo(-t * 0.46, 0); x.closePath(); x.fill();
    x.fillStyle = grey(206); x.beginPath(); x.moveTo(0, -t * 0.32); x.lineTo(t * 0.32, 0); x.lineTo(0, t * 0.32); x.lineTo(-t * 0.32, 0); x.closePath(); x.fill();
    x.fillStyle = grey(rot ? 90 : 150); x.beginPath(); x.arc(0, 0, t * 0.16, 0, 6.283); x.fill();
    for (const [qx, qy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { x.fillStyle = grey(120); x.beginPath(); x.arc(qx * t / 2, qy * t / 2, t * 0.2, 0, 6.283); x.fill(); }
    x.restore();
  }
  noise(x, c, 6, 262); void r; return c;
};
GEN.zellige = () => {   // zellige : carreaux de 10 cm irréguliers et brillants (période 0,8 m)
  const c = cv(512), x = c.getContext('2d', { willReadFrequently: true }), r = rng(271), t = 64;
  x.fillStyle = grey(150); x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const tone = 205 + (r() - 0.5) * 70, g = x.createLinearGradient(i * t, j * t, i * t + t, j * t + t); g.addColorStop(0, grey(tone + 18)); g.addColorStop(1, grey(tone - 22));
    x.fillStyle = g; x.beginPath(); x.moveTo(i * t + 2 + r() * 3, j * t + 2 + r() * 3); x.lineTo(i * t + t - 2 - r() * 3, j * t + 2 + r() * 3); x.lineTo(i * t + t - 2 - r() * 3, j * t + t - 2 - r() * 3); x.lineTo(i * t + 2 + r() * 3, j * t + t - 2 - r() * 3); x.closePath(); x.fill();
  }
  noise(x, c, 7, 272); return c;
};
GEN.tissu = () => {   // tissage fin (canapés, linge, tapis) : très clair pour ne presque pas changer la couleur, surtout utile en relief
  const c = cv(256), x = c.getContext('2d', { willReadFrequently: true }), r = rng(301);
  x.fillStyle = grey(238); x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 4) { x.fillStyle = `rgba(0,0,0,${0.035 + r() * 0.03})`; x.fillRect(0, i, 256, 2); x.fillStyle = `rgba(0,0,0,${0.025 + r() * 0.03})`; x.fillRect(i + 2, 0, 2, 256); }
  noise(x, c, 7, 302); return c;
};
GEN.tomette = GEN.hex;
GEN.stone = opusPix; GEN.stonewall = stoneWallPix; GEN.bois = woodPix; GEN.concrete = concretePix; GEN.grass = grassPix; GEN.marble = marblePix; GEN.gravel = gravelPix;   // versions « photo » (js/texgen.js)
GEN.tile4 = GEN.tile(4); GEN.tile2 = GEN.tile(2); GEN.tile1 = GEN.tile(1);

// taille réelle (m) couverte par un motif
export const TEX_SIZE = {
  parquet: [2, 1], tile4: [1, 1], tile2: [1, 1], tile1: [1, 1], concrete: [1, 1], carpet: [0.5, 0.5], marble: [1.2, 1.2],
  stone: [1.2, 1.2], checker: [1, 1], crepi: [1, 1], brique: [0.88, 0.975], lambris: [0.5, 0.5], metro: [0.4, 0.4], bois: [0.6, 0.6], lames: [0.16, 0.32], gravel: [1.5, 1.5],
  granite: [0.6, 0.6], chevron: [1, 1], plank: [3, 1], hex: [1, 0.866], terrazzo: [1, 1], grass: [1, 1], deck: [3, 0.98], pavers: [1, 1],
};

for (const [k, o] of Object.entries(SLABS)) TEX_SIZE[k] = slabSize(o);
// taille d'un carreau / d'une dalle (affichée dans l'éditeur) quand elle est fixe
export const TILE = { tile4: [0.25, 0.25], tile2: [0.5, 0.5], tile1: [1, 1], checker: [0.25, 0.25], ciment: [0.2, 0.2], zellige: [0.1, 0.1], pavers: [0.25, 0.125] };
for (const [k, o] of Object.entries(SLABS)) if (o.tw) TILE[k] = [o.tw, o.th];
TEX_SIZE.tissu = [0.2, 0.2]; TEX_SIZE.stone = [2, 2]; TEX_SIZE.stonewall = [1.6, 1.2]; TEX_SIZE.grass = [1.5, 1.5]; TEX_SIZE.ciment = [0.8, 0.8]; TEX_SIZE.zellige = [0.8, 0.8]; TEX_SIZE.tomette = [0.55, 0.476];

// ---- pose des carreaux : « droit » (alignés), « demi » (quinconce ½), « tiers » (quinconce ⅓) ----
// une variante s'écrit « matière@pose » et se génère à la demande ; « auto » (ou rien) = calepinage d'origine du modèle
export const POSES = [['auto', 'Modèle'], ['droit', 'Droite'], ['demi', 'Quinconce ½'], ['tiers', 'Quinconce ⅓']];
const POSE_K = { droit: 0, demi: 2, tiers: 3 };
export const canStagger = (kind) => !!(kind && ((SLABS[kind] && SLABS[kind].tw) || /^tile[124]$/.test(kind)));
export const texKey = (kind, pose) => (kind && pose && pose !== 'auto' && POSE_K[pose] != null && canStagger(kind) ? kind + '@' + pose : kind);
const slabPose = (kind, pose) => { const o = SLABS[kind], k = POSE_K[pose]; return { ...o, k, ny: k ? k * Math.ceil(o.ny / k) : o.ny }; };
function variant(key) {
  const [kind, pose] = key.split('@'), k = POSE_K[pose];
  if (SLABS[kind]) { const o = slabPose(kind, pose); GEN[key] = slabTex(o); TEX_SIZE[key] = slabSize(o); }
  else { const n = +kind.slice(4); GEN[key] = GEN.tile(n, k); TEX_SIZE[key] = [1, (k ? k * Math.ceil(n / k) : n) / n]; }
}
export const texSize = (key) => { if (!key) return [1, 1]; if (!TEX_SIZE[key] && key.includes('@')) variant(key); return TEX_SIZE[key]; };

const cache = {};
export function getTex(kind) {
  if (!kind) return null;
  if (cache[kind]) return cache[kind];
  if (!GEN[kind] && kind.includes('@')) variant(kind);
  const c = GEN[kind]();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData = { canvas: c };
  return (cache[kind] = t);
}

// relief (bump map tirée de la texture elle-même : joints, veinage, alvéoles en creux) ; 0 = surface lisse
const BUMP = { parquet: 0.6, chevron: 0.6, plank: 0.6, deck: 1.2, tile4: 1, tile2: 1, tile1: 1, checker: 0.4, stone: 1.4, pavers: 1.4, hex: 1, tomette: 1, ciment: 0.5, zellige: 1.2,
  terrazzo: 0.3, concrete: 0.4, marble: 0.2, carpet: 0.8, grass: 1, gravel: 1.2, granite: 0.3, crepi: 1, brique: 1.6, lambris: 0.9, metro: 1, bois: 0.35, lames: 0.8, ardoise: 1.4, tissu: 0.5, stonewall: 1.6 };
export function bumpFor(key) { const k = (key || '').split('@')[0]; return BUMP[k] ?? (SLABS[k] ? (SLABS[k].style === 'bois' ? 0.6 : 1) : 0); }
// matériau standard avec relief si la texture en a un
export function withBump(m, key, k = 3) { const b = bumpFor(key); if (b && m.map) { m.bumpMap = m.map; m.bumpScale = b * k; } return m; }

// variante dont la répétition est en mètres (pour les UV de boxG)
const cacheM = {};
export function getTexM(kind) {
  if (!kind) return null;
  if (cacheM[kind]) return cacheM[kind];
  const t = getTex(kind).clone();
  t.needsUpdate = true;
  t.repeat.set(1 / TEX_SIZE[kind][0], 1 / TEX_SIZE[kind][1]);
  return (cacheM[kind] = t);
}

// vignette (data URL) d'une matière teintée
const swCache = {};
export function swatch(kind, color, px = 56) {
  const key = kind + color + px;
  if (swCache[key]) return swCache[key];
  const out = cv(px), x = out.getContext('2d', { willReadFrequently: true });
  if (kind) {
    const src = getTex(kind).userData.canvas;
    const [sx, sy] = TEX_SIZE[kind], zoom = Math.min(1, 0.5 / Math.max(sx, sy));
    x.drawImage(src, 0, 0, src.width * Math.min(1, zoom * 1.6), src.height * Math.min(1, zoom * 1.6), 0, 0, px, px);
    x.globalCompositeOperation = 'multiply';
  }
  x.fillStyle = color; x.fillRect(0, 0, px, px);
  return (swCache[key] = out.toDataURL());
}
// vignette remplie sans bloquer l'interface : les textures pas encore calculées le sont une par une (couleur unie en attendant)
const swQueue = []; let swBusy = false;
export function swatchInto(img, kind, color, px = 56) {
  const key = kind + color + px;
  if (!kind || swCache[key] || cache[kind]) { img.src = swatch(kind, color, px); return img; }
  img.style.background = color; swQueue.push([img, kind, color, px]);
  if (!swBusy) { swBusy = true; setTimeout(swPump, 0); }
  return img;
}
function swPump() {
  const j = swQueue.shift(); if (!j) { swBusy = false; return; }
  try { j[0].src = swatch(j[1], j[2], j[3]); } catch (e) { /* vignette indisponible */ }
  setTimeout(swPump, 0);
}

// ---- catalogues ------------------------------------------------------------------------------
export const PALETTE = ['#ffffff', '#f2efe9', '#e8dccb', '#d9c3a5', '#c8b69b', '#b9a89a', '#9aa5a8', '#8fa6b8', '#6d8fa3', '#a9bfa0', '#7d9a7a', '#d6a69a', '#c97b63', '#d9b44a', '#8a5a3c', '#5a4636', '#4b5359', '#2e3338', '#111214'];

export const FLOORS = [
  { id: 'parquet', name: 'Parquet', tex: 'parquet', color: '#e0bb8c', presets: ['#e0bb8c', '#eadfce', '#c89b6b', '#9a6a47', '#6b4a35', '#52392e', '#a4a29d'] },
  { id: 'tile4', name: 'Carrelage 25 cm', tex: 'tile4', color: '#f3f1ec', presets: ['#f3f1ec', '#d6d3cc', '#8f9298', '#5a5d62', '#c9b79c', '#7fa0b3'] },
  { id: 'tile2', name: 'Carrelage 50 cm', tex: 'tile2', color: '#d9cdb8', presets: ['#f3f1ec', '#d9cdb8', '#a8a49c', '#5a5d62', '#2e3338', '#b98b6c'] },
  { id: 'tile1', name: 'Grande dalle 1 m', tex: 'tile1', color: '#cfcac0', presets: ['#f3f1ec', '#cfcac0', '#9a9a96', '#4b5359', '#b59f86'] },
  { id: 'marbre', name: 'Marbre', tex: 'marble', color: '#ffffff', presets: ['#ffffff', '#e8e1d4', '#c9c2b8', '#8fa0a8', '#2e3338'] },
  { id: 'beton', name: 'Béton ciré', tex: 'concrete', color: '#b8b6b0', presets: ['#d4d2cc', '#b8b6b0', '#8d8b86', '#5d5c58', '#c4b5a0'] },
  { id: 'moquette', name: 'Moquette', tex: 'carpet', color: '#b9a89a', presets: ['#e0d6c8', '#b9a89a', '#8d9eab', '#7d9a7a', '#6b6f78', '#a85a52'] },
  { id: 'pierre', name: 'Pierre naturelle (opus incertum)', tex: 'stone', color: '#c9bba3', presets: ['#c9bba3', '#d8d2c4', '#a8a396', '#8a7e6d', '#6e7378'] },
  { id: 'damier', name: 'Damier', tex: 'checker', color: '#f2f2f2', presets: ['#f2f2f2', '#d9c3a5', '#9fb4c0', '#c97b63', '#8fb08a'] },
  { id: 'chevron', name: 'Parquet en chevron', tex: 'chevron', color: '#d9b98c', presets: ['#d9b98c', '#eadfce', '#c89b6b', '#9a6a47', '#6b4a35', '#a4a29d'] },
  { id: 'planches', name: 'Parquet larges lames', tex: 'plank', color: '#d8b98e', presets: ['#d8b98e', '#eadfce', '#b98a5a', '#8a6445', '#5a4636', '#9a9a94'] },
  { id: 'hexa', name: 'Carreaux hexagonaux', tex: 'hex', color: '#d6d3cc', presets: ['#d6d3cc', '#f3f1ec', '#8f9298', '#5a5d62', '#c97b63', '#7fa0b3', '#8fb08a'] },
  { id: 'terrazzo', name: 'Terrazzo', tex: 'terrazzo', color: '#ece7de', presets: ['#ece7de', '#ffffff', '#cfc8bb', '#b7c4c9', '#d9b8a8'] },
  { id: 'terrasse', name: 'Terrasse bois', tex: 'deck', color: '#a47a52', presets: ['#a47a52', '#c49a6c', '#7a5638', '#8d8b86', '#5a4636'] },
  { id: 'paves', name: 'Pavés', tex: 'pavers', color: '#a8a49c', presets: ['#a8a49c', '#c4b5a0', '#8d8b86', '#b98b6c', '#6e7378'] },
  { id: 'pelouse', name: 'Pelouse', tex: 'grass', color: '#6f9a4f', presets: ['#6f9a4f', '#7fae5a', '#5a8040', '#9ab36a', '#a89f5a'] },
  { id: 'travertin_30x60', name: 'Travertin 30 × 60', tex: 'travertin_30x60', color: '#e3d6bd', presets: ['#e3d6bd', '#efe6d2', '#d6c3a0', '#bda98a', '#b8b1a6', '#d9b8a0'] },
  { id: 'travertin_40x40', name: 'Travertin 40 × 40', tex: 'travertin_40x40', color: '#e3d6bd', presets: ['#e3d6bd', '#efe6d2', '#d6c3a0', '#bda98a', '#b8b1a6', '#d9b8a0'] },
  { id: 'travertin_60x60', name: 'Travertin 60 × 60', tex: 'travertin_60x60', color: '#e3d6bd', presets: ['#e3d6bd', '#efe6d2', '#d6c3a0', '#bda98a', '#b8b1a6', '#d9b8a0'] },
  { id: 'travertin_90x60', name: 'Travertin 90 × 60', tex: 'travertin_90x60', color: '#e3d6bd', presets: ['#e3d6bd', '#efe6d2', '#d6c3a0', '#bda98a', '#b8b1a6', '#d9b8a0'] },
  { id: 'travertin_60x120', name: 'Travertin 60 × 120', tex: 'travertin_60x120', color: '#e3d6bd', presets: ['#e3d6bd', '#efe6d2', '#d6c3a0', '#bda98a', '#b8b1a6', '#d9b8a0'] },
  { id: 'travertin_opus', name: 'Travertin opus (formats mixtes)', tex: 'travertin_opus', color: '#dccfb4', presets: ['#dccfb4', '#efe6d2', '#c9b693', '#a89677', '#b8b1a6'] },
  { id: 'gres_30', name: 'Grès cérame 30 × 30', tex: 'gres_30', color: '#d6d3cc', presets: ['#f3f1ec', '#d6d3cc', '#a8a49c', '#6e7378', '#3d4247', '#c9b79c', '#b98b6c'] },
  { id: 'gres_60', name: 'Grès cérame 60 × 60', tex: 'gres_60', color: '#d6d3cc', presets: ['#f3f1ec', '#d6d3cc', '#a8a49c', '#6e7378', '#3d4247', '#c9b79c', '#b98b6c'] },
  { id: 'gres_80', name: 'Grès cérame 80 × 80', tex: 'gres_80', color: '#d6d3cc', presets: ['#f3f1ec', '#d6d3cc', '#a8a49c', '#6e7378', '#3d4247', '#c9b79c'] },
  { id: 'gres_60x120', name: 'Grès cérame 60 × 120', tex: 'gres_60x120', color: '#d6d3cc', presets: ['#f3f1ec', '#d6d3cc', '#a8a49c', '#6e7378', '#3d4247', '#c9b79c'] },
  { id: 'beton_60', name: 'Effet béton 60 × 60', tex: 'beton_60', color: '#b5b3ad', presets: ['#d4d2cc', '#b5b3ad', '#8d8b86', '#5d5c58', '#c4b5a0'] },
  { id: 'beton_80', name: 'Effet béton 80 × 80', tex: 'beton_80', color: '#b5b3ad', presets: ['#d4d2cc', '#b5b3ad', '#8d8b86', '#5d5c58', '#c4b5a0'] },
  { id: 'marbre_60', name: 'Effet marbre 60 × 60', tex: 'marbre_60', color: '#f4f2ee', presets: ['#f4f2ee', '#e8e1d4', '#c9c2b8', '#8fa0a8', '#2e3338'] },
  { id: 'marbre_60x120', name: 'Effet marbre 60 × 120', tex: 'marbre_60x120', color: '#f4f2ee', presets: ['#f4f2ee', '#e8e1d4', '#c9c2b8', '#8fa0a8', '#2e3338'] },
  { id: 'bois_gres', name: 'Grès effet bois 20 × 120', tex: 'bois_gres', color: '#c8a57a', presets: ['#c8a57a', '#e0c9a6', '#a4784c', '#7a5638', '#5a4636', '#a4a29d'] },
  { id: 'stratifie', name: 'Parquet stratifié (lames clipsables)', tex: 'stratifie', color: '#c9a77c', presets: ['#c9a77c', '#e0c9a6', '#b58a5a', '#8a6445', '#5a4636', '#a4a29d'] },
  { id: 'vinyle', name: 'Sol vinyle lames PVC', tex: 'vinyle', color: '#c4a883', presets: ['#c4a883', '#e0c9a6', '#a98a62', '#7a5638', '#8d8b86', '#d9d4cb'] },
  { id: 'ciment', name: 'Carreaux de ciment', tex: 'ciment', color: '#c8b49a', presets: ['#c8b49a', '#9fb4c0', '#c97b63', '#8fb08a', '#e8e4dc', '#6e7378'] },
  { id: 'tomette', name: 'Tomettes hexagonales', tex: 'tomette', color: '#c07a52', presets: ['#c07a52', '#a85a3c', '#d9a07a', '#8d8b86', '#c9b79c'] },
  { id: 'zellige', name: 'Zellige', tex: 'zellige', color: '#8fb0a8', presets: ['#8fb0a8', '#ffffff', '#6d8fa3', '#7d9a7a', '#d9b44a', '#c97b63'] },
  { id: 'terre_cuite', name: 'Terre cuite 30 × 30', tex: 'terre_cuite', color: '#c0683f', presets: ['#c0683f', '#a85a3c', '#d08a5c', '#b5735a', '#8d5040'] },
  { id: 'terre_cuite_rect', name: 'Terre cuite 20 × 40', tex: 'terre_cuite_rect', color: '#c0683f', presets: ['#c0683f', '#a85a3c', '#d08a5c', '#b5735a', '#8d5040'] },
  { id: 'ardoise', name: 'Ardoise', tex: 'ardoise', color: '#7d848a', presets: ['#7d848a', '#4b5359', '#6a7a6a', '#8a7e6d', '#a8a49c'] },
  { id: 'uni', name: 'Uni (résine)', tex: null, color: '#e8e4dc', presets: ['#f2efe9', '#e8e4dc', '#c8c4bc', '#9aa5a8', '#4b5359'] },
];
export const floorDef = (id) => FLOORS.find((f) => f.id === id) || FLOORS[0];

export const FINISHES = [
  { id: 'peinture', name: 'Peinture', tex: null, color: '#f2efe9' },
  { id: 'crepi', name: 'Crépi', tex: 'crepi', color: '#efe6d6' },
  { id: 'brique', name: 'Briques', tex: 'brique', color: '#c1623f' },
  { id: 'lambris', name: 'Lambris bois', tex: 'lambris', color: '#d9c3a5' },
  { id: 'beton', name: 'Béton', tex: 'concrete', color: '#b8b6b0' },
  { id: 'pierre', name: 'Pierre', tex: 'stonewall', color: '#c9bba3' },
  { id: 'faience', name: 'Faïence métro', tex: 'metro', color: '#ffffff' },
];
export const finishDef = (id) => FINISHES.find((f) => f.id === id) || FINISHES[0];

export { hexToRgb };
