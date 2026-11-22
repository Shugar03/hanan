/**
 * Planetario: helpers puros (sin I/O) para pasar del catálogo J2000 al cielo local y a la pantalla.
 * Marco horizontal local "ENU": x = este, y = norte, z = cénit. Azimut desde el norte hacia el este.
 */
import * as A from 'astronomy-engine';

export type Pt = { lat: number; lon: number; elevationM: number };
export type Vec3 = [number, number, number];
/** Matriz 3×3 por filas: v' = M · v */
export type Mat3 = [number, number, number, number, number, number, number, number, number];

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export const observerOf = (p: Pt) => new A.Observer(p.lat, p.lon, p.elevationM);

/** Vector unitario ecuatorial J2000 desde AR (horas) y Dec (grados). */
export function raDecToVec(raH: number, decDeg: number): Vec3 {
  const a = raH * 15 * D2R, d = decDeg * D2R, c = Math.cos(d);
  return [c * Math.cos(a), c * Math.sin(a), Math.sin(d)];
}

/**
 * Matriz J2000 (EQJ) → horizontal ENU para un instante y un punto, con precesión y nutación
 * (astronomy-engine). Se calcula una vez por fecha y se aplica a todo el catálogo.
 */
export function eqjToEnu(date: Date, p: Pt): Mat3 {
  const r = A.Rotation_EQJ_HOR(A.MakeTime(date), observerOf(p)).rot; // HOR: x norte, y oeste, z cénit; v'_j = Σ_i r[i][j] v_i
  // fila E = -fila oeste, N = norte, U = cénit
  return [
    -r[0][1], -r[1][1], -r[2][1],
    r[0][0], r[1][0], r[2][0],
    r[0][2], r[1][2], r[2][2],
  ];
}

export function mulVec(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** Altura/azimut (grados, geométricos) de un vector ENU. */
export function enuToAltAz(v: Vec3): { altDeg: number; azDeg: number } {
  const alt = Math.asin(Math.max(-1, Math.min(1, v[2]))) * R2D;
  let az = Math.atan2(v[0], v[1]) * R2D;
  if (az < 0) az += 360;
  return { altDeg: alt, azDeg: az };
}

export function altAzToEnu(altDeg: number, azDeg: number): Vec3 {
  const a = altDeg * D2R, z = azDeg * D2R, c = Math.cos(a);
  return [c * Math.sin(z), c * Math.cos(z), Math.sin(a)];
}

/** AR/Dec J2000 → altura/azimut locales. `refraction` suma la refracción atmosférica estándar. */
export function radecToAltAz(date: Date, p: Pt, raH: number, decDeg: number, refraction = true) {
  const r = enuToAltAz(mulVec(eqjToEnu(date, p), raDecToVec(raH, decDeg)));
  if (refraction) r.altDeg += A.Refraction('normal', r.altDeg);
  return r;
}

/** Cuerpo del sistema solar → altura/azimut aparentes (con refracción). */
export function bodyAltAz(body: A.Body, date: Date, p: Pt) {
  const o = observerOf(p);
  const eq = A.Equator(body, date, o, true, true);
  const h = A.Horizon(date, o, eq.ra, eq.dec, 'normal');
  return { altDeg: h.altitude, azDeg: h.azimuth, distAu: eq.dist };
}

/** Próxima salida y puesta (dentro de ~1 día) de un cuerpo o de una estrella J2000. null = no ocurre (circumpolar o no sale). */
export function riseSet(date: Date, p: Pt, target: A.Body | { raH: number; decDeg: number }) {
  const o = observerOf(p);
  let body: A.Body;
  if (typeof target === 'object') {
    A.DefineStar(A.Body.Star1, target.raH, target.decDeg, 1000);
    body = A.Body.Star1;
  } else body = target;
  const start = new Date(date.getTime() - 12 * 3600_000);
  const rise = A.SearchRiseSet(body, o, +1, start, 1.1)?.date ?? null;
  const set = A.SearchRiseSet(body, o, -1, start, 1.1)?.date ?? null;
  return { rise, set };
}

/** Estrella que nunca se pone / nunca sale desde la latitud (ignorando refracción). */
export function circumpolar(decDeg: number, latDeg: number): 'siempre' | 'nunca' | null {
  if (latDeg < 0 ? decDeg < -90 - latDeg : decDeg > 90 - latDeg) return 'siempre';
  if (latDeg < 0 ? decDeg > 90 + latDeg : decDeg < latDeg - 90) return 'nunca';
  return null;
}

// ---------- Cámara y proyección estereográfica ----------

export type Camera = {
  /** centro de la vista */
  azDeg: number; altDeg: number;
  /** campo de visión en la diagonal de la pantalla, en grados */
  fovDeg: number;
  width: number; height: number;
};

export type CamBasis = { r: Vec3; u: Vec3; f: Vec3; scale: number; cx: number; cy: number };

export function cameraBasis(c: Camera): CamBasis {
  const a = c.altDeg * D2R, z = c.azDeg * D2R;
  const ca = Math.cos(a), sa = Math.sin(a), cz = Math.cos(z), sz = Math.sin(z);
  const f: Vec3 = [sz * ca, cz * ca, sa];
  const r: Vec3 = [cz, -sz, 0];
  const u: Vec3 = [-sz * sa, -cz * sa, ca];
  const halfDiag = Math.hypot(c.width, c.height) / 2;
  const scale = halfDiag / (2 * Math.tan((c.fovDeg * D2R) / 4));
  return { r, u, f, scale, cx: c.width / 2, cy: c.height / 2 };
}

/** Coordenadas de cámara (X derecha, Y arriba, Z hacia adelante) de un vector ENU. */
export function toCam(b: CamBasis, v: Vec3): Vec3 {
  return [
    v[0] * b.r[0] + v[1] * b.r[1] + v[2] * b.r[2],
    v[0] * b.u[0] + v[1] * b.u[1] + v[2] * b.u[2],
    v[0] * b.f[0] + v[1] * b.f[1] + v[2] * b.f[2],
  ];
}

/** Proyección estereográfica de coordenadas de cámara a píxeles. */
export function projectCam(b: CamBasis, X: number, Y: number, Z: number): [number, number] {
  const k = (2 * b.scale) / (1 + Math.max(Z, -0.9999));
  return [b.cx + X * k, b.cy - Y * k];
}

/** Inversa: píxel → vector ENU (para el arrastre y para tocar el cielo). */
export function unproject(b: CamBasis, px: number, py: number): Vec3 {
  const x = (px - b.cx) / (2 * b.scale), y = (b.cy - py) / (2 * b.scale);
  const rho2 = x * x + y * y;
  const Z = (1 - rho2) / (1 + rho2), s = 2 / (1 + rho2);
  const X = x * s, Y = y * s;
  return [
    X * b.r[0] + Y * b.u[0] + Z * b.f[0],
    X * b.r[1] + Y * b.u[1] + Z * b.f[1],
    X * b.r[2] + Y * b.u[2] + Z * b.f[2],
  ];
}

/** Radio del disco de una estrella (px CSS) según su magnitud. */
export const starRadius = (mag: number, fovDeg = 100) =>
  Math.max(0.55, (3.1 - 0.5 * mag)) * Math.min(1.8, Math.max(0.85, Math.sqrt(100 / fovDeg)));

/** Magnitud límite según la altura del Sol (día ≈ solo lo más brillante). */
export function limitingMag(sunAltDeg: number): number {
  if (sunAltDeg <= -15) return 5.5;
  if (sunAltDeg >= 0) return -1.6;
  const t = (sunAltDeg + 15) / 15;
  return 5.5 - t * 7.1;
}

/** Punto cardinal en español para un azimut. */
export function cardinal(azDeg: number): string {
  const N = ['Norte', 'Noreste', 'Este', 'Sudeste', 'Sur', 'Sudoeste', 'Oeste', 'Noroeste'];
  return N[Math.round((((azDeg % 360) + 360) % 360) / 45) % 8];
}
