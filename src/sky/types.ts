// Contratos de datos — docs/tech/architecture.md
export type PointId = 'purmamarca' | 'salinas' | 'susques' | 'olaroz' | 'jama' | 'tilcara';

export type ObservationPoint = {
  id: PointId;
  name: string; lat: number; lon: number; elevationM: number;
  approximate?: boolean;
  note?: string;
};

export type HourlyConditions = {
  time: Date;
  cloudLow: number; cloudMid: number; cloudHigh: number;
  humidity: number;
  windGustKmh: number; temperatureC: number;
};

export type ScoreLabel = 'Excelente' | 'Muy bueno' | 'Aceptable' | 'Malo' | 'Día';

export type SkyFactors = { darkness: number; clouds: number; moon: number; humidity: number; wind: number };

export type SkyScore = {
  time: Date; score: number;
  label: ScoreLabel;
  factors: SkyFactors;
  /** true si no hay pronóstico y solo se calculó la parte astronómica */
  astronomyOnly?: boolean;
};

export type ObservationWindow = { start: Date; end: Date; meanScore: number };

export type NightSummary = {
  date: string;
  astroDusk: Date; astroDawn: Date;
  moon: { rise?: Date; set?: Date; illumination: number; phaseName: string };
  milkyWayCore: { maxAltitudeDeg: number; hoursAbove20: number; maxAt?: Date };
  planets: { name: string; altitudeDeg: number }[];
  magellanic: { name: string; altitudeDeg: number }[];
  bestWindow?: ObservationWindow;
  seasonalNote?: string;
};

export type SatelliteName = 'ISS' | 'SAOCOM 1A' | 'SAOCOM 1B' | 'ARSAT 2';

export type SatPass = {
  satellite: SatelliteName;
  start: Date; end: Date; maxElevationDeg: number; visible: boolean;
};

export type Salida = {
  id: string; guideName: string; guideRegistered: boolean;
  pointId: PointId; departure: Date; durationH: number;
  capacity: number; languages: string[]; priceRef?: string;
  whatsapp: string; demo: boolean;
  meetingPoint?: string;
};

export type DemandSignal = { pointId: PointId; night: string; count: number };

export type PassStatus = {
  state: 'abierto' | 'restringido' | 'cerrado' | 'desconocido';
  sourceUpdatedAt?: string; fetchedAt: Date; sourceUrl: string;
  vialidad?: string;
};
