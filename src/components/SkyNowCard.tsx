import type { LocationConditions } from "@/lib/types";
import { getSunPosition, getMoonPosition, getMoonPhase, compass } from "@/lib/astronomy";
import { Cloud, Eye } from "lucide-react";
import { WeatherFX, AnimatedSun, AnimatedMoon } from "./fx/WeatherFX";

/**
 * "What the sky looks like right now" — cloud cover layers,
 * sun position (if up) and moon position + phase.
 */
export function SkyNowCard({ conditions }: { conditions: LocationConditions }) {
  const { weather, location } = conditions;
  const now = new Date();
  const sun = getSunPosition(now, location.latitude, location.longitude);
  const moon = getMoonPosition(now, location.latitude, location.longitude);
  const phase = getMoonPhase(now);

  const cloudLine = describeClouds(weather.cloudCover, weather.cloudLow, weather.cloudMid, weather.cloudHigh);
  const lookUp = describeSky(weather.cloudCover, sun, moon, phase, weather.isDay);

  return (
    <div className="relative overflow-hidden glass-card p-5 shadow-card">
      <WeatherFX weather={weather} intensity={0.6} />
      <div className="relative mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Eye className="h-3.5 w-3.5 text-primary" />
        Look up — what's overhead
      </div>

      <p className="relative text-base leading-relaxed text-foreground/95">{lookUp}</p>

      {/* Cloud overlay visual */}
      <div className="relative mt-4 overflow-hidden rounded-xl bg-secondary/40 p-3">
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Cloud className="h-3 w-3" /> Cloud cover</span>
          <span className="tabular">{Math.round(weather.cloudCover)}%</span>
        </div>
        <CloudLayer label="High" value={weather.cloudHigh} hint="cirrus, wispy" />
        <CloudLayer label="Mid"  value={weather.cloudMid}  hint="altocumulus" />
        <CloudLayer label="Low"  value={weather.cloudLow}  hint="stratus, fog" />
        <p className="mt-2 text-xs text-foreground/85">{cloudLine}</p>
      </div>

      <div className="relative mt-4 grid gap-3 sm:grid-cols-2">
        <Body
          icon={<AnimatedSun size={28} warm={weather.feelsLike >= 22} />}
          name="Sun"
          state={sun.visible
            ? `Up — ${Math.round(sun.altitude)}° above the ${compass(sun.azimuth)} horizon`
            : `Below the horizon (${Math.round(sun.altitude)}°)`}
        />
        <Body
          icon={<AnimatedMoon size={28} illumination={phase.illumination} phase={phase.phase} />}
          name={`${phase.emoji} ${phase.name}`}
          state={moon.visible
            ? `Up — ${Math.round(moon.altitude)}° in the ${compass(moon.azimuth)}, ${Math.round(phase.illumination * 100)}% lit`
            : `Below the horizon · ${Math.round(phase.illumination * 100)}% lit`}
        />
      </div>
    </div>
  );
}

function CloudLayer({ label, value, hint }: { label: string; value: number; hint: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="mb-1.5 last:mb-0">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label} <span className="opacity-60">· {hint}</span></span>
        <span className="tabular">{v}%</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-background/60">
        <div className="h-full rounded-full bg-foreground/40" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function Body({ icon, name, state }: { icon: React.ReactNode; name: string; state: string }) {
  return (
    <div className="flex gap-3 rounded-xl bg-secondary/40 p-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/50 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{name}</div>
        <div className="text-xs text-muted-foreground">{state}</div>
      </div>
    </div>
  );
}

function describeClouds(total: number, low: number, mid: number, high: number): string {
  if (total < 10) return "Practically nothing up there — pure sky.";
  if (total < 25) return `Mostly clear, just a wisp of ${dominantLayer(low, mid, high)}.`;
  if (total < 60) return `Partly clouded — ${dominantLayer(low, mid, high)} doing most of the work.`;
  if (total < 90) return `Mostly grey overhead with a layer of ${dominantLayer(low, mid, high)}.`;
  return "Solid lid of cloud — the sky's completely closed in.";
}

function dominantLayer(low: number, mid: number, high: number): string {
  const max = Math.max(low, mid, high);
  if (max === low) return "low cloud";
  if (max === mid) return "mid-level cloud";
  return "high cirrus";
}

function describeSky(
  cloud: number,
  sun: { visible: boolean; altitude: number; azimuth: number },
  moon: { visible: boolean; altitude: number; azimuth: number },
  phase: { name: string; illumination: number; emoji: string },
  isDay: boolean,
): string {
  if (isDay) {
    if (cloud < 20 && sun.altitude > 20) return `Looking up, the sun's high in the ${compass(sun.azimuth)} sky and there's barely a cloud — proper bright.`;
    if (cloud < 50) return `The sun's drifting through gaps — ${Math.round(cloud)}% cloud, sitting ${Math.round(sun.altitude)}° up in the ${compass(sun.azimuth)}.`;
    if (cloud < 85) return `Sun's hidden behind a fairly thick deck of cloud — you can tell where it is, but you won't see it.`;
    return `Heavy lid of cloud — the sun's properly tucked away today.`;
  }
  // Night
  if (cloud < 20 && moon.visible) return `Clear, dark sky and the ${phase.name.toLowerCase()} is up — ${Math.round(phase.illumination * 100)}% lit, sitting in the ${compass(moon.azimuth)}.`;
  if (cloud < 20) return `Crisp clear night — moon's below the horizon, so the stars get the stage.`;
  if (cloud < 60 && moon.visible) return `Patchy cloud, but the ${phase.name.toLowerCase()} is breaking through in the ${compass(moon.azimuth)}.`;
  if (cloud < 60) return `Patchy cloud — you'll catch glimpses of stars between the gaps.`;
  return `Heavily overcast — the night sky's all but blotted out.`;
}