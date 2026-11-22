# Hanan — definición de producto (CPO)

Versión 1.0 · 2026-11-22. Esta definición manda sobre la [`spec.md`](spec.md) (que queda como especificación del motor de cielo y del MVP base). Negocio: [`business-model.md`](business-model.md).

## 1. Tesis

Hoy, para salir a mirar el cielo en la Puna hacen falta 5 apps y un contacto de WhatsApp:
- **Stellarium / SkySafari** para saber qué hay en el cielo.
- **Ventusky / Windy** para ver nubes y viento.
- **Clear Outside / Astrospheric** para el pronóstico astronómico.
- **Google Maps** para llegar.
- **Instagram / WhatsApp** para encontrar un guía.

Ninguna conoce la Puna, ninguna funciona bien sin señal y ninguna te vende la experiencia.

**Hanan es la app de la noche de la Puna:** cruza efemérides (astronomy-engine), atmósfera (Open-Meteo), órbitas (CelesTrak) y estado de rutas en una sola decisión, *"¿adónde, cuándo y con quién?"*. Además tiene un **marketplace de salidas tipo Uber/Luma**, donde cada guía habilitado publica las suyas con su precio.

**Posicionamiento:** *"El cielo de la Puna, en tu bolsillo: planificalo, miralo y vivilo."*

## 2. Usuarios

| Persona | Quién es | Job principal | Qué le da Hanan | Cómo nos da plata |
|---|---|---|---|---|
| **Turista de experiencia** | Visita Jujuy 2–4 noches, sin conocimientos ni equipo | "Quiero ver las estrellas en la Puna una vez en la vida, sin perder la noche." | La mejor noche de su estadía + salidas de guías verificados, reservables en 3 toques, con garantía de cielo | Comisión por reserva |
| **Aficionado autónomo** | Astrónomo amateur o astrofotógrafo, con auto y quizás telescopio | "Quiero planificar mi propia salida al mejor punto y saber qué fotografiar." | Planificador + mapa de capas + cielo en vivo + seguridad en ruta + offline | Hanan Pro (suscripción) |
| **Guía / operador habilitado** | Guía inscripto en el Registro Único (Ley 6308) u operador con legajo | "Quiero llenar mis salidas y no perder clientes por el clima." | Panel de creador: publica salidas con precio, ve demanda y clima, reprograma, cobra | Comisión + Pro guía |

**Usuario institucional:** Turismo provincial y el COAS. Tablero de demanda del producto Starlight (licencia B2G).

## 3. Arquitectura del producto: 4 pestañas + modo guía

| Pestaña | Reemplaza a | Qué es | Momento |
|---|---|---|---|
| **Explorar** | Ventusky + Clear Outside | Mapa de la Puna con **capas** (score de cielo, nubes bajas/medias/altas, viento, temperatura) animables por hora, los 6 puntos de observación con su score de la noche y la mejor noche de la semana | Antes (planificar) |
| **Cielo** | Stellarium | **Cielo en vivo** desde el punto elegido: estrellas, constelaciones, planetas, Luna, Vía Láctea y satélites. Se puede arrastrar o, apuntando el teléfono, funciona en AR por orientación. Tiene línea de tiempo para adelantar la noche y modo rojo | Durante (en el salar) |
| **Salidas** | Luma / Airbnb Experiences | **Marketplace:** salidas publicadas por guías, ordenadas por cielo de la noche, precio, cupo e idioma. Ficha tipo evento y reserva con seña | Antes (comprar) |
| **Mi noche** | Notas + Google Maps + checklist | **Planificador del aficionado:** recomendación personalizada (punto, noche y horario según tu objetivo y equipo), qué ver y fotografiar, checklist de abrigo y equipo, ruta y estado del Paso, alertas y modo offline del plan | Antes y durante |
| **Modo guía** (rol) | Planilla + WhatsApp | Crear y editar salidas (precio, cupo, punto de encuentro, qué incluye, política de clima), ver demanda y reservas, alertas de noche excelente, reprogramar con un toque | Operación |

## 4. Marketplace (modelo Uber/Luma)

- **Oferta abierta pero verificada:** cualquier guía puede crear su perfil, pero solo los verificados contra el Registro Único de Guías (Ley 6308) u operadores con legajo (Ley 18.829) llevan el badge y aparecen primero.
- **Cada guía crea sus salidas:**
  - Punto de observación, fecha y hora, duración, cupo mínimo y máximo, **precio por persona fijado por el guía**, idiomas.
  - Qué incluye (traslado, telescopio, bebida caliente), punto de encuentro, nivel físico y altura máxima.
  - **Política de clima.**
- **Ficha tipo Luma:** portada, guía con calificación, el **cielo de esa noche** (score, luna, qué se ve), cupos restantes, ubicación, botón *Reservar*.
- **Reserva:** cantidad de personas → resumen → seña (MVP: simulada; v1: Mercado Pago) → confirmación con `.ics` y WhatsApp del guía.
- **Garantía de cielo** (diferencial): si a T−6 h el score de la noche cae por debajo de 40, la salida pasa a "reprogramación sugerida" y el turista elige otra fecha o el reintegro de la seña.
- **Ranking:** cielo de la noche × verificación × calificación × cercanía al alojamiento. En noches excelentes hay más visibilidad ("esta noche se llena").
- **Lista de espera** cuando el cupo se agota: es una señal de demanda para el guía.
- **Después:** reseña con una foto del cielo, y el guía ve la reseña.

## 5. Motor de recomendaciones (aficionado y turista)

Basado en reglas, explicable y sin IA opaca. Cada recomendación muestra el **porqué**.

| Entrada | Ejemplos |
|---|---|
| Objetivo | Vía Láctea, planetas, Luna, astrofoto de paisaje, ver satélites, "solo estrellas" |
| Equipo | A ojo, binoculares, telescopio, cámara con trípode |
| Logística | Base (Purmamarca, Tilcara, Susques, S. S. de Jujuy), auto propio sí/no, máximo de horas de manejo |
| Tolerancia | Frío (mínima aceptable), altura máxima |

Salida: los **top 3 planes** (punto, noche, ventana), cada uno con:
- su razón ("núcleo de la Vía Láctea a 64°, sin luna, nubes altas 5 %");
- qué ver en orden;
- checklist;
- alertas (Paso de Jama, viento, −6 °C);
- una salida de guía alternativa si no tenés auto.

## 6. Fuentes cruzadas

| Fuente | Aporta | Estado |
|---|---|---|
| astronomy-engine | Sol, Luna, planetas, crepúsculos, Vía Láctea | ✅ en la app |
| Open-Meteo | Nubes por capa, HR, viento y temperatura por punto. Para las capas, una **grilla** sobre la Puna (hasta 1.000 ubicaciones por request; cada ubicación cuenta para el cupo) | ✅ puntos · 🔜 grilla |
| CelesTrak + satellite.js | ISS, SAOCOM 1A/1B, ARSAT 2 | ✅ |
| Catálogo estelar | Estrellas hasta mag. ~5–6 y líneas de constelaciones (d3-celestial, BSD-3; la licencia de los datos tiene un issue abierto → atribuir y validar antes de comercializar) | 🔜 |
| Pasos internacionales | Estado del Paso de Jama | ✅ (vía Worker) |
| Registro Único de Guías | Verificación de guías | Manual en el MVP |

## 7. Métrica norte

**Noches aprovechadas por semana:** reservas cumplidas + planes de aficionado ejecutados con un score de la noche ≥ 70.

Métricas de soporte:
- Liquidez: porcentaje de noches buenas con al menos una salida publicada por punto.
- Conversión de ficha a reserva.
- Reprogramaciones vs. cancelaciones.
- Retención de aficionados en temporada de Vía Láctea.

## 8. Alcance por versión

| Capacidad | **Demo de hoy** | v1 (piloto, 1–2 meses) | v2 |
|---|---|---|---|
| Explorar: puntos + score + mejor noche | ✅ | ✅ | ✅ |
| Capas tipo Ventusky (nubes, viento, score) | ✅ grilla cacheada | En vivo, animada | Modelos alternativos |
| Cielo en vivo tipo Stellarium | ✅ mapa de cielo arrastrable + tiempo | AR por orientación | Objetos de cielo profundo, cielo andino co-creado |
| Marketplace: crear salida con precio, ficha, reserva | ✅ seña simulada, datos de ejemplo | Mercado Pago, guías reales verificados | Reseñas, ranking, lista de espera |
| Garantía de cielo | ✅ regla visible | Operativa | Seguro / fondo de garantía |
| Mi noche: recomendaciones + checklist | ✅ | Alertas push | Perfil Pro, astrofoto |
| Offline | ✅ PWA | Paquete offline por punto | — |

**Fuera de la demo:** pagos reales, cuentas y login, reseñas reales, AR por giroscopio (riesgo de permisos en iOS).

## 9. Diferenciales defendibles

1. **Local y verificado:** puntos de la Ruta Starlight, Registro de Guías y estado del Paso de Jama; ninguna app global lo tiene.
2. **El cielo como motor de conversión:** vende la salida *en la noche correcta*, con garantía.
3. **Funciona en el salar:** offline y en modo rojo.
4. **Una sola métrica explicable** (score de la noche), consistente en toda la app.

## 10. Supuestos a validar (piloto)

| Supuesto | Cómo lo validamos |
|---|---|
| Los guías publican sus salidas en Hanan en vez de solo vender por WhatsApp | 5 guías publican ≥ 4 salidas/mes |
| El turista paga seña en la app | ≥ 30 % de las reservas con seña |
| La garantía de cielo es aceptable para los guías | Acuerdo firmado con ≥ 3 guías |
| El aficionado paga Pro | ≥ 5 % de conversión en temporada de Vía Láctea |
| El score predice noches buenas | Contraste con reportes de guías durante 30 noches |
