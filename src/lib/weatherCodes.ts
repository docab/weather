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
  // Pick a hue based on temperature: cold -> blue, mild -> teal, warm -> amber/orange
  const warm = feelsLike >= 22;
  const mild = feelsLike >= 12 && feelsLike < 22;
  const cold = feelsLike < 6;

  let from = "hsl(220 40% 14%)";
  let to   = "hsl(215 30% 22%)";

  switch (sky) {
    case "clear":
      if (warm)      { from = "hsl(28 75% 18%)";  to = "hsl(14 80% 30%)"; }
      else if (mild) { from = "hsl(205 65% 16%)"; to = "hsl(190 55% 26%)"; }
      else if (cold) { from = "hsl(220 70% 12%)"; to = "hsl(210 60% 22%)"; }
      else           { from = "hsl(215 60% 14%)"; to = "hsl(200 55% 24%)"; }
      break;
    case "cloudy":
      from = "hsl(215 18% 18%)"; to = "hsl(220 14% 26%)";
      break;
    case "rain":
      from = "hsl(210 38% 14%)"; to = "hsl(218 28% 24%)";
      break;
    case "snow":
      from = "hsl(208 30% 24%)"; to = "hsl(218 22% 34%)";
      break;
    case "night":
      from = "hsl(232 50% 8%)";  to = "hsl(240 40% 16%)";
      break;
  }
  return {
    background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)`,
  };
}