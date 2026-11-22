import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { POINTS, openMeteoUrl } from '../src/points.ts';

const read = (f: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../fixtures/${f}`, import.meta.url)), 'utf8'));

test('POINTS coincide con fixtures/points.json', () => {
  assert.deepEqual(POINTS, read('points.json'));
});

test('fixture Open-Meteo: 6 puntos × 168 horas', () => {
  const om = read('openmeteo_points.json');
  assert.equal(om.length, 6);
  for (const p of om) assert.equal(p.hourly.time.length, 168);
});

test('URL de Open-Meteo multi-coordenada', () => {
  const u = new URL(openMeteoUrl());
  assert.equal(u.searchParams.get('latitude')!.split(',').length, 6);
  assert.equal(u.searchParams.get('timezone'), 'America/Argentina/Jujuy');
});
