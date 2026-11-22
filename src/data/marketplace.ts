// Marketplace de salidas (CONTEXT.md: Guía, Operador, Salida, Reserva, Reprogramación).
// Puro salvo por el almacenamiento local (localStorage en el navegador, memoria en tests).
// En el MVP todo es de ejemplo: perfiles ficticios, precios de ejemplo y pago simulado.
import raw from '../../fixtures/demo-marketplace.json';
import type { PointId } from '../sky/types';
import { localParts, nightOf } from '../sky/time';
import { pointById, shortName } from './points';

export type PhysicalLevel = 'bajo' | 'medio' | 'exigente';

export type Guide = {
  id: string; name: string; initials: string;
  kind: 'guia' | 'operador';
  /** Inscripto en el Registro Único de Guías de Turismo de Jujuy (Ley provincial 6308). */
  registeredLey6308: boolean;
  /** Operador con legajo de agencia de viajes (Ley nacional 18.829). */
  legajo18829: boolean;
  languages: string[]; ratingDemo: number; salidasCount: number;
  base: string; whatsapp: string; bio: string; demo: boolean;
};

export type MarketSalida = {
  id: string; title: string; guideId: string; pointId: PointId;
  /** ISO con zona, p. ej. "2026-11-22T21:30:00-03:00". */
  departure: string; durationH: number;
  capacityMin: number; capacityMax: number;
  /** Lugares ya tomados fuera de este dispositivo (dato del fixture). */
  booked: number;
  /** Precio por persona fijado por el guía, en ARS. */
  pricePerPersonARS: number;
  /** true: precio de ejemplo (demo), no es una tarifa real. */
  demoPrice: boolean;
  includes: string[];
  /** Localidad de encuentro (sin direcciones exactas). */
  meetingPoint: string;
  physicalLevel: PhysicalLevel; maxAltitudeM: number;
  languages: string[];
  /** Política de clima ("garantía de cielo"). */
  weatherPolicy: string;
  demo: boolean;
  /** Creada en este dispositivo con CrearSalidaForm. */
  local?: boolean;
};

export type ReservaEstado = 'confirmada' | 'reprogramacion_sugerida' | 'realizada';
export type Reserva = {
  id: string; salidaId: string; people: number;
  pricePerPersonARS: number; totalARS: number;
  /** Seña del 30 % (simulada en el MVP). */
  depositARS: number;
  createdAt: string; paymentSimulated: true;
};

export type NightScoreFn = (pointId: string, night: string) => number | null;
export type SortKey = 'cielo' | 'proximas' | 'precio';
export type GarantiaEstado = 'ok' | 'reprogramacion_sugerida' | 'sin_datos';

export const DEPOSIT_RATE = 0.3;
/** Garantía de cielo: a T−6 h o menos, score de la noche < 40 → reprogramación sugerida. */
export const GARANTIA_HORAS = 6;
export const GARANTIA_UMBRAL = 40;
const H = 3600_000;

// ---------- Almacenamiento (localStorage o memoria) ----------
const KEYS = { salidas: 'hanan:mk-salidas', reservas: 'hanan:mk-reservas', guide: 'hanan:mk-guia' } as const;
const mem = new Map<string, string>();
const ls = (): Storage | undefined => { try { return globalThis.localStorage ?? undefined; } catch { return undefined; } };
function readJSON<T>(k: string, fallback: T): T {
  try { const r = ls()?.getItem(k) ?? mem.get(k); return r ? (JSON.parse(r) as T) : fallback; } catch { return fallback; }
}
function writeJSON(k: string, v: unknown) {
  const s = JSON.stringify(v);
  try { const l = ls(); if (l) l.setItem(k, s); else mem.set(k, s); } catch { mem.set(k, s); }
}
/** Solo para tests. */
export function _resetStore() { mem.clear(); const l = ls(); Object.values(KEYS).forEach((k) => l?.removeItem(k)); }

// ---------- Guías ----------
const DEMO_GUIDES = (raw as { guides: Guide[] }).guides;
const DEMO_SALIDAS = (raw as { salidas: MarketSalida[] }).salidas;
export const LOCAL_GUIDE_ID = 'g-local';

export function localGuide(): Guide | undefined { return readJSON<Guide | undefined>(KEYS.guide, undefined); }
export const listGuides = (): Guide[] => [...DEMO_GUIDES, ...(localGuide() ? [localGuide()!] : [])];
export const getGuide = (id: string) => listGuides().find((g) => g.id === id);
export const isVerified = (g: Guide) => (g.kind === 'operador' ? g.legajo18829 : g.registeredLey6308);

/** Texto legal de la verificación (business-model §6). */
export function verificationText(g: Guide): { title: string; body: string } {
  const demo = g.demo ? ' Verificación de ejemplo: perfil ficticio, no consultado en el padrón oficial.' : '';
  if (g.kind === 'operador') {
    return g.legajo18829
      ? { title: 'Operador con legajo', body: `Agencia de viajes con legajo según la Ley nacional 18.829.${demo}` }
      : { title: 'Operador sin verificar', body: `No acreditó legajo de agencia de viajes (Ley nacional 18.829).${demo}` };
  }
  return g.registeredLey6308
    ? { title: 'Guía registrado', body: `Figura en el Registro Único de Guías de Turismo de Jujuy (Ley provincial 6308, Decreto 7843-CyT-23).${demo}` }
    : { title: 'Guía sin verificar', body: `No acreditó su inscripción en el Registro Único de Guías de Turismo de Jujuy (Ley provincial 6308).${demo}` };
}

// ---------- Salidas ----------
export const departureOf = (s: MarketSalida) => new Date(s.departure);
export const nightOfSalida = (s: MarketSalida) => nightOf(departureOf(s));
export const localSalidas = (): MarketSalida[] => readJSON<MarketSalida[]>(KEYS.salidas, []);
export const listSalidas = (): MarketSalida[] =>
  [...DEMO_SALIDAS, ...localSalidas()].sort((a, b) => +departureOf(a) - +departureOf(b));
export const getSalida = (id: string) => listSalidas().find((s) => s.id === id);

export type NuevaSalida = Omit<MarketSalida, 'id' | 'guideId' | 'booked' | 'demo' | 'demoPrice' | 'local'> & {
  guideName: string; whatsapp: string;
};

/** Errores de validación por campo (vacío = válida). */
export function validarSalida(n: Partial<NuevaSalida>, now = new Date()): Partial<Record<keyof NuevaSalida, string>> {
  const e: Partial<Record<keyof NuevaSalida, string>> = {};
  if (!n.title || n.title.trim().length < 4) e.title = 'Poné un título de al menos 4 letras.';
  if (!n.guideName || n.guideName.trim().length < 2) e.guideName = 'Indicá tu nombre o el del operador.';
  if (!n.whatsapp || n.whatsapp.replace(/\D/g, '').length < 8) e.whatsapp = 'WhatsApp con código de país, al menos 8 dígitos.';
  if (!n.pointId) e.pointId = 'Elegí un punto de observación.';
  const d = n.departure ? new Date(n.departure) : null;
  if (!d || Number.isNaN(+d)) e.departure = 'Fecha y hora inválidas.';
  else if (+d < +now) e.departure = 'La salida tiene que ser en el futuro.';
  if (!n.durationH || n.durationH < 0.5 || n.durationH > 12) e.durationH = 'Duración entre 0,5 y 12 h.';
  if (!n.capacityMin || n.capacityMin < 1) e.capacityMin = 'Cupo mínimo de al menos 1.';
  if (!n.capacityMax || n.capacityMax < 1 || n.capacityMax > 60) e.capacityMax = 'Cupo máximo entre 1 y 60.';
  else if (n.capacityMin && n.capacityMin > n.capacityMax) e.capacityMax = 'El máximo no puede ser menor que el mínimo.';
  if (!n.pricePerPersonARS || n.pricePerPersonARS < 1000) e.pricePerPersonARS = 'Precio por persona en ARS (mínimo 1.000).';
  if (!n.languages || n.languages.length === 0) e.languages = 'Al menos un idioma.';
  if (!n.meetingPoint || n.meetingPoint.trim().length < 3) e.meetingPoint = 'Indicá la localidad de encuentro.';
  if (!n.maxAltitudeM || n.maxAltitudeM < 0 || n.maxAltitudeM > 6500) e.maxAltitudeM = 'Altura máxima en metros (0 a 6500).';
  if (!n.weatherPolicy || n.weatherPolicy.trim().length < 10) e.weatherPolicy = 'Explicá la política de clima.';
  return e;
}

export function createSalida(n: NuevaSalida, now = new Date()): { ok: true; salida: MarketSalida } | { ok: false; errors: ReturnType<typeof validarSalida> } {
  const errors = validarSalida(n, now);
  if (Object.keys(errors).length) return { ok: false, errors };
  const prev = localGuide();
  const g: Guide = {
    id: LOCAL_GUIDE_ID, name: n.guideName.trim(), initials: initialsOf(n.guideName), kind: 'guia',
    registeredLey6308: false, legajo18829: false, languages: n.languages, ratingDemo: 0,
    salidasCount: (prev?.salidasCount ?? 0) + 1, base: n.meetingPoint.trim(), whatsapp: n.whatsapp.replace(/\D/g, ''),
    bio: 'Perfil creado en este dispositivo. La verificación contra el Registro Único de Guías se hace aparte.', demo: false,
  };
  writeJSON(KEYS.guide, g);
  const { guideName: _g, whatsapp: _w, ...rest } = n;
  const salida: MarketSalida = {
    ...rest, id: 'local-' + now.getTime().toString(36) + Math.random().toString(36).slice(2, 6),
    guideId: LOCAL_GUIDE_ID, booked: 0, demoPrice: false, demo: false, local: true,
  };
  writeJSON(KEYS.salidas, [...localSalidas(), salida]);
  return { ok: true, salida };
}

export const initialsOf = (name: string) =>
  name.replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter((w) => w && !/^(gu[ií]a|demo|operador|de|del|la|las|los|y)$/i.test(w)).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || 'G';

// ---------- Reservas ----------
export const listReservas = (): Reserva[] => readJSON<Reserva[]>(KEYS.reservas, []);
const reservedHere = (salidaId: string) => listReservas().filter((r) => r.salidaId === salidaId).reduce((a, r) => a + r.people, 0);
export const cuposRestantes = (s: MarketSalida) => Math.max(0, s.capacityMax - s.booked - reservedHere(s.id));

export const resumenReserva = (s: MarketSalida, people: number) => {
  const total = s.pricePerPersonARS * people;
  return { totalARS: total, depositARS: Math.round(total * DEPOSIT_RATE), saldoARS: total - Math.round(total * DEPOSIT_RATE) };
};

export function reservar(salidaId: string, people: number, now = new Date()): { ok: true; reserva: Reserva } | { ok: false; error: string } {
  const s = getSalida(salidaId);
  if (!s) return { ok: false, error: 'La salida no existe.' };
  if (!Number.isInteger(people) || people < 1) return { ok: false, error: 'La cantidad de personas tiene que ser 1 o más.' };
  if (+departureOf(s) <= +now) return { ok: false, error: 'La salida ya partió.' };
  const left = cuposRestantes(s);
  if (people > left) return { ok: false, error: left === 0 ? 'No quedan cupos.' : `Quedan ${left} cupos.` };
  const r = resumenReserva(s, people);
  const reserva: Reserva = {
    id: 'res-' + now.getTime().toString(36) + Math.random().toString(36).slice(2, 6), salidaId, people,
    pricePerPersonARS: s.pricePerPersonARS, totalARS: r.totalARS, depositARS: r.depositARS,
    createdAt: now.toISOString(), paymentSimulated: true,
  };
  writeJSON(KEYS.reservas, [...listReservas(), reserva]);
  return { ok: true, reserva };
}

// ---------- Garantía de cielo ----------
export function garantiaEstado(s: MarketSalida, nightScore: NightScoreFn, now: Date): GarantiaEstado {
  const sc = nightScore(s.pointId, nightOfSalida(s));
  if (sc == null || Number.isNaN(sc)) return 'sin_datos';
  const hoursLeft = (+departureOf(s) - +now) / H;
  return hoursLeft <= GARANTIA_HORAS && sc < GARANTIA_UMBRAL ? 'reprogramacion_sugerida' : 'ok';
}

export function estadoReserva(r: Reserva, s: MarketSalida | undefined, nightScore: NightScoreFn | undefined, now: Date): ReservaEstado {
  if (!s) return 'confirmada';
  if (+departureOf(s) + s.durationH * H < +now) return 'realizada';
  if (nightScore && garantiaEstado(s, nightScore, now) === 'reprogramacion_sugerida') return 'reprogramacion_sugerida';
  return 'confirmada';
}

// ---------- Orden y filtros ----------
export type Filtros = { pointId?: string; night?: string; language?: string };
export const filtrarSalidas = (list: MarketSalida[], f: Filtros) => list.filter((s) =>
  (!f.pointId || s.pointId === f.pointId) && (!f.night || nightOfSalida(s) === f.night) && (!f.language || s.languages.includes(f.language)));

/** Mejor cielo: score de la noche desc (sin datos al final); desempate: verificado, calificación, más próxima. */
export function ordenarSalidas(list: MarketSalida[], by: SortKey, nightScore: NightScoreFn): MarketSalida[] {
  const sc = new Map(list.map((s) => [s.id, nightScore(s.pointId, nightOfSalida(s))]));
  const g = (s: MarketSalida) => getGuide(s.guideId);
  const byDate = (a: MarketSalida, b: MarketSalida) => +departureOf(a) - +departureOf(b);
  return [...list].sort((a, b) => {
    if (by === 'proximas') return byDate(a, b);
    if (by === 'precio') return a.pricePerPersonARS - b.pricePerPersonARS || byDate(a, b);
    const d = (sc.get(b.id) ?? -1) - (sc.get(a.id) ?? -1);
    if (d) return d;
    const ga = g(a), gb = g(b);
    const v = Number(gb ? isVerified(gb) : 0) - Number(ga ? isVerified(ga) : 0);
    return v || (gb?.ratingDemo ?? 0) - (ga?.ratingDemo ?? 0) || byDate(a, b);
  });
}

// ---------- Calendario (.ics, RFC 5545) ----------
const TZID = 'America/Argentina/Jujuy';
const p2 = (n: number) => String(n).padStart(2, '0');
const icsLocal = (d: Date) => { const p = localParts(d); return `${p.y}${p2(p.m)}${p2(p.d)}T${p2(p.h)}${p2(p.min)}00`; };
const icsUtc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
/** Pliega líneas a 75 octetos (RFC 5545 §3.1). */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = []; let cur = ''; let max = 75;
  for (const ch of line) {
    if (enc.encode(cur + ch).length > max) { out.push(cur); cur = ''; max = 74; }
    cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export function ics(s: MarketSalida, now = new Date()): string {
  const start = departureOf(s);
  const end = new Date(+start + s.durationH * H);
  const p = pointById(s.pointId);
  const g = getGuide(s.guideId);
  const desc = [
    `${s.title}${s.demo ? ' (salida de ejemplo, demo)' : ''}.`,
    `Guía: ${g?.name ?? 'sin datos'}.`,
    `Encuentro: ${s.meetingPoint}.`,
    `Incluye: ${s.includes.join(', ')}.`,
    s.weatherPolicy,
    'Reservado con Hanan. Pago simulado (demo).',
  ].join('\n');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hanan//Salidas//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE', `TZID:${TZID}`, 'BEGIN:STANDARD', 'DTSTART:19700101T000000',
    'TZOFFSETFROM:-0300', 'TZOFFSETTO:-0300', 'TZNAME:-03', 'END:STANDARD', 'END:VTIMEZONE',
    'BEGIN:VEVENT', `UID:${s.id}@hanan.app`, `DTSTAMP:${icsUtc(now)}`,
    `DTSTART;TZID=${TZID}:${icsLocal(start)}`, `DTEND;TZID=${TZID}:${icsLocal(end)}`,
    `SUMMARY:${esc(`${s.title} · ${shortName(p)}`)}`,
    `LOCATION:${esc(`${p.name}, Jujuy (encuentro en ${s.meetingPoint})`)}`,
    `GEO:${p.lat};${p.lon}`,
    `DESCRIPTION:${esc(desc)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Salida de cielo en 3 h: abrigo y agua', 'TRIGGER:-PT3H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

// ---------- Formato ----------
export const ars = (n: number) => '$\u00a0' + Math.round(n).toLocaleString('es-AR');
export const LANG_LABEL: Record<string, string> = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français', de: 'Deutsch' };
export const LEVEL_LABEL: Record<PhysicalLevel, string> = { bajo: 'Bajo', medio: 'Medio', exigente: 'Exigente' };

/** Mensaje de WhatsApp al guía (formato de HU-9). */
export function whatsappMensaje(s: MarketSalida, people: number, score: number | null, fecha: string, hora: string) {
  const p = pointById(s.pointId);
  return `Hola, vi en Hanan tu salida a ${shortName(p)} el ${fecha} a las ${hora} (cielo ${score ?? '—'}/100). ¿Hay lugar para ${people} ${people === 1 ? 'persona' : 'personas'}? Reservé con seña simulada (demo).`;
}
