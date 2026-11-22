import type { PassStatus } from '../sky/types';
import { API_BASE, FIXTURE_CAPTURED_AT, fixtures, readCache, writeCache } from './sources';

export const JAMA_SOURCE_URL = 'https://www.argentina.gob.ar/seguridad/pasosinternacionales/detalle/ruta/19/Jama';
const TTL = 30 * 60_000;

const readVar = (html: string, name: string) => html.match(new RegExp(`var\\s+${name}\\s*=\\s*["']([^"']*)["']`))?.[1].trim().toUpperCase();
function updatedAt(html: string, org: string) {
  const m = html.match(new RegExp(`${org}[^<(]*\\(\\s*[úu]ltima actualizaci[óo]n\\s+(\\d{1,2})/(\\d{1,2})/(\\d{4})\\s*-\\s*(\\d{1,2}):(\\d{2})`, 'i'));
  if (!m) return undefined;
  const p = (s: string) => s.padStart(2, '0');
  return `${m[3]}-${p(m[2])}-${p(m[1])}T${p(m[4])}:${m[5]}:00-03:00`;
}

/** Parseo de estadoPrioridad / estadoVialidad. Si falla → 'desconocido'. */
export function parsePass(html: string, fetchedAt: Date): PassStatus {
  const prio = readVar(html, 'estadoPrioridad');
  const vial = readVar(html, 'estadoVialidad');
  const ups = [updatedAt(html, 'Gendarmer[íi]a'), updatedAt(html, 'Vialidad')].filter(Boolean) as string[];
  const sourceUpdatedAt = ups.sort((a, b) => +new Date(b) - +new Date(a))[0];
  let state: PassStatus['state'] = 'desconocido';
  if (prio === 'CERRADO') state = 'cerrado';
  else if (prio === 'ABIERTO') state = vial === 'RESTRINGIDA' || vial === 'CORTE TOTAL' ? 'restringido' : 'abierto';
  return { state, sourceUpdatedAt, fetchedAt, sourceUrl: JAMA_SOURCE_URL, vialidad: vial?.toLowerCase() };
}

export type PassResult = PassStatus & { origin: 'red' | 'cache' | 'fixture' };

export async function loadPass(): Promise<PassResult> {
  const c = readCache<PassStatus>('jama');
  if (c && Date.now() - c.at < TTL) return { ...c.data, fetchedAt: new Date(c.at), origin: 'cache' };
  if (API_BASE) {
    try {
      const r = await fetch(`${API_BASE}/api/jama`);
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as PassStatus;
      writeCache('jama', j);
      return { ...j, fetchedAt: new Date(), origin: 'red' };
    } catch { /* sigue al fixture */ }
  }
  // Sin Worker el navegador no puede leer la página oficial (CORS): copia local con su fecha de actualización.
  return { ...parsePass(fixtures.jamaHtml, FIXTURE_CAPTURED_AT), origin: 'fixture' };
}
