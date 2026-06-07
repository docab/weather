import type { LocationConditions } from "@/lib/types";
import { WeatherHero } from "./WeatherHero";
import { NarrativeCard } from "./NarrativeCard";
import { HourlyStrip } from "./HourlyStrip";
import { PollenCard } from "./PollenCard";
import { AqiCard } from "./AqiCard";
import { AlertsList } from "./AlertsList";
import { WeatherRadarCard } from "./WeatherRadarCard";
import { NowcastStrip } from "./NowcastStrip";
import { SmartAlertsCard } from "./SmartAlertsCard";

export function LocationView({ conditions }: { conditions: LocationConditions }) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <WeatherHero conditions={conditions} />
      {conditions.weather.alerts.length > 0 && (
        <AlertsList alerts={conditions.weather.alerts} />
      )}
      <NarrativeCard conditions={conditions} />
      <HourlyStrip weather={conditions.weather} />
      <NowcastStrip conditions={conditions} />
      <SmartAlertsCard conditions={conditions} />
      <div className="grid gap-4 md:grid-cols-2">
        <PollenCard pollen={conditions.pollen} />
        <AqiCard aqi={conditions.aqi} />
      </div>
      <WeatherRadarCard conditions={conditions} />
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