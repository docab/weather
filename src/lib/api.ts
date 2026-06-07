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
  neighbourhood?: string;
  district?: string;
  localityPath?: string[];
}

const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const PARTIAL_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?$/i;

// postcodes.io sometimes returns the literal "unparished" or
// "<area>, unparished area" when no civil parish exists. Filter those out.
function cleanParish(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s) return undefined;
  if (/unparished/i.test(s)) return undefined;
  return s;
}
function cleanName(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s || /unparished/i.test(s)) return undefined;
  return s;
}

export async function geocodePlace(query: string): Promise<GeoResult[]> {
  const q = query.trim();
  if (!q) return [];

  // UK postcode niceties (still useful when input matches)
  if (POSTCODE_RE.test(q)) {
    const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(q.replace(/\s+/g, ""))}`);
    if (r.ok) {
      const j = await r.json();
      const d = j.result;
      const ward = cleanName(d.admin_ward);
      const parish = cleanParish(d.parish);
      const district = cleanName(d.admin_district);
      const path = [district, parish, ward].filter(Boolean) as string[];
      return [{
        name: ward || parish || district || "Unknown",
        neighbourhood: parish,
        district,
        localityPath: path,
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

  // Primary: Nominatim — returns hyperlocal matches worldwide
  // (neighbourhoods, suburbs, roads, blocks) in addition to cities.
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=10&accept-language=en`,
      { headers: { Accept: "application/json" } }
    );
    if (r.ok) {
      const arr = await r.json() as Array<{
        lat: string; lon: string; display_name: string; name?: string;
        address?: Record<string, string>; type?: string; class?: string;
      }>;
      const mapped: GeoResult[] = arr.map(d => {
        const a = d.address ?? {};
        const country = cleanName(a.country);
        const state = cleanName(a.state || a.region);
        const county = cleanName(a.county);
        const city = cleanName(a.city || a.town || a.village || a.municipality || a.hamlet);
        const cityDistrict = cleanName(a.city_district || a.borough || a.district);
        const suburb = cleanName(a.suburb || a.quarter);
        const neighbourhood = cleanName(a.neighbourhood || a.residential || a.allotments);
        const road = cleanName(a.road || a.pedestrian || a.footway);
        const primary = cleanName(d.name) || neighbourhood || suburb || road || cityDistrict || city || county || state || d.display_name.split(",")[0];
        const path = [city || county, cityDistrict, suburb, neighbourhood, road].filter(Boolean) as string[];
        return {
          name: primary!,
          neighbourhood: neighbourhood || suburb,
          district: cityDistrict || county,
          localityPath: path,
          region: state || county,
          postcode: a.postcode,
          country,
          countryCode: a.country_code ? String(a.country_code).toUpperCase() : undefined,
          latitude: parseFloat(d.lat),
          longitude: parseFloat(d.lon),
        };
      });
      if (mapped.length) return mapped;
    }
  } catch { /* fall through */ }

  // Fallback: Open-Meteo geocoding (city/town level only)
  const r = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=en&format=json`
  );
  if (!r.ok) return [];
  const j = await r.json();
  return (j.results || [])
    .slice(0, 10)
    .map((d: { name: string; admin1?: string; admin2?: string; country?: string; country_code?: string; latitude: number; longitude: number }) => ({
      name: d.name,
      region: d.admin2 || d.admin1,
      country: d.country,
      countryCode: d.country_code,
      latitude: d.latitude,
      longitude: d.longitude,
    }));
}

// Backwards-compat alias
export const geocodeUK = geocodePlace;

export async function reverseGeocode(lat: number, lon: number): Promise<GeoResult | null> {
  // Primary: OpenStreetMap Nominatim — hyperlocal worldwide (road / neighbourhood / suburb).
  // zoom=18 returns the smallest meaningful locality (down to road/building level).
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=en`,
      { headers: { Accept: "application/json" } }
    );
    if (r.ok) {
      const j = await r.json();
      const a = j.address ?? {};
      const country = cleanName(a.country);
      const state = cleanName(a.state || a.region);
      const county = cleanName(a.county);
      const city = cleanName(a.city || a.town || a.village || a.municipality || a.hamlet);
      const cityDistrict = cleanName(a.city_district || a.borough || a.district);
      const suburb = cleanName(a.suburb || a.quarter);
      const neighbourhood = cleanName(a.neighbourhood || a.residential || a.allotments);
      const road = cleanName(a.road || a.pedestrian || a.footway);
      const path = [city || county, cityDistrict, suburb, neighbourhood, road].filter(Boolean) as string[];
      const name =
        road || neighbourhood || suburb || cityDistrict || city ||
        cleanName(j.name) || county || state || "Current location";
      // Try postcodes.io purely for the UK postcode string (not naming).
      let postcode = a.postcode as string | undefined;
      if (!postcode && a.country_code === "gb") {
        try {
          const p = await fetch(`https://api.postcodes.io/postcodes?lon=${lon}&lat=${lat}&limit=1&radius=1500`);
          if (p.ok) postcode = (await p.json()).result?.[0]?.postcode;
        } catch { /* ignore */ }
      }
      return {
        name,
        neighbourhood: neighbourhood || suburb,
        district: cityDistrict || county,
        localityPath: path,
        region: state || county,
        postcode,
        country,
        countryCode: a.country_code ? String(a.country_code).toUpperCase() : undefined,
        latitude: lat,
        longitude: lon,
      };
    }
  } catch { /* ignore, fall through */ }
  // Fallback: BigDataCloud (coarser, but works without referer concerns)
  try {
    const r2 = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    if (r2.ok) {
      const j = await r2.json();
      const locality = j.locality || j.localityInfo?.administrative?.slice(-1)?.[0]?.name;
      const path = [j.principalSubdivision, j.city, locality].filter(Boolean) as string[];
      return {
        name: locality || j.city || j.principalSubdivision || "Current location",
        region: j.principalSubdivision,
        localityPath: path,
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

  // Open-Meteo sometimes returns thunderstorm codes (95/96/99) for hot,
  // unstable air masses (e.g. summertime Gulf, Sahara) even when the model
  // shows 0% precipitation probability and 0mm rainfall — a "phantom storm".
  // Downgrade those to a realistic dry-sky code so the UI doesn't shout
  // "thunderstorms" over a cloudless desert day.
  const sanitiseCode = (code: number, prob: number, mm = 0, cloud = 0): number => {
    if (code >= 95 && prob < 30 && mm < 0.2) {
      // No moisture backing the storm flag — fall back to cloud cover.
      if (cloud >= 85) return 3;   // overcast
      if (cloud >= 40) return 2;   // partly cloudy
      return 1;                    // mainly clear
    }
    return code;
  };

  // Sanitise hourly + daily codes in place so every consumer (hero, hourly
  // strip, 7-day forecast, smart alerts) sees the cleaned values.
  for (let i = 0; i < hourly.weather_code.length; i++) {
    hourly.weather_code[i] = sanitiseCode(
      hourly.weather_code[i],
      hourly.precipitation_probability?.[i] ?? 0,
      0,
      hourly.cloud_cover?.[i] ?? 0,
    );
  }
  for (let i = 0; i < d.weather_code.length; i++) {
    d.weather_code[i] = sanitiseCode(
      d.weather_code[i],
      d.precipitation_probability_max?.[i] ?? 0,
      d.precipitation_sum?.[i] ?? 0,
    );
  }
  c.weather_code = sanitiseCode(
    c.weather_code,
    hourly.precipitation_probability?.[0] ?? 0,
    Math.max(c.rain ?? 0, c.precipitation ?? 0),
    c.cloud_cover ?? 0,
  );

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

  // Reconcile current vs. current-hour. Open-Meteo's `current` block sometimes
  // reports "overcast" or "partly cloudy" while it's actively raining (the
  // station hasn't logged precip yet but the hourly forecast and the live
  // `rain`/`precipitation` fields both say it's wet). Trust whichever signal
  // is wetter so the hero, animations and hourly strip never disagree.
  const currentHourCode = hourly.weather_code[startIdx] ?? c.weather_code;
  const currentHourProb = hourly.precipitation_probability[startIdx] ?? 0;
  const isWetCode = (code: number) =>
    (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
  const liveRainMm = Math.max(c.rain ?? 0, c.precipitation ?? 0);
  const actuallyRaining = liveRainMm > 0.05;
  // Pick an appropriate wet code if we need to synthesise one.
  const synthRainCode = (mm: number) =>
    mm >= 4 ? 63 : mm >= 1 ? 61 : 51;
  let reconciledCode = c.weather_code;
  if (!isWetCode(c.weather_code)) {
    if (isWetCode(currentHourCode)) {
      reconciledCode = currentHourCode;
    } else if (actuallyRaining) {
      reconciledCode = synthRainCode(liveRainMm);
    } else if (currentHourProb >= 70) {
      reconciledCode = currentHourCode;
    }
  }
  const info = describeWeather(reconciledCode, !!c.is_day);

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
    // Show the chance of rain *right now*, not the daily maximum — and if
    // it's literally raining at this moment force it to 100% so the hero
    // doesn't claim "20% chance" while the user is getting soaked.
    precipProb: actuallyRaining ? Math.max(currentHourProb, 100) : currentHourProb,
    rainTotal: d.precipitation_sum[0] ?? 0,
    windSpeed: c.wind_speed_10m,
    windGust: c.wind_gusts_10m,
    uvIndex: d.uv_index_max[0] ?? 0,
    humidity: c.relative_humidity_2m,
    weatherCode: reconciledCode,
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
  c: { wind_gusts_10m: number; temperature_2m: number; apparent_temperature?: number },
  d: { precipitation_sum: number[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] },
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
  // Snow codes only: 71,73,75,77,85,86 (NOT 80–82 which are rain showers)
  const snowCodes = new Set([71, 73, 75, 77, 85, 86]);
  if (hourly.weather_code.slice(0, 24).some(code => snowCodes.has(code))) {
    out.push({
      id: "snow",
      title: "Snow & Ice Warning",
      severity: "yellow",
      description: "Snowfall expected within the next 24 hours.",
    });
  }
  const maxT = d.temperature_2m_max[0] ?? 0;
  const feels = c.apparent_temperature ?? c.temperature_2m;
  const heatPeak = Math.max(maxT, feels);
  if (heatPeak >= 27) {
    out.push({
      id: "heat",
      title: heatPeak >= 35 ? "Extreme Heat Warning" : heatPeak >= 32 ? "Heat-Health Alert" : "Hot Weather Advisory",
      severity: heatPeak >= 35 ? "red" : heatPeak >= 32 ? "amber" : "yellow",
      description: `Highs around ${Math.round(maxT)}°C${feels > maxT + 1 ? `, feeling like ${Math.round(feels)}°C` : ""}. Stay hydrated, seek shade, avoid midday sun.`,
    });
  }
  // Cold snap (only flag if it's actually cold — guards against tropical climates)
  const minT = d.temperature_2m_min[0] ?? 99;
  if (minT <= -2 || feels <= -5) {
    out.push({
      id: "cold",
      title: minT <= -8 ? "Severe Cold Warning" : "Cold Weather Advisory",
      severity: minT <= -8 ? "amber" : "yellow",
      description: `Lows near ${Math.round(minT)}°C — risk of ice, dress in layers.`,
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
    neighbourhood: g.neighbourhood,
    district: g.district,
    localityPath: g.localityPath,
    isAutoDetected: opts.isAutoDetected,
  };
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2, 10);
}