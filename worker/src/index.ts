// Hanan · Cloudflare Worker: proxy con caché en el edge.
//   GET /api/forecast → Open-Meteo multi-coordenada (TTL 1 h)
//   GET /api/omm      → CelesTrak GP OMM JSON x4 (TTL 2 h, sin reintentos ante no-200)
//   GET /api/jama     → Paso de Jama parseado a PassStatus (TTL 30 min)
//   GET /api/demand   → señales "Quiero ir" agregadas (KV DEMAND opcional; si no, 501)
import { JAMA_SOURCE_URL, parseJama, type PassStatus } from './jama.ts';
import { DEGRADED_TTL_S, JAMA_TTL_S, decideCache, isDegradedPass } from './cachePolicy.ts';
import { OMM_CATNRS, celestrakUrl, openMeteoUrl, POINTS } from './points.ts';

export interface Env {
  DEMAND?: KVNamespace;
}

const UA = 'Hanan/0.1 (hackathon Jujuy; astroturismo Puna)';
const HOUR = 3600;

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: unknown, status = 200, maxAge = 0, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': maxAge > 0 ? `public, max-age=${maxAge}` : 'no-store',
      ...CORS,
      ...extra,
    },
  });
}

function withCors(res: Response, hit: string): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
  out.headers.set('X-Hanan-Cache', hit);
  return out;
}

function cacheKey(name: string): Request {
  // Cache key estable por URL (independiente del host del Worker).
  return new Request(`https://hanan-cache.internal/${name}`);
}

/** Copia "stale" sin vencimiento, para servir ante errores de la fuente. */
function staleKey(name: string): Request {
  return cacheKey(`stale/${name}`);
}

type Produced = { body: unknown; degraded?: boolean };

async function cached(
  ctx: ExecutionContext,
  name: string,
  ttl: number,
  produce: () => Promise<Produced>,
): Promise<Response> {
  const cache = caches.default;
  const hit = await cache.match(cacheKey(name));
  if (hit) return withCors(hit, 'HIT');

  let produced: Produced;
  try {
    produced = await produce();
  } catch (err) {
    const stale = await cache.match(staleKey(name));
    if (stale) return withCors(stale, 'STALE');
    return json({ error: err instanceof Error ? err.message : String(err) }, 503);
  }

  const degraded = produced.degraded === true;
  const stale = degraded ? await cache.match(staleKey(name)) : undefined;
  const decision = decideCache(degraded, !!stale, ttl);
  if (decision.action === 'serve-stale' && stale) return withCors(stale, 'STALE');

  const freshTtl = decision.action === 'serve-fresh' ? decision.ttl : DEGRADED_TTL_S;
  const updateStale = decision.action === 'serve-fresh' && decision.updateStale;
  const fresh = json(produced.body, 200, freshTtl, { 'X-Hanan-Fetched-At': new Date().toISOString() });
  const puts: Promise<void>[] = [cache.put(cacheKey(name), fresh.clone())];
  if (updateStale) {
    puts.push(
      cache.put(
        staleKey(name),
        new Response(fresh.clone().body, {
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=604800' },
        }),
      ),
    );
  }
  ctx.waitUntil(Promise.all(puts));
  return withCors(fresh, degraded ? 'MISS-DEGRADED' : 'MISS');
}

async function fetchForecast(): Promise<Produced> {
  const res = await fetch(openMeteoUrl(POINTS), { headers: { 'User-Agent': UA } });
  if (res.status !== 200) throw new Error(`Open-Meteo respondió ${res.status}`);
  // Se devuelve tal cual (array de 6 objetos en el orden de POINTS), igual que fixtures/openmeteo_points.json.
  return { body: await res.json() };
}

async function fetchOmm(): Promise<Produced> {
  // Secuencial; ante el primer no-200 cortamos (sin reintentos) para no martillar a CelesTrak.
  const out: unknown[] = [];
  for (const catnr of OMM_CATNRS) {
    const res = await fetch(celestrakUrl(catnr), { headers: { 'User-Agent': UA } });
    if (res.status !== 200) {
      console.warn(`CelesTrak CATNR=${catnr} respondió ${res.status}; se corta y se usa caché`);
      throw new Error(`CelesTrak respondió ${res.status} para CATNR ${catnr}`);
    }
    const arr = (await res.json()) as unknown;
    if (!Array.isArray(arr) || arr.length === 0) throw new Error(`CelesTrak sin datos para CATNR ${catnr}`);
    out.push(arr[0]);
  }
  return { body: out };
}

async function fetchJama(): Promise<Produced> {
  const fetchedAt = new Date();
  let status: PassStatus;
  try {
    const res = await fetch(JAMA_SOURCE_URL, { headers: { 'User-Agent': UA } });
    status =
      res.status === 200
        ? parseJama(await res.text(), fetchedAt)
        : { state: 'desconocido', fetchedAt, sourceUrl: JAMA_SOURCE_URL };
  } catch {
    status = { state: 'desconocido', fetchedAt, sourceUrl: JAMA_SOURCE_URL };
  }
  // 'desconocido' → se prefiere la última copia buena (stale) y no se cachea 30 min.
  return { body: status, degraded: isDegradedPass(status) };
}

const POINT_IDS = new Set<string>(POINTS.map((p) => p.id));
const NIGHT_RE = /^\d{4}-\d{2}-\d{2}$/;

async function handleDemand(req: Request, env: Env): Promise<Response> {
  const kv = env.DEMAND;
  if (!kv) return json({ error: 'Demanda no habilitada (falta binding KV DEMAND)' }, 501);

  if (req.method === 'POST') {
    const body = (await req.json().catch(() => null)) as { pointId?: string; night?: string } | null;
    if (!body?.pointId || !POINT_IDS.has(body.pointId) || !body.night || !NIGHT_RE.test(body.night)) {
      return json({ error: 'Se espera {pointId, night:"YYYY-MM-DD"}' }, 400);
    }
    const key = `demand:${body.pointId}:${body.night}`;
    const count = Number((await kv.get(key)) ?? '0') + 1; // no atómico: suficiente para el MVP
    await kv.put(key, String(count), { expirationTtl: 30 * 24 * HOUR });
    return json({ pointId: body.pointId, night: body.night, count });
  }

  const list = await kv.list({ prefix: 'demand:' });
  const signals = await Promise.all(
    list.keys.map(async ({ name }) => {
      const [, pointId, night] = name.split(':');
      return { pointId, night, count: Number((await kv.get(name)) ?? '0') };
    }),
  );
  return json(signals);
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const { pathname } = new URL(req.url);

    if (pathname === '/api/demand') return handleDemand(req, env);
    if (req.method !== 'GET') return json({ error: 'Método no permitido' }, 405);

    switch (pathname) {
      case '/api/forecast':
        return cached(ctx, 'forecast', HOUR, fetchForecast);
      case '/api/omm':
        return cached(ctx, 'omm', 2 * HOUR, fetchOmm);
      case '/api/jama':
        return cached(ctx, 'jama', JAMA_TTL_S, fetchJama);
      case '/':
      case '/api':
        return json({ name: 'hanan-worker', routes: ['/api/forecast', '/api/omm', '/api/jama', '/api/demand'] });
      default:
        return json({ error: 'No encontrado' }, 404);
    }
  },
} satisfies ExportedHandler<Env>;
