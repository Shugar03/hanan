# Hanan · cielos de la Puna — guía de marca

## 1. Nombre

**Hanan** viene del quechua *hanan*, "arriba". En la cosmovisión andina, *Hanan Pacha* es el mundo de arriba: el cielo, el Sol (Inti), la Luna (Mama Killa) y las estrellas.

- Marca: **Hanan**. Bajada oficial: **"cielos de la Puna"**. Lockup completo: **Hanan · cielos de la Puna**.
- Nunca usar "Hanan Pacha" como marca: es un concepto cultural vivo y además ya lo usa un centro astroturístico en Coquimbo (Chile).
- Se escribe siempre en minúscula en el wordmark (`hanan`) y con mayúscula inicial en el texto corrido (Hanan).
- Pronunciación: *ja-NÁN*.

## 2. Concepto

**"Un cardón que se lee en el cielo."** En la Puna el horizonte es corto y la noche ocupa todo: el cardón es la única vertical del paisaje y el cielo es donde se mira. Hanan une las dos cosas: la planta que marca el lugar y la constelación que marca la hora.

Hanan combina dos registros:
- **Precisión:** datos, horas exactas, incertidumbre explícita.
- **Calidez de la Puna:** la noche casi negra de altura, los cerros naranjas al atardecer, el blanco del salar y de las estrellas.

Estilo **minimalista premium**: una sola familia tipográfica, color plano, superficies separadas por un paso de tono (no por líneas ni sombras), nada de gradientes, brillos, vidrio, emojis ni íconos de stock. Sin folclorizar: nada de guardas decorativas, ponchos ni símbolos sagrados como adorno.

**Promesa:** *Hanan junta el mejor cielo con el guía indicado.* La marca le habla a dos públicos con la misma voz: al **aficionado/turista** ("¿vamos esta noche?") y al **guía** ("esta noche se llena"). El cielo es lo que los une.

## 3. Isotipo: el cardón-constelación

Un cardón (*Leucostele atacamensis*, ex *Trichocereus*) dibujado como un diagrama de constelación: solo estrellas (puntos) y trazos finos, sin contorno ni relleno de la planta. A 24 px se lee como cardón; de cerca, como constelación.

**Construcción** (grilla de 48 × 48 u; coordenadas x, y desde arriba a la izquierda):

| Estrella | Posición | Radio | Rol |
|---|---|---|---|
| Base | 24, 43,5 | 1,7 | Pie del tronco |
| Nace brazo izquierdo | 24, 32 | 2,0 | Nodo del tronco |
| Nace brazo derecho | 24, 22 | 2,0 | Nodo del tronco |
| Intermedio del tronco | 24, 13 | 1,7 | Nodo del tronco |
| **Punta del tronco** | 24, 4 | **3,1** | **Estrella destacada, en naranja** |
| Codo izquierdo | 13, 32 | 1,7 | Codo del brazo |
| Punta izquierda | 13, 18 | 2,4 | Brazo |
| Codo derecho | 35, 22 | 1,7 | Codo del brazo |
| Punta derecha | 35, 11 | 2,4 | Brazo |
| Estrellas de campo | 42,5, 4 · 5,5, 7 | 0,9 · 0,8 | Sueltas, opacidad 70 % |

- **9 estrellas unidas por 8 trazos** + 2 estrellas sueltas de campo (11 en total).
- **Solo trazos horizontales y verticales, cero diagonales:** es lo que da la lectura de candelabro. Los brazos salen del tronco en horizontal a alturas distintas (el izquierdo más abajo, en y = 32; el derecho en y = 22), hacen un codo marcado y suben en vertical, paralelos al tronco. Las puntas de los brazos (y = 18 e y = 11) quedan por debajo de la punta del tronco (y = 4), como en un cardón (*Leucostele atacamensis*) real.
- **Trazos:** 1,4 u, extremos redondeados, con un aire de 0,8 u entre el trazo y cada estrella (como en las cartas celestes).
- **Horizonte:** línea de 1 u en y = 46,5, de x = 8 a x = 40, al 45 % de opacidad. Es el altiplano; es opcional en aplicaciones muy chicas.
- Tres tamaños de estrella marcan la jerarquía: la mayor (3,1 u, naranja), las puntas de los brazos (2,4 u) y los nodos (1,7–2,0 u).

**Reglas**
- Tamaño mínimo: **24 px** de alto (isotipo) y **120 px** de ancho (lockup).
- Margen de seguridad: 4 u alrededor (1/12 del lado).
- Solo sobre fondos oscuros (`noche`, `noche-2`, negro) o sobre `naranja` en la versión de ícono de app.
- No rotar, no deformar, no sumar contornos, sombras, brillos ni gradientes. No cambiar de lugar la estrella naranja.

**Versiones**

| Versión | Archivo | Colores |
|---|---|---|
| Principal | `design/logo/hanan-mark.svg` | Estrellas `sal`, trazos y horizonte `ceniza`, estrella mayor `naranja` |
| Modo rojo | `design/logo/hanan-mark-red.svg` | Estrellas #FF4D4D, trazos #E04545 (sin blancos ni azules) |
| Monocromo | `design/logo/hanan-mark-mono.svg` | Todo `sal` |
| Ícono de app sobre naranja | (en el board) | Trazos y estrellas `noche`, estrella mayor `sal` |
| Lockup | `design/logo/hanan-lockup.svg` | Isotipo + wordmark `sal` + bajada `ceniza` |

## 4. Wordmark

- `hanan` en **Schibsted Grotesk SemiBold (600)**, minúscula, tracking −2 %. En el SVG está convertido a contornos (no depende de que la fuente esté cargada).
- Bajada **"cielos de la Puna"** en Schibsted Grotesk Regular (400), en minúscula con P mayúscula (sin versalitas ni tracking abierto), color `ceniza`, alineada a la izquierda bajo el wordmark.
- En el lockup el isotipo va a la izquierda, a 1,25× de escala (60 u de alto), y ocupa la altura del wordmark más la bajada. Separación entre isotipo y texto: el ancho de la "n".

## 5. Color

Los tokens están en `design/tokens.json` (fuente única) y `design/tokens.css` (mismos valores). Los componentes usan **solo los roles** (`--bg`, `--surface`, `--border`, `--text`, `--text-2`, `--accent`, `--accent-warm`, `--on-accent`, `--score-*`), así el modo rojo funciona solo.

Contraste WCAG 2.x calculado sobre `noche` #0A0B0F (y sobre `noche-2` #16181E cuando aplica). AA exige 4,5 : 1 para texto normal y 3 : 1 para texto grande.

| Token | Hex | Rol | Sobre `noche` | Sobre `noche-2` |
|---|---|---|---|---|
| `noche` | #0A0B0F | `--bg`: noche de altura, casi negro | — | — |
| `noche-2` | #16181E | `--surface`: un paso de tono | — | — |
| `noche-3` | #2A2D36 | `--border`: solo bordes funcionales (inputs) | 1,35 : 1 (no es texto) | — |
| `sal` | #F4EFE6 | `--text`: salar y estrellas | 17,17 : 1 (AAA) | 15,49 : 1 (AAA) |
| `ceniza` | #A39D93 | `--text-2`: texto secundario | 7,31 : 1 (AAA) | 6,59 : 1 (AA) |
| `naranja` | #F07A2E | `--accent`: CTA, estrella del logo, mejor ventana | 7,05 : 1 (AAA) | 6,36 : 1 (AA) |
| `cobre` | #D2602A | `--accent-warm`: cerros al atardecer | 5,10 : 1 (AA) | 4,60 : 1 (AA) |
| `yareta` | #A9D6B5 | `--score-bueno` (≥ 70) | 12,15 : 1 | — |
| `ambar` | #F5B25E | `--score-medio` (40–69) | 10,69 : 1 | — |
| `colorado` | #EE6A4A | `--score-malo` (< 40) | 6,37 : 1 | — |

- **Texto sobre botón naranja:** `--on-accent` = `noche`, 7,05 : 1.
- Proporción en pantalla: ~80 % noche, ~15 % sal/ceniza, ≤ 5 % naranja. El naranja se reserva para la acción principal, la estrella del logo y la mejor ventana de la noche.
- Los tres colores de score son funcionales (el verde liquen de la yareta, ámbar y colorado); no se usan como decoración. El score siempre va con número + etiqueta.
- Alias heredados de la v1 (`--oro-estelar`, `--ocre`, `--indigo`) siguen definidos y apuntan a `naranja`, `cobre` y `noche-3`. No usarlos en código nuevo.

### Modo rojo (visión nocturna)
La luz azul y blanca arruina la adaptación del ojo a la oscuridad (tarda 20–30 min en recuperarse). Con `data-modo="rojo"` en un contenedor, los roles pasan a rojos sobre negro puro. **Los primitivos (`--sal`, `--naranja`…) no cambian**: por eso los componentes deben usar roles.

| Token | Hex | Uso | Sobre negro | Sobre superficie |
|---|---|---|---|---|
| `rojo-texto` | #FF4D4D | `--text`, `--accent`, scores | 6,42 : 1 (AA) | 6,01 : 1 (AA) |
| `rojo-texto-2` | #E04545 | `--text-2`, `--accent-warm` | 5,11 : 1 (AA) | 4,78 : 1 (AA) |
| `rojo-tenue` | #8A1C1C | Íconos inactivos (nunca texto) | 2,26 : 1 | — |
| `rojo-borde` | #3A0A0A | `--border` | — | — |
| `rojo-superficie` | #1A0505 | `--surface` | — | — |
| `rojo-fondo` | #000000 | `--bg`, `--on-accent` | — | — |

En modo rojo el score no se distingue por color: siempre va número + etiqueta ("86 · Muy bueno").

## 6. Tipografía

Una sola familia, **Schibsted Grotesk** (Google Fonts, licencia OFL), cargada vía `@import` en `tokens.css`. Sin monoespaciada: los datos van en la misma familia.

- **Display / wordmark** (`--font-display`): 600–800, tracking −0,04 em, interlineado 0,9–1,05. Títulos y el número grande del score.
- **Texto** (`--font-texto`): 400 y 500, 16 px mínimo para texto corrido, interlineado 1,5.
- **Datos** (`--font-datos`): 500. Usar `font-variant-numeric: tabular-nums` solo cuando las cifras se alinean en columnas (timeline, tablas); en texto corrido, cifras proporcionales.
- Sin versalitas con tracking abierto: etiquetas en minúscula/oración, a tamaño legible.

Escala: 12 · 14 · 16 · 20 · 28 · 40 · 64 · 112 px. Espaciado: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 px. Radios: 2 · 4 · 8 px y `pill` (999 px) para botones.

## 7. Voz y tono

- **Clara, precisa y cercana.** Tuteo argentino ("¿vas esta noche?").
- **Siempre explicitar la incertidumbre:** "Cielo despejado muy probable (nubosidad prevista: 5 %)" y no "Va a estar despejado".
- **Concreta:** horas exactas, nombres de lugar y abrigo necesario ("−4 °C a las 2 h: campera de pluma y gorro").
- **Educativa sin sermonear:** "En noviembre el centro de la Vía Láctea se esconde temprano; volvé entre abril y septiembre para verlo en el cénit."

| Sí | No |
|---|---|
| "Mejor ventana: 21:20 a 23:00 en Susques" | "¡Noche INCREÍBLE!" |
| "La luna sale a las 18:02 y está al 96 %: ideal para verla a ella, no a las galaxias" | "Mala noche" |
| "Paso de Jama abierto · actualizado 08:00" | "Todo ok en la ruta" |
| (a guías) "12 personas quieren ir a Susques el sábado: el cielo da 88" | "¡Muchos leads!" |
| (a guías) "El sábado se nubla después de las 23. ¿Adelantamos a las 21:30?" | "Clima malo, cancelar" |

## 8. Guía cultural

- No usar chakana, wiphala, aguayo ni símbolos sagrados como decoración. El isotipo dibuja una planta del paisaje (el cardón) como constelación; no reproduce ningún símbolo sagrado ni constelación andina.
- El contenido de cosmovisión (por ejemplo, Willka Chakata o las constelaciones oscuras) solo se publica con fuente citada o co-creado con referentes y comunidades, y con crédito.
- Nombrar los lugares con su toponimia correcta (Susques, Olaroz Chico, Coranzulí) y reconocer a las comunidades que gestionan los sitios (por ejemplo, la Comunidad Aborigen Pórtico de los Andes en el COAS Susques).

## 9. Aplicaciones

- **App (PWA):** fondo `noche`, mapa oscuro de bajo brillo, puntos de observación con el color del score y la mejor ventana en `naranja`. Botón principal en píldora `naranja` con texto `noche`. Interruptor de modo rojo siempre a mano.
- **Ícono de app:** isotipo sobre `noche` (principal) o sobre `naranja` con estrellas en `noche`.
- **Pitch deck:** fondo `noche`, un dato grande por slide en Schibsted Grotesk 800, fuentes al pie en `ceniza`.
- **QR en el COAS Susques:** placa clara con el QR en `noche` y el isotipo al centro; abre el pronóstico de esta noche.

Board de referencia: `design/brand-board.png` (fuente: `design/brand-board.html`).
