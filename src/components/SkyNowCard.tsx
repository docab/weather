import type { LocationConditions } from "@/lib/types";
import { getSunPosition, getMoonPosition, getMoonPhase, compass } from "@/lib/astronomy";
import { Cloud, Eye } from "lucide-react";
import { WeatherFX } from "./fx/WeatherFX";

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
      <div className="relative mt-4 overflow-hidden rounded-xl glass-tile p-3">
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Cloud className="h-3 w-3" /> Cloud cover</span>
          <span className="tabular">{Math.round(weather.cloudCover)}%</span>
        </div>
        <CloudLayer label="High" value={weather.cloudHigh} hint="cirrus · ice crystals, ≥ 6 km" />
        <CloudLayer label="Mid"  value={weather.cloudMid}  hint="altocumulus · 2–6 km" />
        <CloudLayer label="Low"  value={weather.cloudLow}  hint="stratus / fog · 0–2 km" />
        <p className="mt-2 text-xs text-foreground/85">{cloudLine}</p>
      </div>

      {/* Educational deep-dive: what each cloud tier means for the weather + your body */}
      <div className="relative mt-3 space-y-2">
        <CloudExplainer
          tier="High"
          layer="Cirrus"
          altitude="≥ 6 km / 20,000+ ft"
          appearance="Thin, wispy, hair-like strands."
          made="Entirely ice crystals — the air's too cold for liquid water."
          weather="Doesn't rain itself, but a thickening cirrus sheet is often the first sign of a warm front — precipitation within 24–36h."
          health="Marks a falling barometric gradient ahead of a front. That pressure drop lets tissues expand slightly and can trigger joint pain in arthritis or old injuries."
          active={weather.cloudHigh}
        />
        <CloudExplainer
          tier="Mid"
          layer="Altocumulus"
          altitude="2–6 km / 6,500–20,000 ft"
          appearance="Rolled, puffy patches — a 'mackerel sky'."
          made="Mostly supercooled water droplets, with some ice."
          weather="On a warm morning it signals an unstable atmosphere — often precedes isolated thunderstorms or heavy downpours by late afternoon."
          health="Tied to thunderstorm asthma: convective updrafts pull pollen into cloud base, humidity ruptures grains into fine, deeply respirable allergens that get swept back down."
          active={weather.cloudMid}
        />
        <CloudExplainer
          tier="Low"
          layer="Stratus / Fog"
          altitude="0–2 km / 0–6,500 ft"
          appearance="A featureless grey cloak; on the ground = fog."
          made="Liquid water droplets from cooling of a moist air mass."
          weather="Rare heavy downpours, but responsible for dreary drizzle, mist and light snow. Fog can drop visibility below 1 km."
          health="Fog traps PM2.5, PM10 and NO₂ — creates dense smog that flares asthma/COPD. Prolonged stratus cuts UV-B: less vitamin D synthesis, lower serotonin — worsens SAD and circadian dips."
          active={weather.cloudLow}
        />
      </div>
    </div>
  );
}

function CloudExplainer({ tier, layer, altitude, appearance, made, weather, health, active }: {
  tier: string; layer: string; altitude: string; appearance: string; made: string;
  weather: string; health: string; active: number;
}) {
  const strong = active >= 40;
  return (
    <details className={`group rounded-xl border p-3 text-xs ${strong ? "border-primary/40 bg-primary/10" : "border-border/60 bg-secondary/30"}`}>
      <summary className="flex cursor-pointer items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-widest">
        <span className="text-foreground/90">{tier} · {layer}</span>
        <span className="text-muted-foreground">{Math.round(active)}%</span>
      </summary>
      <div className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-foreground/85">
        <div><span className="font-semibold text-foreground">Altitude:</span> {altitude}</div>
        <div><span className="font-semibold text-foreground">Appearance:</span> {appearance}</div>
        <div><span className="font-semibold text-foreground">Made of:</span> {made}</div>
        <div><span className="font-semibold text-foreground">Weather impact:</span> {weather}</div>
        <div><span className="font-semibold text-foreground">Health impact:</span> {health}</div>
      </div>
    </details>
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