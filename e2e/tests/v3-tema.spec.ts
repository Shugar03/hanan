import { test, expect, type Page } from './base';
import { control, visible } from './helpers';
import { coloresNoRojos, contraste } from './color';

/** Brand guide §5 "Tema claro" + ui-audit P1-1: toggle sol/luna "Tema claro"/"Tema oscuro", persistente, por defecto prefers-color-scheme, el modo rojo gana. */

const tema = (page: Page) => page.locator('html').getAttribute('data-tema');
const toggleTema = (page: Page) => visible(page.getByRole('banner').getByRole('button', { name: /tema/i }));

test.describe('Tema claro · por defecto según prefers-color-scheme', () => {
  test.describe('sistema oscuro', () => {
    test.use({ colorScheme: 'dark' });
    test('22a · dark → data-tema="oscuro" y el toggle ofrece "Tema claro"', async ({ page }) => {
      await page.goto('/');
      await expect.poll(() => tema(page), { message: 'Con prefers-color-scheme: dark debería arrancar en oscuro' }).toBe('oscuro');
      await expect(toggleTema(page), 'El toggle debería llamarse "Tema claro"').toHaveAccessibleName(/^tema claro$/i);
    });

    test('22b · toggle → data-tema="claro", cambia el nombre y persiste tras reload', async ({ page }) => {
      await page.goto('/');
      await expect.poll(() => tema(page)).toBe('oscuro');
      await toggleTema(page).click();
      await expect(page.locator('html')).toHaveAttribute('data-tema', 'claro');
      await expect(toggleTema(page)).toHaveAccessibleName(/^tema oscuro$/i);
      await page.reload();
      await expect(page.locator('html'), 'El tema claro debería persistir aunque el sistema sea oscuro').toHaveAttribute('data-tema', 'claro');
      await toggleTema(page).click();
      await expect(page.locator('html')).toHaveAttribute('data-tema', 'oscuro');
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-tema', 'oscuro');
    });
  });

  test.describe('sistema claro', () => {
    test.use({ colorScheme: 'light' });
    test('22c · light → data-tema="claro" y el toggle ofrece "Tema oscuro"', async ({ page }) => {
      await page.goto('/');
      await expect.poll(() => tema(page), { message: 'Con prefers-color-scheme: light debería arrancar en claro' }).toBe('claro');
      await expect(toggleTema(page)).toHaveAccessibleName(/^tema oscuro$/i);
    });

    test('22d · con modo rojo, el toggle de tema queda aria-disabled y el rojo gana', async ({ page }) => {
      await page.goto('/?tab=explorar&punto=susques');
      await expect.poll(() => tema(page)).toBe('claro');
      await visible(control(page, /modo rojo|visi[oó]n nocturna/i)).click();
      await expect(page.locator('html')).toHaveAttribute('data-modo', 'rojo');
      const t = toggleTema(page);
      await expect(t, 'Con modo rojo, el toggle de tema debería estar aria-disabled').toHaveAttribute('aria-disabled', 'true');
      await t.click({ force: true });
      await expect(page.locator('html'), 'Tocar el tema deshabilitado no debería cambiar el tema').toHaveAttribute('data-tema', 'claro');
      await page.waitForTimeout(600);
      const malos = await coloresNoRojos(page);
      expect(malos, `Tema claro + modo rojo: elementos con azul/verde > rojo o blanco puro:\n${malos.slice(0, 25).join('\n')}`).toEqual([]);
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-modo', 'rojo');
      expect(await coloresNoRojos(page), 'Tras recargar, el rojo sigue ganando').toEqual([]);
    });

    test('22e · contraste AA (≥ 4,5:1) del texto principal y del botón primario en claro', async ({ page }) => {
      const bajos: string[] = [];
      const medir = async (nombre: string, l: ReturnType<typeof visible>) => {
        await expect(l, `Falta ${nombre}`).toBeVisible();
        const c = await contraste(l);
        if (c.ratio < 4.5) bajos.push(`${nombre}: ${c.ratio}:1 (texto ${c.fg} sobre ${c.bg})`);
      };
      await page.goto('/?tab=explorar&punto=susques');
      await expect.poll(() => tema(page)).toBe('claro');
      await medir('Título h1 (Explorar)', visible(page.getByRole('heading', { level: 1 })));
      await medir('Párrafo del panel', visible(page.getByRole('complementary').getByRole('paragraph')));
      await medir('Pestaña activa', visible(page.getByRole('navigation', { name: /secciones/i }).locator('[aria-current="page"]')));
      const reservarExp = visible(page.getByRole('link', { name: /reservar/i }).or(page.getByRole('button', { name: /reservar/i })));
      if (await reservarExp.isVisible().catch(() => false)) await medir('Reservar (Explorar)', reservarExp);

      await page.goto('/?tab=salidas&punto=susques');
      await medir('Título h1 (Salidas)', visible(page.getByRole('heading', { level: 1 })));
      const card = visible(page.getByRole('main').getByRole('listitem').filter({ hasText: /\d+\s+lugar/i }).getByRole('button'));
      await card.click();
      await medir('Botón primario Reservar (ficha)', visible(page.getByRole('button', { name: /^reservar/i })));
      await medir('Título h1 (ficha)', visible(page.getByRole('heading', { level: 1 })));

      await page.goto('/?tab=noche');
      await medir('Título h1 (Mi noche)', visible(page.getByRole('heading', { level: 1 })));
      expect(bajos, `Contraste < 4,5:1 en tema claro:\n${bajos.join('\n')}`).toEqual([]);
    });
  });
});
