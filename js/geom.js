// Géométrie d'un mur percé d'ouvertures.
// Repère local du mur : x le long de l'axe (0 → L), y vers le haut, z dans l'épaisseur (+z = face A, −z = face B).
import * as THREE from 'three';
import { TEX_SIZE } from './textures.js';

// holes : [{x0,x1,y0,y1,round}]  ; texA/texB : clé de texture (pour mettre les UV à l'échelle)
export function wallGeometry(L, H, t, holes, extA = 0, extB = 0, texA = null, texB = null) {
  const sh = new THREE.Shape();
  sh.moveTo(-extA, 0); sh.lineTo(L + extB, 0); sh.lineTo(L + extB, H); sh.lineTo(-extA, H); sh.closePath();
  for (const h of holes) {
    const p = new THREE.Path();
    if (h.round) {
      p.absarc((h.x0 + h.x1) / 2, (h.y0 + h.y1) / 2, (h.x1 - h.x0) / 2, 0, Math.PI * 2, true);
    } else {
      p.moveTo(h.x0, h.y0); p.lineTo(h.x0, h.y1); p.lineTo(h.x1, h.y1); p.lineTo(h.x1, h.y0); p.closePath();
    }
    sh.holes.push(p);
  }
  const g0 = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false, curveSegments: 32 });
  g0.translate(0, 0, -t / 2);
  return splitFaces(g0, t, texA, texB);
}

// ExtrudeGeometry : un seul groupe pour les deux faces → on sépare face A (+z), face B (−z) et tranches
function splitFaces(g, t, texA, texB) {
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  const buckets = [[], [], []];
  for (let i = 0; i < pos.count; i += 3) {
    const nz = (nor.getZ(i) + nor.getZ(i + 1) + nor.getZ(i + 2)) / 3;
    buckets[nz > 0.9 ? 0 : nz < -0.9 ? 1 : 2].push(i);
  }
  const n = pos.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2);
  const out = new THREE.BufferGeometry();
  let w = 0;
  buckets.forEach((b, gi) => {
    const start = w;
    for (const i of b) for (let k = 0; k < 3; k++, w++) {
      P[w * 3] = pos.getX(i + k); P[w * 3 + 1] = pos.getY(i + k); P[w * 3 + 2] = pos.getZ(i + k);
      N[w * 3] = nor.getX(i + k); N[w * 3 + 1] = nor.getY(i + k); N[w * 3 + 2] = nor.getZ(i + k);
      let u = uv.getX(i + k), v = uv.getY(i + k);
      const tex = gi === 0 ? texA : gi === 1 ? texB : null;
      if (tex) { u /= TEX_SIZE[tex][0]; v /= TEX_SIZE[tex][1]; }
      if (gi === 1) u = -u; // face B vue de l'autre côté
      U[w * 2] = u; U[w * 2 + 1] = v;
    }
    out.addGroup(start, w - start, gi);
  });
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  g.dispose();
  return out;
}
