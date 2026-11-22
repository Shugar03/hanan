import { useMemo, useState } from 'react';
import { POINTS, shortName } from '../../data/points';
import {
  filtrarSalidas, LANG_LABEL, listSalidas, nightOfSalida, ordenarSalidas, type NightScoreFn, type SortKey,
} from '../../data/marketplace';
import { dayShort, SalidaCard, scoreOf } from './parts';
import './salidas.css';

type Props = { nightScore: NightScoreFn; onOpenSalida: (id: string) => void; initialPointId?: string };

const SORTS: { k: SortKey; l: string }[] = [{ k: 'cielo', l: 'Mejor cielo' }, { k: 'proximas', l: 'Más próximas' }, { k: 'precio', l: 'Precio' }];

export function SalidasTab({ nightScore, onOpenSalida, initialPointId }: Props) {
  const [sort, setSort] = useState<SortKey>('cielo');
  const [pointId, setPointId] = useState(initialPointId ?? '');
  const [night, setNight] = useState('');
  const [language, setLanguage] = useState('');
  const all = useMemo(() => listSalidas(), []);
  const nights = useMemo(() => [...new Set(all.map(nightOfSalida))].sort(), [all]);
  const langs = useMemo(() => [...new Set(all.flatMap((s) => s.languages))], [all]);
  const list = ordenarSalidas(filtrarSalidas(all, { pointId, night, language }), sort, nightScore);
  const anyFilter = pointId || night || language;

  return (
    <section className="sx" aria-labelledby="sx-feed-h">
      <header className="sx-head">
        <h1 id="sx-feed-h" className="sx-h1">Salidas</h1>
        <p className="sx-lead">Guías y operadores que salen a mirar el cielo de la Puna, ordenados por cómo viene cada noche.</p>
        <p className="sx-note"><span className="sx-demo">Ejemplo</span> Perfiles ficticios y precios de ejemplo. El pago es simulado.</p>
      </header>

      <div className="sx-seg" role="radiogroup" aria-label="Ordenar salidas">
        {SORTS.map((o) => (
          <button key={o.k} type="button" role="radio" aria-checked={sort === o.k} className="sx-seg-btn" onClick={() => setSort(o.k)}>{o.l}</button>
        ))}
      </div>

      <div className="sx-chips" role="group" aria-label="Filtrar por noche">
        <button type="button" className="sx-chip" aria-pressed={!night} onClick={() => setNight('')}>Todas</button>
        {nights.map((n) => { const d = dayShort(n); return (
          <button key={n} type="button" className="sx-chip sx-tab" aria-pressed={night === n} onClick={() => setNight(night === n ? '' : n)} aria-label={`Noche del ${d.dow} ${d.d}`}>{d.dow} {d.d}</button>
        ); })}
      </div>

      <div className="sx-filters">
        <label className="sx-field">
          <span>Punto</span>
          <select value={pointId} onChange={(e) => setPointId(e.target.value)} aria-label="Filtrar por punto de observación">
            <option value="">Todos los puntos</option>
            {POINTS.map((p) => <option key={p.id} value={p.id}>{shortName(p)}</option>)}
          </select>
        </label>
        <label className="sx-field">
          <span>Idioma</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Filtrar por idioma">
            <option value="">Todos</option>
            {langs.map((l) => <option key={l} value={l}>{LANG_LABEL[l] ?? l}</option>)}
          </select>
        </label>
      </div>

      <p className="sx-count" aria-live="polite">
        <span><b className="sx-tab">{list.length}</b> {list.length === 1 ? 'salida' : 'salidas'}</span>
        {anyFilter && <button type="button" className="sx-link" onClick={() => { setPointId(''); setNight(''); setLanguage(''); }}>Quitar filtros</button>}
      </p>

      {list.length === 0 ? (
        <p className="sx-empty">No hay salidas con esos filtros. Probá otra noche u otro punto.</p>
      ) : (
        <ul className="sx-list">
          {list.map((s) => <li key={s.id}><SalidaCard s={s} score={scoreOf(s, nightScore)} onOpen={() => onOpenSalida(s.id)} /></li>)}
        </ul>
      )}
      <p className="sx-fine">Mejor cielo ordena por score de la noche (0–100); a igual cielo, primero los guías registrados (Ley 6308) y operadores con legajo (Ley 18.829).</p>
    </section>
  );
}
