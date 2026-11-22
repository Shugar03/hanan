import type { DemandSignal, PointId } from '../sky/types';
import { fixtures } from './sources';

const KEY = 'hanan:quiero-ir';
type Mine = { pointId: PointId; night: string }[];

const mine = (): Mine => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
export const demoDemand = () => fixtures.demanda as DemandSignal[];

export const iWant = (pointId: PointId, night: string) => mine().some((m) => m.pointId === pointId && m.night === night);
export function toggleWant(pointId: PointId, night: string): boolean {
  const m = mine();
  const i = m.findIndex((x) => x.pointId === pointId && x.night === night);
  if (i >= 0) m.splice(i, 1); else m.push({ pointId, night });
  localStorage.setItem(KEY, JSON.stringify(m));
  return i < 0;
}
/** Señales agregadas: ejemplo (fixture) + las propias de este dispositivo. */
export function demandCount(pointId: PointId, night: string): { demo: number; mine: number; total: number } {
  const demo = demoDemand().find((d) => d.pointId === pointId && d.night === night)?.count ?? 0;
  const own = iWant(pointId, night) ? 1 : 0;
  return { demo, mine: own, total: demo + own };
}
export function aggregated(): DemandSignal[] {
  const map = new Map<string, DemandSignal>();
  for (const d of demoDemand()) map.set(d.pointId + d.night, { ...d });
  for (const m of mine()) {
    const k = m.pointId + m.night;
    const cur = map.get(k) ?? { pointId: m.pointId, night: m.night, count: 0 };
    cur.count += 1; map.set(k, cur);
  }
  return [...map.values()];
}
