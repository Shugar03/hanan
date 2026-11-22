// Modelo puro (sin React): scores por punto y métricas de noche compartidas por todas las pantallas.
import type { DemandSignal, HourlyConditions, ObservationPoint, PointId, SkyScore } from './sky/types';
import { scoreAstronomyOnly, scoreHour } from './sky/score';
import { byNight } from './sky/bestWindow';
import { bestNight, scoreNight, type NightScore, type Week } from './sky/night';
import { localDateStr, localParts, nightOf } from './sky/time';
import { POINTS } from './data/points';
import type { Forecast } from './data/forecast';

const H = 3600_000;
export const floorHour = (d: Date) => new Date(Math.floor(d.getTime() / H) * H);

/** Noche "próxima" respecto de un instante: antes de las 7 h sigue siendo la noche anterior. */
export function upcomingNight(now: Date): string {
  return localParts(now).h < 7 ? nightOf(now) : localDateStr(now);
}

export type PointModel = {
  point: ObservationPoint;
  hours: SkyScore[];                 // 7 días desde la hora actual
  conditions: Map<number, HourlyConditions>;
  timeline: SkyScore[];              // 72 h
  nights: NightScore[];              // desde la noche próxima, hasta 7
  tonight: NightScore;
  week: Week;
  forecastCoverage: 'completo' | 'parcial' | 'ninguno';
};

export function computePoint(point: ObservationPoint, fc: HourlyConditions[], now: Date): PointModel {
  const conditions = new Map(fc.map((c) => [c.time.getTime(), c]));
  const start = floorHour(now).getTime();
  const hours: SkyScore[] = [];
  let withFc = 0;
  for (let i = 0; i < 24 * 7; i++) {
    const t = start + i * H;
    const c = conditions.get(t);
    if (c) { withFc++; hours.push(scoreHour(c, point)); } else hours.push(scoreAstronomyOnly(new Date(t), point));
  }
  const first = upcomingNight(now);
  const nights = [...byNight(hours)].filter(([n]) => n >= first).slice(0, 7).map(([n, ss]) => scoreNight(n, ss, point));
  const tonight = nights.find((n) => n.night === first) ?? nights[0];
  return {
    point, hours, conditions, timeline: hours.slice(0, 72), nights, tonight,
    week: bestNight(nights),
    forecastCoverage: withFc === 0 ? 'ninguno' : withFc < hours.length ? 'parcial' : 'completo',
  };
}

export function computeAll(fc: Forecast, now: Date): Record<PointId, PointModel> {
  const out = {} as Record<PointId, PointModel>;
  for (const p of POINTS) out[p.id] = computePoint(p, fc[p.id] ?? [], now);
  return out;
}

export const nightOfPoint = (m: PointModel, night: string) => m.nights.find((n) => n.night === night);

export type DemandRow = DemandSignal & { sky?: NightScore };
/** Señales de demanda de los próximos 7 días con el score de esa noche. */
export function demandRows(models: Record<PointId, PointModel>, signals: DemandSignal[]): DemandRow[] {
  return signals
    .map((d) => ({ ...d, sky: nightOfPoint(models[d.pointId], d.night) }))
    .filter((d) => d.sky && d.count > 0)
    .sort((a, b) => b.count - a.count);
}

export const EXCELLENT = 85;
/** Alertas de noche excelente: score de la noche ≥ 85. */
export function excellentAlerts(models: Record<PointId, PointModel>): { point: ObservationPoint; sky: NightScore }[] {
  return POINTS.flatMap((p) => models[p.id].nights.filter((n) => n.score >= EXCELLENT).map((sky) => ({ point: p, sky })));
}
