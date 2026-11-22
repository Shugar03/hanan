// Capa meteorológica animable (tipo Ventusky) sobre el mapa de la Puna.
// Raster suave: canvas source de MapLibre con interpolación bicúbica de la grilla, isolíneas y borde desvanecido (0,3°).
// Viento: además, partículas animadas en un canvas superpuesto (debajo de los pines, que son HTML).
import type * as maplibregl from 'maplibre-gl';
import type { CanvasSource } from 'maplibre-gl';
import { astroAtCenter, bilinear, sampleGrid, sampleWindUV, type Grid, type GridVar } from '../../data/grid';
import { currentModo, lut, RAMPS, type Modo } from './colormaps';

const SRC = 'hanan-capa';
const LAYER = 'hanan-capa';
const PX_PER_CELL = 28;
const OPACITY = 0.72;
/** Ancho del desvanecido del borde, en grados. */
const FADE_DEG = 0.3;
const ISO_STEP = 3;
const ISO_W = 1.3;

export type WeatherLayer = { setVariable(v: GridVar): void; setTime(d: Date): void; setVisible(b: boolean): void; destroy(): void };

const smooth = (e0: number, e1: number, x: number) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

/** Catmull-Rom 1D. */
function cr(p0: number, p1: number, p2: number, p3: number, t: number) {
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

export function attachWeatherLayer(map: maplibregl.Map, grid: Grid): WeatherLayer {
  const { nLat, nLon, latNorth, lonWest, step } = grid;
  const south = latNorth - (nLat - 1) * step, east = lonWest + (nLon - 1) * step;
  const W = (nLon - 1) * PX_PER_CELL + 1, H = (nLat - 1) * PX_PER_CELL + 1;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);

  let variable: GridVar = 'cloud_total';
  let time = grid.times[0];
  let visible = true;
  let modo: Modo = currentModo();
  let destroyed = false;
  let added = false;
  let pauseTimer: ReturnType<typeof setTimeout> | undefined;

  // ---------- raster ----------
  const field = new Float32Array(W * H);
  const rowsX = new Float32Array(nLat * W); // interpolación horizontal por fila de la grilla (Catmull-Rom separable)
  // Máscara de borde: el campo se desvanece solo en los últimos FADE_DEG grados de la grilla.
  const fadePx = (FADE_DEG / step) * PX_PER_CELL;
  const mask = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    mask[y * W + x] = smooth(0, fadePx, Math.min(x, W - 1 - x)) * smooth(0, fadePx, Math.min(y, H - 1 - y));
  }

  function computeField(vals: Float32Array) {
    const at = (row: number, col: number) => vals[row * nLon + Math.max(0, Math.min(nLon - 1, col))];
    for (let rr = 0; rr < nLat; rr++) for (let x = 0; x < W; x++) {
      const gx = x / PX_PER_CELL, c1 = Math.min(nLon - 2, Math.floor(gx)), tx = gx - c1;
      rowsX[rr * W + x] = cr(at(rr, c1 - 1), at(rr, c1), at(rr, c1 + 1), at(rr, c1 + 2), tx);
    }
    const rx = (rr: number, x: number) => rowsX[Math.max(0, Math.min(nLat - 1, rr)) * W + x];
    for (let y = 0; y < H; y++) {
      const gy = y / PX_PER_CELL, r1 = Math.min(nLat - 2, Math.floor(gy)), ty = gy - r1;
      for (let x = 0; x < W; x++) field[y * W + x] = cr(rx(r1 - 1, x), rx(r1, x), rx(r1 + 1, x), rx(r1 + 2, x), ty);
    }
  }

  /** Isolíneas por marching squares sobre el campo remuestreado (cada ISO_STEP px). */
  function isolines(levels: number[]) {
    const S = ISO_STEP, cols = Math.floor((W - 1) / S), rows = Math.floor((H - 1) / S);
    const f = (cx: number, cy: number) => field[cy * S * W + cx * S];
    const dark = modo === 'rojo' ? 'rgba(0,0,0,0.55)' : 'rgba(10,11,15,0.38)';
    const light = modo === 'rojo' ? 'rgba(255,77,77,0.6)' : 'rgba(244,239,230,0.55)';
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const L of levels) {
      ctx.beginPath();
      for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
        const a = f(cx, cy), b = f(cx + 1, cy), c = f(cx + 1, cy + 1), d = f(cx, cy + 1);
        const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const x0 = cx * S, y0 = cy * S;
        const top = (): [number, number] => [x0 + S * ((L - a) / (b - a)), y0];
        const right = (): [number, number] => [x0 + S, y0 + S * ((L - b) / (c - b))];
        const bottom = (): [number, number] => [x0 + S * ((L - d) / (c - d)), y0 + S];
        const left = (): [number, number] => [x0, y0 + S * ((L - a) / (d - a))];
        const seg = (p: [number, number], q: [number, number]) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
        switch (idx) {
          case 1: case 14: seg(left(), bottom()); break;
          case 2: case 13: seg(bottom(), right()); break;
          case 3: case 12: seg(left(), right()); break;
          case 4: case 11: seg(top(), right()); break;
          case 6: case 9: seg(top(), bottom()); break;
          case 7: case 8: seg(left(), top()); break;
          case 5: seg(left(), top()); seg(bottom(), right()); break;
          case 10: seg(top(), right()); seg(left(), bottom()); break;
        }
      }
      ctx.strokeStyle = dark; ctx.lineWidth = ISO_W * 2.6; ctx.stroke();
      ctx.strokeStyle = light; ctx.lineWidth = ISO_W; ctx.stroke();
    }
  }

  function paint() {
    const r = RAMPS[variable];
    const d = img.data;
    // Score de día (sin oscuridad en el centro): velo neutro, sin bandas (la leyenda lo aclara).
    const day = variable === 'score' && astroAtCenter(grid, time).sun > -12;
    if (day) {
      const [R, G, B, A] = modo === 'rojo' ? [0, 0, 0, 0.45] : [10, 11, 15, 0.4];
      for (let k = 0; k < W * H; k++) { const o = k * 4; d[o] = R; d[o + 1] = G; d[o + 2] = B; d[o + 3] = A * 255 * mask[k]; }
      ctx.putImageData(img, 0, 0);
    } else {
      computeField(sampleGrid(grid, variable, time));
      const table = lut(variable, modo), scale = 255 / (r.max - r.min);
      for (let k = 0; k < W * H; k++) {
        const i = Math.max(0, Math.min(255, Math.round((field[k] - r.min) * scale))) * 4, o = k * 4;
        d[o] = table[i]; d[o + 1] = table[i + 1]; d[o + 2] = table[i + 2]; d[o + 3] = table[i + 3];
      }
      ctx.putImageData(img, 0, 0);
      isolines(r.iso);
      // Aplicar la máscara de borde también a las isolíneas.
      const all = ctx.getImageData(0, 0, W, H), ad = all.data;
      for (let k = 0; k < W * H; k++) if (mask[k] < 1) ad[k * 4 + 3] *= mask[k];
      ctx.putImageData(all, 0, 0);
    }
    const src = map.getSource(SRC) as CanvasSource | undefined;
    if (src) {
      // Canvas estático: se copia a la textura durante unos cuadros y se vuelve a pausar (no se re-sube en cada frame).
      src.play(); map.triggerRepaint();
      clearTimeout(pauseTimer);
      pauseTimer = setTimeout(() => { if (!destroyed && map.getSource(SRC)) src.pause(); }, 400);
    }
  }

  function add() {
    if (destroyed || added || map.getSource(SRC)) return;
    map.addSource(SRC, {
      type: 'canvas', canvas, animate: false,
      coordinates: [[lonWest, latNorth], [east, latNorth], [east, south], [lonWest, south]],
    });
    const before = map.getLayer('rn52') ? 'rn52' : undefined; // debajo de la ruta y de los pines (HTML)
    map.addLayer({
      id: LAYER, type: 'raster', source: SRC,
      paint: { 'raster-opacity': OPACITY, 'raster-resampling': 'linear', 'raster-fade-duration': 0 },
      layout: { visibility: visible ? 'visible' : 'none' },
    }, before);
    added = true;
    paint();
  }
  if (map.isStyleLoaded()) add(); else map.once('load', add);
  // Por si el estilo ya cargó pero isStyleLoaded() todavía da false (tiles pendientes).
  const onIdle = () => { if (!added) add(); };
  map.once('idle', onIdle);

  // ---------- viento: partículas ----------
  const overlay = document.createElement('canvas');
  overlay.className = 'capa-viento';
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none', width: '100%', height: '100%' });
  const container = map.getCanvasContainer();
  const glCanvas = map.getCanvas();
  container.insertBefore(overlay, glCanvas.nextSibling);
  const octx = overlay.getContext('2d')!;
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let wind = sampleWindUV(grid, time);
  type P = { lon: number; lat: number; age: number; max: number };
  let parts: P[] = [];
  let raf = 0;
  let dpr = 1;

  const spawn = (p?: P): P => {
    const q = p ?? { lon: 0, lat: 0, age: 0, max: 0 };
    q.lon = lonWest + Math.random() * (east - lonWest);
    q.lat = south + Math.random() * (latNorth - south);
    q.age = 0; q.max = 50 + Math.random() * 70;
    return q;
  };

  function sizeOverlay() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = glCanvas.clientWidth, h = glCanvas.clientHeight;
    overlay.width = Math.round(w * dpr); overlay.height = Math.round(h * dpr);
    const n = Math.round(Math.min(1400, Math.max(350, (w * h) / 1300)));
    parts = Array.from({ length: n }, () => { const p = spawn(); p.age = Math.random() * p.max; return p; });
  }

  const ink = () => (modo === 'rojo' ? [255, 77, 77] : [248, 244, 236]);
  const windOn = () => visible && variable === 'wind' && !destroyed;

  function frame() {
    raf = 0;
    if (!windOn()) return;
    const w = overlay.width, h = overlay.height;
    octx.globalCompositeOperation = 'destination-in';
    octx.fillStyle = 'rgba(0,0,0,0.86)';
    octx.fillRect(0, 0, w, h);
    octx.globalCompositeOperation = 'source-over';
    const [R, G, B] = ink();
    octx.strokeStyle = `rgba(${R},${G},${B},0.7)`;
    octx.lineWidth = 1.15 * dpr;
    octx.lineCap = 'round';
    // Velocidad en pantalla proporcional al zoom: ~1 px/cuadro a 30 km/h en zoom 7.
    const k = 0.00022 / Math.pow(2, Math.max(0, map.getZoom() - 7));
    octx.beginPath();
    for (const p of parts) {
      const u = bilinear(grid, wind.u, p.lat, p.lon), v = bilinear(grid, wind.v, p.lat, p.lon);
      const a = map.project([p.lon, p.lat]);
      p.lon += (u * k) / Math.cos((p.lat * Math.PI) / 180);
      p.lat += v * k;
      p.age++;
      if (p.age > p.max || p.lon < lonWest || p.lon > east || p.lat < south || p.lat > latNorth) { spawn(p); continue; }
      const b = map.project([p.lon, p.lat]);
      octx.moveTo(a.x * dpr, a.y * dpr);
      octx.lineTo(b.x * dpr, b.y * dpr);
    }
    octx.stroke();
    raf = requestAnimationFrame(frame);
  }

  /** Sin animación (prefers-reduced-motion): flechas estáticas cada dos nodos. */
  function arrows() {
    octx.clearRect(0, 0, overlay.width, overlay.height);
    if (!windOn()) return;
    const [R, G, B] = ink();
    octx.strokeStyle = `rgba(${R},${G},${B},0.8)`;
    octx.lineWidth = 1.3 * dpr;
    for (let r = 0; r < nLat; r += 2) for (let c = 0; c < nLon; c += 2) {
      const k = r * nLon + c, u = wind.u[k], v = wind.v[k], s = Math.hypot(u, v);
      if (s < 2) continue;
      const pt = map.project([lonWest + c * step, latNorth - r * step]);
      const len = (6 + Math.min(14, s / 3)) * dpr, ang = Math.atan2(-v, u);
      const x = pt.x * dpr, y = pt.y * dpr, x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      octx.beginPath();
      octx.moveTo(x - Math.cos(ang) * len * 0.3, y - Math.sin(ang) * len * 0.3); octx.lineTo(x2, y2);
      octx.moveTo(x2, y2); octx.lineTo(x2 - Math.cos(ang - 0.5) * 5 * dpr, y2 - Math.sin(ang - 0.5) * 5 * dpr);
      octx.moveTo(x2, y2); octx.lineTo(x2 - Math.cos(ang + 0.5) * 5 * dpr, y2 - Math.sin(ang + 0.5) * 5 * dpr);
      octx.stroke();
    }
  }

  function syncWind() {
    overlay.style.display = windOn() ? 'block' : 'none';
    if (!windOn()) { if (raf) cancelAnimationFrame(raf); raf = 0; octx.clearRect(0, 0, overlay.width, overlay.height); return; }
    if (reduced) arrows();
    else if (!raf) raf = requestAnimationFrame(frame);
  }

  const onMove = () => { octx.clearRect(0, 0, overlay.width, overlay.height); if (reduced) arrows(); };
  const onResize = () => { sizeOverlay(); onMove(); };
  sizeOverlay();
  map.on('move', onMove);
  map.on('resize', onResize);

  // ---------- modo rojo ----------
  const mo = new MutationObserver(() => {
    const m = currentModo();
    if (m === modo) return;
    modo = m;
    if (added) paint();
    onMove();
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-modo'] });

  syncWind();

  return {
    setVariable(v) {
      if (v === variable) return;
      variable = v;
      if (added) paint();
      syncWind();
    },
    setTime(d) {
      if (d.getTime() === time.getTime()) return;
      time = d;
      wind = sampleWindUV(grid, time);
      if (added) paint();
      if (reduced) arrows();
    },
    setVisible(b) {
      visible = b;
      if (added && map.getLayer(LAYER)) map.setLayoutProperty(LAYER, 'visibility', b ? 'visible' : 'none');
      syncWind();
    },
    destroy() {
      destroyed = true;
      clearTimeout(pauseTimer);
      if (raf) cancelAnimationFrame(raf);
      mo.disconnect();
      map.off('move', onMove); map.off('resize', onResize); map.off('load', add); map.off('idle', onIdle);
      overlay.remove();
      try {
        if (map.getLayer(LAYER)) map.removeLayer(LAYER);
        if (map.getSource(SRC)) map.removeSource(SRC);
      } catch { /* mapa ya removido */ }
    },
  };
}
