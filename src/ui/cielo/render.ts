/** Planetario en canvas 2D. La escena (alt/az de todo) se calcula una vez por fecha; cada frame solo proyecta. */
import * as A from 'astronomy-engine';
import sky from '../../data/catalog/sky.json';
import { LMC, SGR_A, SMC } from '../../sky/ephemeris';
import {
  altAzToEnu, bodyAltAz, cameraBasis, eqjToEnu, limitingMag, mulVec, projectCam, raDecToVec, starRadius, toCam,
  type CamBasis, type Camera, type Pt, type Vec3,
} from '../../sky/stars';

type Star = [number, number, number, number, number];
type Cons = { id: string; es: string; gen: string; rank: number; at: [number, number]; l: number[][] };
const STARS = sky.stars as Star[];
const CONS = sky.cons as Cons[];
const MW = sky.mw as number[][][];
const NAMES = new Map<number, string>((sky.named as [number, string][]).map(([i, n]) => [i, n]));
/** Las ~25 más brillantes con nombre propio: etiqueta siempre visible. */
const TOP_NAMED = new Set(
  [...NAMES.entries()].filter(([, n]) => !/^[α-ω] /.test(n)).sort((a, b) => STARS[a[0]][2] - STARS[b[0]][2]).slice(0, 26).map(([i]) => i),
);

// Vectores J2000 precalculados una sola vez
const STAR_J = new Float64Array(STARS.length * 3);
STARS.forEach((s, i) => STAR_J.set(raDecToVec(s[0], s[1]), i * 3));
const toJ = (flat: number[]) => {
  const out = new Float64Array((flat.length / 2) * 3);
  for (let i = 0; i < flat.length / 2; i++) out.set(raDecToVec(flat[i * 2], flat[i * 2 + 1]), i * 3);
  return out;
};
const CONS_J = CONS.map((c) => ({ ...c, lj: c.l.map(toJ), atJ: raDecToVec(c.at[0], c.at[1]) }));
const MW_J = MW.map((level) => level.map(toJ));

export type Colors = { bg: Rgb; surface: Rgb; border: Rgb; text: Rgb; text2: Rgb; accent: Rgb; warm: Rgb; font: string; red: boolean };
type Rgb = [number, number, number];

export function readColors(el: Element): Colors {
  const cs = getComputedStyle(el);
  const v = (n: string) => parseColor(cs.getPropertyValue(n));
  return {
    bg: v('--bg'), surface: v('--surface'), border: v('--border'), text: v('--text'), text2: v('--text-2'),
    accent: v('--accent'), warm: v('--accent-warm'),
    font: cs.getPropertyValue('--font-texto').trim() || 'sans-serif',
    red: document.documentElement.getAttribute('data-modo') === 'rojo',
  };
}
function parseColor(s: string): Rgb {
  s = s.trim();
  if (s.startsWith('#')) {
    const h = s.length === 4 ? s.slice(1).split('').map((c) => c + c).join('') : s.slice(1, 7);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const m = s.match(/[\d.]+/g);
  return m ? [+m[0], +m[1], +m[2]] : [128, 128, 128];
}
const rgba = (c: Rgb, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export type Sat = { name: string; azDeg: number; altDeg: number; visible: boolean };

export type Picked =
  | { kind: 'star'; name: string; sub: string; mag: number; altDeg: number; azDeg: number; raH: number; decDeg: number; v: Vec3; extra?: string }
  | { kind: 'body'; body: A.Body; name: string; sub: string; mag?: number; altDeg: number; azDeg: number; v: Vec3; extra?: string }
  | { kind: 'sat'; name: string; sub: string; altDeg: number; azDeg: number; v: Vec3; extra?: string }
  | { kind: 'dso'; name: string; sub: string; mag?: number; altDeg: number; azDeg: number; raH: number; decDeg: number; v: Vec3; extra?: string };

type Body = { body: A.Body; name: string; altDeg: number; azDeg: number; v: Vec3; mag: number };

export type Scene = {
  date: Date; p: Pt;
  star: Float64Array; // ENU por estrella
  cons: { id: string; es: string; at: Vec3; lines: Float64Array[] }[];
  mw: Float64Array[][];
  sun: Body; moon: Body & { phase: number; illum: number; phaseName: string }; planets: Body[];
  dso: { name: string; sub: string; raH: number; decDeg: number; v: Vec3; sizeDeg: [number, number]; mag?: number; extra?: string }[];
  sats: (Sat & { v: Vec3 })[];
  silhouette: (az: number) => number;
};

const PLANETS: [A.Body, string][] = [
  [A.Body.Mercury, 'Mercurio'], [A.Body.Venus, 'Venus'], [A.Body.Mars, 'Marte'], [A.Body.Jupiter, 'Júpiter'], [A.Body.Saturn, 'Saturno'],
];

const applyFlat = (m: ReturnType<typeof eqjToEnu>, src: Float64Array) => {
  const out = new Float64Array(src.length);
  for (let i = 0; i < src.length; i += 3) {
    const x = src[i], y = src[i + 1], z = src[i + 2];
    out[i] = m[0] * x + m[1] * y + m[2] * z;
    out[i + 1] = m[3] * x + m[4] * y + m[5] * z;
    out[i + 2] = m[6] * x + m[7] * y + m[8] * z;
  }
  return out;
};

function hash(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; }

/** Silueta de cerros (grados sobre el horizonte), determinística por punto. */
function makeSilhouette(name: string) {
  const s = hash(name) * 10;
  const peak = (hash(name + 'v') * 360) | 0;
  return (az: number) => {
    const a = (az * Math.PI) / 180;
    const d = ((az - peak + 540) % 360) - 180;
    const h = 1.6 + 1.1 * Math.sin(2 * a + s) + 0.7 * Math.sin(5 * a + s * 1.7) + 0.35 * Math.sin(13 * a + s * 2.3) + 0.15 * Math.sin(31 * a + s) + 4.2 * Math.exp(-(d * d) / 40);
    return Math.max(0.3, h);
  };
}

export function buildScene(date: Date, p: Pt & { name: string }, sats: Sat[]): Scene {
  const m = eqjToEnu(date, p);
  const body = (b: A.Body, name: string): Body => {
    const h = bodyAltAz(b, date, p);
    let mag = -26.7;
    if (b !== A.Body.Sun) try { mag = A.Illumination(b, date).mag; } catch { mag = 0; }
    return { body: b, name, altDeg: h.altDeg, azDeg: h.azDeg, v: altAzToEnu(h.altDeg, h.azDeg), mag };
  };
  const moonB = body(A.Body.Moon, 'Luna');
  const ill = A.Illumination(A.Body.Moon, date);
  const phase = A.MoonPhase(date);
  const dsoDef: { name: string; sub: string; ra: number; dec: number; size: [number, number]; mag?: number; extra?: string }[] = [
    { name: 'Centro galáctico', sub: 'Núcleo de la Vía Láctea · Sagitario A*', ...SGR_A, size: [3, 3], extra: 'A 26.000 años luz' },
    { name: 'Gran Nube de Magallanes', sub: 'Galaxia satélite', ...LMC, size: [10.8, 9.2], mag: 0.9, extra: 'A 160.000 años luz' },
    { name: 'Pequeña Nube de Magallanes', sub: 'Galaxia satélite', ...SMC, size: [5.3, 3.1], mag: 2.7, extra: 'A 200.000 años luz' },
  ];
  return {
    date, p,
    star: applyFlat(m, STAR_J),
    cons: CONS_J.map((c) => ({ id: c.id, es: c.es, at: mulVec(m, c.atJ), lines: c.lj.map((l) => applyFlat(m, l)) })),
    mw: MW_J.map((lvl) => lvl.map((r) => applyFlat(m, r))),
    sun: body(A.Body.Sun, 'Sol'),
    moon: { ...moonB, mag: ill.mag, phase, illum: ill.phase_fraction, phaseName: moonPhaseName(phase) },
    planets: PLANETS.map(([b, n]) => body(b, n)),
    dso: dsoDef.map((d) => ({ name: d.name, sub: d.sub, raH: d.ra, decDeg: d.dec, v: mulVec(m, raDecToVec(d.ra, d.dec)), sizeDeg: d.size, mag: d.mag, extra: d.extra })),
    sats: sats.map((s) => ({ ...s, v: altAzToEnu(s.altDeg, s.azDeg) })),
    silhouette: makeSilhouette(p.name),
  };
}

function moonPhaseName(ang: number) {
  if (ang < 22.5 || ang >= 337.5) return 'Luna nueva';
  if (ang < 67.5) return 'Luna creciente';
  if (ang < 112.5) return 'Cuarto creciente';
  if (ang < 157.5) return 'Gibosa creciente';
  if (ang < 202.5) return 'Luna llena';
  if (ang < 247.5) return 'Gibosa menguante';
  if (ang < 292.5) return 'Cuarto menguante';
  return 'Luna menguante';
}

let _mw: HTMLCanvasElement | null = null;
function mwCanvas(w: number, h: number) {
  if (!_mw) _mw = document.createElement('canvas');
  if (_mw.width !== w || _mw.height !== h) { _mw.width = w; _mw.height = h; }
  return _mw;
}

type Hit = { x: number; y: number; r: number; prio: number; pick: () => Picked };

const ZC = -0.3; // plano de recorte detrás de la cámara

/** Dibuja un frame. Devuelve los blancos tocables. */
export function draw(ctx: CanvasRenderingContext2D, sc: Scene, cam: Camera, col: Colors, selected: Vec3 | null): Hit[] {
  const W = cam.width, H = cam.height;
  const b = cameraBasis(cam);
  const hits: Hit[] = [];
  const labels: [number, number, number, number][] = [];
  const free = (x: number, y: number, w: number, h: number) => {
    for (const l of labels) if (x < l[0] + l[2] && x + w > l[0] && y < l[1] + l[3] && y + h > l[1]) return false;
    labels.push([x, y, w, h]); return true;
  };
  const font = (px: number, w = 500) => `${w} ${px}px ${col.font}`;
  const zoom = Math.min(1.8, Math.max(0.8, Math.sqrt(100 / cam.fovDeg)));

  // ---- fondo: noche → crepúsculo → día
  const sunAlt = sc.sun.altDeg;
  const day = smooth(-12, 3, sunAlt);
  const daySky = col.red ? mix(col.bg, col.border, 0.9) : mix(col.border, col.text2, 0.45);
  ctx.fillStyle = rgba(mix(mix(col.bg, col.surface, 0.45), daySky, day));
  ctx.fillRect(0, 0, W, H);
  const sunC = toCam(b, sc.sun.v);
  if (sunAlt > -18 && sunC[2] > -0.15) {
    const [sx, sy] = projectCam(b, sunC[0], sunC[1], sunC[2]);
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, b.scale * 2.4);
    const a = 0.38 * smooth(-18, -2, sunAlt) * (1 - 0.6 * smooth(5, 25, sunAlt));
    g.addColorStop(0, rgba(col.warm, a)); g.addColorStop(1, rgba(col.warm, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  const night = 1 - day;

  // ---- Vía Láctea: se dibuja a 1/4 de resolución y se escala (difuminado barato)
  if (night > 0.05) {
    const q = 4, mw = mwCanvas(Math.ceil(W / q), Math.ceil(H / q));
    const m = mw.getContext('2d')!;
    m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, mw.width, mw.height);
    m.setTransform(1 / q, 0, 0, 1 / q, 0, 0);
    m.fillStyle = rgba(col.text, col.red ? 0.07 : 0.06);
    for (const level of sc.mw) {
      m.beginPath();
      for (const ring of level) clippedRing(m, b, ring);
      m.fill('evenodd');
    }
    ctx.save(); ctx.globalAlpha = night; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(mw, 0, 0, mw.width * q, mw.height * q); ctx.restore();
  }

  // ---- Nubes de Magallanes y centro galáctico
  for (const d of sc.dso) {
    const c = toCam(b, d.v);
    if (c[2] < 0.2 || d.v[2] < -0.05) continue;
    const [x, y] = projectCam(b, c[0], c[1], c[2]);
    const pxDeg = (b.scale * Math.PI) / 180 * (2 / (1 + c[2]));
    if (d.name !== 'Centro galáctico') {
      const rx = (d.sizeDeg[0] / 2) * pxDeg, ry = (d.sizeDeg[1] / 2) * pxDeg;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, rgba(col.text, 0.16 * night)); g.addColorStop(0.6, rgba(col.text, 0.06 * night)); g.addColorStop(1, rgba(col.text, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      hits.push({ x, y, r: Math.max(18, rx * 0.8), prio: 1, pick: () => pickDso(d) });
      label(d.name === 'Gran Nube de Magallanes' ? 'Gran Nube' : 'Pequeña Nube', x, y + ry + 12, rgba(col.text2, 0.85), font(10), true);
    } else {
      ctx.strokeStyle = rgba(col.accent, 0.75); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x - 11, y); ctx.moveTo(x + 11, y); ctx.lineTo(x + 14, y); ctx.stroke();
      hits.push({ x, y, r: 20, prio: 2, pick: () => pickDso(d) });
      label('Centro galáctico', x, y + 24, rgba(col.accent, 0.9), font(10, 600), true);
    }
  }

  // ---- constelaciones
  ctx.lineCap = 'round';
  for (const c of sc.cons) {
    const crux = c.id === 'Cru';
    ctx.strokeStyle = crux ? rgba(col.accent, 0.85) : rgba(col.text2, (col.red ? 0.42 : 0.3) * (0.35 + 0.65 * night));
    ctx.lineWidth = crux ? 1.6 : 1;
    ctx.beginPath();
    for (const ln of c.lines) {
      let pen = false;
      for (let i = 0; i < ln.length; i += 3) {
        const X = ln[i] * b.r[0] + ln[i + 1] * b.r[1] + ln[i + 2] * b.r[2];
        const Y = ln[i] * b.u[0] + ln[i + 1] * b.u[1] + ln[i + 2] * b.u[2];
        const Z = ln[i] * b.f[0] + ln[i + 1] * b.f[1] + ln[i + 2] * b.f[2];
        if (Z < 0) { pen = false; continue; }
        const [x, y] = projectCam(b, X, Y, Z);
        // separa un poco las líneas de las estrellas
        if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        pen = true;
      }
    }
    ctx.stroke();
  }

  // ---- estrellas
  const lim = limitingMag(sunAlt) + (cam.fovDeg < 60 ? 0.4 : 0);
  const S = sc.star;
  const baseStar = col.text;
  const warmStar = mix(col.text, col.warm, col.red ? 0.2 : 0.45);
  const minZ = Math.cos(Math.min(Math.PI * 0.95, ((cam.fovDeg / 2 + 8) * Math.PI) / 180));
  for (let i = 0; i < STARS.length; i++) {
    const mag = STARS[i][2];
    if (mag > lim) continue;
    const vx = S[i * 3], vy = S[i * 3 + 1], vz = S[i * 3 + 2];
    if (vz < -0.02) continue;
    const Z = vx * b.f[0] + vy * b.f[1] + vz * b.f[2];
    if (Z < minZ) continue;
    const X = vx * b.r[0] + vy * b.r[1] + vz * b.r[2];
    const Y = vx * b.u[0] + vy * b.u[1] + vz * b.u[2];
    const [x, y] = projectCam(b, X, Y, Z);
    if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue;
    const r = starRadius(mag, cam.fovDeg);
    const bv = STARS[i][3];
    const c = bv > 0.9 ? mix(baseStar, warmStar, Math.min(1, (bv - 0.9) / 0.9)) : baseStar;
    const ext = vz < 0.08 ? 0.45 + 0.55 * Math.max(0, vz / 0.08) : 1; // extinción cerca del horizonte
    const a = Math.min(1, 0.35 + (lim - mag) * 0.28) * ext;
    if (mag < 1.6) {
      ctx.fillStyle = rgba(c, 0.14 * a);
      ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = rgba(c, a);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    const idx = i;
    hits.push({ x, y, r: Math.max(10, r + 6), prio: 3 - mag * 0.3, pick: () => pickStar(idx, sc) });
  }

  // ---- planetas, Luna, Sol
  for (const p of sc.planets) {
    const c = toCam(b, p.v);
    if (c[2] < minZ || p.altDeg < -1) continue;
    const [x, y] = projectCam(b, c[0], c[1], c[2]);
    if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
    const r = Math.max(2.4, starRadius(p.mag, cam.fovDeg) * 0.9);
    ctx.fillStyle = rgba(col.accent, 0.18 * (0.4 + 0.6 * night));
    ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(col.accent);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    hits.push({ x, y, r: 22, prio: 10, pick: () => pickBody(p, 'Planeta') });
    if (x > 2) label(p.name, x + r + 6, y + 4, rgba(col.accent), font(12, 600), false, 'left', 0, x);
  }
  {
    const m = sc.moon, c = toCam(b, m.v);
    if (c[2] > minZ && m.altDeg > -1) {
      const [x, y] = projectCam(b, c[0], c[1], c[2]);
      const pxDeg = (b.scale * Math.PI) / 180 * (2 / (1 + c[2]));
      const r = Math.max(7, 0.26 * pxDeg);
      // dirección del Sol en pantalla (limbo iluminado)
      const sv = sc.sun.v, dot = m.v[0] * sv[0] + m.v[1] * sv[1] + m.v[2] * sv[2];
      const t: Vec3 = [m.v[0] + 0.02 * (sv[0] - dot * m.v[0]), m.v[1] + 0.02 * (sv[1] - dot * m.v[1]), m.v[2] + 0.02 * (sv[2] - dot * m.v[2])];
      const tc = toCam(b, t); const [tx, ty] = projectCam(b, tc[0], tc[1], tc[2]);
      const ang = Math.atan2(ty - y, tx - x);
      const g = ctx.createRadialGradient(x, y, r, x, y, r * 5);
      g.addColorStop(0, rgba(col.text, 0.12 * m.illum)); g.addColorStop(1, rgba(col.text, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 5, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.fillStyle = rgba(mix(col.bg, col.text, 0.14)); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      const k = m.illum, a = r * Math.abs(1 - 2 * k);
      ctx.fillStyle = rgba(col.text, 0.95);
      ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
      if (k < 0.5) ctx.ellipse(0, 0, a, r, 0, Math.PI / 2, -Math.PI / 2, true);
      else ctx.ellipse(0, 0, a, r, 0, Math.PI / 2, (3 * Math.PI) / 2, false);
      ctx.fill(); ctx.restore();
      hits.push({ x, y, r: Math.max(24, r + 8), prio: 12, pick: () => pickBody(m, 'Satélite natural', `${m.phaseName} · ${Math.round(m.illum * 100)} % iluminada`) });
      label('Luna', x, y + r + 15, rgba(col.text), font(12, 600), false);
    }
  }
  if (sunC[2] > minZ && sunAlt > -1) {
    const [x, y] = projectCam(b, sunC[0], sunC[1], sunC[2]);
    const r = Math.max(8, (0.27 * b.scale * Math.PI) / 180 * (2 / (1 + sunC[2])));
    const g = ctx.createRadialGradient(x, y, r, x, y, r * 8);
    g.addColorStop(0, rgba(col.accent, 0.5)); g.addColorStop(1, rgba(col.accent, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(col.accent); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    hits.push({ x, y, r: 28, prio: 14, pick: () => pickBody(sc.sun, 'Estrella · nuestro Sol', 'No mirar directo') });
    label('Sol', x, y + r + 16, rgba(col.accent), font(12, 600), false);
  }

  // ---- satélites
  for (const s of sc.sats) {
    const c = toCam(b, s.v);
    if (c[2] < minZ || s.altDeg < 0) continue;
    const [x, y] = projectCam(b, c[0], c[1], c[2]);
    if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
    const cc = s.visible ? col.accent : col.text2;
    ctx.strokeStyle = rgba(cc, s.visible ? 1 : 0.7); ctx.lineWidth = 1.4;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.strokeRect(-3.5, -3.5, 7, 7); ctx.restore();
    hits.push({ x, y, r: 22, prio: 11, pick: () => ({ kind: 'sat', name: s.name, sub: 'Satélite', altDeg: s.altDeg, azDeg: s.azDeg, v: s.v, extra: s.visible ? 'Visible ahora: iluminado por el Sol' : 'Sobre el horizonte, no visible a ojo' }) });
    label(s.name, x + 9, y + 4, rgba(cc), font(11, 600), false, 'left', 0, x);
  }

  // ---- suelo y silueta
  drawGround(ctx, b, sc, col, day);

  // ---- puntos cardinales
  const CARD = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  for (let i = 0; i < 8; i++) {
    const az = i * 45, v = altAzToEnu(0, az), c = toCam(b, v);
    if (c[2] < 0.05) continue;
    const [x, y] = projectCam(b, c[0], c[1], c[2]);
    if (x < -20 || x > W + 20) continue;
    const main = i % 2 === 0;
    ctx.font = font(main ? 15 : 11, main ? 700 : 500);
    ctx.textAlign = 'center';
    ctx.fillStyle = main ? rgba(i === 0 ? col.accent : col.text) : rgba(col.text2);
    ctx.fillText(CARD[i], x, y + (main ? 26 : 22));
    ctx.fillStyle = rgba(main ? col.text : col.text2, 0.6);
    ctx.fillRect(x - 0.5, y + 2, 1, main ? 7 : 4);
  }

  // ---- etiquetas (de mayor a menor prioridad)
  const crux = sc.cons.find((c) => c.id === 'Cru');
  if (crux) {
    const c = toCam(b, crux.at);
    if (c[2] > 0.2 && crux.at[2] > 0) {
      const [x, y] = projectCam(b, c[0], c[1], c[2]);
      label('Cruz del Sur', x, y + 46 * zoom, rgba(col.accent), font(12, 600), true);
    }
  }
  if (night > 0.2) for (let i = STARS.length - 1; i >= 0; i--) {
    const n = NAMES.get(i);
    if (!n) continue;
    const mag = STARS[i][2];
    const show = TOP_NAMED.has(i) || (cam.fovDeg < 70 && mag < 3.2) || (cam.fovDeg < 45);
    if (!show || mag > lim) continue;
    const vz = S[i * 3 + 2];
    if (vz < 0.01) continue;
    const v: Vec3 = [S[i * 3], S[i * 3 + 1], vz];
    const c = toCam(b, v);
    if (c[2] < 0.1) continue;
    const [x, y] = projectCam(b, c[0], c[1], c[2]);
    if (x < 0 || x > W || y < 0 || y > H) continue;
    label(n, x + starRadius(mag, cam.fovDeg) + 5, y + 4, rgba(col.text2, TOP_NAMED.has(i) ? 0.95 : 0.75), font(11), false, 'left', 0, x);
  }
  if (night > 0.2) for (const c of sc.cons) {
    if (c.id === 'Cru' || c.at[2] < 0.05) continue;
    const cc = toCam(b, c.at);
    if (cc[2] < 0.25) continue;
    const [x, y] = projectCam(b, cc[0], cc[1], cc[2]);
    if (x < 10 || x > W - 10 || y < 10 || y > H - 10) continue;
    label(c.es.toUpperCase(), x, y, rgba(col.text2, (col.red ? 0.6 : 0.5) * night), font(9.5 * Math.min(1.2, zoom), 600), false, 'center', 1.6);
  }

  // ---- selección
  if (selected) {
    const c = toCam(b, selected);
    if (c[2] > 0) {
      const [x, y] = projectCam(b, c[0], c[1], c[2]);
      ctx.strokeStyle = rgba(col.accent); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
    }
  }
  return hits;

  function label(text: string, x: number, y: number, color: string, f: string, force: boolean, align: CanvasTextAlign = 'center', spacing = 0, flipX?: number) {
    ctx.font = f;
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${spacing}px`;
    const w = ctx.measureText(text).width + spacing * text.length;
    if (align === 'left' && x + w > W - 4 && flipX !== undefined) { x = 2 * flipX - x; align = 'right'; }
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    if (!free(x0 - 2, y - 11, w + 4, 14) && !force) { (ctx as any).letterSpacing = '0px'; return; }
    ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(text, x, y);
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px';
  }
}

function pickStar(i: number, sc: Scene): Picked {
  const s = STARS[i];
  const v: Vec3 = [sc.star[i * 3], sc.star[i * 3 + 1], sc.star[i * 3 + 2]];
  const cons = s[4] >= 0 ? CONS[s[4]] : undefined;
  const nm = NAMES.get(i);
  return {
    kind: 'star', name: nm ?? 'Estrella', sub: cons ? `Estrella · ${cons.es}` : 'Estrella', mag: s[2],
    altDeg: (Math.asin(v[2]) * 180) / Math.PI, azDeg: az(v), raH: s[0], decDeg: s[1], v,
  };
}
function pickBody(p: Body, sub: string, extra?: string): Picked {
  return { kind: 'body', body: p.body, name: p.name, sub, mag: p.mag, altDeg: p.altDeg, azDeg: p.azDeg, v: p.v, extra };
}
function pickDso(d: Scene['dso'][number]): Picked {
  return { kind: 'dso', name: d.name, sub: d.sub, mag: d.mag, altDeg: (Math.asin(d.v[2]) * 180) / Math.PI, azDeg: az(d.v), raH: d.raH, decDeg: d.decDeg, v: d.v, extra: d.extra };
}
const az = (v: Vec3) => { const a = (Math.atan2(v[0], v[1]) * 180) / Math.PI; return a < 0 ? a + 360 : a; };
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Anillo recortado contra el plano Z = ZC (detrás de la cámara), con arcos sobre el borde de recorte. */
function clippedRing(ctx: CanvasRenderingContext2D, b: CamBasis, ring: Float64Array) {
  const n = ring.length / 3;
  const pts: [number, number, number][] = [];
  for (let i = 0; i < n; i++) pts.push(toCam(b, [ring[i * 3], ring[i * 3 + 1], ring[i * 3 + 2]]));
  const out: [number, number, number, boolean][] = []; // X, Y, Z, enBorde
  for (let i = 0; i < n; i++) {
    const a = pts[i], c = pts[(i + 1) % n];
    const ain = a[2] >= ZC, cin = c[2] >= ZC;
    if (ain) out.push([a[0], a[1], a[2], false]);
    if (ain !== cin) {
      const t = (ZC - a[2]) / (c[2] - a[2]);
      out.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, ZC, true]);
    }
  }
  if (out.length < 3) return;
  const rr = Math.sqrt(1 - ZC * ZC);
  let first = true;
  for (let i = 0; i < out.length; i++) {
    const p = out[i];
    const [x, y] = projectCam(b, p[0], p[1], p[2]);
    if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
    const q = out[(i + 1) % out.length];
    if (p[3] && q[3]) {
      // arco por el borde de recorte (camino corto)
      let a0 = Math.atan2(p[1], p[0]), a1 = Math.atan2(q[1], q[0]);
      let d = a1 - a0; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
      const steps = Math.ceil(Math.abs(d) / 0.15);
      for (let s = 1; s < steps; s++) {
        const an = a0 + (d * s) / steps;
        const [ax, ay] = projectCam(b, rr * Math.cos(an), rr * Math.sin(an), ZC);
        ctx.lineTo(ax, ay);
      }
    }
  }
  ctx.closePath();
}

/** Suelo: bandas de cuadriláteros chicos desde la silueta hasta el nadir (robusto con cualquier orientación). */
function drawGround(ctx: CanvasRenderingContext2D, b: CamBasis, sc: Scene, col: Colors, day: number) {
  const STEP = 3;
  const bands = [null, -12, -35, -60, -89] as (number | null)[];
  ctx.fillStyle = rgba(mix(col.bg, col.border, 0.5 * day));
  ctx.beginPath();
  const P = (alt: number, a: number) => { const c = toCam(b, altAzToEnu(alt, a)); return c; };
  for (let a = 0; a < 360; a += STEP) {
    for (let k = 0; k < bands.length - 1; k++) {
      const t0 = bands[k], t1 = bands[k + 1]!;
      const q = [P(t0 ?? sc.silhouette(a), a), P(t0 ?? sc.silhouette(a + STEP), a + STEP), P(t1, a + STEP), P(t1, a)];
      if (q.some((c) => c[2] < ZC)) continue;
      const pts = q.map((c) => projectCam(b, c[0], c[1], c[2]));
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < 4; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
    }
  }
  ctx.fill('nonzero');
  // borde de la silueta
  ctx.strokeStyle = rgba(col.text2, 0.35); ctx.lineWidth = 1;
  ctx.beginPath();
  let pen = false;
  for (let a = 0; a <= 360; a += 1.5) {
    const c = P(sc.silhouette(a), a);
    if (c[2] < 0) { pen = false; continue; }
    const [x, y] = projectCam(b, c[0], c[1], c[2]);
    if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    pen = true;
  }
  ctx.stroke();
}
