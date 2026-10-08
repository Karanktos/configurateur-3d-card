import { select, project, initScene, loadSaved, undo, redo, canUndo, canRedo, exportJSON, load, reset, snapshotPNG, frameAll, startModels, S, on, setLive, settings, entOfItem, setPresent, viewAspect } from './core.js';
import { initTools, setTool } from './tools.js';
import { initUI, bindHistory, download, toast, openModal, closeModal, openPublish } from './ui.js';
import { loadSample } from './sample.js';
import { initPins } from './pins.js';
import { initPresent, applyLocalRot } from './present.js';
import { connectAuto, onHass, loadUser, saveUser, setWatcher } from './ha.js';

import { preloadTextures } from './textures.js';
const $ = (s) => document.querySelector(s);
await preloadTextures();   // textures procédurales déjà calculées lors d'une visite précédente (cache IndexedDB)
initScene($('#view'));
initTools($('#view'), $('#labels'));
initUI(); bindHistory(canUndo, canRedo);

$('#b-undo').onclick = undo; $('#b-redo').onclick = redo;
$('#b-sample').onclick = () => { loadSample(); toast('Plan d\'exemple chargé'); };
let armed = 0;
$('#b-new').onclick = (e) => {
  if (!S.walls.length && !S.items.length && !S.floors.length) { reset(); return; }
  if (!armed) { armed = setTimeout(() => { armed = 0; e.target.textContent = 'Nouveau'; }, 3000); e.target.textContent = 'Effacer ? Confirmer'; return; }
  clearTimeout(armed); armed = 0; e.target.textContent = 'Nouveau'; reset(); toast('Nouveau plan');
};
$('#b-save').onclick = () => openModal('Enregistrer le plan', {
  text: exportJSON(), ro: true,
  buttons: [['Copier', 'copy'], ['Télécharger le fichier', () => { download('mon-plan-3d.json', exportJSON()); toast('Fichier téléchargé'); }]],
  note: 'Copie ce texte pour le garder, ou télécharge-le en fichier .json. Le plan est aussi sauvegardé automatiquement dans ce navigateur.',
});
$('#b-load').onclick = () => openModal('Ouvrir un plan', {
  text: '', placeholder: 'Colle ici le contenu d\'un fichier .json…',
  buttons: [['Choisir un fichier…', () => $('#f-load').click()], ['Charger', (t) => { try { load(t.value); closeModal(); toast('Plan chargé'); } catch (err) { toast('Texte invalide'); } }, true]],
});
$('#f-load').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { load(await f.text()); closeModal(); toast('Plan chargé'); } catch (err) { toast('Fichier invalide'); }
  e.target.value = '';
};
$('#b-png').onclick = () => { const a = document.createElement('a'); a.href = snapshotPNG(); a.download = 'plan-3d.png'; a.click(); toast('Capture enregistrée'); };

initPins($('#pins'));
initPresent($('#stage'));
const CFG = window.__CFG || {};
startModels(CFG.models_base);   // modèles 3D des meubles (facultatif : sans eux, les meubles restent ceux générés par le code)
settings.readonly = !!CFG.readonly;
try { const c = localStorage.getItem('cfg3d-centered'); settings.centered = CFG.centered != null ? !!CFG.centered : c === '1' ? true : c === '0' ? false : null; } catch (e) { settings.centered = CFG.centered != null ? !!CFG.centered : null; }   // vue maison centrée : YAML `centered`, sinon dernier choix du bouton « Centrée », sinon réglage du plan
if (settings.readonly) { document.body.classList.add('ro'); document.documentElement.classList.add('ro'); document.documentElement.dataset.theme = 'light'; }   // pas de thème sombre : l'iframe doit rester transparente
const had = settings.readonly ? false : loadSaved();
if (settings.readonly) {
  if (CFG.plan) { try { load(CFG.plan); applyLocalRot(); } catch (e) { /* plan illisible */ } }
  else { const b = $('#boot'); b.textContent = 'Aucun plan publié : ouvre le configurateur, puis clique sur « Publier ».'; b.dataset.keep = '1'; }
} else if (!had) loadSample();
if (settings.readonly) setPresent(true);
$('#b-preview').onclick = () => { setTool('select'); select(null); setPresent(true); };
$('#b-publish').onclick = () => openPublish();
if (!settings.readonly) on('persist', (j) => saveUser(j));

// entités surveillées : l'interface n'est prévenue que si l'une d'elles change (voir ha.setHass)
setWatcher(() => {
  const ids = new Set(['sun.sun']);
  S.openings.forEach((o) => { for (const k of ['ent', 'ent2', 'shutEnt']) if (o[k]) ids.add(o[k]); });
  S.items.forEach((i) => { const e = entOfItem(i); if (e) ids.add(e); if (i.visEnt) ids.add(i.visEnt); });
  S.markers.forEach((m) => { if (m.ent) ids.add(m.ent); });
  S.lights.forEach((l) => { if (l.ent) ids.add(l.ent); });
  return ids;
});

// Home Assistant : plan enregistré pour l'utilisateur, mode maison actif par défaut
let first = true;
onHass(async () => {
  if (!first) return; first = false;
  const u = settings.readonly ? null : await loadUser();
  if (u && u.plan) { try { load(u.plan); } catch (e) { /* plan illisible */ } }
  else if (!had && !settings.readonly) loadSample();
  setLive(true);
});
connectAuto();
setTool('select');
frameAll();
requestAnimationFrame(() => requestAnimationFrame(() => { const hide = document.getElementById('cfg-ro-hide'); if (hide) hide.remove(); const b = $('#boot'); if (b && !b.dataset.keep) { b.classList.add('gone'); setTimeout(() => b.remove(), 500); } }));
// utile à la carte Home Assistant : rapport hauteur / largeur de la vue maison (pour choisir la hauteur de l'iframe)
window.__aspect = () => (settings.cfg ? 99 : viewAspect());   // en mode Configurer le cadre prend toute la hauteur disponible
window.__plan = {   // pratique pour déboguer depuis la console
  S, settings, toScreen: (x, z, y = 0) => { const p = project(x, y, z), r = $('#view').getBoundingClientRect(); return { x: r.left + p.x, y: r.top + p.y }; },
};
