import { useEffect, useMemo, useState } from 'react';
import { fromOmm, isSunlit, lookAt, passes, subPoint, visibleNow, type Tracked } from '../sky/satellites';
import { sunAltitude } from '../sky/ephemeris';
import type { ObservationPoint, SatPass } from '../sky/types';
import { loadOmm } from '../data/omm';
import { FIXTURE_CAPTURED_AT, fixtures } from '../data/sources';
import type { Omm } from '../sky/satellites';
import type { SatMarker } from './MapView';

export function useSatellites(now: Date, simulated: boolean, point: ObservationPoint) {
  const [src, setSrc] = useState<{ list: Tracked[]; fetchedAt: Date; origin: string }>(() => ({ list: fromOmm(fixtures.omm as Omm[]), fetchedAt: FIXTURE_CAPTURED_AT, origin: 'fixture' }));
  useEffect(() => { loadOmm().then((r) => setSrc({ list: fromOmm(r.data), fetchedAt: r.fetchedAt, origin: r.origin })); }, []);

  // Posición en vivo (cada 5 s con reloj real; fija con el simulador)
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => { if (simulated) return; const id = setInterval(() => setTick(Date.now()), 5000); return () => clearInterval(id); }, [simulated]);
  const t = simulated ? now : new Date(tick);
  const live: SatMarker[] = src.list.map((s) => { const p = subPoint(s.rec, t); return p ? { name: s.name, ...p } : null; }).filter(Boolean) as SatMarker[];

  // Para el cielo en vivo: altura/azimut desde el punto elegido (ARSAT 2 nunca se ve a simple vista).
  const sunAlt = sunAltitude(t, point);
  const sky = src.list.map((s) => {
    const la = lookAt(s.rec, t, point); if (!la) return null;
    return { name: s.name, azDeg: la.azDeg, altDeg: la.altDeg, visible: s.name !== 'ARSAT 2' && visibleNow(la.altDeg, sunAlt, isSunlit(s.rec, t)) };
  }).filter(Boolean) as { name: string; azDeg: number; altDeg: number; visible: boolean }[];

  const hourKey = Math.floor(now.getTime() / 3600_000);
  const upcoming = useMemo(() => {
    const start = new Date(hourKey * 3600_000);
    const out: SatPass[] = [];
    for (const s of src.list) {
      if (s.name === 'ARSAT 2') continue; // geoestacionario: no "pasa"
      out.push(...passes(s, point, start, 24, 20));
    }
    return out.sort((a, b) => +a.start - +b.start);
  }, [src, point, hourKey]);
  return { live, sky, upcoming, tracked: src.list, fetchedAt: src.fetchedAt, origin: src.origin };
}
