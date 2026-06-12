import type { WeatherData, WeatherHour } from "./types";

export type ActivityKey = "run" | "cycle" | "walk" | "garden" | "photo" | "dining";
export type CommuteMode = "drive" | "cycle" | "walk" | "transit";
export type HealthFlag = "asthma" | "hayfever" | "migraine" | "arthritis" | "eczema" | "heart" | "pregnancy";
export type HouseholdFlag = "dog" | "kids" | "plants" | "garden" | "car_outside";
export type Units = "metric" | "imperial";

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
  /** Health considerations that should colour advice (asthma → air quality,
   *  migraine → pressure swings, etc.) */
  health: HealthFlag[];
  /** Household setup — surfaces dog-walking windows, plant frost warnings,
   *  windscreen icing tips. */
  household: HouseholdFlag[];
  /** Bedtime in 24h local — used for "tonight" overnight advice. */
  bedtime: string;
  /** Wake time in 24h local — used for the morning briefing window. */
  wakeTime: string;
  /** Display units. The app is metric throughout today, but this is
   *  carried for forward compatibility and to colour any prose. */
  units: Units;
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
  health: [],
  household: [],
  bedtime: "23:00",
  wakeTime: "07:00",
  units: "metric",
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

export const HEALTH_LABEL: Record<HealthFlag, string> = {
  asthma: "Asthma", hayfever: "Hay fever", migraine: "Migraines",
  arthritis: "Joint pain", eczema: "Eczema / dry skin",
  heart: "Heart condition", pregnancy: "Pregnancy",
};
export const HEALTH_ICON: Record<HealthFlag, string> = {
  asthma: "🫁", hayfever: "🤧", migraine: "🤕",
  arthritis: "🦴", eczema: "🧴", heart: "❤️", pregnancy: "🤰",
};

export const HOUSEHOLD_LABEL: Record<HouseholdFlag, string> = {
  dog: "I have a dog",
  kids: "I have young kids",
  plants: "I keep outdoor plants",
  garden: "I do garden / DIY",
  car_outside: "My car parks outside",
};
export const HOUSEHOLD_ICON: Record<HouseholdFlag, string> = {
  dog: "🐕", kids: "👶", plants: "🪴", garden: "🌷", car_outside: "🚗",
};

/** Surface health-aware advice as bite-sized lines tied to *today's*
 *  weather. Pure functions over the WeatherData snapshot — never
 *  generic boiler-plate. */
export function healthAdvice(prefs: PersonalPrefs, weather: WeatherData,
  air: { aqiIndex: number; pollenLevel: string }): string[] {
  const out: string[] = [];
  const w = weather;
  for (const flag of prefs.health) {
    if (flag === "asthma") {
      if (air.aqiIndex >= 50 || w.humidity >= 85) out.push(`Air's heavy (AQI ${air.aqiIndex}, humidity ${Math.round(w.humidity)}%) — keep a reliever inhaler within reach today.`);
      if (w.feelsLike <= 2) out.push(`Cold air can trigger wheeze — scarf over the mouth on the walk out and warm up indoors before exercise.`);
    }
    if (flag === "hayfever") {
      if (["high", "very-high"].includes(air.pollenLevel)) out.push(`Pollen is ${air.pollenLevel} today — antihistamine before you head out, sunglasses to keep it out of your eyes.`);
      if (w.windSpeed >= 18) out.push(`Wind is shaking pollen loose (${Math.round(w.windSpeed)} mph) — shower and change clothes when you get home.`);
    }
    if (flag === "migraine") {
      if (w.uvIndex >= 7 || (w.humidity >= 80 && w.feelsLike >= 24)) out.push(`Bright/humid combo today — known migraine trigger. Hydrate early and keep sunglasses on.`);
    }
    if (flag === "arthritis") {
      if (w.feelsLike <= 6) out.push(`Cold + damp will stiffen joints — extra warm-up time today, and a base layer keeps you moving easier.`);
    }
    if (flag === "eczema") {
      if (w.humidity <= 35) out.push(`Dry air (humidity ${Math.round(w.humidity)}%) — moisturise after washing up and before stepping out.`);
      if (w.feelsLike >= 26) out.push(`Sweat will flare things — loose cotton, frequent rinses.`);
    }
    if (flag === "heart") {
      if (w.feelsLike <= 0 || w.feelsLike >= 30) out.push(`Temperature extremes are hard on the cardiovascular system — pace yourself today and skip the heavy chores.`);
    }
    if (flag === "pregnancy") {
      if (w.feelsLike >= 26) out.push(`Heat hits harder when pregnant — sit in shade for 5 min every half hour, water bottle within reach.`);
      if (w.feelsLike <= 2) out.push(`Slippery cold underfoot — flat soles with grip today, and a hand on the rail.`);
    }
  }
  return out;
}

/** Household-flavoured advice: dog walks, plant frost, car ice etc. */
export function householdAdvice(prefs: PersonalPrefs, weather: WeatherData): string[] {
  const out: string[] = [];
  const w = weather;
  for (const flag of prefs.household) {
    if (flag === "dog") {
      if (w.feelsLike >= 24) out.push(`Pavements get hot — back of hand on the tarmac test. Walk the dog before 9am or after 7pm.`);
      else if (w.feelsLike <= 0) out.push(`Salt and grit irritate paws — wipe down on return, balm if it cracks.`);
      else if (w.precipProb >= 60) out.push(`Plenty of rain coming — towel by the door and a quick towel-down at the porch.`);
    }
    if (flag === "kids") {
      if (w.uvIndex >= 6) out.push(`UV is ${Math.round(w.uvIndex)} — SPF 50 on little ones, hat for the buggy.`);
      if (w.feelsLike <= 4) out.push(`Layer up the kids — hat, gloves and a snack to keep blood sugar up against the chill.`);
    }
    if (flag === "plants") {
      if (w.feelsLike <= 2) out.push(`Bring tender plants indoors or cover with fleece — frost expected.`);
      if (w.windGust >= 35) out.push(`Tie back climbers and move pots away from the edge — gusts to ${Math.round(w.windGust)} mph.`);
    }
    if (flag === "garden") {
      if (w.precipProb >= 60) out.push(`Soil will be saturated — skip the strimmer and lawn mowing today.`);
      if (w.uvIndex >= 7) out.push(`Strong sun for garden work — gloves, hat, water break every 45 min.`);
    }
    if (flag === "car_outside") {
      if (w.feelsLike <= 1) out.push(`Frost expected — add 5 min in the morning for de-icing, or cover the windscreen tonight.`);
      if (w.windGust >= 50) out.push(`Severe gusts — move the car away from trees or large branches if you can.`);
      if (w.feelsLike >= 30) out.push(`Cabin will be furnace-hot — pop the windows the moment you get in, AC on full for 30 sec before driving.`);
    }
  }
  return out;
}

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
  advice?: string;
}

export function commuteRiskAt(
  hhmm: string, weather: WeatherData, prefs: PersonalPrefs,
  kind: "arrive" | "off" = "arrive",
): CommuteRisk {
  const [h, m] = hhmm.split(":").map(Number);
  const target = new Date(); target.setHours(h, m, 0, 0);
  if (target.getTime() < Date.now() - 30 * 60_000) target.setDate(target.getDate() + 1);
  // For "arrive by", inspect the 2h leading up to target. For "off at",
  // inspect the 3h after target so we can suggest follow-on conditions.
  const windowStart = kind === "arrive" ? target.getTime() - 2 * 3600_000 : target.getTime();
  const windowEnd = kind === "arrive" ? target.getTime() : target.getTime() + 3 * 3600_000;
  const window = weather.hourly.filter(x => {
    const t = new Date(x.time).getTime();
    return t >= windowStart - 30 * 60_000 && t <= windowEnd + 30 * 60_000;
  });
  const closest = window.length ? window.reduce((acc, x) => {
    const da = Math.abs(new Date(acc.time).getTime() - target.getTime());
    const db = Math.abs(new Date(x.time).getTime() - target.getTime());
    return db < da ? x : acc;
  }) : null;
  if (!closest) return { label: "No data", level: "ok", detail: "—", hour: null };

  const peakRainHour = window.reduce((a, x) => x.precipProb > a.precipProb ? x : a, window[0]);
  const rain = peakRainHour.precipProb;
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

  const peakTime = new Date(peakRainHour.time).toLocaleTimeString("en-GB",
    { hour: "2-digit", minute: "2-digit", hour12: false });

  let detail: string;
  let advice: string | undefined;
  if (kind === "arrive") {
    detail = flags.length
      ? `Heading in for ${hhmm}: ${flags.join(" · ")} on the ${modeLabel[mode]}.`
      : `Easy ${modeLabel[mode]} in — feels ${Math.round(t)}°, ${Math.round(rain)}% rain peak.`;
    if (rain >= 60) {
      advice = `Heaviest rain hits around ${peakTime} — leave 10–15 min earlier to dodge the worst.`;
    } else if (level === "warn") {
      advice = `Set off a little earlier — conditions get worse closer to ${hhmm}.`;
    }
  } else {
    detail = flags.length
      ? `Off at ${hhmm} into: ${flags.join(" · ")} on the ${modeLabel[mode]} home.`
      : `Off at ${hhmm} — feels ${Math.round(t)}°, ${Math.round(rain)}% rain peak in the hours after.`;
    if (rain >= 60) {
      advice = `Rain peaks around ${peakTime}. Wait it out 20 min, or commit and bring waterproofs.`;
    } else if (level === "warn") {
      advice = `Things get rougher after ${hhmm} — kit up before you head out.`;
    }
  }

  return {
    label: target.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    level, detail, hour: closest, advice,
  };
}