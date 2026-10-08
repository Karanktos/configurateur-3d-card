// Vue maison (publiée ou aperçu) : barre en bas à gauche (Auto / Jour / Soir, Soleil, 3D libre, murs, Configurer) et boussole, comme dans la carte plan-3d.
// Panneau « Soleil » : heure et date simulées (curseur, lecture), retour au direct, orientation du plan par rapport au nord.
import { settings, S, R, V, on, setForce, setFree, setSun, project, updateCutaway, setPresent, commit, setHD, viewSh, resetView, setupCam } from './core.js';
import { setHdWanted } from './post.js';
import { svg } from './mdi.js';
import * as SUN from './sun.js';
import { isAdmin, onHass } from './ha.js';
import { enterCfg } from './cfg.js';

const MODES = [[null, 'Auto', 'mdi:theme-light-dark'], ['day', 'Jour', 'mdi:white-balance-sunny'], ['night', 'Soir', 'mdi:weather-night']];
let bar, cmp, nd, exitBtn, sp, playT = 0, rotBase = null;
const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const RKEY = 'cfg3d-rot';

export function initPresent(stage) {
  bar = document.createElement('div'); bar.id = 'pbar';
  bar.innerHTML = `<div class="bt" data-c="mode"></div><div class="bt" data-c="sun">${svg('mdi:white-balance-sunny')}<span>Soleil</span></div><div class="bt" data-c="free">${svg('mdi:rotate-3d-variant')}<span>3D libre</span></div><div class="bt" data-c="walls">${svg('mdi:wall')}<span></span></div><div class="bt" data-c="center" title="Vue centrée : de face, sans inclinaison de gauche à droite">${svg('mdi:image-filter-center-focus')}<span>Centrée</span></div><div class="bt" data-c="hd" title="Rendu HD : ombrage de contact, bords lissés, halo des lampes (plus gourmand)">${svg('mdi:high-definition')}<span>HD</span></div><div class="bt" data-c="cfg" hidden>${svg('mdi:cog')}<span>Configurer</span></div>`;
  cmp = document.createElement('div'); cmp.id = 'cmp';
  cmp.innerHTML = '<svg viewBox="-50 -50 100 100"><circle r="44" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2"/><g class="nd"><path d="M0,-34 L9,4 L0,-3 L-9,4 Z" fill="#4da3ff"/><path d="M0,34 L9,-4 L0,3 L-9,-4 Z" fill="rgba(255,255,255,.55)"/><text y="-22" text-anchor="middle" font-size="13" fill="#fff" font-family="sans-serif" dy="-14">N</text></g></svg>';
  exitBtn = document.createElement('button'); exitBtn.id = 'pexit'; exitBtn.className = 'tb'; exitBtn.textContent = '✕ Quitter l\'aperçu';
  exitBtn.onclick = () => setPresent(false);
  sunPanel();
  stage.append(bar, cmp, exitBtn, sp); nd = cmp.querySelector('.nd');
  bar.querySelector('[data-c=mode]').onclick = () => { const i = MODES.findIndex((m) => m[0] === (settings.sun.force || null)); setForce(MODES[(i + 1) % MODES.length][0]); sync(); };
  bar.querySelector('[data-c=sun]').onclick = () => { sp.hidden = !sp.hidden; if (!sp.hidden) syncSun(); sync(); };
  bar.querySelector('[data-c=free]').onclick = () => { setFree(!settings.free); sync(); };
  bar.querySelector('[data-c=walls]').onclick = () => { settings.wallMode = settings.wallMode === 'haut' ? 'auto' : 'haut'; updateCutaway(); sync(); };
  bar.querySelector('[data-c=center]').onclick = () => { settings.centered = viewSh() !== 0; try { localStorage.setItem('cfg3d-centered', settings.centered ? '1' : '0'); } catch (e) { /* stockage indisponible */ } if (!settings.free) resetView(); else setupCam(); sync(); };
  bar.querySelector('[data-c=hd]').onclick = () => { setHD(!settings.hd); setHdWanted(settings.hd); sync(); };
  bar.querySelector('[data-c=cfg]').onclick = () => enterCfg();
  [bar, cmp, sp].forEach((n) => n.addEventListener('pointerdown', (e) => e.stopPropagation()));
  on('present', () => { if (!settings.present) closeSun(); sync(); }); on('free', sync); on('force', sync); on('sun', syncSun);
  onHass(sync);
  R.frameHooks.push(compass);
  sync();
}
function sync() {
  if (!bar) return;
  const m = MODES.find((x) => x[0] === (settings.sun.force || null)) || MODES[0], b = bar.querySelector('[data-c=mode]');
  b.innerHTML = `${svg(m[2])}<span>${m[1]}</span>`; b.classList.toggle('act', !!m[0]);
  bar.querySelector('[data-c=sun]').classList.toggle('act', !sp.hidden || settings.sun.mode === 'sim');
  bar.querySelector('[data-c=free]').classList.toggle('act', settings.free);
  const w = bar.querySelector('[data-c=walls]'); w.classList.toggle('act', settings.wallMode !== 'haut'); w.querySelector('span').textContent = settings.wallMode === 'haut' ? 'Murs hauts' : 'Murs coupés';
  // « Configurer » : réservé aux administrateurs, dans la vue publiée (le plan s'enregistre dans le tableau de bord)
  bar.querySelector('[data-c=center]').classList.toggle('act', viewSh() === 0);
  bar.querySelector('[data-c=hd]').classList.toggle('act', !!settings.hd);
  const c = bar.querySelector('[data-c=cfg]'); c.hidden = !(settings.readonly && isAdmin() && !settings.cfg); c.classList.toggle('act', settings.cfg);
  document.body.classList.toggle('free', !!settings.free);
  exitBtn.style.display = settings.present && !settings.readonly ? '' : 'none';
}
// la boussole indique le vrai nord : le plan est décalé de « rot » degrés (nord du plan = z décroissant)
function compass() {
  if (!settings.present || !nd) return;
  const r = (((S.meta && S.meta.rot) || 0) * Math.PI) / 180, t = project(V.tx, 0, V.tz), n = project(V.tx + 3 * Math.sin(r), 0, V.tz - 3 * Math.cos(r));
  nd.setAttribute('transform', `rotate(${(Math.atan2(n.x - t.x, t.y - n.y) * 180) / Math.PI})`);
}

// ---------------------------------------------------------------------------------------------
// panneau Soleil
// ---------------------------------------------------------------------------------------------
function sunPanel() {
  sp = document.createElement('div'); sp.id = 'sunp'; sp.hidden = true;
  sp.innerHTML = '<div class="h"><b>Soleil</b><span class="i sx">direct</span><span class="sc" title="Fermer">✕</span></div>'
    + '<div class="r"><span class="st">--:--</span><input type="range" class="sm" min="0" max="1430" step="10"></div>'
    + '<div class="r"><input type="date" class="sd"><button class="sp-play" title="Faire défiler la journée">▶</button><button class="sp-now" title="Revenir au soleil réel">Direct</button></div>'
    + '<div class="r"><span class="i" style="flex:1" title="Écart entre le haut du plan et le vrai nord">Plan décalé du nord de</span><button class="ro-m">−</button><b class="ro"></b><button class="ro-p">+</button></div>';
  const q = (s) => sp.querySelector(s);
  q('.sm').addEventListener('input', (e) => { stopPlay(); startSim(); setSun({ min: +e.target.value }); });
  q('.sd').addEventListener('change', (e) => { if (!e.target.value) return; startSim(); setSun({ date: e.target.value }); });
  q('.sp-play').addEventListener('click', () => { playT ? stopPlay() : play(); });
  q('.sp-now').addEventListener('click', () => direct());
  q('.sc').addEventListener('click', () => closeSun());
  q('.ro-m').addEventListener('click', () => setRot(((S.meta && S.meta.rot) || 0) - 1));
  q('.ro-p').addEventListener('click', () => setRot(((S.meta && S.meta.rot) || 0) + 1));
}
// passe en simulation à l'heure actuelle (le mode Jour / Soir forcé est levé : sinon le curseur serait sans effet)
function startSim() {
  if (settings.sun.mode === 'sim') return;
  const n = SUN.nowIn(SUN.place().tz), m = Math.round(n.m / 10) * 10 % 1440;
  if (settings.sun.force) setForce(null);
  setSun({ mode: 'sim', date: n.d, min: m });
}
function endSim() { stopPlay(); if (settings.sun.mode === 'sim') setSun({ mode: 'live' }); syncSun(); }
function direct() { endSim(); if (settings.sun.force) setForce(null); syncSun(); }   // bouton « Direct » : soleil réel, Jour / Soir levé
function closeSun() { endSim(); if (sp) sp.hidden = true; if (bar) sync(); }
function stopPlay() { clearTimeout(playT); playT = 0; if (sp) { const b = sp.querySelector('.sp-play'); b.classList.remove('on'); b.textContent = '▶'; } }
function play() {
  startSim(); const b = sp.querySelector('.sp-play'); b.classList.add('on'); b.textContent = '⏸';
  const step = () => {
    if (!settings.present || document.hidden || settings.sun.mode !== 'sim') { stopPlay(); return; }
    const t0 = performance.now(); setSun({ min: (settings.sun.min + 10) % 1440 });
    playT = setTimeout(step, Math.max(160, 2.5 * (performance.now() - t0)));   // cadence adaptative : jamais plus vite que ce que l'appareil supporte
  };
  step();
}
function rotTxt() { const v = Math.round(((S.meta && S.meta.rot) || 0) * 10) / 10; return Math.abs(v) + '° ' + (v >= 0 ? 'O' : 'E'); }
// orientation du plan : mémorisée dans ce navigateur (comme la carte plan-3d) ; en mode Configurer elle fait partie du plan enregistré
function setRot(v) {
  S.meta.rot = Math.round(v * 10) / 10;
  try { localStorage.setItem(RKEY, JSON.stringify({ from: rotBase != null ? rotBase : S.meta.rot, v: S.meta.rot })); } catch (e) { /* stockage indisponible */ }
  if (settings.cfg) commit(false);
  setSun({}); syncSun();
}
// à appeler une fois le plan publié chargé : applique l'orientation réglée localement si elle part de la même valeur de base
export function applyLocalRot() {
  if (!S.meta) return; rotBase = S.meta.rot;
  try { const o = JSON.parse(localStorage.getItem(RKEY) || 'null'); if (o && o.from === S.meta.rot && isFinite(o.v)) S.meta.rot = o.v; } catch (e) { /* ignore */ }
}
function syncSun() {
  if (!sp) return;
  const sm = settings.sun, sim = sm.mode === 'sim', n = sim ? sm : SUN.nowIn(SUN.place().tz), q = (s) => sp.querySelector(s);
  if (document.activeElement !== q('.sm')) q('.sm').value = n.min != null ? n.min : n.m;
  q('.st').textContent = hhmm(n.min != null ? n.min : n.m);
  if (document.activeElement !== q('.sd')) q('.sd').value = sim ? sm.date : n.d;
  const s = R.sunInfo;
  q('.sx').textContent = !sim ? 'direct' : !s ? '' : s.el > 0 ? `élév. ${Math.round(s.el)}° · ${SUN.compass(s.az)} ${Math.round(s.az)}°` : s.el > -6 ? 'crépuscule' : 'nuit';
  q('.ro').textContent = rotTxt();
  sync();
}
