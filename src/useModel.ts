import { useEffect, useMemo, useState } from 'react';
import type { PointId } from './sky/types';
import { computeAll, floorHour, type PointModel } from './model';
import { fixtureForecast, loadForecast, type Forecast } from './data/forecast';
import type { Sourced } from './data/sources';

export function useForecast() {
  const [fc, setFc] = useState<Sourced<Forecast>>(() => fixtureForecast());
  useEffect(() => { let on = true; loadForecast().then((r) => on && setFc(r)); return () => { on = false; }; }, []);
  return fc;
}

export function useModels(fc: Forecast, now: Date): Record<PointId, PointModel> {
  const key = floorHour(now).getTime();
  return useMemo(() => computeAll(fc, new Date(key)), [fc, key]);
}

/** Reloj real o simulado (HU‑8). */
export function useClock(sim: Date | null) {
  const [real, setReal] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setReal(new Date()), 30_000); return () => clearInterval(id); }, []);
  return sim ?? real;
}
