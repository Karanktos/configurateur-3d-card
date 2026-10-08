// Cache persistant des textures procédurales (IndexedDB) : les calculer coûte 1 à 3 s sur un téléphone, les relire quelques dizaines de millisecondes.
// Une entrée = une texture (image WebP sans perte, ou PNG selon le navigateur), clé « version | qualité | nom ». La version change dès que le code des textures change
// (empreinte calculée par build.mjs) : les anciennes entrées sont alors supprimées. Sans IndexedDB ou en développement, tout fonctionne comme avant, sans cache.
const V = typeof __TEXV__ === 'undefined' ? null : __TEXV__;
const DBN = 'cfg3d-textures', ST = 't';
const mem = new Map(), todo = [];
let db = null, timer = 0;
const req = (r) => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });

// à appeler une fois au démarrage, avant la première construction de la scène (borné dans le temps : le démarrage n'attend jamais plus de 1,5 s)
export async function loadTexCache(q) {
  if (!V || typeof indexedDB === 'undefined') return;
  const job = (async () => {
    try {
      db = await new Promise((ok, ko) => { const r = indexedDB.open(DBN, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
      const s = db.transaction(ST, 'readwrite').objectStore(ST), keys = await req(s.getAllKeys()), pre = `${V}|${q}|`, mine = [];
      for (const k of keys) { if (String(k).startsWith(pre)) mine.push(k); else if (!String(k).startsWith(V + '|')) s.delete(k); }   // anciennes versions : supprimées
      await Promise.all(mine.map(async (k) => { try { const b = await req(db.transaction(ST).objectStore(ST).get(k)); if (b) mem.set(k, await createImageBitmap(b)); } catch (e) { /* entrée illisible : recalculée */ } }));
    } catch (e) { db = null; }
  })();
  await Promise.race([job, new Promise((ok) => setTimeout(ok, 1500))]);
}
const key = (q, kind) => `${V}|${q}|${kind}`;
// canevas relu depuis le cache, ou null
export function cachedCanvas(q, kind) {
  const b = V && mem.get(key(q, kind)); if (!b) return null;
  const c = document.createElement('canvas'); c.width = b.width; c.height = b.height; c.getContext('2d').drawImage(b, 0, 0); return c;
}
// mémorise une texture qui vient d'être calculée (écriture différée, hors du chemin critique)
export function saveCanvas(q, kind, canvas) {
  if (!V || !db) return; todo.push([key(q, kind), canvas]);
  if (!timer) timer = setTimeout(flush, 2500);
}
function flush() {
  const it = todo.shift(); if (!it) { timer = 0; return; }
  const [k, c] = it, next = () => { timer = setTimeout(flush, 300); };
  try { c.toBlob((b) => { if (b && db) { try { db.transaction(ST, 'readwrite').objectStore(ST).put(b, k); } catch (e) { /* quota ou base fermée */ } } next(); }, 'image/webp', 1); } catch (e) { next(); }
}
