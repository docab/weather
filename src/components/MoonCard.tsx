import type { LocationConditions } from "@/lib/types";
import { getMoonPosition, getMoonPhase, compass, nextMoonPhase } from "@/lib/astronomy";
import { Moon } from "lucide-react";
import { AnimatedMoon } from "./fx/WeatherFX";

/**
 * Full moon panel — phase, illumination, angle, and countdown to
 * the next new/full moon.
 */
export function MoonCard({ conditions }: { conditions: LocationConditions }) {
  const { location, weather } = conditions;
  const now = new Date();
  const phase = getMoonPhase(now);
  const pos = getMoonPosition(now, location.latitude, location.longitude);

  const nextNew = nextMoonPhase(now, 0);
  const nextFull = nextMoonPhase(now, 0.5);

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: weather.timezone }).format(d);
  const daysTo = (d: Date) => Math.max(0, Math.round((d.getTime() - now.getTime()) / 86400000));

  return (
    <div className="glass-card p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Moon className="h-3.5 w-3.5 text-primary" />
        The moon
      </div>
      <div className="flex items-center gap-4">
        <AnimatedMoon size={72} illumination={phase.illumination} phase={phase.phase} />
        <div className="min-w-0">
          <div className="text-base font-semibold">{phase.name}</div>
          <div className="text-xs text-muted-foreground">
            {Math.round(phase.illumination * 100)}% illuminated · {phase.phase < 0.5 ? "waxing" : "waning"}
          </div>
          <div className="mt-1 text-xs text-foreground/85">
            {pos.visible
              ? `Up right now — ${Math.round(pos.altitude)}° above the ${compass(pos.azimuth)} horizon.`
              : "Below the horizon — currently out of sight."}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <Slot label="Angle" value={`${Math.round(pos.altitude)}°`} />
        <Slot label="Direction" value={pos.visible ? compass(pos.azimuth) : "—"} />
        <Slot label="Next new moon" value={`${fmtDate(nextNew)} · in ${daysTo(nextNew)}d`} />
        <Slot label="Next full moon" value={`${fmtDate(nextFull)} · in ${daysTo(nextFull)}d`} />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        New moon = darkest sky, best for stargazing. Full moon washes out fainter stars but is stunning to look at.
      </p>
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