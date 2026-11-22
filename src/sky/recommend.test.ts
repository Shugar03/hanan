import { describe, expect, test } from 'vitest';
import { recommend, evaluate, DRIVE_H, type Preferencias } from './recommend';
import { buildCandidates } from '../ui/noche/candidates';
import { computeAll } from '../model';
import { fixtureForecast } from '../data/forecast';
import { demoSalidas } from '../data/salidas';
import { fromOmm, type Omm } from './satellites';
import { fixtures } from '../data/sources';

const NOW = new Date('2026-11-22T11:00:00-03:00');
const models = computeAll(fixtureForecast().data, NOW);
const cands = buildCandidates(models);
const P: Preferencias = { objetivo: 'estrellas', equipo: 'ojo', base: 'purmamarca', auto: true, minTempC: -10 };

describe('Mi noche · recomendaciones', () => {
  test('top 3 deterministas, con porqué, qué ver y checklist', () => {
    const a = recommend(cands, P), b = recommend(cands, P);
    expect(a).toHaveLength(3);
    expect(a.map((p) => p.pointId + p.night)).toEqual(b.map((p) => p.pointId + p.night));
    for (const p of a) {
      expect(p.reasons.length).toBeGreaterThanOrEqual(3);
      expect(p.reasons[0]).toMatch(/Score de la noche|Ninguna hora/);
      expect(p.see.length).toBeGreaterThan(0);
      expect(p.checklist.length).toBeGreaterThan(2);
      expect(+p.window.end).toBeGreaterThan(+p.window.start);
    }
    expect(new Set(a.map((p) => p.pointId + p.night)).size).toBe(3);
    expect(a[0].value).toBeGreaterThanOrEqual(a[1].value);
  });

  test('el plan usa el mismo score de la noche que el resto de la app', () => {
    for (const p of recommend(cands, P)) {
      const n = models[p.pointId].nights.find((x) => x.night === p.night)!;
      expect(p.nightScore).toBe(n.score);
    }
  });

  test('Vía Láctea en noviembre: lo explica y penaliza frente a "solo estrellas"', () => {
    const c = cands.find((x) => x.point.id === 'susques' && x.night.night === '2026-11-27')!;
    const mw = evaluate(c, { ...P, objetivo: 'via-lactea' });
    const st = evaluate(c, P);
    expect(mw.reasons.join(' ')).toMatch(/se esconde temprano/);
    expect(mw.value).toBeLessThan(st.value);
  });

  test('Vía Láctea en junio: núcleo alto en el porqué', () => {
    const june = computeAll({} as never, new Date('2026-06-20T18:00:00-03:00'));
    const plans = recommend(buildCandidates(june), { ...P, objetivo: 'via-lactea' });
    expect(plans[0].reasons.join(' ')).toMatch(/Núcleo de la Vía Láctea a (8\d|7\d)°/);
    expect(plans[0].reasons.join(' ')).toMatch(/solo cálculo astronómico/);
  });

  test('manejo estimado: desde Purmamarca, a igual cielo gana el punto más cercano', () => {
    const c = cands.find((x) => x.point.id === 'jama')!;
    const near = { ...c, point: { ...c.point, id: 'purmamarca' as const } };
    expect(evaluate(near, P).value).toBeGreaterThanOrEqual(evaluate(c, P).value);
    expect(DRIVE_H.purmamarca.jama).toBeGreaterThan(DRIVE_H.purmamarca.salinas);
    expect(evaluate(c, P).reasons.join(' ')).toMatch(/manejo estimado/);
  });

  test('sin auto: ofrece la salida de guía de esa noche si existe', () => {
    const salidas = demoSalidas();
    const s = salidas.find((x) => x.pointId === 'susques')!;
    const c = cands.find((x) => x.point.id === 'susques' && x.night.night === '2026-11-22')!;
    const plan = evaluate(c, { ...P, auto: false }, { salidas });
    expect(s.id).toBe('demo-01');
    expect(plan.salida?.id).toBe('demo-01');
    expect(plan.reasons.join(' ')).toMatch(/salida de guía/);
  });

  test('alertas: frío por debajo de la tolerancia y Paso de Jama', () => {
    const c = cands.find((x) => x.point.id === 'jama')!;
    const plan = evaluate(c, { ...P, minTempC: 30 }, { pass: { state: 'abierto', fetchedAt: NOW, sourceUrl: 'x' } });
    expect(plan.alerts.some((a) => /por debajo de tu tolerancia/.test(a.text))).toBe(true);
    expect(plan.alerts.some((a) => /Paso de Jama: abierto/.test(a.text))).toBe(true);
  });

  test('satélites: usa los pases visibles calculados', () => {
    const sats = fromOmm(fixtures.omm as Omm[]);
    const few = buildCandidates({ susques: models.susques } as never, { sats });
    const plans = recommend(few, { ...P, objetivo: 'satelites' });
    expect(plans.length).toBeGreaterThan(0);
    expect(plans[0].reasons.join(' ')).toMatch(/Pases visibles|Sin pases visibles/);
  });
});
