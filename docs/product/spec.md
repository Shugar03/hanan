# Hanan — especificación de producto (MVP hackathon)

Versión 0.1 · 2026-11-22 · Cursor Hackathon Jujuy (Tren Solar).
Base de evidencia: [`../research/factibilidad-cielo-puna.md`](../research/factibilidad-cielo-puna.md) y [`../research/problematicas-puna-jujuy.md`](../research/problematicas-puna-jujuy.md). Glosario: [`../../CONTEXT.md`](../../CONTEXT.md).

## 1. Problema

El astroturismo en la Puna jujeña depende por completo del cielo y de la ruta, pero no hay una herramienta que responda **"¿vamos esta noche, adónde y a qué hora?"** para los puntos de la Ruta Jujeña de las Estrellas (RN 52, de Purmamarca a Jama, Sendero Starlight desde el 24/10/2025).

- **El pico turístico coincide con el peor cielo:** en La Quiaca la nubosidad media es de 5,2/8 en enero vs. 1,4/8 en julio, y ~68 % de la lluvia cae entre diciembre y febrero (SMN).
- **El centro de la Vía Láctea no se ve de noviembre a enero** (0 h por encima de 20° en Susques), cuando más turistas llegan.
- Los operadores reconocen que una noche nublada **puede cancelar la salida**, y algunos no reintegran con menos de 15 días.
- La Puna tiene la menor ocupación de la provincia (48 % en julio de 2025 vs. 80 % en la Quebrada): el astroturismo es un producto de pernocte que puede cambiar eso.

## 2. Visión: un sistema de dos lados

Hanan **junta el mejor cielo con el guía indicado**. Es a la vez una herramienta de pronóstico astronómico y un **marketplace** que conecta la oferta (guías y operadores de astroturismo) con la demanda (aficionados a la astronomía y turistas). El cielo es el motor de la conversión: cuando el score es alto, Hanan muestra salidas disponibles esa noche; cuando hay demanda, los guías la ven y abren salidas.

Modelo de negocio: [`business-model.md`](business-model.md).

### Usuarios y jobs-to-be-done

| Lado | Usuario | Job | Métrica de éxito |
|---|---|---|---|
| Demanda | **Aficionado/a a la astronomía** (local o viajero, con o sin telescopio, astrofotógrafo) | "Saber qué noche y adónde ir, qué voy a ver y con quién ir si no conozco la zona." | Elige una ventana con score ≥ 70; guarda o reserva |
| Demanda | **Turista** | "Vivir la experiencia de las estrellas en la Puna sin perder la noche por las nubes." | Reserva una salida con buen score |
| Oferta | **Guía de astroturismo** (inscripto en el Registro Único de Guías, Ley 6308) | "Llenar mis salidas, planificar con el clima y reprogramar sin perder clientes." | Ocupación de sus salidas; menos cancelaciones |
| Oferta | **Operador / agencia** (Ley 18.829) | "Vender salidas nocturnas con menos riesgo climático." | Reservas por noche |
| Ecosistema | **Turismo provincial / COAS** | "Medir y promover el producto Starlight." | Demanda agregada por punto y fecha |

### Ciclo de matching
1. El aficionado/turista ve el score de los puntos → elige noche y punto → marca **"Quiero ir"** (señal de demanda) o ve las **salidas publicadas** para esa ventana.
2. El guía ve en su panel las **señales de demanda** agregadas ("12 personas quieren ir a Susques el sábado") y las **alertas de noche excelente** → publica o confirma una salida.
3. Reserva → contacto (MVP: WhatsApp con mensaje prellenado; luego, pago en la app con comisión).
4. Si el score cae por debajo de un umbral antes de la salida → Hanan sugiere **reprogramar** y le avisa a los reservados.

## 3. Alcance

### P0 — imprescindible para la demo

**HU‑1 Mapa de la Ruta de las Estrellas**
- *Dado* que abro la app, *cuando* carga, *entonces* veo un mapa oscuro de la RN 52 con 6 puntos de observación, cada uno coloreado según el score de la próxima ventana nocturna.
- Puntos (coordenadas de Open‑Meteo Geocoding salvo indicación):

| id | Nombre | Lat | Lon | Alt (m) | Nota |
|---|---|---|---|---|---|
| `purmamarca` | Purmamarca | −23,74595 | −65,49976 | 2.324 | |
| `salinas` | Salinas Grandes (mirador RN 52) | −23,62 | −65,87 | ~3.450 | **aproximada**, verificar |
| `susques` | Susques · COAS | −23,39858 | −66,36753 | 3.605 | El COAS está a ~1,5 km del ejido urbano |
| `olaroz` | Olaroz Chico · Observatorio | −23,39338 | −66,80291 | 4.172 | |
| `jama` | Jama | −23,24019 | −67,01778 | 4.057 | |
| `tilcara` | Tilcara (control Quebrada) | −23,57817 | −65,39516 | 2.486 | |

**HU‑2 Score de cielo por hora**
- *Dado* un punto, *cuando* lo selecciono, *entonces* veo un timeline de las próximas 72 h con el score (0–100) por hora nocturna y su desglose (oscuridad, nubes por capa, luna, humedad, viento).
- Las horas diurnas aparecen como "día" (score 0, sin color).

**HU‑3 Mejor ventana**
- *Dado* un punto, *entonces* veo la "mejor noche" de los próximos 7 días y la ventana continua de mayor score (≥ 1 h), con su hora de inicio y fin.
- Si ninguna hora supera 40, el mensaje dice "Semana difícil para el cielo profundo" y sugiere otro punto con mejor score.

**HU‑4 Qué se ve esta noche**
- Fase y porcentaje de la luna, horas de salida y puesta.
- Altura máxima del núcleo de la Vía Láctea (Sgr A*, AR 17,761 h, Dec −29,008°) y horas por encima de 20°.
- Planetas sobre el horizonte al final del crepúsculo astronómico.
- Nubes de Magallanes (siempre circumpolares en estas latitudes: mostrar altura).
- Mensaje de estacionalidad cuando corresponda (por ejemplo, de noviembre a enero: "El centro de la Vía Láctea se esconde temprano; la mejor temporada es de abril a septiembre").

**HU‑9 Salidas de esa noche (lado demanda)**
- *Dado* un punto y una noche, *entonces* veo las salidas de guías publicadas que caen en esa ventana: guía, punto de partida, horario, cupo, idiomas, precio de referencia y el score de cielo de ese horario.
- Botón **"Reservar"** → abre WhatsApp del guía con un mensaje prellenado: "Hola, vi en Hanan tu salida a {punto} el {fecha} a las {hora} (cielo {score}/100). ¿Hay lugar para {n}?".
- En el MVP las salidas son **datos de ejemplo** (`src/data/demo-salidas.json`) y la UI lo indica con una etiqueta visible. No se usan nombres ni teléfonos de guías reales sin su consentimiento.

**HU‑10 "Quiero ir" (señal de demanda)**
- *Dado* una noche y un punto, *cuando* toco "Quiero ir", *entonces* queda guardado (MVP: localStorage) y el contador de interés de esa noche suma 1.
- Sin login: en el MVP la señal es anónima.

### P1 — si da el tiempo

**HU‑11 Modo guía**
- Panel con: alertas de noches ≥ 85 en sus puntos para los próximos 7 días, señales de demanda agregadas por punto y noche, y un formulario "Publicar salida" (punto, fecha, hora, cupo, precio, idiomas, WhatsApp).
- Badge **"Guía registrado"** solo para guías verificados contra el Registro Único de Guías de Jujuy (Ley 6308). En el MVP la verificación es manual y está marcada como pendiente.
- Reprogramar: si el score de su salida cae < 40, un botón sugiere la mejor ventana alternativa de los próximos 3 días y genera un mensaje para sus clientes.

**HU‑12 Perfil de aficionado (Pro, roadmap)**
- Alertas personalizadas (punto, umbral de score, Vía Láctea en temporada, fase lunar) y planificador de astrofoto. Fuera del MVP; se muestra como "Pro" bloqueado en la demo.

**HU‑5 Estado del Paso de Jama y la RN 52**
- Se lee de la página oficial de pasos internacionales (variables `estadoPrioridad` y `estadoVialidad`).
- Se muestra como "Abierto", "Restringido" o "Cerrado", con la fecha de actualización de la fuente y un link a ella.
- Si el parseo falla: mostrar "Ver estado oficial" con el link, nunca un estado inventado.

**HU‑6 Alerta de frío y viento**
- Para la ventana elegida, mostrar la temperatura mínima y las ráfagas, y una recomendación de abrigo según umbrales (< 0 °C, < −5 °C; ráfagas > 50 km/h).

**HU‑7 Satélites sobre la Puna**
- Posición en vivo (2D en el mapa) de la ISS, SAOCOM 1A, SAOCOM 1B y ARSAT 2.
- Un "pase visible" solo se anuncia si: elevación > 10°, sol < −6° en el punto y satélite iluminado por el sol. Si no hay pases visibles, decir "Pasa sobre vos, pero no se ve a simple vista".

**HU‑8 Simulador de fecha**
- Cambiar la fecha y hora (por ejemplo, a una noche de junio) recalcula efemérides, Vía Láctea y satélites. El pronóstico del tiempo solo aplica a los próximos 7 días; fuera de ese rango se muestra "Sin pronóstico: solo cálculo astronómico".

### P2 — roadmap (fuera del MVP)
Capa de contaminación lumínica (World Atlas 2016 precalculado por punto), índice UV diurno, fichas de operadores y del COAS, i18n EN/PT, **capa de cielo andino** (Willka Chakata, constelaciones oscuras) co-creada con referentes, notificaciones de "noche excelente".

### Fuera de alcance hoy
Cuentas de usuario, pagos y cobro de comisiones, backend con base de datos, publicidad, verificación automática de guías.

## 4. Score de cielo (normativo)

Para cada hora *h* y punto *p*:

```
oscuridad = alt_sol ≤ −18° ? 1 : (alt_sol ≤ −12° ? 0,5 : 0)
nubes     = 1 − (0,5·baja + 0,3·media + 0,2·alta) / 100          // % de Open‑Meteo
luna      = 1 − iluminación · max(0, sin(alt_luna))              // iluminación ∈ [0,1]
humedad   = HR > 85 % ? 0,5 : 1
viento    = ráfagas > 50 km/h ? 0,6 : 1
score     = round(100 · oscuridad · nubes · luna · humedad · viento)
```

Etiquetas: ≥ 85 "Excelente", 70–84 "Muy bueno", 40–69 "Aceptable", 1–39 "Malo", 0 "Día".
Colores: `score-bueno` ≥ 70, `score-medio` 40–69, `score-malo` < 40 (ver [`../brand/brand-guide.md`](../brand/brand-guide.md)).

**Mejor ventana:** la secuencia continua de horas con score ≥ 40 que maximiza el promedio × la duración (desempate: la más temprana).

### Casos de prueba (fixture `poc/samples/openmeteo_susques.json`, generado el 22/11/2026)
| Caso | Entrada | Esperado |
|---|---|---|
| T1 | 22/11 a las 20:00 (sol −1,8°) | oscuridad = 0 → score 0 |
| T2 | 22/11 a las 22:00: sol −25,6°, nubes 0/0/0, luna a 40,7° y 96 % | factor luna ≈ 0,37 → score ≈ 37 (Malo, por la luna) |
| T3 | Hora con nubes altas 53 % y luna bajo el horizonte | nubes = 0,894; score ≈ 89 si el resto es 1 |
| T4 | HR 90 % | factor humedad 0,5 |
| T5 | Ráfagas 60 km/h | factor viento 0,6 |
| T6 | Semana sin horas ≥ 40 | mensaje "Semana difícil…" |

## 5. Requisitos no funcionales
- **Offline‑first:** las efemérides y las órbitas se calculan en el cliente; el último pronóstico queda cacheado y se muestra con su antigüedad ("actualizado hace 3 h"). La demo funciona sin red usando los fixtures de `poc/samples/`.
- **Respeto de las APIs:** Open‑Meteo con una sola request multi‑coordenada por hora; CelesTrak como máximo una descarga cada 2 h por objeto, cortando ante cualquier respuesta distinta de 200; Jama cada 30 min.
- **Privacidad:** no se guardan datos personales. La geolocalización es opcional y con consentimiento explícito (Ley 25.326).
- **Accesibilidad:** contraste AA como mínimo; el score nunca se comunica solo por color.
- **Modo rojo** de visión nocturna activable con un toque y persistente.
- **Mobile‑first:** usable a una mano y legible con guantes (targets ≥ 44 px).
- **Atribución visible:** "Datos meteorológicos: Open‑Meteo.com (CC BY 4.0)" · "Órbitas: CelesTrak".

- **Datos de contacto (lado oferta):** los teléfonos de guías son datos personales; publicar solo con consentimiento. Al pasar a producción: términos, consentimiento e inscripción de la base ante la AAIP (Ley 25.326).
- **Uso comercial de datos:** al monetizar, Open‑Meteo exige un plan pago (el gratuito es no comercial) y el World Atlas de contaminación lumínica es CC BY‑NC (requiere licencia o reemplazo).

## 6. Métricas de la demo
- Abrir la app → ver la mejor ventana de Susques en ≤ 2 interacciones.
- Toda la demo navegable en modo avión.
- Cambio a junio con el simulador → la Vía Láctea en el cénit.
- Desde la mejor ventana de Susques → "Reservar" abre WhatsApp con el mensaje prellenado en 1 toque.
- En modo guía se ve la demanda agregada de la noche y se publica una salida en < 30 s.
