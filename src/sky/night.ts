// Métrica única de noche. Todas las pantallas (pines, chips, mejor ventana, demanda, alertas, salidas)
// usan scoreNight(): "score de la noche" = score medio de la mejor ventana de esa noche,
// con la ventana recortada a la noche astronómica.
import type { ObservationPoint, ObservationWindow, ScoreLabel, SkyScore } from './types';
import { bestWindow, DIFFICULT_WEEK } from './bestWindow';
import { astroNight } from './ephemeris';
import { labelFor } from './score';

type Pt = Pick<ObservationPoint, 'lat' | 'lon' | 'elevationM'>;
const H = 3600_000;

export type NightScore = {
  night: string;                     // YYYY-MM-DD de la tarde
  /** Score de la noche: promedio de la mejor ventana. Sin ventana (ninguna hora ≥ 40): el pico horario, que es < 40. */
  score: number;
  label: ScoreLabel;
  /** Mejor ventana de la noche, recortada al crepúsculo astronómico. */
  window?: ObservationWindow;
  /** Horas (enteras) de la ventana antes del recorte: es lo que pondera promedio × duración. */
  windowHours: number;
  /** Pico horario (solo para mostrarlo rotulado como "pico"). */
  peak?: { score: number; time: Date };
  astroDusk: Date; astroDawn: Date;
};

export function clipToNight(w: ObservationWindow, dusk: Date, dawn: Date): ObservationWindow {
  return { start: new Date(Math.max(+w.start, +dusk)), end: new Date(Math.min(+w.end, +dawn)), meanScore: w.meanScore };
}

export function scoreNight(night: string, hours: SkyScore[], p: Pt): NightScore {
  const { dusk, dawn } = astroNight(night, p);
  const raw = bestWindow(hours);
  // Una ventana que no toca la noche astronómica (solo crepúsculo) no cuenta.
  const window = raw && +raw.end > +dusk && +raw.start < +dawn ? clipToNight(raw, dusk, dawn) : undefined;
  const top = hours.reduce<SkyScore | undefined>((a, s) => (!a || s.score > a.score ? s : a), undefined);
  const score = window ? window.meanScore : top?.score ?? 0;
  return {
    night, score, label: labelFor(score), window,
    windowHours: window && raw ? Math.round((+raw.end - +raw.start) / H) : 0,
    peak: top && top.score > 0 ? { score: top.score, time: top.time } : undefined,
    astroDusk: dusk, astroDawn: dawn,
  };
}

export type Week =
  | { kind: 'ok'; best: NightScore }
  | { kind: 'dificil'; message: string };

/** Mejor noche: la de mayor promedio × duración de su ventana; desempate, la más temprana. */
export function bestNight(nights: NightScore[]): Week {
  let best: NightScore | undefined;
  for (const n of nights) {
    if (!n.window) continue;
    if (!best || n.score * n.windowHours > best.score * best.windowHours) best = n;
  }
  return best ? { kind: 'ok', best } : { kind: 'dificil', message: DIFFICULT_WEEK };
}
