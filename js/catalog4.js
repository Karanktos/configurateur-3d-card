// Série inspirée des gammes IKEA classiques (catalogue 2021) : formes et dimensions typiques, noms génériques « type … ».
// Même repère que catalog.js : origine au sol au centre, +x largeur, +z face avant, +y hauteur.
export function registerIkea(reg, H) {
  const { unit, sofaParts, bed, wardrobe, tone, WOOD, WHITE, OAK } = H;
  const R = (id, cat, sub, name, w, d, h, price, colors, build, ex = {}) => reg(id, cat, name, w, d, h, price, colors, build, { sub, ...ex });
  const A_P = { anim: 'Ouvrir les portes' }, A_T = { anim: 'Ouvrir les tiroirs' };
  const PIN = '#e2c49a', BIRCH = '#e8d3b0', BLACKB = '#2e2b29';
  const wood = (K, c) => K.m(c, { r: 0.55, map: 'bois' });

  // ======================= SALON =======================
  const S = 'Salon';
  R('canape_soderhamn', S, 'Canapés et fauteuils', 'Canapé bas modulable 3 places (type Söderhamn)', 2.0, 0.99, 0.69, 599, [['Tissu', '#c9c2b8'], ['Pieds', '#1b1c1f']], (g, p, K) => {
    const { w, d, h } = p, fab = K.m(p.c1, { r: 0.95 }), n = 3, sw = w / n;
    K.box(w, 0.08, d - 0.1, K.m(p.c2, { r: 0.5 }), 0, 0.04, -0.03);
    for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.5) * sw; K.rbox(sw - 0.01, 0.22, d - 0.12, 0.06, fab, x, 0.21, 0.04); K.rbox(sw - 0.04, 0.38, 0.2, 0.08, fab, x, 0.44, -d / 2 + 0.13); }
  });
  R('canape_ektorp', S, 'Canapés et fauteuils', 'Canapé 3 places à housse (type Ektorp)', 2.18, 0.88, 0.88, 449, [['Housse', '#e8e1d4'], ['Pieds', '#e8e1d4']], (g, p, K) => {
    sofaParts(g, p, K, {}); const fab = K.m(p.c1, { r: 0.95 }); for (const s of [-1, 1]) K.rbox(0.24, 0.18, p.d - 0.04, 0.09, fab, s * (p.w / 2 - 0.12), 0.68, 0);
  }, { fin: null });
  R('canape_landskrona', S, 'Canapés et fauteuils', 'Canapé cuir pieds métal (type Landskrona)', 2.04, 0.89, 0.78, 999, [['Cuir', '#5a3a28'], ['Pieds', '#c3c8cd']], (g, p, K) => {
    sofaParts(g, p, { ...K, m: (c, o = {}) => K.m(c, { ...o, r: Math.min(o.r ?? 0.6, 0.45) }) }, {});
  }, { fin: null });
  R('fauteuil_oreilles', S, 'Canapés et fauteuils', 'Fauteuil à oreilles (type Strandmon)', 0.82, 0.96, 1.01, 279, [['Tissu', '#2f5d50'], ['Pieds', OAK]], (g, p, K) => {
    const { w, d, h } = p, fab = K.m(p.c1, { r: 0.95 }), lg = K.m(p.c2, { r: 0.55 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.cyl(0.02, 0.015, 0.18, lg, sx * (w / 2 - 0.08), 0.09, sz * (d / 2 - 0.1), null, 10);
    K.rbox(w - 0.2, 0.16, d - 0.25, 0.05, fab, 0, 0.36, 0.06); K.rbox(w - 0.08, 0.14, d - 0.1, 0.04, fab, 0, 0.25, 0);
    const b = K.rbox(w - 0.16, h - 0.35, 0.16, 0.07, fab, 0, 0.35 + (h - 0.35) / 2, -d / 2 + 0.12); b.rotation.x = -0.18;
    for (const s of [-1, 1]) { K.rbox(0.12, 0.3, d - 0.2, 0.05, fab, s * (w / 2 - 0.06), 0.5, 0.02); const ear = K.rbox(0.14, 0.34, 0.24, 0.06, fab, s * (w / 2 - 0.1), h - 0.2, -d / 2 + 0.22); ear.rotation.y = -s * 0.5; }
  }, { fin: null });
  R('table_lack', S, 'Tables', 'Table basse légère (type Lack)', 0.9, 0.55, 0.45, 25, [['Corps', WHITE]], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1); K.box(w, 0.05, d, bm, 0, h - 0.025, 0); K.box(w - 0.1, 0.02, d - 0.1, bm, 0, 0.12, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(0.05, h - 0.05, 0.05, bm, sx * (w / 2 - 0.025), (h - 0.05) / 2, sz * (d / 2 - 0.025));
  });
  R('etagere_ivar', S, 'Rangements', 'Étagère pin à montants (type Ivar)', 0.89, 0.3, 1.79, 79, [['Pin', PIN]], (g, p, K) => {
    const { w, d, h } = p, wd = wood(K, p.c1);
    for (const s of [-1, 1]) { K.box(0.04, h, 0.03, wd, s * (w / 2 - 0.02), h / 2, d / 2 - 0.015); K.box(0.04, h, 0.03, wd, s * (w / 2 - 0.02), h / 2, -d / 2 + 0.015); for (let i = 0; i < 4; i++) K.box(0.02, 0.02, d - 0.04, wd, s * (w / 2 - 0.02), 0.2 + i * 0.5, 0); }
    for (let i = 0; i < 5; i++) K.box(w - 0.08, 0.02, d, wd, 0, 0.1 + i * 0.4, 0);
  }, { fin: null });
  R('etagere_fjallbo', S, 'Rangements', 'Étagère métal et bois (type Fjällbo)', 1.0, 0.36, 1.36, 99, [['Bois', '#8a6445'], ['Métal', '#1b1c1f']], (g, p, K) => {
    const { w, d, h } = p, wd = wood(K, p.c1), mt = K.m(p.c2, { r: 0.5, m: 0.4 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(0.025, h, 0.025, mt, sx * (w / 2 - 0.012), h / 2, sz * (d / 2 - 0.012));
    for (let i = 0; i < 3; i++) K.box(w, 0.025, d, wd, 0, 0.3 + i * 0.5, 0); for (const s of [-1, 1]) K.box(0.004, h, d, mt, s * (w / 2 - 0.012), h / 2, 0);
  }, { fin: null });
  R('vitrine_havsta', S, 'Rangements', 'Vitrine à moulures (type Havsta)', 0.81, 0.37, 1.34, 249, [['Corps', '#ece6d6'], ['Poignées', '#1b1c1f']], unit({ doors: 2, glass: true, shelves: 2, legs: 0.08 }), A_P);
  R('tv_besta', S, 'Meubles TV', 'Combinaison TV murale (type Bestå)', 2.4, 0.42, 1.92, 549, [['Façades', WHITE], ['Poignées', '#c3c8cd']], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1);
    unit({ doors: 4 })(g, { ...p, h: 0.48 }, K);
    for (const s of [-1, 1]) { const q = K.piv(s * (w / 2 - 0.3), 0.48, 0); unit({ doors: 1, glass: true, shelves: 3 })(q, { ...p, w: 0.6, h: h - 0.48 }, K); }
    K.box(w - 1.2, 0.03, d - 0.1, bm, 0, h - 0.2, -0.05);
  }, A_P);
  R('symfonisk_etagere', S, 'Meubles TV', 'Enceinte-étagère murale (type Symfonisk)', 0.31, 0.15, 0.1, 99, [['Corps', '#1b1c1f']], (g, p, K) => {
    K.box(p.w, p.h, p.d, K.m(p.c1, { r: 0.8 }), 0, p.h / 2, 0); K.box(p.w - 0.02, p.h - 0.02, 0.004, K.m('#3a3d40', { r: 0.95 }), 0, p.h / 2, p.d / 2);
  }, { fin: null, elev: 1.2 });
  R('desserte_raskog', S, 'Rangements', 'Desserte métal 3 niveaux (type Råskog)', 0.35, 0.45, 0.78, 35, [['Métal', '#2f6b6a']], (g, p, K) => {
    const { w, d, h } = p, mt = K.m(p.c1, { r: 0.45, m: 0.3 });
    for (const y of [0.12, 0.42, h - 0.08]) { K.box(w, 0.01, d, mt, 0, y, 0); K.box(w, 0.08, 0.01, mt, 0, y + 0.04, d / 2); K.box(w, 0.08, 0.01, mt, 0, y + 0.04, -d / 2); K.box(0.01, 0.08, d, mt, w / 2, y + 0.04, 0); K.box(0.01, 0.08, d, mt, -w / 2, y + 0.04, 0); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { K.cyl(0.008, 0.008, h - 0.05, mt, sx * w / 2, h / 2, sz * d / 2, null, 6); K.sph(0.025, K.black(), sx * w / 2, 0.025, sz * d / 2); }
  }, { fin: null });

  // ======================= SALLE À MANGER =======================
  const SM = 'Salle à manger';
  R('table_norden', SM, 'Tables', 'Table pliante à abattants (type Norden)', 0.89, 0.8, 0.74, 199, [['Bouleau', BIRCH]], (g, p, K) => {
    const { w, d, h } = p, wd = wood(K, p.c1); K.box(0.26, 0.03, d, wd, 0, h - 0.015, 0); K.box(0.24, h - 0.05, d - 0.1, wd, 0, (h - 0.05) / 2, 0);
    for (const s of [-1, 1]) { const pv = K.piv(s * 0.13, h - 0.015, 0); K.box(0.3, 0.03, d, wd, s * 0.15, 0, 0, pv); pv.rotation.z = s * -1.5; K.add(pv, { rot: ['z', s * 1.5] }); }
  }, { anim: 'Déplier', fin: null });
  R('table_ekedalen', SM, 'Tables', 'Table extensible 120-180 (type Ekedalen)', 1.2, 0.8, 0.75, 249, [['Plateau', '#4a3426'], ['Pieds', '#4a3426']], (g, p, K) => {
    const { w, d, h } = p, wd = wood(K, p.c1), lg = wood(K, p.c2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(0.05, h - 0.03, 0.05, lg, sx * (w / 2 - 0.06), (h - 0.03) / 2, sz * (d / 2 - 0.06));
    for (const s of [-1, 1]) { const pv = K.piv(s * w / 4, h - 0.015, 0); K.box(w / 2, 0.03, d, wd, 0, 0, 0, pv); K.add(pv, { slide: [s * 0.3, 0, 0] }); }
    K.box(0.6, 0.028, d - 0.02, wd, 0, h - 0.016, 0);
  }, { anim: 'Rallonger', fin: null });
  R('table_ingatorp', SM, 'Tables', 'Table ronde style campagne (type Ingatorp)', 1.1, 1.1, 0.74, 279, [['Plateau', WHITE], ['Pieds', WHITE]], (g, p, K) => {
    const { w, d, h } = p, t = K.cyl(0.5, 0.5, 0.035, K.body(p.c1), 0, h - 0.018, 0, null, 48); t.scale.set(w, 1, d);
    for (const a of [0.785, 2.356, 3.927, 5.498]) { const l = K.cyl(0.03, 0.02, h - 0.04, K.body(p.c2), Math.cos(a) * w * 0.3, (h - 0.04) / 2, Math.sin(a) * d * 0.3, null, 12); void l; }
    K.cyl(w * 0.3, w * 0.3, 0.05, K.body(p.c1), 0, h - 0.07, 0, null, 32);
  });
  R('chaise_teodores', SM, 'Chaises et bancs', 'Chaise plastique jaune (type Teodores)', 0.46, 0.5, 0.8, 25, [['Coque', '#e3b32e']], (g, p, K) => {
    const { w, d, h } = p, sm = K.m(p.c1, { r: 0.5 }); K.box(w, 0.035, d - 0.05, sm, 0, 0.45, 0.02);
    K.box(w, 0.33, 0.03, sm, 0, 0.63, -d / 2 + 0.05);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(0.03, 0.44, 0.03, sm, sx * (w / 2 - 0.03), 0.22, sz * (d / 2 - 0.05));
  }, { fin: null });
  R('chaise_ingolf', SM, 'Chaises et bancs', 'Chaise bois à barreaux (type Ingolf)', 0.43, 0.52, 0.91, 59, [['Bois', WHITE]], (g, p, K) => {
    const { w, d, h } = p, wd = K.body(p.c1); K.box(w, 0.04, d - 0.04, wd, 0, 0.45, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(0.035, sz < 0 ? h : 0.45, 0.035, wd, sx * (w / 2 - 0.02), (sz < 0 ? h : 0.45) / 2, sz * (d / 2 - 0.04));
    K.box(w - 0.04, 0.06, 0.025, wd, 0, h - 0.04, -d / 2 + 0.04); for (let i = -2; i <= 2; i++) K.box(0.025, 0.36, 0.02, wd, i * (w - 0.1) / 5, h - 0.25, -d / 2 + 0.04);
  });
  R('chaise_odger', SM, 'Chaises et bancs', 'Chaise coque bois-plastique (type Odger)', 0.45, 0.51, 0.81, 69, [['Coque', '#2f4a5e']], (g, p, K) => {
    const { w, d } = p, sm = K.m(p.c1, { r: 0.7 }); K.rbox(w, 0.04, d - 0.06, 0.02, sm, 0, 0.45, 0.02);
    const b = K.rbox(w, 0.34, 0.03, 0.02, sm, 0, 0.65, -d / 2 + 0.06); b.rotation.x = -0.12;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = K.cyl(0.018, 0.012, 0.44, sm, sx * (w / 2 - 0.06), 0.22, sz * (d / 2 - 0.08), null, 10); l.rotation.z = -sx * 0.08; l.rotation.x = sz * 0.08; }
  }, { fin: null });
  R('buffet_hemnes', SM, 'Rangements', 'Buffet 3 tiroirs 2 portes (type Hemnes)', 1.57, 0.47, 0.88, 299, [['Corps', '#4a3426'], ['Poignées', '#c3c8cd']], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1), hm = K.m(p.c2, { m: 0.7, r: 0.3 }), lg = 0.08, bh = h - lg - 0.03;
    K.box(w + 0.03, 0.03, d + 0.02, bm, 0, h - 0.015, 0); K.carcass(w, bh, d, bm, 0, lg, 0, g, 0.02); K.box(w, lg, d - 0.04, bm, 0, lg / 2, -0.01);
    const dw = (w - 0.04) / 3; for (let i = 0; i < 3; i++) K.drawer(dw - 0.006, 0.17, d - 0.06, bm, -w / 2 + 0.02 + (i + 0.5) * dw, lg + bh - 0.19, d / 2, g, { hm, travel: 0.3 });
    K.cdoor(w / 2 - 0.02, bh - 0.22, bm, -w / 4, lg + 0.01, d / 2, 1, g, { hm, knob: true }); K.cdoor(w / 2 - 0.02, bh - 0.22, bm, w / 4, lg + 0.01, d / 2, -1, g, { hm, knob: true });
  }, A_P);

  // ======================= CHAMBRE =======================
  const C = 'Chambre';
  R('lit_banquette', C, 'Lits', 'Lit banquette 3 tiroirs (type Hemnes)', 2.11, 0.98, 0.83, 349, [['Bois', WHITE], ['Linge', '#9db4c0']], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1);
    K.carcass(w, 0.33, d, bm, 0, 0, 0, g, 0.02); for (let i = 0; i < 3; i++) K.drawer(w / 3 - 0.03, 0.26, d - 0.06, bm, -w / 3 + i * w / 3, 0.03, d / 2, g, { travel: 0.4 });
    K.box(w, h - 0.33, 0.04, bm, 0, 0.33 + (h - 0.33) / 2, -d / 2 + 0.02); for (const s of [-1, 1]) K.box(0.04, h - 0.1, d, bm, s * (w / 2 - 0.02), (h - 0.1) / 2 + 0.1, 0);
    K.rbox(w - 0.1, 0.14, d - 0.1, 0.04, K.m(p.c2, { r: 0.95 }), 0, 0.42, 0.02);
  }, A_T);
  R('lit_rangement', C, 'Lits', 'Lit 140 avec tiroirs (type Brimnes)', 1.46, 2.06, 0.47, 249, [['Corps', WHITE], ['Linge', '#e8dccb']], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1); K.carcass(w, h - 0.15, d, bm, 0, 0, 0, g, 0.02);
    for (const s of [-1, 1]) { const q = K.piv(s * (w / 2), 0, 0.3); q.rotation.y = s * Math.PI / 2; K.drawer(0.8, h - 0.2, w / 2 - 0.05, bm, 0, 0.02, 0, q, { travel: 0.4 }); }
    K.rbox(w - 0.06, 0.18, d - 0.08, 0.05, K.m('#f3f1ec', { r: 0.9 }), 0, h + 0.03, 0.02); K.rbox(w - 0.08, 0.08, d - 0.6, 0.04, K.m(p.c2, { r: 0.95 }), 0, h + 0.15, 0.25);
    for (const s of [-1, 1]) K.rbox(0.55, 0.13, 0.38, 0.06, K.m(tone(p.c2, 0.3), { r: 0.95 }), s * w / 4, h + 0.2, -d / 2 + 0.3);
  }, A_T);
  R('lit_slattum', C, 'Lits', 'Lit rembourré 160 (type Slattum)', 1.68, 2.13, 0.85, 229, [['Tissu', '#8f9598'], ['Linge', '#f1efea']], (g, p, K) => {
    const { w, d, h } = p, fab = K.m(p.c1, { r: 0.95 }); K.rbox(w, 0.3, d - 0.08, 0.04, fab, 0, 0.17, 0.04); K.rbox(w, h, 0.1, 0.05, fab, 0, h / 2, -d / 2 + 0.05);
    K.rbox(w - 0.08, 0.2, d - 0.2, 0.05, K.m('#f3f1ec', { r: 0.9 }), 0, 0.42, 0.06); K.rbox(w - 0.1, 0.08, d - 0.7, 0.04, K.m(p.c2, { r: 0.95 }), 0, 0.54, 0.3);
    for (const s of [-1, 1]) K.rbox(0.6, 0.14, 0.4, 0.06, K.m(tone(p.c2, -0.05), { r: 0.95 }), s * w / 4, 0.6, -d / 2 + 0.38);
  }, { fin: null });
  R('penderie_ouverte', C, 'Armoires et dressings', 'Penderie ouverte bambou (type Nordkisa)', 1.2, 0.47, 1.86, 99, [['Bambou', '#d9b58a'], ['Vêtements', '#9db4c0']], (g, p, K) => {
    const { w, d, h } = p, wd = wood(K, p.c1); for (const s of [-1, 1]) K.box(0.03, h, d, wd, s * (w / 2 - 0.015), h / 2, 0);
    K.box(w, 0.025, d, wd, 0, h - 0.012, 0); K.box(w - 0.06, 0.02, d, wd, 0, 0.25, 0); K.cyl(0.014, 0.014, w - 0.06, wd, 0, h - 0.2, 0, null, 10).rotation.z = Math.PI / 2;
    for (let i = 0; i < 6; i++) K.box(0.42, 0.6 + (i % 3) * 0.15, 0.02, K.m([p.c2, '#e8dccb', '#4b5359', '#c97b63'][i % 4], { r: 0.95 }), -w / 2 + 0.2 + i * (w - 0.4) / 5, h - 0.55 - (i % 3) * 0.08, 0).rotation.y = Math.PI / 2;
  }, { fin: null });
  R('armoire_hauga', C, 'Armoires et dressings', 'Armoire 2 portes 3 tiroirs (type Hauga)', 1.18, 0.55, 1.99, 299, [['Façades', '#d8dad5']], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1); K.carcass(w, h, d, bm, 0, 0, 0, g, 0.02); K.box(0.02, h - 0.04, d - 0.04, bm, 0.12, h / 2, 0);
    for (let i = 0; i < 3; i++) K.drawer(w / 2 - 0.16, 0.22, d - 0.06, bm, w / 2 - (w / 2 - 0.12) / 2 - 0.01, 0.06 + i * 0.24, d / 2, g, { travel: 0.35 });
    K.cdoor(w / 2 + 0.1, h - 0.06, bm, -w / 2 + (w / 2 + 0.1) / 2 + 0.01, 0.03, d / 2, 1, g, { hy: h * 0.5, hlen: 0.3 });
    K.cdoor(w / 2 - 0.14, h - 0.8, bm, w / 2 - (w / 2 - 0.14) / 2 - 0.01, 0.78, d / 2, -1, g, { hy: (h - 0.8) * 0.5, hlen: 0.3 });
  }, A_P);
  R('commode_nordli', C, 'Commodes et chevets', 'Commode basse 6 tiroirs sans poignée (type Nordli)', 1.6, 0.47, 0.54, 249, [['Corps', WHITE]], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1), n = 4, dw = w / n; K.carcass(w, h, d, bm, 0, 0, 0, g, 0.018);
    for (let i = 0; i < n; i++) for (let j = 0; j < (i % 3 === 0 ? 2 : 1); j++) { const hh = (h - 0.04) / (i % 3 === 0 ? 2 : 1); K.drawer(dw - 0.01, hh - 0.01, d - 0.05, bm, -w / 2 + (i + 0.5) * dw, 0.02 + j * hh, d / 2, g, { nohandle: true, travel: 0.3 }); }
  }, A_T);
  R('commode_kullen', C, 'Commodes et chevets', 'Commode 5 tiroirs (type Kullen)', 0.35, 0.4, 1.12, 49, [['Corps', BLACKB], ['Poignées', '#c3c8cd']], unit({ drawers: 5 }), A_T);

  // ======================= BUREAU =======================
  const B = 'Bureau';
  R('bureau_micke', B, 'Bureaux', 'Bureau compact passe-câbles (type Micke)', 1.05, 0.5, 0.75, 79, [['Corps', WHITE], ['Poignées', '#c3c8cd']], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1); K.box(w, 0.03, d, bm, 0, h - 0.015, 0); K.box(0.02, h - 0.03, d, bm, -w / 2 + 0.01, (h - 0.03) / 2, 0);
    unit({ drawers: 2, doors: 1, drawerFrac: 0.35 })(K.piv(w / 2 - 0.2, 0, 0), { ...p, w: 0.4, h: h - 0.03 }, K);
    K.box(w - 0.4, 0.3, 0.02, bm, -0.2, h - 0.2, -d / 2 + 0.01);
  }, A_T);
  R('caisson_helmer', B, 'Rangements', 'Caisson métal 6 tiroirs à roulettes (type Helmer)', 0.28, 0.43, 0.69, 39, [['Métal', '#c0392b']], (g, p, K) => {
    const { w, d, h } = p, mt = K.m(p.c1, { r: 0.4, m: 0.4 }); K.carcass(w, h - 0.05, d, mt, 0, 0.05, 0, g, 0.01);
    for (let i = 0; i < 6; i++) K.drawer(w - 0.02, (h - 0.07) / 6 - 0.004, d - 0.04, mt, 0, 0.055 + i * (h - 0.07) / 6, d / 2, g, { travel: 0.25 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.sph(0.022, K.black(), sx * (w / 2 - 0.03), 0.022, sz * (d / 2 - 0.04));
  }, { ...A_T, fin: null });
  R('caisson_alex', B, 'Rangements', 'Caisson 5 tiroirs (type Alex)', 0.36, 0.58, 0.7, 75, [['Corps', WHITE], ['Poignées', WHITE]], unit({ drawers: 5 }), A_T);
  R('chaise_markus', B, 'Sièges', 'Fauteuil de bureau dossier haut (type Markus)', 0.62, 0.6, 1.3, 159, [['Tissu', '#2b2b2d'], ['Base', '#2a2a2a']], (g, p, K) => {
    const { w, h } = p, fab = K.m(p.c1, { r: 0.8 }), mt = K.m(p.c2, { r: 0.4, m: 0.5 });
    for (let i = 0; i < 5; i++) { const a = (i * 2 * Math.PI) / 5; const l = K.box(0.3, 0.035, 0.045, mt, Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15); l.rotation.y = -a; K.sph(0.028, K.black(), Math.cos(a) * 0.3, 0.028, Math.sin(a) * 0.3); }
    K.cyl(0.025, 0.025, 0.33, mt, 0, 0.26, 0, null, 12); K.rbox(w - 0.1, 0.1, 0.5, 0.04, fab, 0, 0.48, 0.02);
    const b = K.rbox(0.48, h - 0.6, 0.08, 0.04, K.m('#3a3a3c', { r: 0.9 }), 0, 0.55 + (h - 0.55) / 2, -0.26); b.rotation.x = -0.1;
    for (const s of [-1, 1]) K.box(0.05, 0.03, 0.26, mt, s * (w / 2 - 0.04), 0.68, 0.0);
  }, { fin: null });

  // ======================= ENFANT =======================
  const E = 'Enfant';
  R('lit_kura', E, 'Lits', 'Lit réversible haut ou bas (type Kura)', 0.99, 2.09, 1.16, 149, [['Bois', BIRCH], ['Toile', '#2f6b9a']], (g, p, K) => {
    const { w, d, h } = p, wd = K.body(p.c1), top = 0.75;
    for (const s of [-1, 1]) { K.box(0.02, h, d, wd, s * (w / 2 - 0.01), h / 2, 0); }
    K.box(w, h, 0.02, wd, 0, h / 2, -d / 2 + 0.01); K.box(w, h, 0.02, wd, 0, h / 2, d / 2 - 0.01);
    K.box(w - 0.04, 0.04, d - 0.04, wd, 0, top, 0); K.rbox(w - 0.08, 0.12, d - 0.1, 0.04, K.m('#f1efea', { r: 0.9 }), 0, top + 0.08, 0);
    const tc = K.m(p.c2, { r: 0.95 }); K.box(w - 0.06, 0.3, 0.01, tc, 0, h + 0.02, -d / 2 + 0.3); K.box(0.01, 0.3, 0.6, tc, w / 2 - 0.05, h + 0.02, -d / 2 + 0.6);
    for (let i = 0; i < 3; i++) K.box(0.36, 0.03, 0.03, wd, -w / 2 + 0.25, 0.2 + i * 0.22, d / 2 + 0.015);
  }, { fin: null });
  R('lit_sundvik', E, 'Lits', 'Lit évolutif 80 × 200 (type Sundvik)', 0.85, 1.66, 0.83, 159, [['Bois', WHITE], ['Linge', '#e8dccb']], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1);
    for (const sz of [-1, 1]) { K.box(w, sz < 0 ? h : h * 0.7, 0.04, bm, 0, (sz < 0 ? h : h * 0.7) / 2, sz * (d / 2 - 0.02)); }
    for (const s of [-1, 1]) K.box(0.03, 0.12, d - 0.04, bm, s * (w / 2 - 0.015), 0.28, 0); K.rbox(w - 0.06, 0.12, d - 0.1, 0.04, K.m(p.c2, { r: 0.95 }), 0, 0.3, 0);
  });
  R('table_enfant_mammut', E, 'Bureau et jeux', 'Table enfant + 2 chaises (type Mammut)', 0.77, 0.55, 0.48, 59, [['Plateau', '#e6a7a7'], ['Pieds', '#2f6b9a']], (g, p, K) => {
    const { w, d, h } = p, tp = K.m(p.c1, { r: 0.5 }), lg = K.m(p.c2, { r: 0.5 });
    K.rbox(w, 0.03, d, 0.01, tp, 0, h - 0.015, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.cyl(0.035, 0.03, h - 0.03, lg, sx * (w / 2 - 0.07), (h - 0.03) / 2, sz * (d / 2 - 0.07), null, 12);
    for (const s of [-1, 1]) { const x = s * (w / 2 + 0.2); K.rbox(0.3, 0.03, 0.3, 0.01, tp, x, 0.3, 0); K.rbox(0.3, 0.22, 0.03, 0.01, tp, x + s * 0.13, 0.45, 0).rotation.y = Math.PI / 2; for (const a of [-1, 1]) for (const b of [-1, 1]) K.cyl(0.02, 0.018, 0.29, lg, x + a * 0.11, 0.145, b * 0.11, null, 8); }
  }, { fin: null });
  R('armoire_enfant', E, 'Rangements', 'Armoire enfant (type Busunge)', 0.8, 0.52, 1.39, 199, [['Corps', '#e6c3c3'], ['Poignées', '#ffffff']], unit({ doors: 2, drawers: 1, drawerFrac: 0.2, legs: 0.06 }), A_P);

  // ======================= SALLE DE BAIN =======================
  const SB = 'Salle de bain';
  R('vasque_godmorgon', SB, 'Meubles', 'Meuble vasque 2 tiroirs (type Godmorgon)', 0.8, 0.47, 0.58, 279, [['Façades', '#c0392b'], ['Plan vasque', '#f4f4f2']], (g, p, K) => {
    const { w, d, h } = p, bm = K.m(p.c1, { r: 0.15 }); K.carcass(w, h - 0.04, d, bm, 0, 0, 0, g, 0.018);
    for (let i = 0; i < 2; i++) K.drawer(w - 0.02, (h - 0.06) / 2 - 0.005, d - 0.05, bm, 0, 0.005 + i * (h - 0.06) / 2, d / 2, g, { travel: 0.3 });
    K.box(w, 0.04, d, K.m(p.c2, { r: 0.15 }), 0, h - 0.02, 0); K.box(w - 0.2, 0.01, d - 0.16, K.m('#d9dcde', { r: 0.2 }), 0, h + 0.001, 0.02);
    K.cyl(0.012, 0.012, 0.2, K.inox(), 0, h + 0.1, -d / 2 + 0.06, null, 10); K.box(0.02, 0.02, 0.12, K.inox(), 0, h + 0.2, -d / 2 + 0.11);
  }, { ...A_T, elev: 0.3, fin: null });
  R('colonne_hemnes_sdb', SB, 'Meubles', 'Colonne salle de bain bois (type Hemnes)', 0.42, 0.38, 1.72, 199, [['Corps', WHITE], ['Poignées', '#c3c8cd']], unit({ doors: 1, drawers: 1, drawerFrac: 0.15, shelves: 3, legs: 0.12 }), A_P);
  R('etagere_bambou', SB, 'Accessoires', 'Étagère bambou 3 niveaux (type Rågrund)', 0.37, 0.37, 1.04, 39, [['Bambou', '#d9b58a']], (g, p, K) => {
    const { w, d, h } = p, wd = wood(K, p.c1); for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(0.025, h, 0.025, wd, sx * (w / 2 - 0.012), h / 2, sz * (d / 2 - 0.012));
    for (const y of [0.1, 0.5, h - 0.02]) for (let i = 0; i < 6; i++) K.box(w - 0.03, 0.015, (d - 0.04) / 6 - 0.008, wd, 0, y, -d / 2 + 0.02 + (i + 0.5) * (d - 0.04) / 6);
  }, { fin: null });
  R('miroir_eclaire', SB, 'Meubles', 'Miroir éclairé rond (LED)', 0.6, 0.04, 0.6, 79, [['Cadre', '#1b1c1f']], (g, p, K) => {
    const r = p.w / 2, led = K.m('#ffffff', { r: 0.4 }); led.emissive.set('#fff3dd'); led.emissiveIntensity = 1.2;
    K.cyl(r, r, 0.03, K.m(p.c1, { r: 0.5 }), 0, r, 0, null, 48).rotation.x = Math.PI / 2; K.cyl(r - 0.005, r - 0.005, 0.034, led, 0, r, -0.003, null, 48).rotation.x = Math.PI / 2;
    K.cyl(r - 0.03, r - 0.03, 0.036, K.m('#d7e2e8', { r: 0.03, m: 1 }), 0, r, 0.002, null, 48).rotation.x = Math.PI / 2;
  }, { elev: 1.1, fin: null });

  // ======================= ENTRÉE =======================
  const EN = 'Entrée';
  R('chaussures_hemnes', EN, 'Rangements', 'Meuble à chaussures 2 compartiments (type Hemnes)', 0.89, 0.3, 1.27, 129, [['Corps', WHITE]], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1); K.carcass(w, h, d, bm, 0, 0, 0, g, 0.02); K.box(w + 0.03, 0.03, d + 0.02, bm, 0, h + 0.015, 0);
    K.drawer(w - 0.04, 0.16, d - 0.05, bm, 0, h - 0.2, d / 2, g, { travel: 0.2 });
    for (let i = 0; i < 2; i++) { const pv = K.piv(-w / 4 + i * w / 2, 0.05, d / 2); K.box(w / 2 - 0.03, h - 0.3, 0.02, bm, 0, (h - 0.3) / 2, 0.01, pv); K.cyl(0.012, 0.012, 0.02, K.inox(), 0, h - 0.4, 0.03, pv, 10).rotation.x = Math.PI / 2; K.add(pv, { rot: ['x', 0.6] }); }
  }, { anim: 'Ouvrir les abattants' });
  R('portant_trones', EN, 'Rangements', 'Range-chaussures mural (type Trones)', 0.52, 0.18, 0.39, 25, [['Corps', WHITE]], (g, p, K) => {
    const { w, d, h } = p, bm = K.body(p.c1); K.box(w, h, 0.02, bm, 0, h / 2, -d / 2 + 0.01); for (const s of [-1, 1]) K.box(0.015, h, d, bm, s * (w / 2 - 0.008), h / 2, 0);
    const pv = K.piv(0, 0.02, d / 2); const f = K.box(w - 0.03, h - 0.04, 0.015, bm, 0, (h - 0.04) / 2, 0, pv); void f; K.add(pv, { rot: ['x', 0.7] });
  }, { anim: 'Ouvrir', elev: 0.3 });

  // ======================= EXTÉRIEUR =======================
  const X = 'Extérieur';
  R('table_applaro', X, 'Mobilier de jardin', 'Table de jardin bois teinté (type Äpplarö)', 1.4, 0.78, 0.72, 179, [['Bois', '#7a5638']], (g, p, K) => {
    const { w, d, h } = p, wd = wood(K, p.c1); for (let i = 0; i < 7; i++) K.box(w, 0.025, d / 7 - 0.01, wd, 0, h - 0.012, -d / 2 + (i + 0.5) * d / 7);
    for (const s of [-1, 1]) { K.box(0.05, h - 0.03, 0.05, wd, s * (w / 2 - 0.1), (h - 0.03) / 2, -d / 2 + 0.08); K.box(0.05, h - 0.03, 0.05, wd, s * (w / 2 - 0.1), (h - 0.03) / 2, d / 2 - 0.08); K.box(0.05, 0.04, d - 0.1, wd, s * (w / 2 - 0.1), 0.15, 0); }
  }, { fin: null });
  R('chaise_applaro', X, 'Mobilier de jardin', 'Chaise de jardin pliante bois (type Äpplarö)', 0.45, 0.53, 0.89, 39, [['Bois', '#7a5638']], (g, p, K) => {
    const { w, d, h } = p, wd = wood(K, p.c1); for (let i = 0; i < 5; i++) K.box(w - 0.04, 0.02, d / 5 - 0.01, wd, 0, 0.44, -d / 2 + (i + 0.5) * d / 5);
    for (const s of [-1, 1]) { K.box(0.03, h, 0.03, wd, s * (w / 2 - 0.02), h / 2, -d / 2 + 0.05); K.box(0.03, 0.44, 0.03, wd, s * (w / 2 - 0.02), 0.22, d / 2 - 0.05); }
    for (let i = 0; i < 4; i++) K.box(w - 0.06, 0.06, 0.015, wd, 0, 0.55 + i * 0.09, -d / 2 + 0.05);
  }, { fin: null });
  R('bain_soleil', X, 'Mobilier de jardin', 'Bain de soleil à roulettes', 0.65, 1.95, 0.4, 149, [['Structure', '#d8d2c4'], ['Coussin', '#ece7de']], (g, p, K) => {
    const { w, d } = p, st = K.m(p.c1, { r: 0.6 }); K.box(w, 0.06, d, st, 0, 0.28, 0); for (const sx of [-1, 1]) { K.box(0.05, 0.25, 0.05, st, sx * (w / 2 - 0.04), 0.13, d / 2 - 0.06); K.cyl(0.07, 0.07, 0.04, K.black(), sx * (w / 2 - 0.02), 0.07, -d / 2 + 0.1, null, 16).rotation.z = Math.PI / 2; }
    K.rbox(w - 0.06, 0.06, d * 0.62, 0.03, K.m(p.c2, { r: 0.95 }), 0, 0.34, d * 0.18);
    const pv = K.piv(0, 0.32, -d * 0.12); K.rbox(w - 0.06, 0.06, d * 0.36, 0.03, K.m(p.c2, { r: 0.95 }), 0, 0.03, -d * 0.18, pv); pv.rotation.x = 0; K.add(pv, { rot: ['x', 0.9] });
  }, { anim: 'Relever le dossier', fin: null });
}
