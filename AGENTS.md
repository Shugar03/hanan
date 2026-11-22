# AGENTS.md — Hanan

Producto: `docs/product/product-vision.md` (manda sobre la spec). Glosario del dominio: `CONTEXT.md` (usar sus términos en código, UI y docs). Producto: `docs/product/spec.md`. Arquitectura y contratos: `docs/tech/architecture.md`. Decisiones: `docs/adr/`. Marca y tokens: `docs/brand/brand-guide.md`, `design/tokens.json`.

## Reglas que no están en la configuración
- **Offline-first:** todo lo astronómico y orbital se calcula en el cliente; `src/sky/` es puro (sin I/O, recibe `Date`). La app y los tests corren con los fixtures de `poc/samples/` sin red.
- **Score de cielo:** la fórmula normativa vive en `docs/product/spec.md` §4; si cambia el código, se actualiza la spec en el mismo commit.
- **APIs externas:**
  - Open-Meteo: una request multi-coordenada por hora; mostrar la atribución "Open-Meteo.com (CC BY 4.0)".
  - CelesTrak: OMM JSON (`gp.php?CATNR=…&FORMAT=JSON`), una descarga cada 2 h como máximo. Ante cualquier respuesta distinta de 200, cortar y usar el caché: los reintentos terminan en bloqueo de IP.
  - Paso de Jama: parseo de `estadoPrioridad`/`estadoVialidad` en la página oficial. Si falla, `desconocido` + link oficial.
- **Datos de guías:** en el MVP las salidas son de ejemplo (`demo: true`) y se etiquetan en la UI. Usar teléfonos o nombres reales de guías solo con consentimiento.
- **Estilos:** los componentes usan los roles semánticos de `design/tokens.css` (`--bg`, `--surface`, `--text`, `--accent`…), así el modo rojo funciona cambiando `data-modo="rojo"`. El score nunca se comunica solo por color: número + etiqueta.
- **Cultura:** contenido de cosmovisión solo con fuente citada; "Hanan Pacha" no se usa como marca.
- **Cloudflare:** usar el CLI `cf` (no hay configuración de Wrangler en el repo).

## Verificación
`npm test` + `npm run build` + E2E (`e2e/`, contra `vite preview --port 4173`; la suite stubea Open-Meteo y CelesTrak con `fixtures/`, no le pega a la red). Antes de una demo: probar en modo avión.

## Convenciones de la app
- Una sola métrica por noche: `scoreNight()` en `src/sky/night.ts`. Toda pantalla que muestre el cielo de una noche la usa.
- Navegación por URL (`?tab=…&punto=…`) con `pushState`; el back del navegador no debe salir de la app.
- Módulos opcionales se cargan con `import.meta.glob` (`src/ui/Optional.tsx`) para no romper el build.
- Targets táctiles ≥ 44 px; la barra de pestañas mobile reserva `--tabbar-h`.
