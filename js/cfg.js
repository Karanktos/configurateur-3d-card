// Mode « Configurer » de la vue publiée (administrateur Home Assistant), comme le configurateur de la carte plan-3d :
// ajouter, déplacer et supprimer des pastilles (capteurs, interrupteurs) et des lumières, lier les animations (fenêtres, portes, volets,
// meubles, lumières) à leurs entités, puis enregistrer dans la configuration du tableau de bord. Réutilise les panneaux de l'éditeur.
import { settings, S, sel, select, on, emit, load, exportJSON, undo, redo, canUndo, canRedo, syncLive, fitView } from './core.js';
import { T, setTool, startPlacingLight } from './tools.js';
import { publishPlan, currentDashboard } from './ha.js';
import { toast } from './ui.js';

let bar, snapshot = null, dirty = false, closing = 0;

function build() {
  if (bar) return;
  bar = document.createElement('div'); bar.id = 'cfgbar'; bar.hidden = true;
  bar.innerHTML = '<button data-t="select" title="Sélectionner une pastille, une lumière, une fenêtre, une porte…">↖<span> Sélection</span></button>'
    + '<button data-t="marker" title="Poser un capteur, une caméra, un interrupteur">📍<span> Capteur</span></button>'
    + '<button data-t="light" title="Poser des points lumineux (groupes de lumières)">💡<span> Lumière</span></button>'
    + '<button data-t="links" title="Lier les animations aux entités">🔗<span> Liens</span></button>'
    + '<button data-t="erase" title="Supprimer une pastille ou une lumière d\'un clic">🗑<span> Gomme</span></button>'
    + '<i></i><button data-a="undo" title="Annuler">↶</button><button data-a="redo" title="Rétablir">↷</button>'
    + '<button data-a="dock" title="Afficher / masquer le panneau">☰</button><i></i>'
    + '<button class="pri" data-a="save" title="Enregistre le plan dans le tableau de bord">💾<span> Enregistrer</span></button>'
    + '<button data-a="close" title="Quitter le mode Configurer">✕<span> Fermer</span></button>';
  bar.addEventListener('pointerdown', (e) => e.stopPropagation());
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.t) { const t = b.dataset.t; if (t === 'light') startPlacingLight(); else setTool(t); return; }
    ({ undo, redo, dock: () => document.body.classList.toggle('nodock'), save, close })[b.dataset.a]();
  });
  document.querySelector('#stage').append(bar);
  on('tool', mark); on('history', mark); on('state', () => { if (settings.cfg) { dirty = true; mark(); } });
}
function mark() {
  if (!bar) return;
  bar.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === T.tool));
  bar.querySelector('[data-a=undo]').disabled = !canUndo(); bar.querySelector('[data-a=redo]').disabled = !canRedo();
  const s = bar.querySelector('[data-a=save]'); s.classList.toggle('dirty', dirty); s.querySelector('span').textContent = dirty ? ' Enregistrer *' : ' Enregistrer';
  const c = bar.querySelector('[data-a=close] span'); c.textContent = closing ? ' Quitter sans enregistrer ?' : ' Fermer';
}
// la carte Home Assistant agrandit son cadre en mode Configurer (les panneaux ne tiennent pas dans la hauteur de la maison)
function fitCard() {
  try { const c = window.frameElement && window.frameElement.parentElement; if (c && c._fit) c._fit(); } catch (e) { /* hors carte */ }
  setTimeout(() => { try { fitView(); } catch (e) { /* ignore */ } }, 120);
}
export const cfgActive = () => settings.cfg;
// plan à enregistrer : sans les aperçus ouverts / allumés (ils ne doivent pas rester figés dans la vue publiée)
function cleanPlan() {
  const p = JSON.parse(exportJSON());
  (p.openings || []).forEach((o) => { o.open = 0; o.shut = 0; }); (p.items || []).forEach((i) => { if (i.open) i.open = 0; });
  return p;
}

export function enterCfg() {
  if (settings.cfg || !settings.readonly) return;
  build();
  snapshot = exportJSON(); dirty = false; closing = 0;
  settings.cfg = true; document.body.classList.add('cfg'); bar.hidden = false;
  select(null); setTool('select');
  emit('present'); mark(); fitCard();
  toast('Mode Configurer : pose, déplace ou supprime les pastilles, relie les animations puis enregistre');
}
function leave(revert) {
  if (revert && snapshot) { load(snapshot); syncLive(); }
  settings.cfg = false; document.body.classList.remove('cfg', 'nodock'); bar.hidden = true; closing = 0;
  select(null); setTool('select');
  emit('present'); fitCard();
}
function close() {
  if (dirty && !closing) { closing = setTimeout(() => { closing = 0; mark(); }, 3500); mark(); return; }
  clearTimeout(closing); leave(dirty);
}
async function save() {
  const b = bar.querySelector('[data-a=save]'); b.disabled = true;
  try {
    const r = await publishPlan(cleanPlan(), { url: currentDashboard(), update: true });
    snapshot = exportJSON(); dirty = false; mark(); toast('Enregistré ✓ (' + r.path + ')');
  } catch (e) { toast('Échec de l\'enregistrement : ' + (e.message || e)); } finally { b.disabled = false; }
}
