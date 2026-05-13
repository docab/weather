import type { LocationConditions, Location } from "@/lib/types";
import { describeWeather, dynamicSkyStyle } from "@/lib/weatherCodes";
import { severityRank } from "@/lib/severity";
import { Plane, ThumbsUp, ThumbsDown, Calendar, Loader2 } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";

interface Props {
  locations: Location[];
  queries: UseQueryResult<LocationConditions, unknown>[];
}

/**
 * Travel — ranks the saved places for the next few days, picking
 * the best (and worst) to travel to and packing tips for each.
 */
export function TravelView({ locations, queries }: Props) {
  const ready = queries.every(q => q.data || q.isError);
  const data = queries.map(q => q.data).filter((d): d is LocationConditions => !!d);

  if (!ready && data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-card">
        Add at least two places to compare them for travel.
      </div>
    );
  }

  const ranked = [...data].map(d => ({ d, score: scoreLocation(d) })).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const avoid = ranked[ranked.length - 1];

  // Best day across all places (next 7 days)
  const dayPicks = pickBestDays(data);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Travel suggestions
      </div>

      <Headline
        kind="best"
        location={best.d}
        reason={whyGood(best.d)}
      />
      <Headline
        kind="avoid"
        location={avoid.d}
        reason={whyBad(avoid.d)}
      />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          Best days, by place
        </div>
        <ul className="space-y-2">
          {dayPicks.map(({ loc, day, dayLabel }) => (
            <li key={loc.location.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/40 p-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{loc.location.name}</div>
                <div className="text-xs text-muted-foreground">
                  {dayLabel} looks the pick — {Math.round(day.high)}°/{Math.round(day.low)}°, {Math.round(day.precipProb)}% rain
                </div>
              </div>
              <div className="text-xs text-foreground/85">{describeWeather(day.weatherCode, true).short}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Plane className="h-3.5 w-3.5 text-primary" />
          Packing notes
        </div>
        <ul className="space-y-3">
          {ranked.map(({ d }) => (
            <li key={d.location.id} className="rounded-xl bg-secondary/40 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-sm font-semibold">{d.location.name}</div>
                <div className="text-[11px] text-muted-foreground">{describeWeather(d.weather.weatherCode, d.weather.isDay).short}</div>
              </div>
              <p className="mt-1 text-xs text-foreground/85">{packingFor(d)}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Headline({ kind, location, reason }: { kind: "best" | "avoid"; location: LocationConditions; reason: string }) {
  const info = describeWeather(location.weather.weatherCode, location.weather.isDay);
  const Icon = kind === "best" ? ThumbsUp : ThumbsDown;
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border p-5 shadow-card"
      style={dynamicSkyStyle(info.sky, location.weather.feelsLike)}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-transparent" />
      <div className="relative flex items-start gap-4">
        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/40">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {kind === "best" ? "Go here" : "Maybe skip"}
          </div>
          <div className="mt-0.5 text-lg font-bold">
            {location.location.name}
            {location.location.country && <span className="text-sm font-normal text-foreground/70"> · {location.location.country}</span>}
          </div>
          <p className="mt-1 text-sm text-foreground/90">{reason}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Higher score = better to travel to right now.
 * Mild/warm temps, low rain, low wind, low pollen/AQI.
 */
function scoreLocation(d: LocationConditions): number {
  const { weather, pollen, aqi } = d;
  let s = 100;
  // Rain
  s -= weather.precipProb * 0.4;
  // Temperature comfort: ideal ~18-24
  const t = weather.feelsLike;
  s -= Math.max(0, Math.abs(t - 21) - 3) * 1.5;
  // Wind
  s -= Math.max(0, weather.windSpeed - 15) * 0.6;
  // Air & pollen
  s -= severityRank[aqi.level] * 6;
  s -= severityRank[pollen.level] * 4;
  // Cloud — bonus for sun
  s -= Math.max(0, weather.cloudCover - 50) * 0.1;
  return s;
}

function whyGood(d: LocationConditions): string {
  const t = d.weather.feelsLike;
  const bits: string[] = [];
  if (d.weather.precipProb < 30) bits.push("dry");
  if (t >= 18 && t <= 25) bits.push("a really comfortable temperature");
  else if (t >= 12) bits.push("mild");
  if (d.weather.cloudCover < 40) bits.push("plenty of sunshine");
  if (d.weather.windSpeed < 15) bits.push("light wind");
  if (severityRank[d.aqi.level] <= 1) bits.push("clean air");
  const list = bits.length ? bits.join(", ") : "the best of your saved places";
  return `Of your places, this one's the pick right now — ${list}. Pack normal day clothes and go.`;
}

function whyBad(d: LocationConditions): string {
  const reasons: string[] = [];
  if (d.weather.precipProb >= 60) reasons.push("it's properly wet");
  if (d.weather.feelsLike < 5) reasons.push("biting cold");
  if (d.weather.feelsLike > 30) reasons.push("uncomfortably hot");
  if (d.weather.windSpeed >= 25) reasons.push("very windy");
  if (severityRank[d.aqi.level] >= 2) reasons.push("the air's not great");
  if (severityRank[d.pollen.level] >= 2) reasons.push("pollen's high");
  if (!reasons.length) reasons.push("it's just the least pleasant of the bunch right now");
  return `Of your places, ${d.location.name} is the rough one — ${reasons.join(", ")}. Worth waiting it out a day or two.`;
}

function pickBestDays(all: LocationConditions[]) {
  return all.map(loc => {
    let bestIdx = 0;
    let bestScore = -Infinity;
    loc.weather.daily.forEach((d, i) => {
      let s = 0;
      s -= d.precipProb * 0.5;
      s -= Math.max(0, Math.abs(d.high - 22) - 3);
      s -= Math.max(0, d.windMax - 20) * 0.5;
      if (s > bestScore) { bestScore = s; bestIdx = i; }
    });
    const day = loc.weather.daily[bestIdx];
    const dayLabel = bestIdx === 0 ? "Today" : bestIdx === 1 ? "Tomorrow" :
      new Date(day.date).toLocaleDateString(undefined, { weekday: "long" });
    return { loc, day, dayLabel };
  });
}

function packingFor(d: LocationConditions): string {
  const t = d.weather.feelsLike;
  const wet = d.weather.precipProb >= 40;
  const bits: string[] = [];
  if (t < 5) bits.push("heavy coat, hat, gloves");
  else if (t < 12) bits.push("warm jacket, layers");
  else if (t < 20) bits.push("light jacket or jumper");
  else if (t < 26) bits.push("t-shirts, light layers");
  else bits.push("breathable summer clothes, sunhat");
  if (wet) bits.push("waterproof shell");
  if (d.weather.uvIndex >= 6) bits.push("sunscreen and shades");
  if (severityRank[d.pollen.level] >= 2) bits.push("antihistamines");
  return bits.join(", ") + ".";
}