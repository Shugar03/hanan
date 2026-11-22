import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import { CalendarClock, Eye, Moon, Sun, UserRound, X } from 'lucide-react';
import { ICON, IconButton, Mark } from './ui/kit';
import type { PointId, Salida } from './sky/types';
import { loadMarketSalidas } from './data/market-bridge';
import { useClock, useForecast, useModels } from './useModel';
import { MapView } from './ui/MapView';
import { Panel } from './ui/Panel';
import { GuiaPanel } from './ui/guia/GuiaPanel';
import { useSatellites } from './ui/useSatellites';
import { POINTS, pointById } from './data/points';
import { TabBar, isTab, type Tab } from './ui/nav/Tabs';
import { Slot, ext, optional } from './ui/Optional';
import { MiNoche } from './ui/noche/MiNoche';
import { WeatherLayers } from './ui/capas-host';
import { Observatorio, ObservatorioButton } from './ui/observatorio';

const RED_THEME_HINT = 'Desactivá el modo rojo para cambiar el tema';

const CieloView = optional<any>('cielo', ext.cielo, 'default');
const SalidasTab = optional<any>('salidas', ext.salidas, 'SalidasTab');
const SalidaDetail = optional<any>('salidas', ext.salidas, 'SalidaDetail');
const MisReservas = optional<any>('salidas', ext.salidas, 'MisReservas');
import { loadPass, type PassResult } from './data/pass';
import { ago, hhmm } from './ui/format';
import { localDateStr, localParts, nightOf } from './sky/time';

type Modo = 'noche' | 'rojo';
type Tema = 'oscuro' | 'claro';

const syncThemeColor = () => requestAnimationFrame(() => document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()));

/** Tema claro/oscuro: persistente; por defecto según prefers-color-scheme. El modo rojo siempre gana (lo resuelven los tokens). */
function useTema(): [Tema, () => void] {
  const [tema, setTema] = useState<Tema>(() => {
    const t = localStorage.getItem('hanan:tema');
    if (t === 'claro' || t === 'oscuro') return t;
    return matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro';
  });
  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    syncThemeColor();
  }, [tema]);
  return [tema, () => setTema((t) => { const n = t === 'claro' ? 'oscuro' : 'claro'; localStorage.setItem('hanan:tema', n); return n; })];
}

function useModo(): [Modo, () => void] {
  const [modo, setModo] = useState<Modo>(() => (localStorage.getItem('hanan:modo') === 'rojo' ? 'rojo' : 'noche'));
  useEffect(() => {
    if (modo === 'rojo') document.documentElement.dataset.modo = 'rojo'; else delete document.documentElement.dataset.modo;
    localStorage.setItem('hanan:modo', modo);
    syncThemeColor();
  }, [modo]);
  return [modo, () => setModo((m) => (m === 'rojo' ? 'noche' : 'rojo'))];
}

const toLocalInput = (d: Date) => { const p = localParts(d); return `${localDateStr(d)}T${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`; };

const params = () => new URLSearchParams(location.search);
const isPoint = (x: string | null): x is PointId => !!x && POINTS.some((p) => p.id === x);

export default function App() {
  const [modo, toggleModo] = useModo();
  const [tema, toggleTema] = useTema();
  const [tab, setTabState] = useState<Tab>(() => { const t = params().get('tab'); return isTab(t) ? t : 'explorar'; });
  const [guia, setGuia] = useState(() => params().has('guia'));
  const [salidaId, setSalidaId] = useState<string | null>(() => params().get('salida'));
  const [obs, setObs] = useState(() => params().get('obs') === '1');
  const [sim, setSim] = useState<Date | null>(() => { const q = params().get('fecha'); return q ? new Date(q.length <= 16 ? `${q}:00-03:00` : q) : null; });
  const [simOpen, setSimOpen] = useState(false);
  const simRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!simOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSimOpen(false); };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (simRef.current?.contains(t) || (t as HTMLElement).closest?.('[data-sim-toggle]')) return;
      setSimOpen(false);
    };
    window.addEventListener('keydown', onKey); window.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown); };
  }, [simOpen]);
  const now = useClock(sim);
  const fc = useForecast();
  const models = useModels(fc.data, now);
  const [selected, setSelected] = useState<PointId>(() => { const q = params().get('punto'); return isPoint(q) ? q : 'susques'; });
  const sats = useSatellites(now, !!sim, pointById(selected));
  const [pass, setPass] = useState<PassResult | null>(null);
  const [map, setMap] = useState<MLMap | null>(null);
  useEffect(() => { loadPass().then(setPass); }, []);
  const [market, setMarket] = useState<Salida[]>([]);
  useEffect(() => { if (tab === 'noche') loadMarketSalidas().then(setMarket); }, [tab]);
  const todayStr = nightOf(new Date(now.getTime() + 12 * 3600_000));

  // Estado en la URL para deep links de la demo.
  // Pestaña, ficha de salida y modo guía crean una entrada de historial (pushState): el back del navegador vuelve.
  // Cambios menores (punto, fecha simulada) reemplazan la entrada actual (replaceState).
  // El modo observatorio (&obs=1) también crea entrada: el back lo cierra.
  type Nav = { tab: Tab; guia: boolean; salidaId: string | null; obs?: boolean };
  const depth = useRef(0); // entradas de historial creadas por Hanan desde la carga
  const urlFor = (n: Nav) => {
    const q = new URLSearchParams();
    if (n.tab !== 'explorar') q.set('tab', n.tab);
    if (selected !== 'susques' || n.tab !== 'explorar') q.set('punto', selected);
    if (n.guia) q.set('guia', '');
    if (n.salidaId && n.tab === 'salidas') q.set('salida', n.salidaId);
    if (sim) q.set('fecha', toLocalInput(sim));
    if (n.obs) q.set('obs', '1');
    const qs = q.toString().replace(/guia=(&|$)/, 'guia$1');
    return qs ? `?${qs}` : location.pathname;
  };
  useEffect(() => {
    history.replaceState({ hanan: true, depth: depth.current }, '', urlFor({ tab, guia, salidaId, obs }));
  }, [tab, selected, guia, salidaId, sim, obs]);
  const navigate = (n: Nav) => {
    const nObs = !!n.obs;
    if (n.tab === tab && n.guia === guia && n.salidaId === salidaId && nObs === obs) return;
    depth.current += 1;
    history.pushState({ hanan: true, depth: depth.current }, '', urlFor(n));
    const onlyObs = n.tab === tab && n.guia === guia && n.salidaId === salidaId;
    setTabState(n.tab); setGuia(n.guia); setSalidaId(n.salidaId); setObs(nObs);
    if (!onlyObs) window.scrollTo({ top: 0 });
  };
  const openObs = () => navigate({ tab, guia, salidaId, obs: true });
  const closeObs = () => (depth.current > 0 ? history.back() : navigate({ tab, guia, salidaId, obs: false }));
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      depth.current = (e.state && typeof e.state.depth === 'number') ? e.state.depth : 0;
      const q = params();
      const t = q.get('tab');
      setTabState(isTab(t) ? t : 'explorar');
      setGuia(q.has('guia'));
      setSalidaId(q.get('salida'));
      setObs(q.get('obs') === '1');
      const pt = q.get('punto'); if (isPoint(pt)) setSelected(pt);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const setTab = (t: Tab) => navigate({ tab: t, guia: false, salidaId: null });
  const nightScore = useCallback((pointId: string, night: string) => {
    const m = models[pointId as PointId]; if (!m) return null;
    return m.nights.find((n) => n.night === night)?.score ?? null;
  }, [models]);
  const nightWindow = useCallback((pointId: string, night: string) => {
    const w = models[pointId as PointId]?.nights.find((n) => n.night === night)?.window;
    return w ? { start: w.start, end: w.end } : null;
  }, [models]);
  const openSalida = (id: string) => navigate({ tab: 'salidas', guia: false, salidaId: id });
  const point = pointById(selected);

  const explorar = (
    <main className="layout">
      <div className="map-wrap">
        <MapView models={models} selected={selected} onSelect={(id) => { setSelected(id); if (guia) navigate({ tab, guia: false, salidaId }); }} sats={sats.live} modo={modo} tema={tema} onMap={setMap} />
        <PassChip pass={pass} />
        <WeatherLayers map={map} now={now} />
        {!guia && <div className="obs-fab"><ObservatorioButton onOpen={openObs} /></div>}
      </div>
      <aside className="panel" aria-label={guia ? 'Modo guía' : 'Detalle del punto'}>
        {guia ? <GuiaPanel models={models} now={now} todayStr={todayStr} nightScore={nightScore} /> : <Panel models={models} selected={selected} onSelect={setSelected} now={now} simulated={!!sim} sats={sats} />}
        <Foot fc={fc} />
      </aside>
    </main>
  );

  let content: React.ReactElement;
  if (guia || tab === 'explorar') content = explorar;
  else if (tab === 'cielo') content = (
    <main className="page page-full tema-noche">
      <div className="obs-cta"><ObservatorioButton onOpen={openObs} /><span aria-hidden>Observatorio</span></div>
      <Slot C={CieloView} title="Cielo en vivo" note="El mapa del cielo desde el punto elegido estará disponible en breve."
        props={{ point: { name: point.name, lat: point.lat, lon: point.lon, elevationM: point.elevationM }, date: now, onDateChange: (d: Date) => setSim(d), satellites: sats.sky }} />
    </main>
  );
  else if (tab === 'salidas') content = (
    <main className="page">
      {salidaId
        ? <Slot C={SalidaDetail} title="Salida" props={{ id: salidaId, nightScore, nightWindow, now, onBack: () => (depth.current > 0 ? history.back() : navigate({ tab: 'salidas', guia: false, salidaId: null })) }} />
        : <>
          <Slot C={SalidasTab} title="Salidas de guías" note="El marketplace de salidas estará disponible en breve. Mientras tanto, las salidas de ejemplo están en Explorar, dentro de cada punto."
            props={{ nightScore, nightWindow, now, onOpenSalida: openSalida, initialPointId: selected }} />
          {MisReservas && <Slot C={MisReservas} title="Mis reservas" props={{ nightScore, now }} />}
        </>}
      <Foot fc={fc} />
    </main>
  );
  else content = (
    <main className="page">
      <MiNoche models={models} pass={pass} tracked={sats.tracked} todayStr={todayStr} market={market} onOpenSalida={openSalida} onOpenPoint={(id) => { setSelected(id); setTab('explorar'); }} />
      <Foot fc={fc} />
    </main>
  );

  return (
    <div className="app" data-tab={guia ? 'guia' : tab}>
      <header className="topbar">
        <a className="brand" href="./" aria-label="Hanan, inicio">
          <Mark size={28} />
          <span className="brand-name">hanan</span>
          <span className="brand-sub">cielos de la Puna</span>
        </a>
        <TabBar tab={tab} onTab={setTab} />
        <div className="actions">
          <IconButton icon={CalendarClock} label="Simulador de fecha" text={sim ? 'Simulado' : 'Fecha'} pressed={simOpen || !!sim}
            data-sim-toggle="" aria-expanded={simOpen} aria-controls="simulador" onClick={() => setSimOpen((x) => !x)} className={sim ? 'is-sim' : ''} />
          <IconButton icon={UserRound} label="Modo guía" text={guia ? 'Modo guía' : 'Soy guía'} pressed={guia}
            onClick={() => navigate({ tab, guia: !guia, salidaId: guia ? salidaId : null })} />
          <span className="actions-sep" aria-hidden />
          {modo === 'rojo'
            ? <>
              {/* El nombre no repite "modo rojo": el toggle de rojo se busca por ese nombre (contrato E2E). La pista va como descripción y tooltip. */}
              <IconButton icon={tema === 'claro' ? Moon : Sun} label="Cambiar tema (no disponible ahora)" title={RED_THEME_HINT} aria-disabled="true" aria-describedby="tema-hint" className="is-disabled" />
              <span id="tema-hint" className="sr-only">{RED_THEME_HINT}</span>
            </>
            : <IconButton icon={tema === 'claro' ? Moon : Sun} label={tema === 'claro' ? 'Tema oscuro' : 'Tema claro'} title={tema === 'claro' ? 'Tema oscuro' : 'Tema claro'} onClick={toggleTema} />}
          <IconButton icon={Eye} label="Modo rojo de visión nocturna" text="Rojo" pressed={modo === 'rojo'} onClick={toggleModo} />
        </div>
        {simOpen && (
          <div className="simpop" id="simulador" role="region" aria-label="Simulador de fecha" ref={simRef}>
            <div className="simpop-head">
              <p className="simpop-title">Simular fecha y hora</p>
              <button type="button" className="icon-btn" aria-label="Cerrar simulador" onClick={() => setSimOpen(false)}><X {...ICON} /></button>
            </div>
            <label className="simpop-field"><span>Fecha y hora (Jujuy)</span>
              <input type="datetime-local" value={toLocalInput(now)} onChange={(e) => e.target.value && setSim(new Date(`${e.target.value}:00-03:00`))} />
            </label>
            <div className="simpop-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setSim(new Date(`${localDateStr(now).slice(0, 4)}-06-20T22:00:00-03:00`))}>Probar junio</button>
              {sim && <button type="button" className="btn btn-ghost" onClick={() => { setSim(null); setSimOpen(false); }}>Volver a ahora</button>}
            </div>
            <p className="muted small">Recalcula efemérides, Vía Láctea y satélites. Fuera de los 7 días no hay pronóstico.</p>
          </div>
        )}
      </header>
      {sim && !simOpen && (guia || tab !== 'cielo') && (
        <p className="simflag" role="status">
          <CalendarClock {...ICON} size={16} /> Simulando <b className="num">{toLocalInput(sim).replace('T', ' ')}</b>
          <button type="button" className="simflag-btn" onClick={() => setSim(null)}>Volver a ahora</button>
        </p>
      )}

      {content}

      {obs && (
        <div className="tema-noche obs-host">
          <Observatorio point={{ name: point.name, lat: point.lat, lon: point.lon, elevationM: point.elevationM }} date={now} satellites={sats.sky} onClose={closeObs} />
        </div>
      )}
    </div>
  );
}

function Foot({ fc }: { fc: ReturnType<typeof useForecast> }) {
  return (
    <footer className="foot">
      <p>Pronóstico {fc.origin === 'fixture' ? 'de la copia local' : fc.origin === 'cache' ? 'guardado' : 'actualizado'} · {ago(fc.fetchedAt)} ({hhmm(fc.fetchedAt)}). Es una previsión: el cielo real puede cambiar.</p>
      <p>Datos meteorológicos: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open‑Meteo.com</a> (CC BY 4.0) · Órbitas: <a href="https://celestrak.org/" target="_blank" rel="noreferrer">CelesTrak</a> · Mapa: Esri, © OpenStreetMap</p>
    </footer>
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
