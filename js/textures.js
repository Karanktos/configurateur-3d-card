// Textures procédurales (canvas) pour sols, murs et menuiseries.
// Chaque texture est en niveaux de gris : la « couleur » choisie par l'utilisateur est multipliée dessus.
import * as THREE from 'three';
import { hexToRgb } from './util.js';

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

const GEN = {
  // lames de parquet : 8 rangées de 12,5 cm sur 1 m
  parquet() {
    const c = cv(512), x = c.getContext('2d'), r = rng(7);
    x.fillStyle = grey(150); x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 8; i++) {
      const off = r() * 512;
      for (let k = 0; k < 2; k++) {
        const x0 = (off + k * 256) % 512, tone = 205 + r() * 40;
        wrapDraw(c, (dx, dy) => {
          const px = x0 + dx, py = i * 64 + dy;
          const g = x.createLinearGradient(0, py, 0, py + 64);
          g.addColorStop(0, grey(tone + 6)); g.addColorStop(1, grey(tone - 8));
          x.fillStyle = g; x.fillRect(px + 1, py + 1, 254, 62);
          x.strokeStyle = 'rgba(60,40,20,0.10)'; x.lineWidth = 1;
          for (let j = 0; j < 7; j++) {
            const yy = py + 4 + r() * 56; x.beginPath(); x.moveTo(px + 2, yy);
            x.bezierCurveTo(px + 80, yy + (r() - 0.5) * 6, px + 170, yy + (r() - 0.5) * 6, px + 254, yy + (r() - 0.5) * 3); x.stroke();
          }
        });
      }
    }
    noise(x, c, 6, 3);
    return c;
  },
  tile(n) {
    return () => {
      const c = cv(512), x = c.getContext('2d'), r = rng(11 + n), s = 512 / n;
      x.fillStyle = grey(120); x.fillRect(0, 0, 512, 512);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const t = 226 + r() * 22, g = x.createLinearGradient(i * s, j * s, (i + 1) * s, (j + 1) * s);
        g.addColorStop(0, grey(t + 6)); g.addColorStop(1, grey(t - 8));
        const m = n > 2 ? 2 : 3; x.fillStyle = g; x.fillRect(i * s + m, j * s + m, s - 2 * m, s - 2 * m);
      }
      noise(x, c, 4, 5);
      return c;
    };
  },
  concrete() {
    const c = cv(512), x = c.getContext('2d');
    x.fillStyle = grey(212); x.fillRect(0, 0, 512, 512);
    blotches(c, x, 55, 21, 0.06); noise(x, c, 9, 22);
    return c;
  },
  carpet() {
    const c = cv(256), x = c.getContext('2d');
    x.fillStyle = grey(205); x.fillRect(0, 0, 256, 256);
    noise(x, c, 26, 31);
    const r = rng(32); x.strokeStyle = 'rgba(0,0,0,0.07)';
    for (let i = 0; i < 700; i++) { const px = r() * 256, py = r() * 256; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 5, py + (r() - 0.5) * 5); x.stroke(); }
    return c;
  },
  marble() {
    const c = cv(512), x = c.getContext('2d'), r = rng(41);
    x.fillStyle = grey(240); x.fillRect(0, 0, 512, 512);
    blotches(c, x, 30, 42, 0.05);
    for (let v = 0; v < 12; v++) {
      const p = [r() * 512, r() * 512, r() * 512, r() * 512, r() * 512, r() * 512];
      for (const [w, a] of [[5, 0.04], [2.5, 0.09], [1, 0.22]]) {
        wrapDraw(c, (dx, dy) => {
          x.strokeStyle = `rgba(70,75,85,${a})`; x.lineWidth = w; x.beginPath(); x.moveTo(p[0] + dx, p[1] + dy);
          x.bezierCurveTo(p[2] + dx, p[3] + dy, p[4] + dx, p[5] + dy, p[0] + 200 + dx, p[1] + 150 + dy); x.stroke();
        });
      }
    }
    x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 2; x.strokeRect(0, 0, 512, 512);
    return c;
  },
  stone() {
    const c = cv(512), x = c.getContext('2d'), r = rng(51);
    x.fillStyle = grey(110); x.fillRect(0, 0, 512, 512);
    let y = 0;
    while (y < 512) {
      const h = y > 400 ? 512 - y : Math.min(512 - y, 90 + r() * 70); let px = 0;
      while (px < 512) {
        const w = Math.min(512 - px, 70 + r() * 130), ww = 512 - px - w < 60 ? 512 - px : w, t = 188 + r() * 50;
        const g = x.createLinearGradient(px, y, px + ww, y + h); g.addColorStop(0, grey(t + 8)); g.addColorStop(1, grey(t - 10));
        x.fillStyle = g; x.fillRect(px + 3, y + 3, ww - 6, h - 6); px += ww;
      }
      y += h;
    }
    blotches(c, x, 25, 52, 0.07); noise(x, c, 10, 53);
    return c;
  },
  checker() {
    const c = cv(512), x = c.getContext('2d');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? grey(110) : grey(250); x.fillRect(i * 128, j * 128, 128, 128); }
    noise(x, c, 4, 61);
    return c;
  },
  crepi() {
    const c = cv(512), x = c.getContext('2d');
    x.fillStyle = grey(236); x.fillRect(0, 0, 512, 512);
    noise(x, c, 14, 71); blotches(c, x, 30, 72, 0.04);
    return c;
  },
  // briques 22 × 6,5 cm : motif de 4 briques × 15 rangées (0,88 × 0,975 m)
  brique() {
    const c = cv(704, 780), x = c.getContext('2d'), r = rng(81);
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
    const c = cv(512), x = c.getContext('2d'), r = rng(91);
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
    const c = cv(512), x = c.getContext('2d');
    x.fillStyle = grey(190); x.fillRect(0, 0, 512, 512);
    for (let j = 0; j < 4; j++) for (let i = -1; i < 2; i++) {
      const px = i * 256 + (j % 2 ? 128 : 0), py = j * 128;
      const g = x.createLinearGradient(px, py, px + 256, py + 128); g.addColorStop(0, grey(255)); g.addColorStop(1, grey(236));
      x.fillStyle = g; x.fillRect(px + 4, py + 4, 248, 120);
    }
    return c;
  },
  // grain de bois (menuiseries, meubles) : stries le long de l'axe u
  bois() {
    const c = cv(512), x = c.getContext('2d'), r = rng(101);
    x.fillStyle = grey(222); x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 90; i++) {
      const y0 = r() * 512, a = 0.05 + r() * 0.12, len = 140 + r() * 360, x0 = r() * 512;
      wrapDraw(c, (dx, dy) => {
        x.strokeStyle = `rgba(70,45,20,${a})`; x.lineWidth = 0.6 + r() * 1.6; x.beginPath(); x.moveTo(x0 + dx, y0 + dy);
        x.bezierCurveTo(x0 + len / 3 + dx, y0 + (r() - 0.5) * 8 + dy, x0 + 2 * len / 3 + dx, y0 + (r() - 0.5) * 8 + dy, x0 + len + dx, y0 + (r() - 0.5) * 4 + dy); x.stroke();
      });
    }
    noise(x, c, 5, 102);
    return c;
  },
  // gravier / terre du terrain : mouchetis gris à teinter (motif de 3 m)
  gravel() {
    const c = cv(512), x = c.getContext('2d'), r = rng(77);
    x.fillStyle = grey(176); x.fillRect(0, 0, 512, 512);
    blotches(c, x, 90, 5, 0.1);
    for (let i = 0; i < 9000; i++) { x.globalAlpha = 0.45; x.fillStyle = grey(95 + r() * 150); x.fillRect(r() * 512, r() * 512, 1 + r() * 2.4, 1 + r() * 2); }
    x.globalAlpha = 1; noise(x, c, 6, 78);
    return c;
  },
  lames() { // volet roulant : lames horizontales de 4 cm, motif de 0,32 m
    const c = cv(64, 512), x = c.getContext('2d');
    for (let j = 0; j < 8; j++) {
      const g = x.createLinearGradient(0, j * 64, 0, j * 64 + 64); g.addColorStop(0, grey(250)); g.addColorStop(0.8, grey(215)); g.addColorStop(1, grey(120));
      x.fillStyle = g; x.fillRect(0, j * 64, 64, 64);
    }
    return c;
  },
};

// ---- matières supplémentaires (sols) ----
GEN.chevron = () => {   // parquet en chevron : lames à 45° qui se rejoignent en pointe
  const c = cv(512), x = c.getContext('2d'), r = rng(31);
  x.fillStyle = grey(95); x.fillRect(0, 0, 512, 512);
  for (const half of [0, 1]) {
    x.save(); x.beginPath(); x.rect(half ? 256 : 0, 0, 256, 512); x.clip();
    if (half) { x.translate(512, 0); x.scale(-1, 1); }
    for (let n = -9; n <= 9; n++) {
      const c0 = n * 64, tone = 200 + r() * 42, g = x.createLinearGradient(0, 0, 256, 256);
      g.addColorStop(0, grey(tone + 8)); g.addColorStop(1, grey(tone - 10));
      x.fillStyle = g; x.beginPath(); x.moveTo(0, c0 + 2); x.lineTo(260, c0 + 262); x.lineTo(260, c0 + 262 + 60); x.lineTo(0, c0 + 62); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(60,40,20,0.12)'; x.lineWidth = 1;
      for (let j = 0; j < 6; j++) { const o = 6 + r() * 48; x.beginPath(); x.moveTo(0, c0 + o); x.lineTo(256, c0 + 256 + o); x.stroke(); }
    }
    x.restore();
  }
  noise(x, c, 6, 32); return c;
};
GEN.plank = () => {   // parquet à larges lames (4 rangées de 25 cm par mètre)
  const c = cv(512), x = c.getContext('2d'), r = rng(41);
  x.fillStyle = grey(110); x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4; i++) {
    let px = r() * 200;
    for (let k = 0; k < 3; k++) {
      const len = 180 + r() * 150, tone = 205 + r() * 38, g = x.createLinearGradient(0, i * 128, 0, i * 128 + 128);
      g.addColorStop(0, grey(tone + 6)); g.addColorStop(1, grey(tone - 8)); x.fillStyle = g;
      for (const off of [-512, 0]) x.fillRect(px + off + 1, i * 128 + 2, len - 2, 124);
      x.strokeStyle = 'rgba(60,40,20,0.10)';
      for (let j = 0; j < 9; j++) { const yy = i * 128 + 6 + r() * 116; x.beginPath(); x.moveTo(px + 2, yy); x.bezierCurveTo(px + len / 3, yy + (r() - 0.5) * 8, px + 2 * len / 3, yy + (r() - 0.5) * 8, px + len - 2, yy + (r() - 0.5) * 4); x.stroke(); }
      px += len; if (px > 512) break;
    }
  }
  noise(x, c, 6, 42); return c;
};
GEN.hex = () => {   // carreaux hexagonaux (carreaux de ciment), motif de 1 m × 0,866 m
  const c = cv(512, 443), x = c.getContext('2d'), r = rng(51), R = 128 / Math.sqrt(3);
  x.fillStyle = grey(95); x.fillRect(0, 0, 512, 443);
  for (let row = -1; row <= 5; row++) for (let col = -1; col <= 5; col++) {
    const cx = col * 128 + (row & 1 ? 64 : 0), cy = row * R * 1.5, tone = 205 + r() * 40;
    x.fillStyle = grey(tone); x.beginPath();
    for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; x.lineTo(cx + (R - 2.2) * Math.cos(a), cy + (R - 2.2) * Math.sin(a)); }
    x.closePath(); x.fill();
  }
  noise(x, c, 5, 52); return c;
};
GEN.terrazzo = () => {
  const c = cv(512), x = c.getContext('2d'), r = rng(61);
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
GEN.grass = () => {
  const c = cv(512), x = c.getContext('2d'), r = rng(71);
  x.fillStyle = grey(170); x.fillRect(0, 0, 512, 512);
  blotches(c, x, 70, 72, 0.14);
  for (let i = 0; i < 16000; i++) {
    const px = r() * 512, py = r() * 512, l = 4 + r() * 8, a = (r() - 0.5) * 0.9 - Math.PI / 2;
    x.strokeStyle = grey(110 + r() * 140); x.globalAlpha = 0.6; x.lineWidth = 1;
    for (const [ox, oy] of [[0, 0], [512, 0], [-512, 0], [0, 512], [0, -512]]) { x.beginPath(); x.moveTo(px + ox, py + oy); x.lineTo(px + ox + Math.cos(a) * l, py + oy + Math.sin(a) * l); x.stroke(); }
  }
  x.globalAlpha = 1; noise(x, c, 6, 73); return c;
};
GEN.deck = () => {   // terrasse en lames de bois espacées (rangées de 14 cm)
  const c = cv(512), x = c.getContext('2d'), r = rng(81);
  x.fillStyle = grey(60); x.fillRect(0, 0, 512, 512);
  const rows = 7, h = 512 / rows;
  for (let i = 0; i < rows; i++) {
    let px = r() * 300;
    for (let k = 0; k < 4; k++) {
      const len = 240 + r() * 160, tone = 195 + r() * 50, g = x.createLinearGradient(0, i * h, 0, i * h + h);
      g.addColorStop(0, grey(tone + 8)); g.addColorStop(1, grey(tone - 10)); x.fillStyle = g;
      for (const off of [-512, 0]) x.fillRect(px + off + 1.5, i * h + 3, len - 3, h - 6);
      x.strokeStyle = 'rgba(40,25,10,0.12)';
      for (let j = 0; j < 5; j++) { const yy = i * h + 6 + r() * (h - 12); x.beginPath(); x.moveTo(px + 3, yy); x.lineTo(px + len - 3, yy + (r() - 0.5) * 3); x.stroke(); }
      px += len; if (px > 512) break;
    }
  }
  noise(x, c, 6, 82); return c;
};
GEN.pavers = () => {   // pavés 25 × 12,5 cm en appareil décalé
  const c = cv(512), x = c.getContext('2d'), r = rng(91);
  x.fillStyle = grey(80); x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) for (let k = -1; k < 4; k++) {
    const px = k * 128 + (i & 1 ? 64 : 0), tone = 175 + r() * 60; x.fillStyle = grey(tone); x.fillRect(px + 2, i * 64 + 2, 124, 60);
  }
  noise(x, c, 9, 92); return c;
};
GEN.tile4 = GEN.tile(4); GEN.tile2 = GEN.tile(2); GEN.tile1 = GEN.tile(1);

// taille réelle (m) couverte par un motif
export const TEX_SIZE = {
  parquet: [1, 1], tile4: [1, 1], tile2: [1, 1], tile1: [1, 1], concrete: [1, 1], carpet: [0.5, 0.5], marble: [1.2, 1.2],
  stone: [1.2, 1.2], checker: [1, 1], crepi: [1, 1], brique: [0.88, 0.975], lambris: [0.5, 0.5], metro: [0.4, 0.4], bois: [0.6, 0.6], lames: [0.16, 0.32], gravel: [3, 3],
  chevron: [1, 1], plank: [1, 1], hex: [1, 0.866], terrazzo: [1, 1], grass: [1, 1], deck: [1, 1], pavers: [1, 1],
};

const cache = {};
export function getTex(kind) {
  if (!kind) return null;
  if (cache[kind]) return cache[kind];
  const c = GEN[kind]();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData = { canvas: c };
  return (cache[kind] = t);
}

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
  const out = cv(px), x = out.getContext('2d');
  if (kind) {
    const src = getTex(kind).userData.canvas;
    const [sx, sy] = TEX_SIZE[kind], zoom = Math.min(1, 0.5 / Math.max(sx, sy));
    x.drawImage(src, 0, 0, src.width * Math.min(1, zoom * 1.6), src.height * Math.min(1, zoom * 1.6), 0, 0, px, px);
    x.globalCompositeOperation = 'multiply';
  }
  x.fillStyle = color; x.fillRect(0, 0, px, px);
  return (swCache[key] = out.toDataURL());
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
  { id: 'pierre', name: 'Pierre naturelle', tex: 'stone', color: '#c9bba3', presets: ['#c9bba3', '#d8d2c4', '#a8a396', '#8a7e6d', '#6e7378'] },
  { id: 'damier', name: 'Damier', tex: 'checker', color: '#f2f2f2', presets: ['#f2f2f2', '#d9c3a5', '#9fb4c0', '#c97b63', '#8fb08a'] },
  { id: 'chevron', name: 'Parquet en chevron', tex: 'chevron', color: '#d9b98c', presets: ['#d9b98c', '#eadfce', '#c89b6b', '#9a6a47', '#6b4a35', '#a4a29d'] },
  { id: 'planches', name: 'Parquet larges lames', tex: 'plank', color: '#d8b98e', presets: ['#d8b98e', '#eadfce', '#b98a5a', '#8a6445', '#5a4636', '#9a9a94'] },
  { id: 'hexa', name: 'Carreaux hexagonaux', tex: 'hex', color: '#d6d3cc', presets: ['#d6d3cc', '#f3f1ec', '#8f9298', '#5a5d62', '#c97b63', '#7fa0b3', '#8fb08a'] },
  { id: 'terrazzo', name: 'Terrazzo', tex: 'terrazzo', color: '#ece7de', presets: ['#ece7de', '#ffffff', '#cfc8bb', '#b7c4c9', '#d9b8a8'] },
  { id: 'terrasse', name: 'Terrasse bois', tex: 'deck', color: '#a47a52', presets: ['#a47a52', '#c49a6c', '#7a5638', '#8d8b86', '#5a4636'] },
  { id: 'paves', name: 'Pavés', tex: 'pavers', color: '#a8a49c', presets: ['#a8a49c', '#c4b5a0', '#8d8b86', '#b98b6c', '#6e7378'] },
  { id: 'pelouse', name: 'Pelouse', tex: 'grass', color: '#6f9a4f', presets: ['#6f9a4f', '#7fae5a', '#5a8040', '#9ab36a', '#a89f5a'] },
  { id: 'uni', name: 'Uni (résine)', tex: null, color: '#e8e4dc', presets: ['#f2efe9', '#e8e4dc', '#c8c4bc', '#9aa5a8', '#4b5359'] },
];
export const floorDef = (id) => FLOORS.find((f) => f.id === id) || FLOORS[0];

export const FINISHES = [
  { id: 'peinture', name: 'Peinture', tex: null, color: '#f2efe9' },
  { id: 'crepi', name: 'Crépi', tex: 'crepi', color: '#efe6d6' },
  { id: 'brique', name: 'Briques', tex: 'brique', color: '#c1623f' },
  { id: 'lambris', name: 'Lambris bois', tex: 'lambris', color: '#d9c3a5' },
  { id: 'beton', name: 'Béton', tex: 'concrete', color: '#b8b6b0' },
  { id: 'pierre', name: 'Pierre', tex: 'stone', color: '#c9bba3' },
  { id: 'faience', name: 'Faïence métro', tex: 'metro', color: '#ffffff' },
];
export const finishDef = (id) => FINISHES.find((f) => f.id === id) || FINISHES[0];

export { hexToRgb };
