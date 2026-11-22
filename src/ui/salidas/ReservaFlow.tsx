import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { ICON } from '../kit';
import { whatsappLink } from '../../data/salidas';
import { pointById, shortName } from '../../data/points';
import {
  ars, cuposRestantes, DEPOSIT_RATE, getGuide, ics, nightOfSalida, reservar, resumenReserva, whatsappMensaje,
  type MarketSalida, type NightScoreFn, type Reserva,
} from '../../data/marketplace';
import { DemoTag, fechaLarga, horaSalida, SkyScore } from './parts';

type Props = { salida: MarketSalida; nightScore: NightScoreFn; now: Date; onClose: () => void };
type Step = 1 | 2 | 3;
const STEPS = ['Personas', 'Resumen', 'Confirmación'];

export function useIcsUrl(s: MarketSalida) {
  const url = useMemo(() => (typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(new Blob([ics(s)], { type: 'text/calendar;charset=utf-8' })) : ''), [s]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url;
}

export function ReservaFlow({ salida: s, nightScore, now, onClose }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [people, setPeople] = useState(1);
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [error, setError] = useState('');
  const left = cuposRestantes(s);
  const max = Math.max(1, left);
  const r = resumenReserva(s, people);
  const p = pointById(s.pointId);
  const g = getGuide(s.guideId);
  const score = nightScore(s.pointId, nightOfSalida(s));
  const icsUrl = useIcsUrl(s);

  const confirmar = () => {
    const res = reservar(s.id, people, now);
    if (!res.ok) { setError(res.error); return; }
    setReserva(res.reserva); setError(''); setStep(3);
  };
  const wa = g ? whatsappLink(g.whatsapp, whatsappMensaje(s, people, score, fechaLarga(s), horaSalida(s))) : '';

  return (
    <section className="sx sx-flow" aria-labelledby="sx-flow-h">
      <button type="button" className="sx-back" onClick={step === 2 ? () => setStep(1) : onClose}
        aria-label={step === 2 ? 'Volver a cantidad de personas' : 'Volver a la salida'}><ChevronLeft {...ICON} size={18} />{step === 2 ? 'Personas' : 'Salida'}</button>
      <ol className="sx-steps" aria-label="Pasos de la reserva">
        {STEPS.map((l, i) => <li key={l} aria-current={step === i + 1 ? 'step' : undefined} data-done={step > i + 1}><span className="sx-tab">{i + 1}</span> {l}</li>)}
      </ol>
      <p className="sx-sim" role="note">Pago simulado (demo): no se cobra nada ni se envían datos.</p>

      <header className="sx-flow-head">
        <p className="sx-hero-kicker">{shortName(p)} · <span className="sx-cap">{fechaLarga(s)}</span> · {horaSalida(s)}{s.demo && <DemoTag />}</p>
        <h1 id="sx-flow-h" className="sx-h1">{s.title}</h1>
      </header>

      {step === 1 && (
        <div className="sx-block">
          <h2 className="sx-h2">¿Cuántas personas van?</h2>
          <div className="sx-stepper">
            <button type="button" className="sx-btn sx-round" onClick={() => setPeople(Math.max(1, people - 1))} disabled={people <= 1} aria-label="Una persona menos">−</button>
            <output className="sx-stepper-n sx-tab" aria-live="polite" aria-label={`${people} ${people === 1 ? 'persona' : 'personas'}`}>{people}</output>
            <button type="button" className="sx-btn sx-round" onClick={() => setPeople(Math.min(max, people + 1))} disabled={people >= left} aria-label="Una persona más">+</button>
          </div>
          <p className="sx-muted sx-center sx-tab">{left === 0 ? 'No quedan cupos.' : `Quedan ${left} ${left === 1 ? 'lugar' : 'lugares'} · mínimo ${s.capacityMin} para que la salida se haga`}</p>
          <button type="button" className="sx-btn sx-btn-primary sx-block-btn" disabled={left === 0} onClick={() => setStep(2)}>Continuar</button>
        </div>
      )}

      {step === 2 && (
        <div className="sx-block">
          <h2 className="sx-h2">Resumen</h2>
          <dl className="sx-sum">
            <div><dt className="sx-tab">{ars(s.pricePerPersonARS)} × {people} {people === 1 ? 'persona' : 'personas'}</dt><dd className="sx-tab">{ars(r.totalARS)}</dd></div>
            <div className="sx-sum-strong"><dt>Seña {Math.round(DEPOSIT_RATE * 100)} % (simulada)</dt><dd className="sx-tab">{ars(r.depositARS)}</dd></div>
            <div><dt>Saldo, se paga al guía</dt><dd className="sx-tab">{ars(r.saldoARS)}</dd></div>
          </dl>
          {s.demoPrice && <p className="sx-muted">Precio de ejemplo: no es una tarifa real.</p>}
          <div className="sx-row"><SkyScore score={score} /></div>
          <p className="sx-muted">Garantía de cielo: si a 6 h de la salida el score de la noche es menor a 40, elegís otra fecha o el reintegro de la seña.</p>
          {error && <p className="sx-error" role="alert">{error}</p>}
          <button type="button" className="sx-btn sx-btn-primary sx-block-btn" onClick={confirmar}>Pagar seña {ars(r.depositARS)} (simulado)</button>
        </div>
      )}

      {step === 3 && reserva && (
        <div className="sx-block">
          <h2 className="sx-h2 sx-ok-h" role="status">Reserva confirmada</h2>
          <p><b className="sx-tab">{reserva.people}</b> {reserva.people === 1 ? 'persona' : 'personas'} · seña simulada <b className="sx-tab">{ars(reserva.depositARS)}</b> de {ars(reserva.totalARS)}</p>
          <p className="sx-muted">Quedó guardada en Mis reservas, en este dispositivo. Avisale al guía por WhatsApp para coordinar el encuentro en {s.meetingPoint}.</p>
          <div className="sx-actions">
            {g && <a className="sx-btn sx-btn-primary" href={wa} target="_blank" rel="noreferrer" aria-label={`Escribir por WhatsApp a ${g.name}`}>Escribir al guía por WhatsApp</a>}
            {icsUrl && <a className="sx-btn" href={icsUrl} download={`hanan-${s.id}.ics`} aria-label="Agregar la salida al calendario, archivo .ics">Agregar al calendario (.ics)</a>}
            <button type="button" className="sx-btn sx-btn-ghost" onClick={onClose}>Volver a la salida</button>
          </div>
          <p className="sx-muted sx-small">Ficha de ejemplo: el número de WhatsApp es ficticio.</p>
        </div>
      )}
    </section>
  );
}
