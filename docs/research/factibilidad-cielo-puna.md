# Factibilidad — Hanan (nombre de trabajo: "Cielo Puna"): pronóstico de noches para astroturismo en la Ruta Jujeña de las Estrellas

Fecha: 2026-11-22. Estado: **factible** para un MVP de hackathon con datos 100 % abiertos y sin hardware. Hay riesgos identificados (§7).
Todas las APIs se probaron en vivo hoy; las respuestas quedaron cacheadas en `poc/samples/` y el script de prueba está en `poc/poc.mjs`.

---

## 0. Contexto del evento (dato crítico)

- **Cursor Hackathon Jujuy**: hoy, domingo 22/11/2026, a bordo del Tren Solar (Volcán → Quebrada). Lo organizan JujuyDev, el Gobierno de Jujuy, SpaceXSI Community y Argentina Space. Temas anunciados: **energías renovables y telemetría**; tracks "sorpresa". [Prensa Jujuy](https://prensa.jujuy.gob.ar/tren-solar/el-tren-solar-sera-escenario-una-hackathon-internacional-que-reunira-70-desarrolladores-n126044) · [Luma](https://luma.com/spacexai-zfyd)
- Ventana real de trabajo: ~09:00 a ~19:30 (vuelta desde la Estación Tumbaya).
- **Implicancias**: un tren que cruza la Quebrada va a tener conectividad intermitente → hay que desarrollar contra **datos cacheados** (ya están en `poc/samples/`) y que la demo funcione sin red. El encaje con el track de "telemetría" es directo (satélites, órbitas, telemetría atmosférica).

---

## 1. Problema y usuarios (validado)

**Problema:** el astroturismo en la Puna depende por completo del cielo y de la ruta, y hoy no existe una herramienta que combine *nubes + luna + oscuridad + qué se ve + estado de la RN 52 / Paso de Jama* para un punto concreto de la Ruta de las Estrellas.

Evidencia:
- Ruta Jujeña de las Estrellas: RN 52, de Purmamarca a Jama, acreditada como **Sendero Starlight** el 24/10/2025. [Fundación Starlight](https://www.fundacionstarlight.org/noticias/noticias/790-jujuy-celebra-la-acreditacion-de-su-ruta-de-los-cielos-jujenos-como-sendero-starlight.html)
- Infraestructura nueva: **COAS Susques** (inaugurado el 30/09/2025, entrada gratuita, gestión turística municipal y científica a cargo del IATE‑CONICET) y **Observatorio de Olaroz Chico** (10/2025). [Prensa Jujuy](https://prensa.jujuy.gob.ar/centro-observacion-astronomica/con-el-centro-observacion-astronomica-la-puna-se-fortalece-como-destino-turistico-y-educativo-n121207) · [Cultura Jujuy](https://culturayturismo.jujuy.gob.ar/2025/10/09/el-observatorio-astronomico-de-olaroz-chico-ya-recibe-visitantes-en-la-puna/)
- Demanda: ~1,5 M de turistas en 2025, >4 M de pernoctes, estadía promedio de ~2,9 noches, US$ 315–360 M de impacto, 7 % del PBG, 28.000 empleos. [Cultura Jujuy](https://culturayturismo.jujuy.gob.ar/2025/12/23/jujuy-se-consolida-como-uno-de-los-mas-destacados-destinos-argentinos/) · [Cultura Jujuy 2026](https://culturayturismo.jujuy.gob.ar/2026/01/07/jujuy-abre-sus-puertas-al-verano-comienza-la-temporada-mas-esperada/)
- La Puna es la región con menor ocupación: **48 %** en julio de 2025 vs. 80 % en la Quebrada (hay margen para crecer, y el astroturismo es un producto de pernocte). [Cultura Jujuy](https://culturayturismo.jujuy.gob.ar/2025/08/04/jujuy-en-numeros-73-de-ocupacion-hotelera-y-una-temporada-invernal-de-record/)
- Los operadores ya venden salidas nocturnas (Capricornio Sideral, Yanavico, Turismo Nativo) y reconocen que **"una noche nublada puede limitar o incluso cancelar la experiencia"**; una agencia no reembolsa con menos de 15 días de anticipación. [Capricornio Sideral](https://mauroturismo.com/agencia-turismo/capricornio-sideral-astroturismo-jujuy/) · [Yanavico](https://yanavico.tur.ar/es/tours/cielo-nocturno-observacion-astronomica-1d/) · [Guardiana del Bosque](https://guardianadelbosque.ar/paquete/salinas-grandes/)

**Usuarios:**
1. Turista independiente (¿voy esta noche o mañana?, ¿a qué hora?, ¿qué abrigo llevo?).
2. Guía u operador local (planificar y reprogramar salidas, explicar el cielo).
3. Secretaría de Turismo / COAS (comunicación y difusión del producto Starlight).

---

## 2. Hallazgos clave de la prueba técnica (calculados hoy, Susques)

| Hallazgo | Dato | Implicancia para el producto |
|---|---|---|
| Noche astronómica 22→23/11 | 21:16 → 05:06 (7,8 h) | Calculable offline con astronomy-engine |
| Luna 22/11 | Sale 18:02, se pone 05:14, 96 % iluminada (Open‑Meteo: 18:01 / 04:31 → coinciden en la salida) | **Esta semana la luna arruina el cielo profundo** → el "score" tiene que penalizarla fuerte |
| Pronóstico Open‑Meteo, Susques 22/11 | Nubosidad 0 % hasta las 22 h; entra nubosidad alta del 28–53 % de 23 a 05 h; ráfagas de 60 → 23 km/h; T de 21,6 → 5 °C | Nubosidad por capas (baja/media/alta) disponible: sirve para el score |
| Núcleo de la Vía Láctea por mes (Susques) | Visible >20° durante 10,3 h en junio, 6–8 h de abril a agosto, **0 h de noviembre a enero** | El producto tiene que educar sobre la estacionalidad (el turista del verano no ve el núcleo) |
| Temporada de nubes | La Quiaca: nubosidad media de 5,2/8 en enero vs. 1,4/8 en julio; ~68 % de la lluvia anual entre diciembre y febrero ([SMN](https://ssl.smn.gob.ar/dpd/descarga_opendata.php?file=observaciones%2Festadisticas.txt)) | **El pico turístico (verano/carnaval) coincide con la peor época de cielo** → ahí es donde el pronóstico agrega más valor |
| Pases de satélites (7 días) | ISS: 0 pases visibles (todos sus pases en noche cerrada caen en la sombra terrestre). SAOCOM 1A/1B: 0 pases sobre 10° de noche (órbita heliosincrónica crepuscular). ARSAT‑2: geoestacionario | "Ver el satélite argentino pasar" **no está garantizado** → mostrarlo como "está pasando sobre vos" (posición en vivo), no como algo visible a simple vista |
| 7Timer! ASTRO | Funciona sin clave (pide seguir el redirect HTTP→HTTPS). Para Susques reporta seeing 1–2 (excelente) pero transparencia **1 (muy pobre)** | Probable artefacto del modelo GFS de baja resolución en terreno alto → usarlo solo como secundario o descartarlo |

---

## 3. Requisitos del MVP

### Funcionales (priorizados)
- **P0** — Mapa de la RN 52 con 5–6 puntos de observación (Purmamarca, Salinas Grandes, Susques/COAS, Olaroz Chico, Jama + uno de control en la Quebrada).
- **P0** — "Score de cielo" por punto y por hora para las próximas 72 h (0–100), con desglose: nubes por capa, luna (altura × iluminación), humedad, viento, oscuridad (sol < −18°).
- **P0** — "Mejor noche / mejor ventana" de los próximos 7 días por punto.
- **P0** — Qué se ve esa noche: núcleo de la Vía Láctea (altura), planetas visibles, Nubes de Magallanes, fase lunar.
- **P1** — Estado del Paso de Jama y de la RN 52 (abierto/cerrado/restringido) + alerta de viento y temperatura (sensación térmica a la hora de observar).
- **P1** — Satélites "sobre la Puna ahora" (ISS, SAOCOM, ARSAT) en 3D/2D, con aviso de pase *visible* solo cuando corresponda.
- **P2** — Capa de contaminación lumínica (World Atlas / VIIRS), UV diurno, ficha del COAS y de los operadores, compartir por WhatsApp.

### No funcionales
- **Offline‑first**: las efemérides se calculan en el cliente; el pronóstico se cachea en la última sincronización (PWA). Es imprescindible por la conectividad de la Puna (Santa Catalina: 79,5 % de hogares sin internet; ver `problematicas-puna-jujuy.md`) y por la del propio tren.
- **Respetar los límites de las APIs**: un backend o edge con caché (Open‑Meteo ≤ 10.000 llamadas/día; CelesTrak como máximo una descarga cada 2 h por objeto).
- Mobile first, en español (opcional: inglés/portugués; Brasil es el 18 % del turismo extranjero).
- Sin datos personales: si se usa geolocalización, pedir consentimiento expreso (Ley 25.326; [AAIP](https://www.argentina.gob.ar/noticias/proteccion-de-datos-personales-y-geolocalizacion)).

---

## 4. Fuentes de datos (todas verificadas hoy)

| Necesidad | Fuente | Acceso | Licencia / límites | Estado |
|---|---|---|---|---|
| Nubes (total/baja/media/alta), HR, viento, ráfagas, T, visibilidad, salida/puesta de luna, fase | **Open‑Meteo Forecast API** | REST sin clave | Gratis solo para uso **no comercial**, CC BY 4.0 (hay que atribuir); <10.000/día, 5.000/h, 600/min. Recomiendan Cloudflare Workers ([términos](https://open-meteo.com/en/terms)) | ✅ probado (`samples/openmeteo_susques.json`) |
| Geocoding + elevación | Open‑Meteo Geocoding | REST sin clave | ídem | ✅ Susques −23,39858/−66,36753 (3.605 m), Olaroz Chico −23,39338/−66,80291 (4.172 m), Jama −23,24019/−67,01778 (4.057 m), Purmamarca −23,74595/−65,49976 (2.324 m) |
| Seeing / transparencia | **7Timer! ASTRO** | REST sin clave (`/bin/api.pl?product=astro&output=json`) | Gratis; resolución gruesa, cada 3 h | ⚠️ funciona, pero la transparencia es dudosa en la Puna |
| Sol, luna, planetas, crepúsculos, Vía Láctea | **astronomy-engine** 2.1.19 (npm) | Librería local | MIT; precisión ±1′ | ✅ probado |
| Órbitas de satélites | **CelesTrak GP** (`gp.php?CATNR=…&FORMAT=JSON`) | REST sin clave | Política: bajar una vez por actualización (cada 2 h); preferir CSV; frenar ante cualquier respuesta distinta de 200. Desde el 11/07/2026 los objetos nuevos tienen 6 dígitos y **no tienen TLE** → usar OMM ([doc](https://celestrak.org/NORAD/documentation/gp-data-formats.php), [policy](http://celestrak.org/usage-policy.php)) | ✅ ISS 25544, SAOCOM 1A 43641, SAOCOM 1B 46265, ARSAT 1 40272, ARSAT 2 40941 |
| Propagación SGP4 | **satellite.js** 7.x (`json2satrec` para OMM) | Librería local | MIT | ✅ probado con 7.0.1 |
| Estado del Paso de Jama | argentina.gob.ar/seguridad/pasosinternacionales/detalle/ruta/19/Jama | Scraping de HTML: variables JS embebidas `estadoPrioridad` ("ABIERTO"/"CERRADO") y `estadoVialidad` ("HABILITADA"/"RESTRINGIDA"/"CORTE TOTAL") | Información pública (Ley 27.275); sin API formal → frágil | ✅ parseable (`samples/paso_jama.html`) |
| Estado de rutas provinciales | Parte diario de la Secretaría de Seguridad Vial de Jujuy | Solo en redes y prensa, **sin feed estructurado** | — | ❌ manual / fuera del MVP |
| Contaminación lumínica | World Atlas of Artificial Night Sky Brightness (Falchi 2016), GeoTIFF de 2,9 GB a 30″ | Descarga a pedido vía formulario GFZ | **CC BY‑NC 4.0** | ⚠️ precalcular el valor de cada punto; no hace falta en tiempo real |
| Luces nocturnas recientes | NASA Black Marble (VNP46) | Token de Earthdata (gratis, expira a los 60 días) | Abierta (NASA) | ⚠️ solo P2 |
| Climatología | SMN, normales de La Quiaca | Texto open data | Pública | ✅ |

---

## 5. Arquitectura propuesta (mínima)

```
[PWA (React/Vite o similar) + MapLibre/Cesium]
   ├─ astronomy-engine + satellite.js  → cálculos en el cliente (offline)
   └─ fetch /api/* (cacheado en IndexedDB / Service Worker)
[Edge (Cloudflare Worker) con caché]
   ├─ /api/forecast?pt=…  → Open‑Meteo (caché de 1 h, todos los puntos en 1 request multi‑coord)
   ├─ /api/omm            → CelesTrak (caché de 2 h, 5 objetos)
   └─ /api/jama           → scraping de pasosinternacionales (caché de 30 min)
```
- Open‑Meteo acepta varias coordenadas en una sola llamada → 6 puntos = 1 request por hora (~24/día). Uso muy por debajo del límite.
- Atribución visible: "Weather data by Open‑Meteo.com (CC BY 4.0)", "Orbital data: CelesTrak".

### Score de cielo (borrador a validar con un guía)
```
oscuridad   = sol < −18° ? 1 : (sol < −12° ? 0,5 : 0)
nubes       = 1 − (0,5·baja + 0,3·media + 0,2·alta)/100
luna        = 1 − iluminación · max(0, sin(alt_luna))
humedad     = HR > 85 % ? 0,5 : 1
viento      = ráfagas > 50 km/h ? 0,6 : 1      (incomodidad / telescopios)
score       = 100 · oscuridad · nubes · luna · humedad · viento
```

---

## 6. Documentos y entregables

| Documento | Para qué | Estado |
|---|---|---|
| `docs/research/problematicas-puna-jujuy.md` | Contexto del problema regional con datos reales | ✅ |
| `docs/research/factibilidad-cielo-puna.md` (este) | Requisitos, fuentes, riesgos | ✅ |
| `poc/` (`poc.mjs`, `season.mjs`, `samples/`) | Prueba técnica + datos para trabajar offline | ✅ |
| Atribuciones y licencias (README) | Exigido por CC BY 4.0 (Open‑Meteo) y CC BY‑NC (World Atlas) | Pendiente |
| Pitch de 3 minutos (problema → demo → impacto) | Jurado | Pendiente |
| Validación con un guía o el COAS | Calibrar el score; contactar Comisión Municipal de Susques / IATE | Opcional (post‑hackathon) |

**Trámites y permisos para el MVP: ninguno.** Todas las fuentes son abiertas y sin registro, salvo NASA Earthdata (P2, cuenta gratuita). Si se comercializara: hace falta un plan pago de Open‑Meteo (no se puede usar el plan gratuito con publicidad ni suscripciones) y licenciar el World Atlas (NC).

---

## 7. Riesgos y mitigaciones

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Conectividad del tren / Puna durante el desarrollo y la demo | Alta | Alto | Muestras en `poc/samples/`; demo con datos cacheados; efemérides offline |
| Pronóstico de nubes poco preciso en alta montaña (modelos globales de ~9–25 km) | Media | Medio | Mostrar un rango/confianza; combinar con la climatología del SMN; no prometer certeza |
| 7Timer! con transparencia errónea en la Puna | Alta | Bajo | Usarlo solo como dato secundario o excluirlo |
| No hay pases visibles de ISS/SAOCOM en la fecha de la demo | Alta (confirmado esta semana) | Medio (efecto wow) | Mostrar la posición en vivo y la trayectoria "sobre la Puna", más un simulador de fecha (p. ej. junio, con la Vía Láctea en el cénit) |
| Scraping del Paso de Jama se rompe | Media | Bajo | Fallback "ver fuente oficial" + timestamp de la última actualización |
| Rate limits (CelesTrak 403, Open‑Meteo) | Baja con caché | Medio | Edge cache; frenar ante respuestas distintas de 200 |
| Coordenadas exactas de los miradores de Salinas Grandes / COAS | Media | Bajo | El COAS está "a 1,5 km del ejido urbano" de Susques; usar el centroide de la localidad y marcarlo como aproximado |
| Licencia no comercial de Open‑Meteo / World Atlas | — | Bajo para hackathon | Documentar; prever un plan pago si escala |

---

## 8. Veredicto

**Factible en un día de hackathon.** Las tres piezas difíciles (pronóstico atmosférico por capas, efemérides precisas y propagación orbital con OMM) están resueltas con APIs y librerías abiertas, ya probadas contra Susques. El diferencial no es técnico sino de **producto**: unir el cielo, la ruta y la estacionalidad para un corredor turístico real y certificado, y resolver el dolor concreto de los operadores (cancelaciones por nubes, sobre todo en el verano, que es la temporada alta).

**Recorte recomendado para hoy:** P0 completo + Paso de Jama (P1) + satélites en vivo (P1) con simulador de fecha. Dejar la contaminación lumínica y el UV para el pitch como roadmap.
