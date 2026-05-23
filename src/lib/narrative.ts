import type { LocationConditions, WeatherData, PollenData, AqiData } from "./types";
import { describeWeather } from "./weatherCodes";
import { severityLabel } from "./severity";

function tempFeel(actual: number, feels: number): string {
  const diff = actual - feels;
  if (Math.abs(diff) < 1.5) return "";
  if (diff > 4) return ` Heads up — it's ${Math.round(actual)}° but it'll bite like ${Math.round(feels)}° once you're out.`;
  if (diff > 1.5) return ` Bit nippier than it looks, more like ${Math.round(feels)}° on the skin.`;
  if (diff < -3) return ` Warmer than the number — that ${Math.round(actual)}° will feel closer to ${Math.round(feels)}° in the sun.`;
  return ` Feels about ${Math.round(feels)}° really.`;
}

function timeOfDayShift(weather: WeatherData): string {
  const next8 = weather.hourly.slice(0, 8);
  if (next8.length < 4) return "";
  const startCode = next8[0].weatherCode;
  const lateCode = next8[next8.length - 1].weatherCode;
  const startInfo = describeWeather(startCode, true);
  const lateInfo = describeWeather(lateCode, true);
  const startRain = next8.slice(0, 3).some(h => h.precipProb >= 50);
  const lateRain = next8.slice(-3).some(h => h.precipProb >= 50);

  if (!startRain && lateRain) return ` Dry for now, but the rain creeps in later — chuck a brolly in your bag.`;
  if (startRain && !lateRain) return ` Wet start, then it eases off through the day.`;
  if (startInfo.sky !== lateInfo.sky) return ` Starts off ${startInfo.short.toLowerCase()}, turning ${lateInfo.short.toLowerCase()} by the evening.`;
  return "";
}

export function buildNarrative(
  weather: WeatherData,
  pollen: PollenData,
  aqi: AqiData
): string {
  const info = describeWeather(weather.weatherCode, weather.isDay);
  const parts: string[] = [];

  // Opening line — temperature first, sky second. Don't call a 30°C day "lovely".
  const f = weather.feelsLike;
  let tempPhrase = "";
  if (f >= 40)      tempPhrase = "Brutal heat out there — dangerously hot.";
  else if (f >= 35) tempPhrase = "Seriously hot — properly sweltering.";
  else if (f >= 30) tempPhrase = "Hot one today — it's baking out.";
  else if (f >= 26) tempPhrase = "Properly warm — toasty out there.";
  else if (f >= 21) tempPhrase = "Warm and pleasant.";
  else if (f >= 16) tempPhrase = "Mild out — comfortable enough.";
  else if (f >= 10) tempPhrase = "A touch cool, nothing dramatic.";
  else if (f >= 4)  tempPhrase = "On the cool side — grab a jacket.";
  else if (f >= 0)  tempPhrase = "Properly chilly.";
  else if (f >= -8) tempPhrase = "Bitterly cold — bundle up.";
  else              tempPhrase = "Dangerously cold — limit time outside.";

  let skyPhrase = "";
  if (info.sky === "clear") skyPhrase = weather.isDay ? " Bright, clear sky." : " Clear night sky.";
  else if (info.sky === "cloudy" && weather.precipProb < 30) skyPhrase = " Grey lid of cloud, but it should stay dry.";
  else if (info.sky === "rain") skyPhrase = " Damp and drizzly with it.";
  else if (info.sky === "snow") skyPhrase = " Snow's on the cards too — wrap up.";
  else if (info.sky === "night") skyPhrase = " Quiet night out there.";

  parts.push(tempPhrase + skyPhrase);

  parts[0] += tempFeel(weather.temp, weather.feelsLike);
  const shift = timeOfDayShift(weather);
  if (shift) parts.push(shift.trim());

  if (weather.windGust >= 50) parts.push(`Gusts up around ${Math.round(weather.windGust)} mph — hold onto your hat.`);
  else if (weather.windSpeed >= 25) parts.push(`Properly blustery, wind's pushing ${Math.round(weather.windSpeed)} mph.`);

  if (pollen.level === "high" || pollen.level === "very-high") {
    parts.push(`Pollen's ${severityLabel[pollen.level].toLowerCase()} too — mostly ${pollen.dominantSpecies.toLowerCase()}. Worth taking an antihistamine.`);
  }
  if (aqi.level === "high" || aqi.level === "very-high") {
    parts.push(`Air's a bit rough today, so go easy if your lungs are sensitive.`);
  }
  if (weather.uvIndex >= 6) parts.push(`UV's strong (${Math.round(weather.uvIndex)}) — get the sun cream on.`);

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