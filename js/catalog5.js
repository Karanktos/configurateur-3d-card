// Éléments d'architecture et de jardin ajoutés pour reproduire fidèlement une maison réelle : barbecue maçonné avec cheminée, banquette de jardin en teck. Même repère que catalog.js : origine au sol au centre, +x largeur, +z face avant.
import * as THREE from 'three';

export function registerMaison(reg) {
  // ---------- barbecue maçonné : corps enduit, hotte à cheminée en briques, plans de travail en pierre ----------
  // construit à partir des cotes (en plan : x vers l'est, y vers le nord) de la maison d'origine ; face avant (+z) = ouest du plan d'origine.
  reg('bbq_maconne', 'Extérieur', 'Barbecue maçonné avec cheminée', 2.16, 2.58, 3.4, 2490, [['Enduit', '#f1ece2'], ['Pierre', '#8e5a42']], (g, p, K) => {
    const cx = 7.59, cy = 9.2, sx = p.w / 2.16, sz = p.d / 2.58;   // x local = nord du plan d'origine (2,16 m), z local = ouest (2,58 m)
    const B = (x0, y0, x1, y1, z0, z1, mt, par) => K.box((y1 - y0) * sx, (z1 - z0) * (p.h / 3.4), (x1 - x0) * sz, mt, -((y0 + y1) / 2 - cy) * sx, ((z0 + z1) / 2) * (p.h / 3.4), (cx - (x0 + x1) / 2) * sz, par);
    const body = K.m(p.c1, { r: 1, map: 'crepi' }), stone = K.m(p.c2, { r: 0.9, map: 'stonewall' }), brick = K.m('#b86a48', { r: 1, map: 'brique' }),
      chim = K.m('#8a7a62', { r: 1, map: 'stonewall' }), dark = K.m('#1e1b19', { r: 1 }), blk = K.m('#151516', { r: 0.5, m: 0.3 }), steel = K.m('#c5c9cc', { r: 0.25, m: 0.8 });
    B(6.45, 8.2, 7.3, 10.2, 0, 1.9, body);
    const hood = B(6.3, 8.12, 7.45, 10.28, 1.95, 2.02, brick); hood.rotation.x = -0.2; hood.position.y = 2.02 * (p.h / 3.4);
    B(6.67, 8.25, 7.08, 8.63, 1.6, 3.3, chim); B(6.63, 8.21, 7.12, 8.67, 3.3, 3.37, stone);
    B(6.435, 8.92, 6.45, 9.68, 0.92, 1.48, dark); B(6.3, 8.88, 6.45, 9.72, 0.87, 0.92, stone);
    for (let y = 8.98; y < 9.64; y += 0.08) B(6.43, y - 0.006, 6.445, y + 0.006, 1, 1.02, steel);
    B(6.43, 8.32, 6.45, 8.78, 0.22, 0.92, blk); B(6.415, 8.7, 6.43, 8.74, 0.52, 0.64, steel);
    B(7.3, 9.05, 7.315, 9.85, 0.35, 0.95, dark);
    B(7.3, 9.95, 8.85, 10.2, 0, 1.02, body); B(7.28, 9.92, 8.88, 10.23, 1.02, 1.1, stone);
    B(8.6, 8.95, 8.85, 9.95, 0, 1.02, body); B(8.57, 8.92, 8.88, 9.95, 1.02, 1.1, stone);
  }, { fin: null, lock: false });

  // ---------- banquette de jardin : cadre teck, assise et dossier en coussins. Dossier côté -z ----------
  reg('banquette_jardin', 'Extérieur', 'Banquette de jardin en teck', 2.0, 0.75, 0.78, 590, [['Teck', '#9c6a3a'], ['Coussins', '#b3b6b9']], (g, p, K) => {
    const { w, d } = p, teak = K.m(p.c1, { r: 0.7, map: 'bois' }), cu = K.m(p.c2, { r: 0.95 });
    K.box(w, 0.18, d, teak, 0, 0.21, 0);
    K.box(w - 0.06, 0.14, d - 0.06, cu, 0, 0.37, 0.0);
    K.box(w - 0.06, 0.34, 0.2, cu, 0, 0.61, -d / 2 + 0.13);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(0.05, 0.12, 0.05, teak, sx * (w / 2 - 0.03), 0.06, sz * (d / 2 - 0.03));
  }, { fin: null });
}
