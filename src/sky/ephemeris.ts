import * as A from 'astronomy-engine';
import type { NightSummary, ObservationPoint } from './types';
import { localNoon, monthOf } from './time';

const observer = (p: Pick<ObservationPoint, 'lat' | 'lon' | 'elevationM'>) => new A.Observer(p.lat, p.lon, p.elevationM);
type Pt = Pick<ObservationPoint, 'lat' | 'lon' | 'elevationM'>;

function bodyAltitude(body: A.Body, date: Date, p: Pt): number {
  const o = observer(p);
  const eq = A.Equator(body, date, o, true, true);
  return A.Horizon(date, o, eq.ra, eq.dec, 'normal').altitude;
}
export const sunAltitude = (date: Date, p: Pt) => bodyAltitude(A.Body.Sun, date, p);
export const moonAltitude = (date: Date, p: Pt) => bodyAltitude(A.Body.Moon, date, p);
/** Fracción iluminada de la luna, 0–1 */
export const moonIllumination = (date: Date) => A.Illumination(A.Body.Moon, date).phase_fraction;
export const starAltitude = (date: Date, p: Pt, raH: number, decDeg: number) => A.Horizon(date, observer(p), raH, decDeg, 'normal').altitude;

export const SGR_A = { ra: 17.761, dec: -29.008 };
export const LMC = { ra: 5.392, dec: -69.756 };
export const SMC = { ra: 0.877, dec: -72.83 };

export function moonPhaseName(date: Date): string {
  const ang = A.MoonPhase(date); // 0 nueva, 90 cuarto creciente, 180 llena, 270 menguante
  if (ang < 22.5 || ang >= 337.5) return 'Luna nueva';
  if (ang < 67.5) return 'Luna creciente';
  if (ang < 112.5) return 'Cuarto creciente';
  if (ang < 157.5) return 'Gibosa creciente';
  if (ang < 202.5) return 'Luna llena';
  if (ang < 247.5) return 'Gibosa menguante';
  if (ang < 292.5) return 'Cuarto menguante';
  return 'Luna menguante';
}

const PLANETS: [A.Body, string][] = [
  [A.Body.Venus, 'Venus'], [A.Body.Mars, 'Marte'], [A.Body.Jupiter, 'Júpiter'], [A.Body.Saturn, 'Saturno'], [A.Body.Mercury, 'Mercurio'],
];

/** Crepúsculo astronómico de una tarde (YYYY-MM-DD) → amanecer astronómico siguiente. */
export function astroNight(date: string, p: Pt): { dusk: Date; dawn: Date } {
  const o = observer(p);
  const noon = localNoon(date);
  const dusk = A.SearchAltitude(A.Body.Sun, o, -1, noon, 1, -18)!.date;
  const dawn = A.SearchAltitude(A.Body.Sun, o, +1, dusk, 1, -18)!.date;
  return { dusk, dawn };
}

export function seasonalNote(month: number, mwMaxAlt: number, mwHours: number): string | undefined {
  if (month === 11 || month === 12 || month === 1)
    return 'El centro de la Vía Láctea se esconde temprano; la mejor temporada es de abril a septiembre.';
  if (month === 2 || month === 3)
    return 'El centro de la Vía Láctea sale de madrugada; desde abril sube alto en plena noche.';
  if (mwHours > 4 && mwMaxAlt > 70) return 'Temporada de Vía Láctea: el núcleo pasa cerca del cénit.';
  if (month === 10) return 'El núcleo de la Vía Láctea se ve al anochecer y baja rápido.';
  return undefined;
}

/** Resumen astronómico de una noche. Puro: depende solo de la fecha y el punto. */
export function nightSummary(date: string, p: Pt): NightSummary {
  const o = observer(p);
  const { dusk, dawn } = astroNight(date, p);
  const noon = localNoon(date);
  const rise = A.SearchRiseSet(A.Body.Moon, o, +1, noon, 1.5)?.date;
  const set = A.SearchRiseSet(A.Body.Moon, o, -1, noon, 1.5)?.date;
  const mid = new Date((dusk.getTime() + dawn.getTime()) / 2);
  let maxAlt = -90, maxAt: Date | undefined, above = 0, lmc = -90, smc = -90;
  const step = 10 * 60_000;
  for (let t = dusk.getTime(); t <= dawn.getTime(); t += step) {
    const alt = starAltitude(new Date(t), p, SGR_A.ra, SGR_A.dec);
    if (alt > maxAlt) { maxAlt = alt; maxAt = new Date(t); }
    if (alt > 20) above += step / 3600_000;
    lmc = Math.max(lmc, starAltitude(new Date(t), p, LMC.ra, LMC.dec));
    smc = Math.max(smc, starAltitude(new Date(t), p, SMC.ra, SMC.dec));
  }
  const planets = PLANETS.map(([b, name]) => ({ name, altitudeDeg: bodyAltitude(b, dusk, p) }))
    .filter((x) => x.altitudeDeg > 0)
    .sort((a, b) => b.altitudeDeg - a.altitudeDeg);
  const magellanic = [
    { name: 'Gran Nube de Magallanes', altitudeDeg: lmc },
    { name: 'Pequeña Nube de Magallanes', altitudeDeg: smc },
  ];
  return {
    date, astroDusk: dusk, astroDawn: dawn,
    moon: { rise, set, illumination: moonIllumination(mid), phaseName: moonPhaseName(mid) },
    milkyWayCore: { maxAltitudeDeg: maxAlt, hoursAbove20: Math.round(above * 10) / 10, maxAt },
    planets, magellanic,
    seasonalNote: seasonalNote(monthOf(noon), maxAlt, above),
  };
}
