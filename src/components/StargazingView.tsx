import type { LocationConditions } from "@/lib/types";
import { getMoonPhase, getSunPosition, compass as compassDir } from "@/lib/astronomy";
import { Telescope, Orbit } from "lucide-react";
import { visiblePlanets } from "@/lib/planets";
import { SkyNowCard } from "./SkyNowCard";
import { SunCard } from "./SunCard";
import { MoonCard } from "./MoonCard";
import { SkyEventsCard } from "./SkyEventsCard";

export function StargazingView({ conditions }: { conditions: LocationConditions }) {
  const { weather, location } = conditions;
  const now = new Date();
  const phase = getMoonPhase(now);
  const sunNow = getSunPosition(now, location.latitude, location.longitude);

  const cloud = weather.cloudCover;
  const conditionsLine = darkSkyChat(cloud, phase.illumination, sunNow.altitude);
  const planets = visiblePlanets(now, location.latitude, location.longitude);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Sky · {location.name}
      </div>

      {/* What's overhead right now — cloud cover only; sun/moon get their own cards. */}
      <SkyNowCard conditions={conditions} />

      {/* Tonight's outlook */}
      <div className="glass-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Telescope className="h-3.5 w-3.5 text-primary" />
          Tonight's outlook
        </div>
        <p className="text-base leading-relaxed text-foreground/95">{conditionsLine}</p>
      </div>

      {/* Sun & Moon each get their own dedicated card */}
      <SunCard conditions={conditions} />
      <MoonCard conditions={conditions} />

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

      {/* Aurora + Meteor showers + Almanac (eclipses, ISS, conjunctions, NLC) */}
      <SkyEventsCard conditions={conditions} />
    </div>
  );
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