import type { Locator, Page } from '@playwright/test';

/** Muestra de píxeles RGBA (sub-muestreada) como array plano [r,g,b,a,…]. */
export type Muestra = { w: number; h: number; data: number[]; fuente: '2d' | 'screenshot' };

/** Lee píxeles de un <canvas>: getImageData si es 2D; si no (WebGL), decodifica un screenshot del elemento. */
export async function muestrearCanvas(page: Page, canvas: Locator, max = 40_000): Promise<Muestra> {
  const r = await canvas.evaluate((el, max) => {
    const cv = el as HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = cv.getContext('2d');
    } catch {
      ctx = null;
    }
    if (!ctx || !cv.width || !cv.height) return null;
    const img = ctx.getImageData(0, 0, cv.width, cv.height);
    const stride = Math.max(1, Math.ceil(Math.sqrt((cv.width * cv.height) / max)));
    const out: number[] = [];
    let w = 0, h = 0;
    for (let y = 0; y < cv.height; y += stride) {
      h++;
      w = 0;
      for (let x = 0; x < cv.width; x += stride) {
        w++;
        const i = (y * cv.width + x) * 4;
        out.push(img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]);
      }
    }
    return { w, h, data: out };
  }, max);
  if (r) return { ...r, fuente: '2d' };
  const buf = await canvas.screenshot();
  return { ...(await decodificarPng(page, buf, max)), fuente: 'screenshot' };
}

/** Decodifica un PNG (Buffer) dentro del navegador y devuelve una muestra de píxeles. */
export async function decodificarPng(page: Page, png: Buffer, max = 40_000): Promise<{ w: number; h: number; data: number[] }> {
  return page.evaluate(
    async ({ b64, max }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const stride = Math.max(1, Math.ceil(Math.sqrt((c.width * c.height) / max)));
      const out: number[] = [];
      let w = 0, h = 0;
      for (let y = 0; y < c.height; y += stride) {
        h++;
        w = 0;
        for (let x = 0; x < c.width; x += stride) {
          w++;
          const i = (y * c.width + x) * 4;
          out.push(d[i], d[i + 1], d[i + 2], d[i + 3]);
        }
      }
      return { w, h, data: out };
    },
    { b64: png.toString('base64'), max },
  );
}

/** Fracción de píxeles que difieren del color de fondo (el más frecuente). */
export function fraccionNoFondo(m: { data: number[] }, umbral = 40): number {
  const counts = new Map<string, number>();
  const n = m.data.length / 4;
  for (let i = 0; i < m.data.length; i += 4) {
    const k = `${m.data[i] >> 3},${m.data[i + 1] >> 3},${m.data[i + 2] >> 3},${m.data[i + 3] >> 5}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number);
  const [br, bgG, bb, ba] = [top[0] << 3, top[1] << 3, top[2] << 3, top[3] << 5];
  let dif = 0;
  for (let i = 0; i < m.data.length; i += 4) {
    const d =
      Math.abs(m.data[i] - br) + Math.abs(m.data[i + 1] - bgG) + Math.abs(m.data[i + 2] - bb) + Math.abs(m.data[i + 3] - ba) / 2;
    if (d > umbral) dif++;
  }
  return dif / n;
}

/** Píxeles "no rojos" (modo rojo): b > r o g > r (con tolerancia), ignorando casi-negros y transparentes. */
export function pixelesNoRojos(m: { data: number[] }, tol = 2): { n: number; total: number; ejemplos: string[] } {
  let n = 0, total = 0;
  const ejemplos: string[] = [];
  for (let i = 0; i < m.data.length; i += 4) {
    const [r, g, b, a] = [m.data[i], m.data[i + 1], m.data[i + 2], m.data[i + 3]];
    if (a < 20 || Math.max(r, g, b) < 16) continue;
    total++;
    if (b > r + tol || g > r + tol) {
      n++;
      if (ejemplos.length < 8) ejemplos.push(`rgba(${r},${g},${b},${a})`);
    }
  }
  return { n, total, ejemplos };
}

/** Fracción de píxeles que cambian entre dos muestras del mismo tamaño. */
export function fraccionCambio(a: { data: number[] }, b: { data: number[] }, umbral = 30): number {
  const n = Math.min(a.data.length, b.data.length) / 4;
  let c = 0;
  for (let i = 0; i < n * 4; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (d > umbral) c++;
  }
  return c / n;
}

/** Puntos brillantes del canvas (coordenadas CSS de la página), separados entre sí, donde el canvas es el elemento tocado. */
export async function puntosBrillantes(canvas: Locator, cuantos = 20): Promise<{ x: number; y: number }[]> {
  return canvas.evaluate((el, cuantos) => {
    const cv = el as HTMLCanvasElement;
    const ctx = cv.getContext('2d');
    if (!ctx) return [];
    const rect = cv.getBoundingClientRect();
    const sx = cv.width / rect.width, sy = cv.height / rect.height;
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const cand: { x: number; y: number; l: number }[] = [];
    const step = Math.max(1, Math.round(sx));
    for (let y = 0; y < cv.height; y += step) {
      for (let x = 0; x < cv.width; x += step) {
        const i = (y * cv.width + x) * 4;
        const l = d[i] + d[i + 1] + d[i + 2];
        if (l > 300) cand.push({ x, y, l });
      }
    }
    cand.sort((a, b) => b.l - a.l);
    const out: { x: number; y: number }[] = [];
    for (const c of cand) {
      const px = rect.left + c.x / sx, py = rect.top + c.y / sy;
      if (out.some((o) => Math.hypot(o.x - px, o.y - py) < 30)) continue;
      if (document.elementFromPoint(px, py) !== cv) continue;
      out.push({ x: px, y: py });
      if (out.length >= cuantos) break;
    }
    return out;
  }, cuantos);
}

/** Como fraccionCambio, pero ignorando rectángulos (en coords de la muestra) donde hay overlays HTML. */
export function fraccionCambioExcluyendo(
  a: { w: number; h: number; data: number[] },
  b: { w: number; h: number; data: number[] },
  excl: { x: number; y: number; width: number; height: number }[],
  umbral = 30,
): number {
  let c = 0, n = 0;
  for (let y = 0; y < Math.min(a.h, b.h); y++) {
    for (let x = 0; x < Math.min(a.w, b.w); x++) {
      if (excl.some((r) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height)) continue;
      const i = (y * a.w + x) * 4, j = (y * b.w + x) * 4;
      n++;
      const d = Math.abs(a.data[i] - b.data[j]) + Math.abs(a.data[i + 1] - b.data[j + 1]) + Math.abs(a.data[i + 2] - b.data[j + 2]);
      if (d > umbral) c++;
    }
  }
  return n ? c / n : 0;
}
