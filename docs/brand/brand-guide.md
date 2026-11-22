# Hanan · cielos de la Puna — guía de marca

## 1. Nombre

**Hanan** viene del quechua *hanan*, "arriba". En la cosmovisión andina, *Hanan Pacha* es el mundo de arriba: el cielo, el Sol (Inti), la Luna (Mama Killa) y las estrellas.

- Marca: **Hanan**. Bajada oficial: **"cielos de la Puna"**. Lockup completo: **Hanan · cielos de la Puna**.
- Nunca usar "Hanan Pacha" como marca: es un concepto cultural vivo y además ya lo usa un centro astroturístico en Coquimbo (Chile).
- Se escribe siempre en minúscula en el wordmark (`hanan`) y con mayúscula inicial en el texto corrido (Hanan).
- Pronunciación: *ja-NÁN*.

## 2. Concepto

**"El cielo como territorio."** La Puna es el horizonte desde donde se mira, y el cielo es un territorio que se puede leer, pronosticar y cuidar.

Hanan combina dos registros:
- **Precisión de telemetría:** datos, órbitas, horas exactas, incertidumbre explícita.
- **Calidez andina:** el paisaje del salar, los cerros ocres, el frío de la noche, la gente que vive y guía ahí.

Sin folclorizar: nada de guardas decorativas, ponchos ni símbolos sagrados como adorno.

**Promesa:** *Hanan junta el mejor cielo con el guía indicado.* La marca le habla a dos públicos con la misma voz: al **aficionado/turista** ("¿vamos esta noche?") y al **guía** ("esta noche se llena"). El cielo es lo que los une.

## 3. Isotipo

Construcción (grilla de 24 × 24 unidades, margen de seguridad de 2 u):
1. **Horizonte:** una línea horizontal plana en el tercio inferior (y = 17), de lado a lado del área útil. Es el salar y el altiplano.
2. **Órbita:** un arco elíptico que nace bajo el horizonte y lo cruza, inclinado unos 20°. Es la telemetría: satélites y trayectorias.
3. **Cruz del Sur:** cuatro puntos en las posiciones relativas de α, β, γ y δ Crucis (con γ arriba y α abajo), sobre una grilla escalonada de 3 escalones que evoca la chakana sin copiar su forma.
   - α y γ con un radio de 1,4 u; β de 1,2 u; δ de 1,0 u.
   - Un punto de oro estelar (ε Crucis, radio de 0,6 u) es opcional en tamaños ≥ 48 px.

Reglas:
- Tamaño mínimo: 24 px (sin ε), 16 px solo el horizonte + la Cruz (sin la órbita).
- Trazo del horizonte y de la órbita: 1,5 u, extremos redondeados.
- No rotar, no sombrear, no sumar gradientes ni brillos.

Versiones:
| Versión | Uso | Colores |
|---|---|---|
| Principal | Fondo noche | Horizonte y órbita en `sal`, estrellas en `oro-estelar` |
| Monocromo claro | Fondos oscuros variados | Todo en `sal` |
| Monocromo oscuro | Papel o fondo `sal` | Todo en `noche` |
| Modo rojo | App en modo visión nocturna | Todo en `rojo-texto` sobre negro |

Archivos: `design/logo/hanan-mark.svg`, `hanan-lockup.svg`, `hanan-mark-red.svg`.

## 4. Wordmark

- `hanan` en **Bricolage Grotesque SemiBold (600)**, minúscula, con tracking de +2 %.
- En el lockup, la bajada "cielos de la Puna" va en **IBM Plex Mono 400**, en mayúsculas y con tracking de +12 %, en color `ceniza`, alineada a la izquierda bajo el wordmark.
- El isotipo va a la izquierda del wordmark, con una separación igual a la altura de la x.

## 5. Color

Los tokens están en `design/tokens.json` (fuente única) y `design/tokens.css`.

| Token | Hex | Rol | Contraste sobre `noche` |
|---|---|---|---|
| `noche` | #0B0F1E | Fondo | — |
| `noche-2` | #141A30 | Superficies | — |
| `indigo` | #2A3566 | Bordes y divisores | — |
| `sal` | #EEEAE0 | Texto principal | 15,87 : 1 (AAA) |
| `ceniza` | #8C93A8 | Texto secundario | 6,22 : 1 (AA) |
| `oro-estelar` | #E8C468 | Highlights y CTA | 11,37 : 1 |
| `ocre` | #C96A3A | Acento cálido | 5,09 : 1 (AA) |
| `score-bueno` | #6FCF97 | Score ≥ 70 | 10,03 : 1 |
| `score-medio` | #E8C468 | Score 40–69 | 11,37 : 1 |
| `score-malo` | #C96A3A | Score < 40 | 5,09 : 1 |

Proporción aproximada en pantalla: 70 % noche, 20 % sal/ceniza, 10 % acentos. El oro estelar se reserva para lo importante: la mejor ventana, la estrella del logo y el botón principal.

### Modo rojo (visión nocturna)
La luz azul y blanca arruina la adaptación del ojo a la oscuridad (tarda 20–30 min en recuperarse). En modo rojo la interfaz pasa a rojos sobre negro puro:

| Token | Hex | Uso | Contraste sobre negro |
|---|---|---|---|
| `rojo-texto` | #FF4D4D | Texto y datos | 6,42 : 1 |
| `rojo-texto-2` | #C43A3A | Texto secundario, solo ≥ 18 px | 4,01 : 1 |
| `rojo-tenue` | #8A1C1C | Íconos inactivos y decoración (nunca texto) | 2,26 : 1 |
| `rojo-borde` | #3A0A0A | Bordes | — |
| `rojo-superficie` | #1A0505 | Cards | — |

En modo rojo el score no se distingue por color: siempre va número + etiqueta ("78 · Muy bueno").

## 6. Tipografía

Todas con licencia OFL (Google Fonts):
- **Display / wordmark:** Bricolage Grotesque 600–700. Títulos y números grandes del score.
- **Texto:** IBM Plex Sans 400/500/600. Interfaz y párrafos.
- **Datos / telemetría:** IBM Plex Mono 400/500. Horas, coordenadas, porcentajes, IDs de satélites, etiquetas en mayúsculas.

Escala: 12 · 14 · 16 · 20 · 28 · 40 · 64 px. Interlineado de 1,5 en texto y 1,1 en display.

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

- No usar chakana, wiphala, aguayo ni símbolos sagrados como decoración. El isotipo *evoca* una grilla escalonada; no reproduce símbolos.
- El contenido de cosmovisión (por ejemplo, Willka Chakata o las constelaciones oscuras) solo se publica con fuente citada o co-creado con referentes y comunidades, y con crédito.
- Nombrar los lugares con su toponimia correcta (Susques, Olaroz Chico, Coranzulí) y reconocer a las comunidades que gestionan los sitios (por ejemplo, la Comunidad Aborigen Pórtico de los Andes en el COAS Susques).

## 9. Aplicaciones

- **App (PWA):** fondo noche, mapa con estilo oscuro de bajo brillo, puntos de observación como círculos con el color del score y un anillo en oro estelar para la mejor ventana.
- **Pitch deck:** fondo noche, un dato grande por slide en Bricolage, fuentes en Plex Mono al pie.
- **Redes y QR en el COAS:** lockup sobre una foto nocturna del salar con un overlay al 60 % de noche.

Board de referencia: `design/brand-board.png`.
