import { test, expect } from './base';
import { visible } from './helpers';
import { fraccionNoFondo, muestrearCanvas } from './pixels';
import { abrirObservatorio, dialogo } from './obs';

/** Sin flags de cámara falsa y sin permiso: el observatorio cae a modo planetario. */
test.use({ launchOptions: { args: [] }, permissions: [] });

test('23g · sin cámara → "Sin cámara: modo planetario" y overlay visible', async ({ page }) => {
  await page.goto('/?tab=cielo&punto=susques');
  await abrirObservatorio(page);
  await expect(visible(dialogo(page).getByText(/sin c[aá]mara:?\s*modo planetario/i)), 'Se esperaba el aviso de modo planetario').toBeVisible({ timeout: 10_000 });
  const cv = visible(dialogo(page).locator('canvas'));
  await expect(cv).toBeVisible();
  await page.waitForTimeout(800);
  expect(fraccionNoFondo(await muestrearCanvas(page, cv)), 'El overlay debería verse igual sin cámara').toBeGreaterThan(0.002);
});
