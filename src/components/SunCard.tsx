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

  // Progress across the arc: 0 at sunrise, 1 at sunset. Clamp before/after.
  const progress = (() => {
    if (!ev.rise || !ev.set) return 0.5;
    const t = now.getTime();
    const r = ev.rise.getTime();
    const s = ev.set.getTime();
    if (t <= r) return 0;
    if (t >= s) return 1;
    return (t - r) / (s - r);
  })();
  // Semi-circle arc from (20,90) sunrise → (180,90) sunset, apex at (100,15).
  const arcCx = 100, arcCy = 90, arcR = 80;
  const angle = Math.PI * (1 - progress); // π at rise, 0 at set
  const sunX = arcCx + arcR * Math.cos(angle);
  const sunY = arcCy - arcR * Math.sin(angle);
  const belowHorizon = !pos.visible;

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

      {/* Animated sun-arc: solid path from rise to set, with the current
          sun position tracked along it. */}
      <div className="mt-4 rounded-2xl bg-gradient-to-b from-primary/10 to-background/40 p-3">
        <svg viewBox="0 0 200 110" className="h-24 w-full">
          <defs>
            <linearGradient id="sun-arc-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="hsl(28 90% 60%)" stopOpacity="0.85" />
              <stop offset="0.5" stopColor="hsl(48 95% 65%)" stopOpacity="0.95" />
              <stop offset="1" stopColor="hsl(18 90% 55%)" stopOpacity="0.85" />
            </linearGradient>
            <radialGradient id="sun-arc-sun" cx="50%" cy="50%">
              <stop offset="0" stopColor="hsl(48 100% 75%)" />
              <stop offset="1" stopColor="hsl(28 90% 55%)" />
            </radialGradient>
          </defs>
          {/* Horizon */}
          <line x1="10" y1="90" x2="190" y2="90" stroke="hsl(var(--foreground) / 0.25)" strokeDasharray="2 3" />
          {/* Arc */}
          <path
            d={`M 20 90 A ${arcR} ${arcR} 0 0 1 180 90`}
            fill="none"
            stroke="url(#sun-arc-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Endpoint markers */}
          <circle cx="20" cy="90" r="2.5" fill="hsl(28 80% 60%)" />
          <text x="20" y="104" textAnchor="middle" fontSize="9" fill="hsl(var(--foreground) / 0.75)" fontWeight="600">
            {fmtTime(ev.rise)}
          </text>
          <circle cx="180" cy="90" r="2.5" fill="hsl(18 80% 55%)" />
          <text x="180" y="104" textAnchor="middle" fontSize="9" fill="hsl(var(--foreground) / 0.75)" fontWeight="600">
            {fmtTime(ev.set)}
          </text>
          {/* Current sun position */}
          {!belowHorizon && (
            <g>
              <circle cx={sunX} cy={sunY} r="10" fill="url(#sun-arc-sun)" opacity="0.35" />
              <circle cx={sunX} cy={sunY} r="5.5" fill="url(#sun-arc-sun)">
                <animate attributeName="r" values="5;6;5" dur="2.4s" repeatCount="indefinite" />
              </circle>
            </g>
          )}
          {belowHorizon && (
            <text x="100" y="60" textAnchor="middle" fontSize="10" fill="hsl(var(--foreground) / 0.7)" fontWeight="600">
              Below the horizon
            </text>
          )}
        </svg>
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