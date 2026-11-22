import type { ObservationPoint } from '../sky/types';
import { fixtures } from './sources';

const NOTES: Partial<Record<ObservationPoint['id'], string>> = {
  salinas: 'Coordenadas aproximadas, a verificar.',
  susques: 'El COAS está a ~1,5 km del ejido urbano.',
};
export const POINTS: ObservationPoint[] = (fixtures.points as ObservationPoint[]).map((p) => ({ ...p, note: NOTES[p.id] }));
export const pointById = (id: string) => POINTS.find((p) => p.id === id)!;
export const shortName = (p: ObservationPoint) => p.name.split(/ [·(]/)[0];
