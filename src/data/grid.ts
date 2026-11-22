// Grilla meteorológica regular sobre la Puna jujeña para las capas de Explorar (product-vision §6).
// Fuente: Open-Meteo.com (CC BY 4.0). Offline-first: el fixture `fixtures/openmeteo_grid.json` siempre está;
// la red es opcional, una sola request multi-coordenada (POST) con caché de 1 h, igual que forecast.ts.
import gridJson from '../../fixtures/openmeteo_grid.json';
import { parseLocal } from '../sky/time';
import { moonAltitude, moonIllumination, sunAltitude } from '../sky/ephemeris';
import { scoreFromInputs } from '../sky/score';
import { readCache, writeCache } from './sources';

export type GridVar = 'score' | 'cloud_total' | 'cloud_low' | 'cloud_mid' | 'cloud_high' | 'wind' | 'temp';
/** Variables crudas guardadas por hora y celda. */
export type RawVar = 'cloud_total' | 'cloud_low' | 'cloud_mid' | 'cloud_high' | 'humidity' | 'wind_speed' | 'wind_dir' | 'wind_gust' | 'temp';

/** Formato compacto del fixture (y del caché): `vars[v][hora]` = base64 de 1 byte por celda; valor = byte·scale + offset. */
export type GridJson = {
  source: string; license: string; capturedAt: string; timezone: string;
  grid: { latNorth: number; lonWest: number; step: number; nLat: number; nLon: number };
  start: string; hours: number;
  encoding: { format: string; vars: Record<RawVar, { scale: number; offset: number }> };
  elevation: number[];
  vars: Record<RawVar, string[]>;
};

export type Grid = {
  /** Latitud de la primera fila (norte) y longitud de la primera columna (oeste), en grados. */
  latNorth: number; lonWest: number; step: number;
  nLat: number; nLon: number;
  /** Horas del pronóstico (hora local de Jujuy). */
  times: Date[];
  /** `vars[v][hora]` = valores por celda, celda = fila·nLon + col (fila 0 = norte, col 0 = oeste). */
  vars: Record<RawVar, Float32Array[]>;
  elevation: Float32Array;
  /** Centro de la grilla: ahí se calculan sol y luna para el score de todas las celdas. */
  center: { lat: number; lon: number; elevationM: number };
  fetchedAt: Date;
  origin: 'red' | 'cache' | 'fixture';
  attribution: string;
};

export const GRID_VARS: GridVar[] = ['score', 'cloud_total', 'cloud_low', 'cloud_mid', 'cloud_high', 'wind', 'temp'];
export const GRID_UNITS: Record<GridVar, string> = {
  score: '0–100', cloud_total: '%', cloud_low: '%', cloud_mid: '%', cloud_high: '%', wind: 'km/h', temp: '°C',
};
export const GRID_ATTRIBUTION = 'Open-Meteo.com (CC BY 4.0)';

const META = (gridJson as unknown as GridJson).grid;
const r3 = (x: number) => Math.round(x * 1000) / 1000;
/** Extensión de los datos de la grilla `[[oeste, sur], [este, norte]]`. */
export const GRID_EXTENT: [[number, number], [number, number]] = [
  [META.lonWest, r3(META.latNorth - (META.nLat - 1) * META.step)],
  [r3(META.lonWest + (META.nLon - 1) * META.step), META.latNorth],
];
/** Encuadre para `fitBounds` al activar una capa: la Puna jujeña. Los datos (GRID_EXTENT) la exceden en todos los lados
 *  para que la capa llene la pantalla en teléfono (vertical) y escritorio (horizontal). */
export const GRID_BOUNDS: [[number, number], [number, number]] = [[-68.0, -25.0], [-64.6, -21.6]];
const TTL = 3600_000;
const RAW_MAP: Record<RawVar, string> = {
  cloud_total: 'cloud_cover', cloud_low: 'cloud_cover_low', cloud_mid: 'cloud_cover_mid', cloud_high: 'cloud_cover_high',
  humidity: 'relative_humidity_2m', wind_speed: 'wind_speed_10m', wind_dir: 'wind_direction_10m', wind_gust: 'wind_gusts_10m', temp: 'temperature_2m',
};

/** Coordenadas (lat, lon) de cada celda, en el orden de la grilla. */
export function gridCoords(g: Pick<Grid, 'latNorth' | 'lonWest' | 'step' | 'nLat' | 'nLon'> = META) {
  const lat: number[] = [], lon: number[] = [];
  for (let r = 0; r < g.nLat; r++) for (let c = 0; c < g.nLon; c++) {
    lat.push(Math.round((g.latNorth - r * g.step) * 1000) / 1000);
    lon.push(Math.round((g.lonWest + c * g.step) * 1000) / 1000);
  }
  return { lat, lon };
}

export function parseGrid(j: GridJson, origin: Grid['origin'], fetchedAt: Date): Grid {
  const { latNorth, lonWest, step, nLat, nLon } = j.grid;
  const t0 = parseLocal(j.start).getTime();
  const times = Array.from({ length: j.hours }, (_, h) => new Date(t0 + h * 3600_000));
  const vars = {} as Grid['vars'];
  for (const k of Object.keys(RAW_MAP) as RawVar[]) {
    const { scale, offset } = j.encoding.vars[k];
    vars[k] = j.vars[k].map((b64) => {
      const bin = atob(b64), out = new Float32Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) * scale + offset;
      return out;
    });
  }
  const elevation = Float32Array.from(j.elevation);
  let e = 0; for (const x of elevation) e += x;
  return {
    latNorth, lonWest, step, nLat, nLon, times, vars, elevation,
    center: { lat: latNorth - ((nLat - 1) * step) / 2, lon: lonWest + ((nLon - 1) * step) / 2, elevationM: Math.round(e / elevation.length) },
    fetchedAt, origin, attribution: GRID_ATTRIBUTION,
  };
}

const ENCODING: GridJson['encoding']['vars'] = {
  cloud_total: { scale: 1, offset: 0 }, cloud_low: { scale: 1, offset: 0 }, cloud_mid: { scale: 1, offset: 0 }, cloud_high: { scale: 1, offset: 0 },
  humidity: { scale: 1, offset: 0 }, wind_speed: { scale: 1, offset: 0 }, wind_gust: { scale: 1, offset: 0 },
  wind_dir: { scale: 2, offset: 0 }, temp: { scale: 0.5, offset: -40 },
};

/** Respuesta cruda de Open-Meteo (array por coordenada) → formato compacto (1 byte por celda y hora). */
export function compactOpenMeteo(raw: { elevation?: number; hourly: Record<string, (number | string | null)[]> }[], capturedAt = new Date()): GridJson {
  const times = raw[0].hourly.time as string[];
  const vars = {} as GridJson['vars'];
  for (const [k, src] of Object.entries(RAW_MAP) as [RawVar, string][]) {
    const { scale, offset } = ENCODING[k];
    vars[k] = times.map((_, h) => {
      let bin = '';
      for (const r of raw) bin += String.fromCharCode(Math.max(0, Math.min(255, Math.round((Number(r.hourly[src]?.[h] ?? 0) - offset) / scale))));
      return btoa(bin);
    });
  }
  return {
    source: 'Open-Meteo.com — https://open-meteo.com/ (CC BY 4.0)', license: 'CC BY 4.0', capturedAt: capturedAt.toISOString(),
    timezone: 'America/Argentina/Jujuy', grid: META, start: times[0], hours: times.length,
    encoding: { format: 'vars[variable][hora] = base64 de 1 byte por celda; valor = byte·scale + offset', vars: ENCODING },
    elevation: raw.map((r) => r.elevation ?? 0), vars,
  };
}

export function fixtureGrid(): Grid {
  const j = gridJson as unknown as GridJson;
  return parseGrid(j, 'fixture', new Date(j.capturedAt));
}

/** Cuerpo de la única request POST multi-coordenada (cada celda cuenta para el cupo: 980 por request). */
export function openMeteoGridBody() {
  const { lat, lon } = gridCoords();
  return {
    latitude: lat, longitude: lon, hourly: Object.values(RAW_MAP),
    timezone: ['America/Argentina/Jujuy'], forecast_days: 3,
  };
}

/** Fixture siempre; red opcional (si hay conexión) con caché de 1 h. Ante cualquier error: caché → fixture. */
export async function loadGrid(): Promise<Grid> {
  const c = readCache<GridJson>('grid');
  if (c && Date.now() - c.at < TTL) return parseGrid(c.data, 'cache', new Date(c.at));
  const online = typeof navigator !== 'undefined' && navigator.onLine !== false && typeof window !== 'undefined';
  if (online) {
    try {
      const r = await fetch('https://api.open-meteo.com/v1/forecast', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(openMeteoGridBody()),
      });
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      const n = META.nLat * META.nLon;
      if (!Array.isArray(j) || j.length !== n) throw new Error('forma inesperada');
      const compact = compactOpenMeteo(j);
      writeCache('grid', compact);
      return parseGrid(compact, 'red', new Date());
    } catch { /* cae al caché o al fixture */ }
  }
  if (c) return parseGrid(c.data, 'cache', new Date(c.at));
  return fixtureGrid();
}

/** Índices de hora vecinos y peso lineal para un instante (se recorta a los extremos del pronóstico). */
export function timeIndex(grid: Grid, time: Date): { i0: number; i1: number; w: number } {
  const t0 = grid.times[0].getTime();
  const x = Math.max(0, Math.min(grid.times.length - 1, (time.getTime() - t0) / 3600_000));
  const i0 = Math.floor(x), i1 = Math.min(grid.times.length - 1, i0 + 1);
  return { i0, i1, w: x - i0 };
}

function lerpVar(grid: Grid, v: RawVar, time: Date): Float32Array {
  const { i0, i1, w } = timeIndex(grid, time);
  const a = grid.vars[v][i0], b = grid.vars[v][i1];
  const out = new Float32Array(a.length);
  for (let k = 0; k < a.length; k++) out[k] = a[k] + (b[k] - a[k]) * w;
  return out;
}

/** Viento por celda como componentes (u hacia el este, v hacia el norte) en km/h, interpolado en el tiempo. */
export function sampleWindUV(grid: Grid, time: Date): { u: Float32Array; v: Float32Array } {
  const { i0, i1, w } = timeIndex(grid, time);
  const n = grid.nLat * grid.nLon;
  const u = new Float32Array(n), v = new Float32Array(n);
  for (const [i, wt] of [[i0, 1 - w], [i1, w]] as const) {
    if (wt === 0) continue;
    const s = grid.vars.wind_speed[i], d = grid.vars.wind_dir[i];
    for (let k = 0; k < n; k++) {
      // wind_direction_10m es de dónde viene: el aire va hacia dir + 180°.
      const rad = (d[k] * Math.PI) / 180;
      u[k] += -s[k] * Math.sin(rad) * wt;
      v[k] += -s[k] * Math.cos(rad) * wt;
    }
  }
  return { u, v };
}

/** Sol y luna en el centro de la grilla (una vez por instante: el score de todas las celdas usa estos valores). */
const astroCache = new Map<string, { sun: number; moonAlt: number; illum: number }>();
export function astroAtCenter(grid: Grid, time: Date) {
  const key = `${grid.center.lat},${grid.center.lon},${time.getTime()}`;
  let a = astroCache.get(key);
  if (!a) {
    a = { sun: sunAltitude(time, grid.center), moonAlt: moonAltitude(time, grid.center), illum: moonIllumination(time) };
    if (astroCache.size > 500) astroCache.clear();
    astroCache.set(key, a);
  }
  return a;
}

/** Valor por celda de una capa en un instante (interpolación lineal entre horas). 'score' = spec §4 por celda. */
export function sampleGrid(grid: Grid, variable: GridVar, time: Date): Float32Array {
  switch (variable) {
    case 'cloud_total': case 'cloud_low': case 'cloud_mid': case 'cloud_high': case 'temp':
      return lerpVar(grid, variable, time);
    case 'wind': return lerpVar(grid, 'wind_speed', time);
    case 'score': {
      const low = lerpVar(grid, 'cloud_low', time), mid = lerpVar(grid, 'cloud_mid', time), high = lerpVar(grid, 'cloud_high', time);
      const hum = lerpVar(grid, 'humidity', time), gust = lerpVar(grid, 'wind_gust', time);
      const a = astroAtCenter(grid, time);
      const out = new Float32Array(low.length);
      for (let k = 0; k < out.length; k++) {
        out[k] = scoreFromInputs(time, {
          sunAltDeg: a.sun, moonAltDeg: a.moonAlt, moonIllum: a.illum,
          cloudLow: low[k], cloudMid: mid[k], cloudHigh: high[k], humidity: hum[k], windGustKmh: gust[k],
        }).score;
      }
      return out;
    }
  }
}

/** Celda más cercana a una coordenada. */
export function nearestCell(grid: Grid, lat: number, lon: number): number {
  const r = Math.max(0, Math.min(grid.nLat - 1, Math.round((grid.latNorth - lat) / grid.step)));
  const c = Math.max(0, Math.min(grid.nLon - 1, Math.round((lon - grid.lonWest) / grid.step)));
  return r * grid.nLon + c;
}

/** Interpolación bilineal de valores por celda en una coordenada (se recorta a la grilla). */
export function bilinear(grid: Grid, values: ArrayLike<number>, lat: number, lon: number): number {
  const y = Math.max(0, Math.min(grid.nLat - 1, (grid.latNorth - lat) / grid.step));
  const x = Math.max(0, Math.min(grid.nLon - 1, (lon - grid.lonWest) / grid.step));
  const r0 = Math.floor(y), c0 = Math.floor(x);
  const r1 = Math.min(grid.nLat - 1, r0 + 1), c1 = Math.min(grid.nLon - 1, c0 + 1);
  const fy = y - r0, fx = x - c0, n = grid.nLon;
  const top = values[r0 * n + c0] * (1 - fx) + values[r0 * n + c1] * fx;
  const bot = values[r1 * n + c0] * (1 - fx) + values[r1 * n + c1] * fx;
  return top * (1 - fy) + bot * fy;
}

/** Horas del pronóstico de la grilla (para el scrubber). */
export const gridHours = (grid: Grid) => grid.times;
