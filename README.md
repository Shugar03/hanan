# hanan · cielos de la Puna

**Hanan junta el mejor cielo con el guía indicado.** Pronostica la calidad de cada noche en los puntos de la [Ruta Jujeña de las Estrellas](https://www.fundacionstarlight.org/noticias/noticias/790-jujuy-celebra-la-acreditacion-de-su-ruta-de-los-cielos-jujenos-como-sendero-starlight.html) (RN 52, de Purmamarca a Jama, Sendero Starlight) y conecta a los guías de astroturismo con los aficionados y turistas que quieren ir.

> *Hanan*, en quechua, es "arriba"; *Hanan Pacha* es el mundo de arriba en la cosmovisión andina.

Proyecto creado para la **Cursor Hackathon Jujuy** (JujuyDev · Tren Solar de la Quebrada, 22/11/2026).

## Qué hace
Una app (PWA, funciona sin señal) con cuatro pestañas y un modo guía:

| Pestaña | Qué es |
|---|---|
| **Explorar** | Mapa de la Puna con los 6 puntos de la Ruta de las Estrellas, score de la noche, mejor ventana de 7 días, qué se ve, capas de nubes/viento/score tipo Ventusky y estado del Paso de Jama |
| **Cielo** | Planetario en vivo tipo Stellarium: estrellas, constelaciones en español, Vía Láctea, Luna, planetas y satélites (ISS, SAOCOM, ARSAT) |
| **Salidas** | Marketplace tipo Luma: salidas de guías con precio, ficha con el cielo de esa noche, reserva con seña (simulada en la demo), `.ics` y garantía de cielo |
| **Mi noche** | Planificador para aficionados: 3 planes recomendados con su porqué, qué ver, checklist y alertas |
| **Modo guía** | Crear salidas con precio, ver demanda, alertas de noches excelentes y reprogramar |
| **Observatorio** | Un toque desde Explorar o Cielo abre la cámara con el cielo superpuesto en realidad aumentada (brújula + giroscopio, calibración con la Luna o una estrella). Requiere HTTPS |

Además: **tema claro/oscuro**, **modo rojo** de visión nocturna y simulador de fecha (`?fecha=2026-06-20T22:00`). Definición de producto: [`docs/product/product-vision.md`](docs/product/product-vision.md).

## Stack
React + Vite + TypeScript · MapLibre GL · astronomy-engine · satellite.js · Open-Meteo · CelesTrak · Cloudflare Worker (`worker/`) · vitest · Playwright (`e2e/`).

## Correr la app
```bash
npm install
npm run dev                 # desarrollo
npm test                    # tests unitarios (vitest)
npm run build && npx vite preview --port 4173 --strictPort
cd e2e && npm install && npx playwright install chromium && HANAN_URL=http://localhost:4173 npx playwright test
```
Deep links para la demo: `?tab=explorar|cielo|salidas|noche&punto=susques`, `&salida=<id>`, `?guia`, `&fecha=2026-11-22T23:30`.
Las salidas, guías, precios y demanda son **de ejemplo** y están rotulados así en la app.

## Documentación
| | |
|---|---|
| Problemáticas de la Puna (investigación) | [`docs/research/problematicas-puna-jujuy.md`](docs/research/problematicas-puna-jujuy.md) |
| Factibilidad y fuentes de datos | [`docs/research/factibilidad-cielo-puna.md`](docs/research/factibilidad-cielo-puna.md) |
| Definición de producto (CPO) | [`docs/product/product-vision.md`](docs/product/product-vision.md) |
| Especificación del motor de cielo | [`docs/product/spec.md`](docs/product/spec.md) |
| Modelo de negocio | [`docs/product/business-model.md`](docs/product/business-model.md) |
| Roadmap y etapas | [`docs/product/roadmap.md`](docs/product/roadmap.md) |
| Arquitectura | [`docs/tech/architecture.md`](docs/tech/architecture.md) · [ADRs](docs/adr/) |
| Glosario | [`CONTEXT.md`](CONTEXT.md) |
| Marca | [`docs/brand/brand-guide.md`](docs/brand/brand-guide.md) · [`design/`](design/) |
| Pitch | [`pitch/index.html`](pitch/index.html) · [`pitch/hanan-pitch.pdf`](pitch/hanan-pitch.pdf) |
| Worker de caché | [`worker/README.md`](worker/README.md) |
| Tests E2E | [`e2e/README.md`](e2e/README.md) |

## Prueba de concepto
```bash
cd poc && npm install
node poc.mjs      # noche astronómica, luna, Vía Láctea, planetas y pases de satélites para Susques
node season.mjs   # temporada de la Vía Láctea mes a mes
```
`poc/samples/` tiene respuestas reales (22/11/2026) de Open‑Meteo, 7Timer!, CelesTrak y el estado del Paso de Jama, para trabajar sin red.

## Atribuciones y licencias de datos
- Datos meteorológicos: [Open‑Meteo.com](https://open-meteo.com/) — CC BY 4.0. El plan gratuito es solo para uso no comercial.
- Elementos orbitales: [CelesTrak](https://celestrak.org/) (GP/OMM), según su política de uso.
- Efemérides: [astronomy-engine](https://github.com/cosinekitty/astronomy) (MIT). Propagación SGP4: [satellite.js](https://github.com/shashwatak/satellite-js) (MIT).
- Estado del Paso de Jama: [argentina.gob.ar — Pasos internacionales](https://www.argentina.gob.ar/seguridad/pasosinternacionales/detalle/ruta/19/Jama).
- Climatología: Servicio Meteorológico Nacional (normales de La Quiaca).
- Catálogo estelar y constelaciones: [d3-celestial](https://github.com/ofrohn/d3-celestial) (BSD-3; ver `src/data/catalog/ATTRIBUTION.md`).
- Mapa base: Esri (World Hillshade Dark / Dark Gray) · © OpenStreetMap.
- Contaminación lumínica (roadmap): Falchi et al. 2016, *World Atlas of Artificial Night Sky Brightness* — CC BY‑NC 4.0.
- Tipografía: Schibsted Grotesk (SIL OFL).
