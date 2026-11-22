import { describe, expect, test } from 'vitest';
import { computeAll, demandRows, excellentAlerts, EXCELLENT } from './model';
import { fixtureForecast } from './data/forecast';
import { demoDemand } from './data/demand';
import { POINTS } from './data/points';
import { labelFor } from './sky/score';

// "Ahora" de los fixtures: 22/11/2026 11:00 (Jujuy)
const NOW = new Date('2026-11-22T11:00:00-03:00');
const models = computeAll(fixtureForecast().data, NOW);

describe('métrica única de noche', () => {
  test('demanda, alertas, pestañas de noche y mejor ventana muestran el mismo score para un punto/noche', () => {
    const rows = demandRows(models, demoDemand());
    const alerts = excellentAlerts(models);
    expect(rows.length).toBeGreaterThan(0);
    for (const p of POINTS) {
      const m = models[p.id];
      for (const n of m.nights) {
        const row = rows.find((r) => r.pointId === p.id && r.night === n.night);
        if (row) expect(row.sky!.score, `demanda ${p.id} ${n.night}`).toBe(n.score);
        const alert = alerts.find((a) => a.point.id === p.id && a.sky.night === n.night);
        expect(!!alert, `alerta ${p.id} ${n.night}`).toBe(n.score >= EXCELLENT);
        if (alert) expect(alert.sky.score).toBe(n.score);
        // el score de la noche es el promedio de su mejor ventana
        if (n.window) expect(n.score).toBe(n.window.meanScore);
        expect(n.label).toBe(labelFor(n.score));
      }
      const week = m.week;
      if (week.kind === 'ok') {
        const same = m.nights.find((n) => n.night === week.best.night)!;
        expect(week.best.score).toBe(same.score);
        expect(week.best.window).toEqual(same.window);
      }
      // pin del mapa / chip = noche próxima
      expect(m.tonight).toBe(m.nights[0]);
    }
  });

  test('caso del QA: Susques viernes 27 → el mismo valor en demanda y mejor ventana', () => {
    const m = models.susques;
    const fri = m.nights.find((n) => n.night === '2026-11-27')!;
    const row = demandRows(models, demoDemand()).find((r) => r.pointId === 'susques' && r.night === '2026-11-27');
    expect(row?.sky?.score).toBe(fri.score);
    if (m.week.kind === 'ok' && m.week.best.night === '2026-11-27') expect(m.week.best.score).toBe(fri.score);
  });

  test('las ventanas no salen de la noche astronómica', () => {
    for (const p of POINTS) for (const n of models[p.id].nights) {
      if (!n.window) continue;
      expect(+n.window.start).toBeGreaterThanOrEqual(+n.astroDusk);
      expect(+n.window.end).toBeLessThanOrEqual(+n.astroDawn);
      expect(+n.window.end).toBeGreaterThan(+n.window.start);
    }
    // Susques esta noche: la ventana termina al amanecer astronómico (05:06), no a las 06:00
    const t = models.susques.tonight;
    expect(t.window).toBeDefined();
    expect(+t.window!.end).toBe(+t.astroDawn);
  });
});

