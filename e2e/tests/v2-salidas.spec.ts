import { test, expect, type Locator, type Page } from './base';
import fs from 'node:fs';
import { control, hoyJujuy, visible } from './helpers';
import { PESTANAS, pestana, scoreDe } from './nav';

/** Visión §4 (Marketplace): feed, ficha tipo Luma, reserva con seña, .ics + WhatsApp, garantía de cielo. */

const precioDe = (t: string): number | null => {
  const m = t.match(/\$\s*([\d.]+)/);
  return m ? Number(m[1].replace(/\./g, '')) : null;
};
const lugaresDe = (t: string): number | null => {
  if (/agotad/i.test(t)) return 0;
  const m = t.match(/(\d+)\s*(lugares|lugar|cupos?)\b/i);
  return m ? Number(m[1]) : null;
};

function cards(page: Page): Locator {
  return page.getByRole('main').getByRole('listitem').filter({ has: page.getByRole('button') }).filter({ hasText: /\$|lugar|agotad/i });
}

async function textos(l: Locator): Promise<string[]> {
  return (await l.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
}

async function todosLosPuntos(page: Page) {
  const f = visible(page.getByRole('combobox', { name: /punto/i }));
  if (await f.isVisible().catch(() => false)) {
    const v = await f.evaluate((e) => Array.from((e as HTMLSelectElement).options).find((o) => /todos/i.test(o.text))?.value);
    if (v !== undefined) await f.selectOption(v);
  }
}

async function abrirReserva(page: Page, card: Locator) {
  await card.getByRole('button').first().click();
  const reservar = visible(page.getByRole('button', { name: /^reservar/i }).or(page.getByRole('link', { name: /^reservar/i })));
  await expect(reservar, 'La ficha debería tener "Reservar"').toBeVisible();
  await reservar.click();
}

async function personas(page: Page): Promise<number> {
  const st = visible(page.getByRole('status').filter({ hasText: /^\s*\d+\s*(persona)?/i }).or(page.getByRole('spinbutton', { name: /persona/i })));
  const isInput = await st.evaluate((e) => e.tagName === 'INPUT');
  const t = isInput ? await st.inputValue() : ((await st.getAttribute('aria-label')) ?? (await st.innerText()));
  return Number(t.match(/\d+/)?.[0] ?? NaN);
}
const masUno = (page: Page) => visible(page.getByRole('button', { name: /persona m[aá]s|sumar persona|^\+$|agregar persona/i }));

test.describe('Salidas · marketplace (16)', () => {
  test('16a · feed: cards con "ejemplo" y score número + etiqueta', async ({ page }) => {
    await page.goto('/?tab=salidas');
    await todosLosPuntos(page);
    await expect(cards(page).first(), 'El feed debería tener cards de salidas').toBeVisible();
    const ts = await textos(cards(page));
    expect(ts.filter((t) => /ejemplo/i.test(t)).length, 'Al menos una card con etiqueta "ejemplo"').toBeGreaterThan(0);
    const conScore = ts.filter((t) => /\b(100|\d{1,2})\b\s*(Excelente|Muy bueno|Aceptable|Malo)\b/.test(t));
    expect(conScore.length, 'Al menos una card con score número + etiqueta').toBeGreaterThan(0);
  });

  test('16b · ordenar por Precio reordena y filtrar por punto filtra', async ({ page }) => {
    await page.goto('/?tab=salidas');
    await todosLosPuntos(page);
    await expect(cards(page).first()).toBeVisible();
    const antes = await textos(cards(page));
    const ordenPrecio = visible(control(page, /^precio$/i));
    await expect(ordenPrecio, 'Se esperaba la opción de orden "Precio"').toBeVisible();
    await ordenPrecio.click();
    await page.waitForTimeout(300);
    const despues = await textos(cards(page));
    const precios = despues.map(precioDe).filter((x): x is number => x !== null);
    expect(precios.length, 'Las cards deberían mostrar precio').toBeGreaterThan(1);
    const asc = precios.every((p, i) => i === 0 || p >= precios[i - 1]);
    const desc = precios.every((p, i) => i === 0 || p <= precios[i - 1]);
    expect(asc || desc, `Ordenado por precio debería quedar monótono: ${precios.join(', ')}`).toBe(true);
    const preciosAntes = antes.map(precioDe).filter((x): x is number => x !== null);
    const yaOrdenado = preciosAntes.every((p, i) => i === 0 || p >= preciosAntes[i - 1]) || preciosAntes.every((p, i) => i === 0 || p <= preciosAntes[i - 1]);
    if (!yaOrdenado) expect(despues, 'El orden debería cambiar al elegir Precio').not.toEqual(antes);

    const filtro = visible(page.getByRole('combobox', { name: /punto/i }).or(page.getByRole('group', { name: /punto/i })));
    await expect(filtro, 'Se esperaba un filtro por punto').toBeVisible();
    for (const nombre of ['Susques', 'Olaroz']) {
      const v = await filtro.evaluate((e, n) => Array.from((e as HTMLSelectElement).options ?? []).find((o) => o.text.includes(n))?.value, nombre);
      if (v !== undefined) await filtro.selectOption(v);
      else await visible(filtro.getByRole('button', { name: new RegExp(nombre, 'i') })).click();
      await page.waitForTimeout(300);
      const ts = await textos(cards(page));
      if (nombre === 'Susques') expect(ts.length, 'Susques debería tener salidas').toBeGreaterThan(0);
      for (const t of ts) expect(t, `Con filtro ${nombre}, todas las cards deberían ser de ese punto`).toMatch(new RegExp(nombre, 'i'));
    }
  });

  test('16c · ficha + reserva 2 personas: seña 30 %, WhatsApp, .ics, Mis reservas tras reload, garantía', async ({ page, context }) => {
    await context.route(/wa\.me|whatsapp\.com/, (r) => r.fulfill({ status: 200, body: 'ok-e2e' }));
    await page.goto('/?tab=salidas&punto=susques');
    const card = cards(page).filter({ hasText: /susques/i }).filter({ hasText: /\$/ }).filter({ hasNotText: /agotad|sin pron/i }).filter({ hasText: /([2-9]|\d{2,})\s+lugares/i }).first();
    await expect(card, 'Se esperaba una salida a Susques con ≥ 2 lugares').toBeVisible();
    await card.getByRole('button').first().click();

    // Ficha tipo Luma
    await expect(visible(page.getByRole('heading', { level: 1 })), 'La ficha debería tener título').toBeVisible();
    await expect(visible(page.getByText(/garant[ií]a de cielo/i)), 'La ficha debería mostrar la garantía de cielo').toBeVisible();
    const garantia = await page.getByRole('main').innerText();
    expect(garantia, 'La garantía debería explicar la regla (score < 40, T−6 h)').toMatch(/40/);
    const titulo = ((await visible(page.getByRole('heading', { level: 1 })).textContent()) ?? '').trim();
    const precio = precioDe(await page.getByRole('main').innerText());
    expect(precio, 'La ficha debería mostrar el precio por persona').not.toBeNull();

    const reservar = visible(page.getByRole('button', { name: /^reservar/i }).or(page.getByRole('link', { name: /^reservar/i })));
    await reservar.click();
    const mas = masUno(page);
    await expect(mas, 'Se esperaba un control para sumar personas').toBeVisible();
    while ((await personas(page)) < 2) await mas.click();
    expect(await personas(page)).toBe(2);
    await visible(page.getByRole('button', { name: /continuar|siguiente|ver resumen/i })).click();

    // Resumen: seña 30 % = 0,3 × precio × 2
    await expect(visible(page.getByText(/resumen/i))).toBeVisible();
    const resumen = (await page.getByRole('main').innerText()).replace(/[  ]/g, ' ');
    const m = resumen.match(/se[ñn]a[^$\n]*30\s*%[^$]*?\$\s*([\d.]+)/i);
    expect(m, `El resumen debería mostrar "Seña 30 %" con monto:\n${resumen.slice(0, 600)}`).not.toBeNull();
    const sena = Number(m![1].replace(/\./g, ''));
    expect(sena, 'Seña = 0,3 × precio × 2').toBe(Math.round(0.3 * precio! * 2));

    await visible(page.getByRole('button', { name: /pagar|confirmar|reservar/i })).click();

    // Confirmación: WhatsApp + .ics
    await expect(visible(page.getByText(/confirmad/i)), 'Se esperaba la confirmación').toBeVisible();
    const wa = visible(page.getByRole('link', { name: /whats ?app/i }));
    await expect(wa).toBeVisible();
    const u = new URL((await wa.getAttribute('href'))!);
    expect(u.hostname).toBe('wa.me');
    expect(u.searchParams.get('text') ?? '', 'El mensaje de WhatsApp debería nombrar el punto').toMatch(/susques/i);

    const ics = visible(page.getByRole('link', { name: /\.ics|calendario/i }).or(page.getByRole('button', { name: /\.ics|calendario/i })));
    await expect(ics, 'Se esperaba la descarga .ics').toBeVisible();
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8_000 }), ics.click()]);
    expect(dl.suggestedFilename()).toMatch(/\.ics$/i);
    const contenido = fs.readFileSync((await dl.path())!, 'utf8');
    expect(contenido).toContain('BEGIN:VCALENDAR');
    expect(contenido).toMatch(/DTSTART[:;]/);
    expect(contenido).toContain('BEGIN:VEVENT');

    // Mis reservas tras reload
    await page.reload();
    await page.goto('/?tab=salidas');
    const region = visible(page.getByRole('region', { name: /mis reservas/i }));
    await expect(region, 'Se esperaba la sección "Mis reservas"').toBeVisible({ timeout: 10_000 });
    await expect(region.getByText(titulo, { exact: false }).first(), `"${titulo}" debería figurar en Mis reservas tras recargar`).toBeVisible();
    await expect(region.getByText(/2 personas/i).first()).toBeVisible();
  });

  test('16d · no permite reservar más personas que los lugares restantes', async ({ page }) => {
    await page.goto('/?tab=salidas');
    await todosLosPuntos(page);
    await expect(cards(page).first()).toBeVisible();
    const ts = await textos(cards(page));
    let idx = -1, min = Infinity;
    ts.forEach((t, i) => {
      const n = lugaresDe(t);
      if (n !== null && n > 0 && n < min && !/sin pron/i.test(t)) { min = n; idx = i; }
    });
    expect(idx, 'Se esperaba alguna salida con lugares').toBeGreaterThanOrEqual(0);
    await abrirReserva(page, cards(page).nth(idx));
    const mas = masUno(page);
    await expect(mas).toBeVisible();
    for (let i = 0; i < min + 3; i++) {
      if (await mas.isDisabled()) break;
      await mas.click();
    }
    const n = await personas(page);
    expect(n, `Quedaban ${min} lugares y el selector llegó a ${n}`).toBeLessThanOrEqual(min);
    expect(n).toBe(min);
    await expect(mas, 'El botón + debería deshabilitarse al llegar al cupo restante').toBeDisabled();

    // Una salida agotada no se puede reservar (o va a lista de espera)
    const agotada = cards(page);
    await page.goto('/?tab=salidas');
    await todosLosPuntos(page);
    const ag = agotada.filter({ hasText: /agotad/i }).first();
    if (await ag.count()) {
      await ag.getByRole('button').first().click();
      const r = visible(page.getByRole('button', { name: /^reservar/i }));
      if (await r.isVisible().catch(() => false)) {
        expect(await r.isDisabled(), 'Salida agotada: "Reservar" debería estar deshabilitado (o ser lista de espera)').toBe(true);
      }
    }
  });
});

test.describe('Modo guía · crear salida completa (18)', () => {
  test('18 · validación con errores y salida publicada aparece en el feed rotulada como tuya', async ({ page }) => {
    await page.goto('/?guia');
    const abrir = visible(page.getByText(/crear salida completa/i));
    await expect(abrir, 'Se esperaba "Crear salida completa" en el modo guía').toBeVisible();
    await abrir.click();
    const precio = visible(page.getByLabel(/precio por persona/i));
    await expect(precio, 'El formulario completo debería pedir precio por persona').toBeVisible();
    const form = page.locator('form').filter({ has: page.getByLabel(/precio por persona/i) });
    const publicar = form.getByRole('button', { name: /publicar|crear/i }).last();

    // 1) enviar vacío → errores
    const titulo = form.getByLabel(/t[ií]tulo/i);
    await titulo.fill('');
    await precio.fill('');
    await publicar.click();
    const errores = form.locator('[aria-invalid="true"]');
    await expect
      .poll(() => errores.count(), { message: 'Enviar vacío debería marcar campos inválidos (aria-invalid)' })
      .toBeGreaterThan(0);
    await expect(visible(page.getByRole('alert')), 'Debería anunciar los errores (role=alert)').toBeVisible();

    // 2) completar todo
    const marca = `E2E ${Date.now().toString().slice(-5)}`;
    const dia = hoyJujuy(new Date(Date.now() + 2 * 86400_000));
    await form.getByLabel(/nombre/i).fill('Guía E2E');
    await form.getByLabel(/whats ?app/i).fill('5493880009999');
    await titulo.fill(`Cielo ${marca}`);
    const punto = form.getByLabel(/punto de observaci[oó]n/i);
    const v = await punto.evaluate((e) => Array.from((e as HTMLSelectElement).options).find((o) => /susques/i.test(o.text))?.value);
    await punto.selectOption(v!);
    await form.getByLabel(/^fecha$/i).fill(dia);
    await form.getByLabel(/hora/i).first().fill('22:00');
    await form.getByLabel(/duraci[oó]n/i).fill('3');
    await precio.fill('43000');
    await form.getByLabel(/cupo m[ií]nimo/i).fill('2');
    await form.getByLabel(/cupo m[aá]ximo/i).fill('9');
    const es = form.getByRole('button', { name: /espa[ñn]ol/i });
    if ((await es.count()) && (await es.getAttribute('aria-pressed')) !== 'true') await es.click();
    const tele = form.getByRole('button', { name: /telescopio/i });
    if ((await tele.count()) && (await tele.getAttribute('aria-pressed')) !== 'true') await tele.click();
    await form.getByLabel(/punto de encuentro/i).fill('Susques');
    const bajo = form.getByRole('radio', { name: /bajo/i });
    if (await bajo.count()) await bajo.click();
    await form.getByLabel(/altura m[aá]xima/i).fill('3700');
    const pol = form.getByLabel(/garant[ií]a|pol[ií]tica/i);
    if (!(await pol.inputValue())) await pol.fill('Si el score cae < 40 a T−6 h, reprogramamos o devolvemos la seña.');
    await publicar.click();
    await expect(form.locator('[aria-invalid="true"]'), 'Con todo completo no debería haber errores').toHaveCount(0);

    // 3) aparece en Salidas rotulada como tuya
    await pestana(page, PESTANAS[2].re).click();
    await todosLosPuntos(page);
    const mia = cards(page).filter({ hasText: marca });
    await expect(mia.first(), `La salida "Cielo ${marca}" debería aparecer en el feed`).toBeVisible();
    await expect(mia.first(), 'Debería estar rotulada como tuya').toContainText(/tuya|tu salida|propia|publicada por vos/i);
    await expect(mia.first(), 'Debería mostrar el precio cargado').toContainText(/43\.000/);
    const s = scoreDe((await mia.first().innerText()).replace(/\s+/g, ' '));
    expect(s, 'La card de la salida nueva debería mostrar el score de esa noche').not.toBeNull();
  });
});
