// Plan d'exemple : appartement de 10 × 7 m (séjour-cuisine, chambre, salle de bain).
import { S, nid, rebuildAll, commit, frameAll, select, load } from './core.js';
import { defaultItem } from './catalog.js';
import { defaultOpening } from './openings.js';

export function loadSample() {
  Object.assign(S, { walls: [], openings: [], floors: [], items: [], markers: [], lights: [], nid: 1 });
  const IN = '#f2efe9', OUT = { c: '#e9e1d2', f: 'crepi' };
  const wall = (x1, z1, x2, z2, fa = { c: IN, f: 'peinture' }, fb = { c: IN, f: 'peinture' }, h = 2.5) => {
    const w = { id: nid(), x1, z1, x2, z2, t: 0.2, h, fa, fb }; S.walls.push(w); return w;
  };
  // murs extérieurs (face A = intérieur, sens horaire)
  const n = wall(0, 0, 10, 0, { c: IN, f: 'peinture' }, OUT), e = wall(10, 0, 10, 7, { c: IN, f: 'peinture' }, OUT),
    s = wall(10, 7, 0, 7, { c: IN, f: 'peinture' }, OUT), w = wall(0, 7, 0, 0, { c: '#d9e2ea', f: 'peinture' }, OUT);
  const cloison = wall(6.5, 0, 6.5, 7, { c: IN, f: 'peinture' }, { c: '#8fa6b8', f: 'peinture' });
  cloison.t = 0.12;
  const sdb = wall(6.5, 4, 10, 4, { c: '#ffffff', f: 'faience' }, { c: '#8fa6b8', f: 'peinture' }); sdb.t = 0.12;
  // sols
  const fl = (x, z, ww, d, mat, color, scale = 1) => S.floors.push({ id: nid(), x, z, w: ww, d, mat, color, scale });
  fl(0, 0, 6.5, 7, 'parquet', '#e0bb8c'); fl(6.5, 0, 3.5, 4, 'moquette', '#b9a89a'); fl(6.5, 4, 3.5, 3, 'tile4', '#d6d3cc');
  // ouvertures
  const op = (kind, model, wall2, ss, extra = {}) => { const o = { ...defaultOpening(kind, model), id: nid(), wall: wall2.id, s: ss, ...extra }; S.openings.push(o); return o; };
  op('door', 'entree', s, 8.0, { w: 0.95, frame: '#2e3338', leaf: '#3d5a6c', mat: 'alu', side: 1 });
  op('window', 'baie3', w, 3.5, { w: 3.0, frame: '#2e3338', mat: 'alu', handle: 'noir' });
  op('window', 'battant2', n, 2.05, { w: 1.2, y0: 0.95, h: 1.2, frame: '#ffffff', shutter: true, shutterColor: '#c9c2b4', bars: 0 });
  op('window', 'battant2', n, 8.25, { w: 1.2, frame: '#ffffff', bars: 2 });
  op('window', 'battant1', e, 5.6, { w: 0.6, y0: 1.3, h: 0.8, glass: 'depoli' });
  op('door', 'battant', cloison, 2.0, { w: 0.83, hinge: 'L', side: -1, leaf: '#f2efe9', mat: 'pvc' });
  op('door', 'coulissante', cloison, 5.5, { w: 0.83, side: -1, leaf: '#e9e4da', mat: 'bois' });
  // meubles
  const it = (model, x, z, rot = 0, extra = {}) => { const o = { ...defaultItem(model), id: nid(), x, z, rot, ...extra }; S.items.push(o); return o; };
  // cuisine le long du mur nord
  it('frigo', 0.4, 0.43); it('kbas80', 1.1, 0.4); it('kevier', 2.1, 0.4, 0, { c2: '#d9c3a5' }); it('ktiroirs', 3.0, 0.4); it('cuisiniere', 3.6, 0.4);
  it('kbas60', 4.2, 0.4); it('hotte', 3.6, 0.35, 0, { elev: 1.55 });
  it('khaut', 1.2, 0.3, 0, { w: 0.8, elev: 1.5 }); it('khaut', 4.55, 0.3, 0, { elev: 1.5, w: 0.6 });
  it('lavevaisselle', 4.8, 0.4);
  // séjour
  it('canape3', 2.6, 3.9, 90, { c1: '#8fa6b8' }); it('tablebasse', 3.9, 3.9, 90); it('tapis', 3.5, 3.9, 0, { c1: '#c9b79c', c2: '#b9a89a', w: 2.2, d: 2.2 });
  it('meubletv', 6.18, 3.9, 270); it('tv', 6.18, 3.9, 270, { elev: 0.5 });
  it('fauteuil', 4.9, 2.7, 320, { c1: '#d6a69a' });
  it('table', 3.2, 5.95, 0, { d: 0.85 }); [[2.7, 5.28, 0], [3.7, 5.28, 0], [2.7, 6.62, 180], [3.7, 6.62, 180]].forEach(([x, z, r]) => it('chaise', x, z, r));
  it('biblio', 0.26, 6.4, 90, {}); it('plante', 5.9, 6.5, 0); it('lampadaire', 5.8, 1.8, 0);
  // chambre
  it('lit160', 8.85, 1.9, 270, { c2: '#9db4c0' }); it('chevet', 9.7, 0.7, 270); it('chevet', 9.7, 3.1, 270);
  it('armoire3', 8.0, 3.64, 180); it('commode', 7.2, 0.35, 0);
  // salle de bain
  it('baignoire', 9.05, 6.5, 180); it('douche', 7.1, 6.4, 180); it('vasque', 9.66, 4.95, 270); it('miroir', 9.88, 4.95, 270);
  it('wc', 7.9, 4.5, 0); it('seche_serv', 7.9, 6.85, 180, { elev: 0.5 });
  // lumières (groupes de points lumineux) et capteurs d'exemple : non reliés, à relier à vos entités (panneau de droite → champ « Entité »)
  const lgrp = (name, x, z, pts) => {
    const g = { id: nid(), name, ent: '', ic: 'mdi:ceiling-light', x, z, h: 2 }; S.lights.push(g);
    pts.forEach(([px, pz]) => { const o = { ...defaultItem('spot'), id: nid(), x: px, z: pz, rot: 0, grp: g.id, ent: '' }; S.items.push(o); });
  };
  lgrp('Lumière séjour', 3.2, 3.5, [[2.2, 2.4], [4.2, 2.4], [2.2, 4.6], [4.2, 4.6]]);
  lgrp('Lumière chambre', 8.5, 2.0, [[8.0, 1.2], [9.0, 2.8]]);
  lgrp('Lumière salle de bain', 8.2, 5.5, [[8.2, 5.5]]);
  const pin = (x, z, ic, title) => S.markers.push({ ent: '', ic, h: 2, title, action: 'auto', id: nid(), x, z });
  pin(8.0, 0.1, 'mdi:window-closed-variant', 'Fenêtre chambre (exemple)');
  pin(2.0, 6.9, 'mdi:door', 'Porte d\'entrée (exemple)');
  pin(5.0, 2.0, 'mdi:motion-sensor', 'Présence séjour (exemple)');
  pin(3.0, 1.6, 'mdi:thermometer', 'Température (exemple)');
  rebuildAll(); commit(); select(null); frameAll();
  void load;
}
