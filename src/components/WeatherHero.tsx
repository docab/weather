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
  return (
    <div
      className="glass-card relative overflow-hidden p-6"
      style={dynamicSkyStyle(info.sky, weather.feelsLike)}
    >
      <WeatherFX weather={weather} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/40" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {info.label}
            </div>
            <div className="mt-1 tabular">
              <span className="block text-7xl font-bold leading-none">{Math.round(weather.feelsLike)}°</span>
              <span className="mt-1 block text-[11px] uppercase tracking-widest text-muted-foreground">
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