import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Stubs de APIs externas con los fixtures del repo (solo lectura de ../fixtures).
 * Motivo: cada test abre un contexto nuevo (sin caché) y la suite completa generaba ~70 descargas
 * a Open-Meteo (devolvió 429) y a CelesTrak (corta con bloqueo de IP; AGENTS.md). Con esto la suite es
 * determinística y respeta las APIs. Desactivar con HANAN_E2E_RED_REAL=1.
 */
const dir = path.dirname(fileURLToPath(import.meta.url));
const fx = (f: string) => fs.readFileSync(path.join(dir, '..', '..', 'fixtures', f), 'utf8');
const puntos = fx('openmeteo_points.json');
const omm = JSON.parse(fx('omm.json')) as { NORAD_CAT_ID: number }[];

export const test = base.extend<{ stubsRed: void }>({
  stubsRed: [
    async ({ context }, use) => {
      if (!process.env.HANAN_E2E_RED_REAL) {
        await context.route(/^https:\/\/api\.open-meteo\.com\/v1\/forecast/, (route) => {
          const req = route.request();
          if (req.method() === 'GET' && /latitude=/.test(req.url()))
            return route.fulfill({ status: 200, contentType: 'application/json', body: puntos, headers: { 'access-control-allow-origin': '*' } });
          // POST de la grilla: respuesta vacía → la app cae a su fixture de grilla (forma inesperada, sin error de red)
          return route.fulfill({ status: 200, contentType: 'application/json', body: '[]', headers: { 'access-control-allow-origin': '*' } });
        });
        await context.route(/^https:\/\/celestrak\.org\/NORAD\/elements\/gp\.php/, (route) => {
          const id = Number(new URL(route.request().url()).searchParams.get('CATNR'));
          const o = omm.filter((x) => Number(x.NORAD_CAT_ID) === id);
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o), headers: { 'access-control-allow-origin': '*' } });
        });
      }
      await use();
    },
    { auto: true },
  ],
});
export { expect };
export type { Page, Locator } from '@playwright/test';
