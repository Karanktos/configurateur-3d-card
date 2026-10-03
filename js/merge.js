// Fusion des pièces fixes d'un objet (meuble, porte, fenêtre) : un maillage par matériau au lieu de dizaines de petits.
// Chaque pièce animée (porte de meuble, tiroir, vantail, volet) garde son propre maillage fusionné et bouge toujours ; les matériaux sont conservés tels quels,
// donc les effets qui agissent sur un matériau (lueur d'une lampe, couleur) continuent de fonctionner.
import * as THREE from 'three';

const KEEP = ['position', 'normal', 'uv'];
// géométries non indexées ayant exactement position / normal / uv → une seule géométrie (simple concaténation)
function concat(geos) {
  const g = new THREE.BufferGeometry();
  for (const [n, size] of [['position', 3], ['normal', 3], ['uv', 2]]) {
    const out = new Float32Array(geos.reduce((a, x) => a + x.attributes[n].count * size, 0)); let off = 0;
    for (const x of geos) { const a = x.attributes[n].array; out.set(a, off); off += a.length; }
    g.setAttribute(n, new THREE.BufferAttribute(out, size));
  }
  g.computeBoundingSphere(); return g;
}

export function mergeStatic(root, ...partLists) {
  const anim = new Set();
  for (const l of partLists) for (const a of l || []) if (a.o) anim.add(a.o);
  root.updateMatrixWorld(true);
  // chaque maillage est rattaché à son « porteur » : la pièce mobile la plus proche qui le contient, ou l'objet entier ;
  // on fusionne par porteur et par matériau, le maillage fusionné est ajouté au porteur (il bouge donc avec lui)
  const groups = new Map(), invs = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || o.renderOrder || anim.has(o)) return;
    let owner = null;
    for (let p = o.parent; p; p = p.parent) { if (!p.visible) return; if (anim.has(p) || p === root) { owner = p; break; } }
    if (!owner || !o.visible) return;
    let inv = invs.get(owner); if (!inv) invs.set(owner, (inv = owner.matrixWorld.clone().invert()));
    const rel = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    if (rel.determinant() < 0) return;   // symétrie : l'ordre des faces serait inversé
    const k = owner.uuid + o.material.uuid + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '');
    let list = groups.get(k); if (!list) groups.set(k, (list = []));
    list.push([o, rel, owner]);
  });
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const geos = list.map(([m, mat]) => {
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      for (const n of Object.keys(g.attributes)) if (!KEEP.includes(n)) g.deleteAttribute(n);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.morphAttributes = {}; g.clearGroups(); g.applyMatrix4(mat);
      for (const n of KEEP) {   // attribut entrelacé ou non flottant → tableau Float32 simple
        const a = g.attributes[n]; if (!a.isInterleavedBufferAttribute && a.array instanceof Float32Array) continue;
        const out = new Float32Array(a.count * a.itemSize);
        for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) out[i * a.itemSize + c] = a.getComponent(i, c);
        g.setAttribute(n, new THREE.BufferAttribute(out, a.itemSize));
      }
      return g;
    });
    const merged = concat(geos);
    geos.forEach((g) => g.dispose());
    const [m0, , owner] = list[0], mesh = new THREE.Mesh(merged, m0.material);
    mesh.castShadow = m0.castShadow; mesh.receiveShadow = m0.receiveShadow;
    owner.add(mesh);
    for (const [m] of list) { m.parent.remove(m); m.geometry.dispose(); }
  }
  return root;
}
