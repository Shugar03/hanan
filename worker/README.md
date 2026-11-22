# Hanan · Worker de caché (Cloudflare)

Proxy con caché en el edge para las fuentes abiertas del MVP. **No está deployado.** Sin secretos.

| Ruta | Fuente | TTL | Ante error |
|---|---|---|---|
| `GET /api/forecast` | Open-Meteo, una request multi-coordenada para los 6 puntos (`src/points.ts`). Devuelve el array crudo de 6 objetos (mismo formato que `fixtures/openmeteo_points.json`) | 1 h | Última copia cacheada (`X-Hanan-Cache: STALE`) o `503 {error}` |
| `GET /api/omm` | CelesTrak GP OMM JSON: 25544 ISS, 43641 SAOCOM 1A, 46265 SAOCOM 1B, 40941 ARSAT 2 (secuencial). Devuelve array de 4 OMM (formato `fixtures/omm.json`) | 2 h | Ante cualquier no-200 **corta sin reintentar**; sirve la última copia o `503 {error}` |
| `GET /api/jama` | Página oficial del Paso de Jama → `PassStatus` (`src/jama.ts`, función pura `parseJama`) | 30 min | Si la fuente no da 200 o el parseo da `desconocido`: sirve la última copia buena (stale, 7 días, `X-Hanan-Cache: STALE`); si no hay, `desconocido` + `sourceUrl` cacheado solo 2 min (`MISS-DEGRADED`). Lógica pura en `src/cachePolicy.ts` |
| `GET/POST /api/demand` | KV `DEMAND` (opcional). POST `{pointId, night:"YYYY-MM-DD"}` suma 1; GET lista `DemandSignal[]` | — | `501` si no hay binding |

CORS abierto (`*`). Caché: Cache API (`caches.default`) con key por URL interna estable, más una copia "stale" de 7 días para servir cuando la fuente falla. Cabeceras: `X-Hanan-Cache: HIT|MISS|MISS-DEGRADED|STALE`, `X-Hanan-Fetched-At`.

Reglas de `parseJama`: `estadoPrioridad` CERRADO → `cerrado`; ABIERTO + `estadoVialidad` RESTRINGIDA o CORTE TOTAL → `restringido`; ABIERTO → `abierto`; cualquier otra cosa o parseo fallido → `desconocido`. `sourceUpdatedAt` = la "última actualización" más reciente entre Gendarmería y Vialidad, en ISO con `-03:00`.

## Desarrollo

```sh
cd worker
npm install
npm test           # node:test + tsx; parseJama contra ../fixtures/paso_jama.html + casos sintéticos
npm run typecheck  # tsc --noEmit (src con @cloudflare/workers-types, tests con @types/node)
```

## Correr y deployar con el CLI `cf`

El repo no usa Wrangler: la config es `cloudflare.config.ts` (formato `cf/config`, CLI `cf` v0.15, technical preview).

Verificado con `cf build` en una copia temporal: el CLI `cf` **exige un dev-server de Cloudflare declarado en `package.json`** (`@cloudflare/vite-plugin` o `wrangler`); sin eso aborta con "No Cloudflare dev-server is installed". Para no meter dependencias pesadas antes de la demo, no lo agregamos. Para habilitarlo:

```sh
cd worker
npm install --save-dev wrangler        # o @cloudflare/vite-plugin (usar una versión publicada hace más de 7 días)
cf dev                                  # local, en miniflare/workerd
cf auth login                           # una sola vez (o CLOUDFLARE_API_TOKEN)
cf deploy --dry-run                     # build + checks, sin subir
cf deploy                               # sube el Worker "hanan-api"
```

KV de demanda (opcional): `cf kv namespaces create ...` y asociar el id al binding `DEMAND` (ver `cf kv namespaces --help`). Sin KV el resto de las rutas funciona igual.

Alternativa si `cf` no resuelve el build: `wrangler deploy src/index.ts --name hanan-api --compatibility-date 2026-11-01` (sin archivo de config).

Una vez deployado, la PWA apunta a `https://hanan-api.<subdominio>.workers.dev/api/*`; si el Worker no responde, la app usa la fuente directa o los fixtures (`../fixtures/`).
