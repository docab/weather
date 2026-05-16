import { useQuery } from "@tanstack/react-query";
import type { LocationConditions } from "@/lib/types";
import { getMoonPhase, getMoonPosition, getSunPosition, compass } from "@/lib/astronomy";
import { fetchAurora, kpDescription } from "@/lib/aurora";
import { activeShowers } from "@/lib/meteor";
import { Stars, Moon, Sparkles, Cloud, Telescope, Loader2, Orbit } from "lucide-react";
import { AuroraFX, MeteorFX, AnimatedMoon } from "./fx/WeatherFX";
import { visiblePlanets } from "@/lib/planets";
import { compass as compassDir } from "@/lib/astronomy";

export function StargazingView({ conditions }: { conditions: LocationConditions }) {
  const { weather, location } = conditions;
  const now = new Date();
  const phase = getMoonPhase(now);
  const moonNow = getMoonPosition(now, location.latitude, location.longitude);
  const sunNow = getSunPosition(now, location.latitude, location.longitude);

  const aurora = useQuery({
    queryKey: ["aurora"],
    queryFn: fetchAurora,
    staleTime: 1000 * 60 * 30,
  });

  const showers = activeShowers(now);
  const cloud = weather.cloudCover;
  const conditionsLine = darkSkyChat(cloud, phase.illumination, sunNow.altitude);
  const auroraActive = (aurora.data?.kpNow ?? 0) >= 4;
  const meteorActive = showers.some(s => s.isPeakingNow);
  const planets = visiblePlanets(now, location.latitude, location.longitude);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Stargazing · {location.name}
      </div>

      {/* Tonight's outlook */}
      <div className="glass-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Telescope className="h-3.5 w-3.5 text-primary" />
          Tonight's outlook
        </div>
        <p className="text-base leading-relaxed text-foreground/95">{conditionsLine}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          <Stat icon={<Cloud className="h-3.5 w-3.5" />} label="Cloud" value={`${Math.round(cloud)}%`} />
          <Stat icon={<Moon className="h-3.5 w-3.5" />} label="Moon" value={`${Math.round(phase.illumination * 100)}% ${phase.emoji}`} />
          <Stat icon={<Sparkles className="h-3.5 w-3.5" />} label="Darkness" value={darknessLabel(cloud, phase.illumination)} />
        </div>
      </div>

      {/* Moon details */}
      <div className="glass-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Moon className="h-3.5 w-3.5 text-primary" />
          The moon
        </div>
        <div className="flex items-center gap-4">
          <AnimatedMoon size={64} illumination={phase.illumination} phase={phase.phase} />
          <div>
            <div className="text-base font-semibold">{phase.name}</div>
            <div className="text-xs text-muted-foreground">
              {Math.round(phase.illumination * 100)}% illuminated · {moonChat(phase.phase)}
            </div>
            <div className="mt-1 text-xs text-foreground/85">
              {moonNow.visible
                ? `Up right now — ${Math.round(moonNow.altitude)}° above the ${compass(moonNow.azimuth)} horizon.`
                : "Below the horizon at the moment."}
            </div>
          </div>
        </div>
      </div>

      {/* Visible planets & bright stars tonight */}
      <div className="glass-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Orbit className="h-3.5 w-3.5 text-primary" />
          Visible tonight
        </div>
        <ul className="space-y-2">
          {planets.map(p => (
            <li key={p.name} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/40 p-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  <span className="mr-1">{p.symbol}</span>{p.name}
                </div>
                <div className="text-[11px] text-muted-foreground">{p.blurb}</div>
              </div>
              <div className="text-right text-[11px]">
                {p.visible ? (
                  <>
                    <div className="font-semibold text-foreground/90">
                      {Math.round(p.altitude)}° up · {compassDir(p.azimuth)}
                    </div>
                    {p.bestTime && <div className="text-muted-foreground">peaks ~{p.bestTime}</div>}
                  </>
                ) : p.bestTime ? (
                  <div className="text-muted-foreground">rises around {p.bestTime}</div>
                ) : (
                  <div className="text-muted-foreground">not up tonight</div>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Bright stars to spot: Sirius, Vega, Arcturus & Betelgeuse — depending on the season, they'll be near the brightest planet.
        </p>
      </div>

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
                <Stat label="Kp now" value={aurora.data.kpNow.toFixed(1)} />
                <Stat label="Aurora reaches" value={`${v.minLat}° lat`} />
                <Stat label="You're at" value={`${Math.abs(location.latitude).toFixed(0)}°`} />
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
    </div>
  );
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </div>
      <div className="mt-0.5 text-sm font-bold tabular">{value}</div>
    </div>
  );
}

function darknessLabel(cloud: number, moonIllum: number): string {
  if (cloud > 70) return "Poor";
  if (moonIllum > 0.7) return "Bright moon";
  if (cloud > 40) return "Patchy";
  if (moonIllum < 0.2) return "Excellent";
  return "Decent";
}

function moonChat(phase: number): string {
  if (phase < 0.5) return "waxing — getting fuller each night";
  return "waning — shrinking each night";
}

function darkSkyChat(cloud: number, moonIllum: number, sunAlt: number): string {
  if (sunAlt > 0) return "It's still daytime — come back after sunset for the sky show.";
  if (cloud > 80) return "Honestly? The sky's totally socked in tonight — you won't see much. Save your eyes for another night.";
  if (cloud > 50 && moonIllum > 0.7) return "Patchy cloud and a bright moon — fine for casual stargazing, tough for faint stuff.";
  if (cloud > 50) return "Bit cloudy — you'll catch the brighter constellations through the gaps.";
  if (moonIllum > 0.8) return "Skies are clear but the moon is loud — perfect for moon-watching, not so much for the Milky Way.";
  if (moonIllum < 0.2 && cloud < 20) return "Clear and moonless — about as good as it gets. Get away from streetlights and you're set.";
  return "Decent conditions — find somewhere dark, give your eyes 20 minutes to adjust, and look up.";
}