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

Resultados: `e2e/test-results/` (screenshots de fallos, traces en el primer retry) y `e2e/report/`.
