// Outils et interactions souris / tactile / clavier.
import * as THREE from 'three';
import { clamp, rad, deg, r2, disposeTree } from './util.js';
import {
  S, R, V, settings, sel, nid, find, select, commit, emit, on, setupCam, groundPoint, pick, pickHandle, project, entityBox, wireBox,
  rebuildStructure, rebuildFloors, rebuildAll, renderItem, moveItemObj, supportTop, wallInfo, wallPoint, invalidate, setOpen, hasAnim, entityObj, updateCutaway, FLOOR_Y, bounds,
  undo, redo, frameAll, entOfItem, isOrtho, viewOnly,
} from './core.js';
import { buildItem, defaultItem, defOf } from './catalog.js';
import { buildOpening, defaultOpening, modelOf } from './openings.js';
import { floorDef } from './textures.js';
import { toggle as haToggle, moreInfo, isToggleable } from './ha.js';

// valeurs par défaut utilisées pour créer de nouveaux éléments (éditées dans le panneau de gauche)
export const D = {
  wall: { t: 0.15, h: 2.5, fa: { c: '#f2efe9', f: 'peinture' }, fb: { c: '#e4ddd0', f: 'peinture' } },
  floor: { mat: 'parquet', color: '#e0bb8c', scale: 1 },
  door: defaultOpening('door', 'battant'),
  window: defaultOpening('window', 'battant2'),
  item: null,
  marker: { ent: '', ic: 'mdi:lightbulb', h: 2, title: '', action: 'auto' },
};
export const T = { tool: 'select' };
export const LGRP = { id: null, model: 'plafonnier' };   // groupe de lumières actif et type de luminaire en cours de pose
const FREE = new Set(['tapis', 'tapis_r', 'table', 'table_r', 'tablebasse', 'tablebasse_r', 'chaise', 'tabouret', 'chaise_bureau', 'lampadaire', 'plante', 'fauteuil', 'plafonnier', 'spot', 'reglette', 'suspension', 'potelet', 'voiture1', 'voiture2']);
const placing = (t) => t === 'item' || t === 'light';

let labelsEl, drag = null, chain = null, rect = null, ghost = null, hoverBox = null, cursor = { x: 0, z: 0, ok: false };
const pointers = new Map();
const labels = new Map();

// ---------- utilitaires ----------
const wpp = () => (isOrtho() ? (2 * V.size) / R.h : (2 * V.dist * Math.tan(THREE.MathUtils.degToRad(R.persp.fov / 2))) / R.h);
const gsnap = (v, g = settings.snap) => (g > 0 ? r2(Math.round(v / g) * g) : v);

function snapPoint(x, z, o = {}) {
  // aimant sur les extrémités de murs
  const rad2 = Math.max(0.15, wpp() * 12);
  let best = null, bd = rad2;
  for (const w of S.walls) for (const [px, pz] of [[w.x1, w.z1], [w.x2, w.z2]]) {
    if (o.skip && o.skip.includes(w.id)) continue;
    const d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; best = { x: px, z: pz, snapped: true }; }
  }
  if (o.from && !best) { // verrouillage orthogonal (Maj ou bouton)
    if (o.ortho) { if (Math.abs(x - o.from.x) > Math.abs(z - o.from.z)) z = o.from.z; else x = o.from.x; }
    else { if (Math.abs(x - o.from.x) < 0.08) x = o.from.x; if (Math.abs(z - o.from.z) < 0.08) z = o.from.z; }
  }
  if (best) return best;
  return { x: r2(gsnap(x)), z: r2(gsnap(z)) };
}

let structRaf = 0;
function scheduleStructure() { if (structRaf) return; structRaf = requestAnimationFrame(() => { structRaf = 0; rebuildStructure(); }); }

// ---------- étiquettes de cotes ----------
function label(id, text, x, y, z) {
  let l = labels.get(id);
  if (!l) { const el = document.createElement('div'); el.className = 'lbl'; labelsEl.appendChild(el); l = { el }; labels.set(id, l); }
  l.el.textContent = text; l.pos = [x, y, z]; invalidate(false);
}
function clearLabels() { labels.forEach((l) => l.el.remove()); labels.clear(); invalidate(false); }
function placeLabels() {
  labels.forEach((l) => { const p = project(...l.pos); l.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%)`; l.el.style.display = p.vis ? '' : 'none'; });
}

// ---------- outil actif ----------
export function setTool(t) {
  if (T.tool === 'light' && t !== 'light') { D.light = D.item; D.item = D.itemKept || null; }
  if (t === 'light' && T.tool !== 'light') { D.itemKept = D.item; D.item = D.light && D.light.model ? D.light : defaultItem(LGRP.model); }
  endChain(); rect = null; clearTmp(); clearGhost(); clearLabels();
  T.tool = t;
  if ((t === 'door' || t === 'window') && !sel.kind) { /* rien */ }
  if (t !== 'select') select(null);
  R.canvas.dataset.tool = t;
  emit('tool', t); updateGhost();
}
function clearTmp() { for (const c of [...R.tmp.children]) { R.tmp.remove(c); disposeTree(c); } invalidate(false); }
function clearGhost() { if (ghost) { R.ghost.remove(ghost); disposeTree(ghost); ghost = null; } invalidate(false); }

export function startPlacing(model) {
  D.item = D.item && D.item.model === model ? D.item : defaultItem(model);
  setTool('item');
}
export function startPlacingLight(model) {
  if (model) { LGRP.model = model; if (T.tool === 'light') D.item = defaultItem(model); else D.light = defaultItem(model); }
  setTool('light');
}
export function setLightModel(model) { LGRP.model = model; D.item = defaultItem(model); clearGhost(); updateGhost(); }
export function setPlacingModel(model) { D.item = defaultItem(model); clearGhost(); updateGhost(); }
export function rebuildGhost() { clearGhost(); updateGhost(); }

// ---------- création / suppression ----------
// mode Configurer de la vue publiée : on ne supprime que les pastilles, les groupes de lumières et leurs points
export const cfgDeletable = (kind, id) => kind === 'marker' || kind === 'light' || (kind === 'item' && !!(find('item', id) || {}).grp);
export function removeEntity(kind, id) {
  if (kind === 'wall') { S.openings = S.openings.filter((o) => o.wall !== id); S.walls = S.walls.filter((w) => w.id !== id); }
  else if (kind === 'light') { S.items = S.items.filter((i) => i.grp !== id); S.lights = S.lights.filter((l) => l.id !== id); if (LGRP.id === id) LGRP.id = null; }
  else S[kind + 's'] = S[kind + 's'].filter((e) => e.id !== id);
  if (sel.kind === kind && sel.id === id) select(null);
  if (kind === 'item' || kind === 'light') rebuildAll(); else rebuildStructure();
  commit();
}
export function duplicateSelected() {
  const e = sel.kind && find(sel.kind, sel.id); if (!e || sel.kind === 'wall') return;
  const c = JSON.parse(JSON.stringify(e)); c.id = nid();
  if (sel.kind === 'marker') { c.x += 0.3; c.z += 0.3; S.markers.push(c); }
  else if (sel.kind === 'light') {
    c.name += ' (copie)'; c.x += 0.5; c.z += 0.5; S.lights.push(c);
    for (const it of S.items.filter((i) => i.grp === e.id)) { const k = JSON.parse(JSON.stringify(it)); k.id = nid(); k.grp = c.id; k.x += 0.5; k.z += 0.5; S.items.push(k); }
    rebuildAll();
  }
  else if (sel.kind === 'item') { c.x += 0.3; c.z += 0.3; S.items.push(c); renderItem(c); }
  else if (sel.kind === 'floor') { c.x += 0.5; c.z += 0.5; S.floors.push(c); rebuildFloors(); }
  else { c.s += c.w + 0.2; if (!validOpening(c, c.s)) return; S.openings.push(c); rebuildStructure(); }
  select(sel.kind, c.id); commit();
}
export function rotateSelected(dd) {
  const e = sel.kind === 'item' && find('item', sel.id); if (!e) return;
  e.rot = ((Math.round(e.rot + dd) % 360) + 360) % 360; moveItemObj(e); commit();
}
// aperçu allumé / éteint de tous les points d'un groupe de lumières
export function toggleGroupPreview(id) {
  const pts = S.items.filter((i) => i.grp === id); if (!pts.length) return;
  const v = pts.every((i) => i.open) ? 0 : 1; pts.forEach((i) => setOpen('item', i.id, v)); commit(); emit('select');
}
export function toggleAnim() {
  if (sel.kind === 'light') { toggleGroupPreview(sel.id); return; }
  const e = sel.kind && find(sel.kind, sel.id); if (!e || !(sel.kind === 'item' || sel.kind === 'opening')) return;
  setOpen(sel.kind, sel.id, e.open ? 0 : 1); commit(); emit('select');
}
function addWall(x1, z1, x2, z2) {
  if (Math.hypot(x2 - x1, z2 - z1) < 0.1) return null;
  const dup = S.walls.find((w) => (near(w.x1, x1) && near(w.z1, z1) && near(w.x2, x2) && near(w.z2, z2)) || (near(w.x1, x2) && near(w.z1, z2) && near(w.x2, x1) && near(w.z2, z1)));
  if (dup) return dup;
  const w = { id: nid(), x1, z1, x2, z2, t: D.wall.t, h: D.wall.h, fa: { ...D.wall.fa }, fb: { ...D.wall.fb } };
  S.walls.push(w); return w;
}
const near = (a, b) => Math.abs(a - b) < 0.01;
export function createRoom(x0, z0, x1, z1, withWalls = true) {
  const a = Math.min(x0, x1), b = Math.max(x0, x1), c = Math.min(z0, z1), d = Math.max(z0, z1);
  if (b - a < 0.4 || d - c < 0.4) return;
  if (withWalls) { addWall(a, c, b, c); addWall(b, c, b, d); addWall(b, d, a, d); addWall(a, d, a, c); }
  const f = { id: nid(), x: a, z: c, w: b - a, d: d - c, ...D.floor };
  S.floors.push(f); rebuildStructure(); select('floor', f.id); commit();
}

// ---------- ouvertures ----------
function locate(cx, cy, o) {
  const h = pick(cx, cy, ['wall']); let w = null, pt = null;
  if (h) { w = find('wall', h.id); pt = h.point; }
  else {
    const g = groundPoint(cx, cy); if (!g) return null; let bd = 0.6;
    for (const k of S.walls) { const i = wallInfo(k), t = (g.x - k.x1) * i.ux + (g.z - k.z1) * i.uz, sd = Math.abs((g.x - k.x1) * i.nx + (g.z - k.z1) * i.nz); if (t > 0 && t < i.L && sd < bd) { bd = sd; w = k; pt = { x: g.x, z: g.z }; } }
  }
  if (!w) return null;
  const i = wallInfo(w), s0 = (pt.x - w.x1) * i.ux + (pt.z - w.z1) * i.uz, sd = (pt.x - w.x1) * i.nx + (pt.z - w.z1) * i.nz;
  const s = clamp(Math.round(s0 / 0.05) * 0.05, o.w / 2 + 0.05, Math.max(o.w / 2 + 0.05, i.L - o.w / 2 - 0.05));
  return { wall: w.id, s: r2(s), side: sd >= 0 ? 1 : -1 };
}
function validOpening(o, s, wallId = o.wall) {
  const w = find('wall', wallId); if (!w) return false;
  const L = wallInfo(w).L;
  if (s - o.w / 2 < 0.04 || s + o.w / 2 > L - 0.04 || o.y0 + o.h > w.h - 0.04) return false;
  return !S.openings.some((p) => p.id !== o.id && p.wall === wallId && Math.abs(p.s - s) < (p.w + o.w) / 2 + 0.04);
}
export function validOpeningNow(o) { return validOpening(o, o.s); }

// ---------- meubles ----------
function magnet(it, x, z) {
  let rot = it.rot;
  x = gsnap(x, 0.05); z = gsnap(z, 0.05);
  if (!settings.magnet || FREE.has(it.model)) return { x, z, rot };
  let best = null, bs = 0.4;
  for (const w of S.walls) {
    const i = wallInfo(w), t = (x - w.x1) * i.ux + (z - w.z1) * i.uz; if (t < -0.2 || t > i.L + 0.2) continue;
    const sd = (x - w.x1) * i.nx + (z - w.z1) * i.nz, a = Math.abs(sd), half = w.t / 2 + (it.d || 0.5) / 2;
    if (Math.abs(a - half) < bs) { bs = Math.abs(a - half); best = { w, i, sd, t, half }; }
  }
  if (!best) return { x, z, rot };
  const side = best.sd >= 0 ? 1 : -1, { w, i } = best, t = gsnap(best.t, 0.05);
  return { x: r2(w.x1 + i.ux * t + i.nx * side * (best.half + 0.002)), z: r2(w.z1 + i.uz * t + i.nz * side * (best.half + 0.002)), rot: (Math.round(deg(Math.atan2(i.nx * side, i.nz * side))) + 360) % 360 };
}

// ---------- fantôme ----------
function fadeGhost(o, invalid) {
  o.traverse((c) => {
    if (c.isMesh) {
      const ms = Array.isArray(c.material) ? c.material : [c.material];
      c.material = ms.map((m) => { const n = m.clone(); n.transparent = true; n.opacity = Math.min(n.opacity ?? 1, 0.6); n.depthWrite = false; if (invalid) { n.emissive = new THREE.Color('#ff2222'); n.emissiveIntensity = 0.8; } return n; });
      c.material = c.material.length === 1 ? c.material[0] : c.material; c.castShadow = false; c.userData.ref = null;
    }
  });
}
function updateGhost() {
  const t = T.tool;
  if (!placing(t) && t !== 'door' && t !== 'window' && t !== 'marker') { clearGhost(); return; }
  if (!ghost && placing(t) && D.item) {
    const b = buildItem(D.item); ghost = new THREE.Group(); ghost.add(b.group); fadeGhost(ghost); R.ghost.add(ghost);
  }
  if (!ghost && (t === 'door' || t === 'window' || t === 'marker')) { ghost = new THREE.Group(); R.ghost.add(ghost); ghost.userData.empty = true; }
  invalidate(false);
}
function moveGhost(cx, cy) {
  const t = T.tool;
  if (placing(t) && ghost && D.item) {
    const g = groundPoint(cx, cy); if (!g) { ghost.visible = false; return; }
    const p = magnet(D.item, g.x, g.z); cursor = { ...p, ok: true };
    ghost.visible = true; ghost.position.set(p.x, FLOOR_Y + (defOf(D.item.model).onTop ? (supportTop(p.x, p.z, null) ?? 0) : (D.item.elev || 0)), p.z); ghost.rotation.y = rad(p.rot);
    D.item.rot = p.rot;
  } else if (t === 'marker' && ghost) {
    const g = groundPoint(cx, cy); if (!g) return;
    cursor = { x: gsnap(g.x, 0.05), z: gsnap(g.z, 0.05), ok: true }; ghost.visible = true;
  } else if ((t === 'door' || t === 'window') && ghost) {
    const o = D[t], loc = locate(cx, cy, o);
    for (const c of [...ghost.children]) { ghost.remove(c); disposeTree(c); }
    if (!loc) { ghost.visible = false; cursor.ok = false; return; }
    const w = find('wall', loc.wall), i = wallInfo(w), p = wallPoint(w, loc.s), ok = validOpening(o, loc.s, loc.wall);
    const probe = { ...o, side: loc.side }, b = buildOpening(probe, w.t); fadeGhost(b.group, !ok);
    ghost.add(b.group); ghost.visible = true; ghost.position.set(p.x, o.y0, p.z); ghost.rotation.y = -i.ang;
    cursor = { ...loc, ok };
  }
  invalidate(false);
}

// ---------- caméra ----------
function orbit(dx, dy) { V.az -= dx * 0.006; V.pol = clamp(V.pol - dy * 0.005, 0.08, 1.52); setupCam(); }
function pan(dx, dy) {
  const k = wpp();
  if (settings.view === '2d') { V.tx -= dx * k; V.tz -= dy * k; }
  else { const sa = Math.sin(V.az), ca = Math.cos(V.az), f = settings.camOrtho ? 1 / Math.max(0.35, Math.cos(V.pol)) : 1; V.tx += -ca * dx * k - sa * dy * k * f; V.tz += sa * dx * k - ca * dy * k * f; }
  setupCam();
}
function zoom(f, cx, cy) {
  const g0 = cx != null ? groundPoint(cx, cy) : null;
  if (isOrtho()) V.size = clamp(V.size * f, 1.2, 60); else V.dist = clamp(V.dist * f, 1.5, 90);
  setupCam();
  if (g0 && settings.view === '2d') { const g1 = groundPoint(cx, cy); if (g1) { V.tx += g0.x - g1.x; V.tz += g0.z - g1.z; setupCam(); } }
}

// ---------- chaîne de murs ----------
function endChain() { chain = null; clearTmp(); clearLabels(); }
function wallPreview(a, b) {
  clearTmp();
  const L = Math.hypot(b.x - a.x, b.z - a.z);
  if (L > 0.02) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(L, D.wall.h, D.wall.t), new THREE.MeshBasicMaterial({ color: 0x2f7bff, transparent: true, opacity: 0.35, depthWrite: false }));
    m.position.set((a.x + b.x) / 2, D.wall.h / 2, (a.z + b.z) / 2); m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); R.tmp.add(m);
  }
  const dot = (p) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0x2f7bff, depthTest: false })); s.position.set(p.x, 0.1, p.z); s.renderOrder = 30; R.tmp.add(s); };
  dot(a); dot(b);
  label('len', L.toFixed(2).replace('.', ',') + ' m', (a.x + b.x) / 2, D.wall.h + 0.25, (a.z + b.z) / 2);
  invalidate(false);
}
function rectPreview(a, b, withLabel = true) {
  clearTmp();
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), z0 = Math.min(a.z, b.z), z1 = Math.max(a.z, b.z);
  if (x1 - x0 > 0.02 && z1 - z0 > 0.02) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshBasicMaterial({ color: 0x2f7bff, transparent: true, opacity: 0.3, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.05, (z0 + z1) / 2); R.tmp.add(m);
    const e = wireBox({ x: (x0 + x1) / 2, y: 0.05, z: (z0 + z1) / 2, w: x1 - x0, h: 0.001, d: z1 - z0, rot: 0 }, 0x2f7bff); R.tmp.add(e);
    if (withLabel) label('rect', `${(x1 - x0).toFixed(2)} × ${(z1 - z0).toFixed(2)} m  ·  ${((x1 - x0) * (z1 - z0)).toFixed(1)} m²`.replace(/\./g, ','), (x0 + x1) / 2, 0.3, (z0 + z1) / 2);
  }
  invalidate(false);
}

// ---------- survol ----------
function setHover(h) {
  if (hoverBox) { R.tmp.remove(hoverBox); hoverBox.geometry.dispose(); hoverBox = null; }
  if (h && !(sel.kind === h.kind && sel.id === h.id)) {
    const e = find(h.kind, h.id); if (e) { hoverBox = wireBox(entityBox(h.kind, e), 0xff9a1f); R.tmp.add(hoverBox); }
  }
  invalidate(false);
}

// ---------- évènements pointeur ----------
function handlesFor(kind, e) { return [kind, e]; }
export function initTools(canvas, lblEl) {
  labelsEl = lblEl; R.frameHooks = [placeLabels];
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => { if ((settings.present || settings.readonly) && !settings.free) return; e.preventDefault(); zoom(Math.exp(clamp(e.deltaY, -120, 120) * 0.0013), e.clientX, e.clientY); }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); if (chain) endChain(); });
  canvas.addEventListener('dblclick', dbl);
  window.addEventListener('keydown', key);
  on('view', () => { clearGhost(); updateGhost(); });
  on('select', () => { if (sel.kind === 'light') LGRP.id = sel.id; else if (sel.kind === 'item') { const it = find('item', sel.id); if (it && it.grp) LGRP.id = it.grp; } });
  on('state', () => { if (T.tool === 'item' || T.tool === 'door' || T.tool === 'window') { /* ghost conservé */ } });
}

let gesture = null;
function down(e) {
  e.preventDefault();
  R.canvas.setPointerCapture?.(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const fixed = (settings.present || settings.readonly) && !settings.free;   // vue maison fixe : le doigt fait défiler la page, un tap commande l'objet touché
  if (pointers.size === 2 && !fixed) { // pincement / déplacement à deux doigts
    drag = null;
    const [a, b] = [...pointers.values()];
    gesture = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    return;
  }
  if (pointers.size > 2) return;
  const mouse = e.pointerType === 'mouse';
  if (fixed && !settings.cfg) { if (e.button === 0 || !mouse) drag = { type: 'tap', x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false }; return; }
  const camLocked = settings.cfg && !settings.free;   // mode Configurer : caméra de la vue maison fixe (la 3D libre la libère)
  if (mouse && (e.button === 1 || e.button === 2)) { if (camLocked) return; drag = { type: 'cam', x: e.clientX, y: e.clientY, pan: e.button === 1 || e.shiftKey || settings.view === '2d' }; return; }
  if (e.button !== 0) return;
  const x = e.clientX, y = e.clientY, tool = T.tool;
  drag = { type: 'none', x, y, sx: x, sy: y, moved: false };

  if (viewOnly()) { // vue publiée / aperçu : un tap commande les entités ; en 3D libre on déplace la caméra, rien d'autre
    drag = { ...drag, type: 'cam', tapc: true, pan: settings.view === '2d' || e.shiftKey };
    return;
  }
  if (tool === 'select') {
    const hnd = settings.cfg ? null : pickHandle(x, y);
    if (hnd) { const e0 = find(sel.kind, sel.id); drag = { ...drag, type: 'handle', h: hnd, kind: sel.kind, id: sel.id, linked: linkedEnds(sel.kind, e0, hnd) }; return; }
    const h = pick(x, y);
    if (h && settings.live && liveAct(h)) { drag = null; return; }
    if (h && settings.cfg && !(h.kind === 'item' && (find('item', h.id) || {}).grp)) { select(h.kind, h.id); drag = null; return; }   // mode Configurer : seuls les points lumineux se déplacent à la souris
    if (h) {
      select(h.kind, h.id); const ent = find(h.kind, h.id), g = groundPoint(x, y);
      drag = { ...drag, type: 'move', kind: h.kind, id: h.id, g0: g, orig: JSON.parse(JSON.stringify(ent)), linked: h.kind === 'wall' ? linkedEnds('wall', ent, { id: 'both' }) : null };
    } else { select(null); drag = camLocked ? null : { ...drag, type: 'cam', pan: settings.view === '2d' }; }
  } else if (tool === 'wall') {
    const g = groundPoint(x, y); if (!g) return;
    const p = snapPoint(g.x, g.z, { from: chain, ortho: settings.ortho || e.shiftKey });
    if (!chain) { chain = { x: p.x, z: p.z, x0: p.x, z0: p.z, fresh: true, n: 0 }; wallPreview(p, p); }
    drag.type = 'wall';
  } else if (tool === 'room' || tool === 'floor') {
    const g = groundPoint(x, y); if (!g) return;
    const p = { x: gsnap(g.x), z: gsnap(g.z) };
    if (!rect) rect = { a: p, b: p, fresh: true }; drag.type = 'rect';
  } else if (tool === 'door' || tool === 'window' || placing(tool) || tool === 'marker') {
    moveGhost(x, y); drag.type = 'place';
  } else if (tool === 'paint') {
    const h = pick(x, y, ['wall', 'floor']);
    if (h) paintAt(h);
    drag = null;
  } else if (tool === 'erase') {
    const h = pick(x, y); if (h && (!settings.cfg || (h.kind === 'item' && (find('item', h.id) || {}).grp))) removeEntity(h.kind, h.id);
    drag = null;
  }
}

// mode maison : un clic sur un élément lié à une entité la commande (lumière, volet) ou ouvre sa fiche
function liveAct(h) {
  if (h.kind !== 'item' && h.kind !== 'opening') return false;
  const e = find(h.kind, h.id); if (!e) return false;
  if (h.kind === 'item') { const eid = entOfItem(e); if (!eid) return false; isToggleable(eid) ? haToggle(eid) : moreInfo(eid); return true; }
  if (!e.ent && !e.ent2 && !e.shutEnt) return false;
  if (!e.ent && !e.ent2 && e.shutEnt) { haToggle(e.shutEnt); return true; }
  moreInfo(e.ent || e.ent2); return true;
}

function paintAt(h) {
  if (h.kind === 'wall') {
    const w = find('wall', h.id), i = wallInfo(w);
    if (!h.normal || Math.abs(h.normal.y) > 0.5) return;
    const face = h.normal.x * i.nx + h.normal.z * i.nz > 0 ? 'fa' : 'fb';
    w[face] = { ...D.paintWall }; rebuildStructure(); commit();
  } else if (h.kind === 'floor') {
    const f = find('floor', h.id); Object.assign(f, { mat: D.floor.mat, color: D.floor.color, scale: D.floor.scale }); rebuildFloors(); commit();
  }
}
D.paintWall = { c: '#d9c3a5', f: 'peinture' };

// extrémités de murs liées (à déplacer en même temps)
function linkedEnds(kind, e, h) {
  if (kind !== 'wall') return [];
  const pts = h.id === 'p1' ? [[e.x1, e.z1]] : h.id === 'p2' ? [[e.x2, e.z2]] : [[e.x1, e.z1], [e.x2, e.z2]];
  const out = [];
  for (const w of S.walls) {
    if (w.id === e.id) continue;
    for (const [px, pz] of pts) { if (near(w.x1, px) && near(w.z1, pz)) out.push({ id: w.id, end: 1, from: [px, pz] }); if (near(w.x2, px) && near(w.z2, pz)) out.push({ id: w.id, end: 2, from: [px, pz] }); }
  }
  return out;
}

function move(e) {
  const prev = pointers.get(e.pointerId);
  if (prev) { pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); }
  if (gesture && pointers.size === 2) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    zoom(gesture.d / Math.max(10, d)); if (settings.view === '2d') pan(cx - gesture.cx, cy - gesture.cy); else orbit(cx - gesture.cx, cy - gesture.cy);
    gesture.d = d; gesture.cx = cx; gesture.cy = cy; return;
  }
  const x = e.clientX, y = e.clientY, tool = T.tool;
  if (!drag) {
    if (viewOnly()) return;
    // simple survol
    if (placing(tool) || tool === 'door' || tool === 'window' || tool === 'marker') moveGhost(x, y);
    else if (tool === 'wall' && chain) { const g = groundPoint(x, y); if (g) { const p = snapPoint(g.x, g.z, { from: chain, ortho: settings.ortho || e.shiftKey }); chain.cur = p; wallPreview(chain, p); } }
    else if ((tool === 'room' || tool === 'floor') && rect && !rect.fresh) { const g = groundPoint(x, y); if (g) { rect.b = { x: gsnap(g.x), z: gsnap(g.z) }; rectPreview(rect.a, rect.b); } }
    else if (tool === 'wall' && !chain) { const g = groundPoint(x, y); if (g) { const p = snapPoint(g.x, g.z); wallPreview(p, p); clearLabels(); } }
    else if (tool === 'select' || tool === 'erase' || tool === 'paint') { if (e.pointerType === 'mouse') setHover(pick(x, y)); }
    return;
  }
  const dx = x - drag.x, dy = y - drag.y;
  if (!drag.moved && Math.hypot(x - drag.sx, y - drag.sy) > 4) drag.moved = true;
  if (drag.type === 'place') { moveGhost(x, y); return; }
  if (drag.type === 'cam') { if (drag.pan) pan(dx, dy); else orbit(dx, dy); drag.x = x; drag.y = y; return; }
  if (drag.type === 'wall') {
    const g = groundPoint(x, y); if (!g || !chain) return;
    const p = snapPoint(g.x, g.z, { from: chain, ortho: settings.ortho || e.shiftKey }); chain.cur = p; wallPreview(chain, p); return;
  }
  if (drag.type === 'rect') { const g = groundPoint(x, y); if (g && rect) { rect.b = { x: gsnap(g.x), z: gsnap(g.z) }; rectPreview(rect.a, rect.b); } return; }
  if (!drag.moved) return;
  if (drag.type === 'move') dragMove(x, y, e);
  else if (drag.type === 'handle') dragHandle(x, y, e);
}

function dragMove(x, y, e) {
  const { kind, id, orig } = drag, ent = find(kind, id); if (!ent) return;
  setHover(null);
  if (kind === 'item') {
    const g = groundPoint(x, y, 0); if (!g || !drag.g0) return;
    const nx = orig.x + (g.x - drag.g0.x), nz = orig.z + (g.z - drag.g0.z);
    const p = e.altKey ? { x: gsnap(nx, 0.05), z: gsnap(nz, 0.05), rot: ent.rot } : magnet(ent, nx, nz);
    ent.x = p.x; ent.z = p.z; ent.rot = p.rot; moveItemObj(ent);
  } else if (kind === 'floor') {
    const g = groundPoint(x, y); if (!g || !drag.g0) return;
    ent.x = gsnap(orig.x + g.x - drag.g0.x); ent.z = gsnap(orig.z + g.z - drag.g0.z); scheduleFloors();
  } else if (kind === 'wall') {
    const g = groundPoint(x, y); if (!g || !drag.g0) return;
    const dx = gsnap(orig.x1 + g.x - drag.g0.x) - orig.x1, dz = gsnap(orig.z1 + g.z - drag.g0.z) - orig.z1;
    ent.x1 = r2(orig.x1 + dx); ent.z1 = r2(orig.z1 + dz); ent.x2 = r2(orig.x2 + dx); ent.z2 = r2(orig.z2 + dz);
    for (const l of drag.linked) { const w = find('wall', l.id); if (l.end === 1) { w.x1 = r2(l.from[0] + dx); w.z1 = r2(l.from[1] + dz); } else { w.x2 = r2(l.from[0] + dx); w.z2 = r2(l.from[1] + dz); } }
    scheduleStructure();
  } else if (kind === 'opening') {
    const loc = locate(x, y, ent); if (!loc) return;
    if (validOpening(ent, loc.s, loc.wall)) { ent.wall = loc.wall; ent.s = loc.s; scheduleStructure(); }
  }
}
function scheduleFloors() { if (structRaf) return; structRaf = requestAnimationFrame(() => { structRaf = 0; rebuildFloors(); }); }

function dragHandle(x, y, e) {
  const ent = find(drag.kind, drag.id); if (!ent) return;
  const g = groundPoint(x, y); if (!g) return;
  if (drag.kind === 'wall') {
    const skip = [ent.id, ...drag.linked.map((l) => l.id)];
    const p = snapPoint(g.x, g.z, { skip, from: drag.h.id === 'p1' ? { x: ent.x2, z: ent.z2 } : { x: ent.x1, z: ent.z1 }, ortho: settings.ortho || e.shiftKey });
    if (drag.h.id === 'p1') { ent.x1 = p.x; ent.z1 = p.z; } else { ent.x2 = p.x; ent.z2 = p.z; }
    for (const l of drag.linked) { const w = find('wall', l.id); if (l.end === 1) { w.x1 = p.x; w.z1 = p.z; } else { w.x2 = p.x; w.z2 = p.z; } }
    scheduleStructure();
  } else if (drag.kind === 'floor') {
    const gx = gsnap(g.x), gz = gsnap(g.z), id = drag.h.id, r = ent.x + ent.w, b = ent.z + ent.d;
    if (id[1] === '0') { const nx = Math.min(gx, r - 0.4); ent.w = r - nx; ent.x = nx; } else ent.w = Math.max(0.4, gx - ent.x);
    if (id[2] === '0') { const nz = Math.min(gz, b - 0.4); ent.d = b - nz; ent.z = nz; } else ent.d = Math.max(0.4, gz - ent.z);
    scheduleFloors();
  }
}

function up(e) {
  pointers.delete(e.pointerId);
  if (gesture && pointers.size < 2) { gesture = null; drag = null; return; }
  const d = drag; drag = null;
  if (!d) return;
  const tool = T.tool, x = e.clientX, y = e.clientY;
  if (d.type === 'tap' || d.tapc) { if (!d.moved && Math.hypot(x - d.sx, y - d.sy) < 6) { const h = pick(x, y); if (h) liveAct(h); } return; }
  if (d.type === 'place') { if (d.moved || true) placeNow(tool); return; }
  if (d.type === 'wall' && chain) {
    const g = groundPoint(x, y); if (!g) return;
    const p = snapPoint(g.x, g.z, { from: chain, ortho: settings.ortho || e.shiftKey });
    const len = Math.hypot(p.x - chain.x, p.z - chain.z);
    if (len < 0.15) {
      if (chain.fresh) { chain.fresh = false; return; } // premier clic : on attend le suivant
      endChain(); return; // clic sur place = fin
    }
    addWall(chain.x, chain.z, p.x, p.z); chain.n++;
    const closed = near(p.x, chain.x0) && near(p.z, chain.z0) && chain.n > 1;
    chain.x = p.x; chain.z = p.z; chain.fresh = false; rebuildStructure(); commit();
    if (closed) endChain(); else wallPreview(chain, chain);
  } else if (d.type === 'rect' && rect) {
    const g = groundPoint(x, y); if (g) rect.b = { x: gsnap(g.x), z: gsnap(g.z) };
    const w = Math.abs(rect.b.x - rect.a.x), h = Math.abs(rect.b.z - rect.a.z);
    if (w < 0.3 && h < 0.3 && rect.fresh) { rect.fresh = false; return; } // clic simple : attendre le 2e coin
    createRoom(rect.a.x, rect.a.z, rect.b.x, rect.b.z, tool === 'room'); rect = null; clearTmp(); clearLabels();
  } else if (d.type === 'move' || d.type === 'handle') {
    if (d.moved) { commit(); emit('select'); }
  }
}

function placeNow(tool) {
  if (!ghost || !ghost.visible || !cursor.ok) return;
  if (tool === 'marker') {
    const m = { ...D.marker, id: nid(), x: cursor.x, z: cursor.z }; S.markers.push(m); commit(); if (settings.cfg) setTool('select'); select('marker', m.id); return;   // mode Configurer : la pastille posée s'ouvre pour régler son entité
  }
  if (placing(tool) && D.item) {
    const it = { ...D.item, id: nid(), x: cursor.x, z: cursor.z, rot: cursor.rot ?? D.item.rot };
    if (defOf(it.model).onTop) it.elev = supportTop(it.x, it.z, null) ?? 0;   // se pose sur le plan de travail / la table sous le curseur
    if (tool === 'light') {
      let g = find('light', LGRP.id);
      if (!g) { g = { id: nid(), name: 'Lumière ' + (S.lights.length + 1), ent: '', ic: 'mdi:ceiling-light', x: cursor.x, z: cursor.z, h: 2 }; S.lights.push(g); LGRP.id = g.id; }
      it.grp = g.id; it.ent = '';
    }
    S.items.push(it); renderItem(it); commit(); invalidate();
    if (tool === 'light') emit('state');
  } else if (tool === 'door' || tool === 'window') {
    const o = { ...D[tool], id: nid(), wall: cursor.wall, s: cursor.s, side: cursor.side };
    if (validOpening(o, o.s)) { S.openings.push(o); rebuildStructure(); commit(); }
  }
}

function dbl(e) {
  if (viewOnly()) return;
  if (T.tool === 'wall') { endChain(); return; }
  if (T.tool !== 'select') return;
  const h = pick(e.clientX, e.clientY);
  if (h && (h.kind === 'item' || h.kind === 'opening')) { select(h.kind, h.id); toggleAnim(); }
}

function key(e) {
  if (viewOnly()) return;
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') { if (e.key === 'Escape') e.target.blur(); return; }
  const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (ctrl && k === 'y') { e.preventDefault(); redo(); return; }
  if (ctrl && k === 'd') { e.preventDefault(); duplicateSelected(); return; }
  if (k === 'escape') { if (chain) endChain(); else if (rect) { rect = null; clearTmp(); clearLabels(); } else if (T.tool !== 'select') setTool('select'); else select(null); return; }
  if (k === 'delete' || k === 'backspace') { if (sel.kind && (!settings.cfg || cfgDeletable(sel.kind, sel.id))) { e.preventDefault(); removeEntity(sel.kind, sel.id); } return; }
  if (k === 'r') {
    if (placing(T.tool) && D.item) { D.item.rot = (D.item.rot + (e.shiftKey ? -90 : 90) + 360) % 360; if (ghost) ghost.rotation.y = rad(D.item.rot); cursor.rot = D.item.rot; invalidate(false); }
    else rotateSelected(e.shiftKey ? -15 : 15);
    return;
  }
  const arrows = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };
  if (arrows[k] && sel.kind) {
    const ent = find(sel.kind, sel.id), st = e.shiftKey ? 0.5 : 0.1, [ax, az] = arrows[k];
    if (sel.kind === 'item' || sel.kind === 'floor') { e.preventDefault(); ent.x = r2(ent.x + ax * st); ent.z = r2(ent.z + az * st); sel.kind === 'item' ? moveItemObj(ent) : rebuildFloors(); commit(); }
  }
  const hot = { v: 'select', w: 'wall', p: 'room', f: 'floor', b: 'paint', d: 'door', n: 'window', m: 'item', l: 'light', c: 'marker', x: 'erase' };
  if (!ctrl && hot[k] && (!settings.cfg || 'vlcx'.includes(k))) { if (hot[k] === 'light') startPlacingLight(); else setTool(hot[k]); }
  if (k === ' ' && sel.kind) { e.preventDefault(); toggleAnim(); }
}
export { updateGhost, handlesFor, defOf, floorDef, hasAnim, entityObj, updateCutaway, bounds, frameAll };
