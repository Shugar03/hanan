# ADR‑0003: Elementos orbitales en OMM JSON (no TLE)

- Estado: aceptada · 2026-11-22

## Contexto
CelesTrak informa que el catálogo de 5 dígitos se agotó el 11/07/2026: los objetos nuevos tienen números ≥ 100000 y **no tienen TLE**. Además pide descargar una vez por actualización (cada 2 h), preferir los formatos livianos y dejar de consultar ante cualquier respuesta distinta de 200. `satellite.js` 7.x soporta OMM JSON con `json2satrec`, y se probó con la ISS (25544), SAOCOM 1A (43641), SAOCOM 1B (46265) y ARSAT 2 (40941).

## Decisión
Obtener los elementos con `https://celestrak.org/NORAD/elements/gp.php?CATNR=<id>&FORMAT=JSON` (cacheado 2 h en el Worker), propagar con `satellite.js` (`json2satrec`) y nunca parsear TLE.

## Consecuencias
- (+) A prueba de futuro para satélites nuevos (por ejemplo, futuros satélites argentinos).
- (+) Sin parsers frágiles de columnas fijas.
- (−) JSON es ~3× más pesado que CSV; con 4–5 objetos la diferencia es irrelevante. Si se agregan grupos grandes, migrar a CSV.
- (−) Hay que manejar 403 sin reintentos para no terminar bloqueado.
