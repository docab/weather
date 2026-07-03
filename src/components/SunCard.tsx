import type { LocationConditions } from "@/lib/types";
import { getSunPosition, sunEvents, compass } from "@/lib/astronomy";
import { Sun } from "lucide-react";
import { AnimatedSun } from "./fx/WeatherFX";

/**
 * Everything about the Sun for the active location — rise, set,
 * solar noon, current angle, and a plain-English UV note.
 */
export function SunCard({ conditions }: { conditions: LocationConditions }) {
  const { location, weather } = conditions;
  const now = new Date();
  const pos = getSunPosition(now, location.latitude, location.longitude);
  const ev = sunEvents(now, location.latitude, location.longitude);

  const fmtTime = (d: Date | null) =>
    d ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: weather.timezone }).format(d) : "—";

  const dayLen = ev.rise && ev.set ? (ev.set.getTime() - ev.rise.getTime()) / 3_600_000 : null;

  return (
    <div className="glass-card p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Sun className="h-3.5 w-3.5 text-primary" />
        The sun
      </div>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background/50">
          <AnimatedSun size={56} warm={weather.feelsLike >= 22} />
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold">
            {pos.visible
              ? `Up · ${Math.round(pos.altitude)}° above the ${compass(pos.azimuth)}`
              : "Below the horizon"}
          </div>
          <div className="text-xs text-muted-foreground">
            UV index {Math.round(weather.uvIndex)} · {uvBlurb(weather.uvIndex)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <Slot label="Sunrise" value={fmtTime(ev.rise)} />
        <Slot label="Solar noon" value={`${fmtTime(ev.peak)} · ${Math.round(ev.peakAltitude)}°`} />
        <Slot label="Sunset" value={fmtTime(ev.set)} />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {dayLen ? `Daylight lasts about ${dayLen.toFixed(1)} hours. ` : ""}
        Solar noon is when the sun is highest — that's your peak-UV window.
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

function uvBlurb(uv: number): string {
  if (uv < 3) return "low, no burn risk today";
  if (uv < 6) return "moderate, cover up if you're out for hours";
  if (uv < 8) return "high — SPF 30+, hat, shade at midday";
  if (uv < 11) return "very high — burn possible in under 15 min";
  return "extreme — avoid direct sun 11am–3pm";
}