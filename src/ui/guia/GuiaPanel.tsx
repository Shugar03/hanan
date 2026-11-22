import { useState } from 'react';
import type { PointId, Salida } from '../../sky/types';
import type { PointModel } from '../../model';
import { demandRows, excellentAlerts, floorHour, nightOfPoint } from '../../model';
import { windowText } from '../night';
import { bestNight } from '../../sky/night';
import { addDays, nightOf } from '../../sky/time';
import { POINTS, pointById, shortName } from '../../data/points';
import { publishSalida, publishedSalidas, whatsappLink } from '../../data/salidas';
import { aggregated } from '../../data/demand';
import { hhmm, longDate, nightLabel } from '../format';
import { ScoreBadge } from '../Score';
import { Slot, ext, optional } from '../Optional';

const CrearSalidaForm = optional<any>('salidas', ext.salidas, 'CrearSalidaForm');

type Props = { models: Record<PointId, PointModel>; now: Date; todayStr: string; nightScore?: (pointId: string, night: string) => number | null };

export function GuiaPanel({ models, now, todayStr, nightScore }: Props) {
  const [, force] = useState(0);
  const alerts = excellentAlerts(models);
  const demand = demandRows(models, aggregated()).slice(0, 8);
  const mine = publishedSalidas().filter((s) => +s.departure > +now - 6 * 3600_000);

  return (
    <div className="panel-inner">
      <header className="point-head">
        <h1>Modo guía</h1>
        <p className="muted">Demanda, alertas de cielo y tus salidas. Los datos de demanda y las salidas de otros guías son de ejemplo.</p>
      </header>

      <section className="card">
        <h2>Señales de demanda</h2>
        {demand.length === 0 ? <p className="muted">Todavía no hay señales para estos 7 días.</p> : (
          <ul className="list">
            {demand.map((d) => {
              const m = models[d.pointId];
              return (
                <li key={d.pointId + d.night} className="row">
                  <span><b className="num">{d.count}</b> personas quieren ir a <b>{shortName(m.point)}</b> {nightLabel(d.night, todayStr)}{d.sky ? <>: el cielo da <b className="num">{d.sky.score}</b>{d.sky.window ? <span className="muted"> · ventana {windowText(d.sky.window)}</span> : null}</> : null}</span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="muted small"><span className="tag tag-demo">Ejemplo</span> Señales agregadas del fixture más las marcadas en este dispositivo.</p>
      </section>

      <section className="card">
        <h2>Noches excelentes (score de la noche ≥ 85)</h2>
        {alerts.length === 0 ? <p className="muted">Ninguna noche llega a 85 en los próximos 7 días.</p> : (
          <ul className="list">
            {alerts.map(({ point: p, sky: n }) => (
              <li key={p.id + n.night} className="row">
                <span><b>{shortName(p)}</b> · {nightLabel(n.night, todayStr)}{n.window ? <> · <span className="num">{windowText(n.window)}</span></> : null}</span>
                <ScoreBadge score={n.score} label={n.label} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <PublishForm models={models} todayStr={todayStr} onDone={() => force((x) => x + 1)} />

      {CrearSalidaForm && (
        <details className="card more">
          <summary>Crear salida completa para el marketplace (precio, qué incluye, política de clima)</summary>
          <Slot C={CrearSalidaForm} title="Crear salida" props={{ onCreated: () => force((x) => x + 1), nightScore, now }} />
        </details>
      )}

      <section className="card">
        <h2>Tus salidas</h2>
        {mine.length === 0 ? <p className="muted">Todavía no publicaste salidas desde este dispositivo.</p> : (
          <ul className="salidas">{mine.map((s) => <MySalida key={s.id} s={s} m={models[s.pointId]} />)}</ul>
        )}
      </section>

      <section className="card pro" aria-disabled>
        <h2>Alertas personalizadas <span className="tag">Pro · próximamente</span></h2>
        <p className="muted">Avisos por punto, umbral de score, temporada de Vía Láctea y fase lunar. Fuera del MVP.</p>
      </section>
    </div>
  );
}

function PublishForm({ models, todayStr, onDone }: { models: Record<PointId, PointModel>; todayStr: string; onDone: () => void }) {
  const [f, setF] = useState({ pointId: 'susques' as PointId, date: todayStr, time: '22:00', capacity: 10, priceRef: '', languages: 'es', whatsapp: '' });
  const [ok, setOk] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const departure = new Date(`${f.date}T${f.time}:00-03:00`);
    const s: Salida = {
      id: 'mia-' + Date.now(), guideName: 'Tu salida', guideRegistered: false, pointId: f.pointId, departure, durationH: 3,
      capacity: Number(f.capacity), languages: f.languages.split(/[,\s/]+/).filter(Boolean), priceRef: f.priceRef || undefined,
      whatsapp: f.whatsapp, demo: false,
    };
    publishSalida(s);
    const sc = models[f.pointId].hours.find((h) => +h.time === +floorHour(departure));
    const sky = nightOfPoint(models[f.pointId], nightOf(departure));
    setOk(`Publicada: ${shortName(pointById(f.pointId))}, ${longDate(nightOf(departure))} a las ${f.time}${sc ? `. Cielo a esa hora: ${sc.score}/100` : ''}${sky ? `; score de la noche: ${sky.score}/100` : ''}.`);
    onDone();
  };
  return (
    <section className="card">
      <h2>Publicar salida</h2>
      <form className="form" onSubmit={submit}>
        <label>Punto<select value={f.pointId} onChange={set('pointId')}>{POINTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <div className="form-row">
          <label>Fecha<input type="date" required value={f.date} onChange={set('date')} /></label>
          <label>Hora<input type="time" required value={f.time} onChange={set('time')} /></label>
        </div>
        <div className="form-row">
          <label>Cupo<input type="number" min={1} max={60} required value={f.capacity} onChange={set('capacity')} /></label>
          <label>Idiomas<input value={f.languages} onChange={set('languages')} placeholder="es, en" /></label>
        </div>
        <label>Precio de referencia<input value={f.priceRef} onChange={set('priceRef')} placeholder="Ej.: consultar" /></label>
        <label>WhatsApp<input type="tel" required inputMode="tel" pattern="[0-9 +]{8,}" value={f.whatsapp} onChange={set('whatsapp')} placeholder="54 9 388 …" /></label>
        <button className="btn btn-primary" type="submit">Publicar salida</button>
        <p className="muted small">Se guarda en este dispositivo. Tu teléfono se publica solo con tu consentimiento.</p>
        {ok && <p className="ok" role="status">{ok}</p>}
      </form>
    </section>
  );
}

function MySalida({ s, m }: { s: Salida; m: PointModel }) {
  const sc = m.hours.find((h) => +h.time === +floorHour(s.departure));
  const [msg, setMsg] = useState('');
  const low = sc !== undefined && sc.score < 40;
  const suggest = () => {
    const n0 = nightOf(s.departure);
    const wk = bestNight(m.nights.filter((n) => n.night > n0 && n.night <= addDays(n0, 3)));
    const best = wk.kind === 'ok' ? wk.best : undefined;
    const w = best?.window;
    if (!best || !w) { setMsg('No hay una ventana con score ≥ 40 en los próximos 3 días. Conviene esperar el próximo pronóstico.'); return; }
    setMsg(`Hola, soy tu guía de la salida a ${shortName(m.point)} del ${longDate(nightOf(s.departure))} a las ${hhmm(s.departure)}. El pronóstico da un cielo de ${sc?.score}/100 para esa hora, así que propongo reprogramarla a la noche del ${longDate(best.night)}, de ${windowText(w)}, con un cielo previsto de ${best.score}/100. ¿Te queda bien?`);
  };
  return (
    <li className="salida">
      <div className="salida-top">
        <div>
          <p className="salida-guide">{shortName(m.point)} · {longDate(nightOf(s.departure))}</p>
          <p className="salida-meta num">{hhmm(s.departure)} · cupo {s.capacity}</p>
        </div>
        {sc ? <span className="salida-night"><ScoreBadge score={sc.score} label={sc.label} size="sm" /><span className="muted small">cielo a las {hhmm(s.departure)}</span></span> : <span className="muted small">sin pronóstico</span>}
      </div>
      {low && <button className="btn" onClick={suggest}>Reprogramar: sugerir otra ventana</button>}
      {msg && (
        <div className="reprog">
          <p>{msg}</p>
          <a className="btn btn-primary" href={whatsappLink('', msg)} target="_blank" rel="noreferrer">Compartir mensaje por WhatsApp</a>
        </div>
      )}
    </li>
  );
}
