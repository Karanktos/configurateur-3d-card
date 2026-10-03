// Meubles supplémentaires inspirés des catalogues des grandes enseignes (IKEA, BUT, Conforama…) : noms génériques,
// dimensions courantes. Même repère que catalog.js : origine au sol au centre, +x largeur, +z face avant, +y hauteur.
export function registerMore(reg, H) {
  const { unit, sofaParts, bed, wardrobe, tone, WOOD, WHITE, ANTH, OAK, WALNUT } = H;
  const A_P = { anim: 'Ouvrir les portes' }, A_T = { anim: 'Ouvrir les tiroirs' };
  const sofaCols = [['Tissu', '#9aa5a8'], ['Pieds', '#5a4636']];
  const R = (id, cat, sub, name, w, d, h, price, colors, build, ex = {}) => reg(id, cat, name, w, d, h, price, colors, build, { sub, ...ex });

  // ======================= SALON =======================
  const S = 'Salon';
  R('canape_meridienne', S, 'Canapés et fauteuils', 'Canapé 3 places avec méridienne', 2.6, 1.6, 0.85, 799, [...sofaCols], (g, p, K) => {
    const s = p.v ? -1 : 1, dm = 0.95, cw = 0.85, cl = p.d - dm, fab = K.m(p.c1, { r: 0.95 });
    sofaParts(g, p, K, { dm, zc: -p.d / 2 + dm / 2 });
    K.rbox(cw, 0.18, cl, 0.03, fab, s * (p.w / 2 - cw / 2 - 0.2), 0.19, p.d / 2 - cl / 2);
    K.rbox(cw - 0.02, 0.16, cl, 0.05, fab, s * (p.w / 2 - cw / 2 - 0.2), 0.44, p.d / 2 - cl / 2 - 0.01);
  }, { variants: ['Méridienne à droite', 'Méridienne à gauche'] });
  R('canape_u', S, 'Canapés et fauteuils', 'Canapé panoramique en U', 3.3, 2.0, 0.85, 1490, [...sofaCols], (g, p, K) => {
    const dm = 0.95, fab = K.m(p.c1, { r: 0.95 }), cw = 0.9, cl = p.d - dm;
    sofaParts(g, p, K, { arms: [], dm, zc: -p.d / 2 + dm / 2 });
    for (const s of [-1, 1]) {
      K.rbox(cw, 0.18, cl, 0.03, fab, s * (p.w / 2 - cw / 2), 0.19, p.d / 2 - cl / 2);
      K.rbox(cw - 0.02, 0.16, cl - 0.02, 0.05, fab, s * (p.w / 2 - cw / 2), 0.44, p.d / 2 - cl / 2);
      K.rbox(0.2, 0.5, p.d, 0.07, fab, s * (p.w / 2 - 0.1), 0.41, 0);
    }
  });
  R('canape_velours', S, 'Canapés et fauteuils', 'Canapé 3 places velours, pieds dorés', 2.1, 0.9, 0.8, 649, [['Velours', '#2f5d50'], ['Pieds', '#c9a24b']], (g, p, K) => { sofaParts(g, p, K, {}); }, { fin: null });
  R('canape_lit_futon', S, 'Canapés et fauteuils', 'Banquette-lit (BZ / clic-clac)', 1.9, 0.95, 0.9, 299, [...sofaCols], (g, p, K) => {
    const { backs } = sofaParts(g, p, K, { arms: [] }), pv = K.piv(0, 0.28, -p.d / 2 + 0.22);
    backs.forEach((b) => pv.attach(b)); K.add(pv, { rot: ['x', -1.3] });
  }, { anim: 'Déplier en lit', fin: null });
  R('fauteuil_relax', S, 'Canapés et fauteuils', 'Fauteuil relax (repose-pieds)', 0.9, 0.95, 1.05, 449, [['Revêtement', '#5a4636'], ['Base', '#1b1c1f']], (g, p, K) => {
    const { w, d, h } = p, fab = K.m(p.c1, { r: 0.7 }), base = K.m(p.c2, { r: 0.5 });
    K.box(w - 0.1, 0.12, d - 0.2, base, 0, 0.06, -0.05);
    K.rbox(w - 0.3, 0.2, d - 0.35, 0.06, fab, 0, 0.42, 0);
    for (const s of [-1, 1]) K.rbox(0.16, 0.42, d - 0.25, 0.06, fab, s * (w / 2 - 0.08), 0.42, -0.04);
    const back = K.piv(0, 0.45, -d / 2 + 0.2); K.rbox(w - 0.3, h - 0.45, 0.24, 0.08, fab, 0, (h - 0.45) / 2, 0, back); K.add(back, { rot: ['x', -0.5] });
    const foot = K.piv(0, 0.4, d / 2 - 0.15); K.rbox(w - 0.34, 0.12, 0.42, 0.05, fab, 0, -0.2, 0.04, foot); foot.rotation.x = -1.45; K.add(foot, { rot: ['x', 1.4] });
  }, { anim: 'Incliner', fin: null });
  R('fauteuil_bascule', S, 'Canapés et fauteuils', 'Fauteuil cantilever bois courbé', 0.68, 0.82, 1.0, 129, [['Coussin', '#e8dccb'], ['Bois', '#d9b58a']], (g, p, K) => {
    const { w, d, h } = p, wd = K.m(p.c2, { r: 0.55, map: 'bois' }), cu = K.m(p.c1, { r: 0.95 });
    for (const s of [-1, 1]) { K.box(0.04, 0.03, d, wd, s * (w / 2 - 0.03), 0.015, 0); K.box(0.04, 0.5, 0.04, wd, s * (w / 2 - 0.03), 0.26, d / 2 - 0.05); K.box(0.04, 0.03, d * 0.6, wd, s * (w / 2 - 0.03), 0.52, d * 0.15); }
    const seat = K.rbox(w - 0.1, 0.1, d * 0.55, 0.04, cu, 0, 0.42, 0.05); seat.rotation.x = 0.12;
    const back = K.rbox(w - 0.1, h * 0.55, 0.1, 0.04, cu, 0, 0.42 + h * 0.27, -d / 2 + 0.16); back.rotation.x = -0.35;
  }, { fin: null });
  R('table_basse_relevable', S, 'Tables', 'Table basse à plateau relevable', 1.1, 0.55, 0.42, 159, [['Plateau', OAK], ['Corps', WHITE]], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c2), tp = K.m(p.c1, { r: 0.55, map: 'bois' });
    K.carcass(w, h - 0.04, d, bm, 0, 0.02, 0, g, 0.02); K.box(w, 0.02, d, bm, 0, 0.01, 0);
    K.box(w * 0.45, 0.03, d, tp, -w * 0.275, h - 0.015, 0);
    const pv = K.piv(w * 0.275, h - 0.03, 0); K.box(w * 0.45, 0.03, d, tp, 0, 0.015, 0, pv); K.add(pv, { slide: [0, 0.22, 0.12] });
  }, { anim: 'Relever le plateau' });
  R('tables_gigognes', S, 'Tables', 'Tables gigognes (lot de 2)', 0.6, 0.5, 0.48, 89, [['Plateaux', WALNUT], ['Pieds', '#1b1c1f']], (g, p, K) => {
    const { w, d, h } = p, tp = K.m(p.c1, { r: 0.55, map: 'bois' }), mt = K.m(p.c2, { m: 0.5, r: 0.4 });
    for (const [s, x, z, hh] of [[1, 0, 0, h], [0.75, w * 0.18, d * 0.12, h * 0.82]]) {
      const ww = w * s, dd = d * s; K.box(ww, 0.025, dd, tp, x, hh - 0.012, z);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.cyl(0.01, 0.01, hh - 0.025, mt, x + sx * (ww / 2 - 0.03), (hh - 0.025) / 2, z + sz * (dd / 2 - 0.03), null, 8);
    }
  }, { fin: 'bois' });
  R('meuble_tv_suspendu', S, 'Meubles TV', 'Meuble TV suspendu 2 m', 2.0, 0.4, 0.4, 229, [['Façades', '#f1efea'], ['Poignées', '#c3c8cd']], unit({ doors: 4 }), { ...A_P, elev: 0.25 });
  R('meuble_tv_bois', S, 'Meubles TV', 'Meuble TV bois 2 tiroirs + niche', 1.8, 0.45, 0.55, 279, [['Corps', OAK], ['Pieds', '#1b1c1f']], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1), lg = 0.12, bh = h - lg; K.legs(w, d, lg, 0.018, K.m(p.c2, { r: 0.5 }), 0.06);
    K.carcass(w, bh, d, bm, 0, lg, 0, g, 0.02); for (const s of [-1, 1]) K.box(0.018, bh - 0.04, d - 0.04, bm, s * w / 6, lg + bh / 2, 0);
    for (const s of [-1, 1]) K.drawer(w / 3 - 0.03, bh - 0.04, d - 0.06, bm, s * w / 3, lg + 0.02, d / 2, g, { travel: 0.28 });
  }, { ...A_T, fin: 'bois' });
  R('etagere_2x4', S, 'Rangements', 'Étagère 2 × 4 cases (type Kallax)', 0.77, 0.39, 1.47, 59, [['Corps', WHITE]], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1), t = 0.038; K.carcass(w, h, d, bm, 0, 0, 0, g, t, false);
    K.box(t * 0.4, h - 2 * t, d, bm, 0, h / 2, 0); for (let i = 1; i < 4; i++) K.box(w - 2 * t, t * 0.4, d, bm, 0, (h * i) / 4, 0);
    const cols = ['#c97b63', '#9db4c0', '#e8dccb']; [[0, 1], [1, 2], [0, 3]].forEach(([c, r], k) => K.rbox(w / 2 - 0.08, h / 4 - 0.07, d - 0.06, 0.02, K.m(cols[k], { r: 0.95 }), (c ? 1 : -1) * w / 4, (h * r) / 4 + h / 8, 0));
  });
  R('biblio_etroite', S, 'Rangements', 'Bibliothèque étroite 40 (type Billy)', 0.4, 0.28, 2.02, 45, [['Corps', WHITE]], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1); K.carcass(w, h, d, bm, 0, 0, 0, g, 0.018);
    for (let i = 1; i < 6; i++) { const y = (h * i) / 6; K.box(w - 0.036, 0.018, d - 0.02, bm, 0, y, 0); for (let k = 0; k < 6; k++) K.box(0.025, 0.2 + (k % 3) * 0.03, 0.18, K.m(['#c97b63', '#2f4a5e', '#e8dccb', '#6f8a7a'][(i + k) % 4], { r: 0.9 }), -w / 2 + 0.05 + k * 0.05, y + 0.12, 0); }
  });
  R('bahut', S, 'Rangements', 'Bahut 2 portes 2 tiroirs', 1.2, 0.45, 0.9, 199, [['Corps', '#f1efea'], ['Poignées', '#1b1c1f']], unit({ drawers: 2, doors: 2, drawerFrac: 0.3, legs: 0.12 }), A_P);
  R('vitrine_haute', S, 'Rangements', 'Vitrine haute 2 portes vitrées', 0.9, 0.4, 1.9, 249, [['Corps', '#4b5359'], ['Poignées', '#c9a24b']], unit({ doors: 2, glass: true, shelves: 3, legs: 0.1 }), A_P);
  R('cheminee_elec', S, 'Chauffage', 'Cheminée électrique (meuble)', 1.2, 0.35, 1.0, 399, [['Meuble', WHITE], ['Foyer', '#1b1c1f']], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1); K.box(w, 0.06, d + 0.04, bm, 0, h - 0.03, 0); K.box(w, h - 0.06, d, bm, 0, (h - 0.06) / 2, 0);
    K.box(w * 0.6, h * 0.45, 0.02, K.m(p.c2, { r: 0.2 }), 0, h * 0.4, d / 2 + 0.005);
    const fl = K.m('#ff8a2a', { r: 0.5 }); fl.emissive.set('#ff6a00'); fl.emissiveIntensity = 1.2;
    for (let i = 0; i < 5; i++) K.sph(0.05, fl, -w * 0.2 + i * w * 0.1, h * 0.27 + (i % 2) * 0.03, d / 2 + 0.01, null, 0.6, 1.4, 0.2);
  });
  R('barre_son', S, 'Meubles TV', 'Barre de son', 0.9, 0.1, 0.07, 199, [['Corps', '#1b1c1f']], (g, p, K) => { K.rbox(p.w, p.h, p.d, 0.02, K.m(p.c1, { r: 0.6 }), 0, p.h / 2, 0); }, { fin: null, onTop: true });
  R('enceinte_colonne', S, 'Meubles TV', 'Enceinte colonne', 0.22, 0.28, 1.0, 249, [['Corps', '#1b1c1f']], (g, p, K) => {
    K.box(p.w, p.h, p.d, K.m(p.c1, { r: 0.5 }), 0, p.h / 2, 0); for (const y of [0.3, 0.55, 0.8]) K.cyl(0.06, 0.06, 0.01, K.m('#3a3d40', { r: 0.8 }), 0, y * p.h, p.d / 2 + 0.005, null, 20).rotation.x = Math.PI / 2;
  }, { fin: null });
  R('paravent', S, 'Rangements', 'Paravent 3 panneaux', 1.5, 0.4, 1.7, 99, [['Panneaux', '#e8dccb'], ['Cadre', '#8a6445']], (g, p, K) => {
    const pw = p.w / 3, fr = K.m(p.c2, { r: 0.6 }), pn = K.m(p.c1, { r: 0.95 });
    [-1, 0, 1].forEach((i) => { const q = K.piv(i * pw * 0.94, 0, i ? -0.12 : 0.04); q.rotation.y = i * 0.45; K.box(pw - 0.02, p.h - 0.08, 0.02, fr, 0, p.h / 2 + 0.02, 0, q); K.box(pw - 0.07, p.h - 0.16, 0.022, pn, 0, p.h / 2 + 0.02, 0, q); });
  }, { fin: null });

  // ======================= SALLE À MANGER =======================
  const SM = 'Salle à manger';
  R('table_ovale', SM, 'Tables', 'Table ovale 6 places', 2.0, 1.0, 0.75, 399, [['Plateau', WOOD], ['Pieds', ANTH]], (g, p, K) => {
    const { w, d, h } = p, t = K.cyl(0.5, 0.5, 0.035, K.body(p.c1), 0, h - 0.018, 0, null, 48); t.scale.set(w, 1, d);
    for (const s of [-1, 1]) { K.cyl(0.035, 0.05, h - 0.035, K.m(p.c2, { r: 0.5 }), s * w * 0.28, (h - 0.035) / 2, 0, null, 16); K.box(0.06, 0.03, d * 0.6, K.m(p.c2, { r: 0.5 }), s * w * 0.28, 0.015, 0); }
  }, { fin: 'bois' });
  R('table_carree', SM, 'Tables', 'Table carrée 4 places', 0.9, 0.9, 0.75, 149, [['Plateau', '#f1efea'], ['Pieds', OAK]], (g, p, K) => {
    const { w, d, h } = p; K.box(w, 0.03, d, K.body(p.c1), 0, h - 0.015, 0); K.box(w - 0.1, 0.08, d - 0.1, K.body(p.c1), 0, h - 0.07, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = K.cyl(0.022, 0.016, h - 0.03, K.m(p.c2, { r: 0.55, map: 'bois' }), sx * (w / 2 - 0.08), (h - 0.03) / 2, sz * (d / 2 - 0.08), null, 12); l.rotation.z = -sx * 0.06; l.rotation.x = sz * 0.06; }
  });
  R('table_ronde_pied', SM, 'Tables', 'Table ronde pied central', 1.2, 1.2, 0.75, 249, [['Plateau', WHITE], ['Pied', '#1b1c1f']], (g, p, K) => {
    const { w, d, h } = p, t = K.cyl(0.5, 0.5, 0.03, K.body(p.c1), 0, h - 0.015, 0, null, 48); t.scale.set(w, 1, d);
    K.cyl(0.05, 0.05, h - 0.03, K.m(p.c2, { r: 0.5 }), 0, (h - 0.03) / 2, 0, null, 16); K.cyl(0.3, 0.32, 0.03, K.m(p.c2, { r: 0.5 }), 0, 0.015, 0, null, 32);
  });
  R('chaise_scandi', SM, 'Chaises et bancs', 'Chaise scandinave', 0.47, 0.53, 0.82, 49, [['Coque', '#f1efea'], ['Pieds', OAK]], (g, p, K) => {
    const { w, d, h } = p, sm = K.m(p.c1, { r: 0.6 }), lm = K.m(p.c2, { r: 0.55, map: 'bois' });
    K.rbox(w, 0.04, d - 0.05, 0.015, sm, 0, 0.45, 0.02); const b = K.rbox(w, 0.3, 0.03, 0.015, sm, 0, 0.66, -d / 2 + 0.05); b.rotation.x = -0.15;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = K.cyl(0.016, 0.012, 0.44, lm, sx * (w / 2 - 0.06), 0.22, sz * (d / 2 - 0.08), null, 10); l.rotation.z = -sx * 0.1; l.rotation.x = sz * 0.1; }
  }, { fin: null });
  R('chaise_cannee', SM, 'Chaises et bancs', 'Chaise cannée bois', 0.46, 0.52, 0.86, 89, [['Bois', '#3a2a20'], ['Cannage', '#d9c3a5']], (g, p, K) => {
    const { w, d, h } = p, wd = K.m(p.c1, { r: 0.55, map: 'bois' }), ca = K.m(p.c2, { r: 0.9 });
    K.box(w, 0.035, d - 0.04, wd, 0, 0.45, 0); K.box(w - 0.06, 0.01, d - 0.1, ca, 0, 0.47, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(0.03, sz < 0 ? h : 0.45, 0.03, wd, sx * (w / 2 - 0.02), (sz < 0 ? h : 0.45) / 2, sz * (d / 2 - 0.04));
    K.box(w - 0.04, 0.04, 0.025, wd, 0, h - 0.03, -d / 2 + 0.04); K.box(w - 0.1, 0.3, 0.01, ca, 0, h - 0.22, -d / 2 + 0.04);
  }, { fin: null });
  R('banc_table', SM, 'Chaises et bancs', 'Banc de table 160 bois', 1.6, 0.35, 0.45, 99, [['Bois', OAK], ['Pieds', '#1b1c1f']], (g, p, K) => {
    const { w, d, h } = p; K.box(w, 0.04, d, K.m(p.c1, { r: 0.55, map: 'bois' }), 0, h - 0.02, 0);
    for (const s of [-1, 1]) { K.box(0.03, h - 0.04, 0.03, K.m(p.c2, { r: 0.5 }), s * (w / 2 - 0.12), (h - 0.04) / 2, -d / 2 + 0.05); K.box(0.03, h - 0.04, 0.03, K.m(p.c2, { r: 0.5 }), s * (w / 2 - 0.12), (h - 0.04) / 2, d / 2 - 0.05); }
  }, { fin: null });
  R('buffet_haut', SM, 'Rangements', 'Buffet haut 4 portes (vaisselier)', 1.2, 0.45, 1.9, 449, [['Corps', '#ece6d6'], ['Poignées', '#1b1c1f']], (g, p, K) => {
    unit({ doors: 2, drawers: 2, drawerFrac: 0.3, legs: 0.1 })(g, { ...p, h: 0.9 }, K);
    const top = K.piv(0, 0.9, -0.08); unit({ doors: 2, glass: true, shelves: 2 })(top, { ...p, h: p.h - 0.9, d: p.d - 0.16 }, K);
  }, A_P);

  // ======================= CHAMBRE =======================
  const C = 'Chambre';
  const bedCols = [['Cadre', '#d9b58a'], ['Linge de lit', '#e8dccb']];
  R('lit180', C, 'Lits', 'Lit king size 180 × 200', 1.88, 2.1, 1.05, 449, bedCols, bed, { anim: 'Défaire / refaire le lit', fin: 'bois' });
  R('lit_coffre', C, 'Lits', 'Lit coffre 160 relevable', 1.7, 2.1, 1.0, 549, [['Tissu', '#8f9598'], ['Linge de lit', '#f1efea']], (g, p, K) => {
    const { w, d, h } = p, fab = K.m(p.c1, { r: 0.95 }), li = K.m(p.c2, { r: 0.95 });
    K.rbox(w, 0.35, d, 0.03, fab, 0, 0.175, 0); K.box(w - 0.08, 0.02, d - 0.08, K.m('#5a5f66', { r: 0.8 }), 0, 0.3, 0);
    K.rbox(w + 0.04, h, 0.1, 0.04, fab, 0, h / 2, -d / 2 - 0.03);
    const pv = K.piv(0, 0.35, -d / 2 + 0.08); K.rbox(w - 0.06, 0.22, d - 0.12, 0.05, li, 0, 0.11, d / 2 - 0.06, pv);
    for (const s of [-1, 1]) K.rbox(0.6, 0.13, 0.4, 0.06, K.m(tone(p.c2, -0.05), { r: 0.95 }), s * w / 4, 0.28, 0.3, pv);
    K.add(pv, { rot: ['x', -0.75] });
  }, { anim: 'Ouvrir le coffre', fin: null });
  R('armoire_miroir', C, 'Armoires et dressings', 'Dressing 2 m portes miroirs', 2.0, 0.6, 2.36, 599, [['Corps', WHITE]], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1), mi = K.m('#d7e2e8', { r: 0.03, m: 1 }), n = 4, dw = w / n;
    K.carcass(w, h, d, bm, 0, 0, 0, g, 0.02); K.cyl(0.012, 0.012, w - 0.06, K.inox(), 0, h - 0.3, 0, g).rotation.z = Math.PI / 2;
    for (let i = 0; i < n; i++) { const hg = i % 2 ? -1 : 1, pv = K.piv(-w / 2 + i * dw + (hg > 0 ? 0 : dw), 0.015, d / 2); K.box(dw - 0.004, h - 0.03, 0.02, bm, hg * dw / 2, (h - 0.03) / 2, 0, pv); K.box(dw - 0.06, h - 0.12, 0.004, mi, hg * dw / 2, (h - 0.03) / 2, 0.012, pv); K.add(pv, { rot: ['y', -hg * 1.6] }); }
  }, A_P);
  R('armoire_angle', C, 'Armoires et dressings', 'Armoire d\'angle', 1.1, 1.1, 2.0, 349, [['Façades', WHITE]], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1); K.box(0.6, h, 0.02, bm, -w / 2 + 0.3, h / 2, -d / 2 + 0.01); K.box(0.02, h, 0.6, bm, -w / 2 + 0.01, h / 2, -d / 2 + 0.3);
    K.carcass(w - 0.6, h, 0.6, bm, 0.3, 0, -d / 2 + 0.3, g, 0.02); K.carcass(0.6, h, d - 0.6, bm, -w / 2 + 0.3, 0, 0.3, g, 0.02);
    K.cdoor(w - 0.6, h - 0.03, bm, 0.3, 0.015, -d / 2 + 0.6, -1, g, { hy: h * 0.5, hlen: 0.3 }); const q = K.piv(-w / 2 + 0.6, 0, 0.3); q.rotation.y = Math.PI / 2; K.cdoor(d - 0.6, h - 0.03, bm, 0, 0.015, 0, 1, q, { hy: h * 0.5, hlen: 0.3 });
  }, A_P);
  R('commode4', C, 'Commodes et chevets', 'Commode 4 tiroirs (type Malm)', 0.8, 0.48, 1.0, 129, [['Corps', WHITE], ['Poignées', '#c3c8cd']], unit({ drawers: 4 }), A_T);
  R('chevet2', C, 'Commodes et chevets', 'Chevet 2 tiroirs', 0.4, 0.38, 0.55, 59, [['Corps', OAK], ['Poignées', '#1b1c1f']], unit({ drawers: 2, legs: 0.1 }), { ...A_T, fin: 'bois' });
  R('banc_coffre', C, 'Coiffeuses et bancs', 'Banc coffre', 1.0, 0.4, 0.45, 89, [['Corps', WHITE], ['Coussin', '#9db4c0']], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1); K.carcass(w, h - 0.06, d, bm, 0, 0, 0, g, 0.02);
    const pv = K.piv(0, h - 0.06, -d / 2); K.box(w, 0.02, d, bm, 0, 0.01, d / 2, pv); K.rbox(w - 0.04, 0.05, d - 0.04, 0.02, K.m(p.c2, { r: 0.95 }), 0, 0.045, d / 2, pv); K.add(pv, { rot: ['x', -1.2] });
  }, { anim: 'Ouvrir le coffre' });
  R('fauteuil_chambre', C, 'Coiffeuses et bancs', 'Fauteuil crapaud', 0.7, 0.75, 0.8, 179, [['Tissu', '#d6a69a'], ['Pieds', OAK]], (g, p, K) => { sofaParts(g, p, K, {}); }, { fin: null });

  // ======================= ENFANT =======================
  const E = 'Enfant';
  R('lit_mezzanine', E, 'Lits', 'Lit mezzanine 90 + bureau', 1.0, 2.05, 1.9, 349, [['Structure', WHITE], ['Linge', '#9db4c0']], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1), top = 1.45;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(0.05, h, 0.05, bm, sx * (w / 2 - 0.025), h / 2, sz * (d / 2 - 0.025));
    K.box(w, 0.08, d, bm, 0, top, 0); K.rbox(w - 0.08, 0.15, d - 0.1, 0.04, K.m(p.c2, { r: 0.95 }), 0, top + 0.11, 0);
    for (const sx of [-1, 1]) K.box(0.03, 0.3, d - 0.4, bm, sx * (w / 2 - 0.015), top + 0.2, -0.2);
    K.box(w - 0.1, 0.03, 0.6, K.m(OAK, { r: 0.55, map: 'bois' }), 0, 0.74, -d / 2 + 0.35);
    for (let i = 0; i < 5; i++) K.box(0.4, 0.03, 0.03, bm, w / 2 - 0.25, 0.3 + i * 0.28, d / 2 + 0.02);
  });
  R('lits_superposes', E, 'Lits', 'Lits superposés 90', 1.0, 2.05, 1.65, 299, [['Structure', '#d9b58a'], ['Linge', '#9db4c0']], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(0.05, h, 0.05, bm, sx * (w / 2 - 0.025), h / 2, sz * (d / 2 - 0.025));
    for (const y of [0.25, 1.25]) { K.box(w, 0.06, d, bm, 0, y, 0); K.rbox(w - 0.08, 0.14, d - 0.1, 0.04, K.m(y > 1 ? tone(p.c2, -0.15) : p.c2, { r: 0.95 }), 0, y + 0.1, 0); }
    K.box(0.03, 0.25, d - 0.4, bm, w / 2 - 0.015, 1.5, -0.2);
    for (let i = 0; i < 4; i++) K.box(0.03, 0.03, 0.3, bm, w / 2 + 0.02, 0.45 + i * 0.27, d / 2 - 0.2);
  }, { fin: 'bois' });
  R('lit_bebe', E, 'Lits', 'Lit bébé à barreaux 60 × 120', 0.66, 1.26, 0.9, 129, [['Bois', WHITE], ['Linge', '#e8dccb']], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(0.04, h, 0.04, bm, sx * (w / 2 - 0.02), h / 2, sz * (d / 2 - 0.02));
    K.box(w - 0.04, 0.04, d - 0.04, bm, 0, 0.3, 0); K.rbox(w - 0.08, 0.1, d - 0.08, 0.03, K.m(p.c2, { r: 0.95 }), 0, 0.37, 0);
    for (const sx of [-1, 1]) { K.box(0.03, 0.03, d - 0.04, bm, sx * (w / 2 - 0.02), h - 0.04, 0); for (let i = 0; i < 14; i++) K.cyl(0.01, 0.01, h - 0.36, bm, sx * (w / 2 - 0.02), 0.32 + (h - 0.36) / 2, -d / 2 + 0.08 + i * ((d - 0.16) / 13), null, 6); }
    for (const sz of [-1, 1]) K.box(w - 0.04, h - 0.32, 0.02, bm, 0, 0.32 + (h - 0.32) / 2, sz * (d / 2 - 0.02));
  });
  R('commode_langer', E, 'Rangements', 'Commode à langer', 0.9, 0.5, 0.95, 199, [['Corps', WHITE], ['Matelas', '#9db4c0']], (g, p, K) => {
    unit({ drawers: 3 })(g, { ...p, h: 0.85, c2: '#c3c8cd' }, K);
    const bm = K.body(p.c1); K.box(p.w, 0.02, p.d + 0.2, bm, 0, 0.86, -0.1); K.rbox(p.w - 0.06, 0.06, p.d + 0.12, 0.03, K.m(p.c2, { r: 0.95 }), 0, 0.9, -0.1);
  }, A_T);
  R('bibliotheque_enfant', E, 'Rangements', 'Bibliothèque frontale enfant', 0.6, 0.3, 0.9, 49, [['Corps', WHITE]], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1); for (const s of [-1, 1]) K.box(0.018, h, d, bm, s * (w / 2 - 0.009), h / 2, 0);
    for (let i = 0; i < 4; i++) { K.box(w - 0.036, 0.015, d * (0.4 + i * 0.15), bm, 0, 0.1 + i * 0.22, -d / 2 + d * (0.2 + i * 0.075)); K.box(w - 0.036, 0.06, 0.012, bm, 0, 0.13 + i * 0.22, -d / 2 + d * (0.4 + i * 0.15)); }
  });

  // ======================= BUREAU =======================
  const B = 'Bureau';
  R('fauteuil_gamer', B, 'Sièges', 'Fauteuil gamer', 0.7, 0.7, 1.35, 199, [['Revêtement', '#1b1c1f'], ['Liserés', '#c0392b']], (g, p, K) => {
    const { w, h } = p, fab = K.m(p.c1, { r: 0.6 }), ac = K.m(p.c2, { r: 0.6 }), mt = K.m('#2a2a2a', { r: 0.4, m: 0.5 });
    for (let i = 0; i < 5; i++) { const a = (i * 2 * Math.PI) / 5; const l = K.box(0.33, 0.04, 0.05, mt, Math.cos(a) * 0.16, 0.08, Math.sin(a) * 0.16); l.rotation.y = -a; K.sph(0.03, K.black(), Math.cos(a) * 0.32, 0.03, Math.sin(a) * 0.32); }
    K.cyl(0.03, 0.03, 0.35, mt, 0, 0.27, 0, null, 12);
    K.rbox(w - 0.14, 0.12, 0.55, 0.05, fab, 0, 0.5, 0.03);
    const b = K.rbox(0.56, h - 0.55, 0.14, 0.08, fab, 0, 0.55 + (h - 0.55) / 2, -0.27); b.rotation.x = -0.12;
    for (const s of [-1, 1]) { K.box(0.04, h - 0.65, 0.02, ac, s * 0.2, 0.6 + (h - 0.65) / 2, -0.19); K.box(0.06, 0.04, 0.3, K.black(), s * (w / 2 - 0.08), 0.7, 0.05); }
  }, { fin: null });
  R('bureau_gamer', B, 'Bureaux', 'Bureau gamer 140', 1.4, 0.7, 0.76, 179, [['Plateau', '#1b1c1f'], ['Piètement', '#c0392b']], (g, p, K) => {
    const { w, d, h } = p; K.rbox(w, 0.025, d, 0.01, K.m(p.c1, { r: 0.5 }), 0, h - 0.012, 0);
    for (const s of [-1, 1]) { const m = K.m(p.c2, { r: 0.4, m: 0.4 }); K.box(0.06, h - 0.03, 0.06, m, s * (w / 2 - 0.12), (h - 0.03) / 2, 0); K.box(0.08, 0.04, d - 0.05, m, s * (w / 2 - 0.12), 0.02, 0); }
    const led = K.m('#4aa3ff', { r: 0.4 }); led.emissive.set('#2f7bff'); led.emissiveIntensity = 1.5; K.box(w - 0.04, 0.006, 0.006, led, 0, h - 0.028, d / 2 - 0.003);
  });
  R('secretaire', B, 'Bureaux', 'Secrétaire à abattant', 0.8, 0.4, 1.2, 229, [['Corps', OAK], ['Pieds', '#1b1c1f']], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1), lg = 0.25; K.legs(w, d, lg, 0.018, K.m(p.c2, { r: 0.5 }), 0.05); K.carcass(w, h - lg, d, bm, 0, lg, 0, g, 0.02);
    K.drawer(w - 0.04, 0.35, d - 0.05, bm, 0, lg + 0.02, d / 2, g, { travel: 0.25 });
    const pv = K.piv(0, lg + 0.4, d / 2); K.box(w - 0.04, h - lg - 0.42, 0.02, bm, 0, (h - lg - 0.42) / 2, 0.01, pv); K.add(pv, { rot: ['x', Math.PI / 2] });
  }, { anim: 'Ouvrir l\'abattant', fin: 'bois' });

  // ======================= ENTRÉE =======================
  const EN = 'Entrée';
  R('vestiaire', EN, 'Rangements', 'Vestiaire (banc + patères + étagère)', 1.0, 0.4, 1.85, 179, [['Bois', OAK], ['Structure', '#1b1c1f']], (g, p, K) => {
    const { w, d, h } = p, wd = K.m(p.c1, { r: 0.55, map: 'bois' }), mt = K.m(p.c2, { r: 0.5 });
    for (const s of [-1, 1]) { K.box(0.03, h, 0.03, mt, s * (w / 2 - 0.015), h / 2, -d / 2 + 0.03); K.box(0.03, 0.45, 0.03, mt, s * (w / 2 - 0.015), 0.225, d / 2 - 0.03); K.box(0.03, 0.03, d, mt, s * (w / 2 - 0.015), 0.45, 0); }
    K.box(w, 0.03, d, wd, 0, 0.46, 0); K.box(w, 0.025, d * 0.6, wd, 0, 0.12, 0); K.box(w, 0.03, 0.3, wd, 0, h - 0.015, -d / 2 + 0.15);
    for (let i = 0; i < 5; i++) K.cyl(0.008, 0.008, 0.07, mt, -w / 2 + 0.15 + i * (w - 0.3) / 4, h - 0.3, -d / 2 + 0.06, null, 8).rotation.x = Math.PI / 2;
  }, { fin: null });
  R('chaussures_abattants', EN, 'Rangements', 'Meuble à chaussures 2 abattants', 0.8, 0.24, 1.0, 79, [['Corps', WHITE]], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1); K.carcass(w, h, d, bm, 0, 0, 0, g, 0.018);
    for (let i = 0; i < 2; i++) { const y0 = 0.02 + i * (h - 0.04) / 2, hh = (h - 0.04) / 2, pv = K.piv(0, y0, d / 2); K.box(w - 0.04, hh - 0.01, 0.018, bm, 0, hh / 2, 0.009, pv); K.box(0.12, 0.012, 0.016, K.inox(), 0, hh - 0.05, 0.024, pv); K.add(pv, { rot: ['x', 0.7] }); }
  }, { anim: 'Ouvrir les abattants' });

  // ======================= SALLE DE BAIN =======================
  const SB = 'Salle de bain';
  R('vasque_suspendu60', SB, 'Meubles', 'Meuble vasque suspendu 60', 0.6, 0.46, 0.55, 199, [['Façades', '#c8a57a'], ['Plan vasque', '#f4f4f2']], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1); K.carcass(w, h - 0.04, d, bm, 0, 0, 0, g, 0.018);
    K.drawer(w - 0.02, h - 0.06, d - 0.05, bm, 0, 0.005, d / 2, g, { travel: 0.3 });
    const cm = K.m(p.c2, { r: 0.15 }); K.box(w, 0.04, d, cm, 0, h - 0.02, 0); K.box(w - 0.16, 0.01, d - 0.16, K.m('#d9dcde', { r: 0.2 }), 0, h + 0.001, 0.02);
    K.cyl(0.012, 0.012, 0.2, K.inox(), 0, h + 0.1, -d / 2 + 0.06, null, 10); K.box(0.02, 0.02, 0.12, K.inox(), 0, h + 0.2, -d / 2 + 0.11);
  }, { ...A_T, elev: 0.35, fin: 'bois' });
  R('armoire_toilette', SB, 'Meubles', 'Armoire de toilette miroir', 0.6, 0.15, 0.7, 89, [['Corps', WHITE]], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1), mi = K.m('#d7e2e8', { r: 0.03, m: 1 }); K.carcass(w, h, d, bm, 0, 0, 0, g, 0.016);
    const pv = K.piv(-w / 2, 0.005, d / 2); K.box(w - 0.004, h - 0.01, 0.018, bm, w / 2, h / 2, 0, pv); K.box(w - 0.03, h - 0.04, 0.004, mi, w / 2, h / 2, 0.011, pv); K.add(pv, { rot: ['y', -1.6] });
    const led = K.m('#ffffff', { r: 0.4 }); led.emissive.set('#fff3dd'); led.emissiveIntensity = 1.1; K.box(w - 0.04, 0.012, 0.03, led, 0, -0.01, d / 2 - 0.02);
  }, { anim: 'Ouvrir la porte', elev: 1.25 });
  R('colonne_buanderie', SB, 'Meubles', 'Colonne buanderie (au-dessus du lave-linge)', 0.65, 0.6, 2.2, 249, [['Corps', WHITE], ['Poignées', '#c3c8cd']], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1); for (const s of [-1, 1]) K.box(0.018, h, d, bm, s * (w / 2 - 0.009), h / 2, 0);
    K.box(w, 0.018, d, bm, 0, 0.9, 0); unit({ doors: 2, shelves: 1 })(K.piv(0, 0.92, 0), { ...p, h: h - 0.92 }, K);
  }, A_P);
  R('pare_baignoire', SB, 'Bain et douche', 'Pare-baignoire vitré', 0.8, 0.05, 1.4, 99, [['Profilés', '#c3c8cd']], (g, p, K) => {
    K.box(p.w, p.h, 0.008, K.glass(), 0, p.h / 2, 0); K.box(0.02, p.h, 0.03, K.m(p.c1, { m: 0.8, r: 0.3 }), -p.w / 2, p.h / 2, 0);
  }, { elev: 0.58, fin: null });

  // ======================= EXTÉRIEUR =======================
  const X = 'Extérieur';
  R('salon_jardin', X, 'Mobilier de jardin', 'Salon de jardin (canapé + 2 fauteuils + table)', 3.0, 2.4, 0.8, 899, [['Coussins', '#d8d2c4'], ['Structure', '#4b5359']], (g, p, K) => {
    const st = K.m(p.c2, { r: 0.5 }), cu = K.m(p.c1, { r: 0.95 });
    const seat = (x, z, w, rot) => { const q = K.piv(x, 0, z); q.rotation.y = rot; K.box(w, 0.35, 0.75, st, 0, 0.175, 0, q); K.rbox(w - 0.08, 0.12, 0.65, 0.04, cu, 0, 0.41, 0.03, q); K.box(w, 0.4, 0.1, st, 0, 0.55, -0.33, q); K.rbox(w - 0.1, 0.35, 0.12, 0.05, cu, 0, 0.62, -0.25, q); };
    seat(0, -p.d / 2 + 0.4, 1.8, 0); seat(-p.w / 2 + 0.4, 0.3, 0.75, Math.PI / 2); seat(p.w / 2 - 0.4, 0.3, 0.75, -Math.PI / 2);
    K.box(1.0, 0.04, 0.6, st, 0, 0.4, 0.4); K.box(0.9, 0.36, 0.5, st, 0, 0.18, 0.4);
  }, { fin: null });
  R('spa', X, 'Aménagements', 'Spa 4 places', 2.0, 2.0, 0.85, 3990, [['Habillage', '#5a4636'], ['Eau', '#5fb7cf']], (g, p, K) => {
    const { w, d, h } = p, hb = K.m(p.c1, { r: 0.7, map: 'bois' }); K.rbox(w, h, d, 0.08, hb, 0, h / 2, 0);
    const rim = K.m('#e9e6df', { r: 0.4 }), b = 0.12;   // margelle, cuve et eau
    K.box(w, 0.04, b, rim, 0, h + 0.02, -d / 2 + b / 2); K.box(w, 0.04, b, rim, 0, h + 0.02, d / 2 - b / 2); K.box(b, 0.04, d - 2 * b, rim, -w / 2 + b / 2, h + 0.02, 0); K.box(b, 0.04, d - 2 * b, rim, w / 2 - b / 2, h + 0.02, 0);
    K.box(w - 2 * b, 0.01, d - 2 * b, K.m(p.c2, { r: 0.05, m: 0.1 }), 0, h + 0.008, 0);
  }, { fin: null });
  R('balancelle', X, 'Mobilier de jardin', 'Balancelle 2 places', 1.8, 1.2, 1.7, 249, [['Toile', '#d8d2c4'], ['Structure', '#4b5359']], (g, p, K) => {
    const { w, d, h } = p, st = K.m(p.c2, { r: 0.5, m: 0.3 });
    for (const s of [-1, 1]) for (const sz of [-1, 1]) { const l = K.box(0.04, h, 0.04, st, s * (w / 2 - 0.05), h / 2, sz * 0.35); l.rotation.x = -sz * 0.33; }
    K.box(w, 0.04, 0.04, st, 0, h - 0.02, 0);
    const pv = K.piv(0, h - 0.04, 0), cu = K.m(p.c1, { r: 0.95 }); K.box(w - 0.4, 0.1, 0.55, cu, 0, -1.0, 0.05, pv); K.box(w - 0.4, 0.5, 0.1, cu, 0, -0.75, -0.25, pv);
    for (const s of [-1, 1]) K.cyl(0.008, 0.008, 0.95, st, s * (w / 2 - 0.25), -0.5, 0, pv, 6);
    K.add(pv, { rot: ['x', 0.25] });
  }, { anim: 'Balancer', fin: null });
  R('hamac', X, 'Mobilier de jardin', 'Hamac sur pied', 3.0, 1.0, 1.2, 149, [['Toile', '#d9b44a'], ['Pied', '#8a6445']], (g, p, K) => {
    const { w, d, h } = p, st = K.m(p.c2, { r: 0.6, map: 'bois' }); K.box(w - 0.4, 0.06, 0.08, st, 0, 0.03, 0);
    for (const s of [-1, 1]) { const a = K.box(0.08, h + 0.1, 0.08, st, s * (w / 2 - 0.3), h / 2, 0); a.rotation.z = s * 0.45; }
    const t = K.sph(0.5, K.m(p.c1, { r: 0.95 }), 0, 0.65, 0, null, w * 0.7, 0.18, d * 0.75); void t;
  }, { fin: null });
  R('plancha', X, 'Mobilier de jardin', 'Plancha sur chariot', 1.0, 0.6, 0.9, 399, [['Chariot', '#1b1c1f']], (g, p, K) => {
    const { w, d, h } = p, c = K.m(p.c1, { r: 0.5 }); K.carcass(w, h - 0.12, d, c, 0, 0.1, 0, g, 0.02); for (const s of [-1, 1]) for (const sz of [-1, 1]) K.cyl(0.04, 0.04, 0.03, K.black(), s * (w / 2 - 0.06), 0.04, sz * (d / 2 - 0.08), null, 12).rotation.z = Math.PI / 2;
    K.box(0.6, 0.05, 0.42, K.inox(), 0, h + 0.025, 0); K.box(0.56, 0.005, 0.38, K.m('#2a2a2a', { r: 0.4, m: 0.8 }), 0, h + 0.052, 0);
  }, { fin: null });

  // ======================= DÉCO =======================
  const DE = 'Déco';
  R('etagere_echelle', DE, 'Murs', 'Étagère échelle', 0.6, 0.35, 1.8, 59, [['Bois', OAK]], (g, p, K) => {
    const { w, d, h } = p, wd = K.m(p.c1, { r: 0.55, map: 'bois' });
    for (const s of [-1, 1]) { const l = K.box(0.035, h, 0.035, wd, s * (w / 2 - 0.02), h / 2, 0); l.rotation.x = -0.18; }
    for (let i = 0; i < 4; i++) { const y = 0.3 + i * 0.42, z = 0.16 - i * 0.075; K.box(w - 0.06, 0.02, d * (1 - i * 0.18), wd, 0, y, z - d * 0.2); }
    K.sph(0.08, K.m('#4f7a55', { r: 0.9 }), 0.1, 1.2, -0.05); K.cyl(0.05, 0.04, 0.1, K.m('#e9e6df', { r: 0.6 }), 0.1, 1.11, -0.05, null, 12);
  }, { fin: null });
  R('plante_suspendue', DE, 'Plantes', 'Plante suspendue', 0.35, 0.35, 0.9, 25, [['Pot', '#e9e6df'], ['Feuillage', '#4f7a55']], (g, p, K) => {
    const pot = K.m(p.c1, { r: 0.6 }), lf = K.m(p.c2, { r: 0.9 }); K.cyl(0.12, 0.09, 0.14, pot, 0, 0.3, 0, null, 16);
    for (const a of [0, 2.1, 4.2]) K.cyl(0.002, 0.002, 0.55, K.m('#8a6445', { r: 0.9 }), Math.cos(a) * 0.08, 0.62, Math.sin(a) * 0.08, null, 4);
    for (let i = 0; i < 6; i++) { const a = i * 1.05; K.sph(0.07, lf, Math.cos(a) * 0.12, 0.25 - (i % 3) * 0.08, Math.sin(a) * 0.12, null, 0.8, 1.6, 0.8); }
  }, { elev: 1.4, fin: null });
  R('miroir_arche', DE, 'Murs', 'Miroir arche sur pied', 0.6, 0.05, 1.7, 129, [['Cadre', '#c9a24b']], (g, p, K) => {
    const { w, h } = p, fr = K.m(p.c1, { m: 0.8, r: 0.3 }), mi = K.m('#d7e2e8', { r: 0.03, m: 1 });
    K.box(w, h - w / 2, 0.03, fr, 0, (h - w / 2) / 2, 0); K.cyl(w / 2, w / 2, 0.03, fr, 0, h - w / 2, 0, null, 32).rotation.x = Math.PI / 2;
    K.box(w - 0.05, h - w / 2, 0.004, mi, 0, (h - w / 2) / 2 + 0.02, 0.017); K.cyl(w / 2 - 0.025, w / 2 - 0.025, 0.004, mi, 0, h - w / 2, 0.017, null, 32).rotation.x = Math.PI / 2;
  }, { fin: null });

  // surfaces qui portent des objets posés (lampe, TV, barre de son…) et meubles libres (non attirés par les murs)
  return { surf: ['table_basse_relevable', 'tables_gigognes', 'meuble_tv_suspendu', 'meuble_tv_bois', 'bahut', 'table_ovale', 'table_carree', 'table_ronde_pied', 'commode4', 'chevet2', 'commode_langer', 'secretaire', 'bureau_gamer', 'vasque_suspendu60', 'banc_coffre'],
    free: ['fauteuil_relax', 'fauteuil_bascule', 'table_basse_relevable', 'tables_gigognes', 'table_ovale', 'table_carree', 'table_ronde_pied', 'chaise_scandi', 'chaise_cannee', 'fauteuil_gamer', 'fauteuil_chambre', 'salon_jardin', 'spa', 'balancelle', 'hamac', 'plancha', 'plante_suspendue', 'paravent'] };
}
