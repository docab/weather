// WMO weather interpretation codes used by Open-Meteo
import {
  Sun, Moon, CloudSun, CloudMoon, Cloud, Cloudy, CloudFog,
  CloudDrizzle, CloudRain, CloudRainWind, CloudSnow, Snowflake,
  CloudLightning, type LucideIcon,
} from "lucide-react";

export interface WeatherInfo {
  label: string;
  short: string;
  sky: "clear" | "cloudy" | "rain" | "snow" | "night";
  icon: string; // emoji fallback
  Icon: LucideIcon;
}

export function describeWeather(code: number, isDay: boolean): WeatherInfo {
  const night = !isDay;
  const map: Record<number, WeatherInfo> = {
    0:  { label: "Clear sky",      short: "Clear",         sky: night ? "night" : "clear",  icon: night ? "🌙" : "☀️", Icon: night ? Moon : Sun },
    1:  { label: "Mainly clear",   short: "Mainly clear",  sky: night ? "night" : "clear",  icon: night ? "🌙" : "🌤️", Icon: night ? CloudMoon : CloudSun },
    2:  { label: "Partly cloudy",  short: "Partly cloudy", sky: "cloudy",                   icon: "⛅",                 Icon: night ? CloudMoon : CloudSun },
    3:  { label: "Overcast",       short: "Overcast",      sky: "cloudy",                   icon: "☁️",                 Icon: Cloudy },
    45: { label: "Fog",            short: "Foggy",         sky: "cloudy",                   icon: "🌫️",                Icon: CloudFog },
    48: { label: "Freezing fog",   short: "Freezing fog",  sky: "cloudy",                   icon: "🌫️",                Icon: CloudFog },
    51: { label: "Light drizzle",  short: "Drizzle",       sky: "rain",                     icon: "🌦️",                Icon: CloudDrizzle },
    53: { label: "Drizzle",        short: "Drizzle",       sky: "rain",                     icon: "🌦️",                Icon: CloudDrizzle },
    55: { label: "Heavy drizzle",  short: "Heavy drizzle", sky: "rain",                     icon: "🌧️",                Icon: CloudRain },
    61: { label: "Light rain",     short: "Light rain",    sky: "rain",                     icon: "🌦️",                Icon: CloudRain },
    63: { label: "Rain",           short: "Rain",          sky: "rain",                     icon: "🌧️",                Icon: CloudRain },
    65: { label: "Heavy rain",     short: "Heavy rain",    sky: "rain",                     icon: "🌧️",                Icon: CloudRainWind },
    66: { label: "Freezing rain",  short: "Freezing rain", sky: "rain",                     icon: "🌧️",                Icon: CloudRainWind },
    67: { label: "Heavy freezing rain", short: "Freezing rain", sky: "rain",                icon: "🌧️",                Icon: CloudRainWind },
    71: { label: "Light snow",     short: "Light snow",    sky: "snow",                     icon: "🌨️",                Icon: CloudSnow },
    73: { label: "Snow",           short: "Snow",          sky: "snow",                     icon: "❄️",                 Icon: CloudSnow },
    75: { label: "Heavy snow",     short: "Heavy snow",    sky: "snow",                     icon: "❄️",                 Icon: Snowflake },
    77: { label: "Snow grains",    short: "Snow grains",   sky: "snow",                     icon: "❄️",                 Icon: Snowflake },
    80: { label: "Light showers",  short: "Showers",       sky: "rain",                     icon: "🌦️",                Icon: CloudRain },
    81: { label: "Showers",        short: "Showers",       sky: "rain",                     icon: "🌧️",                Icon: CloudRain },
    82: { label: "Heavy showers",  short: "Heavy showers", sky: "rain",                     icon: "⛈️",                Icon: CloudRainWind },
    85: { label: "Snow showers",   short: "Snow showers",  sky: "snow",                     icon: "🌨️",                Icon: CloudSnow },
    86: { label: "Heavy snow showers", short: "Snow showers", sky: "snow",                  icon: "❄️",                 Icon: Snowflake },
    95: { label: "Thunderstorm",   short: "Storms",        sky: "rain",                     icon: "⛈️",                Icon: CloudLightning },
    96: { label: "Storm with hail",short: "Storms",        sky: "rain",                     icon: "⛈️",                Icon: CloudLightning },
    99: { label: "Severe storm",   short: "Severe storms", sky: "rain",                     icon: "⛈️",                Icon: CloudLightning },
  };
  return map[code] ?? { label: "Unknown", short: "—", sky: "cloudy", icon: "🌡️", Icon: Cloud };
}

export function skyClass(sky: WeatherInfo["sky"]): string {
  switch (sky) {
    case "clear": return "sky-clear";
    case "cloudy": return "sky-cloudy";
    case "rain": return "sky-rain";
    case "snow": return "sky-snow";
    case "night": return "sky-night";
  }
}

/**
 * Optional environmental modifiers that nudge the temperature-driven palette.
 * All optional — omit and you get a pure temp-based gradient.
 */
export interface SkyModifiers {
  windSpeed?: number;   // mph
  humidity?: number;    // %
  cloudCover?: number;  // %
  uvIndex?: number;     // 0–11+
  isDay?: boolean;
}

/**
 * Build a dynamic gradient driven by feels-like temperature AND live
 * environmental modifiers (wind, humidity, cloud cover, UV). The hue is
 * interpolated continuously across 24 reference bands (every ~2°C) so two
 * places one degree apart still read differently. The sky category provides
 * the broad overlay (rain pulls cool, snow whitens, night darkens) while the
 * modifiers fine-tune saturation, lightness and a small hue drift so a windy
 * 18° feels cooler than a still 18°, and a muggy 28° feels heavier than a
 * dry 28°.
 */
export function dynamicSkyStyle(
  sky: WeatherInfo["sky"],
  feelsLike: number,
  mods: SkyModifiers = {}
): React.CSSProperties {
  // 24 reference stops covering −10°C → 44°C in 2° steps. Each stop is a
  // {hue, saturation, lightness range}. Values between stops are linearly
  // interpolated so the palette flows smoothly rather than jumping at bands.
  type Stop = { t: number; h: number; s: number; lFrom: number; lTo: number };
  const stops: Stop[] = [
    { t: -10, h: 195, s: 30, lFrom: 38, lTo: 52 }, // glacial white-blue
    { t:  -8, h: 198, s: 34, lFrom: 36, lTo: 50 },
    { t:  -6, h: 202, s: 38, lFrom: 33, lTo: 47 }, // arctic
    { t:  -4, h: 206, s: 42, lFrom: 30, lTo: 44 },
    { t:  -2, h: 210, s: 45, lFrom: 27, lTo: 40 }, // frosty
    { t:   0, h: 212, s: 48, lFrom: 24, lTo: 37 },
    { t:   2, h: 214, s: 52, lFrom: 22, lTo: 34 }, // freezing edge
    { t:   4, h: 215, s: 56, lFrom: 20, lTo: 32 },
    { t:   6, h: 216, s: 60, lFrom: 18, lTo: 30 }, // cool deep blue
    { t:   8, h: 210, s: 58, lFrom: 17, lTo: 29 },
    { t:  10, h: 200, s: 54, lFrom: 17, lTo: 28 }, // cool→mild transition
    { t:  12, h: 190, s: 50, lFrom: 17, lTo: 27 },
    { t:  14, h: 180, s: 46, lFrom: 17, lTo: 26 }, // mild teal
    { t:  16, h: 168, s: 42, lFrom: 17, lTo: 26 },
    { t:  18, h: 150, s: 38, lFrom: 17, lTo: 26 }, // pleasant sea-green
    { t:  20, h: 120, s: 36, lFrom: 18, lTo: 27 },
    { t:  22, h:  85, s: 42, lFrom: 19, lTo: 28 }, // soft warm green
    { t:  24, h:  55, s: 52, lFrom: 19, lTo: 29 }, // honey
    { t:  26, h:  42, s: 62, lFrom: 19, lTo: 30 }, // warm amber
    { t:  28, h:  32, s: 70, lFrom: 19, lTo: 31 },
    { t:  30, h:  24, s: 75, lFrom: 19, lTo: 32 }, // hot orange
    { t:  34, h:  16, s: 80, lFrom: 20, lTo: 33 },
    { t:  38, h:  10, s: 84, lFrom: 21, lTo: 35 }, // scorching
    { t:  44, h:   4, s: 88, lFrom: 22, lTo: 38 }, // furnace red
  ];

  const interp = (t: number): { h: number; s: number; lFrom: number; lTo: number } => {
    if (t <= stops[0].t) return stops[0];
    if (t >= stops[stops.length - 1].t) return stops[stops.length - 1];
    let i = 0;
    while (stops[i + 1].t < t) i++;
    const a = stops[i], b = stops[i + 1];
    const k = (t - a.t) / (b.t - a.t);
    // Hue interpolated along the shorter arc on the 0–360 wheel.
    let dh = b.h - a.h;
    if (dh > 180) dh -= 360;
    if (dh < -180) dh += 360;
    const h = (a.h + dh * k + 360) % 360;
    return {
      h,
      s: a.s + (b.s - a.s) * k,
      lFrom: a.lFrom + (b.lFrom - a.lFrom) * k,
      lTo: a.lTo + (b.lTo - a.lTo) * k,
    };
  };

  let b = interp(feelsLike);

  const wind = mods.windSpeed ?? 0;
  const hum = mods.humidity ?? 50;
  const cc = mods.cloudCover ?? (sky === "cloudy" ? 80 : sky === "rain" || sky === "snow" ? 95 : 10);
  const uv = mods.uvIndex ?? 0;

  // --- Modifier 1: cloud cover (graded). Every 10% above 20% desaturates
  // a little and lightens, regardless of sky category.
  const cloudK = Math.max(0, Math.min(1, (cc - 20) / 80));
  b.s = Math.max(12, b.s - cloudK * 38);
  b.lFrom += cloudK * 3;
  b.lTo += cloudK * 3;

  // --- Modifier 2: wind. Cool/cold wind drags hue toward steel blue and
  // desaturates ("windchill" tint). Warm wind only desaturates slightly.
  if (wind > 8) {
    const windK = Math.min(1, (wind - 8) / 30); // 0..1 between 8 and 38 mph
    const cool = feelsLike < 18 ? 1 : 0.25;
    // Drift hue toward 215 (steel blue) proportional to windK * cool.
    let dh = 215 - b.h;
    if (dh > 180) dh -= 360;
    if (dh < -180) dh += 360;
    b.h = (b.h + dh * windK * cool * 0.35 + 360) % 360;
    b.s = Math.max(14, b.s - windK * 12);
    if (feelsLike < 18) {
      b.lFrom = Math.max(10, b.lFrom - windK * 3);
      b.lTo = Math.max(18, b.lTo - windK * 2);
    }
  }

  // --- Modifier 3: humidity.
  // Warm + humid → muggier, deeper amber (shift hue slightly toward 30,
  // bump saturation, drop lightness — feels heavy).
  // Cold + humid → bluer, damper (shift toward 205, drop lightness).
  if (hum >= 65) {
    const humK = Math.min(1, (hum - 65) / 30);
    if (feelsLike >= 22) {
      let dh = 30 - b.h;
      if (dh > 180) dh -= 360;
      if (dh < -180) dh += 360;
      b.h = (b.h + dh * humK * 0.25 + 360) % 360;
      b.s = Math.min(92, b.s + humK * 8);
      b.lFrom = Math.max(14, b.lFrom - humK * 3);
      b.lTo = Math.max(22, b.lTo - humK * 2);
    } else if (feelsLike < 12) {
      let dh = 205 - b.h;
      if (dh > 180) dh -= 360;
      if (dh < -180) dh += 360;
      b.h = (b.h + dh * humK * 0.3 + 360) % 360;
      b.lFrom = Math.max(10, b.lFrom - humK * 2);
    }
  }

  // --- Modifier 4: UV / sun intensity. Bright clear days pop harder.
  if (sky === "clear" && mods.isDay !== false && uv > 0) {
    const uvK = Math.min(1, uv / 9);
    b.s = Math.min(95, b.s + uvK * 14);
    b.lFrom += uvK * 4;
    b.lTo += uvK * 5;
  }

  // --- Sky category overlays (broad strokes).
  switch (sky) {
    case "rain": {
      // Drag toward cool blue, desaturate, slight darken.
      let dh = 212 - b.h;
      if (dh > 180) dh -= 360;
      if (dh < -180) dh += 360;
      b.h = (b.h + dh * 0.55 + 360) % 360;
      b.s = Math.max(20, b.s - 18);
      b.lFrom = Math.max(10, b.lFrom - 2);
      break;
    }
    case "snow": {
      // Pale, icy, neutral lightness regardless of temp.
      let dh = 210 - b.h;
      if (dh > 180) dh -= 360;
      if (dh < -180) dh += 360;
      b.h = (b.h + dh * 0.7 + 360) % 360;
      b.s = Math.min(b.s, 28);
      b.lFrom = 28; b.lTo = 40;
      break;
    }
    case "night": {
      // Pull toward indigo, darken, retain whisper of temp hue.
      let dh = 232 - b.h;
      if (dh > 180) dh -= 360;
      if (dh < -180) dh += 360;
      b.h = (b.h + dh * 0.7 + 360) % 360;
      b.s = Math.max(26, Math.min(b.s, 55));
      b.lFrom = 8; b.lTo = 16;
      break;
    }
    case "clear":
    case "cloudy":
    default:
      break;
  }

  const h = Math.round(b.h);
  const s = Math.round(b.s);
  const l1 = Math.round(b.lFrom);
  const l2 = Math.round(b.lTo);
  const from = `hsl(${h} ${s}% ${l1}%)`;
  const to   = `hsl(${h} ${Math.max(18, s - 10)}% ${l2}%)`;
  return { background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)` };
}