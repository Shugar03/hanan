import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseJama, JAMA_SOURCE_URL } from '../src/jama.ts';

const fixture = readFileSync(fileURLToPath(new URL('../../fixtures/paso_jama.html', import.meta.url)), 'utf8');
const at = new Date('2026-11-22T11:00:00-03:00');

const synth = (prioridad: string, vialidad: string) => `
<ul>
  <li> Gendarmería Nacional (última actualización 21/11/2026 - 7:05 h)</li>
  <li> Vialidad Nacional (última actualización 22/11/2026 - 06:30 h)</li>
</ul>
<script>
  var estadoPrioridad = "${prioridad}";
  var estadoVialidad = "${vialidad}";
</script>`;

test('fixture real (22/11/2026): ABIERTO + HABILITADA → abierto', () => {
  const s = parseJama(fixture, at);
  assert.equal(s.state, 'abierto');
  // Gendarmería 20/11 17:55 vs Vialidad 18/11 9:00 → la más reciente
  assert.equal(s.sourceUpdatedAt, '2026-11-20T17:55:00-03:00');
  assert.equal(s.sourceUrl, JAMA_SOURCE_URL);
  assert.equal(s.fetchedAt, at);
});

test('sintético: CERRADO → cerrado', () => {
  const s = parseJama(synth('CERRADO', 'HABILITADA'), at);
  assert.equal(s.state, 'cerrado');
  assert.equal(s.sourceUpdatedAt, '2026-11-22T06:30:00-03:00');
});

test('sintético: cerrado en minúsculas también → cerrado', () => {
  assert.equal(parseJama(synth('Cerrado', 'CORTE TOTAL'), at).state, 'cerrado');
});

test('sintético: ABIERTO + RESTRINGIDA → restringido', () => {
  assert.equal(parseJama(synth('ABIERTO', 'RESTRINGIDA'), at).state, 'restringido');
});

test('sintético: ABIERTO + CORTE TOTAL → restringido', () => {
  assert.equal(parseJama(synth('ABIERTO', 'CORTE TOTAL'), at).state, 'restringido');
});

test('parseo fallido → desconocido sin fecha inventada', () => {
  const s = parseJama('<html><body>Mantenimiento</body></html>', at);
  assert.equal(s.state, 'desconocido');
  assert.equal(s.sourceUpdatedAt, undefined);
  assert.equal(s.sourceUrl, JAMA_SOURCE_URL);
});

test('valor inesperado de estadoPrioridad → desconocido', () => {
  assert.equal(parseJama(synth('EN EVALUACION', 'HABILITADA'), at).state, 'desconocido');
});
