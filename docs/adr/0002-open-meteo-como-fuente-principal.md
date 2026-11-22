# ADR‑0002: Open‑Meteo como fuente meteorológica principal; 7Timer! fuera del MVP

- Estado: aceptada · 2026-11-22

## Contexto
El score necesita la nubosidad por capas, la humedad, las ráfagas y la temperatura por hora para 6 puntos. Probadas el 22/11/2026:
- **Open‑Meteo:** sin clave, nubosidad baja/media/alta, multi‑coordenada en una sola request, licencia CC BY 4.0. El plan gratuito es solo para uso no comercial: < 10.000 llamadas/día, 5.000/h y 600/min.
- **7Timer! ASTRO:** sin clave, aporta seeing y transparencia, pero tiene paso de 3 h, baja resolución y, para Susques, reportó transparencia 1 ("muy pobre") con seeing excelente: es inconsistente para la Puna de altura.

## Decisión
Usar Open‑Meteo como única fuente meteorológica del score. 7Timer! queda fuera del MVP; se puede evaluar como indicador secundario cuando haya datos de campo para validarlo.

## Consecuencias
- (+) Una sola integración y un uso muy por debajo de los límites (~24 requests/día con caché de 1 h).
- (+) Atribución simple: "Datos meteorológicos: Open‑Meteo.com (CC BY 4.0)".
- (−) No hay seeing ni transparencia en el score; se compensa con humedad y nubes altas.
- (−) Si Hanan se monetiza, hay que pasar a un plan pago de Open‑Meteo.
