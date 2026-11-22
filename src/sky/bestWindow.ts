import type { ObservationWindow, SkyScore } from './types';
import { nightOf } from './time';

export const WINDOW_MIN = 40;
export const DIFFICULT_WEEK = 'Semana difícil para el cielo profundo';
const H = 3600_000;

/** Ventanas continuas (horas consecutivas, score ≥ 40). */
export function windows(scores: SkyScore[], min = WINDOW_MIN): ObservationWindow[] {
  const out: ObservationWindow[] = [];
  let run: SkyScore[] = [];
  const flush = () => {
    if (run.length) out.push({ start: run[0].time, end: new Date(run[run.length - 1].time.getTime() + H), meanScore: Math.round(run.reduce((a, s) => a + s.score, 0) / run.length) });
    run = [];
  };
  const sorted = [...scores].sort((a, b) => a.time.getTime() - b.time.getTime());
  for (const s of sorted) {
    const prev = run[run.length - 1];
    if (s.score >= min && (!prev || s.time.getTime() - prev.time.getTime() === H)) run.push(s);
    else { flush(); if (s.score >= min) run.push(s); }
  }
  flush();
  return out;
}

const value = (w: ObservationWindow) => w.meanScore * ((w.end.getTime() - w.start.getTime()) / H);

/** Mejor ventana: maximiza promedio × duración; desempate, la más temprana. */
export function bestWindow(scores: SkyScore[], min = WINDOW_MIN): ObservationWindow | undefined {
  let best: ObservationWindow | undefined;
  for (const w of windows(scores, min)) if (!best || value(w) > value(best)) best = w;
  return best;
}

export type WeekVerdict =
  | { kind: 'ok'; window: ObservationWindow; night: string }
  | { kind: 'dificil'; message: string };

export function weekVerdict(scores: SkyScore[]): WeekVerdict {
  const w = bestWindow(scores);
  if (!w) return { kind: 'dificil', message: DIFFICULT_WEEK };
  return { kind: 'ok', window: w, night: nightOf(w.start) };
}

/** Agrupa scores por noche (fecha de la tarde). */
export function byNight(scores: SkyScore[]): Map<string, SkyScore[]> {
  const m = new Map<string, SkyScore[]>();
  for (const s of scores) { const k = nightOf(s.time); if (!m.has(k)) m.set(k, []); m.get(k)!.push(s); }
  return m;
}

/** Máximo score de cada noche. */
export function nightPeaks(scores: SkyScore[]): { night: string; peak: number; window?: ObservationWindow }[] {
  return [...byNight(scores)].map(([night, ss]) => ({ night, peak: Math.max(0, ...ss.map((s) => s.score)), window: bestWindow(ss) }));
}
