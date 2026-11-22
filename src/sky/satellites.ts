import * as S from './sgp4';
import * as A from 'astronomy-engine';
import type { ObservationPoint, SatelliteName, SatPass } from './types';
import { sunAltitude } from './ephemeris';

type Pt = Pick<ObservationPoint, 'lat' | 'lon' | 'elevationM'>;
export type Omm = Record<string, unknown> & { OBJECT_NAME: string; NORAD_CAT_ID: number };

export const SAT_IDS: Record<number, SatelliteName> = { 25544: 'ISS', 43641: 'SAOCOM 1A', 46265: 'SAOCOM 1B', 40941: 'ARSAT 2' };

export type Tracked = { name: SatelliteName; rec: S.SatRec; epoch: string };

export function fromOmm(list: Omm[]): Tracked[] {
  const out: Tracked[] = [];
  for (const o of list) {
    const name = SAT_IDS[Number(o.NORAD_CAT_ID)];
    if (!name) continue;
    try { out.push({ name, rec: S.json2satrec(o as unknown as Parameters<typeof S.json2satrec>[0]), epoch: String(o.EPOCH) }); } catch { /* OMM inválido */ }
  }
  return out;
}

function eci(rec: S.SatRec, d: Date) {
  const pv = S.propagate(rec, d) as { position?: { x: number; y: number; z: number } | false } | null;
  return pv && pv.position ? pv.position : null;
}

/** Posición subsatelital (lat, lon en grados; altura en km). */
export function subPoint(rec: S.SatRec, d: Date): { lat: number; lon: number; altKm: number } | null {
  const p = eci(rec, d); if (!p) return null;
  const g = S.eciToGeodetic(p as never, S.gstime(d));
  return { lat: S.degreesLat(g.latitude), lon: S.degreesLong(g.longitude), altKm: g.height };
}

export function elevationDeg(rec: S.SatRec, d: Date, p: Pt): number | null {
  const pos = eci(rec, d); if (!pos) return null;
  const gd = { latitude: S.degreesToRadians(p.lat), longitude: S.degreesToRadians(p.lon), height: p.elevationM / 1000 };
  const la = S.ecfToLookAngles(gd as never, S.eciToEcf(pos as never, S.gstime(d)));
  return S.radiansToDegrees(la.elevation);
}

/** Azimut y altura (grados) del satélite visto desde un punto. */
export function lookAt(rec: S.SatRec, d: Date, p: Pt): { azDeg: number; altDeg: number } | null {
  const pos = eci(rec, d); if (!pos) return null;
  const gd = { latitude: S.degreesToRadians(p.lat), longitude: S.degreesToRadians(p.lon), height: p.elevationM / 1000 };
  const la = S.ecfToLookAngles(gd as never, S.eciToEcf(pos as never, S.gstime(d)));
  return { azDeg: (S.radiansToDegrees(la.azimuth) + 360) % 360, altDeg: S.radiansToDegrees(la.elevation) };
}

/** Satélite iluminado por el sol (modelo de sombra cilíndrica). */
export function isSunlit(rec: S.SatRec, d: Date): boolean {
  const r = eci(rec, d); if (!r) return false;
  const s = A.GeoVector(A.Body.Sun, d, true); const sl = Math.hypot(s.x, s.y, s.z);
  const u = [s.x / sl, s.y / sl, s.z / sl];
  const dot = r.x * u[0] + r.y * u[1] + r.z * u[2];
  const perp = Math.sqrt(Math.max(0, r.x ** 2 + r.y ** 2 + r.z ** 2 - dot * dot));
  return dot > 0 || perp > 6371;
}

/** Condición de pase visible — spec HU‑7. */
export const visibleNow = (el: number, sunAlt: number, sunlit: boolean) => el > 10 && sunAlt < -6 && sunlit;

/** Pasos con elevación > 10° entre start y start+hours. visible=true si en algún momento cumple las 3 condiciones. */
export function passes(t: Tracked, p: Pt, start: Date, hours = 24, stepS = 30): SatPass[] {
  const out: SatPass[] = [];
  let cur: SatPass | null = null;
  const end = start.getTime() + hours * 3600_000;
  for (let ms = start.getTime(); ms <= end; ms += stepS * 1000) {
    const d = new Date(ms);
    const el = elevationDeg(t.rec, d, p);
    if (el !== null && el > 10) {
      if (!cur) cur = { satellite: t.name, start: d, end: d, maxElevationDeg: el, visible: false };
      cur.end = d; if (el > cur.maxElevationDeg) cur.maxElevationDeg = el;
      if (!cur.visible && visibleNow(el, sunAltitude(d, p), isSunlit(t.rec, d))) cur.visible = true;
    } else if (cur) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out;
}
