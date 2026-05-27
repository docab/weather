import type { LocationConditions, WeatherData, PollenData, AqiData, Location } from "./types";
import { describeWeather } from "./weatherCodes";
import { severityLabel } from "./severity";

// Deterministic small hash from a string -> 0..(mod-1)
function seedFrom(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function pick<T>(arr: T[], seed: number, salt = 0): T {
  return arr[(seed + salt) % arr.length];
}

function tempFeel(actual: number, feels: number): string {
  const diff = actual - feels;
  if (Math.abs(diff) < 1.5) return "";
  if (diff > 4) return ` Heads up — it's ${Math.round(actual)}° but it'll bite like ${Math.round(feels)}° once you're out.`;
  if (diff > 1.5) return ` Bit nippier than it looks, more like ${Math.round(feels)}° on the skin.`;
  if (diff < -3) return ` Warmer than the number — that ${Math.round(actual)}° will feel closer to ${Math.round(feels)}° in the sun.`;
  return ` Feels about ${Math.round(feels)}° really.`;
}

function timeOfDayShift(weather: WeatherData, seed: number): string {
  const next8 = weather.hourly.slice(0, 8);
  if (next8.length < 4) return "";
  const startCode = next8[0].weatherCode;
  const lateCode = next8[next8.length - 1].weatherCode;
  const startInfo = describeWeather(startCode, true);
  const lateInfo = describeWeather(lateCode, true);
  const startRain = next8.slice(0, 3).some(h => h.precipProb >= 50);
  const lateRain = next8.slice(-3).some(h => h.precipProb >= 50);

  if (!startRain && lateRain) return pick([
    " Dry for now, but the rain creeps in later — chuck a brolly in your bag.",
    " Stays dry a while, then the showers roll in — pack a brolly.",
    " Bone dry now, wetter by evening. Don't get caught out.",
  ], seed, 7);
  if (startRain && !lateRain) return pick([
    " Wet start, then it eases off through the day.",
    " Damp this morning, dries out as the day goes on.",
    " Showers early, brighter skies later.",
  ], seed, 11);
  if (startInfo.sky !== lateInfo.sky) return ` Starts off ${startInfo.short.toLowerCase()}, turning ${lateInfo.short.toLowerCase()} by the evening.`;
  return "";
}

export function buildNarrative(
  weather: WeatherData,
  pollen: PollenData,
  aqi: AqiData,
  location?: Location,
): string {
  const info = describeWeather(weather.weatherCode, weather.isDay);
  const parts: string[] = [];
  const seedStr = location ? `${location.id}|${location.name}|${location.latitude.toFixed(2)}` : "default";
  const seed = seedFrom(seedStr);

  // Opening line — temperature first, sky second. Pick from a varied pool seeded
  // per-location so two nearby places don't read identically.
  const f = weather.feelsLike;
  let tempPool: string[];
  if (f >= 40)      tempPool = ["Brutal heat — dangerously hot.", "Furnace day — genuinely dangerous heat.", "Off-the-charts hot. Stay indoors if you can."];
  else if (f >= 35) tempPool = ["Seriously hot — properly sweltering.", "Sweltering out — relentless heat.", "Roasting today, no breeze to save you."];
  else if (f >= 30) tempPool = ["Hot one — it's baking out.", "Properly hot today — sun's brutal.", "Heat's on — you'll feel it the second you step out."];
  else if (f >= 26) tempPool = ["Properly warm — toasty out there.", "Hot and sticky kind of day.", "Genuinely warm — short sleeves weather."];
  else if (f >= 21) tempPool = ["Warm and pleasant.", "Lovely warmth in the air.", "Nicely warm — proper outdoors weather."];
  else if (f >= 16) tempPool = ["Mild out — comfortable enough.", "Pleasant and mild.", "Easy temperature — nothing to fight."];
  else if (f >= 10) tempPool = ["A touch cool, nothing dramatic.", "Fresh out — light layer'll do.", "Cool but manageable."];
  else if (f >= 4)  tempPool = ["On the cool side — grab a jacket.", "Crisp out there, jacket weather.", "Nippy — you'll want a coat."];
  else if (f >= 0)  tempPool = ["Properly chilly.", "Cold edge to the air today.", "Real bite to it — cold one."];
  else if (f >= -8) tempPool = ["Bitterly cold — bundle up.", "Bone-cold out there. Layer up.", "Freezing properly — wrap up."];
  else              tempPool = ["Dangerously cold — limit time outside.", "Arctic out there. Keep it brief.", "Genuinely dangerous cold."];
  let tempPhrase = pick(tempPool, seed);

  let skyPhrase = "";
  // WMO code 0 = totally clear; code 1 = "mainly clear" (a few high clouds).
  // Treating them identically led to "not a cloud in sight" while the icon
  // showed sun-with-cloud. Split the copy so wording matches the sky.
  const trulyClear = weather.weatherCode === 0;
  const mainlyClear = weather.weatherCode === 1;
  if (info.sky === "clear" && trulyClear) {
    skyPhrase = weather.isDay
      ? " " + pick(["Bright, clear sky.", "Sun's out, not a cloud in sight.", "Big blue sky overhead."], seed, 1)
      : " " + pick(["Clear night sky.", "Stars out, sky's clear.", "Crisp clear night."], seed, 1);
  } else if (info.sky === "clear" && mainlyClear) {
    skyPhrase = weather.isDay
      ? " " + pick(["Mostly sunny with the odd wisp of cloud.", "Plenty of sun, a stray cloud here and there.", "Bright with a few thin clouds drifting through."], seed, 1)
      : " " + pick(["Mostly clear night, just a few high clouds.", "Stars peeking through the odd thin cloud.", "Largely clear overhead, a wisp or two of cloud."], seed, 1);
  } else if (info.sky === "cloudy" && weather.precipProb < 30) {
    skyPhrase = " " + pick([
      "Grey lid of cloud, but it should stay dry.",
      "Overcast but the rain's holding off.",
      "Cloudy throughout — dry though.",
    ], seed, 2);
  } else if (info.sky === "rain") {
    skyPhrase = " " + pick([
      "Damp and drizzly with it.",
      "Wet one — rain on and off.",
      "Rain in the mix, pavements'll be slick.",
    ], seed, 3);
  } else if (info.sky === "snow") {
    skyPhrase = " " + pick([
      "Snow's on the cards too — wrap up.",
      "Snow falling — slippery underfoot.",
      "Flakes coming down, mind your step.",
    ], seed, 4);
  } else if (info.sky === "night") {
    skyPhrase = " " + pick(["Quiet night out there.", "Still night air.", "Calm out under the dark."], seed, 5);
  }

  parts.push(tempPhrase + skyPhrase);

  parts[0] += tempFeel(weather.temp, weather.feelsLike);
  const shift = timeOfDayShift(weather, seed);
  if (shift) parts.push(shift.trim());

  if (weather.windGust >= 50) parts.push(pick([
    `Gusts up around ${Math.round(weather.windGust)} mph — hold onto your hat.`,
    `Wind's vicious — gusting to ${Math.round(weather.windGust)} mph.`,
    `${Math.round(weather.windGust)} mph gusts out there, brace yourself.`,
  ], seed, 13));
  else if (weather.windSpeed >= 25) parts.push(pick([
    `Properly blustery, wind's pushing ${Math.round(weather.windSpeed)} mph.`,
    `Breezy edge to the day — ${Math.round(weather.windSpeed)} mph wind.`,
    `Wind's making itself known at ${Math.round(weather.windSpeed)} mph.`,
  ], seed, 17));

  if (pollen.level === "high" || pollen.level === "very-high") {
    parts.push(pick([
      `Pollen's ${severityLabel[pollen.level].toLowerCase()} too — mostly ${pollen.dominantSpecies.toLowerCase()}. Worth taking an antihistamine.`,
      `Heavy ${pollen.dominantSpecies.toLowerCase()} pollen about — antihistamine day if you suffer.`,
      `${pollen.dominantSpecies} pollen is up — keep an eye if you're sensitive.`,
    ], seed, 19));
  }
  if (aqi.level === "high" || aqi.level === "very-high") {
    parts.push(pick([
      `Air's a bit rough today, so go easy if your lungs are sensitive.`,
      `Air quality's not great — take it easy outdoors.`,
      `Pollution's on the higher side, mind sensitive lungs.`,
    ], seed, 23));
  }
  if (weather.uvIndex >= 6) parts.push(pick([
    `UV's strong (${Math.round(weather.uvIndex)}) — get the sun cream on.`,
    `Sun's biting (UV ${Math.round(weather.uvIndex)}) — slap on SPF.`,
    `High UV today at ${Math.round(weather.uvIndex)} — don't skip sunscreen.`,
  ], seed, 29));

  return parts.join(" ");
}

export function buildOutfit(weather: WeatherData): string {
  const t = weather.feelsLike;
  const wet = weather.precipProb >= 40;
  const windy = weather.windSpeed >= 20;
  const items: string[] = [];

  if (t < 0) items.push("Heavy coat, hat, gloves, scarf");
  else if (t < 5) items.push("Winter coat, gloves", "3 layers");
  else if (t < 10) items.push("Warm jacket", "2 layers");
  else if (t < 15) items.push("Light jacket or jumper", "long sleeves");
  else if (t < 20) items.push("Long sleeves or light layer");
  else if (t < 25) items.push("T-shirt weather");
  else items.push("Light, breathable clothing");

  if (wet) items.push("waterproof shell");
  if (windy && t < 15) items.push("windproof outer");
  if (weather.uvIndex >= 6) items.push("sunglasses");

  return items.join(", ");
}

export function buildUmbrella(weather: WeatherData): string {
  if (weather.precipProb >= 70) return "Definitely take an umbrella";
  if (weather.precipProb >= 40) return "Worth packing an umbrella";
  if (weather.precipProb >= 20) return "Maybe carry one, just in case";
  return "No umbrella needed";
}

/**
 * Pick a fragrance family that flatters the day's weather.
 * Heat blooms top notes, cold needs warmth & projection, damp air
 * lifts greens & ozonics, dry crisp days suit citrus & aromatic.
 */
export function buildPerfume(weather: WeatherData, pollen: PollenData): string {
  const t = weather.feelsLike;
  const wet = weather.precipProb >= 50;
  const humid = weather.humidity >= 75;
  const windy = weather.windSpeed >= 18;
  const hayfever = pollen.level === "high" || pollen.level === "very-high";

  // Hay-fever days — keep it gentle, skin-close, no heady florals
  if (hayfever) {
    return "Skin-close musk & clean cotton — keep florals light so they don't compete with the pollen. Try Maison Margiela 'Lazy Sunday Morning', Le Labo Another 13 or Glossier You.";
  }

  // Hot & sticky
  if (t >= 24 && humid) {
    return "Aquatic & marine — salt, cucumber, neroli. Try Giorgio Armani Acqua di Giò, Maison Margiela 'Beach Walk', Issey Miyake L'Eau d'Issey or CK One.";
  }
  // Hot & dry
  if (t >= 24) {
    return "Bright citrus & green tea — bergamot, lemon, vetiver. Try Hermès Eau d'Orange Verte, Atelier Cologne Orange Sanguine or Bvlgari Eau Parfumée au Thé Vert.";
  }
  // Warm pleasant
  if (t >= 18) {
    return "Fig, iris & soft florals. Try Diptyque Philosykos, Jo Malone Wood Sage & Sea Salt or Chloé Eau de Parfum.";
  }
  // Mild
  if (t >= 12) {
    if (wet) return "Petrichor & green — moss, violet leaf, a touch of rain. Try Serge Lutens Fille en Aiguilles, Comme des Garçons 2, or Demeter Rain.";
    return "Aromatic fougère — lavender, rosemary, woody base. Try Tom Ford Beau de Jour, Dior Sauvage or Guerlain Mouchoir de Monsieur.";
  }
  // Cool
  if (t >= 6) {
    return "Smoky woods & leather — cedar, vetiver, incense. Try Le Labo Santal 33, Tom Ford Tobacco Vanille or Byredo Gypsy Water.";
  }
  // Cold
  if (t >= 0) {
    return "Amber, oud & vanilla — rich resinous warmth. Try Maison Francis Kurkdjian Baccarat Rouge 540, YSL Libre or Tom Ford Oud Wood.";
  }
  // Freezing
  return "Heavy gourmand & oud — tonka, benzoin, animalic woods. Try Mugler Angel, Killian Black Phantom or Amouage Interlude Man.";
}

/**
 * Just the raw notes from the current pick — used to animate floating
 * fragrance notes in the background of the recommendations card.
 */
export function buildPerfumeNotes(weather: WeatherData, pollen: PollenData): string[] {
  const t = weather.feelsLike;
  const wet = weather.precipProb >= 50;
  const humid = weather.humidity >= 75;
  const hayfever = pollen.level === "high" || pollen.level === "very-high";
  if (hayfever) return ["musk", "cotton", "soft amber", "white tea"];
  if (t >= 24 && humid) return ["salt", "cucumber", "neroli", "sea breeze", "ozone"];
  if (t >= 24) return ["bergamot", "lemon", "green tea", "vetiver"];
  if (t >= 18) return ["fig", "iris", "sage", "sea salt"];
  if (t >= 12) return wet
    ? ["petrichor", "moss", "violet leaf", "rain"]
    : ["lavender", "rosemary", "cedar", "bergamot"];
  if (t >= 6) return ["sandalwood", "cedar", "vetiver", "incense", "leather"];
  if (t >= 0) return ["amber", "oud", "vanilla", "saffron"];
  return ["tonka", "benzoin", "oud", "smoke", "animalic"];
}