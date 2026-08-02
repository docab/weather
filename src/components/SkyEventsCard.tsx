import { useQuery } from "@tanstack/react-query";
import type { LocationConditions } from "@/lib/types";
import { fetchAurora, kpDescription } from "@/lib/aurora";
import { activeShowers } from "@/lib/meteor";
import { AuroraFX, MeteorFX } from "./fx/WeatherFX";
import { Sparkles, Stars, Rocket, CloudSun, Loader2, Eclipse } from "lucide-react";

/**
 * Merged "Sky Events" — aurora + meteor showers + upcoming eclipses,
 * ISS passes, planetary conjunctions and noctilucent-cloud season.
 * Static astronomical almanac for events that can be computed years ahead.
 */
export function SkyEventsCard({ conditions }: { conditions: LocationConditions }) {
  const { location } = conditions;
  const now = new Date();
  const aurora = useQuery({
    queryKey: ["aurora"],
    queryFn: fetchAurora,
    staleTime: 1000 * 60 * 30,
  });
  const showers = activeShowers(now);
  const auroraActive = (aurora.data?.kpNow ?? 0) >= 4;
  const meteorActive = showers.some(s => s.isPeakingNow);

  const upcoming = upcomingEvents(now, location.latitude, location.longitude);

  return (
    <div className="space-y-4">
      {/* Aurora */}
      <div className="relative overflow-hidden glass-card p-5 shadow-card">
        <AuroraFX active={auroraActive} />
        <div className="absolute inset-0 bg-background/55" />
        <div className="relative mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Aurora forecast
        </div>
        <div className="relative">
          {aurora.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching solar activity…
            </div>
          )}
          {aurora.isError && (
            <p className="text-sm text-muted-foreground">Couldn't reach the solar weather feed — try again later.</p>
          )}
          {aurora.data && (() => {
            const v = aurora.data.visibilityFor(Math.abs(location.latitude));
            return (
              <div>
                <p className="text-base leading-relaxed text-foreground/95">{v.summary}</p>
                <p className="mt-2 text-xs text-muted-foreground">{kpDescription(aurora.data.kpNow)}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <Slot label="Kp now" value={aurora.data.kpNow.toFixed(1)} />
                  <Slot label="Reaches" value={`${v.minLat}° lat`} />
                  <Slot label="You're at" value={`${Math.abs(location.latitude).toFixed(0)}°`} />
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Meteor showers */}
      <div className="relative overflow-hidden glass-card p-5 shadow-card">
        <MeteorFX active={meteorActive} />
        <div className="absolute inset-0 bg-background/55" />
        <div className="relative mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Stars className="h-3.5 w-3.5 text-primary" />
          Meteor showers
        </div>
        <div className="relative">
          {showers.length === 0 && (
            <p className="text-sm text-muted-foreground">No active meteor showers right now — quiet sky tonight.</p>
          )}
          <ul className="space-y-3">
            {showers.map(s => (
              <li key={s.name} className="rounded-xl bg-secondary/40 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-sm font-semibold">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {s.isPeakingNow ? "Peaking now" : s.daysToPeak > 0 ? `Peak in ${s.daysToPeak}d` : `Peaked ${-s.daysToPeak}d ago`}
                  </div>
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  ~{s.zhr}/hr at peak · from {s.parent}
                </div>
                <p className="mt-1 text-xs text-foreground/85">{s.blurb}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Astronomical almanac */}
      <div className="glass-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Eclipse className="h-3.5 w-3.5 text-primary" />
          Upcoming sky events
        </div>
        <ul className="space-y-2">
          {upcoming.map(e => (
            <li key={e.id} className="rounded-xl bg-secondary/40 p-3 text-left">
              <div className="flex items-baseline gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="min-w-0 flex-1 text-sm font-semibold leading-snug">{e.title}</span>
                <span className="shrink-0 text-[11px] font-semibold text-foreground/90">{e.when}</span>
              </div>
              <p className="mt-1 pl-3.5 text-[11px] leading-relaxed text-muted-foreground">{e.blurb}</p>
              {e.visibility && (
                <p className="mt-0.5 pl-3.5 text-[11px] leading-relaxed text-muted-foreground/80">{e.visibility}</p>
              )}
            </li>
          ))}
        </ul>
        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nothing major on the calendar visible from here in the next couple of years.
          </p>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Rocket className="h-3 w-3" />
          ISS pass times depend on your exact location — check NASA Spot The Station for tonight's schedule.
        </p>
      </div>
    </div>
  );
}

function Slot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-bold tabular">{value}</div>
    </div>
  );
}

interface SkyEvent {
  id: string;
  title: string;
  when: string;
  blurb: string;
  visibility?: string;
  date: Date;
  /** Latitude band this event can actually be seen from, [min, max]. */
  latBand?: [number, number];
}

/**
 * A hand-curated almanac of major sky events for 2026–2027. NASA/USNO
 * publish decades in advance so these dates are stable.
 */
function upcomingEvents(now: Date, lat: number, _lon: number): SkyEvent[] {
  const events: SkyEvent[] = [
    // Eclipses (NASA)
    ev("2026-02-17", "Annular Solar Eclipse", "Ring-of-fire eclipse", "Best from Antarctica; partial across southern Africa & Australia", [-90, -10]),
    ev("2026-08-12", "Total Solar Eclipse", "Totality across Greenland, Iceland and Spain", "Deep partial across the UK, Europe and North Africa", [25, 85]),
    ev("2027-08-02", "Total Solar Eclipse", "Longest totality of the century — 6m 23s", "Path crosses Spain, North Africa, Egypt and Arabia", [5, 60]),
    ev("2026-03-03", "Total Lunar Eclipse (Blood Moon)", "Full moon slides through Earth's shadow", "Visible across Asia, Australia, the Pacific and western Americas", [-60, 70]),
    // Planetary conjunctions & alignments (approximate)
    ev("2026-08-25", "Venus–Jupiter conjunction", "Two brightest planets less than 1° apart in the dawn sky", "Look east about an hour before sunrise"),
    ev("2026-11-18", "Leonid meteor peak", "Fast, bright meteors from comet Tempel–Tuttle", "Radiant rises after midnight", [-60, 80]),
    ev("2026-12-14", "Geminid meteor peak", "Best shower of the year — up to 120 an hour", "Radiant high overhead by midnight", [-50, 80]),
    ev("2027-01-04", "Quadrantid meteor peak", "Sharp six-hour peak of blue meteors", "Radiant rises late; best after 2am", [10, 80]),
    // Seasonal phenomena
    seasonal("nlc-summer", now, lat, "Noctilucent cloud season", "Electric-blue clouds glowing at twilight", "Seen from roughly 50–70° latitude, low in the north after dusk"),
  ];
  return events
    .filter(e => e.date.getTime() >= now.getTime() - 86400_000)
    // Only show what's actually visible from this location's latitude.
    .filter(e => !e.latBand || (lat >= e.latBand[0] && lat <= e.latBand[1]))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 8);
}

function ev(iso: string, title: string, blurb: string, visibility?: string, latBand?: [number, number]): SkyEvent {
  const date = new Date(iso + "T20:00:00Z");
  const days = Math.round((date.getTime() - Date.now()) / 86400000);
  const when = days <= 0 ? "Today" : days === 1 ? "Tomorrow" : days < 30 ? `In ${days}d` : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
  return { id: iso + title, title, blurb, visibility, when, date, latBand };
}

function seasonal(id: string, now: Date, lat: number, title: string, blurb: string, visibility: string): SkyEvent {
  // NLCs appear roughly late May–early August in the northern hemisphere.
  const year = now.getFullYear();
  const start = new Date(Date.UTC(year, 4, 25));
  const end = new Date(Date.UTC(year, 7, 5));
  const inSeason = now >= start && now <= end && Math.abs(lat) > 45;
  const date = now < start ? start : (now > end ? new Date(Date.UTC(year + 1, 4, 25)) : now);
  const when = inSeason ? "In season now" :
    (date.getTime() - now.getTime()) < 60 * 86400_000 ? `Season starts ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date)}` :
    new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(date);
  return { id, title, blurb, visibility, when, date, latBand: lat >= 0 ? [45, 70] : [-70, -45] };
}