import { useEffect, useMemo, useRef, useState } from 'react';
import { buildScene, brightTargets, draw, readColors, type Colors, type Picked, type Scene } from '../cielo/render';
import { cardinal, type Camera, type Vec3 } from '../../sky/stars';
import {
  angleDiff, applyCalibration, calibrationFrom, deviceToView, diagonalFov, smoothView, smoothingK, type Calibration, type View,
} from '../../sky/orientation';
import { needsPermissionGesture, openBackCamera, requestOrientationPermission, screenAngle, stopStream, subscribeOrientation, type OrientationSample } from './sensors';
import './observatorio.css';

type Point = { name: string; lat: number; lon: number; elevationM: number };
type Sat = { name: string; azDeg: number; altDeg: number; visible: boolean };

const LS_CAL = 'hanan.observatorio.calibracion';
const LS_FOV = 'hanan.observatorio.fov';
const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

/** Solo Safari de iOS/iPadOS necesita el botón de permiso (en escritorio no hay brújula). */
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);

type Target = ReturnType<typeof brightTargets>[number];
type Mode = 'esperando' | 'sensor' | 'arrastre';

export default function Observatorio(props: { point: Point; date: Date; satellites?: Sat[]; onClose: () => void }) {
  const { point, satellites, onClose } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ---- tiempo en vivo: arranca en props.date y avanza con el reloj
  const opened = useRef({ wall: Date.now(), date: props.date.getTime() });
  useEffect(() => { opened.current = { wall: Date.now(), date: props.date.getTime() }; }, [props.date.getTime()]);
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((x) => x + 1), 15_000); return () => clearInterval(id); }, []);
  const now = useMemo(() => new Date(opened.current.date + (Date.now() - opened.current.wall)), [tick, props.date.getTime()]);
  const scene = useMemo<Scene>(() => buildScene(now, point, satellites ?? []), [now, point.lat, point.lon, point.elevationM, point.name, satellites]);

  // ---- estado
  const [camState, setCamState] = useState<'pendiente' | 'activa' | 'sin-camara'>('pendiente');
  const [mode, setMode] = useState<Mode>('esperando');
  const [absolute, setAbsolute] = useState(true);
  const [accuracy, setAccuracy] = useState<number | undefined>();
  const [askPermission, setAskPermission] = useState(false);
  const [fovV, setFovV] = useState<number>(() => load(LS_FOV, 60));
  const [cal, setCal] = useState<Calibration | null>(() => load<Calibration | null>(LS_CAL, null));
  const [localRed, setLocalRed] = useState(false);
  const [globalRed, setGlobalRed] = useState(() => document.documentElement.getAttribute('data-modo') === 'rojo');
  const [panel, setPanel] = useState<null | 'alinear' | 'ajustes'>(null);
  const [aim, setAim] = useState<Target | null>(null);
  const [hud, setHud] = useState({ az: 180, alt: 30 });
  const [near, setNear] = useState<{ name: string; sub: string } | null>(null);
  const red = localRed || globalRed;

  // refs para el loop
  const raw = useRef<View | null>(null); // lectura del sensor (sin calibrar), suavizada
  const dragView = useRef<View>({ azDeg: 180, altDeg: 30, rollDeg: 0 });
  const colors = useRef<Colors | null>(null);
  const dirty = useRef(true);
  const live = useRef({ scene, cal, fovV, mode, aim, camOn: false });
  live.current = { scene, cal, fovV, mode, aim, camOn: camState === 'activa' };
  useEffect(() => { dirty.current = true; }, [scene, cal, fovV, mode, aim, camState, red]);

  // ---- cámara
  useEffect(() => {
    let stream: MediaStream | null = null, cancelled = false;
    openBackCamera().then((s) => {
      if (cancelled) { stopStream(s); return; }
      stream = s;
      if (!s || !videoRef.current) { setCamState('sin-camara'); return; }
      videoRef.current.srcObject = s;
      videoRef.current.play().catch(() => {});
      setCamState('activa');
    });
    return () => { cancelled = true; stopStream(stream); if (videoRef.current) videoRef.current.srcObject = null; };
  }, []);

  // ---- pantalla encendida mientras se observa
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
    return () => { void lock?.release().catch(() => {}); };
  }, []);

  // ---- orientación
  useEffect(() => {
    let got = false, last = 0;
    const onSample = (s: OrientationSample) => {
      const v = deviceToView(s.alpha, s.beta, s.gamma, screenAngle());
      const k = last ? smoothingK(s.t - last) : 1;
      last = s.t;
      raw.current = smoothView(raw.current, v, k);
      if (!got) { got = true; setMode('sensor'); }
      setAbsolute((a) => (a === s.absolute ? a : s.absolute));
      setAccuracy((a) => (a === s.accuracy ? a : s.accuracy));
    };
    const unsub = subscribeOrientation(onSample);
    requestOrientationPermission().then((r) => { if (r === 'denied' && needsPermissionGesture() && isIOS()) setAskPermission(true); });
    const to = setTimeout(() => { if (!got) setMode('arrastre'); }, 1600);
    return () => { unsub(); clearTimeout(to); };
  }, []);

  // ---- colores (modo rojo global o propio del overlay)
  useEffect(() => {
    const read = () => { if (rootRef.current) { colors.current = readColors(rootRef.current); dirty.current = true; } };
    read();
    const mo = new MutationObserver(() => { setGlobalRed(document.documentElement.getAttribute('data-modo') === 'rojo'); read(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-modo', 'class', 'style'] });
    document.fonts?.ready.then(read).catch(() => {});
    return () => mo.disconnect();
  }, []);
  useEffect(() => { if (rootRef.current) { colors.current = readColors(rootRef.current); dirty.current = true; } }, [red]);

  // ---- Esc cierra (o cierra el panel abierto)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (aim) setAim(null); else if (panel) setPanel(null); else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aim, panel, onClose]);

  // ---- loop de dibujo
  useEffect(() => {
    const cv = canvasRef.current!, root = rootRef.current!;
    const ctx = cv.getContext('2d')!;
    const size = { w: 1, h: 1 };
    const resize = () => {
      const r = root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
      cv.style.width = `${r.width}px`; cv.style.height = `${r.height}px`;
      size.w = r.width; size.h = r.height; dirty.current = true;
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(root);
    let raf = 0, lastDraw = 0, lastView: View | null = null, lastHud = '', lastNear = '';
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const L = live.current;
      const v: View = L.mode === 'sensor' && raw.current ? applyCalibration(raw.current, L.cal) : dragView.current;
      const moved = !lastView || Math.abs(angleDiff(lastView.azDeg, v.azDeg)) > 0.05 || Math.abs(lastView.altDeg - v.altDeg) > 0.05 || Math.abs(angleDiff(lastView.rollDeg, v.rollDeg)) > 0.1;
      if (!moved && !dirty.current && t - lastDraw < 1000) return;
      if (!colors.current) return;
      dirty.current = false; lastDraw = t; lastView = v;
      const cam: Camera = { azDeg: v.azDeg, altDeg: v.altDeg, fovDeg: diagonalFov(L.fovV, size.w, size.h), width: size.w, height: size.h };
      const dpr = cv.width / Math.max(1, size.w);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const ar = L.camOn;
      const hits = draw(ctx, L.scene, cam, colors.current, L.aim?.v ?? null, {
        transparentSky: ar, maxMag: ar ? 4.5 : 5.5, rollDeg: v.rollDeg, projection: 'gnomonic', labelHalo: ar,
      });
      // objeto más cercano a la mira
      const cx = size.w / 2, cy = size.h / 2;
      let best: Picked | null = null, bestS = Infinity;
      for (const h of hits) {
        const d = Math.hypot(h.x - cx, h.y - cy);
        if (d > 64) continue;
        const s = d - h.prio * 4;
        if (s < bestS) { const p = h.pick(); if (p.name === 'Estrella') continue; best = p; bestS = s; }
      }
      const nk = best ? `${best.name}|${best.sub}` : '';
      if (nk !== lastNear) { lastNear = nk; setNear(best ? { name: best.name, sub: best.sub } : null); }
      const hk = `${Math.round(v.azDeg)}|${Math.round(v.altDeg)}`;
      if (hk !== lastHud) { lastHud = hk; setHud({ az: v.azDeg, alt: v.altDeg }); }
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  // ---- arrastre (sin sensores) y pinza para el FOV
  useEffect(() => {
    const cv = canvasRef.current!;
    const ptrs = new Map<number, { x: number; y: number }>();
    let pinch0 = 0, fov0 = 60;
    const down = (e: PointerEvent) => {
      cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); fov0 = live.current.fovV; }
    };
    const move = (e: PointerEvent) => {
      const prev = ptrs.get(e.pointerId);
      if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY }; ptrs.set(e.pointerId, cur);
      if (ptrs.size >= 2 && pinch0 > 0) {
        const [a, b] = [...ptrs.values()];
        const f = Math.max(25, Math.min(100, (fov0 * pinch0) / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))));
        setFovV(Math.round(f)); return;
      }
      if (live.current.mode === 'sensor') return;
      const degPerPx = live.current.fovV / Math.max(1, cv.clientHeight);
      const d = dragView.current;
      dragView.current = { azDeg: (d.azDeg - (cur.x - prev.x) * degPerPx + 360) % 360, altDeg: Math.max(-20, Math.min(89, d.altDeg + (cur.y - prev.y) * degPerPx)), rollDeg: 0 };
    };
    const up = (e: PointerEvent) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; };
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    return () => { cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up); };
  }, []);

  useEffect(() => save(LS_FOV, fovV), [fovV]);

  const targets = useMemo(() => (panel === 'alinear' ? brightTargets(scene, 1).slice(0, 8) : []), [panel, scene]);

  const finishAim = () => {
    if (!aim || !raw.current) { setAim(null); return; }
    const c = calibrationFrom(raw.current, { azDeg: aim.azDeg, altDeg: aim.altDeg }, aim.name);
    setCal(c); save(LS_CAL, c); setAim(null);
  };
  const resetCal = () => { setCal(null); save(LS_CAL, null); };

  // pista de hacia dónde girar durante la alineación
  const aimHint = useMemo(() => {
    if (!aim) return '';
    const dAz = angleDiff(hud.az, aim.azDeg), dAlt = aim.altDeg - hud.alt;
    const parts: string[] = [];
    if (Math.abs(dAz) > 4) parts.push(`${dAz > 0 ? 'derecha' : 'izquierda'} ${Math.round(Math.abs(dAz))}°`);
    if (Math.abs(dAlt) > 4) parts.push(`${dAlt > 0 ? 'arriba' : 'abajo'} ${Math.round(Math.abs(dAlt))}°`);
    return parts.length ? `Según la brújula está: ${parts.join(' · ')}` : 'Debería estar en la mira';
  }, [aim, hud]);

  const lookLabel = hud.alt > 72 ? 'Mirando al cénit' : hud.alt < -60 ? 'Mirando al suelo' : `Mirando al ${cardinal(hud.az)}`;
  const status = mode === 'arrastre'
    ? 'Sin brújula: arrastrá para mirar'
    : mode === 'esperando' ? 'Buscando la brújula…'
    : !absolute ? 'Brújula relativa: alineá con un objeto'
    : accuracy !== undefined ? `Brújula ±${Math.round(accuracy)}°${cal ? ' · alineada' : ''}`
    : cal ? `Alineada con ${cal.target ?? 'un objeto'}` : 'Para más precisión, alineá con un objeto';

  return (
    <div className={`obs${camState === 'activa' ? ' obs-cam' : ''}`} ref={rootRef} data-modo={red ? 'rojo' : undefined} role="dialog" aria-modal="true" aria-label="Modo observatorio">
      <video ref={videoRef} className="obs-video" playsInline muted autoPlay aria-hidden="true" />
      <canvas ref={canvasRef} className="obs-canvas" role="img" aria-label={`${lookLabel}, ${Math.round(hud.alt)}° de altura`} />

      <div className="obs-reticle" aria-hidden="true"><span /></div>
      {near && !aim && (
        <p className="obs-near" aria-live="polite"><strong>{near.name}</strong><span>{near.sub}</span></p>
      )}

      <header className="obs-top">
        <button type="button" className="obs-icon" aria-label="Cerrar modo observatorio" onClick={onClose}>
          <svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" /></svg>
        </button>
        <div className="obs-head">
          <p className="obs-look">{lookLabel} · <span className="obs-num">{Math.round(hud.alt)}°</span></p>
          <p className="obs-status">{status}</p>
        </div>
        <div className="obs-actions">
          <button
            type="button" className="obs-icon" aria-pressed={red} aria-label={globalRed ? 'Modo rojo (activado en la app)' : 'Modo rojo'}
            aria-disabled={globalRed} onClick={() => { if (!globalRed) setLocalRed((x) => !x); }}
          >
            <svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="5.5" /><path d="M10 4.5v11" /></svg>
          </button>
          <button type="button" className="obs-icon" aria-pressed={panel === 'ajustes'} aria-label="Ajustes del observatorio" onClick={() => setPanel(panel === 'ajustes' ? null : 'ajustes')}>
            <svg viewBox="0 0 20 20"><path d="M3 6h9M15 6h2M3 14h2M8 14h9" /><circle cx="13.5" cy="6" r="1.6" /><circle cx="6.5" cy="14" r="1.6" /></svg>
          </button>
        </div>
      </header>

      {askPermission && mode !== 'sensor' && (
        <button type="button" className="obs-pill obs-perm" onClick={() => requestOrientationPermission().then((r) => { if (r === 'granted') setAskPermission(false); })}>
          Activar brújula
        </button>
      )}

      {aim ? (
        <section className="obs-sheet obs-aim" aria-label="Alinear">
          <p className="obs-aim-title">Centrá <strong>{aim.name}</strong> en la mira</p>
          <p className="obs-aim-hint">{aimHint}</p>
          <div className="obs-row">
            <button type="button" className="obs-pill obs-ghost" onClick={() => setAim(null)}>Cancelar</button>
            <button type="button" className="obs-pill obs-primary" onClick={finishAim}>Listo</button>
          </div>
        </section>
      ) : panel === 'alinear' ? (
        <section className="obs-sheet" aria-label="Elegí un objeto para alinear">
          <div className="obs-sheet-head">
            <h2>Alinear con el cielo</h2>
            <button type="button" className="obs-icon obs-icon-flat" aria-label="Cerrar" onClick={() => setPanel(null)}><svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" /></svg></button>
          </div>
          <p className="obs-sheet-sub">Elegí un objeto que veas ahora. Lo centrás en la mira y la app corrige la brújula.</p>
          {targets.length === 0 ? <p className="obs-sheet-sub">No hay objetos brillantes sobre el horizonte en este momento.</p> : (
            <ul className="obs-list">
              {targets.map((t) => (
                <li key={t.name}>
                  <button type="button" onClick={() => { setPanel(null); setAim(t); }}>
                    <span className="obs-list-name">{t.name}<small>{t.sub}</small></span>
                    <span className="obs-num obs-list-pos">{cardinal(t.azDeg)} · {Math.round(t.altDeg)}°</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : panel === 'ajustes' ? (
        <section className="obs-sheet" aria-label="Ajustes">
          <div className="obs-sheet-head">
            <h2>Ajustes</h2>
            <button type="button" className="obs-icon obs-icon-flat" aria-label="Cerrar" onClick={() => setPanel(null)}><svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" /></svg></button>
          </div>
          <label className="obs-field">
            <span>Campo de la cámara <strong className="obs-num">{fovV}°</strong></span>
            <input type="range" min={30} max={90} step={1} value={fovV} onChange={(e) => setFovV(+e.target.value)} aria-label="Campo de visión vertical de la cámara" />
            <small>Si las estrellas quedan más separadas que en la imagen, subilo.</small>
          </label>
          <div className="obs-row obs-row-between">
            <span className="obs-sheet-sub">{cal ? `Alineada con ${cal.target ?? 'un objeto'} (${cal.dAz >= 0 ? '+' : '−'}${Math.abs(cal.dAz).toFixed(1).replace('.', ',')}°)` : 'Sin alinear'}</span>
            <button type="button" className="obs-pill obs-ghost" disabled={!cal} onClick={resetCal}>Restablecer</button>
          </div>
        </section>
      ) : (
        <footer className="obs-bottom">
          <button type="button" className="obs-pill obs-primary" disabled={mode !== 'sensor'} onClick={() => setPanel('alinear')} aria-label="Alinear la brújula con un objeto del cielo">
            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="M10 1.5v4M10 14.5v4M1.5 10h4M14.5 10h4" /></svg>
            Alinear
          </button>
          {camState === 'sin-camara' && <p className="obs-status obs-nocam">Sin cámara: modo planetario</p>}
        </footer>
      )}
    </div>
  );
}

export type { Vec3 };
