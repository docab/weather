import type { LocationConditions, Location } from "@/lib/types";
import { describeWeather, dynamicSkyStyle } from "@/lib/weatherCodes";
import { aqiLabel, severityLabel } from "@/lib/severity";
import { SeverityBadge } from "./SeverityBadge";
import { MapPin, Locate, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UseQueryResult } from "@tanstack/react-query";
import { LocationsMapCard } from "./LocationsMapCard";

interface Props {
  locations: Location[];
  queries: UseQueryResult<LocationConditions, unknown>[];
  onOpenLocation: (id: string) => void;
}

/**
 * Briefing — at-a-glance live snapshot for every saved place.
 * Tap a card to jump into its full Today view.
 */
export function BriefingView({ locations, queries, onOpenLocation }: Props) {
  if (!locations.length) return null;
  return (
    <div className="space-y-3 animate-fade-in-up">
      <LocationsMapCard locations={locations} onSelect={onOpenLocation} />
      <div className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Right now · across your places
      </div>
      {locations.map((loc, i) => {
        const q = queries[i];
        return (
          <BriefingRow
            key={loc.id}
            location={loc}
            data={q?.data}
            loading={q?.isLoading}
            error={q?.isError}
            onClick={() => onOpenLocation(loc.id)}
          />
        );
      })}
    </div>
  );
}

function BriefingRow({
  location, data, loading, error, onClick,
}: {
  location: Location;
  data?: LocationConditions;
  loading?: boolean;
  error?: boolean;
  onClick: () => void;
}) {
  if (loading) {
    return (
      <div className="flex h-28 items-center justify-center glass-card text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" /> Couldn't load {location.name}
      </div>
    );
  }

  const { weather, pollen, aqi } = data;
  const info = describeWeather(weather.weatherCode, weather.isDay);
  const SkyIcon = info.Icon;

  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl border border-border p-4 text-left shadow-card transition-transform hover:-translate-y-0.5"
      style={dynamicSkyStyle(info.sky, weather.feelsLike, {
        windSpeed: weather.windSpeed, humidity: weather.humidity,
        cloudCover: weather.cloudCover, uvIndex: weather.uvIndex, isDay: weather.isDay,
      })}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-transparent" />
      <div className="relative flex items-center gap-4">
        <SkyIcon className="h-12 w-12 shrink-0 text-foreground/85" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {location.isAutoDetected
              ? <Locate className="h-3 w-3" />
              : <MapPin className="h-3 w-3" />}
            <span className="truncate">
              {location.customName || location.name}
              {location.customName
                ? <span className="opacity-60"> · {location.name}</span>
                : location.country && <span className="opacity-60"> · {location.country}</span>}
            </span>
          </div>
          <div className="mt-0.5 flex items-baseline gap-2 tabular">
            <span className="text-3xl font-bold leading-none">{Math.round(weather.feelsLike)}°</span>
            <span className="text-xs text-muted-foreground">feels · {info.short.toLowerCase()}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-foreground/85">
            {firstSentence(data.narrative)}
          </p>
        </div>
        <div className="hidden flex-col items-end gap-1 sm:flex">
          <SeverityBadge level={pollen.level} label={`Pollen ${severityLabel[pollen.level]}`} size="sm" />
          <SeverityBadge level={aqi.level} label={`AQI ${aqiLabel(aqi.index)}`} size="sm" />
        </div>
        <ArrowRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", "group-hover:translate-x-0.5")} />
      </div>
      {/* Mobile severity row */}
      <div className="relative mt-3 flex gap-2 sm:hidden">
        <SeverityBadge level={pollen.level} label={`Pollen ${severityLabel[pollen.level]}`} size="sm" />
        <SeverityBadge level={aqi.level} label={`AQI ${aqiLabel(aqi.index)}`} size="sm" />
      </div>
    </button>
  );
}

function firstSentence(s: string): string {
  const m = s.match(/^[^.!?]+[.!?]/);
  return m ? m[0] : s;
}