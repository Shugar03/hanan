// Motor de recomendaciones de "Mi noche" (product-vision §5). Puro, determinista y explicable:
// cada plan trae su porqué. No usa el reloj ni hace I/O: recibe candidatos ya calculados.
import type { HourlyConditions, NightSummary, ObservationPoint, ObservationWindow, PassStatus, PointId, Salida, SatPass, SkyScore } from './types';
import type { NightScore } from './night';
import { hhmm, localParts, nightOf } from './time';

export type Objetivo = 'via-lactea' | 'planetas' | 'luna' | 'astrofoto' | 'satelites' | 'estrellas';
export type Equipo = 'ojo' | 'binoculares' | 'telescopio' | 'camara';
export type Base = 'purmamarca' | 'tilcara' | 'susques' | 'ssjujuy';

export const OBJETIVOS: Record<Objetivo, string> = {
  'via-lactea': 'Vía Láctea', planetas: 'Planetas', luna: 'Luna', astrofoto: 'Astrofoto de paisaje', satelites: 'Satélites', estrellas: 'Solo estrellas',
};
export const EQUIPOS: Record<Equipo, string> = { ojo: 'A ojo', binoculares: 'Binoculares', telescopio: 'Telescopio', camara: 'Cámara con trípode' };
export const BASES: Record<Base, string> = { purmamarca: 'Purmamarca', tilcara: 'Tilcara', susques: 'Susques', ssjujuy: 'S. S. de Jujuy' };

/** Horas de manejo ESTIMADAS (ruta, de día, sin paradas) desde cada base. Valores aproximados. */
export const DRIVE_H: Record<Base, Record<PointId, number>> = {
  purmamarca: { purmamarca: 0.1, tilcara: 0.4, salinas: 1.2, susques: 2.3, olaroz: 3.0, jama: 3.6 },
  tilcara: { tilcara: 0.1, purmamarca: 0.4, salinas: 1.6, susques: 2.7, olaroz: 3.4, jama: 4.0 },
  susques: { susques: 0.1, olaroz: 0.9, jama: 1.6, salinas: 1.3, purmamarca: 2.3, tilcara: 2.7 },
  ssjujuy: { purmamarca: 1.1, tilcara: 1.4, salinas: 2.3, susques: 3.4, olaroz: 4.1, jama: 4.7 },
};

export type Preferencias = {
  objetivo: Objetivo; equipo: Equipo; base: Base; auto: boolean;
  /** Mínima tolerada (°C). */
  minTempC: number;
  maxDriveH?: number;
};

export type Candidate = {
  point: ObservationPoint;
  night: NightScore;
  summary: NightSummary;
  /** Horas de la noche (con su desglose). */
  hours: SkyScore[];
  /** Pronóstico de esas horas, si existe. */
  conditions: HourlyConditions[];
  visiblePasses?: SatPass[];
};

export type Alert = { level: 'info' | 'aviso'; text: string };
export type SeeItem = { time?: Date; text: string };
export type Plan = {
  pointId: PointId; pointName: string; night: string;
  window: ObservationWindow;
  nightScore: number; nightLabel: string;
  value: number;               // puntaje del plan (para ordenar), 0–100
  reasons: string[];
  see: SeeItem[];
  checklist: string[];
  alerts: Alert[];
  driveH: number;
  salida?: Salida;
};

const H = 3600_000;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x: number) => `${Math.round(x * 100)} %`;
const deg = (x: number) => `${Math.round(x)}°`;
const fmtH = (h: number) => (h < 0.3 ? 'menos de 20 min' : `${h.toLocaleString('es-AR', { maximumFractionDigits: 1 })} h`);

function inWindow<T extends { time: Date }>(xs: T[], w: ObservationWindow) {
  const s = Math.floor(+w.start / H) * H;
  return xs.filter((x) => +x.time >= s && +x.time < +w.end);
}

/** Ventana del plan: la de la noche; si no hay (score < 40), las 2 h posteriores al crepúsculo astronómico. */
function planWindow(c: Candidate): ObservationWindow {
  if (c.night.window) return c.night.window;
  return { start: c.night.astroDusk, end: new Date(+c.night.astroDusk + 2 * H), meanScore: c.night.score };
}

export function evaluate(c: Candidate, prefs: Preferencias, ctx: { pass?: PassStatus; salidas?: Salida[] } = {}): Plan {
  const w = planWindow(c);
  const hrs = inWindow(c.hours, w);
  const conds = inWindow(c.conditions, w);
  const s = c.summary;
  const reasons: string[] = [];
  const alerts: Alert[] = [];
  const nightHours = c.hours.filter((h) => h.factors.darkness > 0);
  const cloudsMean = mean((nightHours.length ? nightHours : c.hours).map((h) => h.factors.clouds));
  const highMean = conds.length ? mean(conds.map((x) => x.cloudHigh)) : undefined;
  const lowMid = conds.length ? mean(conds.map((x) => (x.cloudLow + x.cloudMid) / 2)) : undefined;
  const tMin = conds.length ? Math.min(...conds.map((x) => x.temperatureC)) : undefined;
  const gust = conds.length ? Math.max(...conds.map((x) => x.windGustKmh)) : undefined;
  const moonUpInWindow = hrs.some((h) => h.factors.moon < 0.97);
  const mw = s.milkyWayCore;
  const month = localParts(c.night.astroDusk).m;

  // 1) Base y ajuste por objetivo
  let base = c.night.score;
  let fit = 1;
  reasons.push(c.night.window
    ? `Score de la noche ${c.night.score} (${c.night.label}): ventana ${hhmm(w.start)} a ${hhmm(w.end)}.`
    : `Ninguna hora llega a 40 (pico ${c.night.peak?.score ?? 0}); el plan usa las 2 h después del anochecer.`);
  const moonTxt = `Luna al ${pct(s.moon.illumination)}${moonUpInWindow ? ', arriba durante la ventana' : ', bajo el horizonte en la ventana'}`;
  switch (prefs.objetivo) {
    case 'via-lactea':
    case 'astrofoto': {
      const astro = prefs.objetivo === 'astrofoto';
      if (mw.hoursAbove20 >= 2) { fit = 1; reasons.push(`Núcleo de la Vía Láctea a ${deg(mw.maxAltitudeDeg)}${mw.maxAt ? ` (${hhmm(mw.maxAt)})` : ''}, ${mw.hoursAbove20.toLocaleString('es-AR')} h sobre 20°.`); }
      else if (mw.hoursAbove20 > 0) { fit = 0.6; reasons.push(`Núcleo de la Vía Láctea bajo: ${mw.hoursAbove20.toLocaleString('es-AR')} h sobre 20°.`); }
      else {
        fit = astro ? 0.5 : 0.25;
        reasons.push(month === 11 || month === 12 || month === 1
          ? `En ${['noviembre', 'diciembre', 'enero'][[11, 12, 1].indexOf(month)]} el núcleo de la Vía Láctea se esconde temprano (máx. ${deg(mw.maxAltitudeDeg)}): la temporada es de abril a septiembre.`
          : `El núcleo de la Vía Láctea no pasa de ${deg(mw.maxAltitudeDeg)} en la noche astronómica.`);
      }
      if (moonUpInWindow && s.moon.illumination > 0.5) { fit *= 0.75; reasons.push(`${moonTxt}: aclara el cielo y apaga la Vía Láctea.`); }
      else reasons.push(`${moonTxt}.`);
      if (astro && gust !== undefined && gust > 30) { fit *= 0.75; reasons.push(`Ráfagas de hasta ${Math.round(gust)} km/h: el trípode vibra en exposiciones largas.`); }
      break;
    }
    case 'planetas': {
      base = Math.round(100 * cloudsMean);
      const vis = s.planets.filter((p) => p.altitudeDeg > 10);
      fit = vis.length ? Math.min(1, 0.8 + 0.1 * vis.length) : 0.2;
      reasons.push(vis.length ? `Al anochecer: ${vis.map((p) => `${p.name} a ${deg(p.altitudeDeg)}`).join(', ')}. La Luna no molesta para planetas.` : 'Ningún planeta brillante alto al anochecer.');
      break;
    }
    case 'luna': {
      base = Math.round(100 * cloudsMean);
      const i = s.moon.illumination;
      fit = i < 0.08 ? 0.1 : i <= 0.85 ? 1 : 0.8;
      reasons.push(i < 0.08 ? 'Luna nueva: no hay Luna para mirar.' : `${s.moon.phaseName} al ${pct(i)}${i <= 0.85 ? ': los cráteres del terminador se ven con relieve.' : ': muy llena, se ve plana pero brillante.'}`);
      break;
    }
    case 'satelites': {
      base = Math.round(100 * cloudsMean);
      const ps = c.visiblePasses ?? [];
      fit = ps.length ? 1 : 0.3;
      reasons.push(ps.length ? `Pases visibles: ${ps.map((p) => `${p.satellite} ${hhmm(p.start)} (máx. ${deg(p.maxElevationDeg)})`).join(', ')}.` : 'Sin pases visibles de la ISS ni de los SAOCOM esa noche.');
      break;
    }
    case 'estrellas':
      reasons.push(`${moonTxt}.`);
      break;
  }
  if (highMean !== undefined && lowMid !== undefined) reasons.push(`Nubes previstas en la ventana: altas ${Math.round(highMean)} %, bajas/medias ${Math.round(lowMid)} %.`);
  else reasons.push('Sin pronóstico para esa noche: solo cálculo astronómico.');

  // 2) Logística
  const driveH = DRIVE_H[prefs.base][c.point.id];
  let logi = 1;
  const salida = (ctx.salidas ?? []).filter((x) => x.pointId === c.point.id && nightOf(x.departure) === c.night.night)
    .sort((a, b) => +a.departure - +b.departure)[0];
  if (prefs.auto) {
    logi = Math.max(0.5, 1 - 0.07 * driveH);
    reasons.push(`${fmtH(driveH)} de manejo estimado desde ${BASES[prefs.base]}.`);
    if (driveH > (prefs.maxDriveH ?? 3.5)) { logi *= 0.6; alerts.push({ level: 'aviso', text: `Más de ${prefs.maxDriveH ?? 3.5} h de manejo (estimado): conviene dormir en Susques.` }); }
    if (driveH >= 1) alerts.push({ level: 'info', text: 'Volver de noche por la RN 52 (cuesta de Lipán, ripio y animales sueltos): manejá despacio o dormí cerca.' });
  } else if (salida) {
    logi = 1.05;
    reasons.push(`Sin auto: hay una salida de guía a las ${hhmm(salida.departure)}.`);
  } else {
    logi = 0.7;
    reasons.push('Sin auto y sin salida publicada para esa noche: marcá "Quiero ir" para que los guías la vean.');
  }

  // 3) Clima y ruta
  let comfort = 1;
  if (tMin !== undefined) {
    if (tMin < prefs.minTempC) { comfort = 0.8; alerts.push({ level: 'aviso', text: `Mínima prevista ${tMin.toLocaleString('es-AR', { maximumFractionDigits: 1 })} °C, por debajo de tu tolerancia (${prefs.minTempC} °C).` }); }
    else if (tMin < 0) alerts.push({ level: 'info', text: `Bajo cero: ${tMin.toLocaleString('es-AR', { maximumFractionDigits: 1 })} °C de mínima.` });
  }
  if (gust !== undefined && gust > 50) alerts.push({ level: 'aviso', text: `Ráfagas de hasta ${Math.round(gust)} km/h.` });
  const westOfSalinas = c.point.id === 'susques' || c.point.id === 'olaroz' || c.point.id === 'jama';
  if (c.point.id === 'jama' && ctx.pass) {
    alerts.push({ level: ctx.pass.state === 'abierto' ? 'info' : 'aviso', text: `Paso de Jama: ${ctx.pass.state === 'desconocido' ? 'estado desconocido, revisá la fuente oficial' : ctx.pass.state}${ctx.pass.sourceUpdatedAt ? ` (act. ${hhmm(new Date(ctx.pass.sourceUpdatedAt))})` : ''}.` });
  }
  if (c.point.elevationM > 3500) alerts.push({ level: 'info', text: `${c.point.elevationM.toLocaleString('es-AR')} m de altura: subí sin apuro, tomá agua y evitá el alcohol.` });

  const value = Math.round(Math.max(0, Math.min(100, base * fit * logi * comfort)));

  // 4) Qué ver, en orden
  const see: SeeItem[] = [];
  for (const p of s.planets.filter((p) => p.altitudeDeg > 5).slice(0, 3)) see.push({ time: c.night.astroDusk, text: `${p.name}, a ${deg(p.altitudeDeg)} al terminar el crepúsculo` });
  if (s.moon.illumination > 0.05 && (prefs.objetivo === 'luna' || moonUpInWindow)) see.push({ time: s.moon.rise && +s.moon.rise > +c.night.astroDusk - 6 * H ? s.moon.rise : undefined, text: `${s.moon.phaseName} (${pct(s.moon.illumination)})${s.moon.rise ? `, sale ${hhmm(s.moon.rise)}` : ''}` });
  if (mw.maxAltitudeDeg > 20) see.push({ time: mw.maxAt, text: `Núcleo de la Vía Láctea en lo más alto (${deg(mw.maxAltitudeDeg)})` });
  for (const m of s.magellanic) if (m.altitudeDeg > 15) see.push({ time: undefined, text: `${m.name} (hasta ${deg(m.altitudeDeg)})` });
  for (const p of c.visiblePasses ?? []) see.push({ time: p.start, text: `${p.satellite} cruzando el cielo (máx. ${deg(p.maxElevationDeg)})` });
  see.push({ time: undefined, text: 'La Cruz del Sur y los Punteros (Alfa y Beta Centauri) hacia el sur' });
  see.sort((a, b) => (a.time ? +a.time : Infinity) - (b.time ? +b.time : Infinity));

  // 5) Checklist
  const t = tMin ?? (c.point.elevationM > 3500 ? -5 : 2);
  const checklist = [
    t < -5 ? 'Campera de pluma, primera capa térmica, gorro, guantes y medias gruesas' : t < 0 ? 'Campera abrigada, gorro y guantes' : 'Abrigo: de noche la temperatura cae rápido',
    'Linterna roja o Hanan en modo rojo',
    'Agua y algo caliente',
    ...(prefs.equipo === 'binoculares' ? ['Binoculares (7×50 o 10×50 rinden bien a ojo libre)'] : []),
    ...(prefs.equipo === 'telescopio' ? ['Telescopio, oculares y batería; dejalo aclimatar 30 min'] : []),
    ...(prefs.equipo === 'camara' || prefs.objetivo === 'astrofoto' ? ['Trípode firme, disparador o intervalómetro', 'Baterías de repuesto: el frío las descarga rápido'] : []),
    ...(prefs.auto && driveH >= 1 ? ['Tanque lleno antes de salir: en la RN 52 hay pocas estaciones'] : []),
    ...(c.point.id === 'jama' ? ['DNI o pasaporte si vas hacia el paso'] : []),
    ...(westOfSalinas ? ['Bajá la app y el plan con señal: en la Puna hay tramos sin cobertura'] : []),
  ];

  return {
    pointId: c.point.id, pointName: c.point.name, night: c.night.night, window: w,
    nightScore: c.night.score, nightLabel: c.night.label, value, reasons, see, checklist, alerts, driveH, salida,
  };
}

/** Top N planes, sin repetir punto+noche y con a lo sumo 2 planes por punto. Desempate: noche más temprana. */
export function recommend(cands: Candidate[], prefs: Preferencias, ctx: { pass?: PassStatus; salidas?: Salida[] } = {}, n = 3): Plan[] {
  const all = cands.map((c) => evaluate(c, prefs, ctx))
    .sort((a, b) => b.value - a.value || a.night.localeCompare(b.night) || a.pointId.localeCompare(b.pointId));
  const out: Plan[] = [];
  const perPoint = new Map<string, number>();
  for (const p of all) {
    if ((perPoint.get(p.pointId) ?? 0) >= 2) continue;
    out.push(p); perPoint.set(p.pointId, (perPoint.get(p.pointId) ?? 0) + 1);
    if (out.length === n) break;
  }
  return out;
}
