# Catálogo del planetario (pestaña Cielo)

`sky.json` se genera con `node src/data/catalog/build-sky.mjs <carpeta>` a partir de los archivos de
**d3-celestial** de Olaf Frohn (https://github.com/ofrohn/d3-celestial, carpeta `data/`):
`stars.6.json`, `starnames.json`, `constellations.json`, `constellations.lines.json` y `mw.json`.

Transformaciones: estrellas filtradas a magnitud ≤ 5,5; coordenadas pasadas a AR en horas y redondeadas;
contornos de la Vía Láctea simplificados (paso mínimo ~1,2°); nombres en español de las estrellas más
brillantes y de algunas constelaciones (zodiacales) ajustados al uso corriente en la Argentina.

## Licencia (BSD-3-Clause)

```
Copyright (c) 2015, Olaf Frohn
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided
that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the
   following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and
   the following disclaimer in the documentation and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or
   promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED
WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
DAMAGE.
```

## Aviso: licencia de los datos

La licencia BSD-3 cubre el repositorio, pero el origen y la licencia de los **datos** (derivados de
Hipparcos/Yale BSC, contornos de la Vía Láctea, etc.) tienen un issue abierto en el proyecto:
https://github.com/ofrohn/d3-celestial/issues/161. Atribuir siempre y validar la licencia de los datos
antes de comercializar.
