// TEMPORAL: entry de capturas de las capas. Borrar al terminar.
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Map as MLMap, Marker, LngLatBounds, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@fontsource/schibsted-grotesk/latin-400.css';
import '@fontsource/schibsted-grotesk/latin-500.css';
import '@fontsource/schibsted-grotesk/latin-600.css';
import '../../../design/tokens.css';
import { fixtureGrid, GRID_BOUNDS, sampleGrid, nearestCell, type GridVar } from '../../data/grid';
import { POINTS } from '../../data/points';
import { parseLocal } from '../../sky/time';
import { attachWeatherLayer, type WeatherLayer } from './weatherLayer';
import CapasControls from './CapasControls';
setWorkerUrl(workerUrl);
const q = new URLSearchParams(location.search);
if (q.get('modo') === 'rojo') document.documentElement.dataset.modo = 'rojo';
const grid = fixtureGrid();
const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

function App() {
  const box = useRef<HTMLDivElement>(null);
  const layer = useRef<WeatherLayer | null>(null);
  const [variable, setVariable] = useState<GridVar | null>((q.get('v') as GridVar) ?? 'cloud_total');
  const [time, setTime] = useState(parseLocal(q.get('t') ?? '2026-11-22T23:00'));
  useEffect(() => {
    const m = new MLMap({ container: box.current!, attributionControl: { compact: true }, style: { version: 8, sources: {
      relieve: { type: 'raster', tileSize: 256, maxzoom: 13, tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade_Dark/MapServer/tile/{z}/{y}/{x}'], attribution: 'Esri' },
      base: { type: 'raster', tileSize: 256, maxzoom: 16, tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'] } },
      layers: [{ id: 'bg', type: 'background', paint: { 'background-color': cssVar('--bg') } },
        { id: 'base', type: 'raster', source: 'base', paint: { 'raster-opacity': 0.55 } },
        { id: 'relieve', type: 'raster', source: 'relieve', paint: { 'raster-opacity': 0.7 } }] } });
    const narrow = box.current!.clientWidth < 600;
    if (q.get('fit') === 'points') {
      const b = new LngLatBounds(); POINTS.forEach((p) => b.extend([p.lon, p.lat]));
      m.fitBounds(b, { padding: narrow ? { top: 44, bottom: 72, left: 40, right: 40 } : { top: 72, bottom: 80, left: 72, right: 180 }, duration: 0, maxZoom: 9 });
    } else m.fitBounds(GRID_BOUNDS, { padding: 0, duration: 0 });
    const s = variable === 'score' ? sampleGrid(grid, 'score', time) : null;
    for (const p of POINTS) {
      const el = document.createElement('div');
      el.style.cssText = `background:${cssVar('--surface')};color:${cssVar('--text')};border:2px solid ${cssVar('--accent')};border-radius:999px;padding:2px 8px;font:600 13px Schibsted Grotesk`;
      el.textContent = p.name.split(' ')[0] + (s ? ' ' + Math.round(s[nearestCell(grid, p.lat, p.lon)]) : '');
      new Marker({ element: el }).setLngLat([p.lon, p.lat]).addTo(m);
    }
    m.on('load', () => {
      m.addSource('rn52', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: POINTS.map((p) => [p.lon, p.lat]) } } });
      m.addLayer({ id: 'rn52', type: 'line', source: 'rn52', paint: { 'line-color': cssVar('--text-2'), 'line-width': 1.5, 'line-dasharray': [2, 2] } });
    });
    layer.current = attachWeatherLayer(m, grid); (window as unknown as { __m: MLMap }).__m = m;
    return () => { layer.current?.destroy(); m.remove(); };
  }, []);
  useEffect(() => { if (variable) layer.current?.setVariable(variable); layer.current?.setVisible(!!variable); }, [variable]);
  useEffect(() => { layer.current?.setTime(time); }, [time]);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)' }}>
      <div ref={box} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
        <CapasControls variable={variable} onVariable={setVariable} time={time} onTime={setTime} hours={grid.times} />
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
