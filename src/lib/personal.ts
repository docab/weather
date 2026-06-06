import type { WeatherData, WeatherHour } from "./types";

export type ActivityKey = "run" | "cycle" | "walk" | "garden" | "photo" | "dining";
export type CommuteMode = "drive" | "cycle" | "walk" | "transit";

export interface PersonalPrefs {
  name?: string;
  activities: ActivityKey[];
  commuteMode: CommuteMode;
  /** "HH:MM" 24h local */
  commuteOut: string;
  commuteBack: string;
  /** -3..+3 — negative = runs cold, positive = runs hot */
  tempSensitivity: number;
  /** mph — won't go out above this */
  windTolerance: number;
  /** % chance — flagged as risky above this */
  rainTolerance: number;
}

const KEY = "pw.personal.v1";
export const defaultPersonalPrefs: PersonalPrefs = {
  activities: ["walk", "run"],
  commuteMode: "walk",
  commuteOut: "08:30",
  commuteBack: "17:30",
  tempSensitivity: 0,
  windTolerance: 25,
  rainTolerance: 40,
};

export function loadPersonalPrefs(): PersonalPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultPersonalPrefs;
    return { ...defaultPersonalPrefs, ...JSON.parse(raw) };
  } catch { return defaultPersonalPrefs; }
}
export function savePersonalPrefs(p: PersonalPrefs) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export const ACTIVITY_LABEL: Record<ActivityKey, string> = {
  run: "Running", cycle: "Cycling", walk: "Walking",
  garden: "Gardening", photo: "Photography", dining: "Outdoor dining",
};
export const ACTIVITY_ICON: Record<ActivityKey, string> = {
  run: "🏃", cycle: "🚴", walk: "🚶", garden: "🌱", photo: "📷", dining: "🍷",
};

/** Ideal temperature window per activity, before personal offset. */
const IDEAL: Record<ActivityKey, [number, number]> = {
  run: [6, 16], cycle: [10, 22], walk: [8, 22],
  garden: [12, 24], photo: [4, 26], dining: [16, 26],
};
const RAIN_PENALTY: Record<ActivityKey, number> = {
  run: 1.0, cycle: 1.2, walk: 0.7, garden: 1.0, photo: 0.4, dining: 1.6,
};
const WIND_PENALTY: Record<ActivityKey, number> = {
  run: 0.7, cycle: 1.6, walk: 0.5, garden: 0.6, photo: 0.4, dining: 1.3,
};

function tempScore(t: number, ideal: [number, number], sens: number): number {
  const [lo, hi] = [ideal[0] + sens, ideal[1] + sens];
  if (t >= lo && t <= hi) return 100;
  const dist = t < lo ? lo - t : t - hi;
  return Math.max(0, 100 - dist * 8);
}

export interface HourlyScore { time: string; score: number; }
export interface ActivityResult {
  key: ActivityKey;
  scoreNow: number;
  best: HourlyScore | null;
  hourly: HourlyScore[];
  verdict: string;
}

export function scoreActivity(
  act: ActivityKey, weather: WeatherData, prefs: PersonalPrefs,
): ActivityResult {
  const hourly = weather.hourly.map((h: WeatherHour): HourlyScore => {
    const t = tempScore(h.feelsLike, IDEAL[act], prefs.tempSensitivity);
    const rainPen = (h.precipProb / 100) * 60 * RAIN_PENALTY[act];
    // We don't have hourly wind from Open-Meteo here, so use current wind.
    const wind = weather.windSpeed;
    const windPen = Math.max(0, wind - prefs.windTolerance) * WIND_PENALTY[act];
    const score = Math.round(Math.max(0, Math.min(100, t - rainPen - windPen)));
    return { time: h.time, score };
  });
  const scoreNow = hourly[0]?.score ?? 0;
  const best = hourly.reduce<HourlyScore | null>((acc, h) =>
    !acc || h.score > acc.score ? h : acc, null);
  return { key: act, scoreNow, best, hourly, verdict: verdictFor(act, scoreNow, weather) };
}

function verdictFor(act: ActivityKey, s: number, w: WeatherData): string {
  if (s >= 80) return `Cracking conditions for ${ACTIVITY_LABEL[act].toLowerCase()} right now.`;
  if (s >= 60) return `Decent — just keep an eye on ${w.precipProb >= 40 ? "the rain" : w.windSpeed >= 20 ? "the wind" : "the temperature"}.`;
  if (s >= 40) return `Doable but a bit grim. Wait for a better window if you can.`;
  return `Best to stay in or pick another time.`;
}

export interface CommuteRisk {
  label: string;
  level: "ok" | "watch" | "warn";
  detail: string;
  hour: WeatherHour | null;
}

export function commuteRiskAt(
  hhmm: string, weather: WeatherData, prefs: PersonalPrefs,
): CommuteRisk {
  const [h, m] = hhmm.split(":").map(Number);
  const target = new Date(); target.setHours(h, m, 0, 0);
  if (target.getTime() < Date.now() - 30 * 60_000) target.setDate(target.getDate() + 1);
  const closest = weather.hourly.reduce<WeatherHour | null>((acc, x) => {
    if (!acc) return x;
    const da = Math.abs(new Date(acc.time).getTime() - target.getTime());
    const db = Math.abs(new Date(x.time).getTime() - target.getTime());
    return db < da ? x : acc;
  }, null);
  if (!closest) return { label: "No data", level: "ok", detail: "—", hour: null };

  const rain = closest.precipProb;
  const wind = weather.windSpeed;
  const t = closest.feelsLike;
  const isCold = t < 4, isHot = t > 28;
  const mode = prefs.commuteMode;

  const flags: string[] = [];
  if (rain >= prefs.rainTolerance) flags.push(`${Math.round(rain)}% rain`);
  if (wind >= prefs.windTolerance) flags.push(`${Math.round(wind)} mph wind`);
  if (isCold) flags.push(`feels ${Math.round(t)}°`);
  if (isHot) flags.push(`hot at ${Math.round(t)}°`);

  let level: CommuteRisk["level"] = "ok";
  if (flags.length >= 2 || rain >= 70 || wind >= 35) level = "warn";
  else if (flags.length === 1) level = "watch";

  const modeLabel: Record<CommuteMode, string> = {
    drive: "drive", cycle: "ride", walk: "walk", transit: "trip",
  };
  const detail = flags.length
    ? `Watch out on your ${modeLabel[mode]}: ${flags.join(" · ")}`
    : `Smooth ${modeLabel[mode]} — nothing to flag.`;
  return {
    label: target.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    level, detail, hour: closest,
  };
}