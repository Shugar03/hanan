import { describe, expect, test } from 'vitest';
import { moonAltitude, moonIllumination, nightSummary, sunAltitude } from './ephemeris';
import { factorsFrom, labelFor, scoreFromInputs, scoreHour } from './score';
import { bestWindow, DIFFICULT_WEEK, weekVerdict } from './bestWindow';
import { fromOmm, passes, subPoint, visibleNow } from './satellites';
import type { HourlyConditions, SkyScore } from './types';
import om from '../../poc/samples/openmeteo_susques.json';
import iss from '../../poc/samples/omm_25544.json';

const SUSQUES = { lat: -23.39858, lon: -66.36753, elevationM: 3605 };
const at = (s: string) => new Date(s);
function fixtureHour(local: string): HourlyConditions {
  const i = om.hourly.time.indexOf(local);
  const h = om.hourly;
  return { time: new Date(local + ':00-03:00'), cloudLow: h.cloud_cover_low[i], cloudMid: h.cloud_cover_mid[i], cloudHigh: h.cloud_cover_high[i], humidity: h.relative_humidity_2m[i], windGustKmh: h.wind_gusts_10m[i], temperatureC: h.temperature_2m[i] };
}
const base = { sunAltDeg: -30, moonAltDeg: -10, moonIllum: 0.5, cloudLow: 0, cloudMid: 0, cloudHigh: 0, humidity: 20, windGustKmh: 10 };

describe('score de cielo (spec §4)', () => {
  test('T1: Susques 22/11 20:00 → sol ≈ −1,8°, oscuridad 0 → score 0 (Día)', () => {
    const c = fixtureHour('2026-11-22T20:00');
    expect(sunAltitude(c.time, SUSQUES)).toBeCloseTo(-1.8, 0);
    const s = scoreHour(c, SUSQUES);
    expect(s.factors.darkness).toBe(0);
    expect(s.score).toBe(0);
    expect(s.label).toBe('Día');
  });

  test('T2: 22/11 22:00, nubes 0/0/0, luna a 40,7° y 96 % → factor luna ≈ 0,37 → score ≈ 37', () => {
    const c = fixtureHour('2026-11-22T22:00');
    expect([c.cloudLow, c.cloudMid, c.cloudHigh]).toEqual([0, 0, 0]);
    const sun = sunAltitude(c.time, SUSQUES), moon = moonAltitude(c.time, SUSQUES), ill = moonIllumination(c.time);
    expect(sun).toBeCloseTo(-25.6, 0);
    expect(moon).toBeCloseTo(40.7, 0);
    expect(ill).toBeCloseTo(0.96, 1);
    const s = scoreHour(c, SUSQUES);
    expect(s.factors.moon).toBeCloseTo(0.37, 2);
    // El caso de la spec asume viento neutro: con ráfagas ≤ 50 km/h el score es 37 (Malo, por la luna).
    const calm = scoreHour({ ...c, windGustKmh: 30 }, SUSQUES);
    expect(calm.score).toBe(37);
    expect(calm.label).toBe('Malo');
    // En el fixture real las ráfagas son 51,5 km/h (> 50) → factor viento 0,6 → 22.
    expect(c.windGustKmh).toBe(51.5);
    expect(s.factors.wind).toBe(0.6);
    expect(s.score).toBe(22);
  });

  test('T3: nubes altas 53 % y luna bajo el horizonte → nubes 0,894 → score ≈ 89', () => {
    const s = scoreFromInputs(at('2026-11-23T04:00:00-03:00'), { ...base, cloudHigh: 53 });
    expect(s.factors.clouds).toBeCloseTo(0.894, 3);
    expect(s.factors.moon).toBe(1);
    expect(s.score).toBe(89);
    expect(s.label).toBe('Excelente');
    // la hora del fixture con 53 % de altas
    expect(fixtureHour('2026-11-23T04:00').cloudHigh).toBe(53);
    expect(factorsFrom({ ...base, cloudHigh: fixtureHour('2026-11-23T04:00').cloudHigh }).clouds).toBeCloseTo(0.894, 3);
  });

  test('T4: HR 90 % → factor humedad 0,5', () => {
    expect(factorsFrom({ ...base, humidity: 90 }).humidity).toBe(0.5);
    expect(factorsFrom({ ...base, humidity: 85 }).humidity).toBe(1);
    expect(scoreFromInputs(new Date(), { ...base, humidity: 90 }).score).toBe(50);
  });

  test('T5: ráfagas 60 km/h → factor viento 0,6', () => {
    expect(factorsFrom({ ...base, windGustKmh: 60 }).wind).toBe(0.6);
    expect(factorsFrom({ ...base, windGustKmh: 50 }).wind).toBe(1);
    expect(scoreFromInputs(new Date(), { ...base, windGustKmh: 60 }).score).toBe(60);
  });

  test('crepúsculo náutico-astronómico → oscuridad 0,5', () => {
    expect(factorsFrom({ ...base, sunAltDeg: -15 }).darkness).toBe(0.5);
  });

  test('etiquetas', () => {
    expect(labelFor(85)).toBe('Excelente');
    expect(labelFor(84)).toBe('Muy bueno');
    expect(labelFor(70)).toBe('Muy bueno');
    expect(labelFor(69)).toBe('Aceptable');
    expect(labelFor(40)).toBe('Aceptable');
    expect(labelFor(39)).toBe('Malo');
    expect(labelFor(1)).toBe('Malo');
    expect(labelFor(0, 0)).toBe('Día');
  });
});

const mk = (startIso: string, vals: number[]): SkyScore[] => vals.map((v, i) => ({
  time: new Date(new Date(startIso).getTime() + i * 3600_000), score: v, label: labelFor(v), factors: { darkness: 1, clouds: 1, moon: 1, humidity: 1, wind: 1 },
}));

describe('mejor ventana', () => {
  test('maximiza promedio × duración', () => {
    const s = mk('2026-11-22T21:00:00-03:00', [30, 90, 30, 60, 60, 60, 10]);
    const w = bestWindow(s)!;
    expect(w.start.toISOString()).toBe(new Date('2026-11-23T00:00:00-03:00').toISOString());
    expect(w.end.toISOString()).toBe(new Date('2026-11-23T03:00:00-03:00').toISOString());
    expect(w.meanScore).toBe(60);
  });
  test('desempate: la más temprana', () => {
    const s = mk('2026-11-22T21:00:00-03:00', [80, 10, 80]);
    expect(bestWindow(s)!.start.toISOString()).toBe(new Date('2026-11-22T21:00:00-03:00').toISOString());
  });
  test('horas no consecutivas no forman una ventana', () => {
    const a = mk('2026-11-22T21:00:00-03:00', [50]);
    const b = mk('2026-11-23T01:00:00-03:00', [50]);
    expect(bestWindow([...a, ...b])!.end.getTime() - bestWindow([...a, ...b])!.start.getTime()).toBe(3600_000);
  });
  test('T6: semana sin horas ≥ 40 → "Semana difícil…"', () => {
    const s = mk('2026-11-22T00:00:00-03:00', Array.from({ length: 168 }, (_, i) => i % 39));
    const v = weekVerdict(s);
    expect(v.kind).toBe('dificil');
    if (v.kind === 'dificil') expect(v.message).toBe(DIFFICULT_WEEK);
    expect(DIFFICULT_WEEK).toMatch(/^Semana difícil/);
  });
  test('fixture de Susques: hay una mejor ventana', () => {
    const scores = om.hourly.time.map((t) => scoreHour(fixtureHour(t), SUSQUES));
    const v = weekVerdict(scores);
    expect(v.kind).toBe('ok');
  });
});

describe('efemérides', () => {
  test('noviembre: el núcleo de la Vía Láctea no supera 20° en la noche astronómica', () => {
    const n = nightSummary('2026-11-22', SUSQUES);
    expect(n.milkyWayCore.hoursAbove20).toBe(0);
    expect(n.seasonalNote).toMatch(/abril a septiembre/);
    expect(n.moon.illumination).toBeGreaterThan(0.9);
    expect(n.magellanic.every((m) => m.altitudeDeg > 0)).toBe(true);
  });
  test('junio: la Vía Láctea en el cénit', () => {
    const n = nightSummary('2026-06-20', SUSQUES);
    expect(n.milkyWayCore.maxAltitudeDeg).toBeGreaterThan(80);
    expect(n.milkyWayCore.hoursAbove20).toBeGreaterThan(5);
  });
});

describe('satélites', () => {
  const [t] = fromOmm(iss as never);
  test('OMM → satrec y posición', () => {
    expect(t.name).toBe('ISS');
    const p = subPoint(t.rec, at('2026-11-22T12:00:00Z'))!;
    expect(Math.abs(p.lat)).toBeLessThanOrEqual(52);
    expect(p.altKm).toBeGreaterThan(350);
    expect(p.altKm).toBeLessThan(450);
  });
  test('regla de pase visible', () => {
    expect(visibleNow(30, -10, true)).toBe(true);
    expect(visibleNow(9, -10, true)).toBe(false);
    expect(visibleNow(30, -3, true)).toBe(false);
    expect(visibleNow(30, -10, false)).toBe(false);
  });
  test('pases sobre Susques en 48 h', () => {
    const ps = passes(t, SUSQUES, at('2026-11-22T00:00:00-03:00'), 48, 30);
    expect(ps.length).toBeGreaterThan(0);
    for (const p of ps) expect(p.maxElevationDeg).toBeGreaterThan(10);
  });
});
