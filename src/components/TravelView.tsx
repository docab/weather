import { useState, useMemo } from "react";
import type { LocationConditions, Location } from "@/lib/types";
import { describeWeather, dynamicSkyStyle } from "@/lib/weatherCodes";
import { severityRank } from "@/lib/severity";
import { Plane, Calendar, Loader2, MapPin, Locate, Train, Backpack, Sparkles, Route } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";

interface Props {
  locations: Location[];
  queries: UseQueryResult<LocationConditions, unknown>[];
}

/**
 * Travel — pick a destination and we'll plan the trip:
 * what to pack, weather expectations, route options (incl. public transport)
 * and things to do on arrival. Origin = your detected location, or the first
 * saved place if location is off.
 */
export function TravelView({ locations, queries }: Props) {
  const ready = queries.every(q => q.data || q.isError);
  const data = queries.map(q => q.data).filter((d): d is LocationConditions => !!d);

  // Default origin is auto-detected (first), default destination is the next saved place
  const origin = data[0];
  const others = data.slice(1);
  const [destId, setDestId] = useState<string>(() => others[0]?.location.id || "");
  const destination = useMemo(() => data.find(d => d.location.id === destId), [data, destId]);

  if (!ready && data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center glass-card text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }
  if (!origin || others.length === 0) {
    return (
      <div className="glass-card p-5 text-sm text-muted-foreground shadow-card">
        Add another place to plan a trip from {origin ? displayName(origin.location) : "your current location"}.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Trip planner
      </div>

      {/* Route header */}
      <RouteHeader origin={origin} destination={destination} />

      {/* Destination chooser */}
      <div className="glass-card p-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Going to
        </div>
        <div className="-mx-1 flex flex-wrap gap-2">
          {others.map(o => (
            <button
              key={o.location.id}
              onClick={() => setDestId(o.location.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all ${
                o.location.id === destId
                  ? "border-primary/50 bg-primary/15 text-primary shadow-glow"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapPin className="h-3 w-3" />
              <span className="flex flex-col items-start leading-tight">
                <span className="font-semibold">{displayName(o.location)}</span>
                {o.location.customName && <span className="text-[9px] opacity-60">{o.location.name}</span>}
              </span>
            </button>
          ))}
        </div>
      </div>

      {!destination ? (
        <div className="glass-card p-5 text-sm text-muted-foreground">Pick a destination above.</div>
      ) : (
        <>
          {/* Weather expectations on arrival */}
          <SectionCard icon={<Sparkles className="h-3.5 w-3.5 text-primary" />} title="What you'll find on arrival">
            <p className="text-sm leading-relaxed text-foreground/95">
              {weatherStory(destination)}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              <MiniStat label="Feels" value={`${Math.round(destination.weather.feelsLike)}°`} />
              <MiniStat label="Rain" value={`${Math.round(destination.weather.precipProb)}%`} />
              <MiniStat label="Wind" value={`${Math.round(destination.weather.windSpeed)}mph`} />
            </div>
          </SectionCard>

          {/* 7-day window — best day to go */}
          <SectionCard icon={<Calendar className="h-3.5 w-3.5 text-primary" />} title="Best day in the next week">
            <p className="text-sm leading-relaxed text-foreground/95">
              {bestDayStory(destination)}
            </p>
          </SectionCard>

          {/* Packing */}
          <SectionCard icon={<Backpack className="h-3.5 w-3.5 text-primary" />} title="What to pack">
            <ul className="space-y-1.5 text-sm text-foreground/90">
              {packingList(origin, destination).map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* Route — generic distance + suggestions for travelling there */}
          <SectionCard icon={<Route className="h-3.5 w-3.5 text-primary" />} title="Getting there">
            <p className="text-sm leading-relaxed text-foreground/95">{routeStory(origin, destination)}</p>
            <div className="mt-3 space-y-2">
              {transportOptions(origin, destination).map(o => (
                <div key={o.mode} className="flex items-start gap-3 rounded-xl bg-secondary/40 p-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-background/60 text-primary">
                    {o.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wider text-foreground/90">{o.mode}</div>
                    <div className="text-xs text-foreground/80">{o.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Things to do */}
          <SectionCard icon={<Plane className="h-3.5 w-3.5 text-primary" />} title="Things to do once you're there">
            <ul className="space-y-1.5 text-sm text-foreground/90">
              {thingsToDo(destination).map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </>
      )}
    </div>
  );
}

function RouteHeader({ origin, destination }: { origin: LocationConditions; destination?: LocationConditions }) {
  const info = describeWeather(
    (destination ?? origin).weather.weatherCode,
    (destination ?? origin).weather.isDay,
  );
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border p-5 shadow-card"
      style={(() => {
        const w = (destination ?? origin).weather;
        return dynamicSkyStyle(info.sky, w.feelsLike, {
          windSpeed: w.windSpeed, humidity: w.humidity,
          cloudCover: w.cloudCover, uvIndex: w.uvIndex, isDay: w.isDay,
        });
      })()}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-transparent" />
      <div className="relative flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1.5">
          {origin.location.isAutoDetected ? <Locate className="h-4 w-4 text-primary" /> : <MapPin className="h-4 w-4 text-primary" />}
          <div className="flex flex-col leading-tight">
            <span className="font-semibold">{displayName(origin.location)}</span>
            {origin.location.customName && <span className="text-[10px] opacity-60">{origin.location.name}</span>}
          </div>
        </div>
        <span className="text-muted-foreground">→</span>
        <div className="flex items-center gap-1.5">
          <Plane className="h-4 w-4 text-primary" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold">{destination ? displayName(destination.location) : "Pick a place"}</span>
            {destination?.location.customName && <span className="text-[10px] opacity-60">{destination.location.name}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {icon}{title}
      </div>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-bold tabular">{value}</div>
    </div>
  );
}

function displayName(l: Location): string { return l.customName || l.name; }

// ----- Stories & lists -----

function weatherStory(d: LocationConditions): string {
  const info = describeWeather(d.weather.weatherCode, d.weather.isDay);
  const t = Math.round(d.weather.feelsLike);
  const rain = Math.round(d.weather.precipProb);
  const wind = Math.round(d.weather.windSpeed);
  const bits = [`${displayName(d.location)} is ${info.short.toLowerCase()} and feels like ${t}°`];
  if (rain >= 60) bits.push(`expect proper wet weather (${rain}% rain)`);
  else if (rain >= 30) bits.push(`there's a chance of showers (${rain}%)`);
  else bits.push(`largely dry`);
  if (wind >= 25) bits.push(`and pretty blustery (${wind} mph wind)`);
  else if (wind >= 15) bits.push(`with a breeze`);
  if (severityRank[d.aqi.level] >= 2) bits.push(`— air quality isn't great either`);
  if (severityRank[d.pollen.level] >= 2) bits.push(`— and pollen's running high`);
  return bits.join(", ") + ".";
}

function bestDayStory(d: LocationConditions): string {
  let bestIdx = 0; let bestScore = -Infinity;
  d.weather.daily.forEach((day, i) => {
    let s = 0;
    s -= day.precipProb * 0.5;
    s -= Math.max(0, Math.abs(day.high - 22) - 3);
    s -= Math.max(0, day.windMax - 20) * 0.5;
    if (s > bestScore) { bestScore = s; bestIdx = i; }
  });
  const day = d.weather.daily[bestIdx];
  const label = bestIdx === 0 ? "Today" : bestIdx === 1 ? "Tomorrow"
    : new Date(day.date).toLocaleDateString(undefined, { weekday: "long" });
  const info = describeWeather(day.weatherCode, true);
  return `${label} is the pick — ${info.short.toLowerCase()}, ${Math.round(day.high)}°/${Math.round(day.low)}° with ${Math.round(day.precipProb)}% rain. If your dates are flexible, aim for that.`;
}

function packingList(origin: LocationConditions, dest: LocationConditions): string[] {
  const tHere = origin.weather.feelsLike;
  const tThere = dest.weather.feelsLike;
  const out: string[] = [];
  if (tThere < 0) out.push("Heavy coat, thermal layers, hat, gloves, scarf — it's properly cold there.");
  else if (tThere < 8) out.push("Warm coat, gloves, a hat. Layer up — daytime is chilly, evenings colder.");
  else if (tThere < 15) out.push("A jacket and a jumper. Comfortable for the day, warm for evenings.");
  else if (tThere < 22) out.push("Light layers — long sleeves with a light jacket for evenings.");
  else if (tThere < 28) out.push("T-shirts, light trousers or shorts. A thin jumper for air-con or nights.");
  else out.push("Light, breathable clothing. Linen or cotton, plus a sun hat.");

  if (dest.weather.precipProb >= 40 || dest.weather.daily.some(d => d.precipProb >= 60))
    out.push("Waterproof jacket and shoes — it'll rain at some point.");
  if (dest.weather.uvIndex >= 6) out.push("Sunscreen (SPF 30+), sunglasses, and a hat — UV is strong.");
  if (severityRank[dest.pollen.level] >= 2) out.push("Antihistamines — pollen counts are high there.");
  if (severityRank[dest.aqi.level] >= 2) out.push("A spare FFP2/N95 mask — air quality dips.");
  if (Math.abs(tThere - tHere) >= 10)
    out.push(`Pack for a big temperature swing — ${Math.round(tHere)}° here vs ${Math.round(tThere)}° there.`);
  out.push("Power bank, adaptor for the country, and a refillable water bottle.");
  return out;
}

function routeStory(origin: LocationConditions, dest: LocationConditions): string {
  const km = haversineKm(origin.location, dest.location);
  const sameCountry = origin.location.countryCode && origin.location.countryCode === dest.location.countryCode;
  if (km < 30) return `It's about ${Math.round(km)} km — practically next door. Easiest by car or local train.`;
  if (km < 200) return `Roughly ${Math.round(km)} km. A train or drive should land you there inside a few hours.`;
  if (km < 800 && sameCountry) return `Around ${Math.round(km)} km — a longer intercity train or a half-day drive.`;
  if (km < 1500) return `It's about ${Math.round(km)} km — flying will be quickest, but a sleeper train or coach is doable.`;
  return `Long haul: ~${Math.round(km)} km. Flying is the realistic option; book ahead and check transit visas if any.`;
}

function transportOptions(origin: LocationConditions, dest: LocationConditions): { mode: string; detail: string; icon: React.ReactNode }[] {
  const km = haversineKm(origin.location, dest.location);
  const opts: { mode: string; detail: string; icon: React.ReactNode }[] = [];
  const ic = (k: "train" | "plane" | "route") =>
    k === "train" ? <Train className="h-4 w-4" /> : k === "plane" ? <Plane className="h-4 w-4" /> : <Route className="h-4 w-4" />;

  if (km < 5) {
    opts.push({ mode: "Walk / cycle", detail: "Under 5 km — easily walkable, faster on a bike.", icon: ic("route") });
    opts.push({ mode: "Bus or metro", detail: "Hop on the nearest line — under 15 minutes most of the time.", icon: ic("train") });
  } else if (km < 50) {
    opts.push({ mode: "Local train / metro", detail: "Check the regional rail or metro network — usually the quickest option.", icon: ic("train") });
    opts.push({ mode: "Bus / coach", detail: "Cheaper and runs often on short hops.", icon: ic("route") });
    opts.push({ mode: "Drive", detail: "30–60 min depending on traffic. Watch for city congestion charges.", icon: ic("route") });
  } else if (km < 300) {
    opts.push({ mode: "Intercity train", detail: "Best balance of speed and comfort — book in advance for cheaper fares.", icon: ic("train") });
    opts.push({ mode: "Coach", detail: "Slowest but cheapest — overnight services often available.", icon: ic("route") });
    opts.push({ mode: "Drive", detail: `Around ${Math.round(km / 80)} h on the motorway with stops.`, icon: ic("route") });
  } else if (km < 1000) {
    opts.push({ mode: "High-speed rail", detail: "If a route exists, this beats flying once you count check-in.", icon: ic("train") });
    opts.push({ mode: "Short-haul flight", detail: `About ${Math.max(1, Math.round(km / 800))} h in the air, plus 2 h airport time.`, icon: ic("plane") });
    opts.push({ mode: "Drive", detail: `${Math.round(km / 80)} h on the road — split across a day or two.`, icon: ic("route") });
  } else {
    opts.push({ mode: "Flight", detail: `${Math.max(1, Math.round(km / 800))} h flight time. Look at evening departures for cheaper fares.`, icon: ic("plane") });
    opts.push({ mode: "Rail (where possible)", detail: "Sleeper trains can connect Europe and parts of Asia — slower but a proper experience.", icon: ic("train") });
  }
  return opts;
}

function thingsToDo(d: LocationConditions): string[] {
  const out: string[] = [];
  const t = d.weather.feelsLike;
  const wet = d.weather.precipProb >= 50;
  const sunny = d.weather.cloudCover < 35 && d.weather.isDay;
  if (wet) {
    out.push("Lean into indoor things — museums, galleries, a long lunch, coffee crawl.");
    out.push("Cinema or a thermal/spa — the perfect rainy-day reset.");
  }
  if (sunny && t >= 18) {
    out.push("Find a park, riverside or rooftop — the city always looks best in the sun.");
    out.push("Outdoor markets and patios open up — make a day of grazing.");
  }
  if (t < 5) {
    out.push("Christmas markets (in season), or warm cafés with proper hot chocolate.");
    out.push("Indoor activities: live music, comedy, a cosy pub.");
  }
  if (t >= 25) {
    out.push("Early mornings and late evenings outside; midday — find shade or a pool.");
    out.push("Get on or near water — lakes, beaches, boat trips.");
  }
  // Generic always-on suggestions
  out.push(`Try the local specialty in ${displayName(d.location)} — ask any local for "the one place".`);
  out.push("Pick one walkable neighbourhood and explore on foot — best way to feel a place.");
  return out;
}

function haversineKm(a: Location, b: Location): number {
  const R = 6371;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const la1 = a.latitude * Math.PI / 180;
  const la2 = b.latitude * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
