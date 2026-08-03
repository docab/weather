import type { LocationConditions } from "@/lib/types";
import { getSunPosition, getMoonPosition, getMoonPhase, sunEvents, compass } from "@/lib/astronomy";
import { Sun } from "lucide-react";
import { AnimatedSun, AnimatedMoon } from "./fx/WeatherFX";

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

  const belowHorizon = !pos.visible;

  /* ------------------------------------------------------------------
   * Real trajectory. Instead of drawing a decorative semicircle and
   * guessing where the sun sits on it, we sample the ACTUAL solar
   * elevation across the day and build the path from those samples. The
   * marker is then placed with the very same mapping using the live
   * altitude, so the icon is always exactly on the curve and at the
   * true height in the sky.
   * ---------------------------------------------------------------- */
  const HORIZON_Y = 168;
  const TOP_Y = 34;          // generous top padding — the apex never clips
  const X0 = 24, X1 = 376;

  // Which body are we tracking? Sun by day, Moon once it's below the horizon.
  const nightMode = belowHorizon;
  const moonPhase = getMoonPhase(now);

  const startMs = nightMode
    ? (ev.set ? ev.set.getTime() : now.getTime() - 6 * 3_600_000)
    : (ev.rise ? ev.rise.getTime() : now.getTime() - 6 * 3_600_000);
  const endMs = nightMode
    ? (ev.rise && ev.set
        ? (ev.rise.getTime() > ev.set.getTime() ? ev.rise.getTime() : ev.set.getTime() + 12 * 3_600_000)
        : now.getTime() + 6 * 3_600_000)
    : (ev.set ? ev.set.getTime() : now.getTime() + 6 * 3_600_000);

  const altAt = (ms: number) =>
    nightMode
      ? getMoonPosition(new Date(ms), location.latitude, location.longitude).altitude
      : getSunPosition(new Date(ms), location.latitude, location.longitude).altitude;

  const SAMPLES = 48;
  const samples: { t: number; alt: number }[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const k = i / SAMPLES;
    samples.push({ t: k, alt: altAt(startMs + (endMs - startMs) * k) });
  }
  // Peak elevation of THIS trajectory drives the vertical scale, so a low
  // winter sun visibly hugs the horizon and a summer sun towers.
  const peakAlt = Math.max(6, ...samples.map(s => s.alt));
  const toX = (k: number) => X0 + (X1 - X0) * Math.max(0, Math.min(1, k));
  const toY = (alt: number) =>
    HORIZON_Y - (HORIZON_Y - TOP_Y) * Math.max(0, Math.min(1, alt / peakAlt));

  const pathD = samples
    .map((s, i) => `${i === 0 ? "M" : "L"} ${toX(s.t).toFixed(1)} ${toY(s.alt).toFixed(1)}`)
    .join(" ");

  // Live position — same mapping, so it lands precisely on the drawn path.
  const liveAlt = nightMode
    ? getMoonPosition(now, location.latitude, location.longitude).altitude
    : pos.altitude;
  const progress = Math.max(0, Math.min(1, (now.getTime() - startMs) / Math.max(1, endMs - startMs)));
  const sunX = toX(progress);
  const sunY = toY(liveAlt);
  const bodyVisible = liveAlt > -0.5;
  // Sky colour under the arc follows the sun's height, not the temperature.
  const alt = Math.max(0, Math.min(1, (pos.altitude + 6) / 60));
  const skyTop = pos.visible
    ? `hsl(${Math.round(212 - alt * 6)} ${Math.round(45 + alt * 30)}% ${Math.round(24 + alt * 26)}%)`
    : "hsl(230 55% 12%)";
  const skyBottom = pos.visible
    ? `hsl(${Math.round(38 - alt * 6)} ${Math.round(85 - alt * 30)}% ${Math.round(48 + alt * 22)}%)`
    : "hsl(226 45% 18%)";

  return (
    <div className="glass-card p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Sun className="h-3.5 w-3.5 text-primary" />
        The sun
      </div>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background/50">
          {nightMode
            ? <AnimatedMoon size={54} illumination={moonPhase.illumination} phase={moonPhase.phase} />
            : <AnimatedSun size={56} warm={weather.feelsLike >= 22} />}
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold">
            {pos.visible
              ? `Up · ${Math.round(pos.altitude)}° above the ${compass(pos.azimuth)}`
              : "Below the horizon"}
          </div>
          <div className="text-xs text-muted-foreground">
            {nightMode
              ? `Moon ${Math.round(moonPhase.illumination * 100)}% lit · next sunrise ${fmtTime(ev.rise)}`
              : `UV index ${Math.round(weather.uvIndex)} · ${uvBlurb(weather.uvIndex)}`}
          </div>
        </div>
      </div>

      {/* Animated sun-arc: solid path from rise to set, with the current
          sun position tracked along it. */}
      <div
        className="mt-4 overflow-hidden rounded-2xl p-3 pt-5"
        style={{ background: `linear-gradient(180deg, ${skyTop} 0%, ${skyBottom} 100%)` }}
      >
        <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" className="w-full overflow-visible">
          <defs>
            <linearGradient id="sun-arc-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="hsl(28 90% 60%)" stopOpacity="0.85" />
              <stop offset="0.5" stopColor="hsl(48 95% 65%)" stopOpacity="0.95" />
              <stop offset="1" stopColor="hsl(18 90% 55%)" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="moon-arc-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="hsl(220 40% 78%)" stopOpacity="0.7" />
              <stop offset="0.5" stopColor="hsl(215 60% 88%)" stopOpacity="0.9" />
              <stop offset="1" stopColor="hsl(230 40% 72%)" stopOpacity="0.7" />
            </linearGradient>
            <radialGradient id="sun-arc-sun" cx="50%" cy="50%">
              <stop offset="0" stopColor="hsl(48 100% 75%)" />
              <stop offset="1" stopColor="hsl(28 90% 55%)" />
            </radialGradient>
            <radialGradient id="sun-arc-glow" cx="50%" cy="50%">
              <stop offset="0" stopColor="hsl(48 100% 78%)" stopOpacity={0.55 * (0.35 + alt)} />
              <stop offset="1" stopColor="hsl(38 100% 60%)" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Horizon */}
          <line x1="8" y1="168" x2="392" y2="168" stroke="hsl(var(--foreground) / 0.3)" strokeDasharray="3 4" />
          {/* True elevation trajectory for today */}
          <path
            d={pathD}
            fill="none"
            stroke={nightMode ? "url(#moon-arc-grad)" : "url(#sun-arc-grad)"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {/* Endpoint markers */}
          <circle cx={X0} cy={HORIZON_Y} r="4" fill={nightMode ? "hsl(220 40% 78%)" : "hsl(28 80% 60%)"} />
          <text x={X0 + 2} y="190" textAnchor="middle" fontSize="14" fill="hsl(0 0% 100%)" fontWeight="700">
            {fmtTime(nightMode ? ev.set : ev.rise)}
          </text>
          <circle cx={X1} cy={HORIZON_Y} r="4" fill={nightMode ? "hsl(230 40% 72%)" : "hsl(18 80% 55%)"} />
          <text x={X1 - 2} y="190" textAnchor="middle" fontSize="14" fill="hsl(0 0% 100%)" fontWeight="700">
            {fmtTime(nightMode ? ev.rise : ev.set)}
          </text>
          {/* Live position — exactly on the curve */}
          {bodyVisible ? (
            <g>
              {!nightMode && <circle cx={sunX} cy={sunY} r="46" fill="url(#sun-arc-glow)" />}
              <circle cx={sunX} cy={sunY} r="18" fill={nightMode ? "hsl(215 60% 88%)" : "url(#sun-arc-sun)"} opacity={nightMode ? 0.18 : 0.32} />
              <circle cx={sunX} cy={sunY} r="9" fill={nightMode ? "hsl(215 65% 92%)" : "url(#sun-arc-sun)"}>
                <animate attributeName="r" values="8.5;10.5;8.5" dur="2.4s" repeatCount="indefinite" />
              </circle>
            </g>
          ) : (
            <text x="200" y="96" textAnchor="middle" fontSize="14" fill="hsl(0 0% 100% / 0.85)" fontWeight="600">
              {nightMode ? "Night — the moon is below the horizon too" : "Below the horizon"}
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