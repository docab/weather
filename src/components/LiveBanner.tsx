import { Activity, MapPin, Wind } from "lucide-react";
import type { LocationConditions } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";
import { describeWeather } from "@/lib/weatherCodes";
import { aqiLabel, severityLabel } from "@/lib/severity";

interface Props {
  conditions: LocationConditions;
}

export function LiveBanner({ conditions }: Props) {
  const { weather, pollen, aqi, location } = conditions;
  const info = describeWeather(weather.weatherCode, weather.isDay);
  const SkyIcon = info.Icon;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card-elevated/80 px-4 py-3 shadow-card backdrop-blur-xl">
      <div className="absolute -top-1 left-3 flex items-center gap-1.5 rounded-b-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
        <Activity className="h-2.5 w-2.5 animate-pulse-glow" /> Live
      </div>
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <SkyIcon className="h-9 w-9 text-foreground/85" strokeWidth={1.6} />
          <div>
            <div className="flex items-baseline gap-1.5 tabular">
              <span className="text-2xl font-bold leading-none">{Math.round(weather.feelsLike)}°</span>
              <span className="text-xs text-muted-foreground">feels · {Math.round(weather.temp)}° actual</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {location.name}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <SeverityBadge level={pollen.level} label={`Pollen ${severityLabel[pollen.level]}`} size="sm" />
          <SeverityBadge level={aqi.level} label={`AQI ${aqiLabel(aqi.index)}`} size="sm" />
        </div>
      </div>
      {weather.windGust >= 30 && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Wind className="h-3 w-3" />
          Gusts {Math.round(weather.windGust)} mph
        </div>
      )}
    </div>
  );
}