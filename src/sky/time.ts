// Jujuy usa UTC−3 todo el año (sin horario de verano).
export const TZ_OFFSET_H = -3;
const OFF = TZ_OFFSET_H * 3600_000;

/** Partes de fecha/hora en hora local de Jujuy. */
export function localParts(d: Date) {
  const l = new Date(d.getTime() + OFF);
  return { y: l.getUTCFullYear(), m: l.getUTCMonth() + 1, d: l.getUTCDate(), h: l.getUTCHours(), min: l.getUTCMinutes(), dow: l.getUTCDay() };
}
const p2 = (n: number) => String(n).padStart(2, '0');
export const localDateStr = (d: Date) => { const p = localParts(d); return `${p.y}-${p2(p.m)}-${p2(p.d)}`; };
export const hhmm = (d: Date) => { const p = localParts(d); return `${p2(p.h)}:${p2(p.min)}`; };
/** "2026-11-22T22:00" (hora local) → Date */
export const parseLocal = (s: string) => new Date(`${s.length === 16 ? s + ':00' : s}-03:00`);
/** Fecha (YYYY-MM-DD) de la tarde a la que pertenece una hora: antes del mediodía es la noche anterior. */
export function nightOf(d: Date): string {
  const p = localParts(d);
  if (p.h >= 12) return localDateStr(d);
  return localDateStr(new Date(d.getTime() - 24 * 3600_000));
}
/** Mediodía local de una fecha YYYY-MM-DD */
export const localNoon = (date: string) => new Date(`${date}T12:00:00-03:00`);
export const addDays = (date: string, n: number) => localDateStr(new Date(localNoon(date).getTime() + n * 86400_000));

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function nightLabel(date: string, today?: string): string {
  if (today) {
    if (date === today) return 'esta noche';
    if (date === addDays(today, 1)) return 'mañana';
  }
  const p = localParts(localNoon(date));
  return `${DIAS[p.dow]} ${p.d}`;
}
export function longDate(date: string): string {
  const p = localParts(localNoon(date));
  return `${DIAS[p.dow]} ${p.d} de ${MESES[p.m - 1]}`;
}
export const monthOf = (d: Date) => localParts(d).m;
const DIAS_C = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export function nightShort(date: string, today?: string): string {
  if (today && date === today) return 'Hoy';
  const p = localParts(localNoon(date));
  return `${DIAS_C[p.dow]} ${p.d}`;
}
