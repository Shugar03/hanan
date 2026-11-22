import { whatsappLink } from '../../data/salidas';
import { pointById, shortName } from '../../data/points';
import {
  ars, estadoReserva, getGuide, getSalida, listReservas, whatsappMensaje, type MarketSalida, type NightScoreFn, type Reserva, type ReservaEstado,
} from '../../data/marketplace';
import { DemoTag, fechaLarga, horaSalida, scoreOf } from './parts';
import { useIcsUrl } from './ReservaFlow';
import './salidas.css';

const ESTADO: Record<ReservaEstado, string> = {
  confirmada: 'Confirmada · seña simulada',
  reprogramacion_sugerida: 'Reprogramación sugerida',
  realizada: 'Realizada',
};

export function MisReservas({ nightScore, now = new Date() }: { nightScore?: NightScoreFn; now?: Date } = {}) {
  const items = listReservas().map((r) => ({ r, s: getSalida(r.salidaId) })).sort((a, b) => (a.s?.departure ?? '').localeCompare(b.s?.departure ?? ''));
  return (
    <section className="sx" aria-labelledby="sx-mis-h">
      <header className="sx-head">
        <h1 id="sx-mis-h" className="sx-h1">Mis reservas</h1>
        <p className="sx-note">Guardadas en este dispositivo. <span className="sx-demo">Pago simulado (demo)</span></p>
      </header>
      {items.length === 0 ? <p className="sx-empty">Todavía no reservaste ninguna salida.</p> : (
        <ul className="sx-list">{items.map(({ r, s }) => <ReservaItem key={r.id} r={r} s={s} nightScore={nightScore} now={now} />)}</ul>
      )}
    </section>
  );
}

function ReservaItem({ r, s, nightScore, now }: { r: Reserva; s?: MarketSalida; nightScore?: NightScoreFn; now: Date }) {
  const estado = estadoReserva(r, s, nightScore, now);
  if (!s) return <li className="sx-res"><p>Salida no disponible</p><p className="sx-muted">{r.people} personas · seña {ars(r.depositARS)}</p></li>;
  const g = getGuide(s.guideId);
  const score = nightScore ? scoreOf(s, nightScore) : null;
  return (
    <li className="sx-res">
      <p className="sx-card-meta sx-tab"><span className="sx-cap">{fechaLarga(s)}</span> · {horaSalida(s)} · {shortName(pointById(s.pointId))}{s.demo && <DemoTag />}</p>
      <p className="sx-card-title">{s.title}</p>
      <p className="sx-res-state" data-state={estado}>{ESTADO[estado]}</p>
      <p className="sx-muted sx-tab">{r.people} {r.people === 1 ? 'persona' : 'personas'} · total {ars(r.totalARS)} · seña {ars(r.depositARS)}</p>
      {estado === 'reprogramacion_sugerida' && <p className="sx-muted">El score de la noche bajó de 40: elegí otra fecha con el guía o pedí el reintegro de la seña.</p>}
      <div className="sx-actions sx-actions-row">
        {g && <a className="sx-btn" href={whatsappLink(g.whatsapp, whatsappMensaje(s, r.people, score, fechaLarga(s), horaSalida(s)))} target="_blank" rel="noreferrer" aria-label={`WhatsApp a ${g.name}`}>WhatsApp</a>}
        <IcsLink s={s} />
      </div>
    </li>
  );
}

function IcsLink({ s }: { s: MarketSalida }) {
  const url = useIcsUrl(s);
  return url ? <a className="sx-btn" href={url} download={`hanan-${s.id}.ics`} aria-label={`Calendario .ics de ${s.title}`}>Calendario</a> : null;
}
