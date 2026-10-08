// Petits utilitaires partagés (géométrie, matériaux, nettoyage mémoire)
import * as THREE from 'three';

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const r2 = (v) => Math.round(v * 100) / 100;
export const deg = (r) => (r * 180) / Math.PI;
export const rad = (d) => (d * Math.PI) / 180;

// BoxGeometry dont les UV sont en mètres (le grain du bois suit toujours la plus grande dimension de la face)
export function boxG(w, h, d, noSwap = false) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [a, b] = dims[f];
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i, u = uv.getX(k), v = uv.getY(k);
      if (b > a && !noSwap) uv.setXY(k, v * b, u * a); else uv.setXY(k, u * a, v * b);
    }
  }
  return g;
}

// libère géométries / matériaux (les textures partagées ne sont pas détruites)
export function disposeTree(o) {
  o.traverse((c) => {
    if (c.geometry && !(c.geometry.userData && c.geometry.userData.shared)) c.geometry.dispose();
    if (c.material && !c.material.userData?.shared) {
      (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => m.dispose());
    }
  });
}

export const hexToRgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
