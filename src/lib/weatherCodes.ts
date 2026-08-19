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
  // Sky-only palette: NO greens, NO teals. Only hues that actually appear in
  // the sky — icy white-blues, steel blues, deep night blues, slate greys,
  // pale cream, butter yellow, amber, sunset orange, then molten red.
  type Stop = { t: number; h: number; s: number; lFrom: number; lTo: number };
  const stops: Stop[] = [
    { t: -10, h: 205, s: 22, lFrom: 60, lTo: 78 }, // glacial pale white-blue
    { t:  -8, h: 208, s: 26, lFrom: 55, lTo: 74 },
    { t:  -6, h: 210, s: 32, lFrom: 48, lTo: 68 }, // arctic
    { t:  -4, h: 212, s: 38, lFrom: 42, lTo: 62 },
    { t:  -2, h: 214, s: 44, lFrom: 36, lTo: 55 }, // frosty steel
    { t:   0, h: 216, s: 50, lFrom: 30, lTo: 48 },
    { t:   2, h: 218, s: 54, lFrom: 26, lTo: 42 },
    { t:   4, h: 218, s: 58, lFrom: 22, lTo: 38 },
    { t:   6, h: 218, s: 60, lFrom: 20, lTo: 35 }, // cool deep blue
    { t:   8, h: 216, s: 58, lFrom: 22, lTo: 38 },
    { t:  10, h: 214, s: 55, lFrom: 26, lTo: 44 },
    { t:  12, h: 212, s: 50, lFrom: 32, lTo: 50 }, // crisp sky blue
    { t:  14, h: 210, s: 46, lFrom: 38, lTo: 56 },
    { t:  16, h: 208, s: 42, lFrom: 44, lTo: 62 }, // pleasant pale blue
    { t:  18, h: 205, s: 36, lFrom: 50, lTo: 68 },
    { t:  20, h:  48, s: 28, lFrom: 62, lTo: 78 }, // soft cream (warm white)
    { t:  22, h:  46, s: 42, lFrom: 60, lTo: 76 }, // pale butter
    { t:  24, h:  44, s: 56, lFrom: 56, lTo: 72 }, // butter yellow
    { t:  26, h:  40, s: 68, lFrom: 52, lTo: 68 }, // honey
    { t:  28, h:  34, s: 76, lFrom: 48, lTo: 64 }, // warm amber
    { t:  30, h:  26, s: 82, lFrom: 44, lTo: 60 }, // hot orange
    { t:  34, h:  18, s: 86, lFrom: 38, lTo: 54 }, // deep orange
    { t:  38, h:  10, s: 88, lFrom: 32, lTo: 48 }, // scorching red-orange
    { t:  44, h:   2, s: 90, lFrom: 26, lTo: 42 }, // molten red
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

  if (hum >= 65) {
    const humK = Math.min(1, (hum - 65) / 30);
    if (feelsLike >= 22) {
      let dh = 24 - b.h;
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

  // Safety rail: collapse any hue the sky never actually shows onto the
  // nearest realistic band. Without this, the shorter-arc interpolation from
  // warm hues (~26°) toward rain-blue (~212°) or night-indigo (~232°) can
  // pass right through magenta/purple (~280°) — that's the "30°C + rain
  // looks pink" bug. Skies are blue, white, grey, cream, amber, orange,
  // red, indigo — never teal, never magenta.
  const safeSkyHue = (h: number, warm: boolean): number => {
    h = ((h % 360) + 360) % 360;
    // greens/teals → snap
    if (h > 60 && h < 195) return warm ? 40 : 210;
    // purples/magentas/pinks → snap (anything 245..345)
    if (h > 245 && h < 345) return warm ? 18 : 232;
    return h;
  };
  b.h = safeSkyHue(b.h, feelsLike >= 19);

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

  // Final clamp — sky overlays above can also drag through forbidden hues.
  b.h = safeSkyHue(b.h, feelsLike >= 19);

  const h = Math.round(b.h);
  const s = Math.round(b.s);
  const l1 = Math.round(b.lFrom);
  const l2 = Math.round(b.lTo);
  const from = `hsl(${h} ${s}% ${l1}%)`;
  const to   = `hsl(${h} ${Math.max(18, s - 10)}% ${l2}%)`;
  return { background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)` };
}

/* =====================================================================
 * Sky-only palette — what the sky ACTUALLY looks like out of the window.
 * No temperature input at all: only cloud cover, precipitation and the
 * position of the sun. Used for the Hero so a 30° overcast day looks grey,
 * not molten orange.
 * ===================================================================*/
export type SunPhase = "night" | "dawn" | "morning" | "day" | "golden" | "dusk";

/** Work out where in the day we are from sunrise/sunset timestamps. */
export function sunPhaseOf(nowMs: number, sunriseISO?: string, sunsetISO?: string, isDay = true): SunPhase {
  if (!sunriseISO || !sunsetISO) return isDay ? "day" : "night";
  const sr = new Date(sunriseISO).getTime();
  const ss = new Date(sunsetISO).getTime();
  const hour = 3600_000;
  if (nowMs < sr - hour || nowMs > ss + hour) return "night";
  if (nowMs < sr + hour) return "dawn";
  if (nowMs > ss - hour) return "dusk";
  if (nowMs > ss - 2.5 * hour) return "golden";
  if (nowMs < sr + 3 * hour) return "morning";
  return "day";
}

export interface SkyOnlyMods {
  cloudCover?: number;
  precipMm?: number;
  precipProb?: number;
  phase?: SunPhase;
}

/**
 * Returns a two-stop vertical gradient of real sky colours.
 * Top = upper sky, bottom = horizon.
 */
export function skyOnlyStyle(sky: WeatherInfo["sky"], mods: SkyOnlyMods = {}): React.CSSProperties {
  const cc = Math.max(0, Math.min(100, mods.cloudCover ?? (sky === "clear" ? 5 : 80)));
  const wet = sky === "rain" || sky === "snow" || (mods.precipMm ?? 0) > 0.05;
  const phase: SunPhase = mods.phase ?? (sky === "night" ? "night" : "day");

  // Base clear-sky colours per phase: [topH,topS,topL, botH,botS,botL]
  // Natural daylight atmospheric palette — azure #3B82F6 → #93C5FD by day,
  // slate/silver-blue when overcast, golden-hour amber at dusk, deep
  // midnight indigo (#0F172A → #1E1B4B) at night. No brown, no green.
  const base: Record<SunPhase, number[]> = {
    night:   [222, 47, 11, 244, 47, 20],   // #0F172A → #1E1B4B
    dawn:    [214, 60, 38,  26, 88, 62],
    morning: [217, 88, 58, 213, 94, 78],
    day:     [217, 91, 60, 213, 97, 78],   // #3B82F6 → #93C5FD
    golden:  [214, 70, 52,  25, 95, 60],   // #F97316 horizon
    dusk:    [258, 45, 30,  22, 92, 52],
  };
  let [th, ts, tl, bh, bs, bl] = base[phase];

  // Cloud cover greys the sky out, pulling both stops toward slate.
  const k = Math.max(0, Math.min(1, (cc - 15) / 75));
  const towards = (v: number, target: number, amt: number) => v + (target - v) * amt;
  const nightish = phase === "night" || phase === "dusk";
  // Overcast target: clean slate/silver-blue #64748B → #94A3B8.
  ts = towards(ts, 16, k * 0.95);
  bs = towards(bs, 16, k * 0.95);
  th = towards(th, 215, k * 0.9);
  bh = towards(bh, 215, k * 0.9);
  tl = towards(tl, nightish ? 14 : 47, k * 0.9);
  bl = towards(bl, nightish ? 20 : 66, k * 0.9);

  if (wet) {
    // Rain: darker, flatter, slightly blue-grey.
    ts = Math.min(ts, 16); bs = Math.min(bs, 18);
    tl = Math.max(nightish ? 8 : 30, tl - 10);
    bl = Math.max(nightish ? 12 : 42, bl - 8);
  }
  if (sky === "snow") {
    ts = 10; bs = 12; th = 210; bh = 210;
    tl = nightish ? 20 : 55; bl = nightish ? 28 : 74;
  }

  // Mid stop keeps the horizon transition believable rather than a flat wash.
  const mh = Math.round((th + bh) / 2);
  const ms = Math.round((ts + bs) / 2);
  const ml = Math.round((tl + bl) / 2);
  const top = `hsl(${Math.round(th)} ${Math.round(ts)}% ${Math.round(tl)}%)`;
  const mid = `hsl(${mh} ${ms}% ${ml}%)`;
  const bottom = `hsl(${Math.round(bh)} ${Math.round(bs)}% ${Math.round(bl)}%)`;
  return { background: `linear-gradient(180deg, ${top} 0%, ${mid} 58%, ${bottom} 100%)` };
}

/**
 * Ambient thermal tint for the APP + card bases (never for the live sky
 * inside the hero). Cold → deep blue-slate, mild → neutral navy, hot →
 * dusky ember. Returned as a bare `h s% l%` triple for CSS variables.
 */
export function thermalTint(feelsLike: number): string {
  const t = Math.max(-15, Math.min(45, feelsLike));
  let h: number, s: number, l: number;
  if (t < 0)       { h = 214; s = 42; l = 11; }
  else if (t < 8)  { h = 210; s = 34; l = 11; }
  else if (t < 15) { h = 214; s = 26; l = 10; }
  else if (t < 20) { h = 220; s = 20; l = 10; }
  else if (t < 25) { h = 32;  s = 16; l = 10; }
  else if (t < 30) { h = 26;  s = 26; l = 11; }
  else if (t < 36) { h = 18;  s = 34; l = 11; }
  else             { h = 10;  s = 42; l = 12; }
  return `${h} ${s}% ${l}%`;
}

/**
 * Decide whether text on top of a gradient should be white ("light" ink) or
 * black ("dark" ink). Parses the HSL lightness values out of the CSS string.
 */
export function gradientInk(style: React.CSSProperties | undefined, threshold = 62): "light" | "dark" {
  const css = String((style?.background ?? style?.backgroundImage ?? "") as string);
  const ls = [...css.matchAll(/hsl\(\s*[\d.]+\s+[\d.]+%\s+([\d.]+)%/g)].map(m => Number(m[1]));
  if (!ls.length) return "light";
  const avg = ls.reduce((a, b) => a + b, 0) / ls.length;
  return avg > threshold ? "dark" : "light";
}
/**
 * Scroll-activated canvas tint. Unlike `thermalTint` (a muted ambient wash),
 * this is the vivid, saturated version that fades in once the page is
 * scrolled past the viewport midpoint: crimson heat, icy blues, moody slate
 * for rain, polar white for snow.
 */
export function scrollTint(
  feelsLike: number,
  opts: { weatherCode?: number; precipMm?: number; isDay?: boolean } = {},
): string {
  const code = opts.weatherCode ?? 0;
  const snowy = (code >= 71 && code <= 77) || code === 85 || code === 86;
  const stormy = code >= 95 || (code >= 80 && code <= 82) || (code >= 63 && code <= 67);
  const rainy = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (opts.precipMm ?? 0) > 0.05;

  if (snowy || feelsLike <= -6) return "205 45% 88%";       // polar white / silver-blue
  if (stormy) return "215 32% 20%";                          // deep moody slate
  if (rainy) return "212 30% 26%";                           // wet slate
  const t = Math.max(-15, Math.min(48, feelsLike));
  if (t < 0)       return "202 78% 62%";  // vivid frosty blue
  if (t < 5)       return "200 70% 55%";
  if (t < 10)      return "205 55% 42%";
  if (t < 16)      return "210 42% 32%";
  if (t < 21)      return "214 30% 26%";
  if (t < 25)      return "34 45% 34%";
  if (t < 28)      return "28 62% 38%";
  if (t < 32)      return "18 74% 40%";   // rich thermal red
  if (t < 38)      return "10 82% 38%";
  return "4 88% 34%";                      // scorching crimson
}
