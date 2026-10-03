// Système d'animation générique : un objet animé = liste de « parts » pilotées par une valeur v ∈ [0,1].
import { clamp, lerp, smooth } from './util.js';

// puissance globale des luminaires (plus fort la nuit, voir core.applySun)
// vis / mov : compteurs (remis à zéro par le rendu) d'une lumière qui s'allume ou s'éteint / d'une pièce qui bouge → les ombres doivent être recalculées
export const LG = { k: 1, vis: 0, mov: 0 };

// spec : { rot:[axe, angle] } | { slide:[x,y,z] } | { scale:[axe, de, vers] } | { glow:{mat, color, int} } | { light:{light, int} }
//        + t0/t1 (fenêtre de temps dans [0,1]) pour enchaîner les mouvements
export function addPart(list, o, spec) {
  list.push({ o, pos: o.position.clone(), rot0: o.rotation.clone(), ...spec });
  return o;
}

export function applyParts(parts, v) {
  for (const a of parts) {
    const t0 = a.t0 ?? 0, t1 = a.t1 ?? 1;
    const u = smooth(clamp((v - t0) / (t1 - t0), 0, 1));
    if (a.rot) { a.o.rotation[a.rot[0]] = a.rot0[a.rot[0]] + a.rot[1] * u; LG.mov++; }
    else if (a.slide) { a.o.position.set(a.pos.x + a.slide[0] * u, a.pos.y + a.slide[1] * u, a.pos.z + a.slide[2] * u); LG.mov++; }
    else if (a.scale) { a.o.scale[a.scale[0]] = lerp(a.scale[1], a.scale[2], u); LG.mov++; }
    else if (a.glow) {
      a.glow.mat.emissive.set(a.glow.color);
      a.glow.mat.emissiveIntensity = a.glow.int * u;
    } else if (a.light) {
      const l = a.light.light, vis = u > 0.002;
      l.intensity = a.light.int * u * LG.k;
      if (l.visible !== vis) { l.visible = vis; LG.vis++; }
    }
    else if (a.fade) { a.fade.mat.opacity = a.fade.max * u; a.o.visible = u > 0.002; }
  }
}
