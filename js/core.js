// Cœur : état du plan, scène three.js, rendu des entités, caméra, historique.
import * as THREE from 'three';
import { clamp, rad, disposeTree, r2 } from './util.js';
import { getTex, floorDef, finishDef, TEX_SIZE, texKey, texSize, withBump } from './textures.js';
import { wallGeometry, cutWallGeometry } from './geom.js';
import { buildOpening, modelOf, defaultOpening } from './openings.js';
import { buildItem, defOf, defaultItem } from './catalog.js';
import { applyParts, LG } from './anim.js';
import { mergeStatic } from './merge.js';
import { levelOf, stateOf, hasHA } from './ha.js';
import * as SUN from './sun.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { renderHD, hdWanted } from './post.js';

export const FLOOR_Y = 0.01;
const KEY = 'plan3d-configurateur-v1';

// ---------------------------------------------------------------------------------------------
// état (sérialisable)
// ---------------------------------------------------------------------------------------------
export const S = { walls: [], openings: [], floors: [], items: [], markers: [], lights: [], nid: 1, meta: { rot: 0, v: 2 } };
// present = affichage « vue maison » (fond transparent, barre jour/soir, boussole) ; readonly = vue publiée (aucune modification)
// vue seule (publiée ou aperçu) : rien ne s'édite ; le mode « Configurer » de la vue publiée rouvre l'édition des pastilles, lumières et liaisons
export const viewOnly = () => (settings.readonly || settings.present) && !settings.cfg;
export const settings = { wallMode: 'auto', snap: 0.1, magnet: true, view: '3d', ortho: false, camOrtho: false, live: false, present: false, readonly: false, cfg: false, free: false, hd: hdWanted(), sun: { mode: 'off', date: '', min: 720, force: null } };
export const sel = { kind: null, id: null };

const listeners = {};
export const on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
export const emit = (ev, a) => (listeners[ev] || []).forEach((f) => f(a));

export const nid = () => S.nid++;
export const find = (kind, id) => S[kind + 's'].find((e) => e.id === id);
export const sel_get = () => (sel.kind ? find(sel.kind, sel.id) : null);

// ---------------------------------------------------------------------------------------------
// historique
// ---------------------------------------------------------------------------------------------
const hist = { stack: [], i: -1 };
const snap = () => JSON.stringify({ walls: S.walls, openings: S.openings, floors: S.floors, items: S.items, markers: S.markers, lights: S.lights, meta: S.meta, nid: S.nid });
// Plan écrit à la main ou par une IA : champs manquants complétés par les valeurs par défaut, éléments inconnus ignorés, identifiants attribués
function normalize(o) {
  let nid = Math.max(o.nid || 1, 1 + Math.max(0, ...['walls', 'openings', 'floors', 'items', 'markers', 'lights'].flatMap((k) => (o[k] || []).map((e) => +e.id || 0))));
  const ensure = (e) => { if (!Number.isFinite(e.id)) e.id = nid++; return e; };
  const num = (v, d) => (Number.isFinite(+v) && v !== null && v !== '' ? +v : d);
  const face = (f) => ({ c: '#f2efe9', f: 'peinture', ...(f || {}) });
  o.walls = (o.walls || []).filter((w) => [w.x1, w.z1, w.x2, w.z2].every((v) => Number.isFinite(+v))).map((w) => ensure({ ...w, t: num(w.t, 0.2), h: num(w.h, 2.5), fa: face(w.fa), fb: face(w.fb) }));
  const wallIds = new Set(o.walls.map((w) => w.id));
  o.openings = (o.openings || []).filter((x) => wallIds.has(x.wall)).map((x) => {
    const kind = x.kind === 'door' ? 'door' : 'window'; let base; try { base = defaultOpening(kind, x.model); } catch (e) { base = defaultOpening(kind, kind === 'door' ? 'battant' : 'battant2'); }
    return ensure({ ...base, ...x, kind, model: base.model, w: num(x.w, base.w), h: num(x.h, base.h), y0: num(x.y0, base.y0), s: num(x.s, 1) });
  });
  o.floors = (o.floors || []).filter((f) => num(f.w, 0) > 0 && num(f.d, 0) > 0).map((f) => ensure({ mat: 'parquet', ...f, scale: Math.min(2.5, Math.max(0.4, num(f.scale, 1))), color: f.color || floorDef(f.mat).color }));
  o.items = (o.items || []).filter((i) => defOf(i.model)).map((i) => ensure({ ...defaultItem(i.model), ...i, x: num(i.x, 0), z: num(i.z, 0), rot: num(i.rot, 0) }));
  o.markers = (o.markers || []).map((m) => ensure({ ent: '', ic: 'mdi:gesture-tap', h: 2, title: '', action: 'auto', ...m, x: num(m.x, 0), z: num(m.z, 0) }));
  o.lights = (o.lights || []).map((l) => ensure({ name: 'Lumière', ent: '', ic: 'mdi:ceiling-light', h: 2, ...l, x: num(l.x, 0), z: num(l.z, 0) }));
  o.meta = { rot: 0, v: 2, ...(o.meta || {}) }; o.nid = nid;
  return o;
}
function restore(json) {
  const o = normalize(JSON.parse(json));
  S.walls = o.walls || []; S.openings = o.openings || []; S.floors = o.floors || []; S.items = o.items || []; S.markers = o.markers || []; S.lights = o.lights || []; S.meta = o.meta || { rot: 0 }; S.nid = o.nid || 1;
}
export function commit(save = true) {
  const j = snap();
  if (hist.stack[hist.i] === j) return;
  hist.stack = hist.stack.slice(0, hist.i + 1); hist.stack.push(j);
  if (hist.stack.length > 80) hist.stack.shift();
  hist.i = hist.stack.length - 1;
  if (save && !settings.readonly) { try { localStorage.setItem(KEY, j); } catch (e) { /* stockage indisponible */ } emit('persist', j); }
  emit('history'); emit('state');
}
export function undo() { if (hist.i > 0) { hist.i--; restore(hist.stack[hist.i]); afterRestore(); } }
export function redo() { if (hist.i < hist.stack.length - 1) { hist.i++; restore(hist.stack[hist.i]); afterRestore(); } }
export const canUndo = () => hist.i > 0;
export const canRedo = () => hist.i < hist.stack.length - 1;
function afterRestore() {
  if (sel.kind && !find(sel.kind, sel.id)) select(null);
  rebuildAll(); if (!settings.readonly) { try { localStorage.setItem(KEY, snap()); } catch (e) { /* ignore */ } }   // la vue publiée n'écrase jamais la sauvegarde locale de l'éditeur
  emit('history'); emit('state'); emit('select');
}
export function load(json, fresh = true) {
  restore(typeof json === 'string' ? json : JSON.stringify(json));
  S.items.forEach((i) => { if (!defOf(i.model)) S.items.splice(S.items.indexOf(i), 1); });
  if (fresh) { hist.stack = []; hist.i = -1; }
  select(null); rebuildAll(); commit(); emit('select'); frameAll();
}
export function loadSaved() { try { const j = localStorage.getItem(KEY); if (j) { load(j); return true; } } catch (e) { /* ignore */ } return false; }
export function exportJSON() { return JSON.stringify({ app: 'plan3d-configurateur', v: 1, ...JSON.parse(snap()) }, null, 1); }
export function reset() { S.walls = []; S.openings = []; S.floors = []; S.items = []; S.markers = []; S.lights = []; S.meta = { rot: 0, v: 2 }; S.nid = 1; load(snap()); }

export function select(kind, id) {
  sel.kind = kind || null; sel.id = kind ? id : null;
  drawSelection(); emit('select'); invalidate(false);   // le contour de sélection ne projette pas d'ombre
}

// ---------------------------------------------------------------------------------------------
// scène
// ---------------------------------------------------------------------------------------------
export const R = {};
const root = {}; // groupes par type
const objs = { wall: new Map(), opening: new Map(), floor: new Map(), item: new Map() };
const anims = new Map(); // clé -> { parts, cur, tg }
let dirty = true, shadowDirty = true, animating = false;
// shadow = false : changement qui ne touche ni la géométrie ni les lumières (caméra, survol…) → les ombres ne sont pas recalculées
export const invalidate = (shadow = true) => { dirty = true; if (shadow) shadowDirty = true; };

export function initScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });   // pas de preserveDrawingBuffer : la capture lit l'image juste après l'avoir dessinée
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false; // recalculées à la demande (invalidate)
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.9;   // rendu « Khronos PBR Neutral » : couleurs fidèles, plus naturelles que ACES renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#dde6ee');
  const persp = new THREE.PerspectiveCamera(40, 1, 0.1, 400), ortho = new THREE.OrthographicCamera(-10, 10, 10, -10, -100, 200);
  Object.assign(R, { renderer, scene, persp, ortho, canvas, cam: persp });

  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55; // reflets des métaux (inox, miroir)
  const hemi = new THREE.HemisphereLight('#ffffff', '#b8c0c8', 0.95); scene.add(hemi); R.hemi = hemi;
  const sun = new THREE.DirectionalLight('#fffaf3', 2.4); sun.position.set(8, 16, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target); R.sun = sun; shadowRes();

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#e7ecef', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground); R.ground = ground;
  const grid = new THREE.GridHelper(80, 80, 0xb5c0c8, 0xcdd5db); grid.position.y = 0.002; grid.material.transparent = true; grid.material.opacity = 0.9; scene.add(grid); R.grid = grid;
  const grid5 = new THREE.GridHelper(80, 16, 0x9aa8b2, 0x9aa8b2); grid5.position.y = 0.003; scene.add(grid5); R.grid5 = grid5;

  for (const k of ['wall', 'opening', 'floor', 'item', 'plot']) { root[k] = new THREE.Group(); scene.add(root[k]); }
  root.ui = new THREE.Group(); scene.add(root.ui); R.ui = root.ui;
  root.sel = new THREE.Group(); root.ui.add(root.sel);
  root.handles = new THREE.Group(); root.ui.add(root.handles); R.handles = root.handles;
  root.ghost = new THREE.Group(); root.ui.add(root.ghost); R.ghost = root.ghost;
  root.tmp = new THREE.Group(); root.ui.add(root.tmp); R.tmp = root.tmp;

  new ResizeObserver(resize).observe(canvas.parentElement);
  resize();
  requestAnimationFrame(loop);
}

function resize() {
  const p = R.canvas.parentElement, w = Math.max(50, p.clientWidth), h = Math.max(50, p.clientHeight);
  if (w === R.w && h === R.h) return;   // l'observateur se déclenche aussi au démarrage, juste après l'appel direct
  R.renderer.setSize(w, h, false); R.canvas.style.width = w + 'px'; R.canvas.style.height = h + 'px';
  R.w = w; R.h = h; if (settings.present && !settings.free) fitView(); else setupCam(); invalidate(false);
}

// ---------------------------------------------------------------------------------------------
// caméra orbitale (3D, perspective ou orthographique) / plan (2D orthographique)
// ---------------------------------------------------------------------------------------------
export const V = { tx: 6, tz: 4, dist: 16, az: 0.6, pol: 0.95, size: 8 };
const camDir = () => new THREE.Vector3(Math.sin(V.pol) * Math.sin(V.az), Math.cos(V.pol), Math.sin(V.pol) * Math.cos(V.az));
export const isOrtho = () => settings.view === '2d' || settings.camOrtho;
// vue maison fixe : projection oblique (x' = x + k·hauteur), les murs laissent voir leurs faces sans perdre le plan au sol
const SHEAR = 0.18;
const shearNow = () => (settings.present && !settings.free && settings.camOrtho && settings.view === '3d' ? (S.meta && S.meta.view && S.meta.view.sh != null ? S.meta.view.sh : SHEAR) : 0);
export function setupCam() {
  const aspect = R.w / R.h;
  if (settings.view === '2d') {
    const c = R.ortho; c.left = -V.size * aspect; c.right = V.size * aspect; c.top = V.size; c.bottom = -V.size; c.near = -100; c.far = 200;
    c.position.set(V.tx, 60, V.tz); c.up.set(0, 0, -1); c.lookAt(V.tx, 0, V.tz); c.updateProjectionMatrix(); c.updateMatrixWorld(); R.cam = c;
  } else if (settings.camOrtho) {
    const c = R.ortho; c.left = -V.size * aspect; c.right = V.size * aspect; c.top = V.size; c.bottom = -V.size; c.near = 1; c.far = 400;
    c.position.set(V.tx, 0, V.tz).addScaledVector(camDir(), 100); c.up.set(0, 1, 0); c.lookAt(V.tx, 0, V.tz); c.updateProjectionMatrix();
    const sh = shearNow();
    if (sh) { c.projectionMatrix.multiply(new THREE.Matrix4().set(1, sh * Math.sin(V.pol), sh * Math.cos(V.pol), sh * c.position.y, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)); c.projectionMatrixInverse.copy(c.projectionMatrix).invert(); }
    c.updateMatrixWorld(); R.cam = c;
  } else {
    const c = R.persp; c.aspect = aspect; c.fov = 40;
    c.position.set(V.tx + V.dist * Math.sin(V.pol) * Math.sin(V.az), V.dist * Math.cos(V.pol), V.tz + V.dist * Math.sin(V.pol) * Math.cos(V.az));
    c.up.set(0, 1, 0); c.lookAt(V.tx, 0, V.tz); c.updateProjectionMatrix(); c.updateMatrixWorld(); R.cam = c;
  }
  updateCutaway(); invalidate(false);
}
export function setView(v) { settings.view = v; if (R.sun) R.sun.castShadow = v === '3d'; topMat.color.set(v === '2d' ? '#46505a' : '#d9d4cb'); setupCam(); emit('view'); invalidate(); }
export function frameAll() {
  if (settings.present && !settings.free) { fitView(); return; }
  const b = bounds();
  if (!b) { V.tx = 6; V.tz = 4; V.dist = 14; V.size = 7; } else {
    V.tx = (b.minx + b.maxx) / 2; V.tz = (b.minz + b.maxz) / 2;
    const ext = Math.max(b.maxx - b.minx, b.maxz - b.minz, 4); V.dist = ext * 1.35 + 3; V.size = ext * 0.62 + 1;
  }
  setupCam();
}
export function bounds() {
  let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9, any = false;
  const add = (x, z) => { any = true; minx = Math.min(minx, x); maxx = Math.max(maxx, x); minz = Math.min(minz, z); maxz = Math.max(maxz, z); };
  S.walls.forEach((w) => { add(w.x1, w.z1); add(w.x2, w.z2); });
  S.floors.forEach((f) => { add(f.x, f.z); add(f.x + f.w, f.z + f.d); });
  S.items.forEach((i) => add(i.x, i.z));
  S.markers.forEach((m) => add(m.x, m.z));
  S.lights.forEach((l) => add(l.x, l.z));
  return any ? { minx, maxx, minz, maxz } : null;
}
// emprise de la construction (murs et sols seulement) : sert au terrain et au cadrage de la vue maison
export function structBounds() {
  let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9, any = false;
  const add = (x, z) => { any = true; minx = Math.min(minx, x); maxx = Math.max(maxx, x); minz = Math.min(minz, z); maxz = Math.max(maxz, z); };
  S.walls.forEach((w) => { add(w.x1, w.z1); add(w.x2, w.z2); });
  S.floors.forEach((f) => { add(f.x, f.z); add(f.x + f.w, f.z + f.d); });
  return any ? { minx, maxx, minz, maxz } : null;
}
export function plotRect() {
  const m = S.meta.plot; if (!m) return null;
  if (typeof m === 'object' && m.x0 != null) return { x0: m.x0, x1: m.x1, z0: m.z0, z1: m.z1 };
  const b = structBounds(); if (!b) return null;
  const pad = typeof m === 'object' && m.pad != null ? m.pad : 0.9;
  return { x0: b.minx - pad, x1: b.maxx + pad, z0: b.minz - pad, z1: b.maxz + pad };
}

// boîte englobante du terrain (ou de la construction) projetée dans le plan de la caméra
function projBox() {
  const pr = plotRect(), sb = structBounds();
  const b = pr ? { minx: pr.x0, maxx: pr.x1, minz: pr.z0, maxz: pr.z1 } : sb ? { minx: sb.minx - 0.6, maxx: sb.maxx + 0.6, minz: sb.minz - 0.6, maxz: sb.maxz + 0.6 } : null;
  if (!b) return null;
  const hMax = S.walls.reduce((m, w) => Math.max(m, w.h), 2.4), y0 = pr ? -0.46 : 0;
  const dir = camDir(), r = new THREE.Vector3(0, 1, 0).cross(dir).normalize(), u = dir.clone().cross(r).normalize();
  let amin = 1e9, amax = -1e9, bmin = 1e9, bmax = -1e9;
  const sh = settings.present && !settings.free && settings.camOrtho ? SHEAR : 0;
  for (const x of [b.minx, b.maxx]) for (const z of [b.minz, b.maxz]) for (const y of [y0, hMax]) {
    const a = x * r.x + y * r.y + z * r.z + sh * y, c = x * u.x + y * u.y + z * u.z;
    amin = Math.min(amin, a); amax = Math.max(amax, a); bmin = Math.min(bmin, c); bmax = Math.max(bmax, c);
  }
  return { r, u, amin, amax, bmin, bmax };
}
// vue « maison » : caméra orthographique cadrée sur tout le terrain, centrée dans la fenêtre ; renvoie le rapport hauteur / largeur
// vue maison en perspective (angle de l'éditeur repris tel quel) : distance et centre choisis pour que le terrain tienne dans la fenêtre
function fitPersp(pad = 0.04) {
  const pr = plotRect(), sb = structBounds();
  const b = pr ? { minx: pr.x0, maxx: pr.x1, minz: pr.z0, maxz: pr.z1 } : sb ? { minx: sb.minx - 0.6, maxx: sb.maxx + 0.6, minz: sb.minz - 0.6, maxz: sb.maxz + 0.6 } : null;
  if (!b || !R.w) return null;
  const hMax = S.walls.reduce((m, w) => Math.max(m, w.h), 2.4), y0 = pr ? -0.46 : 0, aspect = R.w / R.h;
  const c = R.persp; c.aspect = aspect; c.fov = 40; c.up.set(0, 1, 0);
  const pts = []; for (const x of [b.minx, b.maxx]) for (const z of [b.minz, b.maxz]) for (const y of [y0, hMax]) pts.push(new THREE.Vector3(x, y, z));
  V.tx = (b.minx + b.maxx) / 2; V.tz = (b.minz + b.maxz) / 2;
  const th = Math.tan((c.fov * Math.PI) / 360), sp = Math.sin(V.pol), cp = Math.cos(V.pol);
  const ext = (dist) => {
    c.position.set(V.tx + dist * sp * Math.sin(V.az), dist * cp, V.tz + dist * sp * Math.cos(V.az));
    c.lookAt(V.tx, 0, V.tz); c.updateProjectionMatrix(); c.updateMatrixWorld(true);
    let x0 = 1e9, x1 = -1e9, y1 = -1e9, y0n = 1e9;
    for (const p of pts) { const q = p.clone().project(c); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0n = Math.min(y0n, q.y); y1 = Math.max(y1, q.y); }
    return { x0, x1, y0: y0n, y1 };
  };
  let dist = 30;
  for (let it = 0; it < 8; it++) {
    let lo = 4, hi = 400;
    for (let k = 0; k < 28; k++) { dist = (lo + hi) / 2; const e = ext(dist); if (Math.max(Math.abs(e.x0), Math.abs(e.x1), Math.abs(e.y0), Math.abs(e.y1)) > 1 - pad) lo = dist; else hi = dist; }
    dist = hi;
    const e = ext(dist), cx = (e.x0 + e.x1) / 2, cy = (e.y0 + e.y1) / 2;   // recentrage : décalage du centre sur le sol
    const wx = cx * dist * th * aspect, wy = (cy * dist * th) / Math.max(0.2, cp);
    V.tx += wx * Math.cos(V.az) - wy * Math.sin(V.az); V.tz += -wx * Math.sin(V.az) - wy * Math.cos(V.az);
  }
  V.dist = dist; setupCam();
  const e = ext(dist); return (e.y1 - e.y0) / ((e.x1 - e.x0) * aspect);
}
export function fitView(pad = 0.035) {
  if (!settings.camOrtho && settings.present && settings.view === '3d' && !settings.free) return fitPersp();
  const p = projBox(); if (!p || !R.w) return null;
  const { r, u } = p, ac = (p.amin + p.amax) / 2, bc = (p.bmin + p.bmax) / 2, det = r.x * u.z - r.z * u.x;
  if (Math.abs(det) > 1e-6) { V.tx = (ac * u.z - r.z * bc) / det; V.tz = (r.x * bc - u.x * ac) / det; }
  const hw = (p.amax - p.amin) / 2, hh = (p.bmax - p.bmin) / 2, aspect = R.w / R.h;
  V.size = Math.max(hh, hw / aspect) * (1 + pad);
  setupCam();
  return hh / hw;
}
// rapport hauteur / largeur de la vue maison (la carte Home Assistant s'en sert pour choisir sa hauteur)
export function viewAspect() {
  const keep = { az: V.az, pol: V.pol }, h = homeView(); V.az = h.az; V.pol = h.pol;
  const p = projBox(); V.az = keep.az; V.pol = keep.pol;
  return p ? (p.bmax - p.bmin) / (p.amax - p.amin) : 0.75;
}
// angle de départ de la vue maison (mémorisé dans le plan à la publication)
export function homeView() { const v = S.meta.view || {}; return { az: v.az != null ? v.az : Math.PI, pol: v.pol != null ? v.pol : 0.42 }; }
export function resetView() { const h = homeView(); V.az = h.az; V.pol = h.pol; settings.free = false; fitView(); emit('free'); }
export function setFree(on) {
  settings.free = !!on;
  if (!on) resetView(); else { setupCam(); emit('free'); }
}
// rayon écran -> sol
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _ndc = new THREE.Vector2();
export function setRay(cx, cy) {
  const r = R.canvas.getBoundingClientRect();
  _ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  if (R.cam.isOrthographicCamera) { // la projection peut être oblique : on remonte deux points du rayon
    const a = _a.set(_ndc.x, _ndc.y, -1).unproject(R.cam), b = _b.set(_ndc.x, _ndc.y, 1).unproject(R.cam);
    ray.ray.origin.copy(a); ray.ray.direction.copy(b).sub(a).normalize(); ray.camera = R.cam;
  } else ray.setFromCamera(_ndc, R.cam);
  return ray;
}
export function groundPoint(cx, cy, y = 0) {
  setRay(cx, cy); plane.constant = -y;
  return ray.ray.intersectPlane(plane, _v) ? { x: _v.x, z: _v.z } : null;
}
export function project(x, y, z) {
  const v = new THREE.Vector3(x, y, z).project(R.cam); const r = R.canvas.getBoundingClientRect();
  return { x: ((v.x + 1) / 2) * r.width, y: ((1 - v.y) / 2) * r.height, vis: v.z < 1 };
}

// ---------------------------------------------------------------------------------------------
// matériaux de murs / sols
// ---------------------------------------------------------------------------------------------
const matCache = new Map();
export function surfMat(texKey, color, rough = 0.9) {
  const k = texKey + '|' + color;
  if (!matCache.has(k)) {
    const m = withBump(new THREE.MeshStandardMaterial({ color, roughness: rough, map: getTex(texKey) }), texKey);
    m.userData.shared = true; matCache.set(k, m);
  }
  return matCache.get(k);
}
const topMat = (() => { const m = new THREE.MeshStandardMaterial({ color: '#d9d4cb', roughness: 0.9 }); m.userData.shared = true; return m; })();

// ---------------------------------------------------------------------------------------------
// rendu des entités
// ---------------------------------------------------------------------------------------------
export function wallInfo(w) {
  const dx = w.x2 - w.x1, dz = w.z2 - w.z1, L = Math.hypot(dx, dz) || 0.001, ang = Math.atan2(dz, dx);
  return { L, ang, ux: dx / L, uz: dz / L, nx: -dz / L, nz: dx / L };
}
// raccord d'une extrémité de mur sur un autre mur (angle ou T) : le mur est prolongé (ou raccourci) pour finir exactement sur la face
// opposée de l'autre mur, quelle que soit la position du point (sur l'axe, sur une face, ou un peu au-delà) → jamais de dépassement
function extension(w, end) {
  const i = wallInfo(w), px = end ? w.x2 : w.x1, pz = end ? w.z2 : w.z1, dir = end ? 1 : -1, ox = dir * i.ux, oz = dir * i.uz;
  let best = null, bd = Infinity;
  for (const o of S.walls) {
    if (o === w) continue;
    const oi = wallInfo(o), cos = ox * oi.nx + oz * oi.nz; if (Math.abs(cos) < 0.2) continue;   // murs (presque) parallèles : pas de raccord
    const t = (px - o.x1) * oi.ux + (pz - o.z1) * oi.uz, d = (px - o.x1) * oi.nx + (pz - o.z1) * oi.nz;
    if (Math.abs(d) <= o.t / 2 + 0.03 && t >= -o.t / 2 - 0.03 && t <= oi.L + o.t / 2 + 0.03 && Math.abs(d) < bd) { bd = Math.abs(d); best = { o, d, cos }; }
  }
  if (!best) return 0;
  const { o, d, cos } = best, ext = ((Math.sign(cos) * o.t) / 2 - d) / cos;
  return Math.max(-o.t, Math.min(o.t / Math.abs(cos) + 0.05, ext)) - 0.0008;
}
// repère monde d'un point le long du mur
export function wallPoint(w, s) { const i = wallInfo(w); return { x: w.x1 + i.ux * s, z: w.z1 + i.uz * s }; }

function disposeEntity(map, id) {
  const o = map.get(id); if (!o) return; o.parent?.remove(o); disposeTree(o); map.delete(id);
}
function clearKind(kind) { for (const id of [...objs[kind].keys()]) disposeEntity(objs[kind], id); }

function tagRef(o, kind, id) { o.traverse((c) => { c.userData.ref = { kind, id }; }); }

// ---- vue « maquette » : tous les murs coupés à hauteur d'appui, dessus de coupe sombre (rendu de plan 3D d'architecte) ----
export const CUT_H = 1.1;
const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), CUT_H), hidePlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), -1000);
export const isCut = () => settings.view === '3d' && settings.wallMode === 'coupe';
let wallsCut = false, cutApplied = null;
// portes, fenêtres et éléments surélevés (plafonniers, appliques, meubles hauts muraux) coupés au même plan ; leur lumière reste allumée
// plane : plan de coupe (portes, fenêtres) ou plan qui masque tout (éléments fixés au mur au-dessus de l'appui : TV murale, meubles hauts, appliques, plafonniers)
function clipTree(g, plane) {
  g.userData.cut = !!plane;
  g.traverse((o) => { for (const m of [].concat(o.material || [])) { const cur = m.clippingPlanes && m.clippingPlanes[0]; if (cur !== plane && (cur || plane)) { m.clippingPlanes = plane ? [plane] : null; m.clipShadows = !!plane; m.needsUpdate = true; } } });
}
const cutItem = (it) => { const d = defOf(it.model); return (it.elev || 0) >= 0.3 && !(d && d.onTop); };
function applyCut(force = false) {
  const on = isCut(); if (!force && cutApplied === on) return; cutApplied = on;
  R.renderer.localClippingEnabled = true;
  for (const g of objs.opening.values()) clipTree(g, on ? cutPlane : null);
  for (const [id, g] of objs.item) { const it = find('item', id); clipTree(g, on && it && cutItem(it) ? hidePlane : null); }
  invalidate();
}

export function renderWalls() {
  clearKind('wall'); wallsCut = isCut();
  for (const w of S.walls) {
    const { L, ang } = wallInfo(w), fa = finishDef(w.fa.f), fb = finishDef(w.fb.f);
    const holes = S.openings.filter((o) => o.wall === w.id).map((o) => {
      const x0 = o.s - o.w / 2, y0 = o.kind === 'door' ? Math.max(0.002, o.y0) : o.y0;
      return { x0, x1: o.s + o.w / 2, y0, y1: y0 + o.h, round: !!modelOf(o).round };
    });
    const ea = extension(w, false), eb = extension(w, true);
    const geo = (wallsCut && w.h > CUT_H && cutWallGeometry(L, CUT_H, w.t, holes, ea, eb, fa.tex, fb.tex)) || wallGeometry(L, w.h, w.t, holes, ea, eb, fa.tex, fb.tex);
    const mesh = new THREE.Mesh(geo, [surfMat(fa.tex, w.fa.c), surfMat(fb.tex, w.fb.c), topMat]);
    mesh.castShadow = mesh.receiveShadow = true;
    const g = new THREE.Group(); g.position.set(w.x1, 0, w.z1); g.rotation.y = -ang; g.add(mesh);
    g.userData.wall = w.id; g.userData.mesh = mesh; tagRef(g, 'wall', w.id);
    const ao = aoStrips(w, L); if (ao) { g.add(ao); g.userData.ao = ao; }
    const pl = plinths(w, L, fa, fb); if (pl) g.add(pl);
    root.wall.add(g); objs.wall.set(w.id, g);
  }
}
// ombre de contact (occlusion ambiante peinte) de chaque côté du pied de mur, interrompue devant les portes
const aoMat = (() => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 64; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.42)'); g.addColorStop(0.35, 'rgba(0,0,0,0.14)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 4, 64);
  const m = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide });
  m.userData.shared = true; return m;
})();
function aoStrips(w, L) {
  const gaps = S.openings.filter((o) => o.wall === w.id && (o.kind === 'door' || o.y0 < 0.06)).map((o) => [o.s - o.w / 2, o.s + o.w / 2]).sort((a, b) => a[0] - b[0]);
  const segs = []; let a = 0;
  for (const [g0, g1] of gaps) { if (g0 > a + 0.05) segs.push([a, g0]); a = Math.max(a, g1); }
  if (L > a + 0.05) segs.push([a, L]);
  const pos = [], uv = [], idx = [], wd = 0.32, y = 0.03;
  for (const [x0, x1] of segs) for (const side of [1, -1]) {
    const z0 = side * w.t / 2, z1 = side * (w.t / 2 + wd), n = pos.length / 3;
    pos.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1); uv.push(0, 1, 1, 1, 1, 0, 0, 0); idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
  }
  if (!pos.length) return null;
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, aoMat); m.renderOrder = 1; return m;
}

// plinthes blanches au pied des faces intérieures (peinture, lambris, faïence…), interrompues devant les portes
const EXT_FIN = new Set(['crepi', 'pierre', 'brique']);
const plinthMat = (() => { const m = new THREE.MeshStandardMaterial({ color: '#f4f2ee', roughness: 0.45 }); m.userData.shared = true; return m; })();
function plinths(w, L, fa, fb) {
  const gaps = S.openings.filter((o) => o.wall === w.id && (o.kind === 'door' || o.y0 < 0.06)).map((o) => [o.s - o.w / 2, o.s + o.w / 2]).sort((a, b) => a[0] - b[0]);
  const x0 = -extension(w, false), x1 = L + extension(w, true), segs = []; let a = x0;
  for (const [g0, g1] of gaps) { if (g0 > a + 0.03) segs.push([a, g0]); a = Math.max(a, g1); }
  if (x1 > a + 0.03) segs.push([a, x1]);
  const geos = [], H = 0.07, T = 0.012;
  for (const [side, fin] of [[1, fa], [-1, fb]]) {
    if (EXT_FIN.has(fin.id)) continue;
    for (const [s0, s1] of segs) { const g = new THREE.BoxGeometry(s1 - s0, H, T); g.translate((s0 + s1) / 2, H / 2, side * (w.t / 2 + T / 2)); geos.push(g); }
  }
  if (!geos.length) return null;
  const m = new THREE.Mesh(mergeGeos(geos), plinthMat); m.castShadow = false; m.receiveShadow = true; return m;
}
function mergeGeos(geos) {   // boîtes simples → une seule géométrie (positions, normales, uv, index)
  const P = [], N = [], U = [], I = []; let off = 0;
  for (const g of geos) { P.push(...g.attributes.position.array); N.push(...g.attributes.normal.array); U.push(...g.attributes.uv.array); for (const i of g.index.array) I.push(i + off); off += g.attributes.position.count; g.dispose(); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); out.setIndex(I); return out;
}

// terrain : dalle de gravier avec ses flancs de terre (mode « diorama » de la vue maison)
const soilMat = (() => { const m = new THREE.MeshStandardMaterial({ color: '#5b4a3a', roughness: 1 }); m.userData.shared = true; return m; })();
export function renderPlot() {
  for (const c of [...root.plot.children]) { root.plot.remove(c); disposeTree(c); }
  const pr = plotRect();
  if (R.ground) R.ground.position.y = pr ? -0.47 : 0;
  if (!pr) { invalidate(); return; }
  const w = pr.x1 - pr.x0, d = pr.z1 - pr.z0, cx = (pr.x0 + pr.x1) / 2, cz = (pr.z0 + pr.z1) / 2, col = (S.meta.plot && S.meta.plot.color) || '#a39e7c';
  const geo = new THREE.PlaneGeometry(w, d); geo.rotateX(-Math.PI / 2);
  const uv = geo.attributes.uv, pos = geo.attributes.position, sz = TEX_SIZE.gravel;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / sz[0], (pos.getZ(i) + d / 2) / sz[1]);
  const top = new THREE.Mesh(geo, surfMat('gravel', col, 1)); top.position.set(cx, -0.01, cz); top.receiveShadow = true;
  const side = new THREE.Mesh(new THREE.BoxGeometry(w, 0.45, d), soilMat); side.position.set(cx, -0.01 - 0.225 - 0.002, cz); side.receiveShadow = true;
  root.plot.add(top, side); invalidate();
}
// clé de construction : ce qui change la forme d'un objet (pas sa position ni son état d'ouverture) → on ne reconstruit que si elle change
const built = new Map();
const keyOf = (o, omit) => JSON.stringify(o, (k, v) => (omit.has(k) ? undefined : v));
const OMIT_O = new Set(['s', 'open', 'open2', 'shut', 'ent', 'ent2', 'shutEnt']);
const OMIT_I = new Set(['x', 'z', 'rot', 'elev', 'open', 'ent', 'visEnt']);
const retarget = (key, v) => { const a = anims.get(key); if (a && !a.live) a.tg = v || 0; };   // objet conservé : reprendre l'état d'ouverture enregistré (annuler / rétablir)
function placeOpening(g, o, w) { const { ang } = wallInfo(w), p = wallPoint(w, o.s); g.position.set(p.x, o.y0, p.z); g.rotation.y = -ang; }
export function renderOpenings() {
  const keep = new Set();
  for (const o of S.openings) {
    const w = find('wall', o.wall); if (!w) continue;
    const k = keyOf(o, OMIT_O) + '|' + w.t, old = objs.opening.get(o.id);
    keep.add(o.id);
    if (old && built.get('o' + o.id) === k) { placeOpening(old, o, w); retarget('o' + o.id, o.open); retarget('p' + o.id, o.open2); retarget('s' + o.id, o.shut); continue; }
    disposeEntity(objs.opening, o.id);
    const b = buildOpening(o, w.t); mergeStatic(b.group, b.parts, b.shutParts);
    const g = new THREE.Group(); g.add(b.group); placeOpening(g, o, w);
    tagRef(g, 'opening', o.id); root.opening.add(g); objs.opening.set(o.id, g); built.set('o' + o.id, k);
    if (cutApplied) clipTree(g, cutPlane);
    regAnim('o' + o.id, b.parts.filter((p) => !p.grp), o.open); regAnim('p' + o.id, b.parts.filter((p) => p.grp), o.open2);
    regAnim('s' + o.id, b.shutParts, o.shut);
  }
  for (const id of [...objs.opening.keys()]) if (!keep.has(id)) { disposeEntity(objs.opening, id); built.delete('o' + id); for (const p of 'ops') anims.delete(p + id); }
}
export function renderFloors() {
  clearKind('floor');
  S.floors.forEach((f, idx) => {
    const fd = floorDef(f.mat), key = texKey(fd.tex, f.pose), size = texSize(key), sc = f.scale || 1;
    const a = ((f.sens || 0) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);   // sens de pose : 0°, 90° ou 45° (diagonale)
    const geo = new THREE.PlaneGeometry(f.w, f.d); geo.rotateX(-Math.PI / 2);
    const uv = geo.attributes.uv, pos = geo.attributes.position;
    // motif ancré sur l'origine de la maison (et non sur le coin du sol) : deux sols voisins de même matière se raccordent sans décalage
    for (let i = 0; i < uv.count; i++) {
      const wx = f.x + f.w / 2 + pos.getX(i), wz = f.z + f.d / 2 + pos.getZ(i);
      uv.setXY(i, (wx * ca + wz * sa) / (size[0] * sc), (-wx * sa + wz * ca) / (size[1] * sc));
    }
    const m = new THREE.Mesh(geo, surfMat(key, f.color, fd.tex === 'marble' || fd.id === 'uni' ? 0.35 : 0.7));
    m.receiveShadow = true; m.position.set(f.x + f.w / 2, FLOOR_Y + Math.min(idx, 40) * 0.0004, f.z + f.d / 2);
    const g = new THREE.Group(); g.add(m); tagRef(g, 'floor', f.id); root.floor.add(g); objs.floor.set(f.id, g);
  });
}
export function renderItem(it) {
  disposeEntity(objs.item, it.id);
  const b = buildItem(it), g = new THREE.Group(); mergeStatic(b.group, b.parts); g.add(b.group);
  g.position.set(it.x, FLOOR_Y + (it.elev || 0), it.z); g.rotation.y = rad(it.rot || 0);
  tagRef(g, 'item', it.id); g.visible = itemVisible(it); root.item.add(g); objs.item.set(it.id, g); built.set('i' + it.id, keyOf(it, OMIT_I));
  if (cutApplied && cutItem(it)) clipTree(g, hidePlane);
  regAnim('i' + it.id, b.parts, it.open);
}
export function renderItems() {
  const keep = new Set();
  for (const it of S.items) {
    const g = objs.item.get(it.id); keep.add(it.id);
    if (g && built.get('i' + it.id) === keyOf(it, OMIT_I)) { g.position.set(it.x, FLOOR_Y + (it.elev || 0), it.z); g.rotation.y = rad(it.rot || 0); g.visible = itemVisible(it); retarget('i' + it.id, it.open); continue; }
    renderItem(it);
  }
  dropItemObjs([...objs.item.keys()].filter((id) => !keep.has(id)));
}
// retire de la scène les meubles supprimés (sans reconstruire le reste)
export function dropItemObjs(ids) { for (const id of ids) { disposeEntity(objs.item, id); built.delete('i' + id); anims.delete('i' + id); } drawSelection(); invalidate(); }

function regAnim(key, parts, target) {
  const old = anims.get(key), cur = old ? old.cur : target || 0;
  anims.set(key, { parts, cur, tg: old && old.live ? old.tg : target || 0, live: old ? old.live : false });
  applyParts(parts, cur);
}
export function setOpen(kind, id, v) {
  const e = find(kind, id); if (!e) return;
  if (kind === 'opening' || kind === 'item') e.open = v;
  const a = anims.get((kind === 'opening' ? 'o' : 'i') + id); if (a && !a.live) a.tg = v;
  const b = anims.get('p' + id); if (kind === 'opening' && b && !b.live) { e.open2 = v; b.tg = v; }
  invalidate();
}
export function setShut(id, v) { const e = find('opening', id); if (!e) return; e.shut = v; const a = anims.get('s' + id); if (a && !a.live) a.tg = v; invalidate(); }
export const hasAnim = (kind, id) => { const a = anims.get((kind === 'opening' ? 'o' : 'i') + id); const b = kind === 'opening' && anims.get('p' + id); return !!((a && a.parts.length) || (b && b.parts.length)); };
export const hasShutter = (id) => { const a = anims.get('s' + id); return !!(a && a.parts.length); };

// ---------------------------------------------------------------------------------------------
// mode maison : les éléments liés à une entité Home Assistant suivent son état en direct
// ---------------------------------------------------------------------------------------------
export const entOfItem = (i) => ((i.grp ? (find('light', i.grp) || {}).ent : i.ent) || '').trim();
export const visWant = (i) => (i.visState || (/^(person|device_tracker)\./.test(i.visEnt) ? 'home' : 'on')).trim();
// meuble visible seulement quand son entité a la valeur voulue (ex. voiture visible si la personne est à la maison)
export function itemVisible(i) {
  if (!i.visEnt || !settings.live || !hasHA()) return true;
  const st = stateOf(i.visEnt); return !!st && st.state === visWant(i);
}
export function setLive(on) { settings.live = !!on; syncLive(); emit('live'); }
export function syncLive() {
  const put = (key, bound, v) => { const a = anims.get(key); if (!a) return; if (settings.live && bound && v != null) { a.live = true; a.tg = v; } else if (a.live) { a.live = false; a.tg = parseFloat(manualOf(key)) || 0; } };
  for (const o of S.openings) {
    put('o' + o.id, o.ent, o.ent ? levelOf(o.ent) : null);
    put('p' + o.id, o.ent2, o.ent2 ? levelOf(o.ent2) : null);
    put('s' + o.id, o.shutEnt, o.shutEnt ? (levelOf(o.shutEnt) == null ? null : 1 - levelOf(o.shutEnt)) : null);
  }
  for (const i of S.items) {
    const ent = entOfItem(i);
    put('i' + i.id, ent, ent ? levelOf(ent) : null);
    const o = objs.item.get(i.id); if (o) o.visible = itemVisible(i);
  }
  invalidate();
}
function manualOf(key) {
  const id = +key.slice(1), c = key[0];
  if (c === 'i') return find('item', id)?.open;
  if (c === 'o') return find('opening', id)?.open;
  if (c === 'p') return find('opening', id)?.open2;
  return find('opening', id)?.shut;
}
export const isLiveBound = (e) => settings.live && (e.ent || e.ent2 || e.shutEnt || e.grp);
export function openAll(v) {
  S.openings.forEach((o) => setOpen('opening', o.id, v));
  S.items.forEach((i) => { if (hasAnim('item', i.id)) setOpen('item', i.id, v); });
  commit();
}

export function rebuildAll() {
  for (const k of [...anims.keys()]) { const id = +k.slice(1); const kind = k[0] === 'i' ? 'item' : 'opening'; if (!find(kind, id)) anims.delete(k); }
  setTimeout(syncLive, 0);
  renderWalls(); renderOpenings(); renderFloors(); renderItems(); renderPlot();
  updateLight(); drawSelection(); updateCutaway(); invalidate();
}
// reconstruit seulement ce qui dépend d'un mur / ouverture (garde les meubles)
export function rebuildStructure() { renderWalls(); renderOpenings(); renderFloors(); renderPlot(); updateLight(); drawSelection(); updateCutaway(); invalidate(); }
export function rebuildFloors() { renderFloors(); renderPlot(); drawSelection(); invalidate(); }

const DEF_DIR = new THREE.Vector3(0.6, 1.5, 0.9).normalize();
function updateLight() {
  const b = bounds() || { minx: 0, maxx: 12, minz: 0, maxz: 8 }, cx = (b.minx + b.maxx) / 2, cz = (b.minz + b.maxz) / 2;
  const ext = Math.max(b.maxx - b.minx, b.maxz - b.minz, 6) * 0.75 + 3, sun = R.sun;
  const dir = R.sunDir || DEF_DIR;
  sun.target.position.set(cx, 0, cz); sun.position.set(cx + dir.x * ext * 2, dir.y * ext * 2, cz + dir.z * ext * 2);
  const c = sun.shadow.camera; c.left = c.bottom = -ext; c.right = c.top = ext; c.near = 1; c.far = ext * 4; c.updateProjectionMatrix();
}

// ---------------------------------------------------------------------------------------------
// murs coupés (comme dans les Sims)
// ---------------------------------------------------------------------------------------------
export function updateCutaway() {
  if (isCut() !== wallsCut) { renderWalls(); invalidate(); }
  applyCut();
  if (!objs.wall.size) return;
  const b = structBounds() || bounds(); if (!b) return;
  const cx = (b.minx + b.maxx) / 2, cz = (b.minz + b.maxz) / 2; let changed = false;
  let vx = R.cam.position.x - V.tx, vz = R.cam.position.z - V.tz; const vl = Math.hypot(vx, vz) || 1; vx /= vl; vz /= vl;
  for (const w of S.walls) {
    const g = objs.wall.get(w.id); if (!g) continue;
    const { nx, nz } = wallInfo(w), mx = (w.x1 + w.x2) / 2, mz = (w.z1 + w.z2) / 2;
    let low = settings.view === '2d';
    if (settings.view === '3d') {
      if (settings.wallMode === 'bas') low = true;
      else if (settings.wallMode === 'auto') low = Math.abs(nx * vx + nz * vz) > 0.45 && (mx - cx) * vx + (mz - cz) * vz > 0.5 && R.cam.position.y > 1.5;
    }
    const k = low ? Math.min(1, (settings.view === '2d' ? 0.25 : 0.12) / w.h) : 1;
    g.userData.mesh.scale.y = k;
    if (g.userData.low !== low) changed = true;
    g.userData.low = low;
    if (g.userData.ao) g.userData.ao.visible = settings.view === '3d';
  }
  for (const o of S.openings) {
    const og = objs.opening.get(o.id), wg = objs.wall.get(o.wall);
    if (og && wg) og.visible = settings.view === '2d' || !wg.userData.low;
  }
  invalidate(changed);
}

// ---------------------------------------------------------------------------------------------
// sélection : boîte filaire + poignées
// ---------------------------------------------------------------------------------------------
const edgeMat = (c) => new THREE.LineBasicMaterial({ color: c, depthTest: false, transparent: true });
export function entityBox(kind, e) {
  // renvoie { cx, cy, cz, w, h, d, rotY } dans le monde
  if (kind === 'wall') { const i = wallInfo(e), p = wallPoint(e, i.L / 2); return { x: p.x, y: e.h / 2, z: p.z, w: i.L, h: e.h, d: e.t, rot: -i.ang }; }
  if (kind === 'opening') { const w = find('wall', e.wall), i = wallInfo(w), p = wallPoint(w, e.s); return { x: p.x, y: e.y0 + e.h / 2, z: p.z, w: e.w, h: e.h, d: w.t + 0.08, rot: -i.ang }; }
  if (kind === 'floor') return { x: e.x + e.w / 2, y: FLOOR_Y + 0.01, z: e.z + e.d / 2, w: e.w, h: 0.02, d: e.d, rot: 0 };
  return { x: e.x, y: FLOOR_Y + (e.elev || 0) + e.h / 2, z: e.z, w: e.w, h: e.h, d: e.d, rot: rad(e.rot || 0) };
}
export function wireBox(b, color) {
  const g = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(b.w, b.h, b.d)), edgeMat(color));
  g.position.set(b.x, b.y, b.z); g.rotation.y = b.rot; g.renderOrder = 10; return g;
}
export function drawSelection() {
  for (const c of [...root.sel.children]) { root.sel.remove(c); c.geometry?.dispose(); }
  for (const c of [...root.handles.children]) { root.handles.remove(c); c.geometry?.dispose(); }
  const e = sel_get(); if (!e || sel.kind === 'marker' || sel.kind === 'light') return;
  root.sel.add(wireBox(entityBox(sel.kind, e), 0x2f7bff));
  for (const h of handlesOf(sel.kind, e)) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
    m.userData.handle = h; m.position.set(h.x, h.y ?? 0.05, h.z); m.renderOrder = 20;
    const ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.35, 20), new THREE.MeshBasicMaterial({ color: 0x2f7bff, depthTest: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.renderOrder = 19; m.add(ring); m.userData.hs = true;
    root.handles.add(m);
  }
}
export function handlesOf(kind, e) {
  if (kind === 'wall') return [{ id: 'p1', x: e.x1, z: e.z1, y: 0.06 }, { id: 'p2', x: e.x2, z: e.z2, y: 0.06 }];
  if (kind === 'floor') return [{ id: 'c00', x: e.x, z: e.z }, { id: 'c10', x: e.x + e.w, z: e.z }, { id: 'c01', x: e.x, z: e.z + e.d }, { id: 'c11', x: e.x + e.w, z: e.z + e.d }].map((h) => ({ ...h, y: 0.06 }));
  return [];
}
function scaleHandles() {
  const k = isOrtho() ? V.size * 0.018 : R.cam.position.distanceTo(new THREE.Vector3(V.tx, 0, V.tz)) * 0.012;
  root.handles.children.forEach((m) => m.scale.setScalar(Math.max(0.05, k)));
}

// ---------------------------------------------------------------------------------------------
// sélection par rayon
// ---------------------------------------------------------------------------------------------
const visibleDeep = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
export function pick(cx, cy, kinds = ['item', 'opening', 'wall', 'floor']) {
  setRay(cx, cy);
  const targets = [];
  for (const k of kinds) objs[k].forEach((g) => targets.push(g));
  const hits = ray.intersectObjects(targets, true).filter((h) => visibleDeep(h.object) && h.object.userData.ref && !h.object.isLine);
  if (!hits.length) return null;
  // priorité aux meubles / ouvertures s'ils sont à peu près aussi proches que le mur
  const first = hits[0];
  const pr = { item: 0, opening: 1, wall: 2, floor: 3 };
  const tol = settings.view === '2d' ? 6 : 0.3; // en plan 2D on vise « à travers » le linteau
  const best = hits.slice(0, 8).filter((h) => h.distance < first.distance + tol).sort((a, b) => pr[a.object.userData.ref.kind] - pr[b.object.userData.ref.kind])[0];
  return { ...best.object.userData.ref, point: best.point, normal: best.face ? best.face.normal.clone().transformDirection(best.object.matrixWorld) : null, distance: best.distance, object: best.object };
}
export function pickHandle(cx, cy) {
  setRay(cx, cy);
  const hits = ray.intersectObjects(root.handles.children, false);
  return hits.length ? hits[0].object.userData.handle : null;
}
export const entityObj = (kind, id) => objs[kind].get(id);
// hauteur de la surface qui porte un élément posé (plan de travail, table, commode…) à cet endroit, ou null
export function supportTop(x, z, self) {
  let best = null;
  for (const o of S.items) {
    if (o === self || o.grp) continue;
    const d = defOf(o.model); if (!d || !d.surf) continue;
    const r = ((o.rot || 0) * Math.PI) / 180, dx = x - o.x, dz = z - o.z, lx = dx * Math.cos(r) - dz * Math.sin(r), lz = dx * Math.sin(r) + dz * Math.cos(r);
    if (Math.abs(lx) <= o.w / 2 + 0.02 && Math.abs(lz) <= o.d / 2 + 0.02) { const top = (o.elev || 0) + o.h; if (best == null || top > best) best = top; }
  }
  return best;
}
export function moveItemObj(it) { const d0 = defOf(it.model); if (d0 && d0.onTop) it.elev = supportTop(it.x, it.z, it) ?? 0; const g = objs.item.get(it.id); if (g) { g.position.set(it.x, FLOOR_Y + (it.elev || 0), it.z); g.rotation.y = rad(it.rot || 0); } drawSelection(); invalidate(); }
export function moveFloorObj() { rebuildFloors(); }

// ---------------------------------------------------------------------------------------------
// boucle de rendu (à la demande)
// ---------------------------------------------------------------------------------------------
let last = performance.now();
// Chaque lumière qui projette des ombres occupe une unité de texture du GPU (16 sur la plupart des appareils, y compris le soleil, l'environnement et les matières) :
// au-delà de quelques-unes allumées en même temps le rendu casserait. Les suivantes éclairent quand même, simplement sans ombre.
const SMALLSCREEN = Math.min(screen.width, screen.height) < 700;
function budgetShadows() {
  const max = Math.max(3, Math.min(SMALLSCREEN ? 6 : 8, R.renderer.capabilities.maxTextures - 8));
  let n = 0;
  const walk = (o) => { if (!o.visible) return; if (o.isLight && o.userData.sh) o.castShadow = n++ < max; for (const c of o.children) walk(c); };
  walk(R.scene);
}
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  let busy = false;
  for (const a of anims.values()) {
    if (a.cur !== a.tg) {
      const d = a.tg - a.cur, step = dt / 0.9;
      a.cur = Math.abs(d) <= step ? a.tg : a.cur + Math.sign(d) * step;
      applyParts(a.parts, a.cur); busy = true;
    }
  }
  animating = busy;
  if (busy || dirty) {
    scaleHandles();
    for (const f of R.frameHooks || []) f();
    // les ombres ne sont recalculées que si la géométrie, une pièce mobile (porte, tiroir…) ou l'ensemble des lumières allumées a changé : pas pendant un simple fondu de luminosité
    if (shadowDirty || LG.mov || LG.vis) { budgetShadows(); R.renderer.shadowMap.needsUpdate = true; shadowDirty = false; LG.mov = LG.vis = 0; }
    draw(); dirty = false;
  }
}
// rendu HD (occlusion ambiante) en 3D seulement ; les aides d'édition et les objets transparents n'y participent pas
const noAO = (o) => o === R.ui || o === R.grid || o === R.grid5 || o.userData.cut === true || (o.isMesh && !Array.isArray(o.material) && o.material.transparent);
function draw() { renderHD(R.renderer, R.scene, R.cam, settings.hd && settings.view === '3d', noAO, !!(R.sunInfo && R.sunInfo.t < 0.6)); }   // halo des lampes le soir
export const isAnimating = () => animating;
export function snapshotPNG() { R.renderer.shadowMap.needsUpdate = true; draw(); return R.canvas.toDataURL('image/png'); }
export function setHD(on) { settings.hd = !!on; shadowRes(); invalidate(); }
// carte d'ombre du soleil : 4096 px en rendu HD (ombres plus nettes), 2048 sinon
function shadowRes() {
  const n = settings.hd && !SMALLSCREEN ? 4096 : 2048, sh = R.sun && R.sun.shadow; if (!sh || sh.mapSize.x === n) return;
  sh.mapSize.set(n, n); if (sh.map) { sh.map.dispose(); sh.map = null; }
}

// ---------------------------------------------------------------------------------------------
// surface / récapitulatif
// ---------------------------------------------------------------------------------------------
export function summary() {
  const area = S.floors.reduce((a, f) => a + f.w * f.d, 0);
  const wallLen = S.walls.reduce((a, w) => a + wallInfo(w).L, 0);
  const groups = {};
  for (const it of S.items) {
    const d = defOf(it.model), k = it.model + '|' + [it.c1, it.c2, it.c3].join('');
    (groups[k] = groups[k] || { def: d, n: 0, it }).n++;
  }
  const lines = Object.values(groups).sort((a, b) => a.def.cat.localeCompare(b.def.cat) || a.def.name.localeCompare(b.def.name));
  return { area, wallLen, doors: S.openings.filter((o) => o.kind === 'door').length, windows: S.openings.filter((o) => o.kind === 'window').length, lines, rooms: S.floors.length };
}
export { clamp, r2 };

// ---------------------------------------------------------------------------------------------
// soleil réel / simulé
// ---------------------------------------------------------------------------------------------
const cA = new THREE.Color(), cB = new THREE.Color();
export function applySun() {
  const sm = settings.sun, sun = R.sun;
  if (!sun) return;
  const bg = (c) => { if (R.scene.background) R.scene.background.set(c); };
  if (sm.mode === 'off') {
    R.sunDir = null; sun.color.set('#fffaf3'); sun.intensity = 2.4; R.hemi.intensity = 0.95; R.hemi.color.set('#ffffff'); R.hemi.groundColor.set('#b8c0c8');
    R.scene.environmentIntensity = 0.55; R.renderer.toneMappingExposure = 0.9; bg('#dde6ee'); R.ground.material.color.set('#e7ecef');
    R.grid.material.opacity = 0.9; R.sunInfo = null; setLightGain(1); updateLight(); invalidate(); return;
  }
  let p = SUN.current(sm);
  if (sm.force === 'day') p = { el: 52, az: p.el > 8 ? p.az : 175 };         // « Jour » : plein soleil quelle que soit l'heure
  else if (sm.force === 'night') p = { el: -32, az: p.az };                    // « Soir » : nuit, lumières allumées bien visibles
  const L = SUN.lighting(p.el), rot = (S.meta && S.meta.rot) || 0;
  const e = Math.max(p.el, 8) * Math.PI / 180, a = ((p.az + rot) * Math.PI) / 180;
  // repère du plan : x vers la droite (est), z vers le bas (sud) ; nord du plan = z décroissant, décalé de « rot » degrés par rapport au vrai nord
  R.sunDir = new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)).normalize();
  sun.intensity = L.sun;
  if (L.useSun) { if (p.el < 8) sun.color.setRGB(1, 0.5, 0.25).lerp(cA.setRGB(1, 0.69, 0.44), cl01(p.el / 8)); else sun.color.setRGB(1, 0.69, 0.44).lerp(cA.set('#fffaf0'), cl01((p.el - 8) / 17)); }
  else sun.color.set('#8fa6d6');
  R.hemi.intensity = L.hemi; R.hemi.color.copy(cA.set('#3a4a6a')).lerp(cB.set('#f4f7ff'), L.t).lerp(cB.setRGB(1, 0.72, 0.5), 0.28 * L.tw);
  R.hemi.groundColor.copy(cA.set('#141c26')).lerp(cB.set('#b8c0c8'), L.t);
  R.scene.environmentIntensity = L.env; R.renderer.toneMappingExposure = L.exposure * 0.95;
  if (R.scene.background) R.scene.background.copy(cA.set('#0b1220')).lerp(cB.set('#dde6ee'), L.t).lerp(cB.setRGB(1, 0.62, 0.42), 0.25 * L.tw);
  R.ground.material.color.copy(cA.set('#1b232c')).lerp(cB.set('#e7ecef'), L.t);
  R.grid.material.opacity = 0.12 + 0.78 * L.t; R.sunInfo = { el: p.el, az: p.az, night: L.t < 0.35, t: L.t };
  setLightGain(1.35 - 0.35 * L.t);                                              // les luminaires éclairent un peu plus la nuit
  updateLight(); invalidate(); emit('sun');
}
const cl01 = (x) => Math.max(0, Math.min(1, x));
function setLightGain(k) { if (LG.k === k) return; LG.k = k; for (const a of anims.values()) applyParts(a.parts, a.cur); }
let sunTimer = 0;
export function setSun(patch) {
  Object.assign(settings.sun, patch);
  clearInterval(sunTimer); sunTimer = 0;
  if (settings.sun.mode === 'live') sunTimer = setInterval(applySun, 30000);
  applySun();
}

// ---------------------------------------------------------------------------------------------
// vue maison (publiée ou aperçu) : fond transparent, caméra orthographique fixe, terrain, jour / soir
// ---------------------------------------------------------------------------------------------
let beforePresent = null;
export function setPresent(on) {
  if (on === settings.present) return;
  settings.present = !!on;
  document.body.classList.toggle('present', on);
  if (on) {
    beforePresent = { view: settings.view, camOrtho: settings.camOrtho, wall: settings.wallMode, sun: { ...settings.sun }, bg: R.scene.background, V: { ...V } };
    settings.view = '3d'; settings.camOrtho = !(S.meta && S.meta.view && S.meta.view.persp); settings.free = false; settings.wallMode = S.meta && S.meta.view && S.meta.view.persp ? 'auto' : 'haut';   // vue de l'éditeur reprise : murs coupés comme dans l'éditeur
    R.ground.visible = R.grid.visible = R.grid5.visible = false; R.scene.background = null;
    if (!S.meta.plot && S.meta.plot !== false && structBounds()) S.meta.plot = true;
    topMat.color.set('#6f685e'); renderPlot(); resetView();
    setSun({ mode: settings.sun.mode === 'sim' ? 'sim' : 'live', force: null });
  } else {
    const b = beforePresent || {};
    settings.camOrtho = !!b.camOrtho; settings.view = b.view || '3d'; settings.free = false; settings.wallMode = b.wall || 'auto';
    R.ground.visible = R.grid.visible = R.grid5.visible = true; R.scene.background = b.bg || new THREE.Color('#dde6ee');
    topMat.color.set(settings.view === '2d' ? '#46505a' : '#d9d4cb'); setSun(b.sun || { mode: 'off', force: null }); if (b.V) Object.assign(V, b.V); renderPlot(); setupCam();
  }
  emit('present'); emit('view'); invalidate();
}
export function setForce(f) { setSun({ force: f || null }); emit('force'); }

