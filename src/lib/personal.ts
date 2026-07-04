import type { WeatherData, WeatherHour } from "./types";

export type ActivityKey =
  | "run" | "cycle" | "walk" | "garden" | "photo" | "dining"
  | "hike" | "swim" | "yoga" | "tennis" | "football" | "golf"
  | "gym" | "kids_play" | "birdwatch" | "fish" | "picnic" | "market";
export type CommuteMode = "drive" | "cycle" | "walk" | "transit" | "motorcycle" | "wheelchair";
export type HealthFlag =
  | "asthma" | "hayfever" | "migraine" | "arthritis" | "eczema" | "heart" | "pregnancy"
  | "copd" | "diabetes" | "raynaud" | "sinusitis" | "dry_eyes"
  | "low_bp" | "high_bp" | "sensitive_skin" | "menopause" | "insomnia";
export type HouseholdFlag = "dog" | "kids" | "plants" | "garden" | "car_outside";
export type Units = "metric" | "imperial";

export interface PersonalPrefs {
  name?: string;
  activities: ActivityKey[];
  /** Multiple modes allowed — user often mixes walk + transit, drive + walk etc. */
  commuteModes: CommuteMode[];
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
  commuteModes: ["walk"],
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
    const parsed = JSON.parse(raw);
    // Migrate the old single commuteMode → commuteModes array.
    if (parsed && typeof parsed.commuteMode === "string" && !parsed.commuteModes) {
      parsed.commuteModes = [parsed.commuteMode];
    }
    return { ...defaultPersonalPrefs, ...parsed };
  } catch { return defaultPersonalPrefs; }
}
export function savePersonalPrefs(p: PersonalPrefs) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export const ACTIVITY_LABEL: Record<ActivityKey, string> = {
  run: "Running", cycle: "Cycling", walk: "Walking",
  garden: "Gardening", photo: "Photography", dining: "Outdoor dining",
  hike: "Hiking", swim: "Open-water swim", yoga: "Outdoor yoga",
  tennis: "Tennis", football: "Football / 5-a-side", golf: "Golf",
  gym: "Gym", kids_play: "Kids' park play", birdwatch: "Birdwatching",
  fish: "Fishing", picnic: "Picnic", market: "Outdoor market",
};
export const ACTIVITY_ICON: Record<ActivityKey, string> = {
  run: "🏃", cycle: "🚴", walk: "🚶", garden: "🌱", photo: "📷", dining: "🍷",
  hike: "🥾", swim: "🏊", yoga: "🧘", tennis: "🎾", football: "⚽", golf: "🏌️",
  gym: "🏋️", kids_play: "🛝", birdwatch: "🦉", fish: "🎣", picnic: "🧺", market: "🛍️",
};

export const HEALTH_LABEL: Record<HealthFlag, string> = {
  asthma: "Asthma", hayfever: "Hay fever", migraine: "Migraines",
  arthritis: "Joint pain", eczema: "Eczema / dry skin",
  heart: "Heart condition", pregnancy: "Pregnancy",
  copd: "COPD / chronic bronchitis", diabetes: "Diabetes",
  raynaud: "Raynaud's / cold hands", sinusitis: "Sinus issues",
  dry_eyes: "Dry eyes", low_bp: "Low blood pressure", high_bp: "High blood pressure",
  sensitive_skin: "Sensitive skin / rosacea", menopause: "Menopause",
  insomnia: "Sleep issues",
};
export const HEALTH_ICON: Record<HealthFlag, string> = {
  asthma: "🫁", hayfever: "🤧", migraine: "🤕",
  arthritis: "🦴", eczema: "🧴", heart: "❤️", pregnancy: "🤰",
  copd: "🌬️", diabetes: "🩸", raynaud: "🥶", sinusitis: "👃", dry_eyes: "👁️",
  low_bp: "📉", high_bp: "📈", sensitive_skin: "🌸", menopause: "🔥", insomnia: "😴",
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
  const push = (s: string) => out.push(s);
  // Every clause tries to name the specific weather driver and what it means
  // for that condition — never just "watch out today".
  for (const flag of prefs.health) {
    if (flag === "asthma") {
      if (air.aqiIndex >= 50) push(`Air quality is elevated (AQI ${air.aqiIndex}) — traffic PM2.5 and NO₂ inflame bronchi. Reliever inhaler in your pocket; do cardio away from main roads.`);
      if (w.humidity >= 85) push(`Humidity ${Math.round(w.humidity)}% — heavy air holds allergens and irritants close. Wheeze risk climbs by evening.`);
      if (w.feelsLike <= 2) push(`Cold-air constriction is a classic trigger — scarf over the mouth, warm up indoors 5 min before exercise.`);
      if (w.precipProb >= 60 && w.windSpeed >= 15) push(`Wind + rain can spark thunderstorm-asthma — pollen fragments become deeply respirable. Stay in during any storm break.`);
    }
    if (flag === "copd") {
      if (w.feelsLike <= 5 || w.feelsLike >= 30) push(`Temperature extremes stress lungs — pace tasks, use pursed-lip breathing, keep rescue meds close.`);
      if (air.aqiIndex >= 40) push(`AQI ${air.aqiIndex} — even moderate PM2.5 significantly worsens COPD. Avoid busy roads and outdoor exertion.`);
      if (w.humidity <= 30) push(`Very dry air (${Math.round(w.humidity)}%) thickens mucus — sip water hourly, humidifier at home if you have one.`);
    }
    if (flag === "hayfever") {
      if (["high", "very-high"].includes(air.pollenLevel)) push(`Pollen is ${air.pollenLevel} — antihistamine 30 min before heading out; wraparound sunglasses cut ocular exposure ~70%.`);
      if (w.windSpeed >= 18) push(`Wind ${Math.round(w.windSpeed)} mph is shaking pollen loose — shower and change clothes on getting home.`);
      if (w.feelsLike >= 22 && w.humidity <= 50) push(`Warm, dry air spreads pollen far — barrier balm (Vaseline) around nostrils cuts inhaled load.`);
    }
    if (flag === "sinusitis") {
      const pressureSwing = Math.abs((w.pressure ?? 1013) - 1013) >= 6;
      if (pressureSwing) push(`Pressure is off baseline — sinus cavities react to the swing. Steam inhalation morning and night helps.`);
      if (w.humidity <= 30) push(`Dry air (${Math.round(w.humidity)}%) irritates sinus membranes — saline spray, and don't skip water.`);
      if (w.feelsLike <= 4) push(`Cold air causes vasoconstriction in sinuses — cover nose/mouth on the walk out.`);
    }
    if (flag === "migraine") {
      if (w.uvIndex >= 7) push(`Strong UV (${Math.round(w.uvIndex)}) is a known photic trigger — sunglasses even in shade.`);
      if (w.humidity >= 80 && w.feelsLike >= 24) push(`Hot + humid combo — dehydration + serotonin dips trigger attacks. 500 ml water within the next hour.`);
      const pressureSwing = Math.abs((w.pressure ?? 1013) - 1013) >= 7;
      if (pressureSwing) push(`Barometric pressure is well off baseline (~${Math.round(w.pressure ?? 1013)} hPa) — this is the biggest weather migraine trigger. Take your abortive early if aura hits.`);
    }
    if (flag === "arthritis") {
      if (w.feelsLike <= 6) push(`Cold + damp will stiffen joints — 10-min warm-up before any activity, and layer a thin thermal.`);
      if (Math.abs((w.pressure ?? 1013) - 1013) >= 8) push(`Barometric shift ~${Math.round(w.pressure ?? 1013)} hPa — tissues expand slightly, flaring joint tension. Gentle mobility work helps.`);
    }
    if (flag === "raynaud") {
      if (w.feelsLike <= 10) push(`Feels ${Math.round(w.feelsLike)}° — Raynaud's kicks in around 15° for many. Hand warmers, thin liners under gloves, avoid holding cold objects bare-handed.`);
      if (w.windSpeed >= 15 && w.feelsLike <= 12) push(`Wind chill will bite hands and feet fast — mittens beat gloves, thermal socks essential.`);
    }
    if (flag === "eczema") {
      if (w.humidity <= 35) push(`Dry air (${Math.round(w.humidity)}%) strips the skin barrier — thick emollient after washing, again before bed.`);
      if (w.feelsLike >= 26) push(`Sweat will flare flexures — loose cotton only, rinse and pat dry (don't rub) mid-afternoon.`);
      if (w.uvIndex >= 6) push(`UV can inflame active patches — fragrance-free SPF 30+ over affected skin.`);
    }
    if (flag === "sensitive_skin") {
      if (w.uvIndex >= 6) push(`Sensitive/rosacea skin flushes under UV ${Math.round(w.uvIndex)} — mineral SPF (zinc oxide) beats chemical filters.`);
      if (w.windSpeed >= 20) push(`Wind ${Math.round(w.windSpeed)} mph strips the barrier — barrier cream (Cerave/Avene) before heading out.`);
      if (w.feelsLike >= 25) push(`Heat + sweat trigger rosacea flushing — cool water on wrists, avoid spicy lunches today.`);
    }
    if (flag === "dry_eyes") {
      if (w.humidity <= 40) push(`Humidity ${Math.round(w.humidity)}% — tear film evaporates fast. Lubricating drops every 2h, blink breaks off screen.`);
      if (w.windSpeed >= 15) push(`Wind ${Math.round(w.windSpeed)} mph will dry eyes further — wraparound sunglasses, gel drops in your bag.`);
    }
    if (flag === "heart") {
      if (w.feelsLike <= 0 || w.feelsLike >= 30) push(`Temperature extremes strain the heart — skip heavy chores, hydrate steadily, split tasks into short blocks.`);
      if (Math.abs((w.pressure ?? 1013) - 1013) >= 10) push(`Big pressure swing can nudge BP — take readings if you monitor, and don't skip morning meds.`);
    }
    if (flag === "high_bp") {
      if (w.feelsLike <= 5) push(`Cold constricts vessels — BP typically rises. Warm up before going out, avoid sudden cold plunges.`);
      if (w.feelsLike >= 28) push(`Heat + dehydration drops BP but strains the heart — sip water, add a pinch of salt if you sweat heavily.`);
    }
    if (flag === "low_bp") {
      if (w.feelsLike >= 26) push(`Heat drops BP further — stand up slowly, salty snacks, extra 500 ml water today.`);
    }
    if (flag === "diabetes") {
      if (w.feelsLike >= 28) push(`Heat can lower blood glucose and speed insulin absorption — check more often, keep fast carbs to hand.`);
      if (w.feelsLike <= 2) push(`Cold reduces circulation — feet warm and dry to avoid neuropathy issues; check before bed.`);
    }
    if (flag === "menopause") {
      if (w.feelsLike >= 24 || w.humidity >= 75) push(`Warm/humid air amplifies hot flushes — cotton/linen layers you can strip fast, cool water on wrists.`);
      if (w.feelsLike <= 5) push(`Sudden cold-to-warm swings trigger flushes — layer up so you can vent inside without stripping to a t-shirt.`);
    }
    if (flag === "insomnia") {
      const nightPeak = weather.hourly.slice(0, 24).find(h => new Date(h.time).getHours() === 23)?.feelsLike ?? w.feelsLike;
      if (nightPeak >= 22) push(`Bedroom air will still be ~${Math.round(nightPeak)}° at 11pm — cool showers, cotton sheets, fan on for sleep quality.`);
      if (w.feelsLike >= 28 && w.humidity >= 65) push(`Muggy night ahead — melatonin release lags in warm rooms. Open windows once outside dips below inside.`);
    }
    if (flag === "pregnancy") {
      if (w.feelsLike >= 26) push(`Heat hits harder when pregnant — shade for 5 min every half hour, cool water bottle.`);
      if (w.feelsLike <= 2) push(`Slippery cold underfoot — flat grippy soles, hand on the rail.`);
      if (w.uvIndex >= 7) push(`UV ${Math.round(w.uvIndex)} — pregnancy melasma flares fast; brimmed hat and mineral SPF 50.`);
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
  hike: [8, 22], swim: [18, 30], yoga: [15, 26],
  tennis: [12, 24], football: [8, 20], golf: [12, 24],
  gym: [4, 26], kids_play: [12, 24], birdwatch: [6, 22],
  fish: [8, 22], picnic: [16, 26], market: [10, 24],
};
const RAIN_PENALTY: Record<ActivityKey, number> = {
  run: 1.0, cycle: 1.2, walk: 0.7, garden: 1.0, photo: 0.4, dining: 1.6,
  hike: 1.1, swim: 0.3, yoga: 1.5, tennis: 1.8, football: 1.2, golf: 1.7,
  gym: 0.3, kids_play: 1.4, birdwatch: 1.2, fish: 0.6, picnic: 1.7, market: 1.3,
};
const WIND_PENALTY: Record<ActivityKey, number> = {
  run: 0.7, cycle: 1.6, walk: 0.5, garden: 0.6, photo: 0.4, dining: 1.3,
  hike: 0.7, swim: 1.2, yoga: 1.4, tennis: 1.6, football: 0.9, golf: 1.8,
  gym: 0.1, kids_play: 0.9, birdwatch: 1.0, fish: 1.0, picnic: 1.5, market: 0.7,
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
  const modes = prefs.commuteModes.length ? prefs.commuteModes : (["walk"] as CommuteMode[]);
  const mode = modes[0];

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
    motorcycle: "ride", wheelchair: "wheel",
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