import type { Omm } from '../sky/satellites';
import { API_BASE, FIXTURE_CAPTURED_AT, fixtures, readCache, writeCache, type Sourced } from './sources';

const TTL = 2 * 3600_000;
const IDS = [25544, 43641, 46265, 40941];

/** CelesTrak: como máximo una descarga cada 2 h. Ante cualquier no‑200, se corta sin reintentar. */
export async function loadOmm(): Promise<Sourced<Omm[]>> {
  const c = readCache<Omm[]>('omm');
  const fallback = (): Sourced<Omm[]> => c ? { data: c.data, fetchedAt: new Date(c.at), origin: 'cache' } : { data: fixtures.omm as Omm[], fetchedAt: FIXTURE_CAPTURED_AT, origin: 'fixture' };
  if (c && Date.now() - c.at < TTL) return { data: c.data, fetchedAt: new Date(c.at), origin: 'cache' };
  const blockedUntil = Number(localStorage.getItem('hanan:omm-block') || 0);
  if (Date.now() < blockedUntil) return fallback();
  try {
    let out: Omm[] = [];
    if (API_BASE) {
      const r = await fetch(`${API_BASE}/api/omm`);
      if (r.status !== 200) throw new Error(String(r.status));
      out = await r.json();
    } else {
      for (const id of IDS) {
        const r = await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${id}&FORMAT=JSON`);
        if (r.status !== 200) throw new Error(String(r.status));
        out.push(...(await r.json()));
      }
    }
    writeCache('omm', out);
    return { data: out, fetchedAt: new Date(), origin: 'red' };
  } catch (e) {
    console.warn('[omm] CelesTrak no respondió 200; uso caché/fixture y no reintento por 2 h', e);
    localStorage.setItem('hanan:omm-block', String(Date.now() + TTL));
    return fallback();
  }
}
