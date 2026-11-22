import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { GridVar } from '../../data/grid';
import { GRID_ATTRIBUTION } from '../../data/grid';
import { sunAltitude } from '../../sky/ephemeris';
import { localParts } from '../../sky/time';
import { colorAt, currentModo, legendGradient, RAMPS } from './colormaps';
import './capas.css';

const CHIPS: { v: GridVar; label: string; aria: string }[] = [
  { v: 'score', label: 'Score', aria: 'Score de cielo' },
  { v: 'cloud_total', label: 'Nubes', aria: 'Nubosidad total' },
  { v: 'cloud_low', label: 'Bajas', aria: 'Nubes bajas' },
  { v: 'cloud_mid', label: 'Medias', aria: 'Nubes medias' },
  { v: 'cloud_high', label: 'Altas', aria: 'Nubes altas' },
  { v: 'wind', label: 'Viento', aria: 'Viento a 10 m' },
  { v: 'temp', label: 'Temp', aria: 'Temperatura a 2 m' },
];

const SCORE_CATS: { name: string; range: string; at: number }[] = [
  { name: 'Malo', range: '0–39', at: 25 }, { name: 'Aceptable', range: '40–69', at: 55 },
  { name: 'Muy bueno', range: '70–84', at: 77 }, { name: 'Excelente', range: '85–100', at: 92 },
];
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
// Centro de la grilla de la Puna: ahí se marca noche / día en el scrubber.
const CENTRO = { lat: -23.2, lon: -66.2, elevationM: 3800 };
const p2 = (n: number) => String(n).padStart(2, '0');
const hourLabel = (d: Date) => { const p = localParts(d); return { day: `${DIAS[p.dow]} ${p.d}`, hm: `${p2(p.h)}:${p2(p.min)}`, long: `${DIAS_L[p.dow]} ${p.d}, ${p2(p.h)}:${p2(p.min)}` }; };

function useModo() {
  return useSyncExternalStore(
    (cb) => { const mo = new MutationObserver(cb); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-modo'] }); return () => mo.disconnect(); },
    currentModo, () => 'normal' as const,
  );
}

type Props = {
  variable: GridVar | null;
  onVariable: (v: GridVar | null) => void;
  time: Date;
  onTime: (d: Date) => void;
  hours: Date[];
  playing?: boolean;
  onPlay?: (b: boolean) => void;
};

/** Selector de capa + scrubber horario (play/pausa) + leyenda. Si no se pasa `playing`, maneja la reproducción solo. */
export default function CapasControls({ variable, onVariable, time, onTime, hours, playing, onPlay }: Props) {
  const modo = useModo();
  const [ownPlaying, setOwnPlaying] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const isPlaying = playing ?? ownPlaying;
  const setPlaying = (b: boolean) => { if (onPlay) onPlay(b); if (playing === undefined) setOwnPlaying(b); };

  const idx = useMemo(() => {
    if (!hours.length) return 0;
    let best = 0, bd = Infinity;
    hours.forEach((h, i) => { const d = Math.abs(h.getTime() - time.getTime()); if (d < bd) { bd = d; best = i; } });
    return best;
  }, [hours, time]);

  const idxRef = useRef(idx); idxRef.current = idx;
  const onTimeRef = useRef(onTime); onTimeRef.current = onTime;
  useEffect(() => {
    if (!isPlaying || hours.length < 2 || !variable) return;
    const id = setInterval(() => { onTimeRef.current(hours[(idxRef.current + 1) % hours.length]); }, 650);
    return () => clearInterval(id);
  }, [isPlaying, hours, variable]);

  // Franjas de noche (sol ≤ −12° en el centro de la Puna) dibujadas en el riel del scrubber.
  const { track, days, sunAlt } = useMemo(() => {
    const n = Math.max(1, hours.length - 1);
    const alt = hours.map((h) => sunAltitude(h, CENTRO));
    const stops = alt.map((a, i) => `${a <= -12 ? 'var(--capas-noche)' : a <= 0 ? 'var(--capas-crepusculo)' : 'var(--capas-dia)'} ${((i / n) * 100).toFixed(2)}%`);
    const ds = hours.map((h, i) => ({ h, i })).filter(({ h }) => localParts(h).h === 0).map(({ h, i }) => ({ pct: (i / n) * 100, label: hourLabel(h).day }));
    return { track: `linear-gradient(90deg, ${stops.join(', ')})`, days: ds, sunAlt: alt };
  }, [hours]);

  const ramp = variable ? RAMPS[variable] : null;
  const lbl = hourLabel(hours[idx] ?? time);
  const isDay = (sunAlt[idx] ?? -90) > -12;

  return (
    <section className="capas" aria-label="Capas meteorológicas del mapa">
      <div className="capas-chips" role="group" aria-label="Elegí una capa">
        {CHIPS.map((c) => (
          <button key={c.v} type="button" className="capas-chip" aria-pressed={variable === c.v}
            aria-label={variable === c.v ? `${c.aria}: activa. Tocá para ocultar la capa` : `Mostrar capa ${c.aria}`}
            onClick={() => { const next = variable === c.v ? null : c.v; if (!next) setPlaying(false); onVariable(next); }}>
            {c.label}
          </button>
        ))}
      </div>

      {variable && ramp && (
        <>
          <div className="capas-time">
            <button type="button" className="capas-play" aria-label={isPlaying ? 'Pausar animación' : 'Reproducir animación hora por hora'}
              aria-pressed={isPlaying} onClick={() => setPlaying(!isPlaying)}>
              {isPlaying
                ? <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                : <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>}
            </button>
            <div className="capas-scrub">
              <input type="range" min={0} max={Math.max(0, hours.length - 1)} step={1} value={idx}
                style={{ ['--capas-track' as string]: track }}
                aria-label="Hora del pronóstico" aria-valuetext={lbl.long}
                onChange={(e) => { setPlaying(false); onTime(hours[Number(e.target.value)]); }} />
              <div className="capas-days" aria-hidden="true">
                {days.map((d) => <span key={d.pct} style={{ left: `${d.pct}%` }}>{d.label}</span>)}
              </div>
            </div>
            <output className="capas-now" aria-live="off">
              <span className="capas-now-day">{lbl.day}</span>
              <span className="capas-now-hm">{lbl.hm}</span>
            </output>
          </div>

          {/* Mobile (< 720 px): leyenda colapsada en una línea (gradiente + extremos); un toque la expande. */}
          <button type="button" className="capas-legend-line" aria-expanded={legendOpen} aria-controls="capas-legend-full"
            onClick={() => setLegendOpen((o) => !o)}>
            <span className="capas-legend-line-title">{CHIPS.find((c) => c.v === variable)?.label}</span>
            <span className="capas-legend-line-end">{variable === 'score' ? 'Malo' : `${ramp.min} ${ramp.unit}`}</span>
            <span className="capas-bar capas-bar-line" style={{ background: legendGradient(variable, modo) }} role="img"
              aria-label={`Escala de ${ramp.title}: de ${ramp.min} a ${ramp.max} ${ramp.unit}`} />
            <span className="capas-legend-line-end">{variable === 'score' ? 'Excelente' : `${ramp.max} ${ramp.unit}`}</span>
            <svg className="capas-legend-chev" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
            <span className="capas-sr">{legendOpen ? 'Ocultar leyenda' : 'Ver leyenda completa'}</span>
          </button>

          <div className="capas-legend" id="capas-legend-full" data-open={legendOpen}>
            <div className="capas-legend-head">
              <span className="capas-legend-title">{ramp.title}</span>
              <span className="capas-legend-unit">{ramp.unit}</span>
              {variable === 'score' && isDay && <span className="capas-legend-note">Día: sin oscuridad, score 0</span>}
            </div>
            <div className="capas-bar" style={{ background: legendGradient(variable, modo) }} role="img"
              aria-label={`Escala de ${ramp.title}: de ${ramp.min} a ${ramp.max} ${ramp.unit}`} />
            <div className="capas-ticks" aria-hidden="true">
              {(variable === 'score' ? [0, 40, 70, 85, 100] : ramp.ticks).map((t) => (
                <span key={t} style={{ left: `${((t - ramp.min) / (ramp.max - ramp.min)) * 100}%` }} data-edge={t === ramp.max ? 'end' : t === ramp.min ? 'start' : undefined}>
                  <b>{t}</b>
                </span>
              ))}
            </div>
            {variable === 'score' && (
              <ul className="capas-cats" aria-label="Etiquetas del score">
                {SCORE_CATS.map((c) => {
                  const [r, g, b] = colorAt('score', c.at, modo);
                  return <li key={c.name}><i style={{ background: `rgb(${r | 0}, ${g | 0}, ${b | 0})` }} aria-hidden="true" />{c.name} <span>{c.range}</span></li>;
                })}
              </ul>
            )}
            <p className="capas-attrib">Pronóstico: {GRID_ATTRIBUTION}</p>
          </div>
        </>
      )}
    </section>
  );
}
