// Colormaps de las capas. Salen de la paleta (noche / sal / ceniza / naranja / cobre / ámbar / yareta / colorado).
// Modo rojo: rampas propias solo en rojos sobre negro (tokens --rojo-*), con el mismo rango dinámico.
import type { GridVar } from '../../data/grid';

type RGBA = [number, number, number, number];
type Stop = [number, RGBA];
export type Modo = 'normal' | 'rojo';

export const currentModo = (): Modo =>
  typeof document !== 'undefined' && document.documentElement.dataset.modo === 'rojo' ? 'rojo' : 'normal';

// Nubes: cielo despejado = noche (oscurece el relieve), cubierto = sal casi opaca. Mucho rango entre 0 y 100 %.
const NUBES: Stop[] = [
  [0, [8, 9, 13, 0.55]], [10, [28, 31, 40, 0.45]], [25, [80, 82, 90, 0.42]], [45, [150, 148, 143, 0.62]],
  [65, [205, 201, 193, 0.8]], [85, [240, 236, 228, 0.92]], [100, [255, 252, 246, 0.98]],
];
const NUBES_ROJO: Stop[] = [
  [0, [0, 0, 0, 0.6]], [10, [20, 3, 3, 0.55]], [25, [58, 10, 10, 0.6]], [45, [120, 24, 24, 0.72]],
  [65, [190, 50, 50, 0.84]], [85, [240, 72, 72, 0.92]], [100, [255, 90, 90, 0.97]],
];

// Score: 4 bandas discretas que coinciden con las etiquetas (spec §4), con bordes suaves de ~2 puntos.
const SCORE: Stop[] = [
  [0, [64, 22, 28, 0.62]], [38.5, [214, 86, 62, 0.74]],              // Malo
  [40.5, [232, 150, 66, 0.76]], [68.5, [250, 192, 104, 0.8]],         // Aceptable
  [70.5, [128, 196, 150, 0.8]], [83.5, [160, 216, 178, 0.84]],        // Muy bueno
  [85.5, [214, 246, 224, 0.9]], [100, [244, 255, 248, 0.95]],         // Excelente
];
const SCORE_ROJO: Stop[] = [
  [0, [26, 3, 3, 0.65]], [38.5, [58, 10, 10, 0.72]],
  [40.5, [110, 20, 20, 0.78]], [68.5, [138, 28, 28, 0.8]],
  [70.5, [196, 52, 52, 0.85]], [83.5, [218, 62, 62, 0.87]],
  [85.5, [255, 77, 77, 0.93]], [100, [255, 96, 96, 0.96]],
];

const rojoRamp = (min: number, max: number): Stop[] => {
  const R: [number, number, number, number][] = [[0, 0, 0, 0.55], [58, 10, 10, 0.62], [138, 28, 28, 0.74], [224, 69, 69, 0.86], [255, 90, 90, 0.95]];
  return R.map((c, i) => [min + ((max - min) * i) / (R.length - 1), c]);
};

type Ramp = { min: number; max: number; stops: Stop[]; rojo: Stop[]; title: string; unit: string; ticks: number[]; iso: number[] };
const range = (a: number, b: number, s: number) => Array.from({ length: Math.floor((b - a) / s) + 1 }, (_, i) => a + i * s);
const nubes = (title: string): Ramp => ({ min: 0, max: 100, title, unit: '%', ticks: [0, 25, 50, 75, 100], stops: NUBES, rojo: NUBES_ROJO, iso: [25, 50, 75] });

export const RAMPS: Record<GridVar, Ramp> = {
  score: { min: 0, max: 100, title: 'Score de cielo', unit: '0–100', ticks: [0, 40, 70, 85, 100], stops: SCORE, rojo: SCORE_ROJO, iso: [20, 40, 60, 80] },
  cloud_total: nubes('Nubes'),
  cloud_low: nubes('Nubes bajas'),
  cloud_mid: nubes('Nubes medias'),
  cloud_high: nubes('Nubes altas'),
  wind: {
    min: 0, max: 70, title: 'Viento', unit: 'km/h', ticks: [0, 20, 40, 60], iso: range(10, 70, 10),
    stops: [
      [0, [14, 16, 24, 0.5]], [8, [48, 46, 60, 0.5]], [16, [120, 66, 50, 0.6]], [26, [204, 94, 42, 0.74]],
      [38, [240, 122, 46, 0.82]], [52, [246, 176, 92, 0.88]], [70, [252, 242, 226, 0.95]],
    ],
    rojo: rojoRamp(0, 70),
  },
  temp: {
    min: -15, max: 30, title: 'Temperatura', unit: '°C', ticks: [-10, 0, 10, 20, 30], iso: range(-15, 30, 5),
    stops: [
      [-15, [44, 56, 100, 0.85]], [-5, [80, 94, 128, 0.78]], [2, [150, 146, 140, 0.68]],
      [10, [245, 178, 94, 0.74]], [20, [240, 122, 46, 0.82]], [30, [222, 84, 60, 0.9]],
    ],
    rojo: rojoRamp(-15, 30),
  },
};

function interp(stops: Stop[], x: number): RGBA {
  if (x <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [x1, c1] = stops[i];
    if (x <= x1) {
      const [x0, c0] = stops[i - 1];
      const t = (x - x0) / (x1 - x0 || 1);
      return [0, 1, 2, 3].map((k) => c0[k] + (c1[k] - c0[k]) * t) as RGBA;
    }
  }
  return stops[stops.length - 1][1];
}

/** Color de un valor (r, g, b 0–255; a 0–1). */
export function colorAt(v: GridVar, value: number, modo: Modo): RGBA {
  const r = RAMPS[v];
  return interp(modo === 'rojo' ? r.rojo : r.stops, value);
}

/** Tabla de 256 colores RGBA8 (alfa ya en 0–255) sobre [min, max]. */
export function lut(v: GridVar, modo: Modo): Uint8ClampedArray {
  const r = RAMPS[v], out = new Uint8ClampedArray(256 * 4);
  for (let i = 0; i < 256; i++) {
    const c = colorAt(v, r.min + ((r.max - r.min) * i) / 255, modo);
    out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = c[3] * 255;
  }
  return out;
}

/** Degradé CSS para la leyenda (alfa mínimo para que se lea sobre la superficie). */
export function legendGradient(v: GridVar, modo: Modo): string {
  const r = RAMPS[v], n = 60, parts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const x = r.min + ((r.max - r.min) * i) / n;
    const [R, G, B, A] = colorAt(v, x, modo);
    parts.push(`rgba(${R | 0}, ${G | 0}, ${B | 0}, ${Math.max(0.6, A).toFixed(2)}) ${((i / n) * 100).toFixed(1)}%`);
  }
  return `linear-gradient(90deg, ${parts.join(', ')})`;
}
