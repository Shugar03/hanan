import { test, expect, type Locator, type Page } from './base';
import { control, visible } from './helpers';
import { decodificarPng, fraccionCambio, fraccionCambioExcluyendo } from './pixels';

/** Visión §5 (motor de recomendaciones: top 3 planes con porqué, checklist, alternativa sin auto) y §3 Explorar (capas). */

function planes(page: Page): Locator {
  return page.getByRole('main').getByRole('listitem').filter({ has: page.getByRole('heading', { name: /por qu[eé]/i }) });
}

async function configurar(page: Page) {
  await page.goto('/?tab=noche');
  const via = visible(control(page, /v[ií]a l[aá]ctea/i));
  await expect(via, 'Objetivo "Vía Láctea"').toBeVisible();
  await via.click();
  const sinAuto = visible(control(page, /no,? busco|sin auto|no tengo auto|^no$/i));
  await expect(sinAuto, 'Opción "sin auto"').toBeVisible();
  await sinAuto.click();
  const base = visible(page.getByRole('combobox', { name: /sal[ií]s desde|base|desde d[oó]nde/i }));
  await expect(base, 'Selector de base').toBeVisible();
  const v = await base.evaluate((e) => Array.from((e as HTMLSelectElement).options).find((o) => /tilcara/i.test(o.text))?.value);
  expect(v, 'Tilcara debería ser una base posible').toBeTruthy();
  await base.selectOption(v!);
  await page.waitForTimeout(400);
}

async function titulosPlanes(page: Page): Promise<string[]> {
  return planes(page).getByRole('heading', { level: 2 }).allInnerTexts();
}

test.describe('Mi noche (19)', () => {
  test('19a · Vía Láctea + sin auto + Tilcara → 3 planes con porqué, checklist y salida de guía', async ({ page }) => {
    await configurar(page);
    await expect(planes(page), 'Se esperaban exactamente 3 planes').toHaveCount(3);
    let conGuia = 0;
    for (let i = 0; i < 3; i++) {
      const p = planes(page).nth(i);
      const info = await p.evaluate((el) => {
        const hs = Array.from(el.querySelectorAll('h1,h2,h3,h4,[role="heading"]'));
        const pq = hs.find((h) => /por qu[eé]/i.test(h.textContent ?? ''));
        const sib = pq?.nextElementSibling;
        return { porque: (sib?.textContent ?? '').trim(), texto: (el as HTMLElement).innerText };
      });
      expect(info.porque.length, `Plan ${i + 1}: "Por qué" vacío`).toBeGreaterThan(10);
      await expect(p.getByRole('heading', { name: /checklist/i }), `Plan ${i + 1}: falta checklist`).toBeVisible();
      expect(await p.getByRole('checkbox').count(), `Plan ${i + 1}: checklist sin ítems`).toBeGreaterThan(0);
      expect(info.texto, `Plan ${i + 1} no debería decir "Sin pronóstico"`).not.toMatch(/sin pron[oó]stico/i);
      if (/salida de gu[ií]a/i.test(info.texto) && !/no hay salidas/i.test(info.texto)) conGuia++;
    }
    expect(conGuia, 'Sin auto: al menos un plan debería proponer una salida de guía').toBeGreaterThan(0);
  });

  test('19b · guardar plan: persiste tras reload y offline', async ({ page, context }) => {
    await configurar(page);
    await expect(planes(page)).toHaveCount(3);
    const antes = await titulosPlanes(page);
    const guardar = visible(page.getByRole('button', { name: /guardar/i }));
    await expect(guardar).toBeVisible();
    await guardar.click();

    await page.reload();
    await expect(visible(page.getByRole('heading', { name: new RegExp(antes[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })), 'El plan guardado debería persistir tras recargar').toBeVisible();
    await expect(visible(control(page, /v[ií]a l[aá]ctea/i))).toHaveAttribute('aria-pressed', 'true');

    const sw = await page.evaluate(() =>
      Promise.race([navigator.serviceWorker?.ready.then(() => 'ready'), new Promise((r) => setTimeout(() => r('timeout'), 10_000))]),
    );
    expect(sw, 'Se esperaba service worker activo').toBe('ready');
    await page.reload();
    await page.waitForTimeout(1000);
    await context.setOffline(true);
    await page.reload();
    await expect(visible(page.getByRole('heading', { name: new RegExp(antes[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })), 'Offline: el plan guardado debería seguir visible').toBeVisible({ timeout: 15_000 });
    await context.setOffline(false);
  });
});

async function capturaMapa(page: Page, mapa: Locator) {
  return decodificarPng(page, await mapa.screenshot({ animations: 'disabled' }), 30_000);
}

async function esperarMapaQuieto(page: Page, mapa: Locator) {
  let prev = await capturaMapa(page, mapa);
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(700);
    const cur = await capturaMapa(page, mapa);
    if (fraccionCambio(prev, cur) < 0.01) return cur;
    prev = cur;
  }
  return prev;
}

test.describe('Explorar · capas (20)', () => {
  for (const capa of [
    { nombre: 'Nubes', re: /nubosidad total|^nubes$|capa nubes$/i, leyenda: /%/, extra: /nub/i },
    { nombre: 'Score', re: /capa score|score de cielo: activa|^score$/i, leyenda: /excelente|muy bueno|aceptable|malo/i, extra: /score/i },
  ]) {
    test(`20 · capa ${capa.nombre}: leyenda con unidades/etiquetas, scrubber y píxeles en el mapa`, async ({ page }) => {
      await page.goto('/?tab=explorar&punto=susques');
      const mapa = visible(page.getByRole('region', { name: /mapa/i }));
      await expect(mapa).toBeVisible({ timeout: 15_000 });
      const chip = visible(control(page, capa.re));
      await expect(chip, `Se esperaba el control de la capa ${capa.nombre}`).toBeVisible();
      const antes = await esperarMapaQuieto(page, mapa);
      await chip.click();
      await expect(chip).toHaveAttribute('aria-pressed', 'true');

      const leyenda = visible(page.getByRole('img', { name: /escala/i }).or(page.getByText(/escala|leyenda/i)));
      await expect(leyenda, 'Se esperaba una leyenda').toBeVisible();
      const region = visible(page.getByRole('region', { name: /capas/i }).or(page.getByRole('complementary', { name: /capas/i })));
      const texto = (await region.isVisible().catch(() => false)) ? await region.innerText() : await page.locator('body').innerText();
      expect(texto, `Leyenda de ${capa.nombre}: unidades/etiquetas`).toMatch(capa.leyenda);
      expect(texto).toMatch(capa.extra);
      await expect(visible(page.getByRole('slider', { name: /hora|pron[oó]stico|tiempo/i })), 'Se esperaba el scrubber de horas').toBeVisible();

      await page.waitForTimeout(800);
      const despues = await esperarMapaQuieto(page, mapa);
      // Excluir overlays HTML (controles de capas, pines, chips) para medir solo lo pintado en el mapa
      const mb = (await mapa.boundingBox())!;
      const sx = despues.w / mb.width, sy = despues.h / mb.height;
      const overlays = [
        ...(await mapa.getByRole('button').all()),
        ...(await page.getByRole('region', { name: /capas/i }).all()),
        ...(await page.getByRole('link', { name: /paso de jama/i }).all()),
        ...(await page.getByRole('group').all()),
      ];
      const excl: { x: number; y: number; width: number; height: number }[] = [];
      for (const o of overlays) {
        const b = await o.boundingBox().catch(() => null);
        if (b) excl.push({ x: (b.x - mb.x) * sx - 2, y: (b.y - mb.y) * sy - 2, width: b.width * sx + 4, height: b.height * sy + 4 });
      }
      const f = fraccionCambioExcluyendo(antes, despues, excl);
      expect(f, `La capa debería pintar el mapa (cambió ${(f * 100).toFixed(1)} % de los píxeles)`).toBeGreaterThan(0.05);
    });
  }
});
