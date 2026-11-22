import { test, expect } from '@playwright/test';
import {
  ETIQUETAS_SCORE,
  PUNTOS,
  abrirApp,
  control,
  etiquetaEsperada,
  leerContadorQuieroIr,
  leerScore,
  seleccionarPunto,
  visible,
} from './helpers';

test.describe('Lado demanda (aficionado/turista)', () => {
  test('01 · carga: lockup Hanan, mapa y los 6 puntos de observación', async ({ page }) => {
    await abrirApp(page);

    // HU-1: mapa MapLibre (canvas o contenedor)
    const mapa = visible(page.locator('.maplibregl-map, .maplibregl-canvas, canvas'));
    await expect(mapa, 'Se esperaba el mapa (MapLibre) presente y visible').toBeVisible({ timeout: 15_000 });

    // Los 6 puntos accesibles por rol + nombre
    for (const p of PUNTOS) {
      await expect(
        visible(control(page, p.re)),
        `Punto "${p.id}" debería ser un control accesible (button/link/option…) con su nombre`,
      ).toBeVisible();
    }
  });

  test('02 · Susques: score 0–100 con etiqueta, desglose, timeline y mejor ventana', async ({ page }) => {
    await abrirApp(page);
    await seleccionarPunto(page, /susques/i); // spec §6: ≤ 2 interacciones

    await expect(visible(page.getByText(/susques/i))).toBeVisible();

    await expect
      .poll(() => leerScore(page), { message: 'Se esperaba un score 0–100 con etiqueta textual', timeout: 10_000 })
      .not.toBeNull();
    const s = (await leerScore(page))!;
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(100);
    expect(s.label).toMatch(ETIQUETAS_SCORE);
    expect(s.label, `Etiqueta incoherente con el número (texto: "${s.text}")`).toBe(etiquetaEsperada(s.score));

    // Desglose de factores (HU-2)
    for (const f of [/nubes/i, /luna/i, /oscuridad/i, /humedad/i, /viento/i]) {
      await expect(visible(page.getByText(f)), `Falta el factor ${f} en el desglose`).toBeVisible();
    }

    // Timeline 72 h (HU-2)
    await expect(
      visible(
        page
          .getByRole('heading', { name: /timeline|72\s*h|pr[oó]ximas|por hora|hora a hora|l[ií]nea de tiempo/i })
          .or(page.getByRole('img', { name: /timeline|72|por hora|hora a hora|l[ií]nea de tiempo/i }))
          .or(page.getByRole('list', { name: /timeline|72|por hora|hora a hora|l[ií]nea de tiempo/i }))
          .or(page.getByRole('region', { name: /timeline|72|por hora|hora a hora|l[ií]nea de tiempo/i }))
          .or(page.getByText(/pr[oó]ximas\s*72\s*h|72\s*h(oras)?\b|hora a hora|l[ií]nea de tiempo|timeline/i)),
      ),
      'Se esperaba un timeline de las próximas 72 h identificable',
    ).toBeVisible();
    // 72 h por hora: cada hora identificable (texto o aria-label HH:MM / HH h)
    const horas = await page.evaluate(() => {
      const re = /\b([01]?\d|2[0-3])(:\d{2}|\s?h)\b/;
      let n = 0;
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('[role="listitem"], li, [role="img"], [role="button"], button'))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        const name = el.getAttribute('aria-label') ?? el.getAttribute('title') ?? '';
        if (re.test(name) && name.length < 80) n++;
      }
      return n;
    });
    expect(horas, 'El timeline debería tener ≥ 48 horas identificables (accesibles) de las próximas 72 h').toBeGreaterThanOrEqual(48);

    // Mejor ventana con hora de inicio y fin (HU-3)
    await expect(visible(page.getByText(/mejor ventana|mejor noche/i)), 'Falta "Mejor ventana"').toBeVisible();
    const ventana = await page.evaluate(() => {
      const re = /(\d{1,2}[:.]\d{2})\s*(?:h\s*)?(?:–|—|-|a|→|hasta)\s*(\d{1,2}[:.]\d{2})/;
      return document.body.innerText.match(re)?.[0] ?? null;
    });
    expect(ventana, 'La mejor ventana debería tener hora de inicio y fin (HH:MM–HH:MM)').not.toBeNull();
  });

  test('03 · Qué se ve: luna (fase/%), Vía Láctea y estacionalidad de noviembre', async ({ page }) => {
    await abrirApp(page);
    await seleccionarPunto(page, /susques/i);

    const luna = await page.evaluate(() => {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
        const t = (el.innerText ?? '').replace(/\s+/g, ' ');
        if (t.length > 200 || !/luna/i.test(t)) continue;
        if (/\d{1,3}\s*%/.test(t) && /(llena|nueva|creciente|menguante|cuarto|gibosa|ilumin)/i.test(t)) return t;
      }
      return null;
    });
    expect(luna, 'Se esperaba la fase y el % de iluminación de la luna').not.toBeNull();
    expect(luna!, 'La luna debería mostrar el porcentaje de iluminación').toMatch(/\d{1,3}\s*%/);

    await expect(visible(page.getByText(/v[ií]a l[aá]ctea/i)), 'Falta la Vía Láctea').toBeVisible();

    // Hoy es noviembre (fixtures del 22/11/2026): mensaje de estacionalidad
    const mes = new Date().getMonth(); // 0-based
    test.skip(![10, 11, 0].includes(mes), 'El mensaje de estacionalidad aplica de noviembre a enero');
    await expect(
      visible(page.getByText(/se esconde temprano|mejor temporada.{0,40}(abril|septiembre)|abril a septiembre/i)),
      'Se esperaba el mensaje de estacionalidad (nov–ene)',
    ).toBeVisible();
  });

  test('04 · Salidas: etiqueta "ejemplo" y Reservar → wa.me con mensaje prellenado', async ({ page, context }) => {
    // No salir a internet: registrar window.open y cortar wa.me/whatsapp
    await page.addInitScript(() => {
      (window as any).__abiertos = [];
      const orig = window.open.bind(window);
      window.open = ((url?: string | URL, ...rest: any[]) => {
        (window as any).__abiertos.push(String(url));
        if (url && /wa\.me|whatsapp/i.test(String(url))) return null;
        return orig(url as any, ...rest);
      }) as typeof window.open;
    });
    await context.route(/wa\.me|whatsapp\.com/, (r) => r.fulfill({ status: 200, body: 'ok-e2e' }));

    await abrirApp(page);
    await seleccionarPunto(page, /susques/i);

    await expect(visible(page.getByText(/ejemplo/i)), 'Las salidas demo deben tener etiqueta "ejemplo"').toBeVisible();

    const reservar = visible(page.getByRole('link', { name: /reservar/i }).or(page.getByRole('button', { name: /reservar/i })));
    await expect(reservar, 'Se esperaba un botón "Reservar"').toBeVisible();

    let href = await reservar.getAttribute('href');
    if (!href) {
      const popupP = page.waitForEvent('popup', { timeout: 3_000 }).catch(() => null);
      await reservar.click();
      const popup = await popupP;
      const abiertos: string[] = await page.evaluate(() => (window as any).__abiertos ?? []);
      href = abiertos.find((u) => /wa\.me|whatsapp/.test(u)) ?? popup?.url() ?? (/wa\.me/.test(page.url()) ? page.url() : null);
    }
    expect(href, 'Reservar debería abrir WhatsApp (https://wa.me/…)').toBeTruthy();
    const u = new URL(href!);
    expect(u.protocol).toBe('https:');
    expect(u.hostname).toBe('wa.me');
    expect(u.pathname, 'wa.me/<número>').toMatch(/^\/\d{8,15}$/);
    const text = u.searchParams.get('text') ?? '';
    expect(text, 'El mensaje debería nombrar el punto').toMatch(/susques/i);
    expect(text, 'El mensaje debería mencionar Hanan').toMatch(/hanan/i);
  });

  test('05 · "Quiero ir": el contador suma 1 y persiste tras recargar', async ({ page }) => {
    await abrirApp(page);
    await seleccionarPunto(page, /susques/i);

    const boton = visible(page.getByRole('button', { name: /quiero ir/i }));
    await expect(boton, 'Se esperaba el botón "Quiero ir"').toBeVisible();
    const antes = await leerContadorQuieroIr(page);
    expect(antes, 'Se esperaba un contador de interés visible ("N quieren ir")').not.toBeNull();

    await boton.click();
    await expect.poll(() => leerContadorQuieroIr(page), { message: 'El contador debería subir 1' }).toBe(antes! + 1);

    await page.reload();
    await abrirApp(page);
    await seleccionarPunto(page, /susques/i);
    await expect
      .poll(() => leerContadorQuieroIr(page), { message: 'El contador debería persistir tras recargar' })
      .toBe(antes! + 1);
  });

  test('09 · Paso de Jama: estado visible con link oficial', async ({ page }) => {
    await abrirApp(page);
    const estadoRe = /\b(Abierto|Restringido|Cerrado|Ver estado oficial)\b/i;
    const paso = visible(page.getByText(/paso de jama/i));
    if (!(await paso.isVisible().catch(() => false))) await seleccionarPunto(page, /\bjama\b/i);
    await expect(visible(page.getByText(/paso de jama/i)), 'Se esperaba la sección "Paso de Jama"').toBeVisible();
    await expect(visible(page.getByText(estadoRe)), 'Se esperaba el estado del paso').toBeVisible();
    const links = page.locator('a[href*="argentina.gob.ar"]');
    await expect(visible(links), 'Se esperaba un link a la fuente oficial (argentina.gob.ar)').toBeVisible();
    expect(await visible(links).getAttribute('href')).toMatch(/pasosinternacionales/i);
  });

  test('11 · atribución Open-Meteo y CelesTrak visible', async ({ page }) => {
    await abrirApp(page);
    const check = async () =>
      (await visible(page.getByText(/open.?meteo/i)).isVisible().catch(() => false)) &&
      (await visible(page.getByText(/celestrak/i)).isVisible().catch(() => false));
    if (!(await check())) await seleccionarPunto(page, /susques/i);
    await expect(visible(page.getByText(/open.?meteo/i)), 'Falta la atribución "Open-Meteo"').toBeVisible();
    await expect(visible(page.getByText(/celestrak/i)), 'Falta la atribución "CelesTrak"').toBeVisible();
  });
});
