// Parseo puro del estado del Paso de Jama desde la página oficial de pasos internacionales.
export const JAMA_SOURCE_URL =
  'https://www.argentina.gob.ar/seguridad/pasosinternacionales/detalle/ruta/19/Jama';

export type PassState = 'abierto' | 'restringido' | 'cerrado' | 'desconocido';

export type PassStatus = {
  state: PassState;
  /** ISO 8601 con offset -03:00; la más reciente entre Gendarmería y Vialidad. */
  sourceUpdatedAt?: string;
  fetchedAt: Date;
  sourceUrl: string;
};

function readJsVar(html: string, name: string): string | undefined {
  const m = html.match(new RegExp(`var\\s+${name}\\s*=\\s*["']([^"']*)["']`));
  return m ? m[1].trim() : undefined;
}

/** "22/11/2026 - 08:00" → "2026-11-22T08:00:00-03:00" */
function toIso(d: string, mo: string, y: string, h: string, mi: string): string {
  const p = (s: string) => s.padStart(2, '0');
  return `${y}-${p(mo)}-${p(d)}T${p(h)}:${p(mi)}:00-03:00`;
}

function readUpdatedAt(html: string, org: string): string | undefined {
  const re = new RegExp(
    `${org}[^<(]*\\(\\s*[úu]ltima actualizaci[óo]n\\s+(\\d{1,2})/(\\d{1,2})/(\\d{4})\\s*-\\s*(\\d{1,2}):(\\d{2})`,
    'i',
  );
  const m = html.match(re);
  return m ? toIso(m[1], m[2], m[3], m[4], m[5]) : undefined;
}

export function parseJama(html: string, fetchedAt: Date): PassStatus {
  const base = { fetchedAt, sourceUrl: JAMA_SOURCE_URL };
  const prioridad = readJsVar(html, 'estadoPrioridad')?.toUpperCase();
  const vialidad = readJsVar(html, 'estadoVialidad')?.toUpperCase();

  const updates = [readUpdatedAt(html, 'Gendarmer[íi]a'), readUpdatedAt(html, 'Vialidad')]
    .filter((s): s is string => !!s)
    .sort();
  const sourceUpdatedAt = updates.at(-1);
  const withDate = sourceUpdatedAt ? { sourceUpdatedAt } : {};

  if (!prioridad) return { state: 'desconocido', ...base };

  let state: PassState;
  if (prioridad === 'CERRADO') state = 'cerrado';
  else if (prioridad === 'ABIERTO') {
    state = vialidad === 'RESTRINGIDA' || vialidad === 'CORTE TOTAL' ? 'restringido' : 'abierto';
  } else state = 'desconocido';

  return { state, ...withDate, ...base };
}
