// Génère js/mdi.js : les chemins SVG (Material Design Icons) des icônes utilisées par l'interface et les pastilles.
// Usage : node tools/gen-mdi.mjs   (nécessite @mdi/js en devDependency)
import * as MDI from '@mdi/js';
import { writeFileSync } from 'node:fs';
const NAMES = `lightbulb lightbulb-on lightbulb-off ceiling-light wall-sconce-flat post-lamp spotlight-beam floor-lamp lightbulb-fluorescent-tube lightbulb-spot lamps
cctv doorbell-video video webcam camera motion-sensor door door-open window-open-variant window-closed-variant garage garage-open gate shower stairs grill thermometer
power fan blinds blinds-open cog water-pump gesture-tap theme-light-dark white-balance-sunny weather-night rotate-3d-variant arrow-up arrow-down stop
shield-home shield-lock shield-off-outline bell-ring bell car car-estate home lock lock-open-variant radiator fire water sprinkler flower television sofa bed fridge washing-machine
air-conditioner robot-vacuum solar-power ev-station speaker account eye wall window-shutter mailbox balcony tent pool bathtub toilet kettle microwave stove coffee desk
smoke-detector alarm-light cctv-off led-strip-variant power-plug heat-wave snowflake water-percent gas-cylinder flash high-definition`.split(/\s+/).filter(Boolean);
const camel = (n) => 'mdi' + n.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('');
const out = {}; const miss = [];
for (const n of NAMES) { const p = MDI[camel(n)]; if (p) out['mdi:' + n] = p; else miss.push(n); }
if (miss.length) console.warn('introuvables :', miss.join(' '));
const body = Object.entries(out).map(([k, v]) => `  '${k}': '${v}',`).join('\n');
writeFileSync(new URL('../js/mdi.js', import.meta.url), `// Généré par tools/gen-mdi.mjs (ne pas modifier à la main) — icônes Material Design Icons (Apache 2.0).
const P = {
${body}
};
export const hasIcon = (n) => !!P[n];
export const iconPath = (n) => P[n] || P['mdi:cog'];
// <svg> prêt à l'emploi (la taille est donnée par le CSS du parent)
export const svg = (n) => \`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="\${iconPath(n)}"/></svg>\`;
export const ICON_NAMES = Object.keys(P);
`);
console.log(Object.keys(out).length, 'icônes');
