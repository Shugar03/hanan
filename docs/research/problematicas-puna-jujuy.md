# Problemáticas de la Puna jujeña — investigación con datos reales

Hackathon JujuyDev · track: Puna, cultura regional, telemetría espacial.
Fecha de relevamiento: 2026-11-22. Cada dato lleva su fuente; las cifras del Censo 2022 se calcularon directamente desde los `.xlsx` oficiales del INDEC (ver §0).

---

## 0. Línea de base territorial (INDEC, Censo 2022)

Departamentos de Puna: Cochinoca, Rinconada, Santa Catalina, Susques, Yavi (y parte de Tumbaya / Humahuaca).

| Depto | Población 2022 | Var. 2010–22 | Densidad hab/km² | Hogares | Agua de red | Agua por cañería dentro de la vivienda | Internet en la vivienda | Sin internet ni celular con internet | Cocina a leña/carbón |
|---|---|---|---|---|---|---|---|---|---|
| **Jujuy (prov.)** | 811.611 | +20,5 % | 15,2 | 245.706 | 95,7 % | 89,0 % | 66,7 % | 13,6 % | 4,4 % |
| Cochinoca | 15.054 | +18,9 % | 2,1 | 4.850 | 84,5 % | 60,1 % | 48,4 % | 30,3 % | 19,6 % |
| **Rinconada** | 1.802 | **−27,6 %** | **0,3** | 703 | **55,0 %** | **39,8 %** | 23,5 % | **70,3 %** | **56,6 %** |
| **Santa Catalina** | 2.646 | −5,5 % | 0,9 | 876 | 71,1 % | 41,9 % | **12,6 %** | **79,5 %** | 43,6 % |
| Susques | 4.098 | +8,1 % | 0,4 | 1.141 | 77,4 % | 67,9 % | 39,6 % | 43,6 % | 20,2 % |
| Yavi | 25.868 | +24,3 % | 8,6 | 7.936 | 91,8 % | 77,1 % | 42,5 % | 22,2 % | 8,5 % |
| Tumbaya | 5.381 | +15,5 % | 1,6 | 1.733 | 73,5 % | 68,3 % | 35,4 % | 31,4 % | 18,7 % |
| Humahuaca | 20.914 | +20,4 % | 5,9 | 6.528 | 88,4 % | 76,5 % | 30,9 % | 28,5 % | 14,2 % |

Fuentes (INDEC, Censo 2022, resultados definitivos): Cuadro 1.10 y 2.10 de estructura ([c1](https://censo.gob.ar/wp-content/uploads/2023/11/c2022_jujuy_est_c1_10.xlsx), [c2](https://censo.gob.ar/wp-content/uploads/2023/11/c2022_jujuy_est_c2_10.xlsx)); hogares por agua ([hogares c2](https://censo.gob.ar/wp-content/uploads/2023/11/c2022_jujuy_hogares_c2_10.xlsx)), combustible ([hogares c4](https://censo.gob.ar/wp-content/uploads/2023/11/c2022_jujuy_hogares_c4_10.xlsx)) e internet ([hogares c7](https://censo.gob.ar/wp-content/uploads/2023/11/c2022_jujuy_hogares_c7_10.xlsx)). Índice: <https://censo.gob.ar/index.php/datos_definitivos_jujuy/>. Porcentajes calculados sobre total de hogares de cada depto.

**Lectura rápida:** Rinconada y Santa Catalina son los extremos: pierden población, ~4 de cada 5 hogares de Santa Catalina no tienen internet ni en casa ni en el celular, y más de la mitad de Rinconada cocina con leña (presión sobre la tola/yareta).

---

## 1. Agua: escasez, humedales (vegas/bofedales) y competencia con la minería de litio

**Datos duros**
- Clima de La Quiaca (SMN, normales 1981–2010): ~352 mm/año, ~68 % concentrado en dic–feb; jun–ago prácticamente 0 mm; humedad relativa ~30 % en invierno. [SMN open data](https://ssl.smn.gob.ar/dpd/descarga_opendata.php?file=observaciones%2Festadisticas.txt)
- Precipitación de la Puna: de 324 a 103 mm/año, decreciendo de este a oeste (INTA Abra Pampa). [INTA, quinoa y papa andina, 2025](https://repositorio.inta.gob.ar/bitstream/handle/20.500.12123/22852/INTA_CRSalta-Jujuy_EEAAbraPampa_Castro_DC_Experiencia_pr%C3%A1ctica_manejo_agron%C3%B3mico_quinoa_papa.pdf)
- Las vegas ocupan **menos del 1 % del territorio puneño** pero sostienen fauna y pastoreo; son reservorios de carbono con turba de hasta >8 m. [CONICET, "Las vegas"](https://ri.conicet.gov.ar/bitstream/handle/11336/212149/CONICET_Digital_Nro.41bf7ebe-62b7-4a5a-96a3-83e848a3de27_B.pdf)
- CONICET: cambio climático (más temperatura, menos lluvia) + minería de litio aumentan la presión sobre las vegas. [CONICET](https://www.conicet.gov.ar/clasifican-a-los-humedales-altoandinos-de-la-puna-segun-su-composicion-floristica/)
- Huella hídrica de litio en Olaroz: **584,1 m³ por tonelada de Li₂CO₃** (92 % salmuera, 8 % agua dulce). [CONICET, Arias Alvarado et al. 2022](https://ri.conicet.gov.ar/handle/11336/204351)
- Informe técnico CONICET: en Olaroz el consumo de agua del proyecto equivale a **8 veces** el uso anual de la población local; en Fénix (Catamarca), 70 veces. [CONICET BICyT](https://bicyt.conicet.gov.ar/fichas/produccion/13084603)
- FARN (2018): riesgo "muy probable" de degradación irreversible del agua dulce en los bordes de la cuenca Salinas Grandes–Guayatayoc y riesgo de subsidencia que afectaría la cosecha ancestral de sal. [FARN](https://farn.org.ar/wp-content/uploads/2020/06/FARN-Estudio-de-los-recursos-hi%CC%81dricos-y-el-impacto-por-explotacio%CC%81n-minera-de-litio_compressed.pdf)
- Sitios Ramsar: Laguna de los Pozuelos (16.224 ha, 1992, "cuenca con mayor densidad de población rural de la Puna", con desecamientos parciales o totales recurrentes) y Lagunas de Vilama (157.000 ha, 2000). [Pozuelos](https://www.argentina.gob.ar/ambiente/agua/humedales/sitiosramsar/pozuelos) · [Vilama](https://www.argentina.gob.ar/ambiente/agua/humedales/sitiosramsar/vilama)
- Reserva de Biósfera Pozuelos: 377.841 ha, ~1.500 familias, >700 productores minifundistas con ~300 cabezas promedio; el Plan de Gestión 2025 identifica contaminación minera del agua, sobrepastoreo y degradación de vegas. [Plan de Gestión](https://sib.gob.ar/archivos/20251114_151829_Plan-de-Gestin-de-la-Reserva-Pozuelos-2025-FINAL.pdf)
- Censo 2022 (tabla §0): solo el 39,8 % de los hogares de Rinconada y el 41,9 % de Santa Catalina tienen agua por cañería dentro de la vivienda.

**Ángulo de telemetría espacial:** índices NDVI/NDWI de Sentinel‑2, humedad de suelo de SAOCOM (banda L, CONAE) y superficie de lagunas. CONAE ya trabaja con SAOCOM sobre vegas en la Puna catamarqueña — no hay un equivalente público para Jujuy. [CONAE/SAOCOM en Antofagasta de la Sierra](https://www.argentina.gob.ar/noticias/buscan-optimizar-el-uso-del-agua-en-la-puna-catamarquena-con-informacion-saocom). CONICET validó NDVI/SAVI/MSAVI2 para distinguir tipos de vegetación en Pozuelos. [CONICET 2019](https://ri.conicet.gov.ar/handle/11336/122977)

---

## 2. Clima extremo: heladas, sequía y ganado

- La Quiaca Observatorio (3.459 m): mínima media de julio −6,8 °C y máxima 15,4 °C → amplitud diaria de ~22 °C. [SMN](https://ssl.smn.gob.ar/dpd/descarga_opendata.php?file=observaciones%2Festadisticas.txt)
- Otoño 2026: **31 días con helada** en La Quiaca, segunda frecuencia más alta del país fuera de la cordillera. [SMN, Boletín Otoño 2026](https://repositorio.smn.gob.ar/bitstream/handle/20.500.12160/3295/0048CL2026.pdf)
- Abra Pampa: no hay período libre de heladas; mínimas invernales usuales de −18 °C. [INTA](https://repositorio.inta.gob.ar/handle/20.500.12123/23230)
- Pozuelos: amplitud térmica de hasta 43,5 °C en un día, mínimas de hasta −30 °C. [APN](https://www.argentina.gob.ar/parquesnacionales/region-noroeste/monumento-natural-laguna-de-los-pozuelos/biodiversidad)
- Sequía 2023: INTA Abra Pampa reporta animales con baja condición corporal; ~15.000 cabezas bovinas en la cuenca de Miraflores afectadas; los productores tienen que descargar campos. [El Tribuno, 2023](http://eltribunodejujuy.com/nota/2023-10-17-1-4-0-preocupan-efectos-de-la-sequia-y-calor-en-el-ganado-de-la-puna)
- INTA implementa riego por goteo para quinoa y papa andina por heladas frecuentes y lluvias discontinuas. [AgroNoa](https://agronoa.com.ar/en-la-puna-el-inta-trabaja-en-riego-por-goteo/)

**Ángulo de telemetría:** el SMN tiene pocas estaciones en la Puna (La Quiaca es la de referencia); las alertas de helada a nivel paraje no existen. Oportunidad: modelos de helada con datos satelitales (temperatura de superficie MODIS/Landsat, Open‑Meteo / NASA POWER) + nodos de sensores de bajo costo.

---

## 3. Conectividad y aislamiento

- Censo 2022: 66,7 % de hogares con internet en la vivienda a nivel provincial vs. **12,6 % en Santa Catalina** y 23,5 % en Rinconada (§0).
- ENACOM, 2T‑2025: Jujuy tiene **64,61 accesos fijos cada 100 hogares vs. 81,82 nacional**. [ENACOM](https://indicadores.enacom.gob.ar/files/informes/provinciales/2025/T2/2025-T2-Jujuy.pdf)
- ARSAT: REFEFO con ~1.149 km iluminados en Jujuy; internet satelital ARSAT‑2 en **206 escuelas rurales**; antenas VSAT en parajes de <500 hab. (Lagunillas del Farallón, Jama, Loma Blanca). [ARSAT](https://www.arsat.com.ar/arsat-sigue-conectando-localidades-de-jujuy/)
- Jujuy Digital: red sobre la RN 40 para 19–21 comunidades (Cusi Cusi, Paicone, Coranzulí, Susques, etc.); 750 familias conectadas a 10 Mbps en 2023, meta ~1.152 hogares. [Prensa Jujuy](https://prensa.jujuy.gob.ar/jujuy-digital-sapem/avanza-el-proyecto-jujuy-digital-sapem-brindar-internet-comunidades-la-ruta-40-n111904) · [El Destape](https://www.eldestapeweb.com/economia-finanzas/jujuy/avanza-red-de-conectividad-por-fibra-optica-que-llega-a-hogares-de-la-puna-jujena-202392620200)
- Etnografía en Cusi Cusi: el Wi‑Fi público llegó solo a la plaza en 2019, la conexión domiciliaria quedó frenada 4 años y la gente tenía que conectarse afuera con frío y viento, incluso en pandemia. [Rev. Escuela de Antropología UNR, 2024](https://revistadeantropologia.unr.edu.ar/index.php/revistadeantropologia/article/view/287)
- Caminos: la comunidad de Rinconadilla queda aislada en verano por el río Las Burras (RP 11 / RP 75); tiene que viajar a Abra Pampa para atención de salud. [Jujuy al Momento, 2024](https://www.jujuyalmomento.com/agua/comunidad-rinconadilla-aislados-caminos-desastrosos-y-falta-agua-n164936)
- Paso de Jama / RN 52: cerrado por nevadas el 27–28/10/2026; partes diarias con vientos de 40–70 km/h, tormentas eléctricas, vuelcos de vehículos y la RP 11 con arena acumulada. [El Tribuno 28/10/2026](https://eltribunodejujuy.com/informacion-general/2026-10-28-8-28-0-paso-de-jama-cerrado-por-nevadas) · [El Tribuno 18/11/2026](https://eltribunodejujuy.com/informacion-general/2026-11-18-8-47-0-paso-de-jama-habilitado-y-rutas-con-precaucion) · [Pasos internacionales](https://www.argentina.gob.ar/seguridad/pasosinternacionales/detalle/ruta/19/Jama)

**Implicancia de diseño:** cualquier solución tiene que ser **offline‑first** / de bajo ancho de banda (PWA, SMS, LoRa, sincronización diferida).

---

## 4. Contaminación minera heredada

- Abra Pampa (ex fundición Metal Huasi): ~7.000 t de escoria de plomo; concentraciones entre 17 y 50 veces el umbral de referencia de 400 mg/kg (INQA‑UNJu, citado por la Defensoría del Pueblo). [DPN, 2011](https://www.dpn.gob.ar/articulo.php?id=1538&pagN=9)
- Estudio de riesgo: Abra Pampa fue confirmado como sitio contaminado, con un nivel elevado de población infantil afectada por la exposición. [Rev. Salud Ambiental](https://ojs.diffundit.com/index.php/rsa/article/view/189)
- Mina Pan de Azúcar (Rinconada): el drenaje ácido sigue afectando al río Cincel y a la Laguna de Pozuelos (CONICET‑UNSa, 2020: Fe, Al, Cu, Pb, Cd muy por encima de los límites). En enero de 2026 las comunidades volvieron a pedir informes ambientales. [InfoTerritorial, 2026](https://infoterritorial.com.ar/comunidades-alertan-por-contaminacion-en-la-cuenca-de-pozuelos/)
- Cuenca de Pozuelos: 84 expedientes mineros, ~182.968 ha con superposiciones. [Economía Sustentable](https://economiasustentable.com/noticias/alerta-ambiental-los-grupos-mineros-que-avanzan-sobre-una-reserva-natural-protegida/)

**Ángulo de telemetría:** detección de plumas de drenaje ácido (coloración rojiza visible >4 km) con índices de óxidos de hierro en Sentinel‑2; cruce con el Catastro Minero Digital de Jujuy y monitoreo comunitario.

---

## 5. Cultura regional: identidad, lengua y patrimonio

- Población indígena: **81.538 personas (10,1 %)** en Jujuy, la mayor proporción del país; Kolla 32.276, Omaguaca 9.173, Guaraní 7.522, Atacama 3.960, Quechua 3.492. [INDEC indígena c9](https://censo.gob.ar/wp-content/uploads/2024/03/c2022_jujuy_poblacion_indigena_c9_10.xlsx) · [INDEC](https://censo.gob.ar/index.php/el-29-de-la-poblacion-en-viviendas-particulares-se-reconocio-indigena-o-descendiente-de-pueblos-indigenas/)
- Solo el **36,9 %** habla o entiende la lengua de su pueblo (30.116 de 81.538).
- Brecha generacional (Censo 2022, [indígena c7](https://censo.gob.ar/wp-content/uploads/2024/03/c2022_jujuy_poblacion_indigena_c7_10.xlsx)) — % que habla o entiende la lengua:

  | Depto | Pob. indígena | Total | Niños 0–4 | Adultos 40–44 |
  |---|---|---|---|---|
  | Cochinoca | 8.098 | 49,0 % | 26,0 % | 51,7 % |
  | Rinconada | 1.240 | 50,5 % | 25,5 % | 60,7 % |
  | Susques | 3.223 | 30,3 % | 16,2 % | 33,5 % |
  | Yavi | 7.392 | 53,6 % | 34,6 % | 58,3 % |
  | Humahuaca | 8.774 | 57,5 % | 42,7 % | 57,0 % |

  En Cochinoca, Rinconada y Susques la transmisión a los más chicos es aproximadamente la mitad que en los adultos.
- 164 comunidades Kolla en Jujuy, 113 de ellas en la Puna. [Población y Sociedad, SciELO 2012](https://www.scielo.org.ar/pdf/pys/v19n2/v19n2a02.pdf)
- Toponimia en quechua, kunza y español, vinculada a recursos hídricos, animales y sitios arqueológicos (quebrada de La Cueva). [CONICET, Ramundo 2024](https://ri.conicet.gov.ar/handle/11336/243929)
- Patrimonio arqueológico: Barrancas/Abdón Castro Tolay (arte rupestre, ~10.000 años de ocupación, centro de interpretación desde 2020) y Casabindo (~40 años de investigación). [SciELO 2024](https://www.scielo.org.ar/scielo.php?pid=S1852-48262024000100247&script=sci_arttext) · [Albeck, UNLP](https://publicaciones.fcnym.unlp.edu.ar/rmlp/article/download/2337/1832)
- Qhapaq Ñan (UNESCO 2014): en Argentina, 13 segmentos y 32 sitios en 7 provincias, incluido el tramo Quebrada Grande–Las Escaleras (Jujuy), relevado con drones. [Cultura Nación](https://www.cultura.gob.ar/media/uploads/caminoancestral_digital.pdf) · [Cultura Jujuy](https://culturayturismo.jujuy.gob.ar/2019/04/29/datos-vitales-para-elaboracion-de-un-plan-de-manejo/)
- Saberes productivos vivos: chaku (captura y esquila de vicuñas en silvestría) en Cieneguillas desde 2003 (114 capturadas, 75 esquiladas, 200–300 g de fibra por animal) y Santa Catalina; Ley provincial 5634; acuerdo 2025 con Olaroz Chico, El Toro y Jama. [CONICET](https://www.conicet.gov.ar/manejo-y-conservacion-de-vicunas-en-un-ecosistema-pastoril/) · [Plan Cieneguillas](https://macaulay.webarchive.hutton.ac.uk/macs/Publications/vilaPlandeManejo.pdf) · [Prensa Jujuy 2025](https://prensa.jujuy.gob.ar/maria-ines-zigaran/ambiente-fortalece-alianzas-el-desarrollo-proyectos-esquila-sustentable-vicunas-n120822)
- Etnoastronomía: la Cruz del Sur (Willka Chakata) en el calendario agrofestivo; trabajo escolar del Polimodal 8 de Humahuaca. [El Tribuno 2024](https://eltribunodejujuy.com/informacion-general/2024-6-20-1-0-0-inti-y-la-astronomia-andina-investigacion-del-polimodal-8)

---

## 6. Activos de "telemetría espacial" ya existentes en Jujuy (para apalancar)

| Activo | Qué ofrece | Fuente |
|---|---|---|
| **Observatorio La Quiaca (SMN, 1902)** | Estación OMM 87007, 3.459 m; radiación global/difusa, ozono total (Dobson), ozono superficial, UV. El pronóstico de UV de Copernicus da allí su mejor ajuste (RMSD 16 %). | [SMN NT 2025‑198](https://repositorio.smn.gob.ar/bitstream/handle/20.500.12160/3044/Nota_Tecnica_SMN_2025-198.pdf) · [SMN NT 2024‑189](https://repositorio.smn.gob.ar/bitstream/handle/20.500.12160/2887/Nota_Tecnica_SMN_2024-189.pdf) |
| **SAOCOM 1A/1B (CONAE)** | Radar banda L, humedad de suelo, revisita de 8 días; mosaicos provinciales gratuitos de 30 m. | [CONAE](https://www.argentina.gob.ar/ciencia/conae/misiones-espaciales/saocom) · [IGN](https://www.ign.gob.ar/NuestrasActividades/SensoresRomotos/MosaicosSatelitalesRadar) · [Catálogo](https://catalogos.conae.gov.ar/catalogo/catalogoSaocom.html) |
| **RAMSAC (IGN)** | Estaciones GNSS permanentes en Tilcara y Abra Pampa. | [IGN](https://www.ign.gob.ar/Novedades/estacionGPSpermanenteJujuy) |
| **INPRES** | Sismicidad en tiempo real (ej. M3,8 a 23 km de Rinconada, 13/10/2026). | [INPRES](http://contenidos.inpres.gob.ar/epicentro3.php?s=20261013091022) |
| **IDEJuy** | Geoservicios OGC abiertos (WMS/WFS). | `https://geo.idejuy.jujuy.gob.ar/geoserver/wms?` · [IDEJuy](https://moderno.jujuy.gob.ar/idejuy-geoservicios/) |
| **Parque Solar Cauchari** | 315,79 MWp a 4.020 m; ~690.000 MWh/año estimados; ampliación prevista de +200 MW. | [JEMSE](https://jemse.gob.ar/energias-renovables/) |
| **PERMER mini‑redes** | Catua (146 viviendas), El Toro (72), San Juan de Quillaques: solar + baterías LFP + respaldo diésel. | [Secretaría de Energía](https://www.argentina.gob.ar/noticias/permer-inauguro-3-mini-redes-solares-para-comunidades-originarias-de-jujuy) |
| **Ruta Jujeña de las Estrellas** | Sendero Starlight certificado (2025); observatorios en Susques y Olaroz Chico. | [Fundación Starlight](https://en.fundacionstarlight.org/noticias/news/348-jujuy-celebrates-the-accreditation-of-the-route-of-jujuy-skies-as-a-starlight-trail.html) · [Cultura Jujuy](https://culturayturismo.jujuy.gob.ar/2025/10/09/el-observatorio-astronomico-de-olaroz-chico-ya-recibe-visitantes-en-la-puna/) |
| **CONAE 2Mp / Qhawa** | Software educativo geoespacial open source para escuelas. | [CONAE](https://www.argentina.gob.ar/noticias/la-conae-libero-el-codigo-de-su-software-2mp) |
| **Censo 2022 por radio censal** | CSV + capas geográficas. | [datos.gob.ar](https://datos.gob.ar/es/dataset/censo-nacional-de-poblacion-hogares-y-viviendas-20221) |

---

## 7. Síntesis: problemas priorizados para hackear

| # | Problema | Evidencia clave | Datos abiertos para el MVP | Track |
|---|---|---|---|---|
| 1 | **Vegas/bofedales y agua sin monitoreo a nivel comunidad** | <1 % del territorio; litio = 8× el consumo poblacional en Olaroz; desecamiento de Pozuelos | Sentinel‑2, SAOCOM, Ramsar, IDEJuy | Telemetría + Puna |
| 2 | **Heladas/sequía sin alerta temprana por paraje** | 31 días de helada en otoño 2026; sin período libre de heladas; mortandad y descarga de ganado | SMN, Open‑Meteo, NASA POWER, MODIS LST | Telemetría + Puna |
| 3 | **Aislamiento: rutas, conectividad, emergencias** | 79,5 % sin internet (Santa Catalina); cierres de Jama; Rinconadilla aislada | Partes de Seguridad Vial, ENACOM, Censo | Puna |
| 4 | **Pérdida de lengua y memoria territorial** | 36,9 % habla la lengua; los niños 0–4 la mitad que los adultos | Censo indígena, toponimia CONICET, Qhapaq Ñan | Cultura |
| 5 | **Contaminación minera heredada** | Plomo en Abra Pampa; drenaje ácido en Pozuelos | Sentinel‑2, Catastro Minero | Telemetría + Puna |
| 6 | **Energía/leña y presión sobre la tola** | 56,6 % cocina a leña (Rinconada); mini‑redes PERMER; Cauchari | Censo c4, PERMER, irradiancia de La Quiaca | Puna + Telemetría |

**Cruce más fuerte (cubre los tres ejes del track):** monitor satelital de vegas + alertas de heladas por paraje, con reportes comunitarios offline y toponimia/saberes en lengua originaria (problemas 1 + 2 + 4, diseñado para la realidad de conectividad del problema 3).

---

### Notas metodológicas
- Los porcentajes del Censo son sobre hogares (excluyen a la población en situación de calle), calculados desde los `.xlsx` oficiales. Los datos de lengua son sobre población indígena en viviendas particulares.
- Las cifras de prensa (sequía 2023, cortes de rutas 2026) son reportes periodísticos con fuente oficial citada; las cifras de CONICET, INDEC, SMN y ENACOM son primarias.
- El dato de 8× en Olaroz viene de un informe técnico CONICET basado en los EIA de las empresas; sus propios autores señalan problemas de transparencia en esos EIA.
