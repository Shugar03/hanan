import { useEffect, useMemo, useState } from 'react';
import { fromOmm, passes, subPoint, type Tracked } from '../sky/satellites';
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
  return { live, upcoming, fetchedAt: src.fetchedAt, origin: src.origin };
}
