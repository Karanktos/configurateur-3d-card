// Interface : barre d'outils, bibliothèque (gauche), propriétés (droite), récapitulatif.
import * as THREE from 'three';
import { r2 } from './util.js';
import {
  S, sel, settings, find, commit, on, emit, select, summary, rebuildStructure, rebuildFloors, renderItem, wallInfo, setView, setupCam, frameAll,
  openAll, setOpen, setShut, hasAnim, hasShutter, invalidate, updateCutaway, drawSelection, moveItemObj, setLive, syncLive, setSun, R,
  entOfItem, setPresent, renderPlot, structBounds, V, nid, rebuildAll, exportJSON, homeView, wallPoint,
} from './core.js';
import { entities, stateOf, nameOf, hasHA, onHass, listDashboards, publishPlan, navigate } from './ha.js';
import { iconList, refresh as refreshPins } from './pins.js';
import * as SUN from './sun.js';
import { FLOORS, FINISHES, PALETTE, TILE, floorDef, finishDef, swatch } from './textures.js';
import { CATS, ALL, FINS, buildItem, defOf, defaultItem } from './catalog.js';
import { FACADES, HANDLES as KHANDLES, HFINS, FCOLORS, KSTYLE_KEYS, KDEF, isKitchen } from './kitchen.js';
import { DOORS, WINDOWS, MATS, GLASSES, HANDLES, defaultOpening, buildOpening, modelOf } from './openings.js';
import { wallGeometry } from './geom.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  T, D, LGRP, setTool, startPlacing, startPlacingLight, setLightModel, setPlacingModel, rebuildGhost, withKitchenStyle, removeEntity, duplicateSelected, rotateSelected, toggleAnim, toggleGroupPreview, validOpeningNow,
} from './tools.js';
import { svg } from './mdi.js';

const $ = (s) => document.querySelector(s);
export const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); };

// ---------------------------------------------------------------------------------------------
// mini-DOM
// ---------------------------------------------------------------------------------------------
function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') n.className = v; else if (k === 'html') n.innerHTML = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'style') Object.assign(n.style, v); else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
}
const fmt = (v, u = 'm') => (u === 'm' ? v.toFixed(2).replace('.', ',') + ' m' : u === '°' ? Math.round(v) + '°' : u === 'cm' ? Math.round(v * 100) + ' cm' : String(v));

// champs : on(final) est appelé à chaque modification (final=false en cours de glissement, true une fois relâché)
function fRange(label, o, k, min, max, step, on, u = 'm', get, set) {
  const val = el('span', { class: 'v' }, fmt(get ? get() : o[k], u));
  const inp = el('input', { type: 'range', min, max, step, value: get ? get() : o[k] });
  inp.addEventListener('input', () => { const v = +inp.value; set ? set(v) : (o[k] = v); val.textContent = fmt(v, u); on(false); });
  inp.addEventListener('change', () => on(true));
  return el('div', { class: 'f' }, el('div', { class: 'l' }, label, val), inp);
}
function fColor(label, o, k, on, presets = PALETTE) {
  const pal = el('div', { class: 'pal' });
  const inp = el('input', { type: 'color', value: o[k] });
  const upd = () => pal.querySelectorAll('.sw').forEach((s) => s.classList.toggle('on', s.dataset.c === o[k].toLowerCase()));
  presets.forEach((c) => pal.append(el('button', { class: 'sw', title: c, 'data-c': c.toLowerCase(), style: { background: c }, onclick: () => { o[k] = c; inp.value = c; upd(); on(true); } })));
  inp.addEventListener('input', () => { o[k] = inp.value; upd(); on(false); });
  inp.addEventListener('change', () => on(true));
  pal.append(inp); upd();
  return el('div', { class: 'f' }, el('div', { class: 'l' }, label), pal);
}
function fSelect(label, o, k, opts, on) {
  const s = el('select', {}, opts.map(([v, t]) => el('option', { value: v, selected: String(o[k]) === String(v) }, t)));
  s.addEventListener('change', () => { o[k] = isNaN(+s.value) || s.value === '' ? s.value : +s.value; on(true); });
  return el('div', { class: 'f' }, el('div', { class: 'l' }, label), s);
}
function fSeg(label, o, k, opts, on) {
  const wrap = el('div', { class: 'seg' });
  opts.forEach(([v, t]) => wrap.append(el('button', { class: String(o[k]) === String(v) ? 'on' : '', onclick: (ev) => { o[k] = v; [...wrap.children].forEach((b) => b.classList.remove('on')); ev.currentTarget.classList.add('on'); on(true); } }, t)));
  return el('div', { class: 'f' }, el('div', { class: 'l' }, label), wrap);
}
function fCheck(label, o, k, on) {
  const c = el('input', { type: 'checkbox', checked: !!o[k] }); c.addEventListener('change', () => { o[k] = c.checked; on(true); });
  return el('label', { class: 'f', style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' } }, c, label);
}
let dlN = 0;
function fEntity(label, o, k, domains, on) {
  const id = 'dl' + (dlN++), inp = el('input', { type: 'text', list: id, value: o[k] || '', placeholder: hasHA() ? 'Choisir une entité…' : 'ex. binary_sensor.fenetre_salon', autocomplete: 'off' });
  const dl = el('datalist', { id }, entities(domains).slice(0, 800).map((e) => el('option', { value: e.id }, e.name)));
  const info = el('div', { class: 'sub', style: { margin: '2px 0 0' } });
  const upd = () => { const s = stateOf(inp.value.trim()); info.textContent = !inp.value.trim() ? (hasHA() ? '' : 'Non connecté à Home Assistant : la liaison sera active dans HA.') : s ? `${nameOf(inp.value.trim())} · état : ${s.state}` : hasHA() ? 'Entité introuvable' : ''; };
  inp.addEventListener('change', () => { o[k] = inp.value.trim(); upd(); on(true); }); upd();
  return el('div', { class: 'f' }, el('div', { class: 'l' }, label), inp, dl, info);
}
function fText(label, o, k, on, ph = '') {
  const inp = el('input', { type: 'text', value: o[k] || '', placeholder: ph });
  inp.addEventListener('input', () => { o[k] = inp.value; on(false); }); inp.addEventListener('change', () => on(true));
  return el('div', { class: 'f' }, el('div', { class: 'l' }, label), inp);
}
const fBtns = (...b) => el('div', { class: 'row', style: { marginBottom: '10px' } }, b);
const btn = (t, fn, cls = '') => el('button', { class: 'btn ' + cls, onclick: fn }, t);

const prevMat = new Map();   // sol → revêtement qu'il avait avant le changement (pour « appliquer aux autres sols »)
function fFloorMat(o, on) {
  const wrap = el('div', { class: 'mats' });
  FLOORS.forEach((f) => wrap.append(el('button', { class: 'mat' + (o.mat === f.id ? ' on' : ''), onclick: () => { if (o.id && f.id !== o.mat && !prevMat.has(o.id)) prevMat.set(o.id, o.mat); o.mat = f.id; o.color = f.color; if ('scale' in o) o.scale = 1; on(true); refreshPanels(); } },
    el('img', { src: swatch(f.tex, o.mat === f.id ? o.color : f.color, 72), alt: '' }), f.name)));
  return el('div', { class: 'f' }, el('div', { class: 'l' }, 'Matière du sol'), wrap);
}
function fFinish(o, key, on, label) {
  const fin = finishDef(o[key].f), wrap = el('div', { class: 'mats' });
  FINISHES.forEach((f) => wrap.append(el('button', { class: 'mat' + (o[key].f === f.id ? ' on' : ''), onclick: () => { o[key].f = f.id; if (f.tex) o[key].c = f.color; on(true); refreshPanels(); } },
    el('img', { src: swatch(f.tex, o[key].f === f.id ? o[key].c : f.color, 72), alt: '' }), f.name)));
  void fin;
  return [el('div', { class: 'f' }, el('div', { class: 'l' }, label), wrap), fColor('Couleur', o[key], 'c', on)];
}

// ---------------------------------------------------------------------------------------------
// vignettes 3D
// ---------------------------------------------------------------------------------------------
let tr, tscene, tcam;
const thumbCache = new Map();
function thumbInit() {
  if (tr) return;
  tr = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  tr.setSize(180, 180, false); tr.setPixelRatio(1); tr.toneMapping = THREE.ACESFilmicToneMapping; tr.toneMappingExposure = 0.95;
  tscene = new THREE.Scene(); tscene.add(new THREE.HemisphereLight('#fff', '#b8c0c8', 1.2));
  tscene.environment = new THREE.PMREMGenerator(tr).fromScene(new RoomEnvironment(), 0.04).texture; tscene.environmentIntensity = 0.55;
  const d = new THREE.DirectionalLight('#fff', 2.2); d.position.set(3, 6, 4); tscene.add(d);
  tcam = new THREE.PerspectiveCamera(28, 1, 0.05, 100);
}
function renderThumb(group, dirv = [1, 0.8, 1.25]) {
  thumbInit(); tscene.add(group);
  const box = new THREE.Box3().setFromObject(group), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  const rad = sz.length() / 2, dist = (rad / Math.sin(THREE.MathUtils.degToRad(14))) * 0.92;
  tcam.position.copy(c).add(new THREE.Vector3(...dirv).normalize().multiplyScalar(dist)); tcam.lookAt(c); tcam.updateProjectionMatrix();
  tr.render(tscene, tcam); const url = tr.domElement.toDataURL('image/png'); tscene.remove(group);
  group.traverse((o) => { o.geometry?.dispose(); });
  return url;
}
const queue = []; let qBusy = false;
function enqueue(key, fn, img) {
  if (thumbCache.has(key)) { img.src = thumbCache.get(key); return; }
  queue.push({ key, fn, img });
  if (!qBusy) { qBusy = true; setTimeout(pump, 0); }
}
function pump() {
  const j = queue.shift(); if (!j) { qBusy = false; return; }
  try { if (!thumbCache.has(j.key)) thumbCache.set(j.key, j.fn()); j.img.src = thumbCache.get(j.key); } catch (e) { console.warn('vignette', j.key, e); }
  setTimeout(pump, 0);
}
const styleKey = (o) => KSTYLE_KEYS.map((k) => o[k]).join('|');
const itemThumb = (def, img) => {
  if (!def.kmod) { enqueue('i' + def.id, () => renderThumb(buildItem(defaultItem(def.id)).group), img); return; }
  const it = withKitchenStyle(defaultItem(def.id));   // meuble de cuisine : vignette dans le style choisi pour la cuisine
  enqueue('i' + def.id + styleKey(it), () => renderThumb(buildItem(it).group), img);
};
const kThumb = (style, img) => { const it = { ...defaultItem('k_h77'), ...style, w: 0.5 }; enqueue('kf' + styleKey(it), () => renderThumb(buildItem(it).group, [0.32, 0.12, 1.3]), img); };   // façade vue de face
function openingThumb(o, img, key) {
  enqueue(key, () => {
    const probe = { ...o }, g = new THREE.Group(), W = o.w + 0.9, Hh = Math.max(o.y0 + o.h + 0.3, 1.2);
    const geo = wallGeometry(W, Hh, 0.15, [{ x0: W / 2 - o.w / 2, x1: W / 2 + o.w / 2, y0: Math.max(0.002, o.y0), y1: o.y0 + o.h, round: !!modelOf(o).round }]);
    const wm = new THREE.Mesh(geo, [new THREE.MeshStandardMaterial({ color: '#cdbfa8' }), new THREE.MeshStandardMaterial({ color: '#cdbfa8' }), new THREE.MeshStandardMaterial({ color: '#b5a68f' })]);
    wm.position.x = -W / 2; g.add(wm);
    const b = buildOpening(probe, 0.15); b.group.position.y = o.y0; probe.open = 0; g.add(b.group);
    return renderThumb(g, [0.55, 0.25, 1.4]);
  }, img);
}

// ---------------------------------------------------------------------------------------------
// panneau de gauche : bibliothèque selon l'outil
// ---------------------------------------------------------------------------------------------
const lib = () => $('#lib'), props = () => $('#props');
const L = { cat: 'Salon', sub: '', q: '' };

function wallDefaults() {
  const ch = () => { /* valeurs par défaut : pas de reconstruction */ };
  return [
    fRange('Épaisseur', D.wall, 't', 0.05, 0.4, 0.01, ch, 'm'), fRange('Hauteur', D.wall, 'h', 1, 4, 0.05, ch, 'm'),
    el('h3', {}, 'Face A (intérieur d\'une pièce)'), ...fFinish(D.wall, 'fa', ch, 'Revêtement'),
    el('h3', {}, 'Face B (extérieur)'), ...fFinish(D.wall, 'fb', ch, 'Revêtement'),
  ];
}
function floorDefaults() {
  const ch = () => {};
  return [fFloorMat(D.floor, ch), fColor('Couleur / teinte', D.floor, 'color', ch, floorDef(D.floor.mat).presets), fRange('Taille du motif', D.floor, 'scale', 0.4, 2.5, 0.05, ch, 'x', null, null)];
}

function openingLibrary(kind) {
  const models = kind === 'door' ? DOORS : WINDOWS, o = D[kind];
  const grid = el('div', { class: 'grid2' });
  models.forEach((m) => {
    const probe = { ...defaultOpening(kind, m.id), mat: o.mat, frame: o.frame, leaf: o.leaf, glass: o.glass };
    const img = el('img', { alt: m.name });
    grid.append(el('button', { class: 'prod' + (o.model === m.id ? ' on' : ''), onclick: () => { const keep = { ...o }; Object.assign(o, defaultOpening(kind, m.id), { mat: keep.mat, frame: keep.frame, leaf: keep.leaf, glass: keep.glass, handle: keep.handle, shutter: keep.shutter, shutFlip: keep.shutFlip, shutterColor: keep.shutterColor, bars: keep.bars }); rebuildGhost(); renderLib(); } },
      el('div', { class: 'im op' }, img), el('b', {}, m.name), el('span', {}, `${Math.round(m.w * 100)} × ${Math.round(m.h * 100)} cm`)));
    openingThumb(probe, img, `${kind}-${m.id}-${o.mat}-${o.frame}-${o.leaf}`);
  });
  return [el('p', { class: 'sub' }, `Choisis un modèle, règle-le ci-dessous, puis clique sur un mur pour le poser. Il s'adapte à l'épaisseur du mur.`), grid, el('h3', { style: { marginTop: '14px' } }, 'Réglages avant la pose'), ...openingForm(o, (fin) => { rebuildGhost(); }, true)];
}

function itemLibrary() {
  const top = el('div', {});
  const chips = el('div', { class: 'chips' }, CATS.map((c) => el('button', { class: 'chip' + (L.cat === c && !L.q ? ' on' : ''), onclick: () => { L.cat = c; L.sub = ''; L.q = ''; renderLib(); } }, c)));
  const subs = [...new Set(ALL.filter((d) => d.cat === L.cat && !d.hidden).map((d) => d.sub))];
  const subChips = L.q || subs.length < 2 ? null : el('div', { class: 'chips sub' }, ['Tout', ...subs].map((s) => el('button', { class: 'chip' + ((s === 'Tout' ? !L.sub : L.sub === s) ? ' on' : ''), onclick: () => { L.sub = s === 'Tout' ? '' : s; renderLib(); } }, s)));
  const search = el('input', { type: 'search', placeholder: 'Rechercher un meuble…', value: L.q, style: { width: '100%', padding: '7px 9px', border: '1px solid var(--line)', borderRadius: '8px', background: 'var(--panel)', marginBottom: '8px' } });
  search.addEventListener('input', () => { L.q = search.value; const pos = search.selectionStart; renderLib(); const s = lib().querySelector('input[type=search]'); s.focus(); s.setSelectionRange(pos, pos); });
  const list = ALL.filter((d) => !d.hidden && (L.q ? d.name.toLowerCase().includes(L.q.toLowerCase()) || d.cat.toLowerCase().includes(L.q.toLowerCase()) : d.cat === L.cat && (!L.sub || d.sub === L.sub)));
  const grid = el('div', { class: 'grid2' });
  list.forEach((d) => {
    const img = el('img', { alt: d.name });
    grid.append(el('button', { class: 'prod' + (D.item && D.item.model === d.id ? ' on' : ''), onclick: () => { setPlacingModel(d.id); renderLib(); } },
      el('div', { class: 'im' }, img), el('b', {}, d.name), el('span', {}, `${Math.round(d.w * 100)}×${Math.round(d.d * 100)}×${Math.round(d.h * 100)} cm`)));
    itemThumb(d, img);
  });
  top.append(search, chips, ...(L.cat === 'Cuisine' && !L.q ? [kitchenCard()] : []), ...(subChips ? [subChips] : []), grid.children.length ? grid : el('div', { class: 'empty' }, 'Aucun résultat'));
  const out = [top];
  if (D.item) {
    out.push(el('h3', { style: { margin: '14px 0 8px' } }, 'Configurer avant la pose'));
    out.push(...itemForm(D.item, () => rebuildGhost(), true));
    out.push(el('p', { class: 'sub' }, 'Clique dans la scène pour poser (reste actif pour en poser plusieurs). R : pivoter · Échap : terminer.'));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Cuisine modulaire : style mémorisé (façade, couleurs, poignées, plan de travail) repris pour chaque nouveau meuble
// ---------------------------------------------------------------------------------------------
const KFIN = [['mat', 'Mat'], ['bois', 'Décor bois'], ['brillant', 'Brillant']];
const CAISSONS = ['#f1efea', '#d9d4cb', '#8f9598', '#3a3d40', '#c8a57a'];
const WTC = ['#c9a27a', '#e8e4dc', '#b9b4aa', '#6e6a64', '#2e3033', '#f4f3ef', '#8a6445'];
const WTL = () => defOf('k_b_porte').selects.find((x) => x.k === 'plan').list;
export const kitchenStyle = () => (S.meta.kitchen = S.meta.kitchen || { ...KDEF });
const kItems = () => S.items.filter((i) => isKitchen(defOf(i.model)));
const remember = (o) => { const ks = kitchenStyle(); KSTYLE_KEYS.forEach((k) => { ks[k] = o[k]; }); };
function fChips(label, o, k, opts, on) {
  const wrap = el('div', { class: 'chips', style: { marginBottom: '0' } });
  opts.forEach(([v, t]) => wrap.append(el('button', { class: 'chip' + (o[k] === v ? ' on' : ''), onclick: () => { o[k] = v; on(true); } }, t)));
  return el('div', { class: 'f' }, el('div', { class: 'l' }, label), wrap);
}
function fDots(label, o, k, opts, on) {
  const pal = el('div', { class: 'pal' });
  opts.forEach(([v, t, c]) => pal.append(el('button', { class: 'sw' + (o[k] === v ? ' on' : ''), title: t, style: { background: c }, onclick: () => { o[k] = v; on(true); } })));
  const cur = opts.find((x) => x[0] === o[k]);
  return el('div', { class: 'f' }, el('div', { class: 'l' }, label + (cur ? ' : ' + cur[1] : '')), pal);
}
// on(fin, redessiner) : fin = modification terminée ; redessiner = les choix affichés dépendent de la valeur (vignettes, options)
function kStyleForm(o, on) {
  const fac = el('div', { class: 'mats' });
  FACADES.forEach(([id, name, desc]) => {
    const img = el('img', { alt: '' });
    fac.append(el('button', { class: 'mat' + (o.fa === id ? ' on' : ''), title: desc, onclick: () => { o.fa = id; if (id === 'tokyo') o.poi = 'gorge'; else if (o.poi === 'gorge') o.poi = 'barre'; on(true, true); } }, img, el('b', {}, name)));
    kThumb({ ...o, fa: id, poi: id === 'tokyo' ? 'gorge' : o.poi === 'gorge' ? 'barre' : o.poi }, img);
  });
  const cur = FACADES.find((f) => f[0] === o.fa);
  const out = [el('div', { class: 'f' }, el('div', { class: 'l' }, 'Modèle de façade' + (cur ? ' : ' + cur[2] : '')), fac),
    fColor('Couleur des façades', o, 'c1', (f) => on(f, f), FCOLORS), fSeg('Aspect', o, 'fin', KFIN, (f) => on(f, true))];
  if (o.fa === 'tokyo') out.push(el('p', { class: 'sub' }, 'Tokyo : poignée intégrée (gorge) sur toutes les façades.'));
  else out.push(fChips('Poignées', o, 'poi', KHANDLES, (f) => on(f, true)));
  if (o.fa !== 'tokyo' && o.poi !== 'gorge') out.push(fDots('Finition des poignées', o, 'pf', HFINS, (f) => on(f, true)));
  out.push(fSelect('Plan de travail', o, 'plan', WTL(), (f) => on(f, true)));
  if (['strat', 'granit', 'quartz'].includes(o.plan)) out.push(fColor('Teinte du plan de travail', o, 'c2', (f) => on(f, f), WTC));
  out.push(fColor('Caissons (intérieur)', o, 'c3', (f) => on(f, f), CAISSONS));
  return out;
}
function applyStyleToAll(o) {
  const list = kItems(); if (!list.length) return;
  list.forEach((i) => { KSTYLE_KEYS.forEach((k) => { i[k] = o[k]; }); renderItem(i); });
  drawSelection(); commit(); toast(`Style appliqué à ${list.length} élément${list.length > 1 ? 's' : ''} de cuisine`);
}
// carte de la bibliothèque (catégorie Cuisine)
function kitchenCard() {
  const ks = kitchenStyle(), n = kItems().length;
  const onKS = (fin, redraw) => {
    if (D.item && isKitchen(defOf(D.item.model))) { KSTYLE_KEYS.forEach((k) => { D.item[k] = ks[k]; }); rebuildGhost(); }
    if (fin) commit(); if (redraw) renderLib();
  };
  const det = el('details', { class: 'card', open: L.kClosed == null ? !n : !L.kClosed });   // replié d'office dès que la cuisine a des meubles
  det.addEventListener('toggle', () => { L.kClosed = !det.open; });
  const fa = FACADES.find((f) => f[0] === ks.fa), hd = KHANDLES.find((h) => h[0] === ks.poi);
  det.append(el('summary', { style: { cursor: 'pointer', fontWeight: '700', marginBottom: '6px' } }, '🎨 Style de ma cuisine', el('span', { style: { fontWeight: '400', color: 'var(--muted)', fontSize: '12px' } }, ` · ${fa ? fa[1] : ''}${ks.fa === 'tokyo' ? '' : ', poignée ' + (hd ? hd[1].toLowerCase() : '')}`)),
    el('p', { class: 'sub' }, 'Repris automatiquement pour chaque nouveau meuble de cuisine. Les meubles se collent bord à bord.'), ...kStyleForm(ks, onKS));
  if (n) det.append(fBtns(btn(`Appliquer aux ${n} élément${n > 1 ? 's' : ''} déjà posé${n > 1 ? 's' : ''}`, () => applyStyleToAll(ks))));
  return det;
}
// formulaire d'un meuble de cuisine : largeurs standard (et réglages propres au meuble)
function kitchenItemForm(it, d, ch) {
  const out = [];
  if (d.widths && d.widths.length > 1) out.push(fSeg('Largeur (cm)', it, 'w', d.widths.map((w) => [w, String(Math.round(w * 100))]), ch));
  if (!d.lock) out.push(fRange('Profondeur', it, 'd', 0.01, 1.2, 0.01, ch), fRange('Hauteur', it, 'h', 0.01, 1.2, 0.01, ch));
  return out;
}
// style d'un meuble posé : modifiable seul, mémorisé pour les suivants, ou reporté sur toute la cuisine
function kitchenStyleSection(it, ch) {
  const n = kItems().length;
  return [el('h3', { style: { marginTop: '10px' } }, 'Style'), ...kStyleForm(it, (fin, redraw) => { remember(it); ch(fin); if (redraw) renderProps(); }),
    ...(n > 1 ? [fBtns(btn(`Appliquer ce style à toute la cuisine (${n})`, () => applyStyleToAll(it), 'accent'))] : [])];
}

// ---------------------------------------------------------------------------------------------
// Lumières : groupes (une pastille + une entité Home Assistant) et points lumineux
// ---------------------------------------------------------------------------------------------
const LIGHT_MODELS = ['plafonnier', 'spot', 'reglette', 'applique', 'projecteur', 'potelet', 'suspension'];
const isLightItem = (it) => !!it && defOf(it.model).cat === 'Éclairage' && !!defOf(it.model).fields;
function lightPointForm(it, onChg, isDefault) {
  const d = defOf(it.model), ch = (f) => onChg(f), out = [];
  out.push(fRange(it.model === 'potelet' ? 'Hauteur du socle' : 'Hauteur de pose', it, 'elev', 0, 3.5, 0.05, ch));
  if (it.model === 'reglette') out.push(fRange('Longueur', it, 'w', 0.4, 2.4, 0.1, ch));
  (d.fields || []).forEach((f) => out.push(fRange(f.l, it, f.k, f.min, f.max, f.step, ch, f.unit || '')));
  if (!isDefault && !['plafonnier', 'spot', 'potelet', 'suspension'].includes(it.model)) out.push(fRange('Orientation', it, 'rot', 0, 345, 15, ch, '°'));
  return out;
}
function groupForm(g) {
  const meta = (f) => { refreshPins(); if (f) commit(); };
  return [
    fText('Nom du groupe', g, 'name', (f) => { meta(f); }, 'ex. Salon'),
    fEntity('Lumière ou interrupteur Home Assistant', g, 'ent', ['light', 'switch', 'input_boolean'], () => { syncLive(); refreshPins(); commit(); }),
    fSelect('Icône de la pastille', g, 'ic', iconList(), (f) => { meta(f); }),
    fRange('Hauteur de la pastille', g, 'h', 0, 4, 0.1, meta),
    fCheck('Masquer la pastille (le groupe reste commandé par son entité)', g, 'hide', (f) => { meta(f); }),
  ];
}
function groupButtons(g) {
  const pts = S.items.filter((i) => i.grp === g.id), on = pts.length && pts.every((i) => i.open);
  return fBtns(
    btn(on ? '💡 Éteindre l\'aperçu' : '💡 Aperçu allumé', () => { toggleGroupPreview(g.id); renderLib(); renderProps(); }, 'accent'),
    btn('Centrer la pastille', () => { if (!pts.length) return; g.x = r2(pts.reduce((a, i) => a + i.x, 0) / pts.length); g.z = r2(pts.reduce((a, i) => a + i.z, 0) / pts.length); refreshPins(); commit(); }),
  );
}
function pointRows(g) {
  const pts = S.items.filter((i) => i.grp === g.id);
  if (!pts.length) return el('div', { class: 'empty' }, 'Aucun point : choisis un type ci-dessous puis clique sur le plan.');
  return el('div', { class: 'glist' }, pts.map((i) => el('div', { class: 'grow pt' + (sel.kind === 'item' && sel.id === i.id ? ' on' : '') },
    el('button', { class: 'gb', onclick: () => { setTool('select'); select('item', i.id); } }, el('span', { class: 'gn' }, defOf(i.model).name), el('span', { class: 'gc' }, (i.elev || 0).toFixed(2).replace('.', ',') + ' m')),
    el('button', { class: 'gx', title: 'Supprimer ce point', onclick: () => removeEntity('item', i.id) }, '✕'))));
}
function lightsPanel() {
  const out = [], g = find('light', LGRP.id);
  if (!D.item) D.item = defaultItem(LGRP.model);
  out.push(el('p', { class: 'sub' }, 'Un groupe = une pastille (bouton) reliée à une lumière ou un interrupteur Home Assistant, et un ou plusieurs points lumineux (plafonniers, spots, appliques…). Choisis un type, puis clique sur le plan : le premier clic crée le groupe.'));
  const list = el('div', { class: 'glist' });
  S.lights.forEach((l) => {
    const n = S.items.filter((i) => i.grp === l.id).length;
    list.append(el('button', { class: 'grow' + (LGRP.id === l.id ? ' on' : ''), onclick: () => { LGRP.id = l.id; select('light', l.id); renderLib(); } },
      el('span', { class: 'gi', html: svg(l.ic || 'mdi:ceiling-light') }), el('span', { class: 'gn' }, l.name || 'Sans nom'), el('span', { class: 'gc' }, n + ' pt' + (n > 1 ? 's' : '') + (l.ent ? '' : ' · sans entité'))));
  });
  out.push(el('h3', {}, 'Groupes (' + S.lights.length + ')'), S.lights.length ? list : el('div', { class: 'empty' }, 'Aucun groupe pour l\'instant.'));
  out.push(fBtns(btn('＋ Nouveau groupe', () => { LGRP.id = null; select(null); renderLib(); toast('Clique sur le plan : le prochain point créera un nouveau groupe'); }, 'accent')));
  if (g) {
    out.push(el('h3', { style: { marginTop: '12px' } }, 'Groupe actif : ' + (g.name || 'sans nom')), ...groupForm(g), groupButtons(g), el('h3', {}, 'Points du groupe'), pointRows(g),
      fBtns(btn('Supprimer le groupe', () => removeEntity('light', g.id), 'danger')));
  } else out.push(el('p', { class: 'sub', style: { color: 'var(--accent)' } }, 'Le prochain point posé créera un nouveau groupe.'));
  const grid = el('div', { class: 'grid2' });
  LIGHT_MODELS.forEach((id) => {
    const d = defOf(id), img = el('img', { alt: d.name });
    grid.append(el('button', { class: 'prod' + (D.item && D.item.model === id ? ' on' : ''), onclick: () => { setLightModel(id); renderLib(); } }, el('div', { class: 'im' }, img), el('b', {}, d.name)));
    itemThumb(d, img);
  });
  out.push(el('h3', { style: { marginTop: '14px' } }, 'Type de point lumineux'), grid, el('h3', { style: { margin: '14px 0 8px' } }, 'Réglages avant la pose'), ...lightPointForm(D.item, () => rebuildGhost(), true),
    el('p', { class: 'sub' }, 'Clique sur le plan pour poser (le groupe actif reçoit les points). R : pivoter · Échap : terminer. Sans entité, les points restent des décors.'));
  return out;
}

function cfgHelp() {
  return [el('h2', {}, 'Configurer la vue'), el('p', { class: 'sub' }, 'Les changements sont visibles tout de suite ; ils ne sont gardés qu\'après « Enregistrer » (barre du haut).'),
    el('div', { class: 'help' }, el('ul', { style: { paddingLeft: '16px', margin: 0 } },
      el('li', {}, '📍 Capteur : clique sur le plan pour poser une pastille, puis choisis son entité et son icône'),
      el('li', {}, '💡 Lumière : groupes de points lumineux commandés par une entité'),
      el('li', {}, '🔗 Liens : relie fenêtres, portes, volets, meubles et lumières à leurs capteurs (👁 = aperçu)'),
      el('li', {}, '↖ Sélection : touche une pastille (glisse-la pour la déplacer), une fenêtre, une porte ou un meuble pour régler ses liens'),
      el('li', {}, '🗑 Gomme ou Suppr : supprime la pastille ou la lumière choisie'),
      el('li', {}, '☀ Soleil (barre du bas) : heure, date et orientation du plan')))];
}
function summaryPanel() {
  const s = summary();
  const kpi = el('div', { class: 'kpi' },
    el('div', {}, el('b', {}, s.area.toFixed(1).replace('.', ',') + ' m²'), el('span', {}, 'Surface au sol')),
    el('div', {}, el('b', {}, s.wallLen.toFixed(1).replace('.', ',') + ' m'), el('span', {}, 'Murs (linéaire)')),
    el('div', {}, el('b', {}, s.doors), el('span', {}, 'Portes')),
    el('div', {}, el('b', {}, s.windows), el('span', {}, 'Fenêtres / baies')));
  const rows = s.lines.map((l) => el('tr', {}, el('td', {}, `${l.n} × ${l.def.name}`, el('div', { class: 'sub', style: { margin: 0 } }, l.def.cat))));
  const table = s.lines.length
    ? el('table', { class: 'sum' }, ...rows)
    : el('div', { class: 'empty' }, 'Aucun meuble pour l\'instant.\nChoisis l\'outil « Meubles ».');
  const vue = [
    el('h3', {}, 'Vue maison (publication)'),
    fCheck('Terrain : dalle de gravier autour de la maison', S.meta, 'plot', () => { renderPlot(); commit(); }),
    el('p', { class: 'sub' }, 'La vue publiée dans Home Assistant : fond transparent, caméra orthographique, jour / soir, pastilles et animations en direct.'),
    fBtns(btn('👁 Aperçu de la vue maison', () => { select(null); setPresent(true); }, 'accent')),
  ];
  return [el('h2', {}, 'Mon plan'), el('p', { class: 'sub' }, 'Récapitulatif de la maison et liste du mobilier.'), kpi, ...vue, el('h3', {}, 'Mobilier et appareils'), table,
    s.lines.length ? el('div', { style: { marginTop: '10px' } }, btn('⤓ Exporter la liste (CSV)', exportCsv)) : null,
    el('div', { class: 'help', style: { marginTop: '16px' } }, el('h3', {}, 'Raccourcis'),
      el('ul', { style: { paddingLeft: '16px', margin: 0 } },
        el('li', {}, el('kbd', {}, 'V'), ' sélection · ', el('kbd', {}, 'W'), ' mur · ', el('kbd', {}, 'P'), ' pièce · ', el('kbd', {}, 'D'), ' porte · ', el('kbd', {}, 'N'), ' fenêtre · ', el('kbd', {}, 'M'), ' meubles'),
        el('li', {}, 'Double-clic ou ', el('kbd', {}, 'Espace'), ' : ouvrir / allumer l\'objet'),
        el('li', {}, el('kbd', {}, 'R'), ' pivoter · ', el('kbd', {}, 'Suppr'), ' effacer · ', el('kbd', {}, 'Ctrl+D'), ' dupliquer'),
        el('li', {}, 'Clic droit + glisser : tourner la vue · Maj + clic droit : déplacer · molette : zoom'),
        el('li', {}, 'Deux doigts : zoom / orbite sur tablette'))),
  ];
}
function exportCsv() {
  const s = summary(), rows = [['Catégorie', 'Article', 'Quantité']];
  s.lines.forEach((l) => rows.push([l.def.cat, l.def.name, l.n]));
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  openModal('Liste du mobilier', { text: csv, ro: true, buttons: [['Copier', 'copy'], ['Télécharger (CSV)', () => download('liste-mobilier.csv', csv, 'text/csv')]], note: 'Colle-la dans un tableur (séparateur : point-virgule).' });
}
const modal = () => $('#modal');
export function closeModal() { modal().classList.remove('show'); modal().querySelector('.box').classList.remove('pform'); }
export function openModal(title, o) {
  const box = modal().querySelector('.box'); box.innerHTML = '';
  const ta = el('textarea', { id: 'modal-text', placeholder: o.placeholder || '', readonly: !!o.ro, spellcheck: 'false' }); ta.value = o.text || '';
  box.append(el('h2', {}, title), o.note ? el('p', { class: 'sub' }, o.note) : null, ta,
    el('div', { class: 'row' }, ...o.buttons.map(([t, fn, accent]) => btn(t, async () => {
      if (fn === 'copy') { ta.select(); try { await navigator.clipboard.writeText(ta.value); toast('Copié'); } catch (e) { document.execCommand?.('copy'); toast('Texte sélectionné : Ctrl+C pour copier'); } }
      else fn(ta);
    }, accent ? 'accent' : '')), el('span', { style: { flex: 1 } }), btn('Fermer', closeModal)));
  modal().classList.add('show'); if (o.ro) ta.select(); else ta.focus();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
document.addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
export function download(name, text, type = 'application/json') {
  const a = el('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name }); document.body.append(a); a.click(); a.remove();
}

// ---------------------------------------------------------------------------------------------
// publication dans un tableau de bord Home Assistant (la page est créée automatiquement)
// ---------------------------------------------------------------------------------------------
const PUB_KEY = 'configurateur3d-publish';
export async function openPublish() {
  const box = modal().querySelector('.box'); box.innerHTML = ''; box.classList.add('pform');
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(PUB_KEY) || '{}'); } catch (e) { /* ignore */ }
  const st = { url: saved.url ?? 'configurateur-test', newName: saved.newName || 'maison-3d', viewTitle: saved.viewTitle || 'Maison 3D', keep: false };
  const status = el('p', { class: 'sub' }, 'Chargement des tableaux de bord…'), form = el('div', {});
  box.append(el('h2', {}, 'Publier la maison'), el('p', { class: 'sub' }, 'Le plan est copié dans une carte « Configurateur 3D » en lecture seule : même rendu, avec capteurs d\'ouverture, lumières, volets, soleil et pastilles reliés à Home Assistant. La page est créée automatiquement ; si le tableau contient déjà une telle carte, elle est simplement mise à jour.'), form, status);
  const buttons = el('div', { class: 'row', style: { marginTop: '10px' } });
  modal().classList.add('show');
  let list = [];
  try { list = await listDashboards(); } catch (e) { status.textContent = e.message || String(e); status.className = 'sub err'; box.append(el('div', { class: 'row' }, btn('Fermer', closeModal))); return; }
  const opts = [...list.map((d) => [d.url_path, `${d.title}${d.url_path ? ' · /' + d.url_path : ''}`]), ['__new__', '＋ Nouveau tableau de bord…']];
  if (!opts.some((o) => o[0] === st.url)) st.url = '__new__';
  const newF = el('div', { class: 'f' }), name = el('input', { type: 'text', value: st.newName, placeholder: 'maison-3d' });
  name.addEventListener('input', () => { st.newName = name.value.trim().toLowerCase(); });
  newF.append(el('div', { class: 'l' }, 'Adresse du nouveau tableau (lettres, chiffres et un tiret au moins)'), name);
  const sel2 = el('select', {}, opts.map(([v, t]) => el('option', { value: v, selected: st.url === v }, t)));
  const vis = () => { newF.style.display = st.url === '__new__' ? '' : 'none'; };
  sel2.addEventListener('change', () => { st.url = sel2.value; vis(); }); vis();
  const vt = el('input', { type: 'text', value: st.viewTitle }); vt.addEventListener('input', () => { st.viewTitle = vt.value; });
  const keep = el('input', { type: 'checkbox', checked: st.keep }); keep.addEventListener('change', () => { st.keep = keep.checked; });
  form.append(el('div', { class: 'f' }, el('div', { class: 'l' }, 'Tableau de bord'), sel2), newF, el('div', { class: 'f' }, el('div', { class: 'l' }, 'Titre de la page'), vt),
    el('label', { class: 'f', style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' } }, keep, 'Prendre l\'angle de vue actuel de l\'éditeur comme vue de départ (sinon : vue depuis le nord)'));
  const go = btn('⬆ Publier', async () => {
    status.className = 'sub'; status.textContent = 'Publication…'; go.disabled = true;
    try {
      let url = st.url === '__new__' ? st.newName : st.url;
      if (st.url === '__new__' && !/^[a-z0-9]+(-[a-z0-9]+)+$/.test(url)) throw new Error('Adresse invalide : utilise des minuscules, des chiffres et au moins un tiret (ex. maison-3d)');
      const plan = JSON.parse(exportJSON());
      plan.meta = plan.meta || {};
      const ang = keep.checked && settings.view === '3d' && !settings.present ? { az: V.az, pol: V.pol, sh: 0, persp: 1 } : homeView();
      plan.meta.view = { az: +ang.az.toFixed(3), pol: +ang.pol.toFixed(3) };
      if (ang.persp) { plan.meta.view.sh = 0; plan.meta.view.persp = 1; }   // angle de l'éditeur repris tel quel : pas de cisaillement de la vue maison
      if (plan.meta.plot == null) plan.meta.plot = true;
      plan.items.forEach((i) => { if (defOf(i.model) && defOf(i.model).cat === 'Éclairage') i.open = 0; });   // les lumières suivent Home Assistant, pas l'aperçu
      const r = await publishPlan(plan, { url, dashTitle: st.viewTitle, viewTitle: st.viewTitle.trim() || 'Maison 3D' });
      try { localStorage.setItem(PUB_KEY, JSON.stringify({ url: r.url || '', newName: st.newName, viewTitle: st.viewTitle })); } catch (e) { /* ignore */ }
      status.className = 'sub ok'; status.innerHTML = '';
      status.append(`✔ ${r.created ? 'Tableau de bord créé et ' : ''}publié (${r.n} carte${r.n > 1 ? 's' : ''}). `, el('a', { href: r.path, target: '_top', style: { color: 'var(--accent)', fontWeight: '600' }, onclick: (ev) => { if (navigate(r.path)) { ev.preventDefault(); closeModal(); } } }, 'Ouvrir la page →'));
    } catch (e) { status.className = 'sub err'; status.textContent = e.message || String(e); }
    go.disabled = false;
  }, 'accent');
  buttons.append(go, el('span', { style: { flex: 1 } }), btn('Fermer', closeModal)); box.append(buttons);
}

const TIPS = {
  select: null,
  wall: 'Dessine des murs : clique pour chaque coin. Les valeurs ci-dessous s\'appliquent aux prochains murs.',
  room: 'Glisse un rectangle (ou clique deux coins) : 4 murs + un sol sont créés.',
  floor: 'Glisse un rectangle pour poser un sol seul (sans murs).',
  paint: 'Choisis une couleur / un revêtement puis clique sur une face de mur ; ou une matière de sol puis clique sur un sol.',
  erase: 'Clique sur un mur, un sol, une porte, une fenêtre ou un meuble ou une pastille (capteur, lumière) pour le supprimer.',
};
const TITLES = { light: 'Lumières', marker: 'Capteurs & interrupteurs', select: 'Plan', wall: 'Murs', room: 'Pièce', floor: 'Sol', paint: 'Peinture & matières', door: 'Portes', window: 'Fenêtres & baies', item: 'Meubles & électroménager', erase: 'Gomme', links: 'Liens & animations' };


// ---------------------------------------------------------------------------------------------
// liens : ouvrants, meubles animés et lumières → entités Home Assistant (onglet « Liens » du mode Configurer)
// ---------------------------------------------------------------------------------------------
const ZONE = (v, a, b) => (v < a + (b - a) / 3 ? 0 : v > b - (b - a) / 3 ? 2 : 1);
// libellé lisible d'un ouvrant : son nom, sinon « modèle · zone de la maison » (nord-ouest, centre, sud…)
export function openingLabel(o, withNum) {
  if (o.name) return o.name;
  const w = find('wall', o.wall), m = modelOf(o), b = structBounds();
  let zone = '';
  if (w && b) {
    const p = wallPoint(w, o.s), zx = ZONE(p.x, b.minx, b.maxx), zz = ZONE(p.z, b.minz, b.maxz);
    zone = zx === 1 && zz === 1 ? 'centre' : [['nord', '', 'sud'][zz], ['ouest', '', 'est'][zx]].filter(Boolean).join('-');
  }
  return (o.kind === 'door' ? 'Porte ' : 'Fenêtre ') + m.name.toLowerCase() + (zone ? ' · ' + zone : '');
}
function openingLabels() {
  const seen = new Map(), out = new Map();
  S.openings.forEach((o) => { const l = openingLabel(o); seen.set(l, (seen.get(l) || 0) + 1); });
  const n = new Map();
  S.openings.forEach((o) => { const l = openingLabel(o); if (seen.get(l) > 1) { n.set(l, (n.get(l) || 0) + 1); out.set(o.id, l + ' (' + n.get(l) + ')'); } else out.set(o.id, l); });
  return out;
}
const fPick = (label, opts, cur, onPick) => {
  const s = el('select', {}, [el('option', { value: '' }, 'Aucune'), ...opts.map(([v, t]) => el('option', { value: v, selected: String(cur) === String(v) }, t))]);
  s.addEventListener('change', () => onPick(s.value));
  return el('div', { class: 'f' }, el('div', { class: 'l' }, label), s);
};
const OPEN_DOM = ['binary_sensor', 'cover', 'input_boolean', 'switch'];
function linkRow(title, ctrl, fields, onSelect) {
  return el('div', { class: 'lkrow' }, el('div', { class: 'lkt' }, el('button', { class: 'lkn', onclick: onSelect, title: 'Afficher toutes les réglages de cet élément' }, title), ...ctrl), ...fields);
}
function linksPanel() {
  const bind = () => { syncLive(); commit(); }, out = [];
  out.push(el('p', { class: 'sub' }, 'Relie chaque ouvrant, meuble animé ou groupe de lumières à son entité Home Assistant : l\'animation 3D suit l\'état en direct. 👁 / 💡 = aperçu ouvert ou allumé. Touche un nom pour tous ses réglages.'));
  const labs = openingLabels();
  out.push(el('h3', {}, 'Fenêtres et portes (' + S.openings.length + ')'));
  S.openings.forEach((o) => {
    const m = modelOf(o), f = [fEntity(m.groups === 2 ? 'Capteur du vantail 1' : 'Capteur d\'ouverture', o, 'ent', OPEN_DOM, bind)];
    if (m.groups === 2) f.push(fEntity('Capteur du vantail 2', o, 'ent2', OPEN_DOM, bind));
    if (o.shutter) f.push(fEntity('Volet roulant (cover)', o, 'shutEnt', ['cover'], bind));
    const eye = el('button', { class: 'lkb' + (o.open ? ' on' : ''), title: 'Aperçu ouvert / fermé', onclick: () => { setOpen('opening', o.id, o.open ? 0 : 1); commit(); eye.classList.toggle('on', !!o.open); } }, '👁');
    out.push(linkRow(labs.get(o.id), [eye], f, () => { select('opening', o.id); }));
  });
  const anim = S.items.filter((i) => !i.grp && !isLightItem(i) && hasAnim('item', i.id));
  if (anim.length) {
    out.push(el('h3', { style: { marginTop: '14px' } }, 'Meubles animés (' + anim.length + ')'));
    anim.forEach((i) => {
      const eye = el('button', { class: 'lkb' + (i.open ? ' on' : ''), title: 'Aperçu', onclick: () => { setOpen('item', i.id, i.open ? 0 : 1); commit(); eye.classList.toggle('on', !!i.open); } }, '👁');
      out.push(linkRow(defOf(i.model).name, [eye], [fEntity('Entité liée (état → animation)', i, 'ent', null, bind)], () => { select('item', i.id); }));
    });
  }
  out.push(el('h3', { style: { marginTop: '14px' } }, 'Lumières (' + S.lights.length + ' groupes)'));
  S.lights.forEach((g) => {
    const pts = S.items.filter((i) => i.grp === g.id), eye = el('button', { class: 'lkb' + (pts.length && pts.every((i) => i.open) ? ' on' : ''), title: 'Aperçu allumé / éteint', onclick: () => { toggleGroupPreview(g.id); eye.classList.toggle('on', pts.length > 0 && pts.every((i) => i.open)); } }, '💡');
    out.push(linkRow(g.name || 'Sans nom', [eye], [fEntity('Lumière ou interrupteur', g, 'ent', ['light', 'switch', 'input_boolean'], () => { syncLive(); refreshPins(); commit(); })], () => { select('light', g.id); }));
  });
  return out;
}

// liste des pastilles posées : sélection d'un clic, suppression avec ✕ (le moyen le plus sûr, surtout au doigt)
function markerList() {
  if (!S.markers.length) return el('div', { class: 'empty' }, 'Aucune pastille posée.');
  return el('div', { class: 'glist' }, S.markers.map((m) => el('div', { class: 'grow pt' + (sel.kind === 'marker' && sel.id === m.id ? ' on' : '') },
    el('button', { class: 'gb', onclick: () => { select('marker', m.id); renderLib(); } }, el('span', { class: 'gi', html: svg(m.ic || 'mdi:gesture-tap') }), el('span', { class: 'gn' }, m.title || nameOf(m.ent) || m.ent || 'Pastille'), el('span', { class: 'gc' }, m.ent ? '' : 'sans entité')),
    el('button', { class: 'gx', title: 'Supprimer cette pastille', onclick: () => removeEntity('marker', m.id) }, '✕'))));
}
export function renderLib() {
  const n = lib(), t = T.tool, scroll = n.scrollTop; n.innerHTML = '';
  let body;
  if (t === 'select') body = settings.cfg ? cfgHelp() : summaryPanel();
  else {
    const head = [el('h2', {}, TITLES[t]), TIPS[t] ? el('p', { class: 'sub' }, TIPS[t]) : null];
    if (t === 'wall') body = [...head, ...wallDefaults()];
    else if (t === 'room') body = [...head, el('h3', {}, 'Murs'), ...wallDefaults(), el('h3', {}, 'Sol de la pièce'), ...floorDefaults()];
    else if (t === 'floor') body = [...head, ...floorDefaults()];
    else if (t === 'paint') body = [...head, el('h3', {}, 'Murs — revêtement appliqué à la face cliquée'), ...fFinish(D, 'paintWall', () => {}, 'Revêtement'), el('h3', {}, 'Sols'), ...floorDefaults()];
    else if (t === 'door' || t === 'window') body = [...head, ...openingLibrary(t)];
    else if (t === 'item') body = [...head, ...itemLibrary()];
    else if (t === 'light') body = [...head, ...lightsPanel()];
    else if (t === 'links') body = [...head, ...linksPanel()];
    else if (t === 'marker') {
      const ch = () => {};
      const presets = [['mdi:lightbulb', '💡 Lumière', ['light', 'switch', 'input_boolean']], ['mdi:cctv', '📹 Caméra', ['camera']], ['mdi:motion-sensor', '🚶 Détecteur', ['binary_sensor']], ['mdi:thermometer', '🌡️ Valeur', ['sensor', 'climate']], ['mdi:cog', '⚙️ Autre', null]];
      body = [...head, el('div', { class: 'chips' }, presets.map(([ic, t2]) => el('button', { class: 'chip' + (D.marker.ic === ic ? ' on' : ''), onclick: () => { D.marker.ic = ic; D.marker.action = ic === 'mdi:cctv' || ic === 'mdi:motion-sensor' ? 'info' : 'auto'; D.marker.__dom = ic; renderLib(); } }, t2))),
        fEntity('Entité', D.marker, 'ent', (presets.find((p) => p[0] === D.marker.ic) || [])[2] || null, ch), fText('Titre', D.marker, 'title', ch, 'ex. Caméra portail'),
        fSelect('Icône', D.marker, 'ic', iconList(), () => renderLib()), fRange('Hauteur d\'affichage', D.marker, 'h', 0, 4, 0.1, ch),
        el('h3', { style: { marginTop: '14px' } }, 'Pastilles posées (' + S.markers.length + ')'), markerList(),
        el('p', { class: 'sub' }, 'Les pastilles de volet roulant sont réglées dans la fenêtre concernée (champ « Volet roulant »).')];
    }
    else body = head;
  }
  body.flat().forEach((c) => c && n.append(c)); n.scrollTop = scroll;
}

// ---------------------------------------------------------------------------------------------
// formulaires d'entités
// ---------------------------------------------------------------------------------------------
export function openingForm(o, onChg, isDefault = false) {
  const models = o.kind === 'door' ? DOORS : WINDOWS, m = modelOf(o), round = m.round;
  const ch = (fin) => { onChg(fin); };
  const out = [];
  if (!isDefault) out.push(fSelect('Modèle', o, 'model', models.map((x) => [x.id, x.name]), () => {
    const d = defaultOpening(o.kind, o.model); Object.assign(o, { w: d.w, h: d.h, y0: d.y0 }); ch(true); renderProps();
  }));
  out.push(fRange(round ? 'Diamètre' : 'Largeur', o, 'w', 0.5, o.kind === 'door' ? 5 : 4.5, 0.05, (f) => { if (round) o.h = o.w; ch(f); }, 'm'));
  if (!round) out.push(fRange('Hauteur', o, 'h', 0.4, 3, 0.05, ch, 'm'));
  if (o.kind === 'window') out.push(fRange('Hauteur d\'allège', o, 'y0', 0, 1.6, 0.05, ch, 'm'));
  out.push(fSeg('Matière', o, 'mat', MATS, ch));
  out.push(fColor(o.kind === 'door' ? 'Couleur du cadre' : 'Couleur de la menuiserie', o, 'frame', ch));
  if (o.kind === 'door' && (m.like || m.id) !== 'passage') out.push(fColor('Couleur de la porte', o, 'leaf', ch));
  if ((o.kind === 'window' && !round) || (m.like || m.id) === 'vitree' || m.glazed || round) out.push(fSelect('Vitrage', o, 'glass', GLASSES, ch));
  if ((o.kind === 'window' || (m.like || m.id) === 'vitree') && (m.like || m.id) !== 'passage') out.push(fSeg('Petits bois', o, 'bars', [[0, 'Aucun'], [2, '2×2'], [3, '3×3']], ch));
  if (o.kind === 'door' && (m.like || m.id) !== 'passage' || ['battant1', 'battant2', 'coulissant', 'baie2', 'baie3'].includes((m.like || m.id))) out.push(fSelect('Poignée', o, 'handle', HANDLES, ch));
  if (!round && !['fixe', 'passage', 'battant2', 'double', 'baie3'].includes((m.like || m.id))) out.push(fSeg((m.like || m.id) === 'coulissante' || (m.like || m.id) === 'coulissant' || (m.like || m.id) === 'baie2' ? 'Côté coulissant' : 'Charnières', o, 'hinge', [['L', 'Gauche'], ['R', 'Droite']], ch));
  if (!round && !['fixe', 'passage', 'baie2', 'baie3', 'coulissant'].includes((m.like || m.id))) out.push(fSeg((m.like || m.id) === 'coulissante' ? 'Côté de la porte' : 'S\'ouvre vers', o, 'side', [[1, 'Face A'], [-1, 'Face B']], ch));
  if (o.kind === 'window' && !round) {
    out.push(fCheck('Volet roulant', o, 'shutter', (f) => { ch(f); renderProps(); }));
    if (o.shutter) out.push(fBtns(btn('⇄ Inverser le côté du volet (intérieur / extérieur)', () => { o.shutFlip = o.shutFlip ? 0 : 1; ch(true); renderProps(); })), fColor('Couleur du volet', o, 'shutterColor', ch));
  }
  if (!isDefault) {
    const bind = () => { syncLive(); commit(); };
    out.push(el('h3', {}, 'Home Assistant'));
    out.push(fText('Nom (pour le retrouver dans la liste des liens)', o, 'name', (f) => { if (f) commit(); }, openingLabel(o)));
    out.push(fEntity(m.groups === 2 ? 'Capteur du vantail 1' : o.kind === 'door' ? 'Capteur d\'ouverture' : 'Capteur d\'ouverture', o, 'ent', ['binary_sensor', 'cover', 'input_boolean', 'switch'], bind));
    if (m.groups === 2) out.push(fEntity('Capteur du vantail 2', o, 'ent2', ['binary_sensor', 'cover', 'input_boolean', 'switch'], bind));
    if (o.shutter) out.push(fEntity('Volet roulant (cover)', o, 'shutEnt', ['cover'], bind));
  }
  return out;
}

export function itemForm(it, onChg, isDefault = false) {
  const d = defOf(it.model), ch = (fin) => onChg(fin), out = [];
  if (d.kmod) out.push(...kitchenItemForm(it, d, ch, isDefault));
  else {
    const lock = d.lock ? 0.1 : 0.5, wmax = d.lock ? 1.1 : 2;
    out.push(fRange('Largeur', it, 'w', +(d.w * (1 - lock)).toFixed(2), +(d.w * (d.lock ? 1.1 : 2.2)).toFixed(2), 0.01, ch));
    out.push(fRange('Profondeur', it, 'd', +(d.d * (1 - lock)).toFixed(2), +(d.d * (d.lock ? 1.1 : 2)).toFixed(2), 0.01, ch));
    out.push(fRange('Hauteur', it, 'h', +(d.h * (1 - lock)).toFixed(2), +(d.h * (d.lock ? 1.1 : wmax)).toFixed(2), 0.01, ch));
  }
  if (!isDefault) out.push(fRange('Orientation', it, 'rot', 0, 345, 15, (f) => { ch(f); }, '°'));
  if (!d.kmod || !['bas', 'col', 'demi'].includes(d.kmod)) out.push(fRange(d.kmod ? 'Hauteur de pose (bas du meuble)' : 'Surélévation (mural / posé)', it, 'elev', 0, 2.4, 0.01, ch));
  (d.colors || []).forEach((c, i) => out.push(fColor(c[0], it, 'c' + (i + 1), ch)));
  if (d.fin !== null) out.push(fSelect('Finition', it, 'fin', FINS, ch));
  (d.selects || []).forEach((s) => { if (!(d.kmod && s.k === 'plan')) out.push(fSelect(s.l, it, s.k, s.list, ch)); });
  if (d.kmod && !isDefault) out.push(...kitchenStyleSection(it, ch));
  if (d.variants) out.push(fSeg('Variante', it, 'v', d.variants.map((t, i) => [i, t]), ch));
  (d.fields || []).forEach((f) => out.push(fRange(f.l, it, f.k, f.min, f.max, f.step, ch, f.unit || '')));
  if (!isDefault) {
    const bind = () => { syncLive(); commit(); };
    out.push(el('h3', {}, 'Home Assistant'));
    if (isLightItem(it) && S.lights.length) out.push(fSelect('Groupe de lumières', it, 'grp', [['', 'Aucun (entité propre)'], ...S.lights.map((l) => [l.id, l.name || 'Sans nom'])], (f) => { bind(); renderProps(); }));
    if (!it.grp) out.push(fEntity(d.cat === 'Éclairage' ? 'Lumière / interrupteur' : 'Entité liée (état → animation)', it, 'ent', d.cat === 'Éclairage' ? ['light', 'switch', 'input_boolean'] : null, bind));
    out.push(fEntity('Visible seulement si cette entité…', it, 'visEnt', null, () => { bind(); renderProps(); }));
    if (it.visEnt) out.push(fText('…a pour état', it, 'visState', (f) => { if (f) bind(); }, /^(person|device_tracker)\./.test(it.visEnt) ? 'home (par défaut)' : 'on (par défaut)'));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// panneau de droite : propriétés
// ---------------------------------------------------------------------------------------------
export function renderProps() {
  const n = props(), scroll = n.scrollTop; n.innerHTML = '';
  const e = sel.kind && find(sel.kind, sel.id);
  document.body.classList.toggle('has-sel', !!e);
  if (!e) {
    n.append(el('h2', {}, 'Propriétés'), el('p', { class: 'sub' }, 'Sélectionne un mur, un sol, une porte, une fenêtre ou un meuble pour le personnaliser.'),
      el('div', { class: 'help' }, el('ul', { style: { paddingLeft: '16px', margin: 0 } },
        el('li', {}, 'Mur : épaisseur, hauteur, couleur et revêtement de chaque face'),
        el('li', {}, 'Sol : matière, couleur, taille du motif et dimensions'),
        el('li', {}, 'Porte / fenêtre : modèle, taille, couleur, matière, vitrage, volet roulant, animation'),
        el('li', {}, 'Meuble : dimensions, couleurs, finition, animation (portes, tiroirs…)'))));
    return;
  }
  const kind = sel.kind;
  const del = btn('Supprimer', () => removeEntity(kind, e.id), 'danger');
  if (kind === 'marker') {
    const ch = (f) => { refreshPins(); if (f) commit(); };
    n.append(el('h2', {}, 'Pastille'), el('p', { class: 'sub' }, 'Capteur, caméra ou interrupteur posé sur le plan.'));
    n.append(fEntity('Entité Home Assistant', e, 'ent', null, ch), fText('Titre', e, 'title', ch, 'ex. Caméra portail'));
    n.append(fSelect('Icône', e, 'ic', iconList(), ch), fRange('Hauteur d\'affichage', e, 'h', 0, 4, 0.1, ch));
    n.append(fSelect('Action au clic', e, 'action', [['auto', 'Automatique'], ['toggle', 'Allumer / éteindre'], ['info', 'Ouvrir la fiche']], ch));
    n.append(fCheck('Fixer à l\'écran (coin en bas à droite, comme l\'alarme)', e, 'scr', (f) => { ch(f); }));
    if (e.ent) {   // liaison depuis le bouton (comme dans la carte plan-3d) : écrit dans l'ouvrant ou le groupe de lumières choisi
      const labs = openingLabels(), dom = e.ent.split('.')[0], op = S.openings.find((o) => o.ent === e.ent || o.ent2 === e.ent);
      n.append(el('h3', {}, 'Animations'));
      if (['binary_sensor', 'cover', 'input_boolean', 'switch'].includes(dom) && S.openings.length) n.append(fPick('Animation d\'ouvrant (fenêtre, porte)', S.openings.map((o) => [o.id, labs.get(o.id)]), op ? op.id : '', (v) => {
        S.openings.forEach((o) => { if (o.ent === e.ent) o.ent = ''; if (o.ent2 === e.ent) o.ent2 = ''; });
        const o = v && find('opening', +v); if (o) { if (!o.ent) o.ent = e.ent; else if (modelOf(o).groups === 2 && !o.ent2) o.ent2 = e.ent; else o.ent = e.ent; }
        syncLive(); commit(); renderProps();
      }));
      const lg = S.lights.find((g) => g.ent === e.ent);
      if (['light', 'switch', 'input_boolean'].includes(dom) && S.lights.length) n.append(fPick('Animation sur le plan (groupe de lumières)', S.lights.map((g) => [g.id, g.name || 'Sans nom']), lg ? lg.id : '', (v) => {
        S.lights.forEach((g) => { if (g.ent === e.ent) g.ent = ''; });
        const g = v && find('light', +v); if (g) g.ent = e.ent;
        syncLive(); refreshPins(); commit(); renderProps();
      }));
    }
    n.append(el('p', { class: 'sub' }, 'Glisse la pastille pour la déplacer. En mode maison, un clic commande l\'entité.'));
    n.append(fBtns(btn('Dupliquer', duplicateSelected), del));
    return;
  }
  if (kind === 'light') {
    const cnt = S.items.filter((i) => i.grp === e.id).length;
    n.append(el('h2', {}, 'Groupe de lumières'), el('p', { class: 'sub' }, `${cnt} point${cnt > 1 ? 's' : ''} lumineux · une pastille commande tout le groupe`));
    n.append(...groupForm(e), groupButtons(e), el('h3', {}, 'Points du groupe'), pointRows(e));
    n.append(fBtns(btn('＋ Ajouter un point', () => { LGRP.id = e.id; startPlacingLight(); }, 'accent'), btn('Dupliquer', duplicateSelected), del));
    n.append(el('p', { class: 'sub' }, 'Glisse la pastille pour la déplacer. En mode maison, un clic allume ou éteint la lumière ; un appui long ouvre sa fiche.'));
    return;
  }
  if (kind === 'wall') {
    const i = wallInfo(e), ch = (f) => { rebuildStructure(); if (f) commit(); };
    n.append(el('h2', {}, 'Mur'), el('p', { class: 'sub' }, `${fmt(i.L)} · ${S.openings.filter((o) => o.wall === e.id).length} ouverture(s)`));
    n.append(fRange('Longueur', e, 'x2', 0.2, 20, 0.05, ch, 'm', () => i.L, (v) => { e.x2 = r2(e.x1 + i.ux * v); e.z2 = r2(e.z1 + i.uz * v); }));
    n.append(fRange('Épaisseur', e, 't', 0.05, 0.4, 0.01, ch), fRange('Hauteur', e, 'h', 1, 4, 0.05, ch));
    n.append(el('h3', {}, 'Face A'), ...fFinish(e, 'fa', ch, 'Revêtement'), el('h3', {}, 'Face B'), ...fFinish(e, 'fb', ch, 'Revêtement'));
    n.append(fBtns(btn('Copier A → B', () => { e.fb = { ...e.fa }; rebuildStructure(); commit(); renderProps(); }), btn('Inverser les faces', () => { [e.x1, e.x2] = [e.x2, e.x1]; [e.z1, e.z2] = [e.z2, e.z1]; e.s_flip = 1; S.openings.filter((o) => o.wall === e.id).forEach((o) => { o.s = r2(i.L - o.s); o.side = -o.side; if (o.hinge) o.hinge = o.hinge === 'L' ? 'R' : 'L'; }); rebuildStructure(); commit(); renderProps(); }), del));
    n.append(el('p', { class: 'sub' }, 'Astuce : poignées blanches = extrémités (glisse-les). Le mur se déplace en le glissant.'));
  } else if (kind === 'floor') {
    const tsz = el('p', { class: 'sub' }), showSize = () => { const d = floorDef(e.mat), [tw, th] = (d.tex && TILE[d.tex]) || [0, 0], sc = e.scale || 1, f2 = (v) => (v * sc).toFixed(2).replace('.', ','); tsz.textContent = tw ? `Un carreau mesure ${f2(tw)} × ${f2(th)} m (taille du motif 1 = dimensions réelles)` : ''; };
    const ch = (f) => { rebuildFloors(); showSize(); if (f) commit(); };
    n.append(el('h2', {}, 'Sol'), el('p', { class: 'sub' }, `${(e.w * e.d).toFixed(1).replace('.', ',')} m² · ${floorDef(e.mat).name}`));
    n.append(fFloorMat(e, ch), fColor('Couleur / teinte', e, 'color', ch, floorDef(e.mat).presets), fRange('Taille du motif (lames, carreaux)', e, 'scale', 0.4, 2.5, 0.05, ch, 'x'));
    showSize(); n.append(tsz);
    n.append(fRange('Largeur', e, 'w', 0.4, 20, 0.05, ch), fRange('Profondeur', e, 'd', 0.4, 20, 0.05, ch));
    // reporter matière, teinte et taille sur les autres sols qui ont (ou avaient) le même revêtement
    const was = prevMat.get(e.id) || e.mat, others = S.floors.filter((f) => f !== e && (f.mat === was || f.mat === e.mat));
    const apply = others.length ? btn(`Appliquer aux ${others.length} autre${others.length > 1 ? 's' : ''} sol${others.length > 1 ? 's' : ''} « ${floorDef(was).name} »${was !== e.mat ? ' / « ' + floorDef(e.mat).name + ' »' : ''}`, () => { others.forEach((f) => { f.mat = e.mat; f.color = e.color; f.scale = e.scale || 1; }); prevMat.delete(e.id); rebuildFloors(); commit(); renderProps(); }) : null;
    n.append(fBtns(...[apply, btn('Dupliquer', duplicateSelected), del].filter(Boolean)));
  } else if (kind === 'opening') {
    const ch = (f) => { rebuildStructure(); if (f) commit(); };
    const m = modelOf(e), w = find('wall', e.wall);
    n.append(el('h2', {}, m.name), el('p', { class: 'sub' }, e.kind === 'door' ? 'Porte' : 'Fenêtre'));
    if (!validOpeningNow(e)) n.append(el('p', { class: 'sub', style: { color: 'var(--danger)' } }, 'Cette ouverture dépasse du mur ou en chevauche une autre.'));
    n.append(...openingForm(e, ch));
    n.append(fRange('Position le long du mur', e, 's', e.w / 2 + 0.05, Math.max(e.w / 2 + 0.1, wallInfo(w).L - e.w / 2 - 0.05), 0.05, ch));
    n.append(el('h3', {}, 'Animation'));
    n.append(fBtns(btn(e.open ? '⏹ Fermer' : '▶ ' + (e.kind === 'door' ? 'Ouvrir' : 'Ouvrir'), toggleAnim, 'accent'),
      e.shutter ? btn(e.shut ? '⬆ Remonter le volet' : '⬇ Baisser le volet', () => { setShut(e.id, e.shut ? 0 : 1); commit(); renderProps(); }) : null));
    n.append(fBtns(btn('Dupliquer', duplicateSelected), del));
  } else if (kind === 'item') {
    const d = defOf(e.model), ch = (f) => { renderItem(e); drawSelection(); if (f) commit(); };
    n.append(el('h2', {}, d.name), el('p', { class: 'sub' }, d.kmod ? `${d.cat} · ${d.sub}` : d.cat));
    if (isLightItem(e) && e.grp) {
      const g = find('light', e.grp);
      n.append(fSelect('Groupe de lumières', e, 'grp', S.lights.map((l) => [l.id, l.name || 'Sans nom']), (f) => { syncLive(); refreshPins(); if (f) { commit(); renderProps(); } }));
      n.append(...lightPointForm(e, ch, false), el('p', { class: 'sub' }, g && g.ent ? `Commandé par ${nameOf(g.ent)}` : 'Aucune entité : renseigne-la dans le groupe (sélectionne sa pastille).'));
    } else n.append(...itemForm(e, ch));
    if (hasAnim('item', e.id)) { n.append(el('h3', {}, 'Animation'), fBtns(btn((e.open ? '⏹ ' : '▶ ') + d.anim, toggleAnim, 'accent'))); }
    n.append(fBtns(btn('⟲ −15°', () => rotateSelected(-15)), btn('⟳ +15°', () => rotateSelected(15)), btn('Dupliquer', duplicateSelected), del));
  }
  n.scrollTop = scroll;
}

function refreshPanels() { renderLib(); renderProps(); }

// ---------------------------------------------------------------------------------------------
// barre d'outils / rail
// ---------------------------------------------------------------------------------------------
const ICONS = {
  select: 'M5 3l13 8-6 2-2 6z',
  wall: 'M3 5h18v4H3z M3 9h18v5H3z M3 14h18v5H3z M9 5v4 M15 9v5 M9 14v5',
  room: 'M4 4h16v16H4z M9 4v6h11',
  floor: 'M3 9l9-5 9 5-9 5z M3 14l9 5 9-5',
  paint: 'M5 4h12v5H5z M17 6.5h3v5h-9v3 M10 14.5h2v6h-2z',
  door: 'M6 21V4h12v17 M4 21h16 M14.5 12.5h.01',
  window: 'M5 4h14v16H5z M12 4v16 M5 12h14',
  item: 'M4 11V8a2 2 0 012-2h12a2 2 0 012 2v3 M3 11a2 2 0 014 0v3h10v-3a2 2 0 014 0v6H3z M6 17v2 M18 17v2',
  erase: 'M4 20h16 M6.5 15.5L14 8l5 5-6 6H9z',
  marker: 'M12 21s-6-5.2-6-10a6 6 0 0112 0c0 4.8-6 10-6 10z M12 8.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z',
  light: 'M9 18h6 M10 21h4 M12 3a6 6 0 00-3.7 10.7c.5.4.7 1 .7 1.6V16h6v-.7c0-.6.2-1.2.7-1.6A6 6 0 0012 3z',
};
const TOOLS = [['select', 'Sélection'], ['wall', 'Murs'], ['room', 'Pièce'], ['floor', 'Sol'], ['paint', 'Peinture'], ['door', 'Portes'], ['window', 'Fenêtres'], ['item', 'Meubles'], ['light', 'Lumières'], ['marker', 'Capteurs'], ['erase', 'Gomme']];
const HINTS = {
  select: 'Clic : sélectionner · Glisser : déplacer · Double-clic / Espace : ouvrir ou allumer · R : pivoter · Suppr : effacer · Clic droit + glisser : tourner la vue · Molette : zoom',
  wall: 'Clique pour poser chaque coin du mur · Maj : angle droit · Double-clic / Échap / clic droit : terminer la série',
  room: 'Glisse un rectangle pour créer une pièce (4 murs + sol) · Échap : annuler',
  floor: 'Glisse un rectangle pour poser un sol sans murs',
  paint: 'Clique sur une face de mur ou sur un sol pour appliquer la matière choisie à gauche',
  door: 'Survole un mur puis clique pour poser la porte (rouge = impossible) · Échap : terminer',
  window: 'Survole un mur puis clique pour poser la fenêtre (rouge = impossible) · Échap : terminer',
  item: 'Clique pour poser · R : pivoter · Alt : désactiver l\'aimant · Échap : terminer',
  light: 'Clique sur le plan pour poser un point lumineux dans le groupe actif (le premier clic crée le groupe) · R : pivoter · Échap : terminer',
  erase: 'Clique sur un élément pour le supprimer · Ctrl+Z pour annuler',
  marker: 'Clique sur le plan pour poser une pastille (capteur, caméra, interrupteur) liée à une entité Home Assistant',
  links: 'Relie les fenêtres, portes, volets, meubles et lumières à leurs entités',
};

export function initUI() {
  const rail = $('#rail');
  TOOLS.forEach(([id, name]) => rail.append(el('button', { class: 'tool', 'data-tool': id, title: name, onclick: () => { if (id === 'item' && !D.item) { startPlacing('lit140'); } else if (id === 'light') startPlacingLight(); else setTool(id); } },
    el('span', { html: `<svg viewBox="0 0 24 24"><path d="${ICONS[id]}"/></svg>` }), name)));
  on('tool', (t) => {
    rail.querySelectorAll('.tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
    $('#hint').textContent = HINTS[t]; renderLib(); renderProps();
  });
  on('select', () => { renderProps(); if (T.tool === 'light' || T.tool === 'marker') renderLib(); });
  on('state', () => { if (T.tool === 'select' || T.tool === 'light' || T.tool === 'marker') renderLib(); $('#b-undo').disabled = false; });
  on('history', () => { $('#b-undo').disabled = !canU(); $('#b-redo').disabled = !canR(); });
  on('view', () => { $('#b-3d').classList.toggle('on', settings.view === '3d'); $('#b-2d').classList.toggle('on', settings.view === '2d'); $('#s-walls').disabled = settings.view === '2d'; });
  $('#b-3d').onclick = () => setView('3d'); $('#b-2d').onclick = () => setView('2d');
  $('#s-walls').onchange = (e) => { settings.wallMode = e.target.value; updateCutaway(); };
  $('#s-snap').onchange = (e) => { settings.snap = +e.target.value; };
  $('#c-magnet').onchange = (e) => { settings.magnet = e.target.checked; };
  $('#c-ortho').onchange = (e) => { settings.ortho = e.target.checked; };
  $('#b-fit').onclick = () => frameAll();
  $('#b-live').onclick = () => { setLive(!settings.live); };
  on('live', () => { $('#b-live').classList.toggle('on', settings.live); $('#b-live').textContent = settings.live ? '🏠 Mode maison : actif' : '🏠 Mode maison'; renderProps(); });
  let firstHass = true;
  onHass(() => { $('#ha-st').textContent = '● Home Assistant connecté'; $('#ha-st').classList.add('ok'); syncLive(); refreshPins(); if (firstHass) { firstHass = false; renderProps(); renderLib(); } });
  $('#b-sun').onclick = () => { $('#sunbox').classList.toggle('show'); renderSun(); };
  on('sun', () => renderSunInfo());
  let allOpen = false;
  $('#b-open').onclick = () => { allOpen = !allOpen; openAll(allOpen ? 1 : 0); $('#b-open').textContent = allOpen ? '⏹ Tout fermer' : '▶ Tout animer'; emit('select'); };
}
let canU = () => false, canR = () => false;
export function bindHistory(u, r) { canU = u; canR = r; }

// ---------------------------------------------------------------------------------------------
// soleil
// ---------------------------------------------------------------------------------------------
export function renderSun() {
  const box = $('#sunbox'); box.innerHTML = '';
  const sm = settings.sun, p = SUN.place();
  if (sm.mode === 'sim' && !sm.date) { const n = SUN.nowIn(p.tz); sm.date = n.d; sm.min = n.m; }
  box.append(el('div', { class: 'row', style: { justifyContent: 'space-between', alignItems: 'center' } }, el('b', {}, '☀ Soleil'), btn('✕', () => box.classList.remove('show'))));
  box.append(el('div', { class: 'seg', style: { margin: '8px 0' } }, [['off', 'Désactivé'], ['live', 'Temps réel'], ['sim', 'Simulation']].map(([v, t]) => el('button', { class: sm.mode === v ? 'on' : '', onclick: () => { setSun({ mode: v }); renderSun(); } }, t))));
  if (sm.mode === 'sim') {
    const d = el('input', { type: 'date', value: sm.date }); d.addEventListener('input', () => { setSun({ date: d.value }); });
    const r = el('input', { type: 'range', min: 0, max: 1439, step: 5, value: sm.min, style: { width: '100%' } });
    const lab = el('span', { class: 'v' }, hhmm(sm.min));
    r.addEventListener('input', () => { lab.textContent = hhmm(+r.value); setSun({ min: +r.value }); });
    box.append(el('div', { class: 'f' }, el('div', { class: 'l' }, 'Date', d)), el('div', { class: 'f' }, el('div', { class: 'l' }, 'Heure', lab), r));
  }
  if (sm.mode !== 'off') {
    const rot = el('input', { type: 'number', value: S.meta.rot || 0, step: 1, style: { width: '80px' } });
    rot.addEventListener('change', () => { S.meta.rot = +rot.value || 0; setSun({}); commit(); });
    box.append(el('div', { class: 'f' }, el('div', { class: 'l' }, 'Nord du plan à l\'ouest du vrai nord de (°)'), rot));
  }
  box.append(el('div', { class: 'sub', id: 'suninfo', style: { margin: 0 } }));
  renderSunInfo();
}
const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
function renderSunInfo() {
  const i = $('#suninfo'); if (!i) return;
  const s = R.sunInfo; i.textContent = s ? `Azimut ${Math.round(s.az)}° (${SUN.compass(s.az)}) · hauteur ${Math.round(s.el)}°${s.el < 0 ? ' · nuit' : ''}` : 'Lumière neutre (sans soleil)';
}
