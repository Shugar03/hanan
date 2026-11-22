# ADR‑0001: PWA offline‑first con cálculos en el cliente

- Estado: aceptada · 2026-11-22

## Contexto
Los usuarios de Hanan miran el cielo en la Puna, donde la conectividad es mínima (Santa Catalina: 79,5 % de hogares sin internet ni celular con internet; Rinconada: 70,3 %; Censo 2022). La hackathon además se desarrolla en un tren con señal intermitente. Las efemérides y la propagación orbital se pueden calcular localmente con librerías MIT (`astronomy-engine`, `satellite.js`).

## Decisión
Construir una PWA (React + Vite + TS) que calcula en el dispositivo todo lo astronómico y orbital, cachea el último pronóstico y las últimas órbitas (IndexedDB + service worker) y muestra siempre la antigüedad del dato. La demo se apoya en fixtures reales (`poc/samples/`).

## Consecuencias
- (+) Funciona en modo avión, que es la condición real de uso.
- (+) El simulador de fecha sale "gratis": solo hay que cambiar el `Date` de entrada.
- (−) El pronóstico se degrada con la antigüedad; hay que comunicarlo en la UI.
- (−) Sin app nativa: no hay notificaciones push confiables en iOS (queda para el roadmap).
