import { expect, type Locator, type Page } from '@playwright/test';

/** Los 6 puntos de observación de la spec (HU-1). Regex tolerantes al nombre largo. */
export const PUNTOS: { id: string; re: RegExp }[] = [
  { id: 'purmamarca', re: /purmamarca/i },
  { id: 'salinas', re: /salinas\s+grandes/i },
  { id: 'susques', re: /susques/i },
  { id: 'olaroz', re: /olaroz/i },
  { id: 'jama', re: /\bjama\b/i },
  { id: 'tilcara', re: /tilcara/i },
];

export const ETIQUETAS_SCORE = /(Excelente|Muy bueno|Aceptable|Malo|Día)/;

/** Fecha local de Jujuy (YYYY-MM-DD). */
export function hoyJujuy(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Jujuy',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Cualquier control interactivo accesible por rol con ese nombre. */
export function control(page: Page | Locator, name: RegExp): Locator {
  return page
    .getByRole('button', { name })
    .or(page.getByRole('link', { name }))
    .or(page.getByRole('option', { name }))
    .or(page.getByRole('tab', { name }))
    .or(page.getByRole('radio', { name }))
    .or(page.getByRole('menuitem', { name }))
    .or(page.getByRole('switch', { name }))
    .or(page.getByRole('checkbox', { name }));
}

export function visible(l: Locator): Locator {
  return l.filter({ visible: true }).first();
}

export async function abrirApp(page: Page) {
  await page.goto('/');
  await expect(
    visible(
      page
        .getByRole('heading', { name: /hanan/i })
        .or(page.getByRole('img', { name: /hanan/i }))
        .or(page.getByRole('banner').getByText(/hanan/i))
        .or(page.getByText(/^\s*hanan\b/i)),
    ),
    'Se esperaba el lockup/título "Hanan" visible',
  ).toBeVisible({ timeout: 15_000 });
}

/** Selecciona un punto de observación (lista, chip, marcador del mapa…). */
export async function seleccionarPunto(page: Page, re: RegExp) {
  const c = visible(control(page, re));
  await expect(c, `Se esperaba un control accesible para el punto ${re}`).toBeVisible();
  await c.click();
}

export type ScoreLeido = { score: number; label: string; text: string };

/**
 * Busca en la página el elemento más chico que muestre un número 0–100 junto a una etiqueta textual
 * (el score nunca se comunica solo por color: número + etiqueta).
 */
export async function leerScore(page: Page): Promise<ScoreLeido | null> {
  return page.evaluate(() => {
    const re1 = /(?:^|[^\d:.,])(100|\d{1,2})(?:\s*\/\s*100)?[^\d]{0,30}?(Excelente|Muy bueno|Aceptable|Malo|Día)(?![a-záéíóú])/;
    const re2 = /(Excelente|Muy bueno|Aceptable|Malo|Día)(?![a-záéíóú])[^\d]{0,30}?(100|\d{1,2})(?:\s*\/\s*100)?(?![\d:.,])/;
    let best: { score: number; label: string; text: string; len: number } | null = null;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const candidates = [el.innerText ?? '', el.getAttribute('aria-label') ?? ''];
      for (const raw of candidates) {
        const t = raw.replace(/\s+/g, ' ').trim();
        if (!t || t.length > 120) continue;
        let m = t.match(re1);
        let score: number | undefined;
        let label: string | undefined;
        if (m) {
          score = Number(m[1]);
          label = m[2];
        } else if ((m = t.match(re2))) {
          score = Number(m[2]);
          label = m[1];
        }
        if (score === undefined || label === undefined) continue;
        if (!best || t.length < best.len) best = { score, label, text: t, len: t.length };
      }
    }
    return best ? { score: best.score, label: best.label, text: best.text } : null;
  });
}

/** Coherencia número ↔ etiqueta (spec §4). */
export function etiquetaEsperada(score: number): string {
  if (score >= 85) return 'Excelente';
  if (score >= 70) return 'Muy bueno';
  if (score >= 40) return 'Aceptable';
  if (score >= 1) return 'Malo';
  return 'Día';
}

/**
 * Lee el contador de "Quiero ir" (señales de demanda) visible.
 * Acepta "12 personas quieren ir", "Quiero ir · 12", "Quiero ir (12)", "12 quieren ir", etc.
 */
export async function leerContadorQuieroIr(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const pats = [
      /(\d+)\s*(?:personas?|aficionad\w*|viajer\w*|interesad\w*)?\s*(?:quieren|quiere|van a)\s+ir/i,
      /(\d+)\s*(?:personas?\s+)?interesad\w*/i,
      /quiero ir\D{0,12}?(\d+)/i,
      /(\d+)\D{0,12}?quiero ir/i,
    ];
    let best: { n: number; len: number } | null = null;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      for (const raw of [el.innerText ?? '', el.getAttribute('aria-label') ?? '']) {
        const t = raw.replace(/\s+/g, ' ').trim();
        if (!t || t.length > 140) continue;
        for (const p of pats) {
          const m = t.match(p);
          if (m) {
            if (!best || t.length < best.len) best = { n: Number(m[1]), len: t.length };
            break;
          }
        }
      }
    }
    return best ? best.n : null;
  });
}

/** Captura errores de consola y de página, excluyendo fallas de red de tiles/estilos del mapa. */
export function capturarErrores(page: Page) {
  const errores: string[] = [];
  const esMapaRed = (text: string, url: string) =>
    /tile|\.pbf|\.mvt|glyph|sprite|style\.json|basemap|cartocdn|carto\.com|openfreemap|maptiler|protomaps|openstreetmap|stadiamaps|arcgisonline|fonts?\//i.test(
      url + ' ' + text,
    ) || /AJAXError/i.test(text);
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const url = msg.location()?.url ?? '';
    const text = msg.text();
    if (esMapaRed(text, url)) return;
    errores.push(`${text}${url ? ` @ ${url}` : ''}`);
  });
  page.on('pageerror', (err) => errores.push(`pageerror: ${err.message}`));
  return errores;
}
