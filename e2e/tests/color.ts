import type { Locator, Page } from '@playwright/test';

/** Mismo muestreo que el test 06: elementos visibles con b>r, g>r o blanco puro (color, fondo, borde, fill/stroke). */
export async function coloresNoRojos(page: Page): Promise<string[]> {
  return page.evaluate(() => {
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
          const id = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
          out.push(`${id} ${prop}=${val} "${(el.innerText ?? '').trim().slice(0, 30)}"`);
        }
      }
    }
    return out;
  });
}

/** Contraste WCAG 2.x entre el color del texto del elemento y su fondo efectivo (compone fondos semitransparentes). */
export async function contraste(l: Locator): Promise<{ ratio: number; fg: string; bg: string }> {
  return l.evaluate((el) => {
    const parse = (c: string): [number, number, number, number] | null => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    };
    const over = (top: [number, number, number, number], under: [number, number, number]): [number, number, number] => [
      top[0] * top[3] + under[0] * (1 - top[3]),
      top[1] * top[3] + under[1] * (1 - top[3]),
      top[2] * top[3] + under[2] * (1 - top[3]),
    ];
    const layers: [number, number, number, number][] = [];
    for (let n: Element | null = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c[3] > 0) layers.push(c);
      if (c && c[3] >= 1) break;
    }
    let bg: [number, number, number] = [255, 255, 255];
    for (const c of layers.reverse()) bg = over(c, bg);
    const fgc = parse(getComputedStyle(el).color)!;
    const fg = over(fgc, bg);
    const lum = ([r, g, b]: [number, number, number]) => {
      const f = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const [a, b] = [lum(fg), lum(bg)];
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const s = (c: number[]) => `rgb(${c.map((x) => Math.round(x)).join(',')})`;
    return { ratio: Math.round(ratio * 100) / 100, fg: s(fg), bg: s(bg) };
  });
}
