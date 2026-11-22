# Auditoría de UI · Hanan (2026-11-22)

Alcance: las 4 pestañas (Explorar, Cielo, Salidas, Mi noche), ficha de salida, flujo de reserva, Mi noche con planes, Modo guía, simulador de fecha y modo rojo, en 390 × 844 y 1440 × 900. Método: playbook `audit` de impeccable (a11y, performance, theming, responsive, integridad) + leyes de UX (lawsofux.com). Capturas: `/tmp/hanan-ui/antes/` y `/tmp/hanan-ui/despues/`.

Es un **refinamiento**: se conservan noche/naranja/sal, el cardón-constelación y Schibsted Grotesk.

> Nota de proceso: impeccable pide una entrevista con la persona usuaria; este pase lo corrió un subagente sin canal de preguntas, así que las decisiones salen del brief y de `docs/product/product-vision.md`.

## Puntaje (antes → después)

| # | Dimensión | Antes | Después | Hallazgo clave |
|---|---|---|---|---|
| 1 | Accesibilidad | 3 | 3 | AA en los 3 modos; quedan menús nativos `<select>` sin estilo propio |
| 2 | Performance | 3 | 3 | Bundle grande (maplibre + astronomy); lucide se importa ícono por ícono (tree-shaking) |
| 3 | Theming | 2 | 4 | Antes: `color-scheme: dark` fijo, logo en `<img>` con filtro para el rojo, sin tema claro. Ahora: 3 modos por roles |
| 4 | Responsive | 3 | 3 | El simulador ya no empuja el contenido; en mobile el mapa sigue apretado entre las capas y el chip del Paso |
| 5 | Integridad | 2 | 3 | Dos sistemas de botones, score y etiquetas (`.btn` / `.sx-btn`, `.badge` / `.sx-score`), versalitas con tracking, glifos (`✓ ‹ ›`) en lugar de íconos |
| | **Total** | **13/20** | **16/20** | Aceptable → Bueno |

Detector de impeccable (`impeccable detect`) sobre los archivos tocados: 0 hallazgos.

## Hallazgos priorizados

### P0 · Bloquean la tarea

| # | Hallazgo | Pantalla | Ley / heurística | Fix | Estado |
|---|---|---|---|---|---|
| P0-1 | El simulador abierto inserta una barra de ~120 px bajo el header y empuja el mapa y el panel; con una fecha simulada la barra quedaba fija y no se podía cerrar sin volver a "ahora" | Header, todas | Carga cognitiva, Fitts (el contenido se mueve debajo del dedo) | Popover anclado al botón (Esc / tocar afuera / ✕ cierran). Con fecha simulada queda una franja de 44 px con "Volver a ahora", y en mobile un punto naranja en el ícono | Hecho |
| P0-2 | Panel de Explorar: 10 secciones del mismo peso en orden técnico (72 h y desglose antes que las salidas). La decisión "¿voy esta noche y con quién?" estaba a 4 pantallas de scroll en mobile | Explorar | Hick, Ley de Miller, Serial Position | Orden por decisión: score de la noche + ventana → mejor ventana 7 días → **salidas de esa noche + Quiero ir** → título "Detalle de la noche" → 72 h, desglose, qué se ve, frío, satélites. Fórmulas y notas metodológicas en secciones plegables | Hecho |

### P1 · Dificultad importante o falla de consistencia

| # | Hallazgo | Pantalla | Ley / heurística | Fix | Estado |
|---|---|---|---|---|---|
| P1-1 | No había tema claro: a pleno sol (turista de día, guía en la oficina) el fondo casi negro se ve mal | Global | Uso según el contexto (impeccable: "light/dark se elige por la escena") | Tema claro completo por roles, AA calculado (abajo); toggle sol/luna en el header, persistente y por defecto según `prefers-color-scheme` | Hecho |
| P1-2 | Tres formas de mostrar el score: píldora con círculo (Explorar), cuadrado (Salidas), número suelto (noches) | Explorar, Salidas, Mi noche | Similitud (Gestalt), Jakob | Un solo lenguaje: número en círculo con el tono + etiqueta al lado (`ScoreBadge` / `.sx-score` con la misma forma y peso) | Hecho |
| P1-3 | Dos sistemas de botones: `.btn` radio 4 px y `.sx-btn` radio 8 px / 48 px. La marca pide píldora | Toda la app | Similitud, consistencia | Botones en píldora en toda la app; variantes primary / secondary / ghost en `kit.tsx` | Hecho |
| P1-4 | Etiquetas en versalitas con tracking abierto ("EL CIELO DE ESA NOCHE", "PLAN 1", "POR QUÉ", "EJEMPLO"): las prohíben la guía de marca (§6) y el craft-floor (eyebrows) | Ficha, Mi noche, Salidas | Jerarquía tipográfica | Títulos de sección en minúscula de oración, 16 px/600 en `--text`; "Plan 1" pasa a un número en círculo | Hecho |
| P1-5 | Íconos dibujados a mano con trazos de 1,6 y 2 y tamaños de 12, 18, 20 y 22; glifos `✓`, `‹`, `›` como íconos | Tabs, header, capas, ficha | Similitud, Prägnanz | lucide-react 1.73.0 con `ICON` = 20 px / trazo 1,75 en tabs, header, capas (play/pausa, leyenda), cielo (cerrar), salidas (volver, verificado), Quiero ir (check) y carrusel (chevron) | Hecho |
| P1-6 | Los títulos de las cards iban en 14 px `--text-2`, más débiles que el texto: la jerarquía quedaba plana | Explorar, Mi noche | Jerarquía visual, Von Restorff | h2 de sección en 16 px/600 `--text`; las cards se separan por un paso de tono, sin borde (como pide la marca) | Hecho |
| P1-7 | El logo era un `<img>` con colores fijos (sal sobre noche) y un filtro CSS para el rojo, así que en fondo claro no se veía | Header | Contraste | Isotipo inline (`<Mark>`) que toma los roles: estrellas `--text`, trazos `--text-2`, estrella mayor `--accent`. Anda en los 3 modos sin filtros | Hecho |
| P1-8 | Textos largos dentro de las tarjetas (Magallanes, satélites, demanda, frío) | Explorar | Carga cognitiva, Chunking | Copy más corto; frío y viento como `Stat` (valor + etiqueta); notas metodológicas plegadas | Hecho |
| P1-9 | El header mezclaba 3 acciones de distinta naturaleza sin agruparlas | Header | Proximidad, Hick | Grupo "datos" (Fecha, Guía) · separador · grupo "visualización" (Tema, Rojo) | Hecho |

### P2 · Molestias menores

| # | Hallazgo | Pantalla | Ley / heurística | Fix | Estado |
|---|---|---|---|---|---|
| P2-1 | En mobile el mapa queda tapado arriba por el chip del Paso y abajo por la tira de capas | Explorar 390 | Fitts, Common Region | Llevar el Paso de Jama al panel en mobile o achicar la tira de capas | Pendiente |
| P2-2 | Varias acciones primarias naranjas compiten en la misma pantalla (Reservar por WhatsApp en cada salida, Guardar mi plan + Reservar en cada plan) | Explorar, Mi noche | Von Restorff (si todo resalta, nada resalta) | Dejar en naranja solo la primera salida o el plan 1 y pasar el resto a secundario | Pendiente |
| P2-3 | Mi noche: cada plan apila Por qué, Qué ver, Alertas y Checklist (unos 30 renglones por plan) | Mi noche | Miller, Chunking | Plegar "Qué ver, en orden" en los planes 2 y 3 (el E2E exige Por qué y Checklist visibles) | Pendiente |
| P2-4 | Sombra pesada de los pines (`0 2px 10px / .5`) | Mapa | Craft-floor (sombras) | Bajada a `0 1px 3px / .28` | Hecho |
| P2-5 | Superficies del navegador sin tema (selección, caret, scrollbar) | Global | Craft-floor | `::selection`, `caret-color`, `accent-color` y `scrollbar-color` salen de los roles | Hecho |
| P2-6 | Los `<select>` nativos se ven distinto en cada SO | Salidas, Mi noche, Explorar | Jakob (es nativo: se acepta) | Se dejan nativos por accesibilidad | Aceptado |

## Restricción del contrato E2E sobre la divulgación progresiva

La suite E2E exige que, apenas se elige un punto, estén **visibles** sin interacción los 5 factores del desglose, el timeline de 72 h (≥ 48 horas con bounding box), "Mejor ventana", "Vía Láctea", la nota de estacionalidad, la fase de la luna, "Ejemplo", Reservar y Quiero ir. Por eso no se pueden plegar ni poner en pestañas internas las secciones enteras del desglose, las 72 h o "Qué se ve". La divulgación se aplicó así: (1) se reordenó por decisión, (2) un título separa "decidir" de "detalle", (3) se plegaron fórmulas, notas metodológicas y sobrevuelos no visibles, y (4) se acortó el copy. Si se relaja el contrato, el siguiente paso es plegar el "Detalle de la noche" en mobile.

## Decisiones de diseño

- **Cielo sigue oscuro en tema claro** ("ventana al cielo nocturno"). Es una simulación del cielo de noche: un fondo claro sería físicamente falso, bajaría la legibilidad de las estrellas de magnitud débil y la pestaña se usa en el salar, de noche. La pestaña re-declara los roles oscuros en `.tema-noche`. El modo rojo sigue ganando.
- **El modo rojo siempre gana**: el bloque claro usa `:root[data-tema="claro"]:not([data-modo="rojo"])`, y el mapa vuelve a las teselas oscuras en modo rojo, aunque el tema sea claro.
- **Mapa claro**: Esri World Light Gray Base + World Hillshade, sin key (atribución "Esri · © OpenStreetMap"). Las partículas de viento pasan a tinta `noche`; las rampas de nubes y score se mantienen porque oscurecen el cielo despejado y dan contraste en los dos mapas.

## Kit de componentes (`src/ui/kit.tsx`)

`Mark` (isotipo por roles) · `IconButton` (44 × 44, nombre accesible obligatorio) · `Button` (primary / secondary / ghost) · `Section` (card con h2 y acción opcional) · `Disclosure` (details con chevron) · `Stat` (valor + etiqueta) · `Chip` · `Segmented` (radiogroup). `ScoreBadge` sigue en `src/ui/Score.tsx`. Estilos en `src/styles.css`, sección "Kit". El marketplace (`sx-`) quedó alineado por CSS: misma forma de score, botones en píldora, segmentado en píldora y sin versalitas. Migrar sus clases al kit es un pendiente de bajo riesgo.
