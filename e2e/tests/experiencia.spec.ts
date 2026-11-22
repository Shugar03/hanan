import { test, expect, type Page } from '@playwright/test';
import {
  ETIQUETAS_SCORE,
  PUNTOS,
  abrirApp,
  capturarErrores,
  control,
  hoyJujuy,
  leerScore,
  seleccionarPunto,
  visible,
} from './helpers';

const MODO_ROJO = /modo rojo|visi[oó]n nocturna/i;

async function toggleModoRojo(page: Page) {
  const t = visible(control(page, MODO_ROJO));
  await expect(t, 'Se esperaba un toggle accesible de "Modo rojo"').toBeVisible();
  await t.click();
}

test.describe('Modo rojo', () => {
  test('06 · toggle → html[data-modo="rojo"], persiste y no hay azules/blancos', async ({ page }) => {
    await abrirApp(page);
    await toggleModoRojo(page);
    await expect(page.locator('html')).toHaveAttribute('data-modo', 'rojo');

    await page.reload();
    await abrirApp(page);
    await expect(page.locator('html'), 'El modo rojo debería persistir tras recargar').toHaveAttribute('data-modo', 'rojo');

    // Con un punto abierto hay más UI en pantalla
    await seleccionarPunto(page, /susques/i);
    await page.waitForTimeout(500);

    const malos = await page.evaluate(() => {
      const parse = (c: string) => {
        const m = c.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
      };
      const out: string[] = [];
      const els = Array.from(document.querySelectorAll<HTMLElement>('body *')).filter((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
      });
      for (const el of els.slice(0, 1500)) {
        const cs = getComputedStyle(el);
        const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim());
        const props: [string, string][] = [['background-color', cs.backgroundColor]];
        if (hasText) props.push(['color', cs.color]);
        if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') props.push(['border-color', cs.borderTopColor]);
        if (el instanceof SVGElement) {
          if (cs.fill && cs.fill !== 'none') props.push(['fill', cs.fill]);
          if (cs.stroke && cs.stroke !== 'none') props.push(['stroke', cs.stroke]);
        }
        for (const [prop, val] of props) {
          const c = parse(val);
          if (!c || c.a < 0.15) continue;
          const blanco = c.r >= 250 && c.g >= 250 && c.b >= 250;
          if (c.b > c.r || c.g > c.r || blanco) {
            const id = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
            out.push(`${id} ${prop}=${val} "${(el.innerText ?? '').trim().slice(0, 30)}"`);
          }
        }
      }
      return out;
    });
    expect(malos, `Elementos con canal azul/verde > rojo o blanco puro en modo rojo:\n${malos.slice(0, 25).join('\n')}`).toEqual([]);
  });
});

test.describe('Simulador de fecha', () => {
  test('07 · junio 2027 → "Sin pronóstico: solo cálculo astronómico" y Vía Láctea alta', async ({ page }) => {
    await abrirApp(page);
    await seleccionarPunto(page, /susques/i);

    let input = visible(
      page
        .locator('input[type="date"], input[type="datetime-local"]')
        .or(page.getByLabel(/fecha|simulador|simular/i).and(page.locator('input'))),
    );
    if (!(await input.isVisible().catch(() => false))) {
      const abrir = visible(control(page, /simulador|simular|cambiar fecha|elegir fecha|fecha/i));
      await expect(abrir, 'Se esperaba el simulador de fecha (input o botón accesible)').toBeVisible();
      await abrir.click();
      input = visible(
        page
          .locator('input[type="date"], input[type="datetime-local"]')
          .or(page.getByLabel(/fecha|simulador|simular/i).and(page.locator('input'))),
      );
    }
    await expect(input, 'Se esperaba un input de fecha en el simulador').toBeVisible();
    const tipo = await input.getAttribute('type');
    await input.fill(tipo === 'datetime-local' ? '2027-06-15T23:00' : '2027-06-15');
    const hora = visible(page.locator('input[type="time"]'));
    if (await hora.isVisible().catch(() => false)) await hora.fill('23:00');
    const aplicar = visible(page.getByRole('button', { name: /aplicar|simular|ver noche|calcular/i }));
    if (await aplicar.isVisible().catch(() => false)) await aplicar.click();

    await expect(
      visible(page.getByText(/sin pron[oó]stico:?\s*solo c[aá]lculo astron[oó]mico/i)),
      'Fuera de los 7 días debería decir "Sin pronóstico: solo cálculo astronómico"',
    ).toBeVisible();

    // Vía Láctea: en junio el núcleo pasa a ~84° en Susques (90 − |−23,4 − (−29,0)|)
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            let best: { len: number; max: number } | null = null;
            for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
              const t = (el.innerText ?? '').replace(/\s+/g, ' ');
              if (t.length > 220 || !/v[ií]a l[aá]ctea/i.test(t)) continue;
              const nums = [...t.matchAll(/(\d{1,2}(?:[.,]\d+)?)\s*°/g)].map((m) => parseFloat(m[1].replace(',', '.')));
              if (!nums.length) continue;
              if (!best || t.length < best.len) best = { len: t.length, max: Math.max(...nums) };
            }
            return best?.max ?? -1;
          }),
        { message: 'La altura máxima del núcleo de la Vía Láctea en junio debería ser ≥ 70°' },
      )
      .toBeGreaterThanOrEqual(70);
  });
});

test.describe('Modo guía (HU-11)', () => {
  test('08 · demanda agregada + publicar salida, persiste tras recargar', async ({ page }) => {
    await abrirApp(page);
    const entrar = async () => {
      const g = visible(control(page, /modo gu[ií]a|soy gu[ií]a|para gu[ií]as|gu[ií]as?$/i));
      await expect(g, 'Se esperaba un control para entrar al modo guía').toBeVisible();
      await g.click();
    };
    await entrar();

    await expect(visible(page.getByText(/demanda/i)), 'Se esperaba ver la demanda agregada').toBeVisible();
    const hayConteo = await page.evaluate(() =>
      /\d+\s*(personas?\s*)?(quieren ir|interesad|señales?)/i.test(document.body.innerText),
    );
    expect(hayConteo, 'La demanda agregada debería mostrar conteos ("N quieren ir")').toBe(true);

    const abrirForm = visible(page.getByRole('button', { name: /publicar salida|nueva salida/i }));
    const formVisible = await page.getByLabel(/cupo/i).first().isVisible().catch(() => false);
    if (!formVisible && (await abrirForm.isVisible().catch(() => false))) await abrirForm.click();

    const marca = `E2E-${Date.now().toString().slice(-6)}`;
    const punto = visible(page.getByLabel(/punto/i).and(page.locator('select, input')));
    await expect(punto, 'Formulario: campo "Punto"').toBeVisible();
    if ((await punto.evaluate((e) => e.tagName)) === 'SELECT') {
      const label = await punto.evaluate((e) =>
        Array.from((e as HTMLSelectElement).options).find((o) => /susques/i.test(o.text))?.value,
      );
      await punto.selectOption(label!);
    } else {
      await punto.click();
      await visible(control(page, /susques/i)).click();
    }
    const fecha = visible(page.getByLabel(/fecha/i).and(page.locator('input')));
    await expect(fecha, 'Formulario: campo "Fecha"').toBeVisible();
    const tipoFecha = await fecha.getAttribute('type');
    await fecha.fill(tipoFecha === 'datetime-local' ? `${hoyJujuy()}T22:30` : hoyJujuy());
    const hora = visible(page.getByLabel(/hora/i).and(page.locator('input[type="time"], input[type="text"], input:not([type])')));
    if (tipoFecha !== 'datetime-local') {
      await expect(hora, 'Formulario: campo "Hora"').toBeVisible();
      await hora.fill('22:30');
    }
    const cupo = visible(page.getByLabel(/cupo/i).and(page.locator('input, select')));
    await expect(cupo, 'Formulario: campo "Cupo"').toBeVisible();
    const cupoN = 40 + Math.floor(Math.random() * 19); // 40–58, distinto de los demo
    await cupo.fill(String(cupoN));
    const wa = visible(page.getByLabel(/whats ?app|tel[eé]fono/i).and(page.locator('input')));
    await expect(wa, 'Formulario: campo "WhatsApp"').toBeVisible();
    await wa.fill('5493880009999');

    const nombre = visible(page.getByLabel(/nombre/i).and(page.locator('input')));
    if (await nombre.isVisible().catch(() => false)) await nombre.fill(`Guía ${marca}`);
    const precio = visible(page.getByLabel(/precio/i).and(page.locator('input')));
    if (await precio.isVisible().catch(() => false)) await precio.fill(`Precio ${marca}`);
    // La salida publicada se reconoce por su cupo único
    const textoUnico = new RegExp(`cupo\\s*:?\\s*${cupoN}\\b`, 'i');
    const idiomas = visible(page.getByLabel(/idiomas?/i));
    if (await idiomas.isVisible().catch(() => false)) {
      const tag = await idiomas.evaluate((e) => e.tagName + ':' + (e as HTMLInputElement).type);
      if (tag.startsWith('INPUT:text')) await idiomas.fill('es, en');
    } else {
      const es = visible(page.getByRole('checkbox', { name: /espa[nñ]ol|^es$/i }));
      if (await es.isVisible().catch(() => false)) await es.check();
    }

    const publicar = visible(page.getByRole('button', { name: /^publicar/i }));
    await publicar.click();
    await expect(visible(page.getByText(textoUnico)), 'La salida publicada debería aparecer listada').toBeVisible();

    await page.reload();
    await abrirApp(page);
    // Debe aparecer en el modo guía ("tus salidas") o en las salidas de Susques del lado demanda
    await seleccionarPunto(page, /susques/i).catch(() => {});
    if (!(await visible(page.getByText(textoUnico)).isVisible().catch(() => false))) await entrar();
    await expect(visible(page.getByText(textoUnico)), 'La salida publicada debería persistir tras recargar').toBeVisible();
  });
});

test.describe('Offline (modo avión)', () => {
  test('10 · tras una primera carga, offline + reload sigue mostrando puntos y score', async ({ page, context }) => {
    await abrirApp(page);
    await seleccionarPunto(page, /susques/i);
    await expect.poll(() => leerScore(page), { timeout: 10_000 }).not.toBeNull();

    const sw = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return 'sin-api';
      const reg = await Promise.race([
        navigator.serviceWorker.ready.then(() => 'ready'),
        new Promise<string>((r) => setTimeout(() => r('timeout'), 10_000)),
      ]);
      return reg;
    });
    expect(sw, 'Se esperaba un service worker registrado y activo (PWA offline-first)').toBe('ready');
    // Segunda carga online para que el SW controle la página y cachee en runtime
    await page.reload();
    await abrirApp(page);
    await seleccionarPunto(page, /susques/i);
    await page.waitForTimeout(1500);

    await context.setOffline(true);
    await page.reload();
    await abrirApp(page);
    for (const p of PUNTOS) {
      await expect(visible(control(page, p.re)), `Offline: falta el punto ${p.id}`).toBeVisible();
    }
    await seleccionarPunto(page, /susques/i);
    await expect.poll(() => leerScore(page), { message: 'Offline: se esperaba el score de Susques', timeout: 10_000 }).not.toBeNull();
    const s = (await leerScore(page))!;
    expect(s.label).toMatch(ETIQUETAS_SCORE);
    await context.setOffline(false);
  });
});

test.describe('Accesibilidad básica', () => {
  test('12a · todos los botones y links visibles tienen nombre accesible', async ({ page }) => {
    await abrirApp(page);
    await seleccionarPunto(page, /susques/i);
    await page.waitForTimeout(500);
    const snap = await page.locator('body').ariaSnapshot();
    const sinNombre = snap
      .split('\n')
      .filter((l) => /^\s*- (button|link|switch|checkbox|tab|radio|combobox|textbox)(\s*\[[^\]]*\])?\s*:?\s*$/.test(l));
    expect(sinNombre, `Controles sin nombre accesible:\n${sinNombre.join('\n')}\n---\n${snap.slice(0, 3000)}`).toEqual([]);
  });

  test('12b · targets ≥ 44 px en mobile: Reservar, Quiero ir, Modo rojo', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Solo aplica a mobile');
    await abrirApp(page);
    const medir = async (nombre: string, l: ReturnType<typeof visible>) => {
      await expect(l, `Falta "${nombre}"`).toBeVisible();
      const b = (await l.boundingBox())!;
      expect.soft(b.height, `"${nombre}" alto ${b.height}px < 44`).toBeGreaterThanOrEqual(44);
      expect.soft(b.width, `"${nombre}" ancho ${b.width}px < 44`).toBeGreaterThanOrEqual(44);
    };
    await medir('Modo rojo', visible(control(page, MODO_ROJO)));
    await seleccionarPunto(page, /susques/i);
    await medir('Quiero ir', visible(page.getByRole('button', { name: /quiero ir/i })));
    const reservar = visible(page.getByRole('link', { name: /reservar/i }).or(page.getByRole('button', { name: /reservar/i })));
    await reservar.scrollIntoViewIfNeeded().catch(() => {});
    await medir('Reservar', reservar);
  });
});

test.describe('Consola', () => {
  test('13 · sin errores en consola en el recorrido principal', async ({ page }) => {
    const errores = capturarErrores(page);
    await abrirApp(page);
    await page.waitForTimeout(1500);
    for (const p of PUNTOS) {
      const c = visible(control(page, p.re));
      if (await c.isVisible().catch(() => false)) await c.click({ timeout: 3_000 }).catch(() => {});
      await page.waitForTimeout(250);
    }
    await seleccionarPunto(page, /susques/i);
    const rojo = visible(control(page, MODO_ROJO));
    if (await rojo.isVisible().catch(() => false)) {
      await rojo.click();
      await page.waitForTimeout(300);
      await rojo.click();
    }
    await page.waitForTimeout(1000);
    expect(errores, `Errores de consola:\n${errores.join('\n')}`).toEqual([]);
  });
});
