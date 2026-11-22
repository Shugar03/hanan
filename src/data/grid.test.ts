import { describe, expect, test } from 'vitest';
import { astroAtCenter, bilinear, fixtureGrid, gridCoords, nearestCell, sampleGrid, sampleWindUV, timeIndex, gridViewBounds, GRID_BOUNDS, GRID_EXTENT, GRID_VARS } from './grid';
import { POINTS } from './points';
import { factorsFrom, scoreHour } from '../sky/score';
import { parseLocal } from '../sky/time';

const g = fixtureGrid();
const n = g.nLat * g.nLon;

describe('grilla Open-Meteo', () => {
  test('dimensiones: 35 × 28 celdas, 72 h, todas las variables', () => {
    expect(g.nLat).toBe(35); expect(g.nLon).toBe(28); expect(n).toBe(980);
    expect(g.times).toHaveLength(72);
    expect(g.times[0].toISOString()).toBe(parseLocal('2026-11-22T00:00').toISOString());
    for (const k of Object.keys(g.vars) as (keyof typeof g.vars)[]) {
      expect(g.vars[k]).toHaveLength(72);
      expect(g.vars[k][0]).toHaveLength(n);
    }
    for (const v of GRID_VARS) expect(sampleGrid(g, v, parseLocal('2026-11-22T23:00'))).toHaveLength(n);
    expect(gridCoords().lat[0]).toBe(-20.9); expect(gridCoords().lon[n - 1]).toBe(-64.25);
    expect(GRID_EXTENT).toEqual([[-68.3, -26], [-64.25, -20.9]]);
    // El encuadre de fitBounds queda dentro de los datos con al menos 0,3° de margen (zona de desvanecido).
    const [[w, s], [e, nn]] = GRID_BOUNDS, [[W, S], [E, N]] = GRID_EXTENT;
    expect(w - W).toBeGreaterThanOrEqual(0.3 - 1e-9); expect(E - e).toBeGreaterThanOrEqual(0.3 - 1e-9);
    expect(s - S).toBeGreaterThanOrEqual(0.3); expect(N - nn).toBeGreaterThanOrEqual(0.3);
  });

  test('gridViewBounds: encuadre dentro de los datos para teléfono y escritorio, con los 6 puntos adentro', () => {
    for (const [w, h] of [[390, 844], [1440, 900], [800, 600]]) {
      const [[bw, bs], [be, bn]] = gridViewBounds(w, h), [[W, S], [E, N]] = GRID_EXTENT;
      expect(bw).toBeGreaterThanOrEqual(W + 0.3 - 1e-6); expect(be).toBeLessThanOrEqual(E - 0.3 + 1e-6);
      expect(bs).toBeGreaterThanOrEqual(S + 0.3 - 1e-6); expect(bn).toBeLessThanOrEqual(N - 0.3 + 1e-6);
      for (const p of POINTS) { expect(p.lon).toBeGreaterThan(bw); expect(p.lon).toBeLessThan(be); expect(p.lat).toBeGreaterThan(bs); expect(p.lat).toBeLessThan(bn); }
    }
  });

  test('la grilla cubre los 6 puntos con margen', () => {
    const south = g.latNorth - (g.nLat - 1) * g.step, east = g.lonWest + (g.nLon - 1) * g.step;
    for (const p of POINTS) {
      expect(p.lat).toBeLessThan(g.latNorth - 0.3); expect(p.lat).toBeGreaterThan(south + 0.3);
      expect(p.lon).toBeGreaterThan(g.lonWest + 0.3); expect(p.lon).toBeLessThan(east - 0.3);
    }
  });

  test('interpolación temporal: a la hora exacta coincide; a la media hora es el promedio', () => {
    const t = parseLocal('2026-11-22T22:00');
    const a = sampleGrid(g, 'cloud_high', t), raw = g.vars.cloud_high[22];
    expect(Array.from(a)).toEqual(Array.from(raw));
    const half = sampleGrid(g, 'temp', new Date(t.getTime() + 30 * 60_000));
    for (let k = 0; k < n; k += 17) expect(half[k]).toBeCloseTo((g.vars.temp[22][k] + g.vars.temp[23][k]) / 2, 4);
    expect(timeIndex(g, new Date(0)).i0).toBe(0);
    expect(timeIndex(g, new Date(4e12)).i0).toBe(71);
  });

  test('interpolación espacial bilineal: nodos exactos y punto medio', () => {
    const vals = g.vars.temp[12];
    expect(bilinear(g, vals, g.latNorth, g.lonWest)).toBeCloseTo(vals[0], 4);
    const mid = bilinear(g, vals, g.latNorth - g.step / 2, g.lonWest + g.step / 2);
    expect(mid).toBeCloseTo((vals[0] + vals[1] + vals[g.nLon] + vals[g.nLon + 1]) / 4, 4);
  });

  test('viento en u/v: velocidad consistente con wind_speed', () => {
    const t = parseLocal('2026-11-22T15:00');
    const { u, v } = sampleWindUV(g, t), s = sampleGrid(g, 'wind', t);
    for (let k = 0; k < n; k += 13) expect(Math.hypot(u[k], v[k])).toBeCloseTo(s[k], 3);
  });

  test("'score' en la celda más cercana a Susques ≈ score del punto (src/sky/score.ts, ±5)", () => {
    const sus = POINTS.find((p) => p.id === 'susques')!;
    // Valores del fixture decodificados (1 byte): nubes enteras, temperatura cada 0,5 °C.
    expect(g.vars.temp[14].every((x) => Number.isInteger(x * 2))).toBe(true);
    const k = nearestCell(g, sus.lat, sus.lon);
    let night = 0, skipped = 0;
    for (let h = 0; h < 72; h++) {
      const time = g.times[h];
      const cell = sampleGrid(g, 'score', time)[k];
      const ref = scoreHour({
        time, cloudLow: g.vars.cloud_low[h][k], cloudMid: g.vars.cloud_mid[h][k], cloudHigh: g.vars.cloud_high[h][k],
        humidity: g.vars.humidity[h][k], windGustKmh: g.vars.wind_gust[h][k], temperatureC: g.vars.temp[h][k],
      }, sus);
      // En el borde del crepúsculo el factor oscuridad salta (0 / 0,5 / 1): ahí el centro y Susques pueden caer de lados distintos.
      const centerDark = factorsFrom({ sunAltDeg: astroAtCenter(g, time).sun, moonAltDeg: 0, moonIllum: 0, cloudLow: 0, cloudMid: 0, cloudHigh: 0, humidity: 0, windGustKmh: 0 }).darkness;
      if (centerDark !== ref.factors.darkness) { skipped++; continue; }
      if (ref.factors.darkness === 1) night++;
      expect(Math.abs(cell - ref.score)).toBeLessThanOrEqual(5);
    }
    expect(night).toBeGreaterThan(10);
    expect(skipped).toBeLessThanOrEqual(6);
  });
});
