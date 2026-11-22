import { expect, type Page } from '@playwright/test';
import { visible } from './helpers';

/** Registra los MediaStream que abre la app (para verificar que los tracks terminan al cerrar). */
export async function espiarCamara(page: Page) {
  await page.addInitScript(() => {
    (window as any).__streams = [];
    const md = navigator.mediaDevices;
    if (!md?.getUserMedia) return;
    const orig = md.getUserMedia.bind(md);
    md.getUserMedia = async (c?: MediaStreamConstraints) => {
      const s = await orig(c);
      (window as any).__streams.push(s);
      return s;
    };
  });
}

export const estadosTracks = (page: Page): Promise<string[]> =>
  page.evaluate(() => ((window as any).__streams ?? []).flatMap((s: MediaStream) => s.getTracks().map((t) => t.readyState)));

export const dialogo = (page: Page) => page.getByRole('dialog', { name: /observatorio/i });

export async function abrirObservatorio(page: Page) {
  const b = visible(page.getByRole('button', { name: /abrir modo observatorio/i }));
  await expect(b, 'Se esperaba el botón "Abrir modo observatorio"').toBeVisible({ timeout: 10_000 });
  await b.click();
  await expect(dialogo(page), 'Se esperaba el diálogo del observatorio').toBeVisible();
}

/** Simula la orientación del teléfono durante ~ms (eventos absolutos y relativos). */
export async function orientar(page: Page, alpha: number, ms = 900, beta = 90, gamma = 0) {
  await page.evaluate(
    async ({ alpha, beta, gamma, ms }) => {
      const t0 = performance.now();
      while (performance.now() - t0 < ms) {
        const init = { alpha, beta, gamma, absolute: true };
        window.dispatchEvent(new DeviceOrientationEvent('deviceorientationabsolute', init));
        window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', init));
        await new Promise((r) => setTimeout(r, 40));
      }
    },
    { alpha, beta, gamma, ms },
  );
}

export async function hud(page: Page): Promise<string> {
  const p = visible(dialogo(page).getByText(/mirando (al|hacia)/i));
  return ((await p.textContent()) ?? '').replace(/\s+/g, ' ').trim();
}
