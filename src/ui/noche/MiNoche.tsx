import { useMemo, useState } from 'react';
import { Chip } from '../kit';
import type { PointId, PassStatus, Salida } from '../../sky/types';
import type { PointModel } from '../../model';
import type { Tracked } from '../../sky/satellites';
import { BASES, EQUIPOS, OBJETIVOS, recommend, type Base, type Equipo, type Objetivo, type Plan, type Preferencias } from '../../sky/recommend';
import { buildCandidates } from './candidates';
import { allSalidas, whatsappLink } from '../../data/salidas';
import { shortName, pointById } from '../../data/points';
import { hhmm, longDate, nightLabel } from '../format';
import { windowText } from '../night';
import { ScoreBadge } from '../Score';
import { nightOf } from '../../sky/time';

const KEY = 'hanan:mi-noche';
const DEFAULT: Preferencias = { objetivo: 'estrellas', equipo: 'ojo', base: 'purmamarca', auto: true, minTempC: -5 };
type Saved = { prefs: Preferencias; savedAt: string; plans: Plan[]; done: Record<string, boolean> };

const revive = (k: string, v: unknown) => (typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/.test(v) ? new Date(v) : v);
function loadSaved(): Saved | null { try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r, revive) : null; } catch { return null; } }

type Props = { models: Record<PointId, PointModel>; pass: PassStatus | null; tracked: Tracked[]; todayStr: string; market?: Salida[]; onOpenSalida?: (id: string) => void; onOpenPoint: (id: PointId) => void };

export function MiNoche({ models, pass, tracked, todayStr, market = [], onOpenSalida, onOpenPoint }: Props) {
  const [saved, setSaved] = useState<Saved | null>(loadSaved);
  const [prefs, setPrefs] = useState<Preferencias>(saved?.prefs ?? DEFAULT);
  const [done, setDone] = useState<Record<string, boolean>>(saved?.done ?? {});
  const set = <K extends keyof Preferencias>(k: K, v: Preferencias[K]) => setPrefs((p) => ({ ...p, [k]: v }));

  const plans = useMemo(() => {
    const cands = buildCandidates(models, prefs.objetivo === 'satelites' ? { sats: tracked } : {});
    // Marketplace primero (si está), después las salidas de ejemplo de los fixtures.
    return recommend(cands, prefs, { pass: pass ?? undefined, salidas: market.length ? market : allSalidas() });
  }, [models, prefs, pass, tracked, market]);

  const save = () => {
    const s: Saved = { prefs, plans, done, savedAt: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(s));
    setSaved(s);
  };
  const toggle = (k: string) => setDone((d) => { const n = { ...d, [k]: !d[k] }; if (saved) localStorage.setItem(KEY, JSON.stringify({ ...saved, done: n })); return n; });
  const isSavedView = saved && JSON.stringify(saved.prefs) === JSON.stringify(prefs);

  return (
    <div className="noche">
      <header className="point-head">
        <h1>Mi noche</h1>
        <p className="muted">Contanos qué querés ver y desde dónde salís: Hanan cruza cielo, pronóstico y ruta y te propone 3 planes, cada uno con su porqué.</p>
      </header>

      <section className="card">
        <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Choice label="Qué querés ver" value={prefs.objetivo} options={OBJETIVOS} onChange={(v) => set('objetivo', v as Objetivo)} />
          <Choice label="Con qué" value={prefs.equipo} options={EQUIPOS} onChange={(v) => set('equipo', v as Equipo)} />
          <div className="form-row">
            <label>Salís desde
              <select value={prefs.base} onChange={(e) => set('base', e.target.value as Base)}>
                {Object.entries(BASES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label>Mínima que tolerás
              <select value={prefs.minTempC} onChange={(e) => set('minTempC', Number(e.target.value))}>
                {[5, 0, -5, -10, -15].map((t) => <option key={t} value={t}>{t} °C</option>)}
              </select>
            </label>
          </div>
          <Choice label="¿Tenés auto?" value={prefs.auto ? 'si' : 'no'} options={{ si: 'Sí, voy por mi cuenta', no: 'No, busco un guía' }} onChange={(v) => set('auto', v === 'si')} />
          <button className="btn btn-primary" type="submit">{isSavedView ? 'Plan guardado · actualizar' : 'Guardar mi plan'}</button>
          <p className="muted small">El plan queda en este dispositivo y se puede abrir sin señal.{saved ? ` Último guardado: ${new Date(saved.savedAt).toLocaleString('es-AR', { timeZone: 'America/Argentina/Jujuy', dateStyle: 'short', timeStyle: 'short' })}.` : ''}</p>
        </form>
      </section>

      {plans.length === 0 && <p className="notice">No hay noches con datos para recomendar.</p>}
      <ol className="plans">
        {plans.map((p, i) => <PlanCard key={p.pointId + p.night} plan={p} rank={i + 1} todayStr={todayStr} auto={prefs.auto} done={done} onToggle={toggle} onOpenPoint={onOpenPoint} onOpenSalida={onOpenSalida} />)}
      </ol>
      <p className="muted small">Cómo se ordena: score de la noche × afinidad con tu objetivo × logística (horas de manejo estimadas o salida de guía) × tu tolerancia al frío. Las horas de manejo son aproximadas, de día y sin paradas.</p>
    </div>
  );
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: Record<string, string>; onChange: (v: string) => void }) {
  return (
    <fieldset className="choice">
      <legend>{label}</legend>
      <div className="choice-opts">
        {Object.entries(options).map(([k, v]) => (
          <Chip key={k} pressed={value === k} onClick={() => onChange(k)}>{v}</Chip>
        ))}
      </div>
    </fieldset>
  );
}

function PlanCard({ plan: p, rank, todayStr, auto, done, onToggle, onOpenPoint, onOpenSalida }: { plan: Plan; rank: number; todayStr: string; auto: boolean; done: Record<string, boolean>; onToggle: (k: string) => void; onOpenPoint: (id: PointId) => void; onOpenSalida?: (id: string) => void }) {
  const pt = pointById(p.pointId);
  const msg = p.salida ? `Hola, vi en Hanan tu salida a ${shortName(pt)} el ${longDate(nightOf(p.salida.departure))} a las ${hhmm(p.salida.departure)} (cielo de la noche ${p.nightScore}/100). ¿Hay lugar para 2 personas?` : '';
  return (
    <li className="card plan">
      <div className="card-head">
        <div>
          <p className="plan-rank"><span className="sr-only">Plan </span>{rank}</p>
          <h2 className="plan-title">{shortName(pt)} · {nightLabel(p.night, todayStr)}</h2>
          <p className="plan-when num">{windowText(p.window)}</p>
        </div>
        <span className="salida-night"><ScoreBadge score={p.nightScore} label={p.nightLabel} size="sm" /><span className="muted small">score de la noche</span></span>
      </div>

      <h3>Por qué</h3>
      <ul className="bullets">{p.reasons.map((r) => <li key={r}>{r}</li>)}</ul>

      <h3>Qué ver, en orden</h3>
      <ol className="bullets see">{p.see.map((x) => <li key={x.text}>{x.time ? <span className="num">{hhmm(x.time)} · </span> : null}{x.text}</li>)}</ol>

      {p.alerts.length > 0 && <>
        <h3>Alertas</h3>
        <ul className="alerts">{p.alerts.map((a) => <li key={a.text} data-level={a.level}>{a.text}</li>)}</ul>
      </>}

      <h3>Checklist</h3>
      <ul className="checklist">
        {p.checklist.map((c) => {
          const k = p.pointId + p.night + c;
          return <li key={c}><label><input type="checkbox" checked={!!done[k]} onChange={() => onToggle(k)} /> <span>{c}</span></label></li>;
        })}
      </ul>

      {!auto && (p.salida
        ? <div className="reprog"><p>Salida de guía: <b>{p.salida.guideName}</b> a las <span className="num">{hhmm(p.salida.departure)}</span> · cupo {p.salida.capacity}{p.salida.demo ? ' · ejemplo' : ''}</p>
          {(p.salida as { market?: boolean }).market && onOpenSalida
            ? <button className="btn btn-primary" onClick={() => onOpenSalida(p.salida!.id)}>Ver la salida y reservar</button>
            : <a className="btn btn-primary" href={whatsappLink(p.salida.whatsapp, msg)} target="_blank" rel="noreferrer">Reservar esta salida</a>}</div>
        : <p className="muted small">No hay salidas de guía publicadas para esa noche. Marcá “Quiero ir” en Explorar para que los guías lo vean.</p>)}

      <button className="btn btn-ghost" onClick={() => onOpenPoint(p.pointId)}>Ver {shortName(pt)} en Explorar</button>
    </li>
  );
}
