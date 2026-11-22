import type { Locator, Page } from '@playwright/test';
import { visible } from './helpers';

/** Spec: docs/product/product-vision.md §3 (4 pestañas + modo guía), §8 (demo de hoy). */
export const PESTANAS: { id: string; re: RegExp }[] = [
  { id: 'explorar', re: /^\s*explorar\s*$/i },
  { id: 'cielo', re: /^\s*cielo(\s+en vivo)?\s*$/i },
  { id: 'salidas', re: /^\s*salidas\s*$/i },
  { id: 'noche', re: /^\s*mi noche\s*$/i },
];

export function pestana(page: Page, re: RegExp): Locator {
  return visible(page.getByRole('link', { name: re }).or(page.getByRole('tab', { name: re })).or(page.getByRole('button', { name: re })));
}

export async function esActiva(l: Locator): Promise<boolean> {
  return l.evaluate((el) => {
    const c = el.getAttribute('aria-current');
    return (!!c && c !== 'false') || el.getAttribute('aria-selected') === 'true';
  });
}

/** Extrae el score (0–100) de un texto o nombre accesible "…71, Muy bueno" / "71 Muy bueno". */
export function scoreDe(t: string): number | null {
  const m =
    t.match(/(?:^|[^\d:.,])(100|\d{1,2})(?:\s*(?:\/|de)\s*100)?[\s,.]*(Excelente|Muy bueno|Aceptable|Malo)/) ??
    t.match(/score[^\d]{0,30}(100|\d{1,2})\b/i);
  return m ? Number(m[1]) : null;
}

