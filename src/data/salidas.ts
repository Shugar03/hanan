import type { ObservationWindow, PointId, Salida } from '../sky/types';
import { nightOf } from '../sky/time';
import { fixtures } from './sources';

type Raw = Omit<Salida, 'departure'> & { departure: string };
const KEY = 'hanan:salidas-publicadas';
const toSalida = (r: Raw): Salida => ({ ...r, departure: new Date(r.departure) });

export const demoSalidas = (): Salida[] => (fixtures.salidas as Raw[]).map(toSalida);
export function publishedSalidas(): Salida[] {
  try { return (JSON.parse(localStorage.getItem(KEY) || '[]') as Raw[]).map(toSalida); } catch { return []; }
}
export function publishSalida(s: Salida) {
  const all = publishedSalidas();
  all.push(s);
  localStorage.setItem(KEY, JSON.stringify(all));
}
export function updateSalida(s: Salida) {
  const all = publishedSalidas().map((x) => (x.id === s.id ? s : x));
  localStorage.setItem(KEY, JSON.stringify(all));
}
export const allSalidas = () => [...demoSalidas(), ...publishedSalidas()].sort((a, b) => +a.departure - +b.departure);

export const salidasForNight = (list: Salida[], pointId: PointId, night: string) =>
  list.filter((s) => s.pointId === pointId && nightOf(s.departure) === night);

export const salidaInWindow = (s: Salida, w: ObservationWindow) =>
  +s.departure < +w.end && +s.departure + s.durationH * 3600_000 > +w.start;

export function whatsappLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}
