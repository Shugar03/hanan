import { useEffect, useState } from 'react';
import markUrl from '../design/logo/hanan-mark.svg';
import type { PointId } from './sky/types';
import { useClock, useForecast, useModels } from './useModel';
import { MapView } from './ui/MapView';
import { Panel } from './ui/Panel';
import { GuiaPanel } from './ui/guia/GuiaPanel';
import { useSatellites } from './ui/useSatellites';
import { pointById } from './data/points';
import { loadPass, type PassResult } from './data/pass';
import { ago, hhmm } from './ui/format';
import { localDateStr, localParts, nightOf } from './sky/time';

type Modo = 'noche' | 'rojo';

function useModo(): [Modo, () => void] {
  const [modo, setModo] = useState<Modo>(() => (localStorage.getItem('hanan:modo') === 'rojo' ? 'rojo' : 'noche'));
  useEffect(() => {
    if (modo === 'rojo') document.documentElement.dataset.modo = 'rojo'; else delete document.documentElement.dataset.modo;
    localStorage.setItem('hanan:modo', modo);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  }, [modo]);
  return [modo, () => setModo((m) => (m === 'rojo' ? 'noche' : 'rojo'))];
}

const toLocalInput = (d: Date) => { const p = localParts(d); return `${localDateStr(d)}T${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`; };

export default function App() {
  const [modo, toggleModo] = useModo();
  const [guia, setGuia] = useState(() => new URLSearchParams(location.search).has('guia'));
  const [sim, setSim] = useState<Date | null>(() => { const q = new URLSearchParams(location.search).get('fecha'); return q ? new Date(q.length <= 16 ? `${q}:00-03:00` : q) : null; });
  const [simOpen, setSimOpen] = useState(false);
  const now = useClock(sim);
  const fc = useForecast();
  const models = useModels(fc.data, now);
  const [selected, setSelected] = useState<PointId>('susques');
  const sats = useSatellites(now, !!sim, pointById(selected));
  const [pass, setPass] = useState<PassResult | null>(null);
  useEffect(() => { loadPass().then(setPass); }, []);
  const todayStr = nightOf(new Date(now.getTime() + 12 * 3600_000));

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="./" aria-label="Hanan, inicio">
          <img src={markUrl} alt="" width={28} height={28} className="brand-mark" />
          <span className="brand-name">Hanan</span>
          <span className="brand-sub">cielos de la Puna</span>
        </a>
        <div className="actions">
          <button className="icon-btn" aria-pressed={simOpen || !!sim} onClick={() => setSimOpen((x) => !x)} aria-label="Simulador de fecha">
            <svg viewBox="0 0 24 24" aria-hidden><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>
            <span className="icon-txt">{sim ? 'Simulado' : 'Fecha'}</span>
          </button>
          <button className="icon-btn" aria-pressed={guia} onClick={() => setGuia((x) => !x)} aria-label="Modo guía">
            <svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1-4 4-6 7-6s6 2 7 6" /></svg>
            <span className="icon-txt">{guia ? 'Modo guía' : 'Soy guía'}</span>
          </button>
          <button className="icon-btn" aria-pressed={modo === 'rojo'} onClick={toggleModo} aria-label="Modo rojo de visión nocturna">
            <svg viewBox="0 0 24 24" aria-hidden><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="2.5" /></svg>
            <span className="icon-txt">Modo rojo</span>
          </button>
        </div>
      </header>

      {(simOpen || sim) && (
        <div className="simbar" role="region" aria-label="Simulador de fecha">
          <label>Simular fecha y hora
            <input type="datetime-local" value={toLocalInput(now)} onChange={(e) => e.target.value && setSim(new Date(`${e.target.value}:00-03:00`))} />
          </label>
          <button className="btn btn-ghost" onClick={() => setSim(new Date(`${localDateStr(now).slice(0, 4)}-06-20T22:00:00-03:00`))}>Probar junio</button>
          {sim && <button className="btn btn-ghost" onClick={() => { setSim(null); setSimOpen(false); }}>Volver a ahora</button>}
          {sim && <p className="muted small">Simulando {toLocalInput(sim).replace('T', ' ')}. Efemérides, Vía Láctea y satélites se recalculan.</p>}
        </div>
      )}

      <main className="layout">
        <div className="map-wrap">
          <MapView models={models} selected={selected} onSelect={(id) => { setSelected(id); setGuia(false); }} sats={sats.live} modo={modo} />
          <PassChip pass={pass} />
        </div>
        <aside className="panel" aria-label={guia ? 'Modo guía' : 'Detalle del punto'}>
          {guia ? <GuiaPanel models={models} now={now} todayStr={todayStr} /> : <Panel models={models} selected={selected} onSelect={setSelected} now={now} simulated={!!sim} sats={sats} />}
          <footer className="foot">
            <p>Pronóstico {fc.origin === 'fixture' ? 'de la copia local' : fc.origin === 'cache' ? 'guardado' : 'actualizado'} · {ago(fc.fetchedAt)} ({hhmm(fc.fetchedAt)}). Es una previsión: el cielo real puede cambiar.</p>
            <p>Datos meteorológicos: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open‑Meteo.com</a> (CC BY 4.0) · Órbitas: <a href="https://celestrak.org/" target="_blank" rel="noreferrer">CelesTrak</a> · Mapa: Esri, © OpenStreetMap</p>
          </footer>
        </aside>
      </main>
    </div>
  );
}

function PassChip({ pass }: { pass: PassResult | null }) {
  if (!pass) return null;
  const txt = { abierto: 'Abierto', restringido: 'Restringido', cerrado: 'Cerrado', desconocido: 'Ver estado oficial' }[pass.state];
  const upd = pass.sourceUpdatedAt ? new Date(pass.sourceUpdatedAt) : undefined;
  return (
    <a className="pass" data-state={pass.state} href={pass.sourceUrl} target="_blank" rel="noreferrer">
      <span className="pass-k">Paso de Jama</span>
      <span className="pass-v">{txt}</span>
      {upd && <span className="pass-u">act. {localParts(upd).d}/{localParts(upd).m} {hhmm(upd)}{pass.origin === 'fixture' ? ' · copia local' : ''}</span>}
    </a>
  );
}
