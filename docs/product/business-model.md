# Hanan — modelo de negocio

Hanan es un **marketplace de dos lados con un motor de pronóstico como diferencial**: junta la oferta (guías y operadores de astroturismo) con la demanda (aficionados a la astronomía y turistas), y usa el cielo para decidir *cuándo* conviene conectar a ambos. Producto: [`spec.md`](spec.md).

## 1. Por qué funciona como marketplace

| Fricción actual | Evidencia | Cómo la resuelve Hanan |
|---|---|---|
| Las salidas dependen del clima y se cancelan | Los operadores reconocen que una noche nublada puede cancelar la experiencia; algunos no reintegran con menos de 15 días de anticipación | Las salidas se publican y se venden **sobre la mejor ventana**; reprogramación asistida |
| La oferta está fragmentada y es difícil de encontrar | Las agencias venden por WhatsApp y redes, sin oficina; las salidas se coordinan "según la disponibilidad de los guías" | Catálogo único por punto y noche de la Ruta de las Estrellas |
| El guía no ve la demanda hasta que alguien le escribe | — | **Señales de demanda** agregadas ("Quiero ir") por punto y noche |
| El turista no sabe cuándo ir ni qué va a ver | Nov–ene sin núcleo de la Vía Láctea; enero con 5,2/8 de nubosidad media en La Quiaca | Score + "qué se ve" + educación estacional |
| La Puna convierte poco | 48 % de ocupación en julio de 2025 vs. 80 % en la Quebrada | El astroturismo es un producto de pernocte en la Puna |

Fuentes: ver [`../research/factibilidad-cielo-puna.md`](../research/factibilidad-cielo-puna.md).

## 2. Propuesta de valor por lado

**Aficionados y turistas (demanda)** — gratis en su núcleo:
- Pronóstico de cielo por punto y por hora, la mejor noche de la semana y qué se ve.
- Salidas de guías para esa ventana, con reserva directa.
- *Pro:* alertas personalizadas, planificador de astrofoto, calendario de eventos (lluvias de meteoros, eclipses) y modo offline completo de la Ruta.

**Guías y operadores (oferta)**:
- Visibilidad frente a demanda calificada, que ya sabe que esa noche está buena.
- Alertas de noche excelente y señales de demanda para decidir cuándo salir.
- Reprogramación por clima en un toque, con un mensaje listo para los clientes.
- Badge **"Guía registrado"** (verificado contra el Registro Único de Guías de Jujuy, Ley 6308).

**Turismo provincial / COAS (ecosistema)**:
- Tablero de demanda del producto Starlight por punto y fecha, y difusión del COAS y Olaroz Chico.

## 3. Fuentes de ingreso (hipótesis a validar en el piloto)

| # | Fuente | Quién paga | Mecánica | Cuándo |
|---|---|---|---|---|
| 1 | **Comisión por reserva** | Guía u operador | 10–15 % sobre las salidas reservadas a través de Hanan (hipótesis; a validar con guías en el piloto) | Cuando haya pagos en la app |
| 2 | **Hanan Pro para guías** | Guía u operador | Suscripción mensual: alertas multi-punto, planificador, link de salida para clientes, demanda agregada, destacados | Piloto |
| 3 | **Hanan Pro para aficionados** | Aficionado | Suscripción o pago anual: alertas, astrofoto, offline completo | Después del piloto |
| 4 | **Licencia B2G** | Turismo provincial / municipios / COAS | Tablero de demanda + widget de "cielo esta noche" para sitios oficiales | Piloto institucional |
| 5 | **Destacados** | Alojamientos y operadores | Ubicación preferencial en noches de alta demanda (marcada como "destacado") | Escala |

No se definen precios en esta etapa: se validan con 3–5 guías en el piloto (disposición a pagar y comisión aceptable).

### Lo que NO se monetiza
- El pronóstico básico y la información cultural: el núcleo para aficionados queda gratis.
- La información de las comunidades: la capa de cielo andino se co-crea y su uso comercial se acuerda con ellas.

## 4. Arranque del marketplace (cold start)

1. **Oferta primero:** sumar a mano entre 3 y 5 guías de astroturismo inscriptos en el Registro y al COAS Susques (gratis durante el piloto).
2. **Demanda con el pronóstico:** el pronóstico gratuito atrae aficionados, y las señales de "Quiero ir" les muestran a los guías demanda real antes de cobrar nada.
3. **Canales:** QR en el COAS y en Olaroz Chico, alianzas con alojamientos de Susques, Purmamarca y Tilcara, y comunidades de astronomía amateur.
4. **Evento ancla:** salidas en las noches de mejor score de la temporada de la Vía Láctea (abril–septiembre).

## 5. Métricas clave

- **Liquidez:** porcentaje de noches con score ≥ 70 que tienen al menos una salida publicada en cada punto.
- **Conversión:** vistas de una ventana → "Quiero ir" → reserva.
- **Cancelaciones evitadas:** salidas reprogramadas por Hanan vs. canceladas.
- **Lado oferta:** guías activos por mes y ocupación de sus salidas.

## 6. Requisitos legales y operativos (a validar con asesoría)

| Tema | Norma / fuente | Implicancia |
|---|---|---|
| Guías | Ley provincial 6308 y Decreto 7843‑CyT‑23: inscripción obligatoria en el Registro Único de Guías de Turismo de Jujuy ([trámite](https://tramites.tu.jujuy.gob.ar/guias-requisitos-y-solicitud-de-inscripcion/)) | Solo guías inscriptos pueden tener el badge "registrado"; verificar contra el padrón publicado por Turismo |
| Venta de servicios turísticos | Ley nacional 18.829 (agencias de viajes) | Si Hanan cobra y revende salidas, puede requerir operar como agencia o asociarse con una agencia habilitada. Alternativa inicial: Hanan conecta y el guía u operador cobra (modelo de leads/suscripción) |
| Turismo activo | Ley provincial 6041 | Aplica si la salida incluye actividades con riesgo (trekking nocturno); el prestador es responsable |
| Datos personales | Ley 25.326 y AAIP | Consentimiento para teléfonos de guías y datos de reservas; registrar la base al operar |
| Datos meteorológicos | Términos de Open‑Meteo | Al monetizar se requiere un plan pago |
| Contaminación lumínica | World Atlas 2016, CC BY‑NC | Licenciar o reemplazar antes del uso comercial |

## 7. Riesgos del modelo

| Riesgo | Mitigación |
|---|---|
| Los guías ya venden por WhatsApp y evitan la comisión | Arrancar con suscripción y leads (valor: demanda + clima), y cobrar comisión solo cuando el pago en la app agregue valor (seña, reprogramación, garantía) |
| Poca oferta en temporada baja | Combinar con el COAS y los observatorios, que son gratuitos, para que siempre haya un plan |
| Pronóstico erróneo genera reclamos | Mostrar siempre la incertidumbre; política de reprogramación acordada con los guías |
| Escala acotada a Jujuy | El modelo es replicable a Salta (Puna salteña), Catamarca y San Juan (otros destinos de cielo oscuro) |
