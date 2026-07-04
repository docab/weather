import type { LocationConditions } from "@/lib/types";
import { WeatherHero } from "./WeatherHero";
import { HowItFeelsCard } from "./HowItFeelsCard";
import { HourlySlider } from "./HourlySlider";
import { PollenCard } from "./PollenCard";
import { AqiCard } from "./AqiCard";
import { AlertsList } from "./AlertsList";
import { WeatherRadarCard } from "./WeatherRadarCard";
import { AlertsHeroCard } from "./AlertsHeroCard";
import { SuggestionsCard } from "./SuggestionsCard";
import { RainCard } from "./RainCard";
import { MoreCard } from "./MoreCard";

/**
 * The "Now" tab layout. Ordered per product spec:
 * Hero → Alerts → How it feels → Smart alerts → Suggestions → Rain → 24h → Pollen + AQI → More → Radar.
 */
export function LocationView({ conditions }: { conditions: LocationConditions }) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <AlertsHeroCard conditions={conditions} />
      <WeatherHero conditions={conditions} />
      {conditions.weather.alerts.length > 0 && (
        <AlertsList alerts={conditions.weather.alerts} />
      )}
      <HowItFeelsCard conditions={conditions} />
      <SuggestionsCard conditions={conditions} />
      <RainCard conditions={conditions} />
      <HourlySlider conditions={conditions} />
      <div className="grid gap-4 md:grid-cols-2">
        <PollenCard pollen={conditions.pollen} />
        <AqiCard aqi={conditions.aqi} />
      </div>
      <MoreCard conditions={conditions} />
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