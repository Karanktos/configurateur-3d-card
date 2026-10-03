// Pastilles posées sur la scène, comme dans la carte plan-3d : boutons ronds sombres (ambre quand c'est allumé), pastilles de valeur
// (températures), groupes de lumières, commande de volet (↓ ■ ↑) et pastilles fixées à l'écran (alarme).
// Clic = commande (lumière, prise…) ou fiche de l'entité ; appui long = fiche ; en édition, glisser = déplacer.
import { S, R, sel, find, select, commit, project, groundPoint, settings, invalidate, on, wallPoint, viewOnly } from './core.js';
import { removeEntity, T } from './tools.js';
import { toast } from './ui.js';
import { stateOf, levelOf, toggle, moreInfo, nameOf, isToggleable, onHass, call, hasHA } from './ha.js';
import { svg, hasIcon } from './mdi.js';

export const ICONS = {
  'mdi:lightbulb': 'Lumière', 'mdi:ceiling-light': 'Plafonnier', 'mdi:wall-sconce-flat': 'Applique', 'mdi:post-lamp': 'Potelet', 'mdi:spotlight-beam': 'Projecteur',
  'mdi:floor-lamp': 'Lampadaire', 'mdi:lightbulb-fluorescent-tube': 'Réglette', 'mdi:lightbulb-spot': 'Spot', 'mdi:cctv': 'Caméra', 'mdi:doorbell-video': 'Sonnette', 'mdi:video': 'Vidéo',
  'mdi:motion-sensor': 'Présence', 'mdi:door': 'Porte', 'mdi:door-open': 'Porte ouverte', 'mdi:window-open-variant': 'Fenêtre', 'mdi:garage': 'Garage', 'mdi:garage-open': 'Garage ouvert',
  'mdi:gate': 'Portail', 'mdi:shower': 'Douche', 'mdi:stairs': 'Escalier', 'mdi:grill': 'Barbecue', 'mdi:thermometer': 'Température', 'mdi:power': 'Prise', 'mdi:fan': 'Ventilation',
  'mdi:blinds': 'Volet', 'mdi:water-pump': 'Pompe', 'mdi:sprinkler': 'Arrosage', 'mdi:pool': 'Piscine', 'mdi:radiator': 'Radiateur', 'mdi:air-conditioner': 'Climatisation',
  'mdi:lock': 'Serrure', 'mdi:shield-home': 'Alarme', 'mdi:bell': 'Sonnerie', 'mdi:robot-vacuum': 'Aspirateur', 'mdi:television': 'Télévision', 'mdi:car': 'Voiture',
  'mdi:ev-station': 'Borne de recharge', 'mdi:solar-power': 'Solaire', 'mdi:flash': 'Électricité', 'mdi:water': 'Eau', 'mdi:fire': 'Feu', 'mdi:cog': 'Autre',
};
export const iconList = () => Object.entries(ICONS);

let layer, els = new Map(), dragging = null, selbar = null;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function initPins(container) {
  layer = container;
  R.frameHooks.push(update);
  on('state', refresh); on('select', refresh); on('live', refresh); on('present', refresh);
  on('tool', refresh);
  onHass(() => { refresh(); });
  // barre de sélection (comme dans la carte plan-3d) : nom de la pastille choisie + suppression
  selbar = document.createElement('div'); selbar.id = 'selbar'; selbar.hidden = true;
  selbar.innerHTML = '<span class="sbn"></span><button class="sbt" data-a="test" title="Allumer / éteindre ou ouvrir la fiche, pour tester la liaison">▶ Tester</button><button class="sbd" data-a="del">🗑 Supprimer</button>';
  selbar.addEventListener('pointerdown', (e) => e.stopPropagation());
  selbar.addEventListener('click', (e) => {
    const a = e.target.dataset.a, e2 = sel.kind && find(sel.kind, sel.id); if (!a || !e2) return;
    if (a === 'del') removeEntity(sel.kind, sel.id); else if (a === 'test') act({ ent: e2.ent, mode: sel.kind === 'light' ? 'toggle' : e2.action || 'auto' });
  });
  layer.parentElement.append(selbar);
  on('select', syncSelbar); on('state', syncSelbar);
  refresh();
}

// valeur affichée dans une pastille « pilule » (température d'un thermostat, valeur d'un capteur)
function label(en) {
  const st = stateOf(en.ent);
  if (!st) return null;
  const d = en.ent.split('.')[0], a = st.attributes || {};
  if (d === 'climate') return typeof a.current_temperature === 'number' ? a.current_temperature.toFixed(1).replace('.', ',') + ' °C' : st.state;
  if (d === 'sensor') { const n = parseFloat(st.state); return (isNaN(n) ? st.state : String(Math.round(n * 10) / 10).replace('.', ',')) + (a.unit_of_measurement ? ' ' + a.unit_of_measurement : ''); }
  return null;
}

// tout ce qui se pose sur la scène : pastilles, groupes de lumières, volets
function entries() {
  const out = [];
  for (const m of S.markers) out.push({ key: 'm' + m.id, kind: 'marker', ref: m, x: m.x, z: m.z, h: m.h ?? 2, ent: m.ent, ic: m.ic, title: m.title, mode: m.action || 'auto', scr: m.scr });
  for (const l of S.lights) if (!l.hide && (l.ent || !viewOnly())) out.push({ key: 'l' + l.id, kind: 'light', ref: l, x: l.x, z: l.z, h: l.h ?? 2, ent: l.ent, ic: l.ic || 'mdi:ceiling-light', title: l.name, mode: 'toggle' });
  if (settings.live || settings.present) {
    for (const o of S.openings) {
      if (!o.shutter || !o.shutEnt) continue;
      const w = find('wall', o.wall); if (!w) continue;
      const p = wallPoint(w, o.s); out.push({ key: 'c' + o.id, kind: 'cover', ref: o, x: p.x, z: p.z, h: o.y0 + o.h + 0.3, ent: o.shutEnt, title: 'Volet' });
    }
  }
  return out;
}
let current = [];

const COVER_TXT = { open: 'Ouvert', closed: 'Fermé', opening: 'Ouverture…', closing: 'Fermeture…', stopped: 'Arrêté', unavailable: 'Indisponible' };
const ALARM_ICON = { disarmed: 'mdi:shield-off-outline', triggered: 'mdi:bell-ring' };
let cvMsg = null;

function make(en) {
  const e = document.createElement('div');
  if (en.kind === 'cover') {
    e.className = 'pin cv';
    e.innerHTML = '<div class="cvp"><div class="cvb" data-s="close_cover" title="Fermer le volet"></div><div class="cvb" data-s="stop_cover" title="Arrêter le volet"></div><div class="cvb" data-s="open_cover" title="Ouvrir le volet"></div></div><div class="cvl"></div>';
    const [a, b, c] = e.querySelectorAll('.cvb'); a.innerHTML = svg('mdi:arrow-down'); b.innerHTML = svg('mdi:stop'); c.innerHTML = svg('mdi:arrow-up');
    e.querySelectorAll('.cvb').forEach((x) => {
      x.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      x.addEventListener('click', (ev) => {
        ev.stopPropagation(); const s = x.dataset.s;
        call('cover', s, { entity_id: en.ent }); x.classList.add('sent'); setTimeout(() => x.classList.remove('sent'), 600);
        cvMsg = { t: Date.now(), k: en.key, x: { open_cover: '↑ Ouverture envoyée', close_cover: '↓ Fermeture envoyée', stop_cover: '■ Arrêt envoyé' }[s] }; refresh(); setTimeout(refresh, 2600);
      });
    });
    e.querySelector('.cvl').addEventListener('click', (ev) => { ev.stopPropagation(); moreInfo(en.ent); });
    e.querySelector('.cvl').addEventListener('pointerdown', (ev) => ev.stopPropagation());
  } else {
    e.className = 'pin'; e.innerHTML = '<span class="g"></span><span class="t"></span>';
    bind(e, en.key);
  }
  layer.appendChild(e);
  return e;
}

export function refresh() {
  if (!layer) return;
  const tl = document.querySelector('#view').dataset.tool;
  layer.classList.toggle('inert', tl !== 'select' && tl !== 'erase' && !viewOnly());   // les autres outils cliquent « à travers » les pastilles
  current = entries();
  const keys = new Set(current.map((c) => c.key));
  for (const [k, e] of els) if (!keys.has(k)) { e.remove(); els.delete(k); }
  let scrN = 0;
  for (const en of current) {
    let e = els.get(en.key);
    if (!e) { e = make(en); els.set(en.key, e); }
    const st = stateOf(en.ent), lv = en.ent ? levelOf(en.ent) : null, d = (en.ent || '').split('.')[0];
    e._en = en;
    if (en.kind === 'cover') {
      const s = st ? st.state : 'unavailable', pos = st && st.attributes && st.attributes.current_position, btn = e.querySelectorAll('.cvb');
      btn[0].classList.toggle('mv', s === 'closing'); btn[2].classList.toggle('mv', s === 'opening');
      e.querySelector('.cvl').textContent = cvMsg && cvMsg.k === en.key && Date.now() - cvMsg.t < 2500 ? cvMsg.x : (COVER_TXT[s] || s) + (typeof pos === 'number' ? ' · ' + pos + ' %' : '');
      e.classList.toggle('hidden', !(settings.live || settings.present));
      continue;
    }
    const lab = label(en), isAlarm = d === 'alarm_control_panel';
    let ic = en.ic || 'mdi:gesture-tap';
    if (isAlarm) { const as = st ? st.state : ''; ic = as.startsWith('armed') ? 'mdi:shield-lock' : ALARM_ICON[as] || 'mdi:shield-home'; }
    if (e.dataset.ic !== ic) { e.dataset.ic = ic; e.querySelector('.g').innerHTML = hasIcon(ic) ? svg(ic) : svg('mdi:cog'); }
    e.querySelector('.t').textContent = lab || '';
    e.classList.toggle('val', !!lab);
    e.classList.toggle('on', !isAlarm && !!st && (st.state === 'on' || (d === 'light' && lv > 0)) && d !== 'sensor' && d !== 'climate');
    e.classList.toggle('arm', isAlarm && !!st && st.state.startsWith('armed')); e.classList.toggle('trig', isAlarm && !!st && st.state === 'triggered');
    e.classList.toggle('off', !st && !!en.ent && hasHA());
    e.classList.toggle('sel', sel.kind === en.kind && sel.id === en.ref.id);
    e.classList.toggle('scr', !!en.scr);
    if (en.scr) { e.style.setProperty('--n', scrN++); }
    e.title = (en.title || nameOf(en.ent) || 'Pastille') + (st ? ' · ' + st.state : '');
  }
  update();
}

function update() {
  if (!layer) return;
  layer.parentElement.style.setProperty('--k', clamp((layer.clientWidth || 900) / 900, 0.6, 1));
  for (const en of current) {
    const e = els.get(en.key); if (!e || en.scr) continue;
    const p = project(en.x, en.h, en.z);
    e.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%)`; e.style.display = p.vis ? '' : 'none';
  }
}

// action d'une pastille : bascule (lumière, prise, volet…) ou fiche détaillée (caméra, capteur…)
export function act(en) {
  if (!en || !en.ent) return;
  if (en.mode === 'toggle' || (en.mode === 'auto' && isToggleable(en.ent))) toggle(en.ent); else moreInfo(en.ent);
}

// clic court = action ; appui long = fiche (comme dans la carte plan-3d) ; en édition : clic = sélection, glisser = déplacer
function bind(e, key) {
  let timer = 0, longDone = false;
  const en = () => e._en;
  e.addEventListener('pointerdown', (ev) => {
    ev.stopPropagation(); ev.preventDefault();
    try { R.canvas.focus({ preventScroll: true }); } catch (err) { /* touche Suppr utilisable après un clic sur une pastille */ }
    const x = en(), editing = !viewOnly();
    longDone = false; clearTimeout(timer);
    timer = setTimeout(() => { longDone = true; if (editing && x.kind !== 'cover') select(x.kind, x.ref.id); else moreInfo(x.ent); }, 500);
    if (editing && x.kind !== 'cover' && !x.scr && T.tool !== 'erase') { dragging = { key, moved: false, sx: ev.clientX, sy: ev.clientY }; e.setPointerCapture(ev.pointerId); }
  });
  e.addEventListener('pointermove', (ev) => {
    if (!dragging || dragging.key !== key) return;
    if (!dragging.moved && Math.hypot(ev.clientX - dragging.sx, ev.clientY - dragging.sy) < 5) return;
    clearTimeout(timer); dragging.moved = true;
    const x = en(), g = groundPoint(ev.clientX, ev.clientY, 0); if (!g) return;
    const sn = settings.snap || 0.05; x.ref.x = Math.round(g.x / sn) * sn; x.ref.z = Math.round(g.z / sn) * sn; x.x = x.ref.x; x.z = x.ref.z; update();
  });
  e.addEventListener('pointerup', (ev) => {
    ev.stopPropagation(); clearTimeout(timer);
    const x = en(), editing = !viewOnly();
    if (dragging && dragging.key === key && dragging.moved) { dragging = null; commit(); invalidate(false); return; }
    dragging = null;
    if (longDone) return;
    if (editing && x.kind !== 'cover') {   // en édition, un clic sélectionne toujours (même en mode maison) ; la gomme supprime
      if (T.tool === 'erase') { removeEntity(x.kind, x.ref.id); toast('Pastille supprimée'); return; }
      select(x.kind, x.ref.id); return;
    }
    act(x);
  });
  e.addEventListener('pointerleave', () => clearTimeout(timer));
  e.addEventListener('contextmenu', (ev) => ev.preventDefault());
}

function syncSelbar() {
  if (!selbar) return;
  const e = sel.kind && !viewOnly() && (sel.kind === 'marker' || sel.kind === 'light') ? find(sel.kind, sel.id) : null;
  selbar.hidden = !e;
  if (e) selbar.querySelector('.sbn').textContent = (sel.kind === 'light' ? '💡 ' : '') + (e.title || e.name || nameOf(e.ent) || 'Pastille');
}
