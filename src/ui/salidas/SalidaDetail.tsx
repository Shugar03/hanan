import { useMemo, useState } from 'react';
import { astroNight } from '../../sky/ephemeris';
import { hhmm } from '../../sky/time';
import { pointById } from '../../data/points';
import {
  cuposRestantes, departureOf, garantiaEstado, getGuide, getSalida, GARANTIA_HORAS, GARANTIA_UMBRAL, isVerified,
  LANG_LABEL, LEVEL_LABEL, nightOfSalida, verificationText, type NightScoreFn,
} from '../../data/marketplace';
import { Avatar, Cupos, DemoTag, fechaLarga, horaSalida, Price, SkyScore, VerifiedBadge, type SkyWindowFn } from './parts';
import { ReservaFlow } from './ReservaFlow';
import './salidas.css';

type Props = {
  id: string; nightScore: NightScoreFn; onBack: () => void;
  /** Opcional: mejor ventana de la noche (si el integrador la tiene). */
  nightWindow?: SkyWindowFn;
  /** Opcional: reloj (real o simulado). */
  now?: Date;
};

const fmt1 = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 });

export function SalidaDetail({ id, nightScore, onBack, nightWindow, now = new Date() }: Props) {
  const [reservando, setReservando] = useState(false);
  const [, bump] = useState(0);
  const s = getSalida(id);
  const p = s ? pointById(s.pointId) : undefined;
  const night = s ? nightOfSalida(s) : '';
  const dark = useMemo(() => { try { return p && night ? astroNight(night, p) : undefined; } catch { return undefined; } }, [p, night]);

  if (!s || !p) {
    return (
      <section className="sx">
        <button type="button" className="sx-back" onClick={onBack} aria-label="Volver a salidas">‹ Salidas</button>
        <p className="sx-empty">No encontramos esa salida.</p>
      </section>
    );
  }
  if (reservando) return <ReservaFlow salida={s} nightScore={nightScore} now={now} onClose={() => { setReservando(false); bump((x) => x + 1); }} />;

  const g = getGuide(s.guideId);
  const score = nightScore(s.pointId, night);
  const win = nightWindow?.(s.pointId, night) ?? null;
  const gar = garantiaEstado(s, nightScore, now);
  const left = cuposRestantes(s);
  const vt = g ? verificationText(g) : undefined;
  const end = new Date(+departureOf(s) + s.durationH * 3600_000);

  return (
    <article className="sx sx-detail" aria-labelledby="sx-d-title">
      <button type="button" className="sx-back" onClick={onBack} aria-label="Volver a salidas">‹ Salidas</button>

      <header className="sx-hero">
        <p className="sx-hero-kicker">{p.name}{s.demo && <DemoTag />}</p>
        <h1 id="sx-d-title" className="sx-hero-title">{s.title}</h1>
        <p className="sx-hero-when sx-tab"><span className="sx-cap">{fechaLarga(s)}</span> · {horaSalida(s)} a {hhmm(end)} · {fmt1(s.durationH)} h</p>
      </header>

      <section className="sx-block" aria-labelledby="sx-d-sky">
        <h2 id="sx-d-sky" className="sx-h2">El cielo de esa noche</h2>
        <SkyScore score={score} size="lg" />
        <dl className="sx-dl">
          {win && <div><dt>Mejor ventana</dt><dd className="sx-tab">{hhmm(win.start)} a {hhmm(win.end)}</dd></div>}
          {dark && <div><dt>Noche astronómica</dt><dd className="sx-tab">{hhmm(dark.dusk)} a {hhmm(dark.dawn)}</dd></div>}
          <div><dt>Salida</dt><dd className="sx-tab">{horaSalida(s)} a {hhmm(end)}</dd></div>
        </dl>
        {win && !(+departureOf(s) < +win.end && +end > +win.start) && <p className="sx-muted">La salida no coincide con la mejor ventana de esa noche: consultá al guía si puede extenderla.</p>}
        {score == null && <p className="sx-muted">Todavía no hay pronóstico para esa noche (llega a 7 días). El score aparece cuando entre en el pronóstico.</p>}
      </section>

      <section className="sx-block" aria-labelledby="sx-d-gar">
        <h2 id="sx-d-gar" className="sx-h2">Garantía de cielo</h2>
        <p className="sx-gar" data-state={gar}>
          {gar === 'ok' && <>Activa. {score != null && score < GARANTIA_UMBRAL ? 'El pronóstico viene bajo: si sigue así a 6 h de la salida, te proponemos otra fecha.' : 'Por ahora el cielo acompaña.'}</>}
          {gar === 'reprogramacion_sugerida' && <>Reprogramación sugerida: el score de la noche es <b className="sx-tab">{score}</b>, menor a {GARANTIA_UMBRAL}. Elegí otra fecha o el reintegro de la seña.</>}
          {gar === 'sin_datos' && <>Sin datos todavía: se evalúa cuando la noche entre en el pronóstico.</>}
        </p>
        <p className="sx-muted">A {GARANTIA_HORAS} h de la salida miramos el score de la noche. Si es menor a {GARANTIA_UMBRAL}, la salida pasa a reprogramación sugerida y elegís entre otra fecha o el reintegro de la seña.</p>
        <p className="sx-muted sx-quote">{s.weatherPolicy}</p>
      </section>

      {g && (
        <section className="sx-block" aria-labelledby="sx-d-guide">
          <h2 id="sx-d-guide" className="sx-h2">{g.kind === 'operador' ? 'Operador' : 'Guía'}</h2>
          <div className="sx-guide">
            <Avatar g={g} size={56} />
            <div>
              <p className="sx-guide-name">{g.name}</p>
              <p className="sx-muted sx-tab">
                {g.ratingDemo > 0 ? <>{fmt1(g.ratingDemo)} de 5 · calificación de ejemplo · </> : null}
                {g.salidasCount} {g.salidasCount === 1 ? 'salida' : 'salidas'} · {g.languages.map((l) => LANG_LABEL[l] ?? l).join(', ')}
              </p>
            </div>
          </div>
          <p className="sx-muted">{g.bio}</p>
          {vt && (
            <div className="sx-legal" data-ok={isVerified(g)}>
              <p className="sx-legal-h"><VerifiedBadge g={g} /> {vt.title}</p>
              <p>{vt.body}</p>
            </div>
          )}
        </section>
      )}

      <section className="sx-block" aria-labelledby="sx-d-inc">
        <h2 id="sx-d-inc" className="sx-h2">Qué incluye</h2>
        <ul className="sx-inc">{s.includes.map((i) => <li key={i}>{i}</li>)}</ul>
      </section>

      <section className="sx-block" aria-labelledby="sx-d-info">
        <h2 id="sx-d-info" className="sx-h2">Datos de la salida</h2>
        <dl className="sx-dl">
          <div><dt>Encuentro</dt><dd>{s.meetingPoint} <span className="sx-muted">(el guía confirma el lugar exacto)</span></dd></div>
          <div><dt>Punto</dt><dd>{p.name}</dd></div>
          <div><dt>Nivel físico</dt><dd>{LEVEL_LABEL[s.physicalLevel]}</dd></div>
          <div><dt>Altura máxima</dt><dd className="sx-tab">{s.maxAltitudeM.toLocaleString('es-AR')} m</dd></div>
          <div><dt>Idiomas</dt><dd>{s.languages.map((l) => LANG_LABEL[l] ?? l).join(', ')}</dd></div>
          <div><dt>Cupo</dt><dd className="sx-tab">mínimo {s.capacityMin}, máximo {s.capacityMax}</dd></div>
        </dl>
        {s.maxAltitudeM >= 3500 && <p className="sx-muted">Sobre 3.500 m: abrigo de alta montaña, agua y nada de alcohol. Consultá si tenés problemas cardíacos o respiratorios.</p>}
        {s.physicalLevel === 'exigente' && <p className="sx-muted">Turismo activo (Ley provincial 6041): el prestador es responsable de la seguridad de la actividad.</p>}
      </section>

      <div className="sx-bar">
        <div className="sx-bar-info"><Price s={s} /><Cupos s={s} /></div>
        <button type="button" className="sx-btn sx-btn-primary" disabled={left === 0} onClick={() => setReservando(true)}
          aria-label={left === 0 ? 'Agotado, sin cupos' : `Reservar ${s.title}`}>{left === 0 ? 'Agotado' : 'Reservar'}</button>
      </div>
    </article>
  );
}
