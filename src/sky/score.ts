import type { HourlyConditions, ObservationPoint, ScoreLabel, SkyFactors, SkyScore } from './types';
import { moonAltitude, moonIllumination, sunAltitude } from './ephemeris';

type Pt = Pick<ObservationPoint, 'lat' | 'lon' | 'elevationM'>;

export type ScoreInputs = {
  sunAltDeg: number; moonAltDeg: number; moonIllum: number; // iluminación 0–1
  cloudLow: number; cloudMid: number; cloudHigh: number; humidity: number; windGustKmh: number;
};

const r3 = (x: number) => Math.round(x * 1000) / 1000;

/** Fórmula normativa — docs/product/spec.md §4. */
export function factorsFrom(i: ScoreInputs): SkyFactors {
  const darkness = i.sunAltDeg <= -18 ? 1 : i.sunAltDeg <= -12 ? 0.5 : 0;
  const clouds = 1 - (0.5 * i.cloudLow + 0.3 * i.cloudMid + 0.2 * i.cloudHigh) / 100;
  const moon = 1 - i.moonIllum * Math.max(0, Math.sin((i.moonAltDeg * Math.PI) / 180));
  const humidity = i.humidity > 85 ? 0.5 : 1;
  const wind = i.windGustKmh > 50 ? 0.6 : 1;
  return { darkness, clouds: r3(clouds), moon: r3(moon), humidity, wind };
}

/** Etiqueta por score. "Día" se reserva para horas sin oscuridad (factor 0). */
export function labelFor(score: number, darkness = 1): ScoreLabel {
  if (darkness === 0) return 'Día';
  if (score >= 85) return 'Excelente';
  if (score >= 70) return 'Muy bueno';
  if (score >= 40) return 'Aceptable';
  return 'Malo';
}

export type ScoreTone = 'bueno' | 'medio' | 'malo' | 'dia';
export function toneFor(s: Pick<SkyScore, 'score' | 'label'>): ScoreTone {
  if (s.label === 'Día') return 'dia';
  return s.score >= 70 ? 'bueno' : s.score >= 40 ? 'medio' : 'malo';
}

export function scoreFromInputs(time: Date, i: ScoreInputs): SkyScore {
  const f = factorsFrom(i);
  const raw = 100 * f.darkness * (1 - (0.5 * i.cloudLow + 0.3 * i.cloudMid + 0.2 * i.cloudHigh) / 100)
    * (1 - i.moonIllum * Math.max(0, Math.sin((i.moonAltDeg * Math.PI) / 180))) * f.humidity * f.wind;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  return { time, score, label: labelFor(score, f.darkness), factors: f };
}

/** Score de una hora con pronóstico. */
export function scoreHour(c: HourlyConditions, p: Pt): SkyScore {
  return scoreFromInputs(c.time, {
    sunAltDeg: sunAltitude(c.time, p), moonAltDeg: moonAltitude(c.time, p), moonIllum: moonIllumination(c.time),
    cloudLow: c.cloudLow, cloudMid: c.cloudMid, cloudHigh: c.cloudHigh, humidity: c.humidity, windGustKmh: c.windGustKmh,
  });
}

/** Sin pronóstico (simulador fuera de 7 días): solo oscuridad y luna. */
export function scoreAstronomyOnly(time: Date, p: Pt): SkyScore {
  const s = scoreFromInputs(time, {
    sunAltDeg: sunAltitude(time, p), moonAltDeg: moonAltitude(time, p), moonIllum: moonIllumination(time),
    cloudLow: 0, cloudMid: 0, cloudHigh: 0, humidity: 0, windGustKmh: 0,
  });
  return { ...s, astronomyOnly: true };
}
