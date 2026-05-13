import type { Location, WeatherData, PollenData, AqiData, WeatherHour, WeatherDay, PollenBreakdown } from "./types";
import { pollenSeverity, aqiSeverity } from "./severity";
import { describeWeather } from "./weatherCodes";

// ---------- Geocoding ----------

export interface GeoResult {
  name: string;
  region?: string;
  postcode?: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
}

const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const PARTIAL_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?$/i;

export async function geocodePlace(query: string): Promise<GeoResult[]> {
  const q = query.trim();
  if (!q) return [];

  // UK postcode niceties (still useful when input matches)
  if (POSTCODE_RE.test(q)) {
    const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(q.replace(/\s+/g, ""))}`);
    if (r.ok) {
      const j = await r.json();
      const d = j.result;
      return [{
        name: `${d.parish || d.admin_ward || d.admin_district}`,
        region: d.region || d.admin_county || d.country,
        postcode: d.postcode,
        country: "United Kingdom",
        countryCode: "GB",
        latitude: d.latitude,
        longitude: d.longitude,
      }];
    }
  }
  if (PARTIAL_POSTCODE_RE.test(q)) {
    const r = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(q)}`);
    if (r.ok) {
      const j = await r.json();
      const d = j.result;
      return [{
        name: d.outcode + " — " + (d.admin_district?.[0] ?? "UK"),
        region: d.admin_county?.[0] || d.country?.[0],
        postcode: d.outcode,
        country: "United Kingdom",
        countryCode: "GB",
        latitude: d.latitude,
        longitude: d.longitude,
      }];
    }
  }

  // Worldwide place-name search via Open-Meteo geocoding
  const r = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=en&format=json`
  );
  if (!r.ok) return [];
  const j = await r.json();
  const results: GeoResult[] = (j.results || [])
    .slice(0, 10)
    .map((d: { name: string; admin1?: string; admin2?: string; country?: string; country_code?: string; latitude: number; longitude: number }) => ({
      name: d.name,
      region: d.admin2 || d.admin1,
      country: d.country,
      countryCode: d.country_code,
      latitude: d.latitude,
      longitude: d.longitude,
    }));
  return results;
}

// Backwards-compat alias
export const geocodeUK = geocodePlace;

export async function reverseGeocode(lat: number, lon: number): Promise<GeoResult | null> {
  // Try postcodes.io first (UK only, gives nice locality names)
  const r = await fetch(`https://api.postcodes.io/postcodes?lon=${lon}&lat=${lat}&limit=1&radius=2000`);
  if (r.ok) {
    const j = await r.json();
    const d = j.result?.[0];
    if (d) {
      return {
        name: d.parish || d.admin_ward || d.admin_district,
        region: d.region || d.country,
        postcode: d.postcode,
        country: "United Kingdom",
        countryCode: "GB",
        latitude: lat,
        longitude: lon,
      };
    }
  }
  // Worldwide fallback via BigDataCloud (free, no key)
  try {
    const r2 = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    if (r2.ok) {
      const j = await r2.json();
      return {
        name: j.city || j.locality || j.principalSubdivision || "Current location",
        region: j.principalSubdivision,
        country: j.countryName,
        countryCode: j.countryCode,
        latitude: lat,
        longitude: lon,
      };
    }
  } catch { /* ignore */ }
  return { name: "Current location", latitude: lat, longitude: lon };
}

// ---------- Weather ----------

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", [
    "temperature_2m", "apparent_temperature", "is_day", "precipitation",
    "rain", "weather_code", "wind_speed_10m", "wind_gusts_10m", "relative_humidity_2m",
    "cloud_cover", "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high", "visibility"
  ].join(","));
  url.searchParams.set("hourly", [
    "temperature_2m", "apparent_temperature", "precipitation_probability", "weather_code", "cloud_cover"
  ].join(","));
  url.searchParams.set("daily", [
    "temperature_2m_max", "temperature_2m_min", "precipitation_probability_max",
    "precipitation_sum", "uv_index_max", "weather_code",
    "wind_speed_10m_max", "sunrise", "sunset"
  ].join(","));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("forecast_days", "7");

  const r = await fetch(url.toString());
  if (!r.ok) throw new Error("Weather fetch failed");
  const j = await r.json();

  const c = j.current;
  const d = j.daily;
  const hourly = j.hourly;

  // Find current hour index in hourly
  const nowMs = Date.now();
  let startIdx = 0;
  for (let i = 0; i < hourly.time.length; i++) {
    if (new Date(hourly.time[i]).getTime() >= nowMs - 30 * 60 * 1000) { startIdx = i; break; }
  }

  const next: WeatherHour[] = [];
  for (let i = startIdx; i < Math.min(hourly.time.length, startIdx + 12); i++) {
    next.push({
      time: hourly.time[i],
      temp: hourly.temperature_2m[i],
      feelsLike: hourly.apparent_temperature[i],
      precipProb: hourly.precipitation_probability[i] ?? 0,
      weatherCode: hourly.weather_code[i],
      cloudCover: hourly.cloud_cover?.[i] ?? 0,
    });
  }

  const info = describeWeather(c.weather_code, !!c.is_day);

  const days: WeatherDay[] = [];
  for (let i = 0; i < d.time.length; i++) {
    days.push({
      date: d.time[i],
      high: d.temperature_2m_max[i],
      low: d.temperature_2m_min[i],
      precipProb: d.precipitation_probability_max[i] ?? 0,
      precipSum: d.precipitation_sum[i] ?? 0,
      weatherCode: d.weather_code[i],
      uvIndexMax: d.uv_index_max[i] ?? 0,
      windMax: d.wind_speed_10m_max?.[i] ?? 0,
      sunrise: d.sunrise?.[i],
      sunset: d.sunset?.[i],
    });
  }

  return {
    temp: c.temperature_2m,
    feelsLike: c.apparent_temperature,
    high: d.temperature_2m_max[0],
    low: d.temperature_2m_min[0],
    precipProb: d.precipitation_probability_max[0] ?? 0,
    rainTotal: d.precipitation_sum[0] ?? 0,
    windSpeed: c.wind_speed_10m,
    windGust: c.wind_gusts_10m,
    uvIndex: d.uv_index_max[0] ?? 0,
    humidity: c.relative_humidity_2m,
    weatherCode: c.weather_code,
    conditions: info.label,
    isDay: !!c.is_day,
    cloudCover: c.cloud_cover ?? 0,
    cloudLow: c.cloud_cover_low ?? 0,
    cloudMid: c.cloud_cover_mid ?? 0,
    cloudHigh: c.cloud_cover_high ?? 0,
    visibility: c.visibility,
    hourly: next,
    daily: days,
    timezone: j.timezone || "auto",
    alerts: deriveAlerts(c, d, hourly),
    latitude: lat,
    longitude: lon,
  };
}

function deriveAlerts(
  c: { wind_gusts_10m: number; temperature_2m: number },
  d: { precipitation_sum: number[]; weather_code: number[]; temperature_2m_max: number[] },
  hourly: { weather_code: number[] }
): WeatherData["alerts"] {
  const out: WeatherData["alerts"] = [];
  if (c.wind_gusts_10m >= 60) {
    out.push({
      id: "wind",
      title: c.wind_gusts_10m >= 80 ? "Severe Wind Warning" : "Wind Warning",
      severity: c.wind_gusts_10m >= 80 ? "amber" : "yellow",
      description: `Gusts up to ${Math.round(c.wind_gusts_10m)} mph expected. Travel disruption likely.`,
    });
  }
  if ((d.precipitation_sum[0] ?? 0) >= 25) {
    out.push({
      id: "rain",
      title: "Heavy Rain Warning",
      severity: (d.precipitation_sum[0] ?? 0) >= 50 ? "amber" : "yellow",
      description: `${Math.round(d.precipitation_sum[0])} mm of rain forecast — flooding possible in low-lying areas.`,
    });
  }
  if (hourly.weather_code.slice(0, 24).some(code => code >= 71 && code <= 86)) {
    out.push({
      id: "snow",
      title: "Snow & Ice Warning",
      severity: "yellow",
      description: "Snowfall expected within the next 24 hours.",
    });
  }
  if ((d.temperature_2m_max[0] ?? 0) >= 30) {
    out.push({
      id: "heat",
      title: "Heat-Health Alert",
      severity: (d.temperature_2m_max[0] ?? 0) >= 35 ? "amber" : "yellow",
      description: `Temperatures reaching ${Math.round(d.temperature_2m_max[0])}°C. Stay hydrated.`,
    });
  }
  return out;
}

// ---------- Pollen (Open-Meteo air-quality endpoint) ----------

const POLLEN_KEYS = [
  "alder_pollen", "birch_pollen", "grass_pollen",
  "mugwort_pollen", "olive_pollen", "ragweed_pollen"
] as const;

const SPECIES_LABELS: Record<keyof PollenBreakdown, string> = {
  alder: "Alder", birch: "Birch", grass: "Grass",
  mugwort: "Mugwort", olive: "Olive", ragweed: "Ragweed",
};

export async function fetchPollenAndAqi(lat: number, lon: number): Promise<{ pollen: PollenData; aqi: AqiData }> {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", [
    "european_aqi", "pm10", "pm2_5", "nitrogen_dioxide", "ozone", ...POLLEN_KEYS
  ].join(","));
  url.searchParams.set("timezone", "Europe/London");

  const r = await fetch(url.toString());
  if (!r.ok) throw new Error("Air quality fetch failed");
  const j = await r.json();
  const c = j.current ?? {};

  const breakdown: PollenBreakdown = {
    alder: c.alder_pollen ?? 0,
    birch: c.birch_pollen ?? 0,
    grass: c.grass_pollen ?? 0,
    mugwort: c.mugwort_pollen ?? 0,
    olive: c.olive_pollen ?? 0,
    ragweed: c.ragweed_pollen ?? 0,
  };
  const total = Object.values(breakdown).reduce((a, b) => a + (b ?? 0), 0);
  const dominantKey = (Object.keys(breakdown) as (keyof PollenBreakdown)[])
    .reduce((a, b) => (breakdown[a] >= breakdown[b] ? a : b));
  const pollen: PollenData = {
    total,
    level: pollenSeverity(total),
    breakdown,
    dominantSpecies: SPECIES_LABELS[dominantKey],
  };

  const aqiIndex = c.european_aqi ?? 0;
  const pollutants: { key: string; label: string; value: number }[] = [
    { key: "pm25", label: "PM2.5", value: c.pm2_5 ?? 0 },
    { key: "pm10", label: "PM10", value: c.pm10 ?? 0 },
    { key: "no2", label: "NO₂", value: c.nitrogen_dioxide ?? 0 },
    { key: "o3", label: "O₃", value: c.ozone ?? 0 },
  ];
  const dominant = pollutants.reduce((a, b) => (a.value >= b.value ? a : b));
  const aqi: AqiData = {
    index: aqiIndex,
    level: aqiSeverity(aqiIndex),
    pm25: c.pm2_5 ?? 0,
    pm10: c.pm10 ?? 0,
    no2: c.nitrogen_dioxide ?? 0,
    o3: c.ozone ?? 0,
    dominantPollutant: dominant.label,
  };

  return { pollen, aqi };
}

// Used for the location used in geolocation
export function makeLocation(g: GeoResult, opts: { id?: string; isAutoDetected?: boolean } = {}): Location {
  return {
    id: opts.id ?? cryptoRandom(),
    name: g.name,
    region: g.region,
    postcode: g.postcode,
    country: g.country,
    countryCode: g.countryCode,
    latitude: g.latitude,
    longitude: g.longitude,
    isAutoDetected: opts.isAutoDetected,
  };
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2, 10);
}