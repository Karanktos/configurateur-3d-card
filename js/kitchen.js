// Cuisine modulaire façon configurateur de grande surface de bricolage : meubles bas, hauts, colonnes, demi-colonnes,
// joues et fileurs aux dimensions standard (caissons de 76,8 cm, socle de 10 cm, plan de 3,8 cm), façades au choix
// (lisse, à gorge, moulurée…), poignées et finitions. Le « style de la cuisine » (façade, couleurs, poignée, plan de travail)
// est mémorisé dans le plan (meta.kitchen) et repris pour chaque nouveau meuble.
// Repère d'un meuble : origine au sol au centre de l'emprise, +x = largeur, +z = face avant, +y = hauteur.

export const SOCLE = 0.1, CB = 0.768, PT = 0.038, H_BAS = SOCLE + CB + PT, H_TOP = 2.244;   // H_TOP : haut des colonnes = haut des meubles hauts

// [id, nom, description, { look : rendu (flat | moulure | shaker | rainure | chanfrein), gorge : poignée intégrée, gloss : laqué brillant,
//   c / fin : couleur et aspect d'origine (appliqués quand on choisit la façade), brand }]
const LM = 'Leroy Merlin (Delinia)', IK = 'IKEA (Metod)';
export const FACADES = [
  ['sofia', 'Sofia', 'Lisse mat, contemporaine', { look: 'flat', brand: LM }],
  ['tokyo', 'Tokyo', 'Lisse, poignée intégrée (gorge)', { look: 'flat', gorge: true, brand: LM }],
  ['oxford', 'Oxford', 'Cadre à moulures, esprit anglais', { look: 'moulure', brand: LM }],
  ['shaker', 'Shaker', 'Cadre fin, panneau central', { look: 'shaker', brand: LM }],
  ['rainure', 'Rainurée', 'Lames verticales', { look: 'rainure', brand: LM }],
  ['brillant', 'Brillante', 'Lisse laquée brillante', { look: 'flat', gloss: true, brand: LM }],
  ['voxtorp', 'Voxtorp', 'Lisse mat, blanc', { look: 'flat', c: '#f2f1ec', fin: 'mat', brand: IK }],
  ['voxtorp_br', 'Voxtorp brillant', 'Lisse brillant, blanc', { look: 'flat', gloss: true, c: '#f6f6f4', fin: 'mat', brand: IK }],
  ['ringhult', 'Ringhult', 'Lisse brillant, gris clair', { look: 'flat', gloss: true, c: '#d9dad7', fin: 'mat', brand: IK }],
  ['kallarp', 'Kallarp', 'Brillant, gris-bleu', { look: 'flat', gloss: true, c: '#6f7f8c', fin: 'mat', brand: IK }],
  ['kungsbacka', 'Kungsbacka', 'Lisse mat, anthracite', { look: 'flat', c: '#3c3f42', fin: 'mat', brand: IK }],
  ['nickebo', 'Nickebo', 'Mat, sans poignée (gorge), vert-gris', { look: 'flat', gorge: true, c: '#6b7566', fin: 'mat', brand: IK }],
  ['bodbyn', 'Bodbyn', 'Cadre mouluré, blanc cassé', { look: 'moulure', c: '#ece6d6', fin: 'mat', brand: IK }],
  ['axstad', 'Axstad', 'Cadre fin, blanc mat', { look: 'shaker', c: '#efeee9', fin: 'mat', brand: IK }],
  ['stensund', 'Stensund', 'Cadre fin, vert clair', { look: 'shaker', c: '#b7c4b0', fin: 'mat', brand: IK }],
  ['havstorp', 'Havstorp', 'Cadre étroit, beige', { look: 'chanfrein', c: '#d9c9b3', fin: 'mat', brand: IK }],
  ['upplov', 'Upplöv', 'Mat à bord relevé, beige foncé', { look: 'chanfrein', c: '#cbbda4', fin: 'mat', brand: IK }],
  ['askersund', 'Askersund', 'Effet frêne clair', { look: 'flat', c: '#dcc8a8', fin: 'bois', brand: IK }],
  ['forsbacka', 'Forsbacka', 'Chêne, lisse', { look: 'flat', c: '#c9a476', fin: 'bois', brand: IK }],
  ['sinarp', 'Sinarp', 'Bois brun, rainures', { look: 'rainure', c: '#8a5e3c', fin: 'bois', brand: IK }],
  ['torhamn', 'Torhamn', 'Frêne naturel, cadre', { look: 'shaker', c: '#d8c19b', fin: 'bois', brand: IK }],
  ['lerhyttan', 'Lerhyttan', 'Cadre, teinté noir', { look: 'shaker', c: '#2f2d2b', fin: 'bois', brand: IK }],
];
export const facadeOf = (id) => (FACADES.find((f) => f[0] === id) || FACADES[0])[3];
export const HANDLES = [['barre', 'Barre'], ['bouton', 'Bouton'], ['coquille', 'Coquille'], ['profil', 'Profilé'], ['cuir', 'Cuir'], ['gorge', 'Gorge / sans poignée']];
export const HFINS = [['inox', 'Inox brossé', '#c3c8cd'], ['noir', 'Noir mat', '#1f2023'], ['laiton', 'Laiton', '#c9a55a'], ['cuivre', 'Cuivre', '#b87333'], ['chrome', 'Chrome', '#e4e7ea'], ['blanc', 'Blanc', '#f2f2f0'], ['bronze', 'Bronze', '#6d5a45']];
export const FCOLORS = ['#f4f3ef', '#ebe3d2', '#e1d7c6', '#c8c6c0', '#8f9598', '#4b5359', '#232427', '#9db0a0', '#6f8a7a', '#2f4a5e', '#c8a57a', '#8a6445'];
export const KSTYLE_KEYS = ['fa', 'c1', 'fin', 'c3', 'poi', 'pf', 'plan', 'c2'];
export const KDEF = { fa: 'sofia', c1: '#f4f3ef', fin: 'mat', c3: '#f1efea', poi: 'barre', pf: 'inox', plan: 'bois', c2: '#c9a27a' };
export const isKitchen = (d) => !!(d && d.kmod);

// ---------------------------------------------------------------------------------------------------------------
// façades et poignées
// ---------------------------------------------------------------------------------------------------------------
const TH = 0.019, GAP = 0.003;
function hmat(K, p) {
  if (p.poi === 'cuir') return K.m('#7a4e2d', { r: 0.7 });
  const f = HFINS.find((x) => x[0] === p.pf) || HFINS[0];
  return K.m(f[2], { r: f[0] === 'noir' || f[0] === 'blanc' ? 0.5 : f[0] === 'chrome' ? 0.12 : 0.3, m: f[0] === 'noir' || f[0] === 'blanc' ? 0.2 : 0.9 });
}
const fmat = (K, p) => (facadeOf(p.fa).gloss ? K.m(p.c1, { r: 0.12 }) : K.body(p.c1));
const dark = (K) => K.m('#2a2a2a', { r: 0.8 });

// panneau de façade (porte, tiroir) : centre (cx, cy), dos en z0, épaisseur TH, sur le parent par
function panel(K, p, par, w, h, cx, cy, z0, o = {}) {
  const mt = o.mt || fmat(K, p), zc = z0 + TH / 2, st = o.glass ? 'cadre' : facadeOf(p.fa).look;
  if (st === 'moulure' || st === 'shaker' || st === 'cadre') {
    const s = Math.min(o.glass ? 0.06 : st === 'moulure' ? 0.075 : 0.06, w * 0.22, h * 0.22);
    K.box(s, h, TH, mt, cx - w / 2 + s / 2, cy, zc, par); K.box(s, h, TH, mt, cx + w / 2 - s / 2, cy, zc, par);
    K.box(w - 2 * s, s, TH, mt, cx, cy - h / 2 + s / 2, zc, par); K.box(w - 2 * s, s, TH, mt, cx, cy + h / 2 - s / 2, zc, par);
    const iw = w - 2 * s, ih = h - 2 * s;
    if (o.glass) K.box(iw, ih, 0.006, K.glass(), cx, cy, zc, par);
    else K.box(iw, ih, TH * 0.55, mt, cx, cy, z0 + TH * 0.28, par);
    if (st === 'moulure' && !o.glass && iw > 0.06 && ih > 0.06) {   // moulure en relief autour du panneau central
      const b = 0.012, zb = z0 + TH * 0.55 + 0.004;
      K.box(b, ih, 0.008, mt, cx - iw / 2 + b / 2, cy, zb, par); K.box(b, ih, 0.008, mt, cx + iw / 2 - b / 2, cy, zb, par);
      K.box(iw - 2 * b, b, 0.008, mt, cx, cy - ih / 2 + b / 2, zb, par); K.box(iw - 2 * b, b, 0.008, mt, cx, cy + ih / 2 - b / 2, zb, par);
    }
    return;
  }
  K.box(w, h, TH, mt, cx, cy, zc, par);
  if (st === 'chanfrein') {   // bord relevé étroit tout autour
    const b = Math.min(0.018, w * 0.1, h * 0.1), zb = z0 + TH + 0.003;
    K.box(b, h, 0.006, mt, cx - w / 2 + b / 2, cy, zb, par); K.box(b, h, 0.006, mt, cx + w / 2 - b / 2, cy, zb, par);
    K.box(w - 2 * b, b, 0.006, mt, cx, cy - h / 2 + b / 2, zb, par); K.box(w - 2 * b, b, 0.006, mt, cx, cy + h / 2 - b / 2, zb, par);
  }
  if (st === 'rainure') {   // rainures verticales tous les 5 cm environ
    const n = Math.max(2, Math.round(w / 0.05)), dm = K.m('#000000', { r: 0.9, op: 0.18 });
    for (let i = 1; i < n; i++) K.box(0.003, h - 0.004, 0.001, dm, cx - w / 2 + (i * w) / n, cy, z0 + TH + 0.0006, par);
  }
}
// poignée : pos = 'top' (meuble bas, tiroir), 'bottom' (meuble haut), 'mid' ; side = côté opposé aux charnières (-1 gauche, 1 droite, 0 centre)
function handle(K, p, par, w, h, cx, cy, z0, pos, side, horiz) {
  const hm = hmat(K, p), zf = z0 + TH, kind = facadeOf(p.fa).gorge ? 'gorge' : p.poi;
  const yTop = cy + h / 2, yBot = cy - h / 2;
  if (kind === 'gorge') {   // gorge : rainure sombre + profil métal le long du bord
    const y = pos === 'bottom' ? yBot + 0.012 : yTop - 0.012;
    K.box(w - 0.004, 0.022, 0.004, dark(K), cx, y, zf - 0.002, par);
    K.box(w - 0.004, 0.004, 0.006, hm, cx, pos === 'bottom' ? yBot + 0.003 : yTop - 0.003, zf - 0.003, par);
    return;
  }
  if (kind === 'profil') {   // profilé horizontal sur toute la largeur
    const y = pos === 'bottom' ? yBot + 0.01 : yTop - 0.01;
    K.box(w - 0.02, 0.012, 0.022, hm, cx, y, zf + 0.011, par); return;
  }
  const x = side ? cx + side * (w / 2 - 0.045) : cx;
  const y = pos === 'bottom' ? yBot + 0.09 : pos === 'mid' ? cy : horiz ? yTop - Math.min(0.045, h / 2) : yTop - 0.11;
  if (kind === 'bouton') { K.cyl(0.014, 0.014, 0.026, hm, x, y, zf + 0.013, par, 16).rotation.x = Math.PI / 2; return; }
  if (kind === 'coquille') { K.box(horiz ? 0.096 : 0.03, horiz ? 0.03 : 0.096, 0.018, hm, x, y, zf + 0.009, par); K.box(horiz ? 0.08 : 0.018, horiz ? 0.018 : 0.08, 0.004, dark(K), x, y, zf + 0.0185, par); return; }
  if (kind === 'cuir') { K.box(horiz ? 0.12 : 0.03, horiz ? 0.03 : 0.12, 0.006, hm, x, y, zf + 0.008, par); for (const s of [-1, 1]) K.cyl(0.005, 0.005, 0.006, hmat(K, { ...p, poi: 'barre' }), x + (horiz ? s * 0.05 : 0), y + (horiz ? 0 : s * 0.05), zf + 0.012, par, 8).rotation.x = Math.PI / 2; return; }
  // barre (longueur selon la taille de la façade)
  const L = horiz ? Math.min(0.32, Math.max(0.128, w * 0.4)) : h > 1 ? 0.32 : 0.16;
  K.box(horiz ? L : 0.012, horiz ? 0.012 : L, 0.012, hm, x, y, zf + 0.03, par);
  for (const s of [-1, 1]) K.box(0.01, 0.01, 0.026, hm, x + (horiz ? s * (L / 2 - 0.02) : 0), y + (horiz ? 0 : s * (L / 2 - 0.02)), zf + 0.013, par);
}

// ---------------------------------------------------------------------------------------------------------------
// éléments de façade animés
// ---------------------------------------------------------------------------------------------------------------
// porte : x = centre, y = bas, zf = avant du caisson ; hinge 1 = charnières à gauche ; pos : emplacement de la poignée
function door(K, p, g, w, h, x, y, zf, hinge, pos, o = {}) {
  const pv = K.piv(x - hinge * (w / 2), y, zf, g);
  panel(K, p, pv, w - GAP, h - GAP, hinge * w / 2, h / 2, 0, o);
  handle(K, p, pv, w - GAP, h - GAP, hinge * w / 2, h / 2, 0, pos, hinge, false);
  K.add(pv, { rot: ['y', -hinge * 1.65] });
}
function doors(K, p, g, w, h, x, y, zf, pos, o = {}) {
  if (w > 0.61) { const dw = w / 2; door(K, p, g, dw, h, x - dw / 2, y, zf, 1, pos, o); door(K, p, g, dw, h, x + dw / 2, y, zf, -1, pos, o); }
  else door(K, p, g, w, h, x, y, zf, p.hg === 'R' ? -1 : 1, pos, o);
}
function drawer(K, p, g, w, h, x, y, zf, depth) {
  const pv = K.piv(x, y, zf, g), tm = K.m('#e9e6df', { r: 0.8 });
  panel(K, p, pv, w - GAP, h - GAP, 0, h / 2, 0);
  handle(K, p, pv, w - GAP, h - GAP, 0, h / 2, 0, 'top', 0, true);
  const bw = w - 0.07, bd = depth - 0.06, bh = Math.min(0.2, h * 0.6);
  K.box(bw, 0.01, bd, tm, 0, 0.03, -bd / 2 - 0.002, pv);
  K.box(0.01, bh, bd, tm, -bw / 2, 0.03 + bh / 2, -bd / 2 - 0.002, pv); K.box(0.01, bh, bd, tm, bw / 2, 0.03 + bh / 2, -bd / 2 - 0.002, pv);
  K.box(bw, bh, 0.01, tm, 0, 0.03 + bh / 2, -bd - 0.002, pv);
  K.add(pv, { slide: [0, 0, Math.min(0.42, depth * 0.75)] });
}
function flap(K, p, g, w, h, x, y, zf) {   // abattant relevable (meuble haut H38)
  const pv = K.piv(x, y + h, zf, g);
  panel(K, p, pv, w - GAP, h - GAP, 0, -h / 2, 0);
  handle(K, p, pv, w - GAP, h - GAP, 0, -h / 2, 0, 'bottom', 0, true);
  K.add(pv, { rot: ['x', -1.3] });
}

// ---------------------------------------------------------------------------------------------------------------
// électroménager encastré
// ---------------------------------------------------------------------------------------------------------------
function oven(K, g, w, h, x, y, zf) {
  const bl = K.m('#151618', { r: 0.18, m: 0.3 }), ix = K.inox(), ow = Math.min(w - 0.01, 0.595), oh = Math.min(h - 0.005, 0.595), y0 = y + (h - oh) / 2;
  K.box(ow, oh, 0.022, bl, x, y0 + oh / 2, zf + 0.011, g);
  K.box(ow, 0.075, 0.024, ix, x, y0 + oh - 0.0375, zf + 0.012, g);
  for (const s of [-1, 1]) K.cyl(0.018, 0.018, 0.02, bl, x + s * ow * 0.33, y0 + oh - 0.0375, zf + 0.03, g, 16).rotation.x = Math.PI / 2;
  K.box(0.07, 0.025, 0.004, K.m('#0b2236', { r: 0.2 }), x, y0 + oh - 0.0375, zf + 0.025, g);
  K.box(ow - 0.12, oh * 0.45, 0.004, K.m('#050505', { r: 0.05 }), x, y0 + oh * 0.42, zf + 0.0225, g);
  K.box(ow - 0.1, 0.014, 0.014, ix, x, y0 + oh - 0.11, zf + 0.045, g);
  for (const s of [-1, 1]) K.box(0.012, 0.012, 0.03, ix, x + s * (ow / 2 - 0.07), y0 + oh - 0.11, zf + 0.03, g);
}
function micro(K, g, w, h, x, y, zf) {
  const bl = K.m('#151618', { r: 0.18, m: 0.3 }), mw = Math.min(w - 0.01, 0.595), mh = Math.min(h - 0.005, 0.38), y0 = y + (h - mh) / 2;
  K.box(mw, mh, 0.022, bl, x, y0 + mh / 2, zf + 0.011, g);
  K.box(mw * 0.62, mh * 0.62, 0.004, K.m('#050505', { r: 0.05 }), x - mw * 0.14, y0 + mh / 2, zf + 0.0225, g);
  K.box(0.06, 0.02, 0.004, K.m('#0b2236', { r: 0.2 }), x + mw * 0.36, y0 + mh * 0.75, zf + 0.0225, g);
  K.cyl(0.016, 0.016, 0.02, K.inox(), x + mw * 0.36, y0 + mh * 0.4, zf + 0.03, g, 16).rotation.x = Math.PI / 2;
}
function induction(K, g, w, d, y) {   // plaque à induction sur le plan de travail
  const pw = Math.min(w - 0.04, w > 0.85 ? 0.78 : 0.58), pd = Math.min(d - 0.08, 0.51), z = -0.01;
  K.box(pw, 0.006, pd, K.m('#0d0e10', { r: 0.08 }), 0, y + 0.003, z, g);
  const zm = K.m('#3b3f45', { r: 0.3 });
  const spots = pw > 0.7 ? [[-0.25, -0.1, 0.1], [-0.25, 0.12, 0.08], [0, 0.0, 0.12], [0.25, -0.1, 0.08], [0.25, 0.12, 0.1]] : [[-0.14, -0.1, 0.09], [-0.14, 0.13, 0.07], [0.14, -0.1, 0.07], [0.14, 0.13, 0.09]];
  for (const [sx, sz, r] of spots) { K.cyl(r, r, 0.001, zm, sx, y + 0.0062, z + sz, g, 32); K.cyl(r - 0.006, r - 0.006, 0.0012, K.m('#0d0e10', { r: 0.08 }), sx, y + 0.0064, z + sz, g, 32); }
  K.box(0.12, 0.001, 0.02, K.m('#5a5f66', { r: 0.3 }), 0, y + 0.0062, z + pd / 2 - 0.03, g);
}
function sink(K, p, g, w, d, y) {   // évier encastré dans le plan + mitigeur
  const ty = p.ev || 'inox', mt = ty === 'granit' ? K.m('#2b2b2d', { r: 0.6 }) : ty === 'ceram' ? K.m('#f4f4f2', { r: 0.2 }) : K.m('#c3c8cd', { r: 0.28, m: 0.85 });
  const inner = ty === 'granit' ? K.m('#1d1d1f', { r: 0.7 }) : ty === 'ceram' ? K.m('#dcdcda', { r: 0.25 }) : K.m('#7d848a', { r: 0.35, m: 0.8 });
  const bacs = p.bacs || 1, sw = Math.min(w - 0.1, bacs === 2 ? 0.78 : w > 0.75 ? 0.78 : 0.48), sd = Math.min(d - 0.1, 0.48), z = -0.02;
  K.box(sw, 0.004, sd, mt, 0, y + 0.002, z, g);
  const bw = bacs === 2 ? (sw - 0.09) / 2 : w > 0.75 && bacs !== 2 ? sw * 0.5 : sw - 0.06, bd = sd - 0.07;
  const xs = bacs === 2 ? [-(bw / 2 + 0.015), bw / 2 + 0.015] : [w > 0.75 ? -sw / 2 + 0.03 + bw / 2 : 0];
  for (const bx of xs) K.box(bw, 0.0045, bd, inner, bx, y + 0.0025, z, g);
  if (w > 0.75 && bacs !== 2) for (let i = 0; i < 6; i++) K.box(sw - bw - 0.09, 0.005, 0.01, inner, sw / 2 - (sw - bw - 0.06) / 2 - 0.015, y + 0.003, z - bd / 2 + 0.03 + (i * (bd - 0.06)) / 5, g);
  const ix = K.inox(), fx = xs[0] + (bacs === 2 ? bw / 2 + 0.015 : 0), fz = z - sd / 2 - 0.03;
  K.cyl(0.022, 0.024, 0.06, ix, fx, y + 0.03, fz, g, 16); K.cyl(0.012, 0.012, 0.26, ix, fx, y + 0.19, fz, g, 12);
  const sp = K.cyl(0.011, 0.011, 0.2, ix, fx, y + 0.31, fz + 0.09, g, 12); sp.rotation.x = Math.PI / 2 - 0.25;
}
function dishwasherFront(K, p, g, w, h, x, y, zf) {   // lave-vaisselle intégrable : façade assortie qui s'abaisse
  const pv = K.piv(x, y, zf, g);
  panel(K, p, pv, w - GAP, h - GAP, 0, h / 2, 0);
  handle(K, p, pv, w - GAP, h - GAP, 0, h / 2, 0, 'top', 0, true);
  K.add(pv, { rot: ['x', 1.35] });
  const rk = K.m('#9aa1a7', { r: 0.4, m: 0.6 });
  for (const ry of [0.2, 0.48]) K.box(w - 0.08, 0.012, 0.48, rk, x, y + ry, zf - 0.26, g);
}
function washer(K, g, w, h, x, y, zf, dry) {
  const bm = K.white(), d = 0.56, r = 0.21, hh = Math.min(h, 0.82);
  K.box(w - 0.02, hh, d, bm, x, y + hh / 2, zf - d / 2 + 0.01, g);
  K.box(w - 0.04, 0.07, 0.01, K.m('#d8dadb', { r: 0.4 }), x, y + hh - 0.05, zf + 0.015, g);
  const cy = y + (hh - 0.1) / 2;
  K.cyl(r + 0.03, r + 0.03, 0.012, K.m('#d7dadc', { r: 0.3 }), x, cy, zf + 0.016, g, 32).rotation.x = Math.PI / 2;
  K.cyl(r, r, 0.016, K.m(dry ? '#8a8f94' : '#7da3b5', { r: 0.05 }), x, cy, zf + 0.02, g, 32).rotation.x = Math.PI / 2;
}

// ---------------------------------------------------------------------------------------------------------------
// constructeur générique : une liste de zones de bas en haut dans le caisson
// zones : [{ t, h }] ; t ∈ doors | door1 | drawer | drawers:n | oven | mw | dw | fridge | open | glass | flap | wash | dry | bottles | blind ; h en m ou 'rest'
// ---------------------------------------------------------------------------------------------------------------
function build(kind, zonesOf, opt = {}) {
  return (g, p, K) => {
    const { w, d } = p, cm = K.m(p.c3, { r: 0.8 }), base = kind === 'bas', tall = kind === 'col' || kind === 'demi';
    const y0 = base || tall ? SOCLE : 0, ch = base ? CB : tall ? p.h - SOCLE : p.h, cd = d - (base ? 0.04 : 0.02), cz = base ? -0.02 : -0.01, zf = cz + cd / 2;
    if (y0) K.box(w - 0.004, SOCLE, 0.016, fmat(K, p), 0, SOCLE / 2, zf - 0.05);   // plinthe en retrait, assortie aux façades
    if (y0) K.box(w - 0.06, SOCLE, cd - 0.1, dark(K), 0, SOCLE / 2, cz - 0.03);
    if (opt.open || opt.bottles) K.carcass(w, ch, cd, fmat(K, p), 0, y0, cz, g, 0.018);
    else K.carcass(w, ch, cd, cm, 0, y0, cz, g, 0.018);
    // plan de travail
    if (base && p.top !== 0 && !opt.notop) {
      const top = H_BAS;
      K.box(w + 0.001, PT, d, opt.wt(K, p), 0, top - PT / 2, 0);
      if (opt.sink) sink(K, p, g, w, d, top);
      if (opt.hob) induction(K, g, w, d, top);
    }
    const zones = zonesOf(p), fixed = zones.reduce((a, z) => a + (z.h === 'rest' ? 0 : z.h), 0), rest = Math.max(0.05, ch - fixed);
    let y = y0;
    for (const z of zones) {
      const zh = z.h === 'rest' ? rest : z.h, iw = w - 0.002;
      if (z.t === 'doors') doors(K, p, g, iw, zh, 0, y, zf, kind === 'haut' ? 'bottom' : tall && y > 1.2 ? 'bottom' : base || zh < 1 ? 'top' : 'mid');
      else if (z.t === 'glass') doors(K, p, g, iw, zh, 0, y, zf, kind === 'haut' ? 'bottom' : 'top', { glass: true });
      else if (z.t === 'drawer') drawer(K, p, g, iw, zh, 0, y, zf, cd);
      else if (z.t === 'drawers') { const n = z.n || p.nt || 3, hs = n === 2 ? [zh * 0.5, zh * 0.5] : n === 4 ? [zh * 0.25, zh * 0.25, zh * 0.25, zh * 0.25] : [zh * 0.4, zh * 0.4, zh * 0.2]; let yy = y; for (const hh of hs) { drawer(K, p, g, iw, hh, 0, yy, zf, cd); yy += hh; } }
      else if (z.t === 'oven') oven(K, g, iw, zh, 0, y, zf);
      else if (z.t === 'mw') micro(K, g, iw, zh, 0, y, zf);
      else if (z.t === 'dw') dishwasherFront(K, p, g, iw, zh, 0, y, zf);
      else if (z.t === 'flap') flap(K, p, g, iw, zh, 0, y, zf);
      else if (z.t === 'wash' || z.t === 'dry') washer(K, g, iw, zh, 0, y, zf, z.t === 'dry');
      else if (z.t === 'fridge') {   // réfrigérateur intégré : intérieur blanc derrière une façade assortie
        K.box(w - 0.06, zh - 0.02, cd - 0.06, K.m('#f3f4f5', { r: 0.4 }), 0, y + zh / 2, cz, g);
        doors(K, p, g, iw, zh, 0, y, zf, y > 1 ? 'bottom' : zh > 1 ? 'mid' : 'top');
      } else if (z.t === 'open' || z.t === 'bottles') {
        const sm = fmat(K, p), n = z.t === 'bottles' ? Math.max(3, Math.round(zh / 0.11)) : Math.max(1, Math.round(zh / 0.35));
        for (let i = 1; i < n; i++) K.box(w - 0.036, 0.016, cd - 0.02, sm, 0, y + (i * zh) / n, cz, g);
        if (z.t === 'bottles') for (let i = 0; i < n; i++) for (let k = 0; k < Math.max(1, Math.floor((w - 0.04) / 0.1)); k++) { const b = K.cyl(0.035, 0.035, 0.28, K.m(k % 2 ? '#2f4a2a' : '#4a1e22', { r: 0.2 }), -w / 2 + 0.07 + k * 0.1, y + (i * zh) / n + 0.05, cz + 0.05, g, 12); b.rotation.x = Math.PI / 2; }
      } else if (z.t === 'blind') {   // meuble d'angle : panneau fixe + porte du côté choisi
        const dw = Math.min(0.5, w * 0.45), s = p.ang === 'R' ? 1 : -1;
        K.box(w - dw - GAP, zh - GAP, TH, fmat(K, p), -s * (dw / 2), y + zh / 2, zf + TH / 2, g);
        door(K, p, g, dw, zh, s * (w / 2 - dw / 2), y, zf, s > 0 ? -1 : 1, 'top');
      }
      if (z.shelf && z.t !== 'open') K.box(w - 0.036, 0.016, cd - 0.04, cm, 0, y + zh / 2, cz - 0.01, g);
      y += zh;
    }
    if (opt.hood) {   // hotte télescopique sous le meuble haut
      K.box(w - 0.04, 0.03, d * 0.75, K.inox(), 0, -0.015, cz + 0.02);
      K.box(w - 0.06, 0.004, d * 0.6, K.m('#55595e', { r: 0.4, m: 0.6 }), 0, -0.032, cz + 0.02);
    }
  };
}

// ---------------------------------------------------------------------------------------------------------------
// catalogue
// ---------------------------------------------------------------------------------------------------------------
const W_BAS = [0.3, 0.4, 0.45, 0.5, 0.6, 0.8, 0.9, 1.0, 1.2], W_HAUT = [0.3, 0.4, 0.45, 0.5, 0.6, 0.8, 0.9, 1.0, 1.2], W_COL = [0.45, 0.6];
const HG = { k: 'hg', l: 'Charnières (porte seule)', list: [['L', 'À gauche'], ['R', 'À droite']], def: 'L' };
const NT = { k: 'nt', l: 'Tiroirs', list: [[2, '2 casseroliers'], [3, '3 tiroirs'], [4, '4 tiroirs']], def: 3 };
const EV = { k: 'ev', l: 'Évier', list: [['inox', 'Inox'], ['granit', 'Granit noir'], ['ceram', 'Céramique blanche']], def: 'inox' };
const BACS = { k: 'bacs', l: 'Bacs', list: [[1, '1 bac (+ égouttoir si ≥ 80 cm)'], [2, '2 bacs']], def: 1 };
const ANG = { k: 'ang', l: 'Porte', list: [['L', 'À gauche'], ['R', 'À droite']], def: 'R' };
const TOP = { k: 'top', l: 'Plan de travail', list: [[1, 'Avec'], [0, 'Sans (posé à part)']], def: 1 };

export function registerKitchen(reg, wt, WTSEL) {
  const K_ = (id, sub, name, kind, w, d, h, price, zones, ex = {}) => {
    const { opt = {}, ...rest } = ex;
    reg(id, 'Cuisine', name, w, d, h, price, [], build(kind, typeof zones === 'function' ? zones : () => zones, { ...opt, wt }),
      { kmod: kind, sub, fin: null, lock: true, widths: kind === 'col' || kind === 'demi' ? W_COL : kind === 'haut' ? W_HAUT : W_BAS,
        selects: [...(kind === 'bas' && !opt.notop ? [WTSEL, TOP] : []), ...(rest.sel || [])], surf: kind === 'bas' && !opt.notop, elev: kind === 'haut' ? +(H_TOP - h).toFixed(3) : 0, ...rest });
  };
  const B = 'Meubles bas', Hh = 'Meubles hauts', C = 'Colonnes (H 224)', DC = 'Demi-colonnes (H 147)', J = 'Joues, fileurs, crédence';
  const A_P = 'Ouvrir les portes', A_T = 'Ouvrir les tiroirs';
  // meubles bas (caisson 76,8 cm + socle 10 cm + plan 3,8 cm = 90,6 cm)
  K_('k_b_porte', B, 'Bas porte(s)', 'bas', 0.6, 0.6, H_BAS, 99, [{ t: 'doors', h: 'rest', shelf: 1 }], { anim: A_P, sel: [HG] });
  K_('k_b_porte_tiroir', B, 'Bas porte(s) et tiroir', 'bas', 0.6, 0.6, H_BAS, 139, [{ t: 'doors', h: 'rest' }, { t: 'drawer', h: 0.128 }], { anim: A_P, sel: [HG] });
  K_('k_b_tiroirs', B, 'Bas tiroirs', 'bas', 0.6, 0.6, H_BAS, 169, [{ t: 'drawers', h: 'rest' }], { anim: A_T, sel: [NT] });
  K_('k_b_vitre', B, 'Bas porte vitrée', 'bas', 0.6, 0.6, H_BAS, 149, [{ t: 'glass', h: 'rest', shelf: 1 }], { anim: A_P, sel: [HG] });
  K_('k_b_ouvert', B, 'Bas ouvert (étagères)', 'bas', 0.6, 0.6, H_BAS, 79, [{ t: 'open', h: 'rest' }], { opt: { open: true } });
  K_('k_b_evier', B, 'Bas pour évier (évier inclus)', 'bas', 0.8, 0.6, H_BAS, 289, [{ t: 'doors', h: 'rest' }], { anim: A_P, sel: [EV, BACS, HG], widths: [0.6, 0.8, 0.9, 1.0, 1.2], opt: { sink: true } });
  K_('k_b_poubelle', B, 'Bas pour poubelle', 'bas', 0.4, 0.6, H_BAS, 129, [{ t: 'doors', h: 'rest' }], { anim: A_P, sel: [HG], widths: [0.3, 0.4, 0.45, 0.5, 0.6] });
  K_('k_b_four', B, 'Bas pour four', 'bas', 0.6, 0.6, H_BAS, 119, [{ t: 'drawer', h: 0.168 }, { t: 'oven', h: 'rest' }], { anim: A_T, widths: [0.6] });
  K_('k_b_plaque', B, 'Bas pour plaque (2 casseroliers)', 'bas', 0.6, 0.6, H_BAS, 189, [{ t: 'drawers', h: 'rest', n: 2 }], { anim: A_T, widths: [0.6, 0.8, 0.9], opt: { hob: true } });
  K_('k_b_four_plaque', B, 'Bas pour four et plaque', 'bas', 0.6, 0.6, H_BAS, 159, [{ t: 'drawer', h: 0.168 }, { t: 'oven', h: 'rest' }], { anim: A_T, widths: [0.6, 0.9], opt: { hob: true } });
  K_('k_b_lv', B, 'Bas pour lave-vaisselle (intégrable)', 'bas', 0.6, 0.6, H_BAS, 39, [{ t: 'dw', h: 'rest' }], { anim: 'Ouvrir le lave-vaisselle', widths: [0.45, 0.6] });
  K_('k_b_ll', B, 'Bas pour lave-linge', 'bas', 0.6, 0.6, H_BAS, 49, [{ t: 'wash', h: 'rest' }], { widths: [0.6] });
  K_('k_b_seche', B, 'Bas pour sèche-linge', 'bas', 0.6, 0.6, H_BAS, 49, [{ t: 'dry', h: 'rest' }], { widths: [0.6] });
  K_('k_b_frigo', B, 'Bas pour réfrigérateur (sous plan)', 'bas', 0.6, 0.6, H_BAS, 59, [{ t: 'fridge', h: 'rest' }], { anim: A_P, sel: [HG], widths: [0.6] });
  K_('k_b_congel', B, 'Bas pour congélateur (sous plan)', 'bas', 0.6, 0.6, H_BAS, 59, [{ t: 'fridge', h: 'rest' }], { anim: A_P, sel: [HG], widths: [0.6] });
  K_('k_b_bouteilles', B, 'Casier à bouteilles', 'bas', 0.2, 0.6, H_BAS, 69, [{ t: 'bottles', h: 'rest' }], { widths: [0.15, 0.2, 0.3], opt: { bottles: true } });
  K_('k_b_angle', B, 'Bas d\'angle', 'bas', 1.0, 0.6, H_BAS, 179, [{ t: 'blind', h: 'rest', shelf: 1 }], { anim: 'Ouvrir la porte', sel: [ANG], widths: [0.9, 1.0, 1.2] });
  // meubles hauts : haut aligné sur les colonnes (2,24 m)
  K_('k_h38', Hh, 'Haut H38 (abattant)', 'haut', 0.6, 0.35, 0.384, 69, [{ t: 'flap', h: 'rest' }], { anim: 'Ouvrir l\'abattant' });
  K_('k_h77', Hh, 'Haut H77', 'haut', 0.6, 0.35, CB, 89, [{ t: 'doors', h: 'rest', shelf: 1 }], { anim: A_P, sel: [HG] });
  K_('k_h103', Hh, 'Haut H103', 'haut', 0.6, 0.35, 1.024, 109, [{ t: 'doors', h: 'rest', shelf: 1 }], { anim: A_P, sel: [HG] });
  K_('k_h77_vitre', Hh, 'Haut H77 vitré', 'haut', 0.6, 0.35, CB, 119, [{ t: 'glass', h: 'rest', shelf: 1 }], { anim: A_P, sel: [HG] });
  K_('k_h77_ouvert', Hh, 'Haut H77 ouvert', 'haut', 0.6, 0.35, CB, 59, [{ t: 'open', h: 'rest' }], { opt: { open: true } });
  K_('k_h_hotte', Hh, 'Haut H38 avec hotte intégrée', 'haut', 0.6, 0.35, 0.384, 249, [{ t: 'flap', h: 'rest' }], { anim: 'Ouvrir l\'abattant', widths: [0.6, 0.9], opt: { hood: true } });
  K_('k_h_mo', Hh, 'Haut H77 pour micro-ondes', 'haut', 0.6, 0.35, CB, 99, [{ t: 'mw', h: 0.38 }, { t: 'flap', h: 'rest' }], { anim: 'Ouvrir l\'abattant', widths: [0.6], d: 0.4 });
  // colonnes (socle 10 cm + caisson 214,4 cm)
  K_('k_c_tablettes', C, 'Colonne avec tablettes', 'col', 0.6, 0.6, H_TOP, 249, [{ t: 'doors', h: 1.4, shelf: 1 }, { t: 'doors', h: 'rest' }], { anim: A_P, sel: [HG] });
  K_('k_c_four', C, 'Colonne pour four', 'col', 0.6, 0.6, H_TOP, 279, [{ t: 'drawer', h: 0.256 }, { t: 'drawer', h: 0.256 }, { t: 'oven', h: 0.6 }, { t: 'doors', h: 'rest' }], { anim: A_T, sel: [HG] });
  K_('k_c_mo', C, 'Colonne pour micro-ondes', 'col', 0.6, 0.6, H_TOP, 269, [{ t: 'doors', h: 1.0, shelf: 1 }, { t: 'mw', h: 0.38 }, { t: 'doors', h: 'rest' }], { anim: A_P, sel: [HG] });
  K_('k_c_four_mo', C, 'Colonne four et micro-ondes', 'col', 0.6, 0.6, H_TOP, 299, [{ t: 'drawer', h: 0.256 }, { t: 'drawer', h: 0.256 }, { t: 'oven', h: 0.6 }, { t: 'mw', h: 0.38 }, { t: 'doors', h: 'rest' }], { anim: A_T, sel: [HG] });
  K_('k_c_lv', C, 'Colonne lave-vaisselle surélevé', 'col', 0.6, 0.6, H_TOP, 259, [{ t: 'doors', h: 0.5 }, { t: 'dw', h: 0.82 }, { t: 'doors', h: 'rest' }], { anim: A_P, sel: [HG] });
  K_('k_c_frigo', C, 'Colonne réfrigérateur intégré', 'col', 0.6, 0.6, H_TOP, 239, [{ t: 'fridge', h: 0.72 }, { t: 'fridge', h: 1.06 }, { t: 'doors', h: 'rest' }], { anim: A_P, sel: [HG] });
  K_('k_c_frigo_four', C, 'Colonne réfrigérateur et four', 'col', 0.6, 0.6, H_TOP, 289, [{ t: 'fridge', h: 1.22 }, { t: 'oven', h: 0.6 }, { t: 'doors', h: 'rest' }], { anim: A_P, sel: [HG] });
  K_('k_c_frigo_mo', C, 'Colonne réfrigérateur et micro-ondes', 'col', 0.6, 0.6, H_TOP, 279, [{ t: 'fridge', h: 1.4 }, { t: 'mw', h: 0.38 }, { t: 'doors', h: 'rest' }], { anim: A_P, sel: [HG] });
  // demi-colonnes (socle 10 cm + caisson 137,3 cm)
  const HD = SOCLE + 1.373;
  K_('k_d_tablettes', DC, 'Demi-colonne avec tablettes', 'demi', 0.6, 0.6, HD, 179, [{ t: 'doors', h: 'rest', shelf: 1 }], { anim: A_P, sel: [HG] });
  K_('k_d_four', DC, 'Demi-colonne pour four', 'demi', 0.6, 0.6, HD, 199, [{ t: 'drawer', h: 0.256 }, { t: 'drawer', h: 0.256 }, { t: 'oven', h: 0.6 }, { t: 'flap', h: 'rest' }], { anim: A_T });
  K_('k_d_mo', DC, 'Demi-colonne pour micro-ondes', 'demi', 0.6, 0.6, HD, 189, [{ t: 'doors', h: 0.77, shelf: 1 }, { t: 'mw', h: 0.38 }, { t: 'flap', h: 'rest' }], { anim: A_P, sel: [HG] });
  K_('k_d_four_mo', DC, 'Demi-colonne four et micro-ondes', 'demi', 0.6, 0.6, HD, 219, [{ t: 'drawer', h: 0.256 }, { t: 'oven', h: 0.6 }, { t: 'mw', h: 0.38 }, { t: 'flap', h: 'rest' }], { anim: A_T });
  K_('k_d_frigo', DC, 'Demi-colonne réfrigérateur intégré', 'demi', 0.6, 0.6, HD, 189, [{ t: 'fridge', h: 'rest' }], { anim: A_P, sel: [HG] });
  K_('k_d_lv', DC, 'Demi-colonne lave-vaisselle surélevé', 'demi', 0.6, 0.6, HD, 199, [{ t: 'doors', h: 0.36 }, { t: 'dw', h: 0.82 }, { t: 'flap', h: 'rest' }], { anim: A_P, sel: [HG] });
  // joues, fileurs, crédence
  const joue = (id, name, h, d, elev) => reg(id, 'Cuisine', name, 0.019, d, h, 25, [], (g, p, K) => { const q = K.piv(0, 0, 0, g); q.rotation.y = Math.PI / 2; panel(K, p, q, p.d, p.h, 0, p.h / 2, -TH / 2); },
    { kmod: 'joue', sub: J, fin: null, lock: true, widths: [0.019], elev });
  joue('k_joue_bas', 'Joue meuble bas', SOCLE + CB, 0.6, 0);
  joue('k_joue_haut', 'Joue meuble haut H77', CB, 0.35, +(H_TOP - CB).toFixed(3));
  joue('k_joue_col', 'Joue colonne', H_TOP, 0.62, 0);
  joue('k_joue_demi', 'Joue demi-colonne', HD, 0.62, 0);
  const fileur = (id, name, h, d, elev) => reg(id, 'Cuisine', name, 0.05, d, h, 15, [], (g, p, K) => { K.box(p.w, p.h, TH, fmat(K, p), 0, p.h / 2, p.d / 2 - TH / 2); K.box(p.w, p.h, 0.016, K.m(p.c3, { r: 0.8 }), 0, p.h / 2, p.d / 2 - 0.06); },
    { kmod: 'fileur', sub: J, fin: null, lock: true, widths: [0.03, 0.05, 0.08, 0.1, 0.15], elev });
  fileur('k_fileur_bas', 'Fileur meuble bas', SOCLE + CB, 0.6, 0);
  fileur('k_fileur_haut', 'Fileur meuble haut', CB, 0.35, +(H_TOP - CB).toFixed(3));
  fileur('k_fileur_col', 'Fileur colonne', H_TOP, 0.6, 0);
  reg('k_credence', 'Cuisine', 'Crédence (assortie au plan)', 1.2, 0.012, 0.6, 79, [], (g, p, K) => { K.box(p.w, p.h, p.d, wt(K, p), 0, p.h / 2, 0); },
    { kmod: 'credence', sub: J, fin: null, lock: false, widths: [0.6, 0.9, 1.2, 1.8, 2.4, 3.0], selects: [WTSEL], elev: H_BAS });
  reg('k_plan', 'Cuisine', 'Plan de travail', 1.2, 0.62, PT, 59, [], (g, p, K) => { K.box(p.w, p.h, p.d, wt(K, p), 0, p.h / 2, 0); },
    { kmod: 'plan', sub: J, fin: null, lock: false, widths: [0.6, 0.9, 1.2, 1.8, 2.4, 3.0, 3.6], selects: [WTSEL], elev: H_BAS - PT, surf: true });
}
