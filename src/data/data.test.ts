import { describe, expect, test } from 'vitest';
import { parsePass } from './pass';
import { fixtures } from './sources';
import { fixtureForecast } from './forecast';
import { POINTS } from './points';

describe('data', () => {
  test('Paso de Jama: parsea estadoPrioridad/estadoVialidad del fixture', () => {
    const s = parsePass(fixtures.jamaHtml, new Date());
    expect(s.state).toBe('abierto');
    expect(s.sourceUpdatedAt).toBe('2026-11-20T17:55:00-03:00');
  });
  test('Paso de Jama: HTML roto → desconocido, nunca un estado inventado', () => {
    expect(parsePass('<html></html>', new Date()).state).toBe('desconocido');
    expect(parsePass('var estadoPrioridad = "ABIERTO"; var estadoVialidad = "CORTE TOTAL";', new Date()).state).toBe('restringido');
    expect(parsePass('var estadoPrioridad = "CERRADO";', new Date()).state).toBe('cerrado');
  });
  test('Open-Meteo multi-coordenada → 6 puntos × 168 h', () => {
    const f = fixtureForecast().data;
    expect(POINTS).toHaveLength(6);
    for (const p of POINTS) expect(f[p.id]).toHaveLength(168);
  });
});
