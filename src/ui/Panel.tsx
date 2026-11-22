import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointId, Salida, SatPass, SkyScore } from '../sky/types';
import type { PointModel } from '../model';
import { floorHour, nightOfPoint } from '../model';
import type { NightScore } from '../sky/night';
import { nightTone, windowText } from './night';
import { nightSummary } from '../sky/ephemeris';
import { toneFor } from '../sky/score';
import { DIFFICULT_WEEK } from '../sky/bestWindow';
import { localParts, nightOf, nightShort } from '../sky/time';
import { POINTS, shortName } from '../data/points';
import { allSalidas, salidasForNight, whatsappLink } from '../data/salidas';
import { demandCount, toggleWant, iWant } from '../data/demand';
import { ago, deg, fmtNum, hhmm, longDate, nightLabel, pct, range } from './format';
import { Bar, ScoreBadge } from './Score';
import { Check, ChevronRight } from 'lucide-react';
import { Disclosure, ICON, Stat } from './kit';

type Props = {
  models: Record<PointId, PointModel>;
  selected: PointId;
  onSelect: (id: PointId) => void;
  now: Date;
  simulated: boolean;
  sats: { upcoming: SatPass[]; fetchedAt: Date; origin: string };
};

const today = (now: Date) => nightOf(new Date(now.getTime() + 12 * 3600_000));

export function Panel({ models, selected, onSelect, now, simulated, sats }: Props) {
  const m = models[selected];
  const [night, setNight] = useState(m.tonight.night);
  useEffect(() => setNight(m.tonight.night), [m.tonight.night]);
  const nightInfo = m.nights.find((n) => n.night === night) ?? m.tonight;
  const [hourSel, setHourSel] = useState<number | null>(null);
  useEffect(() => setHourSel(null), [selected, night]);
  const defHour = nightInfo.window?.start ?? nightInfo.peak?.time;
  const focusT = hourSel ?? (defHour ? floorHour(defHour).getTime() : undefined);
  const focus = m.hours.find((h) => h.time.getTime() === focusT) ?? m.hours[0];
  const noForecast = m.forecastCoverage === 'ninguno';

  return (
    <div className="panel-inner">
      {noForecast && (
        <p className="notice" role="status">Sin pronóstico: solo cálculo astronómico. El score considera oscuridad y luna; las nubes, la humedad y el viento no se conocen para esta fecha.</p>
      )}

      <PointChips selected={selected}>
        {POINTS.map((p) => {
          const t = models[p.id].tonight;
          return (
            <button key={p.id} className="chip" aria-pressed={p.id === selected} onClick={() => onSelect(p.id)} aria-label={`${p.name}: score de la noche ${t.score}, ${t.label}`}>
              <span className="chip-num" data-tone={nightTone(t)}>{t.score}</span>
              <span>{shortName(p)}</span>
            </button>
          );
        })}
      </PointChips>

      <header className="point-head">
        <h1>{m.point.name}</h1>
        <p className="muted">{fmtNum(m.point.elevationM, 0)} m{m.point.note ? ` · ${m.point.note}` : ''}</p>
      </header>

      <NightTabs nights={m.nights} night={night} onPick={setNight} todayStr={today(now)} />

      <section className="hero" aria-live="polite">
        <div className="hero-score">
          <span className="hero-num num" data-tone={nightTone(nightInfo)}>{nightInfo.score}</span>
          <div>
            <p className="hero-label">{nightInfo.label}</p>
            <p className="muted small">{nightInfo.window ? 'score de la noche · de 0 a 100' : 'pico de la noche · ninguna hora llega a 40'}</p>
          </div>
        </div>
        <p className="hero-window">
          {nightInfo.window
            ? <>Ventana <b className="num">{windowText(nightInfo.window)}</b>{nightInfo.peak ? <> · pico <span className="num">{nightInfo.peak.score}</span> a las <span className="num">{hhmm(nightInfo.peak.time)}</span></> : null}</>
            : <>Ninguna hora llega a 40 {nightLabel(night, today(now))}.</>}
        </p>
      </section>

      <WeekBest m={m} models={models} todayStr={today(now)} onPick={(n) => setNight(n)} onSelect={onSelect} />

      <Salidas m={m} night={night} todayStr={today(now)} />

      <WantToGo pointId={selected} night={night} pointName={shortName(m.point)} label={nightLabel(night, today(now))} />

      <h2 className="group-h">Detalle de la noche</h2>

      <Timeline hours={m.timeline} focus={focus} onFocus={(t) => { setHourSel(t.getTime()); const n = nightOf(t); if (n !== night && m.nights.some((x) => x.night === n)) setNight(n); }} />

      <Factors s={focus} cond={m.conditions.get(focus.time.getTime())} />

      <Weather m={m} night={night} />

      <WhatYouSee m={m} night={night} />

      <Satellites passes={sats.upcoming} fetchedAt={sats.fetchedAt} origin={sats.origin} simulated={simulated} />
    </div>
  );
}


/** Carrusel de puntos con fundido en los bordes mientras quede contenido por scrollear. */
function PointChips({ children, selected }: { children: React.ReactNode; selected: string }) {
  const ref = useRef<HTMLElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = () => {
    const el = ref.current; if (!el) return;
    const start = el.scrollLeft < 4, end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setEdge((e) => (e.start === start && e.end === end ? e : { start, end }));
  };
  useEffect(() => {
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  useEffect(() => {
    // Solo scroll horizontal del carrusel: nunca mover la página.
    const el = ref.current; const c = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (el && c) {
      const l = c.offsetLeft - el.offsetLeft, r = l + c.offsetWidth;
      if (l < el.scrollLeft + 24 || r > el.scrollLeft + el.clientWidth - 48) el.scrollTo({ left: Math.max(0, l - 24), behavior: 'smooth' });
    }
    update();
  }, [selected]);
  return (
    <div className="chips-wrap" data-fade-start={!edge.start} data-fade-end={!edge.end}>
      <nav className="chips" aria-label="Puntos de observación" ref={ref} onScroll={update}>{children}</nav>
    </div>
  );
}

function NightTabs({ nights, night, onPick, todayStr }: { nights: PointModel['nights']; night: string; onPick: (n: string) => void; todayStr: string }) {
  return (
    <div className="nights" role="tablist" aria-label="Noches">
      {nights.map((n) => {
        return (
          <button key={n.night} role="tab" aria-selected={n.night === night} className="night" onClick={() => onPick(n.night)} aria-label={`${nightLabel(n.night, todayStr)}: score de la noche ${n.score}, ${n.label}`}>
            <span className="night-day">{nightShort(n.night, todayStr)}</span>
            <span className="night-num num" data-tone={nightTone(n)}>{n.score}</span>
          </button>
        );
      })}
    </div>
  );
}

function WeekBest({ m, models, todayStr, onPick, onSelect }: { m: PointModel; models: Record<PointId, PointModel>; todayStr: string; onPick: (n: string) => void; onSelect: (id: PointId) => void }) {
  if (m.week.kind === 'dificil') {
    const alt = Object.values(models).map((x) => (x.week.kind === 'ok' ? { x, best: x.week.best } : null)).filter(Boolean)
      .sort((a, b) => b!.best.score - a!.best.score)[0];
    return (
      <section className="card">
        <h2>Mejor ventana · 7 días</h2>
        <p>{DIFFICULT_WEEK} en {shortName(m.point)}: ninguna hora supera 40.</p>
        {alt && (
          <button className="btn" onClick={() => onSelect(alt.x.point.id)}>Probá {shortName(alt.x.point)}: {alt.best.score} el {longDate(alt.best.night)}</button>
        )}
      </section>
    );
  }
  const b = m.week.best;
  const w = b.window!;
  return (
    <section className="card card-accent">
      <h2>Mejor ventana · 7 días</h2>
      <p className="best">
        <span className="best-when">{cap(nightLabel(b.night, todayStr))}, <b className="num">{windowText(w)}</b></span>
        <ScoreBadge score={b.score} label={b.label} />
      </p>
      <p className="best-foot">
        <span className="muted small">{fmtNum((+w.end - +w.start) / 3600_000)} h de noche astronómica</span>
        <button className="btn btn-ghost btn-sm" onClick={() => onPick(b.night)}>Ver esa noche <ChevronRight {...ICON} size={16} /></button>
      </p>
    </section>
  );
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Timeline({ hours, focus, onFocus }: { hours: SkyScore[]; focus: SkyScore; onFocus: (t: Date) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current; const el = box?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (box && el) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [focus.time.getTime()]);
  return (
    <section className="card">
      <h2>Próximas 72 h</h2>
      <div className="timeline" role="list" ref={ref}>
        {hours.map((h) => {
          const p = localParts(h.time);
          const tone = toneFor(h);
          return (
            <button key={+h.time} role="listitem" className="tl-h" data-tone={tone} aria-pressed={+h.time === +focus.time}
              aria-label={`${hhmm(h.time)}: ${h.label === 'Día' ? 'día' : `${h.score}, ${h.label}`}`} onClick={() => onFocus(h.time)}>
              <span className="tl-bar" style={{ height: `${tone === 'dia' ? 6 : Math.max(6, h.score)}%` }} />
              <span className="tl-num num">{tone === 'dia' ? '' : h.score}</span>
              <span className="tl-hh num">{p.h === 0 ? <b>{p.d}/{p.m}</b> : String(p.h).padStart(2, '0')}</span>
            </button>
          );
        })}
      </div>
      <p className="muted small">Tocá una hora para ver su desglose. De día no hay score.</p>
    </section>
  );
}

function Factors({ s, cond }: { s: SkyScore; cond?: { cloudLow: number; cloudMid: number; cloudHigh: number; humidity: number; windGustKmh: number; temperatureC: number } }) {
  const f = s.factors;
  const rows: [string, number, string][] = [
    ['Oscuridad', f.darkness, f.darkness === 1 ? 'noche astronómica' : f.darkness === 0.5 ? 'crepúsculo' : 'sol arriba o crepúsculo claro'],
    ['Nubes', f.clouds, cond ? `baja ${cond.cloudLow} % · media ${cond.cloudMid} % · alta ${cond.cloudHigh} %` : 'sin pronóstico'],
    ['Luna', f.moon, f.moon === 1 ? 'bajo el horizonte o nueva' : 'ilumina el cielo'],
    ['Humedad', f.humidity, cond ? `HR ${cond.humidity} %${cond.humidity > 85 ? ' (> 85 %)' : ''}` : 'sin pronóstico'],
    ['Viento', f.wind, cond ? `ráfagas ${fmtNum(cond.windGustKmh, 0)} km/h${cond.windGustKmh > 50 ? ' (> 50)' : ''}` : 'sin pronóstico'],
  ];
  return (
    <section className="card">
      <div className="card-head">
        <h2>Desglose · {longDate(nightOf(s.time))} {hhmm(s.time)}</h2>
        <ScoreBadge score={s.score} label={s.label} size="sm" />
      </div>
      <ul className="factors">
        {rows.map(([k, v, d]) => (
          <li key={k}>
            <span className="f-k">{k}</span>
            <Bar value={v} tone={v >= 0.85 ? 'bueno' : v >= 0.5 ? 'medio' : 'malo'} />
            <span className="f-v num">{fmtNum(v, 2)}</span>
            <span className="f-d muted small">{d}</span>
          </li>
        ))}
      </ul>
      <Disclosure summary="Cómo se calcula">
        <p className="muted small">score = 100 × oscuridad × nubes × luna × humedad × viento{s.astronomyOnly ? ' · sin pronóstico, nubes/humedad/viento se asumen en 1' : ''}</p>
      </Disclosure>
    </section>
  );
}

function Weather({ m, night }: { m: PointModel; night: string }) {
  const n = m.nights.find((x) => x.night === night);
  const w = n?.window; if (!w) return null;
  const conds = [...m.conditions.values()].filter((c) => +c.time >= +floorHour(w.start) && +c.time < +w.end);
  if (!conds.length) return null;
  const tmin = Math.min(...conds.map((c) => c.temperatureC));
  const gust = Math.max(...conds.map((c) => c.windGustKmh));
  const advice = tmin < -5 ? 'campera de pluma, gorro, guantes y primera capa térmica' : tmin < 0 ? 'campera abrigada, gorro y guantes' : 'abrigo: en la Puna la temperatura cae rápido después del anochecer';
  return (
    <section className="card">
      <h2>Frío y viento en la ventana</h2>
      <div className="stats"><Stat value={`${fmtNum(tmin)} °C`} label="mínima prevista" /><Stat value={`${fmtNum(gust, 0)} km/h`} label="ráfagas máximas" /></div>
      <p className="muted small">Llevá {advice}.{gust > 50 ? ' Ráfagas fuertes: protegé el telescopio y evitá lugares expuestos.' : ''}</p>
    </section>
  );
}

function WhatYouSee({ m, night }: { m: PointModel; night: string }) {
  const n = useMemo(() => nightSummary(night, m.point), [night, m.point]);
  const mw = n.milkyWayCore;
  return (
    <section className="card">
      <h2>Qué se ve · {longDate(night)}</h2>
      <p className="muted small">Noche astronómica de {range(n.astroDusk, n.astroDawn)}</p>
      <dl className="sky">
        <div><dt>Luna</dt><dd>{n.moon.phaseName}, {pct(n.moon.illumination)} iluminada{n.moon.rise ? ` · sale ${hhmm(n.moon.rise)}` : ''}{n.moon.set ? ` · se pone ${hhmm(n.moon.set)}` : ''}{n.moon.illumination > 0.75 ? '. Ideal para mirarla a ella, no a las galaxias.' : ''}</dd></div>
        <div><dt>Núcleo de la Vía Láctea</dt><dd>{mw.maxAltitudeDeg > 0 ? `Llega a ${deg(mw.maxAltitudeDeg)} de altura${mw.maxAt ? ` (${hhmm(mw.maxAt)})` : ''}` : 'No sale durante la noche astronómica'} · {fmtNum(mw.hoursAbove20)} h por encima de 20°</dd></div>
        <div><dt>Planetas al final del crepúsculo</dt><dd>{n.planets.length ? n.planets.map((p) => `${p.name} ${deg(p.altitudeDeg)}`).join(' · ') : 'Ninguno sobre el horizonte'}</dd></div>
        <div><dt>Nubes de Magallanes · altura máxima</dt><dd>{n.magellanic.map((x) => `${x.name.replace(' de Magallanes', '')} ${deg(x.altitudeDeg)}`).join(' · ')}. Nunca se ponen; bajo 15° cuesta verlas</dd></div>
      </dl>
      {n.seasonalNote && <p className="season">{n.seasonalNote}</p>}
    </section>
  );
}

function scoreAt(m: PointModel, d: Date) {
  return m.hours.find((h) => +h.time === +floorHour(d));
}

function Salidas({ m, night, todayStr }: { m: PointModel; night: string; todayStr: string }) {
  const list = salidasForNight(allSalidas(), m.point.id, night);
  const [n, setN] = useState(2);
  return (
    <section className="card">
      <div className="card-head">
        <h2>Salidas {nightLabel(night, todayStr)}</h2>
        <label className="people">Personas
          <select value={n} onChange={(e) => setN(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6].map((k) => <option key={k}>{k}</option>)}</select>
        </label>
      </div>
      {list.length === 0 && <p className="muted">Ningún guía publicó una salida a {shortName(m.point)} para esta noche. Marcá “Quiero ir” y los guías lo ven.</p>}
      <ul className="salidas">
        {list.map((s) => <SalidaCard key={s.id} s={s} score={scoreAt(m, s.departure)} sky={nightOfPoint(m, nightOf(s.departure))} pointName={shortName(m.point)} n={n} />)}
      </ul>
    </section>
  );
}

function SalidaCard({ s, score, sky, pointName, n }: { s: Salida; score?: SkyScore; sky?: NightScore; pointName: string; n: number }) {
  const sc = score?.score;
  const msg = `Hola, vi en Hanan tu salida a ${pointName} el ${longDate(nightOf(s.departure))} a las ${hhmm(s.departure)} (cielo ${sc ?? '—'}/100). ¿Hay lugar para ${n} ${n === 1 ? 'persona' : 'personas'}?`;
  return (
    <li className="salida">
      <div className="salida-top">
        <div>
          <p className="salida-guide">{s.guideName}</p>
          <p className="tags">
            {s.demo && <span className="tag tag-demo">Ejemplo</span>}
            {s.guideRegistered ? <span className="tag">Guía registrado</span> : <span className="tag tag-muted">Registro sin verificar</span>}
          </p>
        </div>
        {sky && <span className="salida-night"><ScoreBadge score={sky.score} label={sky.label} size="sm" /><span className="muted small">noche</span></span>}
      </div>
      <p className="salida-meta num">{hhmm(s.departure)} · {fmtNum(s.durationH)} h · cupo {s.capacity} · {s.languages.join(' / ').toUpperCase()}</p>
      {score && <p className="muted small">A las {hhmm(s.departure)}: <span className="num">{score.score}</span>/100{score.label !== 'Día' ? `, ${score.label.toLowerCase()}` : ', todavía es de día'}{sky?.window ? ` · mejor ventana ${windowText(sky.window)}` : ''}</p>}
      {(s.meetingPoint || s.priceRef) && <p className="muted small">{s.meetingPoint ? `Partida: ${s.meetingPoint}. ` : ''}{s.priceRef ? `Precio: ${s.priceRef}` : ''}</p>}
      <a className="btn btn-primary" href={whatsappLink(s.whatsapp, msg)} target="_blank" rel="noreferrer">Reservar por WhatsApp</a>
    </li>
  );
}

function WantToGo({ pointId, night, pointName, label }: { pointId: PointId; night: string; pointName: string; label: string }) {
  const [, force] = useState(0);
  const c = demandCount(pointId, night);
  const on = iWant(pointId, night);
  return (
    <section className="card want">
      <button className="btn btn-want" aria-pressed={on} onClick={() => { toggleWant(pointId, night); force((x) => x + 1); }}>
        {on && <Check {...ICON} size={18} />}Quiero ir
      </button>
      <p><b className="num">{c.total}</b> {c.total === 1 ? 'persona quiere' : 'personas quieren'} ir a {pointName} {label}.</p>
      <p className="muted small">{c.demo} de ejemplo{c.mine ? ' + vos' : ''} · señal anónima, solo en este dispositivo.</p>
    </section>
  );
}

function Satellites({ passes, fetchedAt, origin, simulated }: { passes: SatPass[]; fetchedAt: Date; origin: string; simulated: boolean }) {
  const visible = passes.filter((p) => p.visible);
  return (
    <section className="card">
      <h2>Satélites · próximas 24 h</h2>
      {visible.length ? (
        <ul className="passes">
          {visible.slice(0, 5).map((p) => (
            <li key={p.satellite + +p.start}><b>{p.satellite}</b> <span className="num">{nightLabelShort(p.start)} {range(p.start, p.end)}</span> · máx. {deg(p.maxElevationDeg)}</li>
          ))}
        </ul>
      ) : <p>Pasa sobre vos, pero no se ve a simple vista.</p>}
      <Disclosure summary={passes.length > visible.length ? `${passes.length - visible.length} sobrevuelos no visibles · cómo se calcula` : 'Cómo se calcula'}>
        {passes.length > visible.length && <p className="muted small">De día o en la sombra de la Tierra. ARSAT 2 es geoestacionario y no se ve a simple vista.</p>}
        <p className="muted small">Pase visible: más de 10° de altura, sol a menos de −6° y satélite iluminado. Órbitas {origin === 'red' ? 'actualizadas' : 'guardadas'} {ago(fetchedAt)}{simulated ? ' · con el simulador la precisión baja lejos de esa fecha' : ''}.</p>
      </Disclosure>
    </section>
  );
}
const nightLabelShort = (d: Date) => { const p = localParts(d); return `${p.d}/${p.m}`; };
