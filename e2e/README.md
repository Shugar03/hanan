# Hanan · tests E2E (Playwright)

Suite end-to-end basada en `docs/product/spec.md` (HU-1…HU-11, §5 no funcionales, §6 métricas de la demo).
Usa solo selectores accesibles (`getByRole`, `getByText`, `getByLabel`), sin `data-testid`.

## Cómo correr

```bash
# 1) En la raíz: build + preview de la app
npm run build && npx vite preview --port 4173 --strictPort

# 2) En otra terminal
cd e2e
npm install
npx playwright install chromium
HANAN_URL=http://localhost:4173 npx playwright test          # mobile + desktop
HANAN_URL=http://localhost:4173 npx playwright test --project=mobile
npx playwright show-report report                            # reporte HTML
```

`HANAN_URL` por defecto es `http://localhost:4173`. Contra el deploy: `HANAN_URL=https://<pages>.pages.dev npx playwright test`.

## Proyectos
- `mobile`: 390×844, `isMobile`, `hasTouch`.
- `desktop`: 1440×900.

## Qué cubre
| # | Test | Spec |
|---|---|---|
| 01 | Lockup Hanan, mapa MapLibre, 6 puntos accesibles | HU-1 |
| 02 | Susques: score 0–100 + etiqueta coherente, desglose, timeline, mejor ventana HH:MM–HH:MM | HU-2, HU-3, §6 |
| 03 | Qué se ve: luna %, Vía Láctea, estacionalidad nov–ene | HU-4 |
| 04 | Salidas "ejemplo" + Reservar → `https://wa.me/<n>?text=…Susques…Hanan` (sin salir a internet) | HU-9, §6 |
| 05 | "Quiero ir" suma 1 y persiste tras reload | HU-10 |
| 06 | Modo rojo → `html[data-modo="rojo"]`, persiste, sin colores con b>r, g>r o blanco puro | §5 |
| 07 | Simulador junio 2027 → "Sin pronóstico: solo cálculo astronómico" + Vía Láctea ≥ 70° | HU-8, §6 |
| 08 | Modo guía: demanda agregada, publicar salida, persistencia | HU-11, §6 |
| 09 | Paso de Jama: estado + link a argentina.gob.ar | HU-5 |
| 10 | Offline: SW activo, `setOffline(true)` + reload → puntos y score | §5, §6 |
| 11 | Atribución Open-Meteo y CelesTrak | §5 |
| 12a/b | Nombres accesibles; targets ≥ 44 px en mobile | §5 |
| 13 | Sin errores de consola (excepto red de tiles del mapa) | — |

| 14a/b/c | 4 pestañas con nombre + `aria-current`; deep links; back del navegador | visión §3 |
| 15a–e | Cielo: canvas con contenido, ficha con altura/azimut al tocar, N/E/S/O + arrastre, slider de hora, modo rojo sin azules en píxeles | visión §3, §8 |
| 16a–d | Salidas: feed "ejemplo" + score; orden por precio; filtro por punto; ficha + garantía; reserva 2 personas (seña 30 %), wa.me, `.ics`, Mis reservas tras reload; tope de cupos | visión §4 |
| 17 | Mismo score Susques viernes 27 en Explorar / Salidas / Mi noche | consistencia |
| 18 | Modo guía · crear salida completa: validación y aparece en el feed como "Tuya" | visión §3, §4 |
| 19a/b | Mi noche: Vía Láctea + sin auto + Tilcara → 3 planes con porqué/checklist/salida de guía; guardar, reload y offline | visión §5 |
| 20 | Capas Nubes y Score: leyenda, scrubber y píxeles pintados en el mapa | visión §3 |
| 21a/b | Mobile: tab bar no tapa Reservar; targets ≥ 44 px | spec §5 |
| 22a–e | Tema claro: default por `prefers-color-scheme`, toggle "Tema claro/oscuro" persistente, aria-disabled con modo rojo (y el rojo gana), contraste AA en claro | brand §5, ui-audit P1-1 |
| 23a–f | Observatorio con cámara falsa (`--use-fake-device-for-media-stream`): botón ≥ 44 px, diálogo modal full screen, video readyState ≥ 2, overlay, `obs=1`, back/Esc cierran y apagan tracks, HUD con `DeviceOrientationEvent`, "Sin brújula", alinear + calibración persistente | observatorio |
| 23g | Sin cámara ni permiso → "Sin cámara: modo planetario" con overlay | observatorio |

Los specs de observatorio usan `launchOptions` a nivel de archivo (worker propio): `v3-observatorio.spec.ts` (cámara falsa) y `v3-observatorio-sin-camara.spec.ts`.

## APIs externas
`tests/base.ts` intercepta Open-Meteo y CelesTrak y responde con `../fixtures/` (cada test abre un contexto sin caché; sin esto la suite
recibía 429 de Open-Meteo y arriesgaba el bloqueo de IP de CelesTrak). Para pegarle a la red real: `HANAN_E2E_RED_REAL=1`.
Los tiles del mapa sí van a la red.

Resultados: `e2e/test-results/` (screenshots de fallos, traces en el primer retry) y `e2e/report/`.
