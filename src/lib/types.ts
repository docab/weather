export type Severity = "low" | "moderate" | "high" | "very-high";

export interface Location {
  id: string;
  name: string;
  region?: string;
  postcode?: string;
  latitude: number;
  longitude: number;
  isAutoDetected?: boolean;
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
  hourly: WeatherHour[];
  alerts: WeatherAlert[];
}

export interface LocationConditions {
  location: Location;
  weather: WeatherData;
  pollen: PollenData;
  aqi: AqiData;
  narrative: string;
  outfit: string;
  umbrella: string;
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
}