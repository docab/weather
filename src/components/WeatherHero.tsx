import type { LocationConditions } from "@/lib/types";
import { describeWeather, dynamicSkyStyle } from "@/lib/weatherCodes";
import { CloudRain, Wind, Droplets, Sun, ArrowDown, ArrowUp } from "lucide-react";

export function WeatherHero({ conditions }: { conditions: LocationConditions }) {
  const { weather } = conditions;
  const info = describeWeather(weather.weatherCode, weather.isDay);
  const SkyIcon = info.Icon;
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border p-6 shadow-card"
      style={dynamicSkyStyle(info.sky, weather.feelsLike)}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/30" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {info.label}
            </div>
            <div className="mt-1 flex items-baseline gap-3 tabular">
              <span className="text-7xl font-bold leading-none">{Math.round(weather.feelsLike)}°</span>
              <div className="flex flex-col text-xs text-muted-foreground">
                <span>feels like</span>
                <span className="text-sm font-semibold text-foreground/90">actual {Math.round(weather.temp)}°</span>
              </div>
            </div>
          </div>
          <SkyIcon className="h-20 w-20 text-foreground/85 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]" strokeWidth={1.4} />
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
    <div className="rounded-xl bg-background/30 p-3 backdrop-blur">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 text-base font-bold tabular">{value}</div>
    </div>
  );
}