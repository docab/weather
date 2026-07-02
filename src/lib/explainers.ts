/**
 * Plain-English explainers for every weather metric. Each returns a short
 * "what it is" line and a "what it means for you" line, based on the
 * live value. Kept in one place so every card speaks the same language.
 */

export interface Explainer {
  title: string;
  what: string;    // what this metric IS
  means: string;   // what this specific VALUE means for the user
}

export function explainTemp(feelsLike: number, actual: number): Explainer {
  const diff = Math.round(feelsLike - actual);
  const dir = diff > 0 ? "warmer" : diff < 0 ? "cooler" : "the same as";
  return {
    title: "Feels like",
    what: "How the air actually hits your skin — combines temperature, wind and humidity, not just the thermometer.",
    means: Math.abs(diff) >= 2
      ? `Feels ${Math.abs(diff)}° ${dir} the true air temperature (${Math.round(actual)}°).`
      : `Basically matches the true temperature (${Math.round(actual)}°) — wind and humidity aren't skewing it much.`,
  };
}

export function explainWind(mph: number, gust?: number): Explainer {
  const beaufort =
    mph < 1 ? "calm — smoke rises straight up"
    : mph < 4 ? "light air — barely stirs a leaf"
    : mph < 8 ? "light breeze — you can feel it on your face"
    : mph < 13 ? "gentle breeze — leaves rustle, flags flutter"
    : mph < 19 ? "moderate breeze — raises dust, moves small branches"
    : mph < 25 ? "fresh breeze — small trees sway, wavelets on water"
    : mph < 32 ? "strong breeze — large branches move, umbrellas hard to use"
    : mph < 39 ? "near gale — whole trees in motion"
    : mph < 47 ? "gale — twigs snap, walking is hard"
    : mph < 55 ? "strong gale — chimney pots blow off"
    : "storm force — widespread damage likely";
  const gustLine = gust && gust >= mph + 8
    ? ` Gusts to ${Math.round(gust)} mph make it feel unpredictable — brollies flip, cyclists get punched sideways.`
    : "";
  return {
    title: "Wind",
    what: "How fast the air is moving. Sustained speed is the average; a gust is a short punch above that.",
    means: `At ${Math.round(mph)} mph, ${beaufort}.${gustLine}`,
  };
}

export function explainHumidity(pct: number, tempC: number): Explainer {
  const feel =
    pct < 30 ? "very dry — lips, skin and eyes will feel it, static shocks likely."
    : pct < 45 ? "comfortable, on the drier side."
    : pct < 65 ? "comfortable middle ground."
    : pct < 80 ? (tempC >= 22 ? "muggy — sweat won't evaporate as easily, everything feels heavier."
                                : "damp but not oppressive.")
    : (tempC >= 24 ? "tropical mugginess — even the shade feels sticky."
                    : "very damp — laundry won't dry outside, everything feels clammy.");
  return {
    title: "Humidity",
    what: "How much water vapour is in the air, as a percentage of the maximum the air can hold at this temperature.",
    means: `${Math.round(pct)}% is ${feel}`,
  };
}

export function explainUV(uv: number): Explainer {
  const risk =
    uv < 3 ? "low — burn time is over an hour for most skin types, sunscreen optional."
    : uv < 6 ? "moderate — burn time around 30–45 min, SPF 30 for anything longer."
    : uv < 8 ? "high — burn in 20 min. SPF 30+, hat, and sunglasses if you're out at midday."
    : uv < 11 ? "very high — burn in 10–15 min. SPF 50, shade between 11am–3pm."
    : "extreme — burn in under 10 min. Cover up properly and avoid direct sun.";
  return {
    title: "UV index",
    what: "How strong the sun's damaging ultraviolet radiation is right now, on a 0–11+ scale. Peaks around solar noon.",
    means: `UV ${Math.round(uv)} is ${risk}`,
  };
}

export function explainPressure(hpa: number | undefined, trend?: "rising" | "falling" | "steady"): Explainer {
  const p = hpa ?? 1013;
  const level =
    p < 990 ? "low — associated with storms and unsettled weather."
    : p < 1005 ? "below average — often means changeable, wet weather is nearby."
    : p < 1020 ? "average — the atmosphere is roughly neutral."
    : p < 1030 ? "high — settled, often clear weather with cool nights and calm days."
    : "very high — locked-in fair weather, or in winter, persistent fog and frost.";
  const trendLine = trend
    ? trend === "falling"
      ? " It's falling, which usually flags unsettled weather within 12–24 hours — clouds building, wind picking up."
      : trend === "rising"
        ? " It's rising, which usually means the weather is improving — clearer skies and calmer winds ahead."
        : " It's steady, so conditions should stay much the same for a while."
    : "";
  return {
    title: "Pressure",
    what: "The weight of the atmosphere pressing down. Rising pressure usually means improving weather; falling pressure means weather changes ahead.",
    means: `${Math.round(p)} hPa is ${level}${trendLine}`,
  };
}

export function explainDewPoint(dp: number | undefined): Explainer {
  const d = dp ?? 10;
  const comfort =
    d < 5 ? "dry and crisp — skin and airways will feel it."
    : d < 10 ? "comfortable — barely noticeable."
    : d < 15 ? "starting to feel noticeable, but still pleasant."
    : d < 18 ? "sticky — the air is holding a lot of moisture."
    : d < 21 ? "oppressive — sweat won't evaporate, sleep is uncomfortable."
    : "tropical — actively uncomfortable, dangerous for exertion.";
  return {
    title: "Dew point",
    what: "The temperature the air would have to cool to for water to condense out. It's a truer measure of 'mugginess' than humidity because it's absolute, not relative.",
    means: `${Math.round(d)}° is ${comfort}`,
  };
}

export function explainVisibility(m: number | undefined): Explainer {
  const km = (m ?? 20000) / 1000;
  const feel =
    km < 1 ? "very poor — thick fog. Cars need fog lights, air travel disrupted."
    : km < 4 ? "poor — mist or haze. Distant landmarks disappear, drive with care."
    : km < 10 ? "moderate — a bit hazy but everyday travel is fine."
    : km < 20 ? "good — clear enough to see the horizon comfortably."
    : "excellent — you can see distant hills clearly.";
  return {
    title: "Visibility",
    what: "The furthest distance you can clearly see at ground level. Fog, mist and rain cut it drastically.",
    means: `About ${km.toFixed(km < 10 ? 1 : 0)} km — ${feel}`,
  };
}

export function explainPrecipProb(pct: number): Explainer {
  return {
    title: "Chance of rain",
    what: "Confidence × area: how sure the forecast is that measurable rain will fall × the fraction of the forecast area it'll cover.",
    means: pct >= 80
      ? `${Math.round(pct)}% means the forecast is highly confident rain will fall across most of the area — your exact spot is very likely to get wet.`
      : pct >= 50
        ? `${Math.round(pct)}% means rain is more likely than not — could be a passing shower or something more sustained. Your hyperlocal spot could still stay dry if the band skirts around you.`
        : pct >= 20
          ? `${Math.round(pct)}% means most of the area stays dry, but showers are floating around. Your spot might dodge them entirely.`
          : `${Math.round(pct)}% — vanishingly small chance. Almost nowhere in the area is expected to see rain.`,
  };
}

export function explainCloudCover(total: number, low: number, mid: number, high: number): Explainer {
  const layers: string[] = [];
  if (high >= 20) layers.push(`high cirrus (${Math.round(high)}%) — thin, wispy streaks 6+ km up. Doesn't block much sun on its own but often flags weather changing over the next 24h.`);
  if (mid >= 20) layers.push(`mid altocumulus/altostratus (${Math.round(mid)}%) — the classic 'grey blanket' or sheep-like patches at 2–6 km. Dims the sun but rarely produces rain by itself.`);
  if (low >= 20) layers.push(`low stratus/cumulus (${Math.round(low)}%) — the fluffy or featureless deck below 2 km. This is where actual rain comes from.`);
  return {
    title: "Cloud cover",
    what: "How much of the sky is covered by cloud, split by altitude. Different layers do different jobs — high cirrus flags change, low stratus/cumulus is what actually rains on you.",
    means: layers.length
      ? `Right now: ${layers.join(" ")}`
      : `Only ${Math.round(total)}% cover — practically clear.`,
  };
}

/** Descriptive rainfall band for a given mm/h rate. */
export function rainDescriptor(mmPerHour: number): string {
  if (mmPerHour <= 0) return "not raining";
  if (mmPerHour < 0.5) return "light drizzle — barely wets the pavement";
  if (mmPerHour < 2) return "light rain — patchy dark spots on the pavement";
  if (mmPerHour < 4) return "moderate rain — steady wet, puddles forming";
  if (mmPerHour < 8) return "heavy rain — proper downpour, brolly essential";
  if (mmPerHour < 16) return "very heavy rain — flooding risk";
  return "torrential — dangerous, flash-flood territory";
}

/** Approximate sweat rate under given conditions (litres/hour for moderate exertion). */
export function sweatEstimate(feelsLike: number, humidity: number): { litres: number; note: string } {
  let base = 0.3; // sedentary baseline
  if (feelsLike >= 20) base = 0.5;
  if (feelsLike >= 25) base = 0.9;
  if (feelsLike >= 30) base = 1.3;
  if (feelsLike >= 35) base = 1.7;
  if (humidity >= 70) base *= 1.15;
  if (humidity >= 85) base *= 1.25;
  const litres = Math.round(base * 10) / 10;
  const note =
    litres < 0.4 ? "You'll barely sweat. A normal glass or two of water is plenty."
    : litres < 0.7 ? `About ${litres}L per hour if you're active — sip regularly.`
    : litres < 1.2 ? `Around ${litres}L per hour with activity — carry water, don't wait to be thirsty.`
    : `${litres}L+ per hour — pack extra water and a pinch of salt (isotonic drink if you're exercising).`;
  return { litres, note };
}