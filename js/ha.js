// Liaison avec Home Assistant : états des entités, appels de service, stockage utilisateur.
// Fonctionne dans une carte (iframe de même origine) ou sur une page servie par Home Assistant (/local/…).
// Hors Home Assistant, tout reste utilisable : seules les liaisons sont désactivées.
const H = { hass: null, subs: new Set() };
export const onHass = (fn) => H.subs.add(fn);
export const hass = () => H.hass;
export const hasHA = () => !!H.hass;

// Home Assistant remplace l'objet hass à chaque changement de n'importe quelle entité : on ne prévient l'interface que si une entité
// utilisée par le plan a changé (état, luminosité, position, température…), sinon les panneaux se reconstruiraient sans cesse.
export function setWatcher(fn) { H.watcher = fn; }
function signature(h) {
  const ids = H.watcher ? H.watcher() : null; if (!ids) return null;
  let out = '';
  for (const id of ids) { const s = h.states[id]; out += s ? s.state + '|' + (s.attributes ? [s.attributes.brightness, s.attributes.current_position, s.attributes.current_temperature, s.attributes.unit_of_measurement].join(',') : '') + ';' : '-;'; }
  return out;
}
export function setHass(h) {
  if (!h || h === H.hass) return;
  const first = !H.hass; H.hass = h;
  const sg = signature(h);
  if (!first && sg !== null && sg === H.sig) return;
  H.sig = sg; H.subs.forEach((f) => { try { f(h); } catch (e) { console.warn(e); } });
}

// recherche de l'objet hass dans la fenêtre parente (carte iframe) ou dans la page elle-même
function parentHass() {
  try {
    const docs = [window.parent !== window ? window.parent.document : null, document].filter(Boolean);
    for (const d of docs) { const el = d.querySelector('home-assistant'); if (el && el.hass) return el.hass; }
  } catch (e) { /* origine différente */ }
  return null;
}
export function connectAuto() {
  let pushed = false;   // la carte transmet hass elle-même : la recherche périodique ne sert alors plus
  window.__setHass = (h) => { pushed = true; setHass(h); };
  const tick = () => { if (pushed) { clearInterval(timer); return; } const h = parentHass(); if (h) setHass(h); };
  const timer = setInterval(tick, 1000); tick();
}

export const stateOf = (eid) => (H.hass && eid ? H.hass.states[eid] || null : null);
export const nameOf = (eid) => { const s = stateOf(eid); return (s && s.attributes && s.attributes.friendly_name) || eid; };

// niveau 0..1 d'une entité : ouverture d'un capteur / position d'un volet / luminosité d'une lumière
export function levelOf(eid) {
  const s = stateOf(eid); if (!s) return null;
  const d = eid.split('.')[0], st = s.state, a = s.attributes || {};
  if (st === 'unavailable' || st === 'unknown') return 0;
  if (d === 'cover') return typeof a.current_position === 'number' ? a.current_position / 100 : st === 'open' || st === 'opening' ? 1 : 0;
  if (d === 'light') { if (st !== 'on') return 0; return typeof a.brightness === 'number' ? 0.35 + (0.65 * a.brightness) / 255 : 1; }
  return ['on', 'open', 'opening', 'playing', 'heat', 'cool', 'heat_cool', 'home', 'cleaning'].includes(st) ? 1 : 0;
}

export function call(domain, service, data) {
  if (!H.hass) return Promise.resolve();
  return H.hass.callService(domain, service, data).catch((e) => console.warn('service', domain, service, e));
}
const TOGGLE = ['light', 'switch', 'input_boolean', 'fan', 'automation', 'siren', 'humidifier', 'media_player', 'climate'];
export function toggle(eid) {
  const d = eid.split('.')[0];
  if (d === 'cover') return call('cover', 'toggle', { entity_id: eid });
  if (d === 'script' || d === 'scene') return call(d, 'turn_on', { entity_id: eid });
  if (d === 'button') return call('button', 'press', { entity_id: eid });
  if (TOGGLE.includes(d)) return call('homeassistant', 'toggle', { entity_id: eid });
  return moreInfo(eid);
}
export const isToggleable = (eid) => !!eid && (TOGGLE.concat(['cover', 'script', 'scene', 'button']).includes(eid.split('.')[0]));

export function moreInfo(eid) {
  try {
    const d = window.parent !== window ? window.parent.document : document;
    const root = d.querySelector('home-assistant');
    if (root) root.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: eid } }));
  } catch (e) { /* ignore */ }
}

export function entities(domains) {
  if (!H.hass) return [];
  return Object.keys(H.hass.states).filter((k) => !domains || !domains.length || domains.includes(k.split('.')[0])).sort()
    .map((id) => ({ id, name: (H.hass.states[id].attributes || {}).friendly_name || '' }));
}

// stockage utilisateur Home Assistant (suit l'utilisateur d'un appareil à l'autre)
const UKEY = 'configurateur3d_plan_v1';
export async function loadUser() {
  if (!H.hass || !H.hass.callWS) return null;
  try { const r = await H.hass.callWS({ type: 'frontend/get_user_data', key: UKEY }); return (r && r.value) || null; } catch (e) { return null; }
}
let saveT = 0;
export function saveUser(json) {
  if (!H.hass || !H.hass.callWS) return;
  clearTimeout(saveT);
  saveT = setTimeout(() => { H.hass.callWS({ type: 'frontend/set_user_data', key: UKEY, value: { plan: json, at: Date.now() } }).catch(() => {}); }, 1500);
}
export const cfg = () => (H.hass && H.hass.config) || null;

// ---------------------------------------------------------------------------------------------
// publication : le plan est copié dans une carte « configurateur-3d-card » en lecture seule d'un tableau de bord
// (la vue et, si besoin, le tableau de bord sont créés automatiquement)
// ---------------------------------------------------------------------------------------------
const needWS = () => { if (!H.hass || !H.hass.callWS) throw new Error('Home Assistant non connecté : ouvre le configurateur depuis Home Assistant'); };
export async function listDashboards() {
  needWS();
  const r = await H.hass.callWS({ type: 'lovelace/dashboards/list' });
  return [{ url_path: '', title: 'Aperçu (tableau de bord par défaut)', mode: 'storage' }, ...r.filter((d) => d.mode === 'storage')];
}
const errTxt = (e) => (e && (e.message || e.code)) || String(e);
async function loadConfig(url) {
  try { return await H.hass.callWS({ type: 'lovelace/config', ...(url ? { url_path: url } : {}), force: true }); }
  catch (e) { if (e && e.code === 'config_not_found') return null; throw e; }
}
export async function publishPlan(planJson, o = {}) {
  needWS();
  const url = (o.url || '').trim(), view = { title: o.viewTitle || 'Maison 3D', path: (o.viewPath || 'maison-3d').trim() };
  const plan = typeof planJson === 'string' ? JSON.parse(planJson) : planJson;
  let created = false;
  if (url) {
    const list = await listDashboards();
    if (!list.some((d) => d.url_path === url)) {
      if (o.update) throw new Error('Ce tableau de bord n\'est pas modifiable depuis l\'interface (mode YAML ?)');
      if (!url.includes('-')) throw new Error('Le nom d\'un nouveau tableau de bord doit contenir un tiret (par exemple maison-3d)');
      try { await H.hass.callWS({ type: 'lovelace/dashboards/create', url_path: url, mode: 'storage', title: o.dashTitle || 'Maison 3D', icon: 'mdi:rotate-3d-variant', show_in_sidebar: true, require_admin: false }); created = true; }
      catch (e) { throw new Error('Création du tableau de bord impossible : ' + errTxt(e)); }
    }
  }
  let cfg = await loadConfig(url);
  if (!cfg) {
    if (!created && !url) throw new Error('Le tableau de bord « Aperçu » est généré automatiquement par Home Assistant : prends-en le contrôle (menu ⋮ → Modifier le tableau de bord) ou choisis un autre tableau.');
    cfg = { views: [] };
  }
  if (cfg.strategy) throw new Error('Ce tableau de bord est généré automatiquement (stratégie) : choisis-en un autre ou prends-en le contrôle.');
  cfg.views = cfg.views || [];
  let n = 0, where = null;
  const walk = (o2, vi) => {
    if (Array.isArray(o2)) o2.forEach((x) => walk(x, vi));
    else if (o2 && typeof o2 === 'object') {
      if (o2.type === 'custom:configurateur-3d-card' && o2.readonly) { o2.plan = plan; n++; if (!where) where = vi; }
      Object.values(o2).forEach((x) => walk(x, vi));
    }
  };
  cfg.views.forEach((v, i) => walk(v, i));
  let vpath = where != null ? cfg.views[where].path : null;
  if (!n) {
    if (o.update) throw new Error('Carte du configurateur introuvable dans ce tableau de bord');
    let path = view.path, k = 2; while (cfg.views.some((v) => v.path === path)) path = view.path + '-' + k++;
    cfg.views.push({ title: view.title, path, icon: 'mdi:rotate-3d-variant', type: 'panel', cards: [{ type: 'custom:configurateur-3d-card', readonly: true, plan }] });
    vpath = path; n = 1;
  }
  try { await H.hass.callWS({ type: 'lovelace/config/save', ...(url ? { url_path: url } : {}), config: cfg }); }
  catch (e) { throw new Error('Enregistrement impossible : ' + errTxt(e)); }
  return { n, url, view: vpath, created, path: '/' + (url || 'lovelace') + (vpath ? '/' + vpath : '') };
}
// ouvre une page de Home Assistant depuis l'iframe de la carte
export function navigate(path) {
  try { const w = window.parent !== window ? window.parent : window; w.history.pushState(null, '', path); w.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } })); return true; } catch (e) { return false; }
}

// tableau de bord affiché (premier segment de l'adresse de la page) : '' = tableau par défaut « lovelace »
export function currentDashboard() {
  try { const w = window.parent !== window ? window.parent : window, seg = w.location.pathname.split('/')[1] || ''; return seg === 'lovelace' ? '' : seg; } catch (e) { return ''; }
}
export const isAdmin = () => !!(H.hass && H.hass.user && H.hass.user.is_admin);
