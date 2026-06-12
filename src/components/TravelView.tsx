import { useState, useMemo } from "react";
import type { LocationConditions, Location, WeatherHour } from "@/lib/types";
import { describeWeather, dynamicSkyStyle } from "@/lib/weatherCodes";
import { severityRank } from "@/lib/severity";
import {
  Plane, Calendar, Loader2, MapPin, Locate, Train, Backpack, Route,
  Clock, Navigation, Luggage, Car, AlertTriangle,
} from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { LocalTimeCard } from "./LocalTimeCard";
import { nearestAirport, distanceKmTo, type Airport } from "@/lib/airports";

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

      {/* If the destination sits in a different timezone, surface its current
          local time so users planning a trip aren't constantly converting. */}
      {destination && (
        <LocalTimeCard
          timezone={destination.weather.timezone}
          placeName={displayName(destination.location)}
        />
      )}

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
          {/* The journey itself — distance, mode, ETA, en-route weather */}
          <JourneyCard origin={origin} destination={destination} />

          {/* Road & driving conditions for the actual door-to-door drive,
              broken into airport legs when flying. */}
          <RoadConditionsCard origin={origin} destination={destination} />

          {/* Destination weather AT YOUR ARRIVAL TIME (not "now") */}
          <ArrivalCard origin={origin} destination={destination} />

          {/* 7-day window — best day to go */}
          <SectionCard icon={<Calendar className="h-3.5 w-3.5 text-primary" />} title="Best day in the next week">
            <p className="text-sm leading-relaxed text-foreground/95">
              {bestDayStory(destination)}
            </p>
          </SectionCard>

          {/* Packing */}
          <SectionCard icon={<Backpack className="h-3.5 w-3.5 text-primary" />} title="Pack for the journey">
            <ul className="space-y-1.5 text-sm text-foreground/90">
              {packingList(origin, destination).map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* Carry-on essentials */}
          <SectionCard icon={<Luggage className="h-3.5 w-3.5 text-primary" />} title="Take with you on the day">
            <ul className="space-y-1.5 text-sm text-foreground/90">
              {takeWithYou(origin, destination).map((line, i) => (
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

function displayName(l: Location): string { return l.customName || l.name; }

// ----- Journey logic -----

/** Pick a sensible default mode + travel time for a given distance + countries. */
function pickMode(origin: Location, destination: Location):
  { mode: "walk" | "drive" | "train" | "flight"; hours: number; label: string; icon: React.ReactNode; note: string } {
  const km = haversineKm(origin, destination);
  const sameCountry = origin.countryCode && origin.countryCode === destination.countryCode;
  if (km < 3) {
    return { mode: "walk", hours: km / 5, label: "Walk / cycle", icon: <Navigation className="h-4 w-4" />,
      note: "Practically next door — on foot or by bike." };
  }
  if (km < 60) {
    return { mode: "drive", hours: km / 50, label: "Local drive or train", icon: <Route className="h-4 w-4" />,
      note: "Short hop — local train, metro or a quick drive." };
  }
  if (km < 350 && sameCountry) {
    return { mode: "train", hours: km / 90 + 0.5, label: "Train or drive", icon: <Train className="h-4 w-4" />,
      note: "Intercity train usually beats driving once you add traffic." };
  }
  if (km < 900 && sameCountry) {
    return { mode: "drive", hours: km / 85 + 1, label: "Long drive or rail", icon: <Route className="h-4 w-4" />,
      note: "Half-day drive — break it up, or take a high-speed train if there is one." };
  }
  // Anything else → flight, +2.5h airport overhead
  return { mode: "flight", hours: km / 800 + 2.5, label: "Flight", icon: <Plane className="h-4 w-4" />,
    note: "Flying is the realistic option — add ~2 h for check-in, security and transfers." };
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.max(5, Math.round(h * 60))} min`;
  if (h < 10) {
    const hr = Math.floor(h);
    const mn = Math.round((h - hr) * 60);
    return mn ? `${hr} h ${mn} min` : `${hr} h`;
  }
  return `${Math.round(h)} h`;
}

/** Local clock string for a weather timezone, including the short
 *  timezone abbreviation (e.g. "16:27 BST"). */
function localTime(tz: string, date: Date): string {
  try {
    const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
    const tzName = new Intl.DateTimeFormat("en-GB", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(date).find(p => p.type === "timeZoneName")?.value ?? "";
    return tzName ? `${time} ${tzName}` : time;
  } catch {
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
}

/** Find the hour closest to `hoursAhead` from now in a WeatherHour[]. */
function hourAtOffset(hours: WeatherHour[], hoursAhead: number): WeatherHour | undefined {
  if (!hours.length) return undefined;
  const target = Date.now() + hoursAhead * 3600 * 1000;
  let best = hours[0];
  let bestDelta = Math.abs(new Date(best.time).getTime() - target);
  for (const h of hours) {
    const d = Math.abs(new Date(h.time).getTime() - target);
    if (d < bestDelta) { best = h; bestDelta = d; }
  }
  return best;
}

/** Slice of hours covering the trip duration at the origin (for "en route" view). */
function enRouteHours(hours: WeatherHour[], travelHours: number): WeatherHour[] {
  const span = Math.max(1, Math.min(hours.length, Math.ceil(travelHours)));
  return hours.slice(0, span);
}

// ----- New section components -----

function JourneyCard({ origin, destination }: { origin: LocationConditions; destination: LocationConditions }) {
  const km = haversineKm(origin.location, destination.location);
  const mode = pickMode(origin.location, destination.location);
  const isFlight = mode.mode === "flight";
  const enRoute = enRouteHours(origin.weather.hourly, mode.hours);
  const wetHours = enRoute.filter(h => h.precipProb >= 50).length;
  const windyAtStart = origin.weather.windSpeed >= 22;

  let journeyStory: string;
  if (isFlight) {
    journeyStory = `It's ~${Math.round(km)} km — well into flight territory. Plan around airport time, not driving time. Skies en route don't matter much; focus on conditions at the destination airport when you land.`;
  } else {
    const bits: string[] = [];
    bits.push(`Roughly ${Math.round(km)} km — about ${formatHours(mode.hours)} door to door.`);
    if (wetHours >= 2) bits.push(`Expect rain for ${wetHours} of the next ${enRoute.length} hours of travel — keep wipers ready or pack a waterproof.`);
    else if (wetHours === 1) bits.push(`A brief shower is possible mid-journey.`);
    else bits.push(`Largely dry the whole way.`);
    if (windyAtStart) bits.push(`Winds are gusty (${Math.round(origin.weather.windSpeed)} mph) — high-sided vehicles and bridges will feel it.`);
    journeyStory = bits.join(" ");
  }

  return (
    <SectionCard icon={<Route className="h-3.5 w-3.5 text-primary" />} title="The journey">
      <div className="mb-3 flex items-center gap-2 rounded-xl bg-secondary/40 p-3 text-xs">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-background/60 text-primary">
          {mode.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold uppercase tracking-wider">{mode.label}</div>
          <div className="text-foreground/80">{mode.note}</div>
        </div>
        <div className="text-right tabular">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Travel</div>
          <div className="text-sm font-bold">{formatHours(mode.hours)}</div>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-foreground/95">{journeyStory}</p>

      {!isFlight && enRoute.length > 1 && (
        <div className="mt-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            On the way (from {displayName(origin.location)})
          </div>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {enRoute.map((h, i) => {
              const info = describeWeather(h.weatherCode, true);
              const hr = new Date(h.time).toLocaleTimeString("en-GB", { hour: "2-digit", hour12: false, timeZone: origin.weather.timezone }).replace(":00", "");
              return (
                <div key={i} className="flex min-w-[48px] flex-col items-center gap-0.5 rounded-lg bg-secondary/40 px-2 py-1.5">
                  <div className="text-[9px] text-muted-foreground tabular">{i === 0 ? "Now" : `${hr}:00`}</div>
                  <div className="text-base leading-none">{info.icon}</div>
                  <div className="text-xs font-semibold tabular">{Math.round(h.feelsLike)}°</div>
                  {h.precipProb >= 30 && (
                    <div className="text-[9px] text-primary tabular">{Math.round(h.precipProb)}%</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function ArrivalCard({ origin, destination }: { origin: LocationConditions; destination: LocationConditions }) {
  const mode = pickMode(origin.location, destination.location);
  const isFlight = mode.mode === "flight";
  const arrival = new Date(Date.now() + mode.hours * 3600 * 1000);
  const arrivalLocal = localTime(destination.weather.timezone, arrival);

  const at = hourAtOffset(destination.weather.hourly, mode.hours) ?? destination.weather.hourly[0];
  const usingForecast = at && new Date(at.time).getTime() > Date.now() + 30 * 60 * 1000;
  const info = at ? describeWeather(at.weatherCode, true) : describeWeather(destination.weather.weatherCode, destination.weather.isDay);

  const story = isFlight
    ? arrivalStoryFlight(destination, at, arrivalLocal)
    : arrivalStoryGround(destination, at, arrivalLocal);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border p-5 shadow-card"
      style={dynamicSkyStyle(info.sky, at?.feelsLike ?? destination.weather.feelsLike, {
        windSpeed: destination.weather.windSpeed,
        humidity: destination.weather.humidity,
        cloudCover: at?.cloudCover ?? destination.weather.cloudCover,
        uvIndex: destination.weather.uvIndex,
        isDay: destination.weather.isDay,
      })}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-background/55" />
      <div className="relative">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Clock className="h-3 w-3 text-primary" />
          {usingForecast ? "Forecast for arrival" : `Right now in ${displayName(destination.location)}`}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-foreground/85">
              {usingForecast
                ? <>Local time will be <span className="font-semibold tabular">{arrivalLocal}</span>. Here's what the weather will be like:</>
                : <>Currently in {displayName(destination.location)}:</>}
            </div>
            <div className="mt-1 text-3xl font-bold tabular">{Math.round(at?.feelsLike ?? destination.weather.feelsLike)}°</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Feels like on arrival</div>
          </div>
          <div className="text-5xl leading-none">{info.icon}</div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground/95">{story}</p>
      </div>
    </div>
  );
}

function arrivalStoryGround(d: LocationConditions, at: WeatherHour | undefined, arrivalLocal: string): string {
  const info = describeWeather(at?.weatherCode ?? d.weather.weatherCode, true);
  const t = Math.round(at?.feelsLike ?? d.weather.feelsLike);
  const rain = Math.round(at?.precipProb ?? d.weather.precipProb);
  const bits = [`Rolling into ${displayName(d.location)} around ${arrivalLocal}, you'll find it ${info.short.toLowerCase()} and feeling like ${t}°`];
  if (rain >= 60) bits.push(`with rain very likely (${rain}%) — have a jacket on top of your bag`);
  else if (rain >= 30) bits.push(`with a ${rain}% chance of a shower — umbrella in the car door`);
  if (severityRank[d.pollen.level] >= 2) bits.push(`pollen is high, so antihistamines if you're sensitive`);
  return bits.join(", ") + ".";
}

function arrivalStoryFlight(d: LocationConditions, at: WeatherHour | undefined, arrivalLocal: string): string {
  const info = describeWeather(at?.weatherCode ?? d.weather.weatherCode, true);
  const t = Math.round(at?.feelsLike ?? d.weather.feelsLike);
  const rain = Math.round(at?.precipProb ?? d.weather.precipProb);
  const wind = Math.round(d.weather.windSpeed);
  const bits = [`When you step out of the terminal in ${displayName(d.location)} around ${arrivalLocal} it should be ${info.short.toLowerCase()}, feeling like ${t}°`];
  if (rain >= 60) bits.push(`taxi queues will be wet — keep a packable raincoat in your carry-on`);
  if (wind >= 25) bits.push(`gusty (${wind} mph), so expect a bumpy approach`);
  if (severityRank[d.aqi.level] >= 2) bits.push(`air quality near the airport isn't great — an N95 helps if you're sensitive`);
  return bits.join(", ") + ".";
}

function takeWithYou(origin: LocationConditions, destination: LocationConditions): string[] {
  const mode = pickMode(origin.location, destination.location);
  const out: string[] = [];
  const enRoute = enRouteHours(origin.weather.hourly, mode.hours);
  const willRain = enRoute.some(h => h.precipProb >= 50) || destination.weather.precipProb >= 50;
  const willBeCold = (destination.weather.feelsLike < 8) || (origin.weather.feelsLike < 8);

  if (mode.mode === "flight") {
    out.push("Passport, boarding pass on your phone (and a screenshot), and the right power adaptor.");
    out.push("Refillable bottle (empty through security), snacks, headphones, neck pillow.");
    out.push("Packable rain shell in your carry-on for the walk to the taxi rank.");
    if (severityRank[destination.aqi.level] >= 2) out.push("A spare FFP2/N95 mask for arrivals — air quality there is dipping.");
  } else if (mode.mode === "drive") {
    out.push("Phone mount, charger cable, and offline maps for any patchy signal.");
    out.push("Water, snacks, and a spare layer — drives feel longer in bad weather.");
    if (willRain) out.push("Working wipers and washer fluid — and lights on early in heavy rain.");
    if (willBeCold) out.push("De-icer, scraper, and a blanket in the boot just in case.");
  } else if (mode.mode === "train") {
    out.push("Ticket QR, headphones, and a power bank — sockets aren't always working.");
    out.push("Something to read or download; a light layer for over-aircon carriages.");
    if (willRain) out.push("Compact umbrella for the platform.");
  } else {
    out.push("Phone charged, comfortable shoes, and a water bottle.");
  }

  if (willRain && mode.mode !== "flight") out.push("Quick-dry socks — wet feet ruin a journey.");
  if (destination.weather.uvIndex >= 6) out.push("Sunglasses & SPF — UV is strong at the destination.");
  return out;
}

// ----- Stories & lists -----

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

function haversineKm(a: Location, b: Location): number {
  const R = 6371;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const la1 = a.latitude * Math.PI / 180;
  const la2 = b.latitude * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// ----- Road & driving conditions -----

function RoadConditionsCard({ origin, destination }: { origin: LocationConditions; destination: LocationConditions }) {
  const mode = pickMode(origin.location, destination.location);

  if (mode.mode === "flight") {
    const origAir = nearestAirport(origin.location.latitude, origin.location.longitude, origin.location.countryCode);
    const destAir = nearestAirport(destination.location.latitude, destination.location.longitude, destination.location.countryCode);
    const legs: { from: string; to: string; km: number; weather: LocationConditions; airport: Airport | null }[] = [];
    if (origAir) {
      legs.push({
        from: addressOf(origin.location),
        to: `${origAir.iata} (${origAir.name})`,
        km: distanceKmTo(origin.location.latitude, origin.location.longitude, origAir),
        weather: origin,
        airport: origAir,
      });
    }
    if (destAir) {
      legs.push({
        from: `${destAir.iata} (${destAir.name})`,
        to: addressOf(destination.location),
        km: distanceKmTo(destination.location.latitude, destination.location.longitude, destAir),
        weather: destination,
        airport: destAir,
      });
    }
    if (!legs.length) return null;

    return (
      <SectionCard icon={<Car className="h-3.5 w-3.5 text-primary" />} title="Road conditions — airport transfers">
        <ul className="space-y-3">
          {legs.map((l, i) => (
            <li key={i} className="rounded-xl bg-secondary/40 p-3">
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="truncate">{l.from} → {l.to}</span>
                <span className="shrink-0 tabular">{Math.round(l.km)} km</span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/95">{roadStory(l.weather, l.km)}</p>
            </li>
          ))}
        </ul>
      </SectionCard>
    );
  }

  // Ground journey — single direct leg.
  const km = haversineKm(origin.location, destination.location);
  return (
    <SectionCard icon={<Car className="h-3.5 w-3.5 text-primary" />} title="Road conditions — door to door">
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="truncate">{addressOf(origin.location)} → {addressOf(destination.location)}</span>
        <span className="shrink-0 tabular">{Math.round(km)} km</span>
      </div>
      <p className="text-sm leading-relaxed text-foreground/95">{roadStory(origin, km, destination)}</p>
    </SectionCard>
  );
}

function addressOf(l: Location): string {
  if (l.postcode) return `${l.postcode}${l.customName ? ` (${l.customName})` : ""}`;
  return l.customName || l.name;
}

/** Build a plain-English road-conditions narrative from a location's
 *  current weather (and optionally a destination's weather for long-leg
 *  journeys). Uses concrete numbers — rain mm, gust mph, visibility, UV. */
function roadStory(c: LocationConditions, km: number, dest?: LocationConditions): string {
  const w = c.weather;
  const bits: string[] = [];
  const wet = w.precipProb >= 40 || (w.rainTotal ?? 0) >= 1;
  const heavyWet = w.precipProb >= 70 || (w.rainTotal ?? 0) >= 4;
  const cold = w.feelsLike <= 2;
  const icy = cold && wet;
  const gusty = w.windGust >= 35 || w.windSpeed >= 25;
  const lowVis = (w.visibility ?? 10000) < 2000;

  if (icy)        bits.push(`Icy risk — surface temperature is around ${Math.round(w.feelsLike)}° with active precipitation. Black ice on bridges and slip roads early morning.`);
  else if (heavyWet) bits.push(`Heavy rain (${Math.round(w.precipProb)}% chance, ${(w.rainTotal ?? 0).toFixed(1)} mm so far). Standing water on hard shoulders; aquaplaning risk above 50 mph.`);
  else if (wet)   bits.push(`Wet roads expected — ${Math.round(w.precipProb)}% rain chance. Spray reduces visibility; add 2× braking distance.`);
  else            bits.push(`Dry tarmac with ${Math.round(w.precipProb)}% rain chance — straightforward driving.`);

  if (gusty)      bits.push(`Gusts to ${Math.round(w.windGust)} mph — high-sided vehicles, motorbikes and trailers will feel it on exposed bridges.`);
  if (lowVis)     bits.push(`Visibility down to ${(w.visibility! / 1000).toFixed(1)} km — dipped headlights on, fog lights if it drops further.`);
  if (w.uvIndex >= 7 && w.isDay) bits.push(`Sun is strong (UV ${Math.round(w.uvIndex)}) — keep shades within reach for low-angle glare.`);
  if (km >= 200)  bits.push(`Plan a comfort stop every ~150 km on a leg this long.`);

  if (dest) {
    const dw = dest.weather;
    const arrivingWet = dw.precipProb >= 50;
    if (arrivingWet && !wet) bits.push(`Conditions deteriorate near ${displayName(dest.location)} — ${Math.round(dw.precipProb)}% rain on arrival, drop your speed for the last 20 km.`);
    else if (!arrivingWet && wet) bits.push(`Rain clears as you approach ${displayName(dest.location)}.`);
  }

  return bits.join(" ");
}
