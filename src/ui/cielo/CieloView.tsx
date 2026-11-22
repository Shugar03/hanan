import { X } from 'lucide-react';
import { ICON } from '../kit';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as A from 'astronomy-engine';
import { cardinal, cameraBasis, circumpolar, enuToAltAz, eqjToEnu, mulVec, raDecToVec, riseSet, type Camera } from '../../sky/stars';
import { hhmm, localNoon, nightOf } from '../../sky/time';
import { buildScene, draw, readColors, type Colors, type Picked, type Scene } from './render';
import './cielo.css';

type Point = { name: string; lat: number; lon: number; elevationM: number };
type Sat = { name: string; azDeg: number; altDeg: number; visible: boolean };

const FOV_MIN = 18, FOV_MAX = 140;
const clampAlt = (a: number) => Math.max(-12, Math.min(88, a));

export default function CieloView(props: {
  point: { name: string; lat: number; lon: number; elevationM: number };
  date: Date;
  onDateChange?: (d: Date) => void;
  satellites?: { name: string; azDeg: number; altDeg: number; visible: boolean }[];
}) {
  const { point, onDateChange, satellites } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [t, setT] = useState(() => props.date.getTime());
  useEffect(() => setT(props.date.getTime()), [props.date.getTime()]);
  const date = useMemo(() => new Date(t), [t]);

  const scene = useMemo<Scene>(
    () => buildScene(date, point, satellites ?? []),
    [t, point.lat, point.lon, point.elevationM, point.name, satellites],
  );

  const night = useMemo(() => nightRange(date, point), [nightOf(date), point.lat, point.lon]);

  const cam = useRef<Camera>({ azDeg: 180, altDeg: 25, fovDeg: 110, width: 1, height: 1 });
  const [heading, setHeading] = useState({ az: 180, alt: 25 });
  const [picked, setPicked] = useState<Picked | null>(null);
  const hits = useRef<ReturnType<typeof draw>>([]);
  const colors = useRef<Colors | null>(null);
  const dirty = useRef(true);
  const sceneRef = useRef(scene);
  const pickedRef = useRef<Picked | null>(null);
  sceneRef.current = scene;
  pickedRef.current = picked;
  const anim = useRef<{ az: number; alt: number; from: { az: number; alt: number }; t0: number } | null>(null);
  const vel = useRef({ az: 0, alt: 0, active: false });

  // re-render del canvas cuando cambia la escena o la selección
  useEffect(() => { dirty.current = true; }, [scene, picked]);

  // colores desde las CSS vars; se recalculan al cambiar data-modo
  useEffect(() => {
    const read = () => { if (rootRef.current) { colors.current = readColors(rootRef.current); dirty.current = true; } };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-modo', 'class', 'style'] });
    document.fonts?.ready.then(read).catch(() => {});
    return () => mo.disconnect();
  }, []);

  // tamaño + loop
  useEffect(() => {
    const cv = canvasRef.current!, root = rootRef.current!;
    const ctx = cv.getContext('2d')!;
    const resize = () => {
      const r = root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
      cv.style.width = `${r.width}px`; cv.style.height = `${r.height}px`;
      cam.current.width = r.width; cam.current.height = r.height;
      dirty.current = true;
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(root);
    let raf = 0, lastHead = '';
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const c = cam.current;
      if (anim.current) {
        const k = Math.min(1, (now - anim.current.t0) / 450), e = 1 - Math.pow(1 - k, 3);
        let d = anim.current.az - anim.current.from.az; d = ((d + 540) % 360) - 180;
        c.azDeg = (anim.current.from.az + d * e + 360) % 360;
        c.altDeg = anim.current.from.alt + (anim.current.alt - anim.current.from.alt) * e;
        if (k >= 1) anim.current = null;
        dirty.current = true;
      } else if (!vel.current.active && (Math.abs(vel.current.az) > 0.01 || Math.abs(vel.current.alt) > 0.01)) {
        c.azDeg = (c.azDeg + vel.current.az + 360) % 360; c.altDeg = clampAlt(c.altDeg + vel.current.alt);
        vel.current.az *= 0.92; vel.current.alt *= 0.92; dirty.current = true;
      }
      if (!dirty.current || !colors.current) return;
      dirty.current = false;
      const dpr = cv.width / Math.max(1, c.width);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      hits.current = draw(ctx, sceneRef.current, c, colors.current, pickedRef.current?.v ?? null);
      const h = `${Math.round(c.azDeg)}|${Math.round(c.altDeg)}`;
      if (h !== lastHead) { lastHead = h; setHeading({ az: c.azDeg, alt: c.altDeg }); }
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  // gestos: arrastre, pinza, rueda, toque
  useEffect(() => {
    const cv = canvasRef.current!;
    const ptrs = new Map<number, { x: number; y: number }>();
    let down: { x: number; y: number; t: number; moved: boolean } | null = null;
    let pinch0 = 0, fov0 = 0, lastMove = 0;
    const scale = () => cameraBasis(cam.current).scale;
    const onDown = (e: PointerEvent) => {
      cv.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      anim.current = null; vel.current = { az: 0, alt: 0, active: true };
      if (ptrs.size === 1) down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinch0 = Math.hypot(a.x - b.x, a.y - b.y); fov0 = cam.current.fovDeg;
        if (down) down.moved = true;
      }
    };
    const onMove = (e: PointerEvent) => {
      const prev = ptrs.get(e.pointerId);
      if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY };
      ptrs.set(e.pointerId, cur);
      const c = cam.current;
      if (ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch0 > 0) c.fovDeg = Math.max(FOV_MIN, Math.min(FOV_MAX, (fov0 * pinch0) / Math.max(1, d)));
        dirty.current = true;
        return;
      }
      const dx = cur.x - prev.x, dy = cur.y - prev.y;
      if (down && Math.hypot(cur.x - down.x, cur.y - down.y) > 6) down.moved = true;
      if (!down?.moved) return;
      const k = 180 / Math.PI / scale();
      const dAz = -dx * k, dAlt = dy * k;
      c.azDeg = (c.azDeg + dAz + 360) % 360; c.altDeg = clampAlt(c.altDeg + dAlt);
      const now = performance.now(), dt = Math.max(8, now - lastMove); lastMove = now;
      vel.current.az = (dAz * 16) / dt; vel.current.alt = (dAlt * 16) / dt;
      dirty.current = true;
    };
    const onUp = (e: PointerEvent) => {
      ptrs.delete(e.pointerId);
      if (ptrs.size === 0) {
        vel.current.active = false;
        if (performance.now() - lastMove > 80) vel.current.az = vel.current.alt = 0;
        if (down && !down.moved && performance.now() - down.t < 500) tap(e.clientX, e.clientY);
        down = null;
      }
      if (ptrs.size < 2) pinch0 = 0;
    };
    const tap = (cx: number, cy: number) => {
      const r = cv.getBoundingClientRect();
      const x = cx - r.left, y = cy - r.top;
      let best: (typeof hits.current)[number] | null = null, bestScore = Infinity;
      for (const h of hits.current) {
        const d = Math.hypot(h.x - x, h.y - y);
        if (d > h.r) continue;
        const s = d - h.prio * 3;
        if (s < bestScore) { bestScore = s; best = h; }
      }
      if (best) setPicked(best.pick());
      else setPicked(null);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const c = cam.current;
      c.fovDeg = Math.max(FOV_MIN, Math.min(FOV_MAX, c.fovDeg * Math.exp(e.deltaY * 0.0012)));
      dirty.current = true;
    };
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove);
      cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onUp); cv.removeEventListener('wheel', onWheel);
    };
  }, []);

  // la ficha sigue al objeto cuando cambia la hora
  useEffect(() => {
    if (!picked) return;
    setPicked((p) => (p ? refreshPick(p, scene) : p));
  }, [scene]);

  const lookAt = (az: number) => {
    anim.current = { az, alt: cam.current.altDeg, from: { az: cam.current.azDeg, alt: cam.current.altDeg }, t0: performance.now() };
    vel.current = { az: 0, alt: 0, active: false };
    dirty.current = true;
  };

  const setTime = (ms: number) => {
    setT(ms);
    onDateChange?.(new Date(ms));
  };

  const span = night.end - night.start;
  const sliderVal = Math.max(0, Math.min(1000, Math.round(((t - night.start) / span) * 1000)));
  const dayLabel = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Argentina/Jujuy' }).format(date);
  const sunUp = scene.sun.altDeg > -6;

  return (
    <div className="cielo" ref={rootRef}>
      <canvas ref={canvasRef} className="cielo-canvas" aria-label={`Cielo desde ${point.name}, mirando al ${cardinal(heading.az)}`} role="img" />

      <header className="cielo-top">
        <div className="cielo-where">
          <p className="cielo-place">{point.name}</p>
          <p className="cielo-look">
            {heading.alt > 72 ? <>Mirando al <strong>cénit</strong></> : <>Mirando al <strong>{cardinal(heading.az)}</strong></>} · {Math.round(heading.alt)}° de altura
          </p>
        </div>
        <nav className="cielo-dirs" aria-label="Mirar hacia">
          {([['N', 0], ['E', 90], ['S', 180], ['O', 270]] as const).map(([l, az]) => (
            <button key={l} type="button" aria-pressed={Math.abs(((heading.az - az + 540) % 360) - 180) < 23} onClick={() => lookAt(az)}>{l}</button>
          ))}
        </nav>
      </header>

      {picked && <Ficha p={picked} date={date} point={point} onClose={() => setPicked(null)} />}

      <footer className="cielo-bar">
        <div className="cielo-time">
          <span className="cielo-hh">{hhmm(date)}</span>
          <span className="cielo-day">{dayLabel}{sunUp ? ' · de día' : ''}</span>
          <button type="button" className="cielo-now" onClick={() => setTime(Date.now())}>Ahora</button>
        </div>
        <input
          className="cielo-range" type="range" min={0} max={1000} step={1} value={sliderVal}
          aria-label="Hora de la noche" aria-valuetext={hhmm(date)}
          onChange={(e) => setTime(Math.round((night.start + (+e.target.value / 1000) * span) / 60000) * 60000)}
        />
        <div className="cielo-ends">
          <span>Puesta {hhmm(new Date(night.start))}</span>
          <span>Salida {hhmm(new Date(night.end))}</span>
        </div>
      </footer>
    </div>
  );
}

function nightRange(date: Date, p: Point) {
  const o = new A.Observer(p.lat, p.lon, p.elevationM);
  const noon = localNoon(nightOf(date));
  const set = A.SearchRiseSet(A.Body.Sun, o, -1, noon, 1)?.date ?? new Date(noon.getTime() + 7 * 3600_000);
  const rise = A.SearchRiseSet(A.Body.Sun, o, +1, set, 1)?.date ?? new Date(set.getTime() + 11 * 3600_000);
  return { start: set.getTime(), end: rise.getTime() };
}

function refreshPick(p: Picked, sc: Scene): Picked | null {
  if (p.kind === 'body') {
    const b = p.body === A.Body.Moon ? sc.moon : p.body === A.Body.Sun ? sc.sun : sc.planets.find((x) => x.body === p.body);
    if (!b) return null;
    const extra = p.body === A.Body.Moon ? `${sc.moon.phaseName} · ${Math.round(sc.moon.illum * 100)} % iluminada` : p.extra;
    return { ...p, altDeg: b.altDeg, azDeg: b.azDeg, v: b.v, mag: b.mag, extra };
  }
  if (p.kind === 'sat') {
    const s = sc.sats.find((x) => x.name === p.name);
    return s ? { ...p, altDeg: s.altDeg, azDeg: s.azDeg, v: s.v } : null;
  }
  // estrellas y objetos de cielo profundo: recomputar con la matriz de la escena
  const m = sc.dso.find((d) => d.name === p.name);
  if (m) return { ...p, v: m.v, ...enuToAltAz(m.v) };
  const v = starVecFromScene(sc, p.raH, p.decDeg);
  return { ...p, v, ...enuToAltAz(v) };
}

const starVecFromScene = (sc: Scene, raH: number, decDeg: number) => mulVec(eqjToEnu(sc.date, sc.p), raDecToVec(raH, decDeg));

const fmtDeg = (x: number) => `${x.toFixed(1).replace('.', ',')}°`;
const fmtMag = (x: number) => (Math.abs(x) < 0.05 ? 0 : x).toFixed(1).replace('.', ',').replace('-', '−');

function Ficha({ p, date, point, onClose }: { p: Picked; date: Date; point: Point; onClose: () => void }) {
  const rs = useMemo(() => {
    if (p.kind === 'sat') return null;
    if (p.kind === 'body') return { ...riseSet(date, point, p.body), cp: null as null | string };
    const cp = circumpolar(p.decDeg, point.lat);
    if (cp) return { rise: null, set: null, cp: cp === 'siempre' ? 'Nunca se pone desde acá' : 'No sale desde esta latitud' };
    return { ...riseSet(date, point, { raH: p.raH, decDeg: p.decDeg }), cp: null };
  }, [p.name, p.kind, Math.floor(date.getTime() / 600000), point.lat, point.lon]);
  const below = p.altDeg < 0;
  return (
    <section className="cielo-ficha" aria-live="polite">
      <div className="cielo-ficha-head">
        <div>
          <h2>{p.name}</h2>
          <p className="cielo-ficha-sub">{p.sub}{p.extra ? ` · ${p.extra}` : ''}</p>
        </div>
        <button type="button" className="cielo-x" aria-label="Cerrar ficha" onClick={onClose}>
          <X {...ICON} size={18} />
        </button>
      </div>
      <dl className="cielo-ficha-data">
        <div><dt>Altura</dt><dd>{fmtDeg(p.altDeg)}{below ? ' (bajo el horizonte)' : ''}</dd></div>
        <div><dt>Azimut</dt><dd>{fmtDeg(p.azDeg)} {cardinal(p.azDeg)}</dd></div>
        {'mag' in p && p.mag !== undefined && <div><dt>Magnitud</dt><dd>{fmtMag(p.mag)}</dd></div>}
        {rs?.cp && <div className="wide"><dt>Salida y puesta</dt><dd>{rs.cp}</dd></div>}
        {rs && !rs.cp && rs.rise && <div><dt>Sale</dt><dd>{hhmm(rs.rise)}</dd></div>}
        {rs && !rs.cp && rs.set && <div><dt>Se pone</dt><dd>{hhmm(rs.set)}</dd></div>}
      </dl>
    </section>
  );
}
