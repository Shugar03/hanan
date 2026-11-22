import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { decideCache, isDegradedPass, DEGRADED_TTL_S, JAMA_TTL_S } from '../src/cachePolicy.ts';
import { parseJama } from '../src/jama.ts';

const at = new Date('2026-11-22T11:00:00-03:00');
const fixture = readFileSync(fileURLToPath(new URL('../../fixtures/paso_jama.html', import.meta.url)), 'utf8');

test('Jama sano (fixture abierto) → servir fresco 30 min y renovar stale', () => {
  const s = parseJama(fixture, at);
  assert.equal(isDegradedPass(s), false);
  assert.deepEqual(decideCache(isDegradedPass(s), true, JAMA_TTL_S), { action: 'serve-fresh', ttl: JAMA_TTL_S, updateStale: true });
});

test('cerrado/restringido NO son degradados (son estados válidos)', () => {
  assert.equal(isDegradedPass({ state: 'cerrado' }), false);
  assert.equal(isDegradedPass({ state: 'restringido' }), false);
});

test('desconocido (parseo fallido / no-200) + hay stale → servir stale', () => {
  const s = parseJama('<html>error</html>', at);
  assert.equal(isDegradedPass(s), true);
  assert.deepEqual(decideCache(true, true, JAMA_TTL_S), { action: 'serve-stale' });
});

test('desconocido sin stale → servir desconocido con TTL ≤ 2 min y sin pisar stale', () => {
  const d = decideCache(true, false, JAMA_TTL_S);
  assert.deepEqual(d, { action: 'serve-fresh', ttl: DEGRADED_TTL_S, updateStale: false });
  assert.ok(d.action === 'serve-fresh' && d.ttl <= 120);
});

test('degradado con TTL base menor a 2 min respeta el menor', () => {
  assert.deepEqual(decideCache(true, false, 60), { action: 'serve-fresh', ttl: 60, updateStale: false });
});
