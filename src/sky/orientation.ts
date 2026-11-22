/**
 * Orientación del teléfono → hacia dónde mira la cámara trasera. Puro (sin I/O).
 *
 * Convención W3C DeviceOrientation: marco terrestre x = este, y = norte, z = cénit;
 * marco del dispositivo x = derecha de la pantalla, y = arriba de la pantalla, z = saliendo de la pantalla.
 * R = Rz(alpha) · Rx(beta) · Ry(gamma) lleva vectores del dispositivo al marco terrestre.
 * La cámara trasera mira hacia −z del dispositivo.
 */

export type Vec3 = [number, number, number];
export type View = { azDeg: number; altDeg: number; rollDeg: number };

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/** Matriz por filas (3×3) de la orientación del dispositivo. */
export function rotationMatrix(alphaDeg: number, betaDeg: number, gammaDeg: number): number[] {
  const a = alphaDeg * D2R, b = betaDeg * D2R, g = gammaDeg * D2R;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
  // Rz(a)·Rx(b)·Ry(g)
  return [
    ca * cg - sa * sb * sg, -sa * cb, ca * sg + sa * sb * cg,
    sa * cg + ca * sb * sg, ca * cb, sa * sg - ca * sb * cg,
    -cb * sg, sb, cb * cg,
  ];
}

const apply = (m: number[], v: Vec3): Vec3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

/** alpha absoluto a partir del rumbo de brújula de iOS (webkitCompassHeading, horario desde el norte). */
export const alphaFromCompassHeading = (headingDeg: number) => (360 - headingDeg) % 360;

/**
 * Euler (alpha, beta, gamma) + ángulo de pantalla (screen.orientation.angle) → azimut/altura de la cámara
 * y giro (roll) del "arriba" de la pantalla respecto del "arriba" del cielo (positivo = horario).
 */
export function deviceToView(alphaDeg: number, betaDeg: number, gammaDeg: number, screenAngleDeg = 0): View {
  const m = rotationMatrix(alphaDeg, betaDeg, gammaDeg);
  const f = apply(m, [0, 0, -1]);
  const th = screenAngleDeg * D2R;
  const up = apply(m, [Math.sin(th), Math.cos(th), 0]);
  return viewFromVectors(f, up);
}

/** Dirección de vista y "arriba" de pantalla (marco ENU) → azimut, altura y roll. */
export function viewFromVectors(f: Vec3, up: Vec3): View {
  const alt = Math.asin(Math.max(-1, Math.min(1, f[2]))) * R2D;
  let az: number;
  const h = Math.hypot(f[0], f[1]);
  if (h > 1e-6) az = Math.atan2(f[0], f[1]) * R2D;
  else az = Math.atan2(f[2] > 0 ? -up[0] : up[0], f[2] > 0 ? -up[1] : up[1]) * R2D; // cénit/nadir: el rumbo sale del "arriba" de pantalla
  az = norm360(az);
  // base de la cámara del planetario (como cameraBasis): derecha r y arriba u
  const a = alt * D2R, z = az * D2R;
  const r: Vec3 = [Math.cos(z), -Math.sin(z), 0];
  const u: Vec3 = [-Math.sin(z) * Math.sin(a), -Math.cos(z) * Math.sin(a), Math.cos(a)];
  const roll = Math.atan2(dot(up, r), dot(up, u)) * R2D;
  return { azDeg: az, altDeg: alt, rollDeg: roll };
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const norm360 = (d: number) => ((d % 360) + 360) % 360;
/** Diferencia angular más corta b − a, en (−180, 180]. */
export const angleDiff = (a: number, b: number) => { const d = norm360(b - a); return d > 180 ? d - 360 : d; };

/** Filtro pasa-bajos circular: sin saltos en 359 → 0. k ∈ (0, 1]: peso de la muestra nueva. */
export function lowPassAngle(prev: number, next: number, k: number): number {
  return norm360(prev + angleDiff(prev, next) * k);
}

/** Peso del filtro independiente de los fps: constante de tiempo tau (ms). */
export const smoothingK = (dtMs: number, tauMs = 90) => 1 - Math.exp(-Math.max(0, dtMs) / tauMs);

/** Suaviza una vista completa (azimut y roll circulares, altura lineal). */
export function smoothView(prev: View | null, next: View, k: number): View {
  if (!prev) return next;
  // cerca del cénit el azimut es inestable: se filtra más fuerte
  const kAz = Math.abs(next.altDeg) > 80 ? k * 0.5 : k;
  return {
    azDeg: lowPassAngle(prev.azDeg, next.azDeg, kAz),
    altDeg: prev.altDeg + (next.altDeg - prev.altDeg) * k,
    rollDeg: angleDiff(0, lowPassAngle(norm360(prev.rollDeg), norm360(next.rollDeg), k)),
  };
}

/** Calibración: corrimiento a sumar a la lectura del sensor para que coincida con el objeto real. */
export type Calibration = { dAz: number; dAlt: number; at: string; target?: string };

export function calibrationFrom(measured: { azDeg: number; altDeg: number }, truth: { azDeg: number; altDeg: number }, target?: string, at = new Date()): Calibration {
  return { dAz: angleDiff(measured.azDeg, truth.azDeg), dAlt: truth.altDeg - measured.altDeg, at: at.toISOString(), target };
}

export function applyCalibration(v: View, c: Calibration | null): View {
  if (!c) return v;
  return { ...v, azDeg: norm360(v.azDeg + c.dAz), altDeg: Math.max(-90, Math.min(90, v.altDeg + c.dAlt)) };
}

/** Campo de visión vertical de la cámara (rectilínea) → diagonal, para una pantalla W×H. */
export function diagonalFov(verticalFovDeg: number, width: number, height: number): number {
  const t = Math.tan((verticalFovDeg * D2R) / 2) * (Math.hypot(width, height) / height);
  return 2 * Math.atan(t) * R2D;
}
