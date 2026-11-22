import { useEffect, useRef, useState } from 'react';
import { Map as MLMap, Marker, LngLatBounds, setWorkerUrl, type StyleSpecification } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { PointId } from '../sky/types';
import type { PointModel } from '../model';
import { toneFor } from '../sky/score';
import { POINTS, shortName } from '../data/points';

setWorkerUrl(workerUrl);

const views = new WeakMap<MLMap, { custom: (() => void) | null; fitPoints: (duration?: number) => void }>();
/** Cambia el encuadre del mapa: una función de encuadre propia (p. ej. la grilla de capas) o null para volver a los 6 puntos. */
export function setMapView(m: MLMap, custom: (() => void) | null) {
  const v = views.get(m); if (!v) return;
  v.custom = custom;
  if (custom) custom(); else v.fitPoints(400);
}
/** Re-aplica el encuadre vigente (p. ej. cuando cambia el alto de un overlay). */
export function refitMapView(m: MLMap) {
  const v = views.get(m); if (!v) return;
  if (v.custom) v.custom(); else v.fitPoints();
}

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

/** Teselas Esri sin key. Tema claro: World Light Gray Base + World Hillshade. Oscuro y modo rojo: Dark Gray + Hillshade Dark. */
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
const tilesFor = (light: boolean) => ({
  relieve: [`${ESRI}Elevation/${light ? 'World_Hillshade' : 'World_Hillshade_Dark'}/MapServer/tile/{z}/{y}/{x}`],
  base: [`${ESRI}Canvas/${light ? 'World_Light_Gray_Base' : 'World_Dark_Gray_Base'}/MapServer/tile/{z}/{y}/{x}`],
});
const isLight = () => document.documentElement.dataset.tema === 'claro' && document.documentElement.dataset.modo !== 'rojo';
const OPACITY = (light: boolean) => ({ base: light ? 0.8 : 0.55, relieve: light ? 0.45 : 0.7 });
/** Mismo rango de zoom en las dos fuentes (sobre-zoom más allá de 13): nunca se mezclan teselas de niveles distintos entre base y relieve. */
const TILE_ZOOM = { minzoom: 0, maxzoom: 13 } as const;
const RASTER_PAINT = { 'raster-fade-duration': 0, 'raster-opacity-transition': { duration: 250, delay: 0 } } as const;

const style = (light = isLight()): StyleSpecification => ({
  version: 8,
  sources: {
    relieve: {
      type: 'raster', tileSize: 256, ...TILE_ZOOM,
      tiles: tilesFor(light).relieve,
      attribution: 'Relieve y base: Esri · © OpenStreetMap',
    },
    base: {
      type: 'raster', tileSize: 256, ...TILE_ZOOM,
      tiles: tilesFor(light).base,
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': cssVar('--bg') } },
    // Arrancan en 0 y se revelan juntas cuando las dos fuentes terminaron de cargar (revealTiles): sin parches de carga.
    { id: 'base', type: 'raster', source: 'base', paint: { 'raster-opacity': 0, ...RASTER_PAINT } },
    { id: 'relieve', type: 'raster', source: 'relieve', paint: { 'raster-opacity': 0, ...RASTER_PAINT } },
  ],
});

type Props = {
  models: Record<PointId, PointModel>;
  selected: PointId;
  onSelect: (id: PointId) => void;
  sats: SatMarker[];
  modo: string;
  /** Tema de la interfaz: el mapa base pasa a gris claro en tema claro (salvo en modo rojo). */
  tema?: string;
  /** Expone la instancia del mapa (capas meteorológicas). */
  onMap?: (m: MLMap | null) => void;
};

export function MapView({ models, selected, onSelect, sats, modo, tema, onMap }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const markers = useRef<Map<string, { m: Marker; el: HTMLButtonElement }>>(new Map());
  const satMarkers = useRef<Map<string, Marker>>(new Map());
  const [failed, setFailed] = useState(false);
  const tilesLight = useRef<boolean | null>(null);
  const revealed = useRef(false);
  /** Muestra base y relieve juntos cuando el mapa queda quieto con todas las teselas (o a los 4 s, p. ej. sin red). */
  const revealTiles = (m: MLMap) => {
    revealed.current = false;
    let done = false;
    const show = () => {
      if (done) return; done = true; revealed.current = true;
      const o = OPACITY(isLight());
      if (m.getLayer('base')) m.setPaintProperty('base', 'raster-opacity', o.base);
      if (m.getLayer('relieve')) m.setPaintProperty('relieve', 'raster-opacity', o.relieve);
    };
    m.once('idle', show);
    setTimeout(show, 4000);
  };

  useEffect(() => {
    if (!box.current) return;
    let m: MLMap;
    try {
      tilesLight.current = isLight();
      m = new MLMap({ container: box.current, style: style(), attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false });
    } catch { setFailed(true); return; }
    map.current = m;
    const b = new LngLatBounds();
    POINTS.forEach((p) => b.extend([p.lon, p.lat]));
    const fitPoints = (duration = 0) => box.current && box.current.clientHeight > 150 && m.fitBounds(b, { padding: box.current.clientWidth < 600 ? { top: 44, bottom: 72, left: 40, right: 40 } : { top: 72, bottom: 80, left: 72, right: 180 }, duration, maxZoom: 9 });
    // Encuadre actual: los 6 puntos, o el que fije una capa (setMapView). Se re-aplica al cambiar el tamaño.
    views.set(m, { custom: null, fitPoints });
    const fit = () => { const v = views.get(m); if (v?.custom) v.custom(); else fitPoints(); };
    fit();
    revealTiles(m);
    const ro = new ResizeObserver(() => { m.resize(); fit(); });
    ro.observe(box.current);
    // Avisar apenas el estilo está listo (no esperar a que bajen todos los tiles, que sin red tardan o fallan).
    let announced = false;
    const announce = () => { if (announced || !m.isStyleLoaded()) return; announced = true; onMapRef.current?.(m); };
    m.on('styledata', announce);
    m.on('load', announce);
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
    return () => { onMapRef.current?.(null); ro.disconnect(); m.remove(); markers.current.clear(); satMarkers.current.clear(); };
  }, []);

  const onMapRef = useRef(onMap);
  onMapRef.current = onMap;
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
      const light = isLight(), t = tilesFor(light);
      // Solo recargar teselas si cambió la familia (claro ↔ oscuro): evita un parpadeo al montar.
      if (tilesLight.current !== light) {
        tilesLight.current = light;
        for (const id of ['base', 'relieve'] as const) {
          if (m.getLayer(id)) m.setPaintProperty(id, 'raster-opacity', 0);
          const src = m.getSource(id) as unknown as { setTiles?: (x: string[]) => void } | undefined;
          src?.setTiles?.(t[id]);
        }
        revealTiles(m);
      } else if (revealed.current) {
        const o = OPACITY(light);
        if (m.getLayer('base')) m.setPaintProperty('base', 'raster-opacity', o.base);
        if (m.getLayer('relieve')) m.setPaintProperty('relieve', 'raster-opacity', o.relieve);
      }
      if (m.getLayer('bg')) m.setPaintProperty('bg', 'background-color', cssVar('--bg'));
      if (m.getLayer('rn52')) m.setPaintProperty('rn52', 'line-color', cssVar('--text-2'));
    };
    if (m.isStyleLoaded()) apply(); else m.once('load', apply);
  }, [modo, tema]);

  return (
    <div className="map" ref={box} role="region" aria-label="Mapa de la Ruta Jujeña de las Estrellas (RN 52)">
      {failed && <p className="map-fallback">El mapa no pudo cargarse en este dispositivo. Elegí un punto en la lista.</p>}
    </div>
  );
}
