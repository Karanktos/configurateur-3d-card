// Soleil réel : position calculée localement (latitude / longitude / fuseau de Home Assistant), éclairage jour / nuit continu.
import { cfg } from './ha.js';
const R = Math.PI / 180, D = 180 / Math.PI;
const cl = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = (a, b, x) => { const k = cl((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

export function sunPos(date, lat, lon) {
  const d = date.getTime() / 864e5 - 10957.5, g = (357.529 + 0.98560028 * d) * R, q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * R, e = (23.439 - 4e-7 * d) * R;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
  const H = ((18.697374558 + 24.06570982441908 * d) * 15 + lon) * R - ra, ph = lat * R;
  const el = Math.asin(Math.sin(ph) * Math.sin(dec) + Math.cos(ph) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(ph) - Math.tan(dec) * Math.cos(ph)) * D + 180;
  return { el: el * D, az: ((az % 360) + 360) % 360 };
}
// fuseau horaire : instant UTC d'une date/heure murale dans le fuseau tz
const PF = (tz, o) => new Intl.DateTimeFormat('en-CA', Object.assign({ timeZone: tz, hourCycle: 'h23' }, o));
function parts(ms, tz) { const o = {}; PF(tz, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(ms)).forEach((x) => { o[x.type] = +x.value; }); return o; }
function tzOff(ms, tz) { const o = parts(ms, tz); return Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second) - Math.floor(ms / 1e3) * 1e3; }
export function zoned(y, m, d, h, mi, tz) { let g = Date.UTC(y, m - 1, d, h, mi); g -= tzOff(g, tz); return Date.UTC(y, m - 1, d, h, mi) - tzOff(g, tz); }
export function nowIn(tz) { const o = parts(Date.now(), tz), p = (n) => String(n).padStart(2, '0'); return { d: o.year + '-' + p(o.month) + '-' + p(o.day), m: o.hour * 60 + o.minute }; }

export function place() { const c = cfg(); return { lat: c ? c.latitude : 43.5, lon: c ? c.longitude : 5, tz: (c && c.time_zone) || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }; }

// position du soleil (réel ou simulé)
export function current(sun) {
  const p = place();
  if (sun.mode === 'sim' && sun.date) {
    const [y, mo, d] = sun.date.split('-').map(Number);
    return sunPos(new Date(zoned(y, mo, d, Math.floor(sun.min / 60), sun.min % 60, p.tz)), p.lat, p.lon);
  }
  return sunPos(new Date(), p.lat, p.lon);
}

// éclairage en fonction de la hauteur du soleil : aube, jour, crépuscule, nuit, tout est interpolé
export function lighting(el) {
  const t = sm(-10, 8, el), useSun = el > -0.75;
  return {
    t, useSun, tw: Math.max(0, 1 - Math.abs(el - 1) / 7),
    sun: useSun ? 2.4 * Math.pow(sm(-0.5, 12, el), 0.7) : 0.22 * sm(0, 1, cl((-1 - el) / 8, 0, 1)),
    hemi: 0.14 + 0.81 * t, env: 0.07 + 0.48 * t, exposure: 1.1 - 0.15 * t,
  };
}
export const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
export const compass = (az) => COMPASS[Math.round(az / 22.5) % 16];
