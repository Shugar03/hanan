// Genera sky.json (catálogo compacto) desde los datos de d3-celestial (BSD-3, ver ATTRIBUTION.md).
// Uso: node src/data/catalog/build-sky.mjs <carpeta con stars.6.json, constellations*.json, mw.json, starnames.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
const rd = (f) => JSON.parse(readFileSync(join(src, f), 'utf8'));
const stars = rd('stars.6.json'), lines = rd('constellations.lines.json'), cons = rd('constellations.json'), mw = rd('mw.json'), names = rd('starnames.json');
const raH = (lon) => ((lon < 0 ? lon + 360 : lon) / 15);
const r = (x, n) => Math.round(x * 10 ** n) / 10 ** n;

// Nombres en español de las más brillantes (HIP → nombre). El resto, designación de Bayer.
const ES = {
  32349: 'Sirio', 30438: 'Canopus', 71683: 'Alfa Centauri', 69673: 'Arturo', 91262: 'Vega', 24608: 'Capella', 24436: 'Rigel',
  37279: 'Proción', 7588: 'Achernar', 27989: 'Betelgeuse', 68702: 'Hadar', 97649: 'Altair', 60718: 'Ácrux', 21421: 'Aldebarán',
  80763: 'Antares', 65474: 'Espiga', 37826: 'Pólux', 113368: 'Fomalhaut', 102098: 'Deneb', 62434: 'Mimosa', 49669: 'Régulo',
  33579: 'Adhara', 85927: 'Shaula', 36850: 'Cástor', 61084: 'Gacrux', 25336: 'Bellatrix', 25428: 'Elnath', 45238: 'Miaplacidus',
  26311: 'Alnilam', 109268: 'Alnair', 26727: 'Alnitak', 39953: 'Regor', 100751: 'Peacock', 82273: 'Atria', 41037: 'Avior',
  86228: 'Sargas', 59747: 'Imai', 15863: 'Mirfak', 34444: 'Wezen', 90185: 'Kaus Australis', 11767: 'Polaris', 677: 'Alpheratz',
  42913: 'Alsephina', 27366: 'Saiph', 25930: 'Mintaka', 52419: 'Aspidiske', 31681: 'Alhena', 66657: 'Menkent', 92855: 'Nunki',
  9884: 'Hamal', 3419: 'Diphda', 54061: 'Dubhe', 46390: 'Alfard', 71860: 'Alfa Lupi', 81266: 'Alniyat', 87073: 'Lesath',
};
// Nombres de uso corriente en la Argentina (zodiacales y algunos australes)
const CONS_ES = { Ari: 'Aries', Tau: 'Tauro', Gem: 'Géminis', Cnc: 'Cáncer', Leo: 'Leo', Vir: 'Virgo', Lib: 'Libra', Sco: 'Escorpio',
  Sgr: 'Sagitario', Cap: 'Capricornio', Aqr: 'Acuario', Psc: 'Piscis', Car: 'Quilla', Oct: 'Octante', Dor: 'Dorado', Pic: 'Pintor', Hyi: 'Hidra Macho' };
const consIdx = cons.features.map((f) => f.id);
const genOf = Object.fromEntries(cons.features.map((f) => [f.id, f.properties.gen]));

const S = [];
const named = [];
for (const f of stars.features) {
  const { mag, bv } = f.properties;
  if (mag > 5.5) continue;
  const [lon, dec] = f.geometry.coordinates;
  const n = names[f.id] ?? {};
  const c = consIdx.indexOf(n.c);
  S.push([r(raH(lon), 4), r(dec, 3), r(mag, 2), r(parseFloat(bv) || 0, 1), c]);
  const label = ES[f.id] ?? (mag <= 3.5 && n.desig && genOf[n.c] ? `${n.desig} ${genOf[n.c]}` : undefined);
  if (label) named.push([S.length - 1, label]);
}
// orden por magnitud para dibujar las brillantes encima
const order = S.map((_, i) => i).sort((a, b) => S[b][2] - S[a][2]);
const remap = new Map(order.map((o, i) => [o, i]));
const starsOut = order.map((i) => S[i]);
const namedOut = named.map(([i, l]) => [remap.get(i), l]);

const consOut = cons.features.map((f) => {
  const L = lines.features.find((l) => l.id === f.id);
  const [lon, dec] = f.geometry.coordinates;
  return {
    id: f.id, es: CONS_ES[f.id] ?? (f.properties.es || f.properties.name), gen: f.properties.gen, rank: +f.properties.rank,
    at: [r(raH(lon), 3), r(dec, 2)],
    l: (L?.geometry.coordinates ?? []).map((seg) => seg.flatMap(([lo, de]) => [r(raH(lo), 4), r(de, 3)])),
  };
});

// Vía Láctea: anillos simplificados (paso angular mínimo) por nivel de brillo ol1..ol5
const mwOut = mw.features.map((f) => {
  const rings = [];
  for (const poly of f.geometry.coordinates) for (const ring of poly) {
    const out = []; let last = null;
    for (const [lo, de] of ring) {
      if (last && Math.hypot((lo - last[0]) * Math.cos((de * Math.PI) / 180), de - last[1]) < 1.2) continue;
      out.push(r(raH(lo), 3), r(de, 2)); last = [lo, de];
    }
    if (out.length >= 8) rings.push(out);
  }
  return rings;
});

const out = { v: 1, stars: starsOut, named: namedOut, cons: consOut, mw: mwOut };
const dest = join(dirname(fileURLToPath(import.meta.url)), 'sky.json');
writeFileSync(dest, JSON.stringify(out));
console.log('stars', starsOut.length, 'named', namedOut.length, 'cons', consOut.length, 'mw pts', mwOut.flat().reduce((a, x) => a + x.length / 2, 0), 'bytes', JSON.stringify(out).length);
