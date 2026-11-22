import { test, expect, type Page } from './base';
import { control, visible } from './helpers';
import { fraccionNoFondo, muestrearCanvas, pixelesNoRojos, puntosBrillantes } from './pixels';

/** Visión §3 "Cielo" (tipo Stellarium): cielo arrastrable + tiempo + modo rojo. */
const URL_CIELO = '/?tab=cielo&punto=susques&fecha=2026-11-22T23:30';

function lienzo(page: Page) {
  return visible(page.getByRole('main').locator('canvas'));
}
async function encabezado(page: Page): Promise<string> {
  const l = visible(page.getByText(/mirando (al|hacia)/i));
  return ((await l.textContent()) ?? '').replace(/\s+/g, ' ').trim();
}

test.describe('Cielo en vivo (15)', () => {
  test('15a · canvas visible y con contenido (no vacío)', async ({ page }) => {
    await page.goto(URL_CIELO);
    const cv = lienzo(page);
    await expect(cv, 'Se esperaba el canvas del cielo').toBeVisible({ timeout: 15_000 });
    await expect(visible(page.getByRole('img', { name: /cielo/i })), 'El canvas debería tener nombre accesible').toBeVisible();
    await page.waitForTimeout(1200);
    const m = await muestrearCanvas(page, cv);
    const f = fraccionNoFondo(m);
    expect(f, `Fracción de píxeles distintos del fondo: ${(f * 100).toFixed(2)} % (fuente ${m.fuente})`).toBeGreaterThan(0.005);
  });

  test('15b · tocar un objeto abre su ficha con altura y azimut', async ({ page }) => {
    await page.goto(URL_CIELO);
    const cv = lienzo(page);
    await expect(cv).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1200);
    const pts = await puntosBrillantes(cv, 25);
    expect(pts.length, 'No encontré objetos brillantes tocables en el canvas').toBeGreaterThan(0);
    const ficha = visible(page.getByText(/azimut/i));
    let abierta = false;
    for (const p of pts) {
      await page.mouse.click(p.x, p.y);
      if (await ficha.isVisible({ timeout: 600 }).catch(() => false)) {
        abierta = true;
        break;
      }
    }
    expect(abierta, `Ningún toque sobre ${pts.length} objetos brillantes abrió una ficha`).toBe(true);
    const datos = await page.evaluate(() => {
      const t = document.body.innerText.replace(/\s+/g, ' ');
      return {
        altura: t.match(/altura\s*:?\s*(−|-)?\d+([.,]\d+)?\s*°/i)?.[0] ?? null,
        azimut: t.match(/azimut\s*:?\s*\d+([.,]\d+)?\s*°/i)?.[0] ?? null,
      };
    });
    expect(datos.altura, 'La ficha debería mostrar la altura en grados').not.toBeNull();
    expect(datos.azimut, 'La ficha debería mostrar el azimut en grados').not.toBeNull();
    await expect(visible(page.getByRole('heading', { level: 2 }).or(page.getByRole('heading', { level: 3 })))).toBeVisible();
  });

  test('15c · botones N/E/S/O y arrastre cambian "Mirando al …"', async ({ page }) => {
    await page.goto(URL_CIELO);
    const cv = lienzo(page);
    await expect(cv).toBeVisible({ timeout: 15_000 });
    for (const [b, re] of [
      ['N', /norte/i],
      ['E', /\beste\b/i],
      ['S', /\bsur\b/i],
      ['O', /oeste/i],
    ] as const) {
      const btn = visible(page.getByRole('button', { name: b, exact: true }));
      await expect(btn, `Falta el botón ${b}`).toBeVisible();
      await btn.click();
      await expect.poll(() => encabezado(page), { message: `Tras tocar ${b} debería decir "Mirando al …${re.source}"` }).toMatch(re);
    }
    // vuelve al sur y arrastra
    await visible(page.getByRole('button', { name: 'S', exact: true })).click();
    await expect.poll(() => encabezado(page)).toMatch(/\bsur\b/i);
    await page.waitForTimeout(1200); // fin de la animación de lookAt
    const antes = await encabezado(page);
    const box = (await cv.boundingBox())!;
    // arrastre de ~60 % del ancho (≈ 90° en desktop) + un poco vertical
    const x0 = box.x + box.width * 0.2, y0 = box.y + box.height * 0.45;
    const dx = box.width * 0.6, dy = box.height * 0.15;
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    for (let i = 1; i <= 20; i++) await page.mouse.move(x0 + (dx * i) / 20, y0 + (dy * i) / 20, { steps: 2 });
    await page.mouse.up();
    await expect.poll(() => encabezado(page), { message: 'El arrastre debería cambiar el encabezado' }).not.toBe(antes);
  });

  test('15d · el slider de tiempo cambia la hora mostrada', async ({ page }) => {
    await page.goto(URL_CIELO);
    await expect(lienzo(page)).toBeVisible({ timeout: 15_000 });
    await expect(visible(page.getByText(/^23:30$/)), 'Debería mostrar 23:30 (fecha del deep link)').toBeVisible();
    const slider = visible(page.getByRole('slider', { name: /hora|tiempo/i }));
    await expect(slider, 'Se esperaba un slider de tiempo accesible').toBeVisible();
    await slider.focus();
    await page.keyboard.press('End');
    await page.waitForTimeout(300);
    const v = (await slider.getAttribute('aria-valuetext')) ?? '';
    expect(v, 'aria-valuetext debería ser una hora').toMatch(/\d{1,2}:\d{2}/);
    expect(v).not.toMatch(/23:30/);
    const hh = v.match(/\d{1,2}:\d{2}/)![0];
    await expect(visible(page.getByText(new RegExp(`^${hh}$`))), `La hora mostrada debería ser ${hh}`).toBeVisible();
    await expect(page.getByText(/^23:30$/).filter({ visible: true })).toHaveCount(0);
  });

  test('15e · modo rojo: ningún píxel azul/verde en el canvas', async ({ page }) => {
    await page.goto(URL_CIELO);
    const cv = lienzo(page);
    await expect(cv).toBeVisible({ timeout: 15_000 });
    await visible(control(page, /modo rojo|visi[oó]n nocturna/i)).click();
    await expect(page.locator('html')).toHaveAttribute('data-modo', 'rojo');
    await page.waitForTimeout(1200);
    const m = await muestrearCanvas(page, cv);
    expect(fraccionNoFondo(m), 'En modo rojo el canvas no debería quedar vacío').toBeGreaterThan(0.002);
    const r = pixelesNoRojos(m);
    expect(r.n, `${r.n}/${r.total} píxeles con b>r o g>r en modo rojo (fuente ${m.fuente}). Ej.: ${r.ejemplos.join(' ')}`).toBe(0);
  });
});
