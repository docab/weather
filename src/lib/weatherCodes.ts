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
 * Build a richer dynamic gradient driven by the sky AND temperature.
 * Returns an inline `style` object so it can be applied to any element.
 */
export function dynamicSkyStyle(
  sky: WeatherInfo["sky"],
  feelsLike: number
): React.CSSProperties {
  // Temperature-first palette. The "feels like" reading drives the hue so a
  // pleasant 18° sunny day never looks like a 35° scorcher. Sky condition only
  // nudges saturation/lightness and overlays (clouds desaturate, rain cools,
  // snow lightens, night darkens).
  //
  // Bands (°C feels-like):
  //   < -5  arctic        — icy white-blue
  //   -5–4  frosty        — pale steel blue
  //   4–10  cool          — deep ocean blue
  //   10–16 mild          — teal / sea-green
  //   16–22 pleasant      — soft warm green / honey
  //   22–28 warm          — amber
  //   28–34 hot           — deep orange
  //   > 34  scorching     — molten red
  type Band = { h: number; s: number; lFrom: number; lTo: number };
  const bandFor = (t: number): Band => {
    if (t < -5)  return { h: 200, s: 40, lFrom: 32, lTo: 46 }; // arctic
    if (t < 4)   return { h: 210, s: 45, lFrom: 24, lTo: 36 }; // frosty
    if (t < 10)  return { h: 215, s: 60, lFrom: 16, lTo: 28 }; // cool
    if (t < 16)  return { h: 185, s: 50, lFrom: 16, lTo: 26 }; // mild
    if (t < 22)  return { h: 150, s: 38, lFrom: 16, lTo: 26 }; // pleasant
    if (t < 28)  return { h: 35,  s: 70, lFrom: 18, lTo: 30 }; // warm
    if (t < 34)  return { h: 18,  s: 78, lFrom: 18, lTo: 32 }; // hot
    return        { h: 6,   s: 85, lFrom: 20, lTo: 36 };       // scorching
  };

  let b = bandFor(feelsLike);

  // Sky modifiers — preserve hue, modulate saturation / lightness.
  switch (sky) {
    case "cloudy":
      b = { ...b, s: Math.max(14, b.s - 35), lFrom: b.lFrom + 2, lTo: b.lTo + 2 };
      break;
    case "rain":
      // Drag toward cool blue and desaturate.
      b = { h: Math.round((b.h * 0.4) + (212 * 0.6)), s: Math.max(22, b.s - 20), lFrom: b.lFrom - 2, lTo: b.lTo };
      break;
    case "snow":
      b = { h: 210, s: 25, lFrom: 26, lTo: 38 };
      break;
    case "night":
      // Night always darkens and pulls toward indigo, but keeps a whisper of
      // the temperature hue so a hot night still feels warmer than a cold one.
      b = { h: Math.round((b.h * 0.25) + (232 * 0.75)), s: Math.max(28, b.s - 20), lFrom: 8, lTo: 16 };
      break;
    case "clear":
    default:
      break;
  }

  const from = `hsl(${b.h} ${b.s}% ${b.lFrom}%)`;
  const to   = `hsl(${b.h} ${Math.max(20, b.s - 10)}% ${b.lTo}%)`;
  return { background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)` };
}