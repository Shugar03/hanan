import { test, expect } from './base';
import { visible } from './helpers';
import { fraccionNoFondo, muestrearCanvas } from './pixels';
import { abrirObservatorio, dialogo, espiarCamara, estadosTracks, hud, orientar } from './obs';

/** Modo observatorio (AR): cámara trasera + overlay del cielo + brújula + alineación. Cámara falsa de Chromium. */
test.use({
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
  permissions: ['camera'],
});

const CAL = 'hanan.observatorio.calibracion';

test.describe('Observatorio (23) · con cámara', () => {
  test('23a · botón "Abrir modo observatorio" (≥ 44 px) en Explorar y en Cielo', async ({ page }) => {
    for (const url of ['/?tab=explorar&punto=susques', '/?tab=cielo&punto=susques']) {
      await page.goto(url);
      const b = visible(page.getByRole('button', { name: /abrir modo observatorio/i }));
      await expect(b, `Falta el botón en ${url}`).toBeVisible({ timeout: 10_000 });
      const box = (await b.boundingBox())!;
      expect(box.width, `${url}: ancho ${box.width}`).toBeGreaterThanOrEqual(44);
      expect(box.height, `${url}: alto ${box.height}`).toBeGreaterThanOrEqual(44);
    }
  });

  test('23b · abre diálogo modal a pantalla completa con video reproduciendo, overlay con contenido y obs=1', async ({ page }) => {
    await espiarCamara(page);
    await page.goto('/?tab=cielo&punto=susques');
    await abrirObservatorio(page);
    const d = dialogo(page);
    await expect(d).toHaveAttribute('aria-modal', 'true');
    const vp = page.viewportSize()!;
    const box = (await d.boundingBox())!;
    expect(box.width, 'El diálogo debería ocupar todo el ancho').toBeGreaterThanOrEqual(vp.width * 0.98);
    expect(box.height, 'El diálogo debería ocupar todo el alto').toBeGreaterThanOrEqual(vp.height * 0.98);
    await expect(page).toHaveURL(/[?&]obs=1\b/);

    const video = d.locator('video');
    await expect(video, 'Se esperaba un <video>').toHaveCount(1);
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => (v.paused ? -1 : v.readyState)), {
        message: 'El video de la cámara debería estar reproduciendo con readyState ≥ 2 (HAVE_CURRENT_DATA)',
        timeout: 10_000,
      })
      .toBeGreaterThanOrEqual(2);
    expect((await estadosTracks(page)).filter((s) => s === 'live').length, 'Debería haber un track de cámara vivo').toBeGreaterThan(0);

    const cv = visible(d.locator('canvas'));
    await expect(cv, 'Se esperaba el canvas de overlay').toBeVisible();
    await page.waitForTimeout(800);
    const m = await muestrearCanvas(page, cv);
    expect(fraccionNoFondo(m), 'El overlay debería dibujar el cielo (no vacío)').toBeGreaterThan(0.002);
  });

  test('23c · back del navegador cierra el observatorio y apaga la cámara (tracks ended)', async ({ page }) => {
    await espiarCamara(page);
    await page.goto('/?tab=cielo&punto=susques');
    await abrirObservatorio(page);
    await expect.poll(() => estadosTracks(page), { timeout: 10_000 }).toContain('live');
    await page.goBack();
    await expect(dialogo(page), 'Back debería cerrar el observatorio').toBeHidden();
    expect(page.url(), 'Back no debería salir de la app').toMatch(/^http:\/\/[^/]+\//);
    await expect(page).not.toHaveURL(/[?&]obs=1\b/);
    await expect.poll(() => estadosTracks(page), { message: 'Todos los tracks deberían quedar "ended"' }).not.toContain('live');
    expect((await estadosTracks(page)).length).toBeGreaterThan(0);
  });

  test('23d · Esc cierra el observatorio', async ({ page }) => {
    await espiarCamara(page);
    await page.goto('/?tab=explorar&punto=susques');
    await abrirObservatorio(page);
    await page.keyboard.press('Escape');
    await expect(dialogo(page), 'Esc debería cerrar').toBeHidden();
    await expect(page).not.toHaveURL(/[?&]obs=1\b/);
    await expect.poll(() => estadosTracks(page)).not.toContain('live');
  });

  test('23e · orientación: HUD "Mirando al …" cambia con alpha; sin eventos dice "Sin brújula"', async ({ page }) => {
    await page.goto('/?tab=cielo&punto=susques');
    await abrirObservatorio(page);
    // sin eventos de orientación
    await expect(visible(dialogo(page).getByText(/sin br[uú]jula:?\s*arrastr[aá] para mirar/i)), 'Sin sensores debería pedir arrastrar').toBeVisible({ timeout: 5_000 });
    await orientar(page, 180);
    await expect.poll(() => hud(page)).toMatch(/mirando al/i);
    await expect(dialogo(page).getByText(/sin br[uú]jula/i), 'Con eventos de orientación ya no debería decir "Sin brújula"').toBeHidden();
    const h1 = await hud(page);
    await orientar(page, 90, 1500);
    await expect.poll(() => hud(page), { message: `Al cambiar alpha 180→90 el HUD debería cambiar (era "${h1}")` }).not.toBe(h1);
    const h2 = await hud(page);
    await orientar(page, 0, 1500);
    await expect.poll(() => hud(page)).not.toBe(h2);
  });

  test('23f · Alinear: lista de objetos brillantes, elegir uno y "Listo" guarda la calibración y persiste', async ({ page }) => {
    await page.goto('/?tab=cielo&punto=susques&fecha=2026-11-22T23:30');
    await abrirObservatorio(page);
    await orientar(page, 180, 600);
    const alinear = visible(dialogo(page).getByRole('button', { name: /alinear/i }));
    await expect(alinear).toBeEnabled();
    await alinear.click();
    const lista = visible(dialogo(page).getByRole('region', { name: /eleg[ií] un objeto|alinear/i }));
    await expect(lista, 'Se esperaba la lista de objetos brillantes').toBeVisible();
    const items = lista.getByRole('listitem').getByRole('button');
    expect(await items.count(), 'La lista debería tener objetos brillantes').toBeGreaterThan(0);
    const nombre = ((await items.first().innerText()).split('\n')[0] ?? '').trim();
    await items.first().click();
    await orientar(page, 170, 400);
    await visible(dialogo(page).getByRole('button', { name: /^listo$/i })).click();
    const cal = await page.evaluate((k) => localStorage.getItem(k), CAL);
    expect(cal, `Se esperaba la calibración en localStorage["${CAL}"]`).not.toBeNull();
    expect(cal).not.toBe('null');

    await page.reload();
    expect(await page.evaluate((k) => localStorage.getItem(k), CAL), 'La calibración debería persistir tras recargar').toBe(cal);
    if (!(await dialogo(page).isVisible().catch(() => false))) await abrirObservatorio(page);
    await orientar(page, 180, 600);
    await expect(
      visible(dialogo(page).getByText(/alinead/i)),
      `Tras recargar, el estado debería indicar que está alineada (con ${nombre})`,
    ).toBeVisible();
  });
});
