// Host de las capas meteorológicas (agente F: src/ui/capas/** y src/data/grid.ts).
// Si esos módulos no existen o fallan, no se muestra nada y el mapa sigue funcionando.
import { useEffect, useState } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import { Slot, ext, optional } from './Optional';

type Handle = { setVariable: (v: string) => void; setTime: (t: Date) => void; setVisible: (v: boolean) => void; destroy: () => void };
const CapasControls = optional<any>('capasControls', ext.capasControls, 'default');

export function WeatherLayers({ map, now }: { map: MLMap | null; now: Date }) {
  const [state, setState] = useState<{ handle: Handle; hours: Date[] } | null>(null);
  const [variable, setVariable] = useState<string | null>(null);
  const [time, setTime] = useState<Date>(now);

  useEffect(() => {
    if (!map || !ext.grid || !ext.capasLayer || !CapasControls) return;
    let alive = true;
    let handle: Handle | null = null;
    (async () => {
      try {
        const [g, l] = (await Promise.all([ext.grid!(), ext.capasLayer!()])) as [Record<string, any>, Record<string, any>];
        const grid = await g.loadGrid();
        if (!alive) return;
        handle = l.attachWeatherLayer(map, grid) as Handle;
        const hours: Date[] = grid.times ?? [];
        const t0 = hours.reduce((a: Date | undefined, h: Date) => (!a || Math.abs(+h - +now) < Math.abs(+a - +now) ? h : a), undefined) ?? now;
        handle.setTime(t0); handle.setVisible(false);
        setTime(t0);
        setState({ handle, hours });
      } catch (e) { console.warn('[hanan] capas no disponibles', e); }
    })();
    return () => { alive = false; try { handle?.destroy(); } catch { /* el mapa ya se destruyó */ } setState(null); };
  }, [map]);

  if (!state) return null;
  return (
    <div className="capas">
      <Slot C={CapasControls} title="Capas" props={{
        variable,
        onVariable: (v: string | null) => { setVariable(v); if (v) state.handle.setVariable(v); state.handle.setVisible(!!v); },
        time, onTime: (t: Date) => { setTime(t); state.handle.setTime(t); }, hours: state.hours,
      }} />
    </div>
  );
}
