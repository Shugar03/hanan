// Política de caché pura (sin I/O) para resultados "degradados" de la fuente.
import type { PassStatus } from './jama.ts';

export const JAMA_TTL_S = 30 * 60;
/** TTL máximo para un 'desconocido': reintentar la fuente pronto, sin martillarla. */
export const DEGRADED_TTL_S = 2 * 60;

export type CacheDecision =
  | { action: 'serve-stale' }
  | { action: 'serve-fresh'; ttl: number; updateStale: boolean };

/**
 * Decide qué servir tras consultar la fuente.
 * - Resultado sano → servirlo, cachearlo `ttl` y renovar la copia stale.
 * - Resultado degradado + hay stale → servir la stale (no se cachea nada nuevo).
 * - Resultado degradado sin stale → servirlo con TTL corto y sin pisar la stale.
 */
export function decideCache(degraded: boolean, hasStale: boolean, ttl: number): CacheDecision {
  if (!degraded) return { action: 'serve-fresh', ttl, updateStale: true };
  if (hasStale) return { action: 'serve-stale' };
  return { action: 'serve-fresh', ttl: Math.min(ttl, DEGRADED_TTL_S), updateStale: false };
}

/** 'desconocido' (fuente no-200, error de red o parseo fallido) es un resultado degradado. */
export function isDegradedPass(status: Pick<PassStatus, 'state'>): boolean {
  return status.state === 'desconocido';
}
