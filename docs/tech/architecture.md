# Hanan — arquitectura

Decisiones: [ADR‑0001](../adr/0001-offline-first-pwa.md) · [ADR‑0002](../adr/0002-open-meteo-como-fuente-principal.md) · [ADR‑0003](../adr/0003-omm-json-en-vez-de-tle.md). Specs: [`../product/spec.md`](../product/spec.md).

## Vista general

```
┌──────────────────────────── PWA (React + Vite + TS) ────────────────────────────┐
│  src/ui/        Mapa (MapLibre) · Panel de punto · Timeline · Qué se ve · Modo rojo│
│  src/sky/       PURO y testeable: ephemeris · score · bestWindow · satellites     │
│  src/data/      Clientes con caché (IndexedDB) → fallback a fixtures             │
│  Service Worker  precache de la app + último pronóstico/órbitas                  │
└───────────────┬──────────────────────────────────────────────────────────────────┘
                │ /api/*  (si no hay Worker: llamada directa a la fuente)
┌───────────────▼──────────── Cloudflare Worker (caché en el edge) ───────────────┐
│ /api/forecast → Open‑Meteo (multi‑coordenada, TTL 1 h)                           │
│ /api/omm      → CelesTrak GP JSON (5 objetos, TTL 2 h, corta ante no‑200)        │
│ /api/jama     → argentina.gob.ar pasos internacionales (parseo, TTL 30 min)      │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Módulos

| Módulo | Responsabilidad | Depende de |
|---|---|---|
| `src/sky/ephemeris.ts` | Altura del sol y la luna, iluminación lunar, crepúsculos, núcleo de la Vía Láctea, planetas, Nubes de Magallanes | `astronomy-engine` |
| `src/sky/score.ts` | Fórmula normativa de la spec §4 → `SkyScore` | `ephemeris`, `HourlyConditions` |
| `src/sky/bestWindow.ts` | Mejor ventana y mejor noche en 7 días | `score` |
| `src/sky/satellites.ts` | SGP4 desde OMM, posición en vivo, pases visibles | `satellite.js`, `ephemeris` (sol) |
| `src/data/forecast.ts` | Open‑Meteo → `HourlyConditions[]` por punto | fetch, caché |
| `src/data/omm.ts` | CelesTrak → OMM | fetch, caché |
| `src/data/pass.ts` | Estado del Paso de Jama → `PassStatus` | fetch, caché |
| `src/data/points.ts` | Catálogo estático de los 6 puntos | — |
| `src/data/salidas.ts` | Salidas de guías (MVP: `demo-salidas.json`, marcadas como ejemplo) y filtro por ventana | `bestWindow` |
| `src/data/demand.ts` | Señales "Quiero ir" (MVP: localStorage; luego: endpoint en el Worker con KV/D1) | — |
| `src/ui/guia/` | Modo guía: alertas, demanda agregada, publicar salida, reprogramar | `sky/`, `data/` |
| `worker/` | Proxy con caché en el edge | Cloudflare (CLI `cf`) |

Regla: `src/sky/` no hace I/O ni usa el reloj implícitamente (recibe `Date`). Eso permite testear contra fixtures y alimentar el simulador de fecha.

## Contratos de datos (TypeScript)

```ts
type ObservationPoint = {
  id: 'purmamarca' | 'salinas' | 'susques' | 'olaroz' | 'jama' | 'tilcara';
  name: string; lat: number; lon: number; elevationM: number;
  approximate?: boolean;            // coordenadas a verificar
};

type HourlyConditions = {
  time: Date;                       // hora local America/Argentina/Jujuy
  cloudLow: number; cloudMid: number; cloudHigh: number;   // %
  humidity: number;                 // %
  windGustKmh: number; temperatureC: number;
};

type SkyScore = {
  time: Date; score: number;        // 0–100
  label: 'Excelente' | 'Muy bueno' | 'Aceptable' | 'Malo' | 'Día';
  factors: { darkness: number; clouds: number; moon: number; humidity: number; wind: number };
};

type ObservationWindow = { start: Date; end: Date; meanScore: number };

type NightSummary = {
  date: string;                     // YYYY-MM-DD de la tarde
  astroDusk: Date; astroDawn: Date;
  moon: { rise?: Date; set?: Date; illumination: number };
  milkyWayCore: { maxAltitudeDeg: number; hoursAbove20: number };
  planets: { name: string; altitudeDeg: number }[];
  bestWindow?: ObservationWindow;
  seasonalNote?: string;
};

type SatPass = {
  satellite: 'ISS' | 'SAOCOM 1A' | 'SAOCOM 1B' | 'ARSAT 2';
  start: Date; end: Date; maxElevationDeg: number; visible: boolean;
};

type Salida = {
  id: string; guideName: string; guideRegistered: boolean;   // badge Ley 6308 (verificado manualmente)
  pointId: ObservationPoint['id']; departure: Date; durationH: number;
  capacity: number; languages: string[]; priceRef?: string;   // texto, sin moneda inventada
  whatsapp: string; demo: boolean;                            // true en el MVP
};

type DemandSignal = { pointId: ObservationPoint['id']; night: string; count: number };

type PassStatus = {
  state: 'abierto' | 'restringido' | 'cerrado' | 'desconocido';
  sourceUpdatedAt?: string; fetchedAt: Date; sourceUrl: string;
};
```

## Caché y fuentes

| Fuente | TTL | Política ante error | Fixture offline |
|---|---|---|---|
| Open‑Meteo forecast | 1 h | Mostrar el último dato con su antigüedad | `poc/samples/openmeteo_susques.json` (extender a los 6 puntos en E1) |
| CelesTrak GP (OMM JSON) | 2 h | Ante cualquier respuesta distinta de 200: **no reintentar**, usar el caché y loguear | `poc/samples/omm_*.json` |
| Paso de Jama | 30 min | `state: 'desconocido'` + link oficial | `poc/samples/paso_jama.html` |
| 7Timer! | — | No se usa en el MVP ([ADR‑0002](../adr/0002-open-meteo-como-fuente-principal.md)) | `poc/samples/7timer_susques.json` |

Request de Open‑Meteo (una sola para todos los puntos):
```
https://api.open-meteo.com/v1/forecast?latitude=<lat1,lat2,…>&longitude=<lon1,lon2,…>
  &hourly=cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m,wind_gusts_10m,temperature_2m
  &timezone=America%2FArgentina%2FJujuy&forecast_days=7
```

## Evolución del marketplace (post‑MVP)
- Persistencia de salidas y señales de demanda: Cloudflare D1/KV detrás del mismo Worker.
- Cuentas de guía y verificación contra el Registro Único de Guías (Ley 6308).
- Pagos y comisión: integración con una pasarela local (a definir) recién cuando el modelo legal esté resuelto ([business-model.md §6](../product/business-model.md)).

## Despliegue
- Frontend: Cloudflare Pages (o servir `dist/` local para la demo).
- Worker: CLI `cf` (no hay configuración de Wrangler en el repo).
- Sin secretos: todas las fuentes del MVP son abiertas y sin clave.
