export type Severity = "low" | "moderate" | "high" | "very-high";

export interface Location {
  id: string;
  name: string;
  customName?: string;
  region?: string;
  postcode?: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  isAutoDetected?: boolean;
  neighbourhood?: string;
  district?: string;
  localityPath?: string[];
}

export interface PollenBreakdown {
  alder: number;
  birch: number;
  grass: number;
  mugwort: number;
  olive: number;
  ragweed: number;
}

export interface PollenData {
  total: number;
  level: Severity;
  breakdown: PollenBreakdown;
  dominantSpecies: string;
}

export interface AqiData {
  index: number;
  level: Severity;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  dominantPollutant: string;
}

export interface WeatherHour {
  time: string;
  temp: number;
  feelsLike: number;
  precipProb: number;
  weatherCode: number;
  cloudCover?: number;
  windSpeed?: number;
  humidity?: number;
  precipMm?: number;
}

export interface WeatherDay {
  date: string;
  high: number;
  low: number;
  precipProb: number;
  precipSum: number;
  weatherCode: number;
  uvIndexMax: number;
  windMax: number;
  sunrise?: string;
  sunset?: string;
}

export interface WeatherAlert {
  id: string;
  title: string;
  severity: "yellow" | "amber" | "red";
  description: string;
}

export interface WeatherData {
  temp: number;
  feelsLike: number;
  high: number;
  low: number;
  precipProb: number;
  rainTotal: number;
  windSpeed: number;
  windGust: number;
  uvIndex: number;
  humidity: number;
  weatherCode: number;
  conditions: string;
  isDay: boolean;
  cloudCover: number;
  cloudLow: number;
  cloudMid: number;
  cloudHigh: number;
  visibility?: number;
  pressure?: number;   // hPa
  dewPoint?: number;   // °C
  precipMm?: number;   // current mm/h
  /** Epoch ms of the observation the provider reported (not our fetch time). */
  observedAt?: number;
  hourly: WeatherHour[];
  daily: WeatherDay[];
  alerts: WeatherAlert[];
  timezone: string;
  latitude: number;
  longitude: number;
}

export interface LocationConditions {
  location: Location;
  weather: WeatherData;
  pollen: PollenData;
  aqi: AqiData;
  narrative: string;
  outfit: string;
  umbrella: string;
  perfume: string;
  fetchedAt: number;
}

export interface NotificationPrefs {
  enabled: boolean;
  morningTime: string; // "07:30"
  pollenAlerts: boolean;
  pollenThreshold: Severity;
  aqiAlerts: boolean;
  rainAlerts: boolean;
  alertsLastFired?: Record<string, string>;
  detailedLocation?: boolean;
  weatherProvider?: WeatherProvider;
}

export type WeatherProvider = "open-meteo" | "yr-no" | "foreca" | "met-office" | "apple";