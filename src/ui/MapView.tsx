import { useEffect, useRef, useState } from 'react';
import { Map as MLMap, Marker, LngLatBounds, setWorkerUrl, type StyleSpecification } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { PointId } from '../sky/types';
import type { PointModel } from '../model';
import { toneFor } from '../sky/score';
import { POINTS, shortName } from '../data/points';

setWorkerUrl(workerUrl);

/** El nombre va pegado al pin, a la derecha; si no entra antes del borde del mapa, a la izquierda. */
function placeNames(box: HTMLElement | null, pins: Iterable<{ el: HTMLButtonElement }>) {
  if (!box) return;
  const right = box.getBoundingClientRect().right;
  for (const { el } of pins) {
    const name = el.querySelector<HTMLElement>('.pin-name');
    const r = el.getBoundingClientRect();
    const need = (name?.offsetWidth ?? 0) + 8;
    el.dataset.flip = String(r.right + need > right);
  }
}

export type SatMarker = { name: string; lat: number; lon: number; altKm: number };

// Trazado aproximado de la RN 52 (Purmamarca → Jama), solo como referencia visual.
const RN52: [number, number][] = [
  [-65.4998, -23.746], [-65.58, -23.70], [-65.66, -23.66], [-65.75, -23.66], [-65.87, -23.62], [-66.0, -23.55],
  [-66.15, -23.47], [-66.3675, -23.3986], [-66.55, -23.36], [-66.80, -23.30], [-67.0178, -23.2402],
];

const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || 'black';

const style = (): StyleSpecification => ({
  version: 8,
  sources: {
    relieve: {
      type: 'raster', tileSize: 256, maxzoom: 13,
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade_Dark/MapServer/tile/{z}/{y}/{x}'],
      attribution: 'Relieve y base: Esri · © OpenStreetMap',
    },
    base: {
      type: 'raster', tileSize: 256, maxzoom: 16,
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': cssVar('--bg') } },
    { id: 'base', type: 'raster', source: 'base', paint: { 'raster-opacity': 0.55 } },
    { id: 'relieve', type: 'raster', source: 'relieve', paint: { 'raster-opacity': 0.7 } },
  ],
});

type Props = {
  models: Record<PointId, PointModel>;
  selected: PointId;
  onSelect: (id: PointId) => void;
  sats: SatMarker[];
  modo: string;
};

export function MapView({ models, selected, onSelect, sats, modo }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const markers = useRef<Map<string, { m: Marker; el: HTMLButtonElement }>>(new Map());
  const satMarkers = useRef<Map<string, Marker>>(new Map());
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!box.current) return;
    let m: MLMap;
    try {
      m = new MLMap({ container: box.current, style: style(), attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false });
    } catch { setFailed(true); return; }
    map.current = m;
    const b = new LngLatBounds();
    POINTS.forEach((p) => b.extend([p.lon, p.lat]));
    const fit = () => box.current && box.current.clientHeight > 150 && m.fitBounds(b, { padding: box.current.clientWidth < 600 ? { top: 44, bottom: 72, left: 40, right: 40 } : { top: 72, bottom: 80, left: 72, right: 180 }, duration: 0, maxZoom: 9 });
    fit();
    const ro = new ResizeObserver(() => { m.resize(); fit(); });
    ro.observe(box.current);
    m.on('load', () => {
      m.addSource('rn52', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: RN52 } } });
      m.addLayer({ id: 'rn52', type: 'line', source: 'rn52', paint: { 'line-color': cssVar('--text-2'), 'line-width': 1.5, 'line-dasharray': [2, 2], 'line-opacity': 0.7 } });
    });
    for (const p of POINTS) {
      const el = document.createElement('button');
      el.className = 'pin';
      el.type = 'button';
      el.addEventListener('click', (e) => { e.stopPropagation(); onSelectRef.current(p.id); });
      const mk = new Marker({ element: el, anchor: 'center' }).setLngLat([p.lon, p.lat]).addTo(m);
      markers.current.set(p.id, { m: mk, el });
    }
    m.on('move', () => placeNames(box.current, markers.current.values()));
    return () => { ro.disconnect(); m.remove(); markers.current.clear(); satMarkers.current.clear(); };
  }, []);

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Pines: número + etiqueta corta, nunca solo color.
  useEffect(() => {
    for (const p of POINTS) {
      const r = markers.current.get(p.id); if (!r) continue;
      const t = models[p.id].tonight;
      const label = t.label;
      const tone = toneFor(t);
      r.el.dataset.tone = tone;
      r.el.dataset.selected = String(p.id === selected);
      r.el.setAttribute('aria-label', `${p.name}: score de cielo ${t.score}, ${label}`);
      r.el.setAttribute('aria-pressed', String(p.id === selected));
      r.el.innerHTML = `<span class="pin-score">${t.score}</span><span class="pin-name">${shortName(p)}</span>`;
      r.m.getElement().style.zIndex = p.id === selected ? '3' : '1';
    }
    placeNames(box.current, markers.current.values());
  }, [models, selected]);

  useEffect(() => {
    const m = map.current; if (!m) return;
    const seen = new Set<string>();
    for (const s of sats) {
      seen.add(s.name);
      let mk = satMarkers.current.get(s.name);
      if (!mk) {
        const el = document.createElement('div');
        el.className = 'sat';
        el.innerHTML = `<span class="sat-dot"></span><span class="sat-name">${s.name}</span>`;
        mk = new Marker({ element: el, anchor: 'left' }).setLngLat([s.lon, s.lat]).addTo(m);
        satMarkers.current.set(s.name, mk);
      } else mk.setLngLat([s.lon, s.lat]);
    }
    for (const [n, mk] of satMarkers.current) if (!seen.has(n)) { mk.remove(); satMarkers.current.delete(n); }
  }, [sats]);

  // Recolorear el mapa cuando cambia el modo (los colores salen de los tokens).
  useEffect(() => {
    const m = map.current; if (!m) return;
    const apply = () => {
      if (m.getLayer('bg')) m.setPaintProperty('bg', 'background-color', cssVar('--bg'));
      if (m.getLayer('rn52')) m.setPaintProperty('rn52', 'line-color', cssVar('--text-2'));
    };
    if (m.isStyleLoaded()) apply(); else m.once('load', apply);
  }, [modo]);

  return (
    <div className="map" ref={box} role="region" aria-label="Mapa de la Ruta Jujeña de las Estrellas (RN 52)">
      {failed && <p className="map-fallback">El mapa no pudo cargarse en este dispositivo. Elegí un punto en la lista.</p>}
    </div>
  );
}
