import { test, expect, type Locator, type Page } from './base';
import { control, visible } from './helpers';
import { PESTANAS, esActiva, pestana, scoreDe } from './nav';

async function activas(page: Page): Promise<string[]> {
  const out: string[] = [];
  for (const t of PESTANAS) if (await esActiva(pestana(page, t.re))) out.push(t.id);
  return out;
}

test.describe('Navegación por pestañas (visión §3)', () => {
  test('14a · las 4 pestañas tienen nombre accesible y aria-current en la activa', async ({ page }) => {
    await page.goto('/');
    for (const t of PESTANAS) {
      await expect(pestana(page, t.re), `Falta la pestaña "${t.id}" con nombre accesible`).toBeVisible();
    }
    expect(await activas(page), 'Al abrir, la activa debería ser Explorar').toEqual(['explorar']);
    for (const t of PESTANAS) {
      await pestana(page, t.re).click();
      await expect.poll(() => activas(page), { message: `Tras tocar "${t.id}", solo ella debería tener aria-current` }).toEqual([t.id]);
      const cur = await pestana(page, t.re).getAttribute('aria-current');
      if (cur !== null) expect(cur).toMatch(/^(page|true|location|step)$/);
    }
  });

  test('14b · deep link restaura pestaña y punto', async ({ page }) => {
    await page.goto('/?tab=explorar&punto=tilcara');
    await expect(visible(page.getByRole('heading', { level: 1, name: /tilcara/i })), 'Explorar debería abrir el punto Tilcara').toBeVisible();
    expect(await activas(page)).toEqual(['explorar']);

    await page.goto('/?tab=cielo&punto=jama');
    await expect.poll(() => activas(page)).toEqual(['cielo']);
    await expect(
      visible(page.getByRole('img', { name: /jama/i }).or(page.getByRole('main').getByText(/\bjama\b/i))),
      'Cielo debería abrir desde Jama',
    ).toBeVisible();

    await page.goto('/?tab=salidas&punto=olaroz');
    await expect.poll(() => activas(page)).toEqual(['salidas']);

    await page.goto('/?tab=noche');
    await expect.poll(() => activas(page)).toEqual(['noche']);
    await expect(visible(page.getByRole('heading', { level: 1, name: /mi noche/i }))).toBeVisible();
  });

  test('14c · el back del navegador vuelve a la pestaña anterior', async ({ page }) => {
    await page.goto('/?tab=explorar&punto=susques');
    await pestana(page, PESTANAS[2].re).click(); // Salidas
    await expect.poll(() => activas(page)).toEqual(['salidas']);
    await pestana(page, PESTANAS[3].re).click(); // Mi noche
    await expect.poll(() => activas(page)).toEqual(['noche']);

    await page.goBack();
    await expect
      .poll(async () => (page.url().startsWith('about:') ? ['(salió de la app)'] : activas(page)), {
        message: 'Back desde Mi noche debería volver a Salidas (no salir de la app)',
      })
      .toEqual(['salidas']);
    await page.goBack();
    await expect
      .poll(async () => (page.url().startsWith('about:') ? ['(salió de la app)'] : activas(page)), {
        message: 'Un segundo back debería volver a Explorar',
      })
      .toEqual(['explorar']);
  });
});

test.describe('Consistencia del score (17)', () => {
  test('17 · Susques viernes 27: mismo número en Explorar, Salidas y Mi noche', async ({ page }) => {
    // Explorar: chip/pestaña de la noche del viernes 27
    await page.goto('/?tab=explorar&punto=susques');
    const chip = visible(control(page, /vie(rnes)?\.?\s*27/i));
    await expect(chip, 'Explorar: falta el chip de la noche del viernes 27').toBeVisible();
    const nombre = (await chip.getAttribute('aria-label')) ?? '';
    const texto = (await chip.innerText()).replace(/\s+/g, ' ');
    const sExplorar = scoreDe(nombre) ?? Number(texto.replace(/vie\w*\.?\s*27/i, '').match(/\b(100|\d{1,2})\b/)?.[1] ?? NaN);
    expect(Number.isFinite(sExplorar), `No pude leer el score del chip ("${nombre}" / "${texto}")`).toBe(true);

    // Salidas: cards de Susques esa noche
    await page.goto('/?tab=salidas&punto=susques');
    const filtroPunto = visible(page.getByRole('combobox', { name: /punto/i }));
    if (await filtroPunto.isVisible().catch(() => false)) {
      const opt = await filtroPunto.evaluate((e) => Array.from((e as HTMLSelectElement).options).find((o) => /susques/i.test(o.text))?.value);
      if (opt) await filtroPunto.selectOption(opt);
    }
    const filtroNoche = visible(control(page, /vie(rnes)?\.?\s*27/i));
    if (await filtroNoche.isVisible().catch(() => false)) await filtroNoche.click();
    const cards = page.getByRole('main').getByRole('listitem').filter({ hasText: /susques/i }).filter({ hasText: /vie(rnes)?\.?\s*27|21:30|22:00|23:00/i });
    await expect(cards.first(), 'Salidas: se esperaba al menos una salida a Susques el viernes 27').toBeVisible();
    const n = await cards.count();
    const scoresSalidas: number[] = [];
    for (let i = 0; i < n; i++) {
      const c = cards.nth(i);
      const btn = c.getByRole('button').first();
      const name = (await btn.count()) ? (await btn.getAttribute('aria-label')) ?? '' : '';
      if (name && !/vie(rnes)?\.?\s*27/i.test(name)) continue;
      const s = scoreDe(name) ?? scoreDe((await c.innerText()).replace(/\s+/g, ' '));
      if (s !== null) scoresSalidas.push(s);
    }
    expect(scoresSalidas.length, 'Salidas: no pude leer el score de ninguna card del viernes 27').toBeGreaterThan(0);
    for (const s of scoresSalidas) expect(s, 'Salidas: el score de la card difiere del chip de Explorar').toBe(sExplorar);

    // Mi noche: si aparece un plan Susques · viernes 27, mismo número
    await page.goto('/?tab=noche');
    await page.waitForTimeout(800);
    const plan = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: /susques.*vie(rnes)?\.?\s*27/i }) });
    if (await plan.count()) {
      const s = scoreDe((await plan.first().innerText()).replace(/\s+/g, ' '));
      expect(s, 'Mi noche: el plan Susques viernes 27 debería mostrar el mismo score').toBe(sExplorar);
    } else {
      test.info().annotations.push({ type: 'nota', description: 'Mi noche no mostró un plan Susques · viernes 27 con las preferencias por defecto' });
    }
  });
});

test.describe('Mobile: barra de pestañas y targets (21)', () => {
  test('21a · la barra inferior no tapa Reservar en la ficha de una salida', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Solo mobile');
    await page.goto('/?tab=salidas&punto=susques');
    const card = visible(page.getByRole('main').getByRole('listitem').filter({ hasText: /\d+\s+lugar/i }).getByRole('button'));
    await expect(card, 'Se esperaba una salida con lugares').toBeVisible();
    await card.click();
    const reservar = visible(page.getByRole('button', { name: /^reservar/i }).or(page.getByRole('link', { name: /^reservar/i })));
    await expect(reservar).toBeVisible();
    await reservar.scrollIntoViewIfNeeded();
    const nav = visible(page.getByRole('navigation', { name: /secciones|pesta|principal/i }));
    await expect(nav, 'Se esperaba la barra de pestañas').toBeVisible();
    const a = (await reservar.boundingBox())!;
    const b = (await nav.boundingBox())!;
    const solapa = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    expect(solapa, `Reservar ${JSON.stringify(a)} se superpone con la barra ${JSON.stringify(b)}`).toBe(false);
    const arriba = await reservar.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!top && (top === el || el.contains(top));
    });
    expect(arriba, 'El centro de Reservar está tapado por otro elemento').toBe(true);
    await reservar.click({ trial: true, timeout: 3_000 });
  });

  test('21b · targets principales ≥ 44 px en mobile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Solo mobile');
    const chicos: string[] = [];
    const medir = async (nombre: string, l: Locator) => {
      await l.waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
      if (!(await l.isVisible().catch(() => false))) {
        chicos.push(`${nombre}: no visible`);
        return;
      }
      await l.scrollIntoViewIfNeeded().catch(() => {});
      const b = (await l.boundingBox())!;
      if (b.height < 44 || b.width < 44) chicos.push(`${nombre}: ${Math.round(b.width)}×${Math.round(b.height)}`);
    };
    await page.goto('/?tab=explorar&punto=susques');
    for (const t of PESTANAS) await medir(`Pestaña ${t.id}`, pestana(page, t.re));
    await medir('Simulador de fecha', visible(control(page, /simulador/i)));
    await medir('Modo guía', visible(control(page, /modo gu[ií]a|soy gu[ií]a/i)));
    await medir('Modo rojo', visible(control(page, /modo rojo/i)));
    await medir('Quiero ir', visible(page.getByRole('button', { name: /quiero ir/i })));
    for (const p of ['Purmamarca', 'Susques', 'Tilcara']) await medir(`Chip ${p}`, visible(page.getByRole('navigation', { name: /puntos/i }).getByRole('button', { name: new RegExp(p, 'i') })));

    await page.goto('/?tab=cielo&punto=susques&fecha=2026-11-22T23:30');
    for (const d of ['N', 'E', 'S', 'O']) await medir(`Cielo ${d}`, visible(page.getByRole('button', { name: d, exact: true })));
    await medir('Cielo Ahora', visible(page.getByRole('button', { name: /^ahora$/i })));

    await page.goto('/?tab=salidas&punto=susques');
    await medir('Ordenar Precio', visible(page.getByRole('radio', { name: /precio/i }).or(page.getByRole('button', { name: /precio/i }))));
    const card = visible(page.getByRole('main').getByRole('listitem').filter({ hasText: /\d+\s+lugar/i }).getByRole('button'));
    await medir('Card de salida', card);
    await card.click();
    await medir('Reservar', visible(page.getByRole('button', { name: /^reservar/i })));
    await visible(page.getByRole('button', { name: /^reservar/i })).click();
    await medir('Una persona más', visible(page.getByRole('button', { name: /persona m[aá]s|^\+$/i })));
    await medir('Una persona menos', visible(page.getByRole('button', { name: /persona menos|^[−-]$/i })));

    await page.goto('/?tab=noche');
    await medir('Mi noche: Vía Láctea', visible(control(page, /v[ií]a l[aá]ctea/i)));
    await medir('Mi noche: Guardar', visible(page.getByRole('button', { name: /guardar/i })));

    expect(chicos, `Targets < 44 px o ausentes:\n${chicos.join('\n')}`).toEqual([]);
  });
});
