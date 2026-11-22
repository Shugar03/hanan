# Hanan — roadmap y etapas

Horizonte: **hoy**, 22/11/2026 (Cursor Hackathon Jujuy, Tren Solar, ~09:00–19:30). Dev solo. Specs: [`spec.md`](spec.md). Arquitectura: [`../tech/architecture.md`](../tech/architecture.md).

## Etapas de hoy

| Etapa | Horario | Salida | Gate para avanzar |
|---|---|---|---|
| **E0** Docs + identidad | 09:30–11:00 | Docs, tokens, logo, board, esqueleto del deck | Brand y spec aprobados |
| **E1** Scaffold | 11:00–11:30 | Vite + React + TS + MapLibre, `design/tokens.css` aplicado, `poc/samples` copiados como fixtures | `npm run dev` y `npm run build` OK |
| **E2** Motor de cielo | 11:30–13:30 | `src/sky/` (efemérides, score, mejor ventana) con tests de vitest contra fixtures (casos T1–T6 de la spec) | Tests en verde |
| **E3** UI P0 | 13:30–15:30 | Mapa + panel de punto + timeline 72 h + "qué se ve" + modo rojo + salidas de ejemplo con "Reservar" (WhatsApp) + "Quiero ir" | Demo navegable en modo avión |
| **E4** P1 | 15:30–17:00 | Modo guía (alertas, demanda agregada, publicar salida, reprogramar), Paso de Jama, alerta de frío/viento, satélites en vivo, simulador de fecha | — |
| **E5** Edge + PWA | 17:00–18:00 | Cloudflare Worker de caché (Open‑Meteo, CelesTrak, Jama) + service worker | Funciona sin red con el último caché |
| **E6** Pitch + ensayo | 18:00–19:00 | Deck con capturas reales, video o screenshots de respaldo | Demo ensayada 2 veces |

### Recortes si hay atraso (en este orden)
1. Soltar el Worker de E5: llamar las APIs directo desde el cliente y caer a los fixtures.
2. Soltar los satélites en vivo de E4: dejar solo el simulador de fecha (que es lo que muestra la Vía Láctea en junio).
   Modo guía: si no entra completo, dejar solo la vista de demanda agregada + "Publicar salida".
3. Soltar la alerta de frío/viento: queda como dato crudo en el desglose.
4. Nunca recortar: score, mejor ventana, "qué se ve", salidas con "Reservar", modo rojo y la demo offline.

### Checkpoints de conectividad (tren)
- Antes de salir de cada zona con señal: `git commit` local y actualizar fixtures si cambió el pronóstico.
- La demo final usa los fixtures del día salvo que haya señal estable.

## Después de la hackathon (para el pitch)

| Etapa | Objetivo | Socios |
|---|---|---|
| Piloto (1–2 meses) | Sumar 3–5 guías registrados (gratis), calibrar el score, medir señales de demanda y disposición a pagar; QR en el COAS y en Olaroz Chico | COAS Susques (comisión municipal + IATE‑CONICET), 2–3 operadores (Capricornio Sideral, Yanavico, Turismo Nativo) |
| Capa cultural | Cielo andino co-creado (Willka Chakata, constelaciones oscuras) con crédito a las comunidades | Comunidades, docentes (Polimodal 8 de Humahuaca), UNJu |
| Escala | i18n EN/PT, contaminación lumínica, notificaciones de "noche excelente" | Secretaría de Turismo |
| Marketplace | Reservas y pagos en la app (comisión), Hanan Pro para guías y aficionados, licencia B2G ([modelo](business-model.md)) | Agencia habilitada (Ley 18.829) o asesoría legal; plan pago de Open‑Meteo |
