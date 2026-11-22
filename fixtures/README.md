# Fixtures de Hanan (offline)

Capturados el **2026-11-22** (~11:00 ART). Sirven para trabajar, testear y hacer la demo sin red.

| Archivo | Qué es | Fuente / licencia |
|---|---|---|
| `points.json` | Los 6 puntos de observación de la spec (HU-1). `salinas` tiene `approximate: true` | Open-Meteo Geocoding + spec |
| `openmeteo_points.json` | Respuesta cruda de **una** request multi-coordenada: array de 6 objetos (mismo orden que `points.json`), 168 horas c/u (7 días desde 2026-11-22T00:00, hora local `America/Argentina/Jujuy`). Hourly: nubes total/baja/media/alta, HR, ráfagas, temperatura. Daily: moonrise, moonset, moon_phase, sunrise, sunset. Ojo: Open-Meteo ajusta lat/lon a su grilla | [Open-Meteo.com](https://open-meteo.com/), **CC BY 4.0** (atribución obligatoria; uso no comercial en el plan gratuito) |
| `omm.json` | Array de 4 OMM JSON (GP) en este orden: 25544 ISS, 43641 SAOCOM 1A, 46265 SAOCOM 1B, 40941 ARSAT 2. Épocas 2026-11-22 | [CelesTrak](https://celestrak.org/) GP data (`gp.php?CATNR=…&FORMAT=JSON`). Atribución "Órbitas: CelesTrak" |
| `paso_jama.html` | HTML de la página oficial del Paso de Jama (copia de `poc/samples/paso_jama.html`). `estadoPrioridad = "ABIERTO"`, `estadoVialidad = "HABILITADA"` | [argentina.gob.ar · Pasos internacionales](https://www.argentina.gob.ar/seguridad/pasosinternacionales/detalle/ruta/19/Jama) |
| `demo-salidas.json` | **DATOS DE EJEMPLO.** 12 salidas (`Salida`, `demo: true`) del 22 al 28/11/2026. Guías y operadores ficticios, WhatsApp ficticio `54938800000xx`, sin precios inventados | Inventado para la demo |
| `demo-demanda.json` | **DATOS DE EJEMPLO.** 42 señales "Quiero ir" (`DemandSignal`): 6 puntos × 7 noches, valores 0–20 | Inventado para la demo |

La UI tiene que etiquetar salidas y demanda como ejemplo (spec HU-9). No reemplazar por guías o teléfonos reales sin consentimiento.
