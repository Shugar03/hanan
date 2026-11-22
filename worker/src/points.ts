// Catálogo de los 6 puntos de observación (spec HU-1). Mantener en sync con fixtures/points.json.
export type PointId = 'purmamarca' | 'salinas' | 'susques' | 'olaroz' | 'jama' | 'tilcara';

export type ObservationPoint = {
  id: PointId;
  name: string;
  lat: number;
  lon: number;
  elevationM: number;
  approximate?: boolean;
};

export const POINTS: readonly ObservationPoint[] = [
  { id: 'purmamarca', name: 'Purmamarca', lat: -23.74595, lon: -65.49976, elevationM: 2324 },
  { id: 'salinas', name: 'Salinas Grandes (mirador RN 52)', lat: -23.62, lon: -65.87, elevationM: 3450, approximate: true },
  { id: 'susques', name: 'Susques · COAS', lat: -23.39858, lon: -66.36753, elevationM: 3605 },
  { id: 'olaroz', name: 'Olaroz Chico · Observatorio', lat: -23.39338, lon: -66.80291, elevationM: 4172 },
  { id: 'jama', name: 'Jama', lat: -23.24019, lon: -67.01778, elevationM: 4057 },
  { id: 'tilcara', name: 'Tilcara (control Quebrada)', lat: -23.57817, lon: -65.39516, elevationM: 2486 },
];

/** Una sola request multi-coordenada; el array de respuesta sigue el orden de POINTS. */
export function openMeteoUrl(points: readonly ObservationPoint[] = POINTS): string {
  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat).join(','),
    longitude: points.map((p) => p.lon).join(','),
    hourly: 'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m,wind_gusts_10m,temperature_2m',
    daily: 'moonrise,moonset,moon_phase,sunrise,sunset',
    timezone: 'America/Argentina/Jujuy',
    forecast_days: '7',
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export const OMM_CATNRS = [25544, 43641, 46265, 40941] as const; // ISS, SAOCOM 1A, SAOCOM 1B, ARSAT 2

export function celestrakUrl(catnr: number): string {
  return `https://celestrak.org/NORAD/elements/gp.php?CATNR=${catnr}&FORMAT=JSON`;
}
