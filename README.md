# hanan · cielos de la Puna

**Hanan junta el mejor cielo con el guía indicado.** Pronostica la calidad de cada noche en los puntos de la [Ruta Jujeña de las Estrellas](https://www.fundacionstarlight.org/noticias/noticias/790-jujuy-celebra-la-acreditacion-de-su-ruta-de-los-cielos-jujenos-como-sendero-starlight.html) (RN 52, de Purmamarca a Jama, Sendero Starlight) y conecta a los guías de astroturismo con los aficionados y turistas que quieren ir.

> *Hanan*, en quechua, es "arriba"; *Hanan Pacha* es el mundo de arriba en la cosmovisión andina.

Proyecto creado para la **Cursor Hackathon Jujuy** (JujuyDev · Tren Solar de la Quebrada, 22/11/2026).

## Qué hace
- **Para aficionados y turistas:** score de cielo de 0 a 100 por punto y por hora (nubes por capa, luna, oscuridad, humedad, viento), la mejor noche de los próximos 7 días, qué se ve (Vía Láctea, planetas, Nubes de Magallanes), estado del Paso de Jama y salidas de guías esa noche con reserva por WhatsApp.
- **Para guías y operadores:** alertas de noches excelentes, señales de demanda ("Quiero ir") por punto y noche, publicación de salidas y reprogramación por clima.
- **Telemetría espacial:** posición de la ISS, SAOCOM 1A/1B y ARSAT 2 sobre la Puna, con aviso solo cuando el pase es visible.
- **Offline-first y modo rojo** para usar en el salar sin señal y sin arruinar la vista nocturna.

## Documentación
| | |
|---|---|
| Problemáticas de la Puna (investigación) | [`docs/research/problematicas-puna-jujuy.md`](docs/research/problematicas-puna-jujuy.md) |
| Factibilidad y fuentes de datos | [`docs/research/factibilidad-cielo-puna.md`](docs/research/factibilidad-cielo-puna.md) |
| Especificación de producto | [`docs/product/spec.md`](docs/product/spec.md) |
| Modelo de negocio | [`docs/product/business-model.md`](docs/product/business-model.md) |
| Roadmap y etapas | [`docs/product/roadmap.md`](docs/product/roadmap.md) |
| Arquitectura | [`docs/tech/architecture.md`](docs/tech/architecture.md) · [ADRs](docs/adr/) |
| Glosario | [`CONTEXT.md`](CONTEXT.md) |
| Marca | [`docs/brand/brand-guide.md`](docs/brand/brand-guide.md) · [`design/`](design/) |
| Pitch | [`pitch/index.html`](pitch/index.html) |

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
- Contaminación lumínica (roadmap): Falchi et al. 2016, *World Atlas of Artificial Night Sky Brightness* — CC BY‑NC 4.0.
- Tipografías: Bricolage Grotesque, IBM Plex Sans e IBM Plex Mono (SIL OFL).
