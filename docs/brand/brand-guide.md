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

Estilo **minimalista premium**: una sola familia tipográfica, color plano, superficies separadas por un paso de tono (no por líneas ni sombras), nada de gradientes, brillos, vidrio ni emojis. Los íconos de interfaz salen de un solo set (lucide-react, 20 px, trazo 1,75); nada de ilustraciones de stock. Sin folclorizar: nada de guardas decorativas, ponchos ni símbolos sagrados como adorno.

**Promesa:** *Hanan junta el mejor cielo con el guía indicado.* La marca le habla a dos públicos con la misma voz: al **aficionado/turista** ("¿vamos esta noche?") y al **guía** ("esta noche se llena"). El cielo es lo que los une.

## 3. Isotipo: el cardón-constelación

Un cardón (*Leucostele atacamensis*, ex *Trichocereus*) dibujado como una constelación: las **estrellas marcan los vértices del contorno** del cactus y un trazo fino recorre ese contorno. Como el tronco y los brazos tienen ancho real y cimas redondeadas, se lee el volumen del cactus: a primera vista es un cardón; de cerca, una constelación.

**Por qué esta versión.** Se exploraron tres variantes: silueta-constelación, costillas y silueta rellena más esqueleto (hoja de variantes en el repo de trabajo, no publicada). Se eligió la silueta-constelación porque es la única que se lee inequívocamente como cardón a 48 y a 24 px sin depender de un relleno de bajo contraste. Además sigue siendo solo estrellas y trazos. El esqueleto de una sola línea se leía como "una línea con puntos", tenedor o "4".

**Construcción** (grilla de 48 × 48 u; coordenadas x, y desde arriba a la izquierda):

- **Contorno:** tronco de 8 u de ancho (x 20–28), del pie en y = 44 a la cima en y = 5, con cima semicircular (r 4). Brazos de 6 u de ancho: salen horizontales del tronco (el izquierdo entre y 30–36, el derecho entre y 21–27), giran con un codo exterior redondeado (arco de 90°, r 6) y suben en vertical, paralelos al tronco, con cima semicircular (r 3). Las cimas de los brazos (y = 16 e y = 12) quedan por debajo de la cima del tronco.
- **Trazado SVG del contorno:** `M20 44 V36 H15 A6 6 0 0 1 9 30 V19 A3 3 0 0 1 15 19 V30 H20 V9 A4 4 0 0 1 28 9 V21 H33 V15 A3 3 0 0 1 39 15 V21 A6 6 0 0 1 33 27 H28 V44 Z`. Solo hay tramos horizontales, verticales y arcos, sin diagonales.
- **Trazo:** 1,5 u, extremos redondeados, en `ceniza`. Una máscara lo corta 0,9 u alrededor de cada estrella, como en las cartas celestes.

| Estrella | Posición | Radio |
|---|---|---|
| **Cima del tronco** | 24, 5 | **2,8 · naranja** |
| Cima brazo izquierdo | 12, 16 | 2,0 |
| Cima brazo derecho | 36, 12 | 2,0 |
| Codo exterior izquierdo (mitad del arco) | 10,76, 34,24 | 1,4 |
| Codo exterior derecho (mitad del arco) | 37,24, 25,24 | 1,4 |
| Axila interna izquierda | 15, 30 | 1,1 |
| Axila interna derecha | 33, 21 | 1,1 |
| Flanco del tronco, izquierdo | 20, 17 | 1,2 |
| Flanco del tronco, derecho | 28, 34 | 1,2 |
| Pie | 20, 44 · 28, 44 | 1,4 |
| Estrellas de campo (sueltas) | 42,5, 4 · 5,5, 7 | 0,9 · 0,8, opacidad 70 % |

- **11 estrellas en el contorno + 2 de campo** (13 en total), en cuatro tamaños: la mayor en naranja (2,8), las cimas de los brazos (2,0), codos y pie (1,4) y los puntos de apoyo (1,1–1,2).
- **Horizonte:** línea de 1 u en y = 46,5, de x = 6 a x = 42, al 45 % de opacidad. Es opcional en aplicaciones muy chicas.

**Reglas**
- Tamaño mínimo: **24 px** de alto (isotipo) y **120 px** de ancho (lockup).
- Margen de seguridad: 4 u alrededor (1/12 del lado).
- Solo sobre fondos oscuros (`noche`, `noche-2`, negro) o sobre `naranja` en la versión de ícono de app. Excepción: en el tema claro de la app el isotipo inline toma los roles (ver *Tema claro*).
- No rotar, no deformar, no rellenar la silueta, no sumar sombras, brillos ni gradientes. No cambiar de lugar la estrella naranja.
- Si se incrusta el SVG inline varias veces en una misma página, darle a cada copia un `id` de máscara único (por ejemplo `hanan-ml-1`, `hanan-ml-2`).

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

### Tema claro

Para el uso de día (el turista que planifica en el hostal, el guía en la oficina, la pantalla a pleno sol). Con `data-tema="claro"` en `<html>` se redefinen **los mismos roles** que en el tema oscuro. El fondo es `sal`, la superficie es papel, el texto es `noche`, y el naranja y los scores se oscurecen para pasar AA sobre sal. El toggle está en el header (sol/luna, `aria-label` "Tema claro"/"Tema oscuro"), se guarda en `localStorage` (`hanan:tema`) y por defecto sigue `prefers-color-scheme`.

**El modo rojo siempre gana**: el selector es `:root[data-tema="claro"]:not([data-modo="rojo"])`, así que con `data-modo="rojo"` se ve rojo sobre negro aunque el tema sea claro.

Contraste WCAG 2.x calculado sobre `sal` #F4EFE6 (fondo) y `papel` #FBF8F3 (superficie).

| Rol | Token | Hex | Sobre `sal` | Sobre `papel` |
|---|---|---|---|---|
| `--bg` | `sal` | #F4EFE6 | — | — |
| `--surface` | `papel` | #FBF8F3 | — | — |
| `--border` | `arena` | #D6CDBE | 1,37 : 1 (no es texto, igual que `noche-3` en oscuro) | 1,49 : 1 |
| `--text` | `noche` | #0A0B0F | 17,17 : 1 (AAA) | 18,57 : 1 (AAA) |
| `--text-2` | `ceniza-oscura` | #5C564D | 6,34 : 1 (AA) | 6,85 : 1 (AA) |
| `--accent` | `naranja-tierra` | #B04B14 | 4,75 : 1 (AA) | 5,13 : 1 (AA) |
| `--accent-warm` | `cobre-oscuro` | #9A3E12 | 5,97 : 1 (AA) | 6,45 : 1 (AA) |
| `--on-accent` | `papel` | #FBF8F3 | sobre `naranja-tierra`: 5,13 : 1 (AA) | — |
| `--score-bueno` | `yareta-oscura` | #2E6B47 | 5,54 : 1 (AA) · papel encima 5,99 : 1 | 5,99 : 1 |
| `--score-medio` | `ambar-oscuro` | #8A5300 | 5,53 : 1 (AA) · papel encima 5,97 : 1 | 5,97 : 1 |
| `--score-malo` | `colorado-oscuro` | #B23A1F | 5,21 : 1 (AA) · papel encima 5,63 : 1 | 5,63 : 1 |

- **Por qué se ajusta el naranja:** `naranja` #F07A2E da 2,44 : 1 sobre sal y no sirve para texto ni para botones con texto. `naranja-tierra` #B04B14 es el mismo tono (cerro al atardecer) con menos luminancia: pasa AA como texto y como fondo de botón con texto `papel`.
- **Score:** el número va en `papel` sobre el tono, o el tono como color de texto sobre sal. En los dos casos es ≥ 5,2 : 1. Siempre va número + etiqueta.
- **Isotipo en claro:** el componente `Mark` toma los roles: estrellas `--text` (noche), trazos `--text-2` y la estrella mayor `--accent` (naranja-tierra). Es la única aplicación del isotipo sobre fondo claro autorizada en la app; en piezas impresas sigue valiendo la placa clara del QR (§9).
- **Mapa:** Esri World Light Gray Base + World Hillshade (sin key, "Relieve y base: Esri · © OpenStreetMap"). En modo rojo vuelve a las teselas oscuras.
- **Cielo:** la pestaña Cielo **sigue oscura** en tema claro: es una ventana al cielo nocturno, un fondo claro sería físicamente falso y se usa de noche. Re-declara los roles oscuros con `.tema-noche`.
- Proporción en pantalla: ~80 % sal/papel, ~15 % noche/ceniza oscura, ≤ 5 % naranja-tierra. Sin sombras para separar superficies (un paso de tono). Solo los popovers llevan una sombra suave con offset.

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
