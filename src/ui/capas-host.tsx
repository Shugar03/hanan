// Host de las capas meteorológicas (agente F: src/ui/capas/** y src/data/grid.ts).
// Si esos módulos no existen o fallan, no se muestra nada y el mapa sigue funcionando.
import { useEffect, useRef, useState } from 'react';
import { refitMapView, setMapView } from './MapView';
import type { Map as MLMap } from 'maplibre-gl';
import { Slot, ext, optional } from './Optional';

type Handle = { setVariable: (v: string) => void; setTime: (t: Date) => void; setVisible: (v: boolean) => void; destroy: () => void };
const CapasControls = optional<any>('capasControls', ext.capasControls, 'default');

export function WeatherLayers({ map, now }: { map: MLMap | null; now: Date }) {
  const [state, setState] = useState<{ handle: Handle; hours: Date[] } | null>(null);
  const [variable, setVariable] = useState<string | null>(null);
  const [time, setTime] = useState<Date>(now);
  const gridMod = useRef<Record<string, any> | null>(null);
  const framed = useRef(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const sel = useRef<{ variable: string | null; time: Date }>({ variable: null, time: now });
  sel.current = { variable, time };
  /** Primera vez que se activa una capa: encuadre de la grilla (gridViewBounds). Al apagarla: los 6 puntos. */
  const frame = (on: boolean) => {
    if (!map) return;
    if (on && !framed.current && gridMod.current?.gridViewBounds) {
      framed.current = true;
      // En mobile la franja de capas ocupa el borde inferior: la grilla llena solo el área visible de arriba.
      const fitGrid = () => {
        const c = map.getContainer();
        const ph = c.clientWidth < 720 ? (hostRef.current?.offsetHeight ?? 0) + 8 : 0;
        map.fitBounds(gridMod.current!.gridViewBounds(c.clientWidth, c.clientHeight - ph), { padding: { top: 0, left: 0, right: 0, bottom: ph }, duration: 0 });
      };
      requestAnimationFrame(() => setMapView(map, fitGrid));
    } else if (!on && framed.current) {
      framed.current = false;
      setMapView(map, null);
    }
  };

  useEffect(() => {
    if (!map || !ext.grid || !ext.capasLayer || !CapasControls) return;
    let alive = true;
    let handle: Handle | null = null;
    (async () => {
      try {
        const [g, l] = (await Promise.all([ext.grid!(), ext.capasLayer!()])) as [Record<string, any>, Record<string, any>];
        gridMod.current = g;
        if (!alive) return;
        // 1) Grilla del fixture al instante (offline-first): los controles aparecen sin esperar la red.
        const mount = (grid: any) => {
          try { handle?.destroy(); } catch { /* ya destruida */ }
          handle = l.attachWeatherLayer(map, grid) as Handle;
          const hours: Date[] = grid.times ?? [];
          const cur = sel.current;
          const t0 = hours.reduce((a: Date | undefined, h: Date) => (!a || Math.abs(+h - +cur.time) < Math.abs(+a - +cur.time) ? h : a), undefined) ?? cur.time;
          handle.setTime(t0);
          if (cur.variable) handle.setVariable(cur.variable);
          handle.setVisible(!!cur.variable);
          setTime(t0);
          setState({ handle, hours });
        };
        mount(g.fixtureGrid());
        // 2) Después, la grilla de la red o del caché (si es distinta del fixture), conservando capa y hora.
        // Si el caché local quedó con un formato viejo, loadGrid lo descarta y devuelve el fixture.
        const fresh = await g.loadGrid().catch((e: unknown) => { console.warn('[hanan] grilla: sigo con el fixture', e); return null; });
        if (alive && fresh && fresh.origin !== 'fixture') mount(fresh);
      } catch (e) { console.warn('[hanan] capas no disponibles', e); }
    })();
    return () => { alive = false; framed.current = false; try { handle?.destroy(); } catch { /* el mapa ya se destruyó */ } setState(null); };
  }, [map]);

  // Si la franja cambia de alto (aparece el scrubber, se expande la leyenda), se reencuadra la grilla.
  useEffect(() => {
    const el = hostRef.current; if (!el || !map) return;
    let last = el.offsetHeight;
    const ro = new ResizeObserver(() => {
      if (el.offsetHeight === last) return;
      last = el.offsetHeight;
      if (framed.current) refitMapView(map);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [map, state]);

  if (!state) return null;
  return (
    <div className="capas-host" ref={hostRef}>
      <Slot C={CapasControls} title="Capas" props={{
        variable,
        onVariable: (v: string | null) => { setVariable(v); if (v) state.handle.setVariable(v); state.handle.setVisible(!!v); frame(!!v); },
        time, onTime: (t: Date) => { setTime(t); state.handle.setTime(t); }, hours: state.hours,
      }} />
    </div>
  );
}
