import type { LocationConditions } from "@/lib/types";
import { describeWeather, dynamicSkyStyle } from "@/lib/weatherCodes";
import { CloudRain, Wind, Droplets, Sun, ArrowDown, ArrowUp } from "lucide-react";
import { WeatherFX, AnimatedSun, AnimatedMoon } from "./fx/WeatherFX";
import { getMoonPhase } from "@/lib/astronomy";

export function WeatherHero({ conditions }: { conditions: LocationConditions }) {
  const { weather } = conditions;
  const info = describeWeather(weather.weatherCode, weather.isDay);
  const SkyIcon = info.Icon;
  const isClear = info.sky === "clear";
  const phase = getMoonPhase(new Date());
  const phaseOverlay = sunPhaseOverlay(weather);
  return (
    <div
      className="glass-card relative overflow-hidden p-6"
      style={dynamicSkyStyle(info.sky, weather.feelsLike, {
        windSpeed: weather.windSpeed,
        humidity: weather.humidity,
        cloudCover: weather.cloudCover,
        uvIndex: weather.uvIndex,
        isDay: weather.isDay,
      })}
    >
      <WeatherFX weather={weather} />
      {/* Time-of-day overlay — dawn / dusk warm wash, deep-night cool wash. */}
      {phaseOverlay && (
        <div className="pointer-events-none absolute inset-0" style={{ background: phaseOverlay }} />
      )}
      {/* Legibility scrim — darker around the text, transparent at the top.
          Without this, big text disappears on the cream/butter mid-range. */}
      <div className="pointer-events-none absolute inset-x-0 top-1/3 bottom-0 bg-gradient-to-b from-transparent via-background/25 to-background/55" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent" />
      <div className="relative [text-shadow:0_1px_2px_rgb(0_0_0_/_0.35)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-foreground/85">
              {info.label}
            </div>
            <div className="mt-1 tabular">
              <span className="block text-7xl font-bold leading-none">{Math.round(weather.feelsLike)}°</span>
              <span className="mt-1 block text-[11px] uppercase tracking-widest text-foreground/75">
                Feels like
              </span>
              <span className="mt-1 block text-sm text-foreground/70">
                Actual <span className="font-semibold tabular text-foreground/90">{Math.round(weather.temp)}°</span>
              </span>
            </div>
          </div>
          <div className="flex h-20 w-20 items-center justify-center text-foreground/85">
            {isClear && weather.isDay
              ? <AnimatedSun size={80} warm={weather.feelsLike >= 22} />
              : isClear && !weather.isDay
                ? <AnimatedMoon size={72} illumination={phase.illumination} phase={phase.phase} />
                : <SkyIcon className="h-20 w-20 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]" strokeWidth={1.4} />}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1 text-foreground/80 tabular">
            <ArrowUp className="h-3.5 w-3.5" /> {Math.round(weather.high)}°
          </span>
          <span className="inline-flex items-center gap-1 text-foreground/80 tabular">
            <ArrowDown className="h-3.5 w-3.5" /> {Math.round(weather.low)}°
          </span>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3">
          <Stat icon={<CloudRain className="h-4 w-4" />} label="Rain" value={`${Math.round(weather.precipProb)}%`} />
          <Stat icon={<Wind className="h-4 w-4" />} label="Wind" value={`${Math.round(weather.windSpeed)} mph`} />
          <Stat icon={<Droplets className="h-4 w-4" />} label="Humidity" value={`${Math.round(weather.humidity)}%`} />
          <Stat icon={<Sun className="h-4 w-4" />} label="UV" value={String(Math.round(weather.uvIndex))} />
        </div>
      </div>
    </div>
  );
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

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-tile p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 text-base font-bold tabular">{value}</div>
    </div>
  );
}