import { beforeEach, describe, expect, it } from 'vitest';
import {
  _resetStore, createSalida, cuposRestantes, garantiaEstado, getSalida, ics, listReservas, listSalidas,
  ordenarSalidas, reservar, resumenReserva, filtrarSalidas, type MarketSalida, type NuevaSalida,
} from './marketplace';

const H = 3600_000;
beforeEach(() => _resetStore());

describe('fixture del marketplace', () => {
  it('14–18 salidas demo, en los 6 puntos, nocturnas, con precio de ejemplo', () => {
    const all = listSalidas();
    expect(all.length).toBeGreaterThanOrEqual(14);
    expect(all.length).toBeLessThanOrEqual(18);
    expect(new Set(all.map((s) => s.pointId)).size).toBe(6);
    for (const s of all) {
      expect(s.demo).toBe(true);
      expect(s.demoPrice).toBe(true);
      expect(s.departure).toMatch(/-03:00$/);
      expect(s.booked).toBeLessThanOrEqual(s.capacityMax);
    }
  });
});

describe('garantía de cielo', () => {
  const s = getSalida('mk-01')!; // 2026-11-22T21:30-03:00
  const dep = +new Date(s.departure);
  const low = () => 30, high = () => 80, none = () => null;
  it('sin score → sin_datos', () => expect(garantiaEstado(s, none, new Date(dep - 2 * H))).toBe('sin_datos'));
  it('exactamente T−6 h con score < 40 → reprogramación sugerida', () =>
    expect(garantiaEstado(s, low, new Date(dep - 6 * H))).toBe('reprogramacion_sugerida'));
  it('T−6 h + 1 min (todavía no) → ok', () => expect(garantiaEstado(s, low, new Date(dep - 6 * H - 60_000))).toBe('ok'));
  it('dentro de T−6 h con score ≥ 40 → ok', () => expect(garantiaEstado(s, high, new Date(dep - 1 * H))).toBe('ok'));
  it('score exactamente 40 no dispara', () => expect(garantiaEstado(s, () => 40, new Date(dep - 1 * H))).toBe('ok'));
  it('score 39 a T−5 h dispara', () => expect(garantiaEstado(s, () => 39, new Date(dep - 5 * H))).toBe('reprogramacion_sugerida'));
  it('usa la noche de la salida', () => {
    const seen: string[] = [];
    garantiaEstado(s, (p, n) => { seen.push(`${p}:${n}`); return 50; }, new Date(dep - H));
    expect(seen).toEqual(['susques:2026-11-22']);
  });
});

describe('cupos', () => {
  const now = new Date('2026-11-22T10:00:00-03:00');
  it('no deja reservar más que el cupo restante', () => {
    const s = getSalida('mk-01')!; // 12 máx, 7 tomados
    expect(cuposRestantes(s)).toBe(5);
    expect(reservar(s.id, 6, now).ok).toBe(false);
    const r = reservar(s.id, 5, now);
    expect(r.ok).toBe(true);
    expect(cuposRestantes(s)).toBe(0);
    const again = reservar(s.id, 1, now);
    expect(again.ok).toBe(false);
    expect(listReservas()).toHaveLength(1);
  });
  it('salida llena rechaza', () => expect(reservar('mk-06', 1, now)).toEqual({ ok: false, error: 'No quedan cupos.' }));
  it('rechaza 0 personas y salidas ya partidas', () => {
    expect(reservar('mk-02', 0, now).ok).toBe(false);
    expect(reservar('mk-02', 1, new Date('2026-11-23T00:00:00-03:00')).ok).toBe(false);
  });
  it('seña del 30 %', () => {
    const r = reservar('mk-02', 2, now);
    expect(r.ok && r.reserva.totalARS).toBe(150000);
    expect(r.ok && r.reserva.depositARS).toBe(45000);
    expect(resumenReserva(getSalida('mk-02')!, 2).saldoARS).toBe(105000);
  });
});

describe('ics', () => {
  it('VCALENDAR válido con DTSTART con zona', () => {
    const txt = ics(getSalida('mk-04')!, new Date('2026-11-22T15:00:00Z'));
    const lines = txt.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(txt.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(txt).toContain('VERSION:2.0');
    expect(txt).toContain('DTSTART;TZID=America/Argentina/Jujuy:20261123T223000');
    expect(txt).toContain('DTEND;TZID=America/Argentina/Jujuy:20261124T023000');
    expect(txt).toContain('BEGIN:VTIMEZONE');
    expect(txt).toContain('DTSTAMP:20261122T150000Z');
    expect(txt).toContain('UID:mk-04@hanan.app');
    expect(txt.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    const enc = new TextEncoder();
    for (const l of lines) expect(enc.encode(l).length).toBeLessThanOrEqual(75);
    expect(txt).not.toMatch(/[^\r]\n/);
  });
});

describe('orden y filtros', () => {
  const scores: Record<string, number> = { susques: 90, olaroz: 95, jama: 70, salinas: 60, purmamarca: 50 };
  const ns = (p: string) => scores[p] ?? null; // tilcara sin datos
  it('mejor cielo: score desc y sin datos al final', () => {
    const sorted = ordenarSalidas(listSalidas(), 'cielo', ns);
    const vals = sorted.map((s) => ns(s.pointId) ?? -1);
    expect(vals).toEqual([...vals].sort((a, b) => b - a));
    expect(sorted[0].pointId).toBe('olaroz');
    expect(sorted.at(-1)!.pointId).toBe('tilcara');
  });
  it('empate de cielo: verificado primero', () => {
    const flat = () => 80;
    const sorted = ordenarSalidas(listSalidas().filter((s) => ['mk-03', 'mk-01'].includes(s.id)), 'cielo', flat);
    expect(sorted.map((s) => s.id)).toEqual(['mk-01', 'mk-03']); // Ana registrada antes que Lucía
  });
  it('precio ascendente y próximas', () => {
    const p = ordenarSalidas(listSalidas(), 'precio', ns).map((s) => s.pricePerPersonARS);
    expect(p).toEqual([...p].sort((a, b) => a - b));
    const d = ordenarSalidas(listSalidas(), 'proximas', ns).map((s) => +new Date(s.departure));
    expect(d).toEqual([...d].sort((a, b) => a - b));
  });
  it('filtra por punto, noche e idioma', () => {
    expect(filtrarSalidas(listSalidas(), { pointId: 'jama' }).every((s) => s.pointId === 'jama')).toBe(true);
    expect(filtrarSalidas(listSalidas(), { night: '2026-11-22' }).map((s) => s.id).sort()).toEqual(['mk-01', 'mk-02']);
    expect(filtrarSalidas(listSalidas(), { language: 'pt' }).every((s) => s.languages.includes('pt'))).toBe(true);
  });
});

describe('crear salida', () => {
  const now = new Date('2026-11-22T10:00:00-03:00');
  const base: NuevaSalida = {
    title: 'Mi salida de prueba', guideName: 'Guía de prueba', whatsapp: '5493881234567', pointId: 'susques',
    departure: '2026-11-25T22:00:00-03:00', durationH: 3, capacityMin: 2, capacityMax: 8, pricePerPersonARS: 50000,
    includes: ['Telescopio'], meetingPoint: 'Susques', physicalLevel: 'bajo', maxAltitudeM: 3605, languages: ['es'],
    weatherPolicy: 'Si a 6 h el score es menor a 40, reprogramo.',
  };
  it('valida y guarda; aparece en el listado', () => {
    expect(createSalida({ ...base, capacityMin: 10, capacityMax: 5 }, now).ok).toBe(false);
    expect(createSalida({ ...base, departure: '2026-11-20T22:00:00-03:00' }, now).ok).toBe(false);
    const r = createSalida(base, now);
    expect(r.ok).toBe(true);
    const s = r.ok ? (getSalida(r.salida.id) as MarketSalida) : undefined;
    expect(s?.local).toBe(true);
    expect(s?.demoPrice).toBe(false);
    expect(listSalidas()).toHaveLength(17);
  });
});

describe('iniciales', () => {
  it('ignora rótulos demo y conectores', async () => {
    const { initialsOf } = await import('./marketplace');
    expect(initialsOf('Guía demo · Ana')).toBe('A');
    expect(initialsOf('Guía de prueba · Sol')).toBe('PS');
  });
});
