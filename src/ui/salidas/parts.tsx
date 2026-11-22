import type { ReactNode } from 'react';
import { BadgeCheck } from 'lucide-react';
import { labelFor, toneFor } from '../../sky/score';
import { hhmm, localParts, localNoon, longDate } from '../../sky/time';
import { pointById, shortName } from '../../data/points';
import {
  ars, cuposRestantes, departureOf, getGuide, isVerified, nightOfSalida,
  type Guide, type MarketSalida, type NightScoreFn,
} from '../../data/marketplace';

export type SkyWindowFn = (pointId: string, night: string) => { start: Date; end: Date } | null;

const DIAS_C = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const dayShort = (night: string) => { const p = localParts(localNoon(night)); return { dow: DIAS_C[p.dow], d: p.d, m: MES_C[p.m - 1] }; };
export const fechaLarga = (s: MarketSalida) => longDate(nightOfSalida(s));
export const horaSalida = (s: MarketSalida) => hhmm(departureOf(s));

export function SkyScore({ score, size = 'sm', caption = 'score de la noche' }: { score: number | null; size?: 'sm' | 'lg'; caption?: string }) {
  if (score == null) {
    return (
      <span className={`sx-score sx-score-${size}`} data-tone="none" aria-label={`${caption}: sin pronóstico todavía`}>
        <b className="sx-score-num">–</b><span className="sx-score-txt"><span>Sin pronóstico</span><small>{caption}</small></span>
      </span>
    );
  }
  const label = labelFor(score);
  return (
    <span className={`sx-score sx-score-${size}`} data-tone={toneFor({ score, label })} aria-label={`${caption}: ${score} de 100, ${label}`}>
      <b className="sx-score-num">{score}</b><span className="sx-score-txt"><span>{label}</span><small>{caption}</small></span>
    </span>
  );
}

export function Avatar({ g, size = 40 }: { g?: Guide; size?: number }) {
  return <span className="sx-avatar" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden>{g?.initials ?? '?'}</span>;
}

export function VerifiedBadge({ g }: { g?: Guide }) {
  if (!g) return null;
  const ok = isVerified(g);
  const txt = g.kind === 'operador' ? (ok ? 'Legajo 18.829' : 'Sin legajo') : (ok ? 'Registrado' : 'Sin verificar');
  return (
    <span className="sx-verif" data-ok={ok} title={ok ? 'Verificado' : 'Sin verificar'}>
      {ok && <BadgeCheck size={14} strokeWidth={1.75} aria-hidden />}
      {txt}
    </span>
  );
}

export const DemoTag = ({ children = 'Ejemplo' }: { children?: ReactNode }) => <span className="sx-demo">{children}</span>;

export function Cupos({ s }: { s: MarketSalida }) {
  const left = cuposRestantes(s);
  if (left === 0) return <span className="sx-cupos" data-state="lleno">Agotado</span>;
  return <span className="sx-cupos" data-state={left <= 3 ? 'pocos' : 'ok'}><b className="sx-tab">{left}</b> {left === 1 ? 'lugar' : 'lugares'}</span>;
}

export function Price({ s, suffix = true }: { s: MarketSalida; suffix?: boolean }) {
  return (
    <span className="sx-price">
      {s.pricePerPersonARS > 0 ? <b className="sx-tab">{ars(s.pricePerPersonARS)}</b> : <b>Precio</b>}{suffix && <small> /persona</small>}
      {s.demoPrice && <small className="sx-price-demo"> · precio de ejemplo</small>}
    </span>
  );
}

export function SalidaCard({ s, score, onOpen, preview, guide }: { s: MarketSalida; score: number | null; onOpen?: () => void; preview?: boolean; guide?: Guide }) {
  const g = guide ?? getGuide(s.guideId);
  const p = pointById(s.pointId);
  const n = nightOfSalida(s);
  const ds = dayShort(n);
  const body = (
    <>
      <span className="sx-card-date" aria-hidden>
        <span className="sx-card-dow">{ds.dow}</span>
        <span className="sx-card-d sx-tab">{ds.d}</span>
        <span className="sx-card-m">{ds.m}</span>
      </span>
      <span className="sx-card-main">
        <span className="sx-card-meta sx-tab">{horaSalida(s)} · {p ? shortName(p) : s.pointId}{s.demo && <DemoTag />}{s.local && <DemoTag>Tuya</DemoTag>}</span>
        <span className="sx-card-title">{s.title}</span>
        <span className="sx-card-guide"><Avatar g={g} size={24} /><span className="sx-card-gname">{g?.name ?? 'Guía'}</span><VerifiedBadge g={g} /></span>
        <span className="sx-card-foot">
          <SkyScore score={score} />
          <span className="sx-card-right"><Price s={s} suffix={false} /><Cupos s={s} /></span>
        </span>
      </span>
    </>
  );
  const label = `${s.title}, ${p ? shortName(p) : ''}, ${fechaLarga(s)} a las ${horaSalida(s)}. ${score == null ? 'Sin pronóstico' : `Cielo ${score} de 100, ${labelFor(score)}`}. ${ars(s.pricePerPersonARS)} por persona${s.demoPrice ? ', precio de ejemplo' : ''}. ${cuposRestantes(s)} lugares.`;
  if (preview || !onOpen) return <div className="sx-card" aria-label={label}>{body}</div>;
  return <button type="button" className="sx-card" onClick={onOpen} aria-label={label}>{body}</button>;
}

export function scoreOf(s: MarketSalida, nightScore: NightScoreFn) { return nightScore(s.pointId, nightOfSalida(s)); }
