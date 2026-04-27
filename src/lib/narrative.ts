import type { LocationConditions, WeatherData, PollenData, AqiData } from "./types";
import { describeWeather } from "./weatherCodes";
import { severityLabel } from "./severity";

function tempFeel(actual: number, feels: number): string {
  const diff = actual - feels;
  if (Math.abs(diff) < 1.5) return "";
  if (diff > 4) return ` The cold will catch you off guard — it's ${Math.round(actual)}°C but feels like ${Math.round(feels)}°C.`;
  if (diff > 1.5) return ` It feels a touch colder than it looks — like ${Math.round(feels)}°C.`;
  if (diff < -3) return ` Warmer than it looks — that ${Math.round(actual)}°C feels closer to ${Math.round(feels)}°C in the sun.`;
  return ` Feels around ${Math.round(feels)}°C.`;
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

  if (!startRain && lateRain) return ` Dry now, but rain rolls in later — pack a brolly.`;
  if (startRain && !lateRain) return ` Wet start, drying out as the day goes on.`;
  if (startInfo.sky !== lateInfo.sky) return ` Starts ${startInfo.short.toLowerCase()}, turning ${lateInfo.short.toLowerCase()} later.`;
  return "";
}

export function buildNarrative(
  weather: WeatherData,
  pollen: PollenData,
  aqi: AqiData
): string {
  const info = describeWeather(weather.weatherCode, weather.isDay);
  const parts: string[] = [];

  // Opening line on conditions
  if (info.sky === "clear") {
    parts.push(`Crisp and clear — bright skies overhead.`);
  } else if (info.sky === "cloudy" && weather.precipProb < 30) {
    parts.push(`Grey and overcast, but staying dry.`);
  } else if (info.sky === "rain") {
    parts.push(`It'll feel raw and damp today — like standing in a cold mist.`);
  } else if (info.sky === "snow") {
    parts.push(`Wintry and biting — snow on the cards.`);
  } else {
    parts.push(`A muted, in-between sort of day.`);
  }

  parts[0] += tempFeel(weather.temp, weather.feelsLike);
  const shift = timeOfDayShift(weather);
  if (shift) parts.push(shift.trim());

  if (weather.windGust >= 50) parts.push(`Gusts pushing ${Math.round(weather.windGust)} mph — hold onto your hat.`);
  else if (weather.windSpeed >= 25) parts.push(`Blustery — ${Math.round(weather.windSpeed)} mph wind.`);

  if (pollen.level === "high" || pollen.level === "very-high") {
    parts.push(`${severityLabel[pollen.level]} pollen — ${pollen.dominantSpecies} dominant. Antihistamines worth a thought.`);
  }

  if (aqi.level === "high" || aqi.level === "very-high") {
    parts.push(`Air quality is ${severityLabel[aqi.level].toLowerCase()} — sensitive lungs, take it easy.`);
  }

  if (weather.uvIndex >= 6) parts.push(`UV is high (${Math.round(weather.uvIndex)}) — sun cream on.`);

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
    return "Skin-close musk or clean cotton — keep florals light so they don't compete with the pollen";
  }

  // Hot & sticky
  if (t >= 24 && humid) {
    return "Aquatic or marine — salt, cucumber, neroli. Something that breathes (think Acqua di Giò, CK One)";
  }
  // Hot & dry
  if (t >= 24) {
    return "Bright citrus & green tea — bergamot, lemon, vetiver. Fresh and weightless";
  }
  // Warm pleasant
  if (t >= 18) {
    return "Fig, iris or soft floral — Philosykos energy, easy in the heat without sulking";
  }
  // Mild
  if (t >= 12) {
    if (wet) return "Petrichor & green — moss, violet leaf, a touch of rain (Fille en Aiguilles, L'Eau d'Issey)";
    return "Aromatic fougère — lavender, rosemary, a clean woody base. Crisp and put-together";
  }
  // Cool
  if (t >= 6) {
    return "Smoky woods or leather — cedar, vetiver, a little incense. Warmth that projects in the cold air";
  }
  // Cold
  if (t >= 0) {
    return "Amber, oud or vanilla — rich resinous warmth that holds up to the chill";
  }
  // Freezing
  return "Heavy gourmand or oud — tonka, benzoin, animalic woods. Nothing delicate survives this";
}