import type { LocationConditions } from "@/lib/types";
import { describeWeather, skyOnlyStyle, sunPhaseOf, gradientInk } from "@/lib/weatherCodes";
import { CloudRain, Wind, Droplets, Sun, ArrowDown, ArrowUp, ChevronsDown } from "lucide-react";
import { WeatherFX, AnimatedSun, AnimatedMoon } from "./fx/WeatherFX";
import { getMoonPhase } from "@/lib/astronomy";
import { WindBranchFX } from "./fx/WindBranchFX";

export function WeatherHero({ conditions }: { conditions: LocationConditions }) {
  const { weather } = conditions;
  const info = describeWeather(weather.weatherCode, weather.isDay);
  const SkyIcon = info.Icon;
  const isClear = info.sky === "clear";
  const phase = getMoonPhase(new Date());
  const phaseOverlay = sunPhaseOverlay(weather);
  const solar = sunPhaseOf(Date.now(), weather.daily?.[0]?.sunrise, weather.daily?.[0]?.sunset, weather.isDay);
  // Hero colour = what the sky looks like, NOT how warm it is.
  const skyStyle = skyOnlyStyle(info.sky, {
    cloudCover: weather.cloudCover,
    precipMm: weather.precipMm,
    precipProb: weather.precipProb,
    phase: solar,
  });
  const ink = gradientInk(skyStyle);
  return (
    <div
      className={`glass-card relative flex h-[calc(100dvh-19.5rem)] min-h-[22rem] flex-col overflow-hidden p-6 ${ink === "dark" ? "ink-dark" : "ink-light"}`}
    >
      <div className="pointer-events-none absolute inset-0" style={skyStyle} />
      <WeatherFX weather={weather} />
      {/* Frosted branch: sways with wind speed, always drawn behind text. */}
      <WindBranchFX mph={weather.windSpeed} latitude={conditions.location.latitude} />
      {/* Time-of-day overlay — dawn / dusk warm wash, deep-night cool wash. */}
      {phaseOverlay && (
        <div className="pointer-events-none absolute inset-0" style={{ background: phaseOverlay }} />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent" />
      <div className={`relative flex flex-1 flex-col ${ink === "light" ? "[text-shadow:0_1px_3px_rgb(0_0_0_/_0.45)]" : "[text-shadow:0_1px_2px_rgb(255_255_255_/_0.35)]"}`}>
        <div className="flex items-start justify-between gap-3 pt-1">
          <div>
            {/* Only the condition label sits at the top — no stacked descriptors. */}
            <div className="text-3xl font-bold leading-tight tracking-tight">{info.label}</div>
            <div className="mt-4 tabular">
              <span className="block text-sm font-semibold uppercase tracking-[0.18em] text-foreground/85">
                Feels like
              </span>
              <span className="block text-7xl font-bold leading-none">{Math.round(weather.feelsLike)}°</span>
              <span className="mt-1 block text-sm text-foreground/80">
                Actual air temp <span className="font-semibold tabular">{Math.round(weather.temp)}°</span>
              </span>
            </div>
          </div>
          <div className="flex h-24 w-24 items-center justify-center">
            {isClear && weather.isDay
              ? <AnimatedSun size={96} warm={weather.feelsLike >= 22} />
              : isClear && !weather.isDay
                ? <AnimatedMoon size={88} illumination={phase.illumination} phase={phase.phase} />
                : <SkyIcon className="h-24 w-24 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]" strokeWidth={1.4} />}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1 tabular">
            <ArrowUp className="h-3.5 w-3.5" /> {Math.round(weather.high)}°
          </span>
          <span className="inline-flex items-center gap-1 tabular">
            <ArrowDown className="h-3.5 w-3.5" /> {Math.round(weather.low)}°
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          <Stat icon={<CloudRain className="h-4 w-4" />} label="Rain" value={`${Math.round(weather.precipProb)}%`} note={rainWord(weather)} anchor="rain" />
          <Stat icon={<Wind className="h-4 w-4" />} label="Wind" value={`${Math.round(weather.windSpeed)} mph`} note={windWord(weather.windSpeed)} anchor="more" />
          <Stat icon={<Droplets className="h-4 w-4" />} label="Humidity" value={`${Math.round(weather.humidity)}%`} note={humidityWord(weather.humidity)} anchor="more" />
          <Stat icon={<Sun className="h-4 w-4" />} label="UV" value={String(Math.round(weather.uvIndex))} note={uvWord(weather.uvIndex)} anchor="suggestions" />
        </div>

        {/* Scroll cue — the hero fills the screen, so tell people there's more. */}
        <button
          type="button"
          onClick={() => document.getElementById("feels")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="mx-auto mt-auto flex flex-col items-center gap-0.5 pt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/75"
        >
          Scroll for the day
          <ChevronsDown className="h-4 w-4 animate-bounce" />
        </button>
      </div>
    </div>
  );
}

/* One-word descriptors, now shown inside their own metric tile. */
function rainWord(w: LocationConditions["weather"]): string {
  const mm = w.precipMm ?? 0;
  const prob = w.precipProb ?? 0;
  if (mm > 8) return "Downpour";
  if (mm >= 2) return "Showers";
  if (mm >= 0.5) return "Light drizzle";
  if (mm > 0) return "Mist";
  if (prob >= 70) return "Showers likely";
  if (prob >= 40) return "Drizzle possible";
  if (prob > 0) return "Mostly dry";
  return "No rain";
}
function windWord(mph: number): string {
  if (mph >= 47) return "Storm force";
  if (mph >= 35) return "Gale";
  if (mph >= 25) return "Blustery";
  if (mph >= 16) return "Breezy";
  if (mph >= 8) return "Light breeze";
  if (mph >= 3) return "Calm";
  return "Still";
}
function humidityWord(h: number): string {
  if (h >= 88) return "Sticky";
  if (h >= 80) return "Muggy";
  if (h >= 65) return "Damp air";
  if (h >= 45) return "Comfy";
  if (h >= 30) return "Crisp";
  return "Dry air";
}
function uvWord(uv: number): string {
  if (uv >= 11) return "Extreme";
  if (uv >= 8) return "Harsh";
  if (uv >= 6) return "High";
  if (uv >= 3) return "Moderate";
  if (uv >= 1) return "Low";
  return "None";
}

/**
 * Compute a soft warm/cool overlay based on how close the current time is to
 * sunrise or sunset (within ~90 min on either side). Returns a CSS gradient
 * string or null when no overlay is needed.
 */
function sunPhaseOverlay(w: LocationConditions["weather"]): string | null {
  const sunrise = w.daily?.[0]?.sunrise;
  const sunset = w.daily?.[0]?.sunset;
  if (!sunrise || !sunset) return null;
  const now = Date.now();
  const sr = new Date(sunrise).getTime();
  const ss = new Date(sunset).getTime();
  const win = 90 * 60 * 1000; // 90 min

  // 0 = right at the event, 1 = at the edge of the window.
  const distSr = Math.abs(now - sr) / win;
  const distSs = Math.abs(now - ss) / win;

  if (distSr <= 1) {
    const k = 1 - distSr; // strength
    // Dawn: cool pre-dawn purple bottom → warm peach top.
    return `linear-gradient(180deg, hsl(28 95% 65% / ${0.10 + k * 0.32}) 0%, hsl(18 90% 55% / ${0.06 + k * 0.18}) 38%, transparent 70%)`;
  }
  if (distSs <= 1) {
    const k = 1 - distSs;
    // Dusk: amber → magenta-tinted horizon, but using only red/orange (no purple).
    return `linear-gradient(180deg, hsl(34 90% 55% / ${0.08 + k * 0.20}) 0%, hsl(14 92% 50% / ${0.10 + k * 0.34}) 55%, hsl(232 50% 14% / ${k * 0.25}) 100%)`;
  }
  // Deep night — extra navy wash to deepen the sky.
  if (!w.isDay && now > ss + win && now < sr - win) {
    return "linear-gradient(180deg, hsl(232 55% 8% / 0.35) 0%, hsl(228 60% 6% / 0.45) 100%)";
  }
  return null;
}

function Stat({ icon, label, value, note, anchor }: { icon: React.ReactNode; label: string; value: string; note?: string; anchor?: string }) {
  const onClick = anchor ? () => {
    const el = document.getElementById(anchor);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  } : undefined;
  return (
    <button onClick={onClick} type="button" className="glass-tile p-3 text-left transition hover:scale-[1.04]">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 text-base font-bold tabular">{value}</div>
      {note && (
        <div className="text-[10px] font-semibold leading-tight text-foreground/75">{note}</div>
      )}
    </button>
  );
}