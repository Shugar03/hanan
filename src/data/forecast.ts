import type { HourlyConditions, PointId } from '../sky/types';
import { parseLocal } from '../sky/time';
import { POINTS } from './points';
import { API_BASE, FIXTURE_CAPTURED_AT, fixtures, readCache, writeCache, type Sourced } from './sources';

type OM = { hourly: Record<string, (number | string)[]> };
export type Forecast = Record<PointId, HourlyConditions[]>;
const TTL = 3600_000;

export function openMeteoUrl() {
  const lat = POINTS.map((p) => p.lat).join(','), lon = POINTS.map((p) => p.lon).join(',');
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m,wind_gusts_10m,temperature_2m&timezone=America%2FArgentina%2FJujuy&forecast_days=7`;
}

export function parseOpenMeteo(raw: unknown[]): Forecast {
  const out = {} as Forecast;
  POINTS.forEach((p, i) => {
    const h = (raw[i] as OM).hourly;
    out[p.id] = (h.time as string[]).map((t, k) => ({
      time: parseLocal(t),
      cloudLow: Number(h.cloud_cover_low[k] ?? 0), cloudMid: Number(h.cloud_cover_mid[k] ?? 0), cloudHigh: Number(h.cloud_cover_high[k] ?? 0),
      humidity: Number(h.relative_humidity_2m[k] ?? 0), windGustKmh: Number(h.wind_gusts_10m[k] ?? 0), temperatureC: Number(h.temperature_2m[k] ?? 0),
    }));
  });
  return out;
}

export function fixtureForecast(): Sourced<Forecast> {
  return { data: parseOpenMeteo(fixtures.openMeteo), fetchedAt: FIXTURE_CAPTURED_AT, origin: 'fixture' };
}

/** Una request multi-coordenada por hora como máximo. Ante error: caché → fixture. */
export async function loadForecast(): Promise<Sourced<Forecast>> {
  const c = readCache<unknown[]>('forecast');
  if (c && Date.now() - c.at < TTL) return { data: parseOpenMeteo(c.data), fetchedAt: new Date(c.at), origin: 'cache' };
  try {
    const r = await fetch(API_BASE ? `${API_BASE}/api/forecast` : openMeteoUrl());
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const arr = Array.isArray(j) ? j : [j];
    if (arr.length !== POINTS.length) throw new Error('forma inesperada');
    writeCache('forecast', arr);
    return { data: parseOpenMeteo(arr), fetchedAt: new Date(), origin: 'red' };
  } catch {
    if (c) return { data: parseOpenMeteo(c.data), fetchedAt: new Date(c.at), origin: 'cache' };
    return fixtureForecast();
  }
}
