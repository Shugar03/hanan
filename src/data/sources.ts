// Única capa de fuentes offline. Cambiar de fixtures a otra fuente se hace acá.
import pointsJson from '../../fixtures/points.json';
import openMeteoJson from '../../fixtures/openmeteo_points.json';
import ommJson from '../../fixtures/omm.json';
import salidasJson from '../../fixtures/demo-salidas.json';
import demandaJson from '../../fixtures/demo-demanda.json';
import jamaHtml from '../../fixtures/paso_jama.html?raw';

/** Momento en que se capturaron los fixtures (fixtures/README.md). */
export const FIXTURE_CAPTURED_AT = new Date('2026-11-22T11:00:00-03:00');
/** Base del Worker (/api/*). Si no está, se llama a la fuente directamente. */
export const API_BASE: string | undefined = import.meta.env.VITE_API_BASE || undefined;

export const fixtures = {
  points: pointsJson as unknown[],
  openMeteo: openMeteoJson as unknown[],
  omm: ommJson as unknown[],
  salidas: salidasJson as unknown[],
  demanda: demandaJson as unknown[],
  jamaHtml: jamaHtml as string,
};

/** Caché simple en localStorage con fecha de descarga. */
export function readCache<T>(key: string): { at: number; data: T } | null {
  try { const r = localStorage.getItem('hanan:' + key); return r ? JSON.parse(r) : null; } catch { return null; }
}
export function writeCache<T>(key: string, data: T) {
  try { localStorage.setItem('hanan:' + key, JSON.stringify({ at: Date.now(), data })); } catch { /* cuota */ }
}

export type Sourced<T> = { data: T; fetchedAt: Date; origin: 'red' | 'cache' | 'fixture' };
