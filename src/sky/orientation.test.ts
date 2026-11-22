import { describe, expect, it } from 'vitest';
import {
  alphaFromCompassHeading, angleDiff, applyCalibration, calibrationFrom, deviceToView, diagonalFov, lowPassAngle, smoothView,
} from './orientation';

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(angleDiff(a, b))).toBeLessThan(eps);

describe('deviceToView (W3C alpha/beta/gamma → cámara trasera)', () => {
  it('teléfono vertical mirando al norte → az 0, alt 0, roll 0', () => {
    const v = deviceToView(0, 90, 0);
    close(v.azDeg, 0); expect(v.altDeg).toBeCloseTo(0, 6); expect(v.rollDeg).toBeCloseTo(0, 6);
  });
  it('inclinado 45° hacia arriba → alt 45', () => {
    const v = deviceToView(0, 135, 0);
    expect(v.altDeg).toBeCloseTo(45, 6); close(v.azDeg, 0); expect(v.rollDeg).toBeCloseTo(0, 6);
  });
  it('mirando al este → az 90 (alpha crece antihorario: alpha = 270)', () => {
    const v = deviceToView(270, 90, 0);
    close(v.azDeg, 90); expect(v.altDeg).toBeCloseTo(0, 6);
    close(deviceToView(alphaFromCompassHeading(90), 90, 0).azDeg, 90);
  });
  it('mirando al sur a 30° de altura', () => {
    const v = deviceToView(180, 120, 0);
    close(v.azDeg, 180); expect(v.altDeg).toBeCloseTo(30, 6);
  });
  it('acostado boca arriba sobre la cabeza (pantalla hacia el suelo, cámara al cielo) → alt 90', () => {
    expect(deviceToView(0, 180, 0).altDeg).toBeCloseTo(90, 6);
    expect(deviceToView(0, 0, 180).altDeg).toBeCloseTo(90, 6);
  });
  it('sobre la mesa, pantalla arriba → la cámara mira al suelo (alt −90)', () => {
    expect(deviceToView(0, 0, 0).altDeg).toBeCloseTo(-90, 6);
  });
  it('roll: con la UI en apaisado el "arriba" de pantalla es el costado del teléfono', () => {
    // teléfono vertical mirando al norte; si la UI rota 90°, el arriba de pantalla apunta al este → roll +90
    const v = deviceToView(0, 90, 0, 90);
    close(v.azDeg, 0); expect(v.altDeg).toBeCloseTo(0, 6); expect(v.rollDeg).toBeCloseTo(90, 6);
    expect(deviceToView(0, 90, 0, 270).rollDeg).toBeCloseTo(-90, 6);
    // gamma con el teléfono vertical gira el rumbo, no el roll
    const g = deviceToView(0, 90, -20);
    close(g.azDeg, 20); expect(g.rollDeg).toBeCloseTo(0, 6);
  });
});

describe('suavizado', () => {
  it('pasa-bajos circular sin salto 359 → 0', () => {
    const x = lowPassAngle(359, 1, 0.5);
    expect(Math.abs(angleDiff(x, 0))).toBeLessThan(1e-9);
    expect(lowPassAngle(10, 350, 0.25)).toBeCloseTo(5, 9);
  });
  it('smoothView converge y no da la vuelta larga', () => {
    let v = { azDeg: 358, altDeg: 10, rollDeg: 179 };
    for (let i = 0; i < 50; i++) v = smoothView(v, { azDeg: 2, altDeg: 20, rollDeg: -179 }, 0.3);
    close(v.azDeg, 2, 1e-3); expect(v.altDeg).toBeCloseTo(20, 3); close(v.rollDeg, -179, 1e-3);
  });
});

describe('calibración y campo de visión', () => {
  it('el corrimiento lleva la lectura al objeto', () => {
    const c = calibrationFrom({ azDeg: 355, altDeg: 30 }, { azDeg: 5, altDeg: 31.5 }, 'Sirio');
    expect(c.dAz).toBeCloseTo(10, 9); expect(c.dAlt).toBeCloseTo(1.5, 9);
    const v = applyCalibration({ azDeg: 355, altDeg: 30, rollDeg: 0 }, c);
    close(v.azDeg, 5); expect(v.altDeg).toBeCloseTo(31.5, 9);
  });
  it('FOV vertical 60° en 390×844 → diagonal mayor', () => {
    const d = diagonalFov(60, 390, 844);
    expect(d).toBeGreaterThan(60); expect(d).toBeLessThan(70);
  });
});
