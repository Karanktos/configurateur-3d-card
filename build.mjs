// Construit dist/configurateur-3d-card.js : UN seul fichier (carte Home Assistant + application compressée), le format attendu par HACS.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
// three.js est embarqué dans le fichier (aucune ressource externe : fonctionne sans internet)
// empreinte du code des textures : change la clé du cache IndexedDB (js/texcache.js) dès qu'une texture est modifiée
const TEXV = createHash('sha1').update(readFileSync('js/texgen.js')).update(readFileSync('js/textures.js')).digest('hex').slice(0, 10);
const out = await build({ entryPoints: ['js/main.js'], bundle: true, minify: true, format: 'esm', write: false, legalComments: 'none', define: { __TEXV__: JSON.stringify(TEXV) } });
const code = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const index = readFileSync('index.html', 'utf8');
const css = index.match(/<style>([\s\S]*?)<\/style>/)[1], body = index.match(/<body>([\s\S]*?)<script type="module"/)[1];
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Configurateur 3D</title><style>${css}</style></head><body>${body}<script type="module" onerror="document.getElementById('boot').textContent='Impossible de démarrer le configurateur 3D.'">${code}</script></body></html>`;
const b64 = gzipSync(Buffer.from(html, 'utf8'), { level: 9 }).toString('base64');
const card = readFileSync('card.js', 'utf8').replace('export function defineCard', 'function defineCard');
const file = `${card}
(() => {
  const B64 = '${b64}';
  const getHtml = async () => {
    const bin = atob(B64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  };
  defineCard(getHtml);
})();
`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/configurateur-3d-card.js', file);
console.log(`dist/configurateur-3d-card.js : ${(file.length / 1024).toFixed(0)} Ko`);
