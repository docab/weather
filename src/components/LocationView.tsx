import type { LocationConditions } from "@/lib/types";
import { WeatherHero } from "./WeatherHero";
import { NarrativeCard } from "./NarrativeCard";
import { HourlyStrip } from "./HourlyStrip";
import { PollenCard } from "./PollenCard";
import { AqiCard } from "./AqiCard";
import { AlertsList } from "./AlertsList";
import { SkyNowCard } from "./SkyNowCard";
import { WeatherRadarCard } from "./WeatherRadarCard";
import { NowcastStrip } from "./NowcastStrip";

export function LocationView({ conditions }: { conditions: LocationConditions }) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <WeatherHero conditions={conditions} />
      {conditions.weather.alerts.length > 0 && (
        <AlertsList alerts={conditions.weather.alerts} />
      )}
      <NarrativeCard conditions={conditions} />
      <NowcastStrip conditions={conditions} />
      <WeatherRadarCard conditions={conditions} />
      <SkyNowCard conditions={conditions} />
      <HourlyStrip weather={conditions.weather} />
      <div className="grid gap-4 md:grid-cols-2">
        <PollenCard pollen={conditions.pollen} />
        <AqiCard aqi={conditions.aqi} />
      </div>
    </div>
  );
}

export function LocationViewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-56 animate-pulse rounded-2xl bg-card" />
      <div className="h-44 animate-pulse rounded-2xl bg-card" />
      <div className="h-24 animate-pulse rounded-2xl bg-card" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-72 animate-pulse rounded-2xl bg-card" />
        <div className="h-72 animate-pulse rounded-2xl bg-card" />
      </div>
    </div>
  );
}