import { hhmm, localDateStr, longDate, nightLabel } from '../sky/time';
export { hhmm, longDate, nightLabel };

export const pct = (x: number) => `${Math.round(x * 100)} %`;
export const deg = (x: number) => `${Math.round(x)}°`;
export const fmtNum = (x: number, d = 1) => x.toLocaleString('es-AR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
export const range = (a: Date, b: Date) => `${hhmm(a)} a ${hhmm(b)}`;

export function ago(d: Date, now = new Date()): string {
  const m = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (m < 1) return 'recién';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
}
export const dayKey = localDateStr;
