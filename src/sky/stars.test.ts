import { describe, expect, it } from 'vitest';
import * as A from 'astronomy-engine';
import { altAzToEnu, cameraBasis, circumpolar, enuToAltAz, projectCam, radecToAltAz, toCam, unproject } from './stars';
import sky from '../data/catalog/sky.json';

const SUSQUES = { lat: -23.43, lon: -66.37, elevationM: 3600 };
const T = new Date('2026-06-20T22:00:00-03:00');
const T2 = new Date('2026-11-22T23:00:00-03:00');

/** Referencia independiente: estrella definida en astronomy-engine → Equator(of date) → Horizon con refracción. */
function reference(date: Date, raH: number, decDeg: number) {
  A.DefineStar(A.Body.Star2, raH, decDeg, 1000);
  const o = new A.Observer(SUSQUES.lat, SUSQUES.lon, SUSQUES.elevationM);
  const eq = A.Equator(A.Body.Star2, date, o, true, true);
  const h = A.Horizon(date, o, eq.ra, eq.dec, 'normal');
  return { alt: h.altitude, az: h.azimuth };
}

const STARS: [string, number, number][] = [
  ['Sirio', 6.7525, -16.7161],
  ['Canopus', 6.3992, -52.6957],
  ['Ácrux', 12.4433, -63.0991],
  ['Gacrux', 12.5194, -57.1132],
  ['Mimosa', 12.7953, -59.6888],
];

describe('radecToAltAz (Susques)', () => {
  for (const date of [T, T2]) for (const [name, ra, dec] of STARS) {
    it(`${name} ${date.toISOString()}`, () => {
      const got = radecToAltAz(date, SUSQUES, ra, dec);
      const ref = reference(date, ra, dec);
      expect(Math.abs(got.altDeg - ref.alt)).toBeLessThan(0.5);
      const dAz = Math.abs(((got.azDeg - ref.az + 540) % 360) - 180);
      if (ref.alt > -80) expect(dAz * Math.cos((ref.alt * Math.PI) / 180)).toBeLessThan(0.5);
    });
  }
  it('la Cruz del Sur está alta en junio a las 22 h y baja en noviembre a las 23 h', () => {
    expect(radecToAltAz(T, SUSQUES, 12.4433, -63.0991).altDeg).toBeGreaterThan(30);
    expect(radecToAltAz(T2, SUSQUES, 12.4433, -63.0991).altDeg).toBeLessThan(15);
  });
  it('el catálogo trae a Sirio con su nombre en español', () => {
    const s = sky.named.find((n) => n[1] === 'Sirio')!;
    const st = sky.stars[s[0] as number];
    expect(st[2]).toBeLessThan(-1.4);
    const got = radecToAltAz(T2, SUSQUES, st[0], st[1]);
    const ref = reference(T2, 6.7525, -16.7161);
    expect(Math.abs(got.altDeg - ref.alt)).toBeLessThan(0.5);
  });
});

describe('proyección', () => {
  it('el centro de la vista cae en el centro de la pantalla y unproject invierte', () => {
    const b = cameraBasis({ azDeg: 180, altDeg: 35, fovDeg: 110, width: 390, height: 844 });
    const v = altAzToEnu(35, 180);
    const c = toCam(b, v);
    const [x, y] = projectCam(b, c[0], c[1], c[2]);
    expect(x).toBeCloseTo(195, 6); expect(y).toBeCloseTo(422, 6);
    const w = altAzToEnu(20, 150); // al sudeste: mirando al sur, el este queda a la izquierda
    const cw = toCam(b, w);
    const [px, py] = projectCam(b, cw[0], cw[1], cw[2]);
    expect(px).toBeLessThan(195); expect(py).toBeGreaterThan(422);
    const back = enuToAltAz(unproject(b, px, py));
    expect(back.altDeg).toBeCloseTo(20, 6); expect(back.azDeg).toBeCloseTo(150, 6);
  });
  it('circumpolares desde Susques', () => {
    expect(circumpolar(-75, -23.43)).toBe('siempre');
    expect(circumpolar(80, -23.43)).toBe('nunca');
    expect(circumpolar(-16, -23.43)).toBeNull();
  });
});
