import type { LocationConditions } from "@/lib/types";
import { describeWeather } from "@/lib/weatherCodes";
import { CloudRain, Sun, Wind } from "lucide-react";

interface Props {
  conditions: LocationConditions;
}

/** Sky-temperature gradient. No greens, no teals — only the hues you'd
 *  actually see in the sky at that temperature/condition. */
function dayGradient(highC: number, sky: string): string {
  // Temperature anchor on the warm/cool axis (deep indigo → red).
  const t = Math.max(-10, Math.min(38, highC));
  // Hue stops: -10 → 235 (deep blue), 5 → 215 (steel blue), 14 → 205 (pale sky blue),
  // 22 → 45 (warm yellow), 28 → 28 (orange), 35 → 8 (red).
  let hue: number, sat: number, light: number;
  if (t < 5)        { hue = lerp(235, 215, (t + 10) / 15); sat = 55; light = 32; }
  else if (t < 14)  { hue = lerp(215, 205, (t - 5) / 9);    sat = 50; light = 42; }
  else if (t < 22)  { hue = lerp(205, 45,  (t - 14) / 8);   sat = 55; light = 48; }
  else if (t < 28)  { hue = lerp(45, 28,   (t - 22) / 6);   sat = 80; light = 52; }
  else              { hue = lerp(28, 8,    (t - 28) / 7);   sat = 85; light = 50; }

  // Sky modifier: rain & overcast pull saturation down and lighten/darken.
  if (sky === "rain")   { sat -= 25; light -= 6; }
  if (sky === "cloudy") { sat -= 18; light -= 2; }
  if (sky === "snow")   { sat = 12; light = 70; hue = 210; }

  const a = `hsl(${hue} ${clamp(sat, 8, 95)}% ${clamp(light, 18, 78)}% / 0.55)`;
  const b = `hsl(${hue} ${clamp(sat - 10, 6, 90)}% ${clamp(light - 10, 12, 70)}% / 0.18)`;
  return `linear-gradient(90deg, ${a} 0%, ${b} 60%, transparent 100%)`;
}
function lerp(a: number, b: number, t: number) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/**
 * 7-day forecast for the active location, written in plain language.
 */
export function ForecastView({ conditions }: Props) {
  const days = conditions.weather.daily.slice(0, 7);
  return (
    <div className="space-y-3 animate-fade-in-up">
      <div className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Next 7 days · {conditions.location.name}
      </div>
      <div className="overflow-hidden glass-card shadow-card">
        {days.map((d, i) => {
          const info = describeWeather(d.weatherCode, true);
          const Icon = info.Icon;
          return (
            <div
              key={d.date}
              style={{ backgroundImage: dayGradient(d.high, info.sky) }}
              className={`relative grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border/60" : ""}`}
            >
              <Icon className="h-7 w-7 text-foreground/85" strokeWidth={1.5} />
              <div className="min-w-0">
                <div className="text-sm font-semibold">{labelFor(d.date, i)}</div>
                <div className="text-xs text-muted-foreground">
                  {plainDayBriefing(d.weatherCode, d.precipProb, d.high, d.low, d.windMax, d.uvIndexMax)}
                </div>
              </div>
              <div className="text-right tabular">
                <div className="text-base font-bold leading-none">
                  {Math.round(d.high)}° <span className="text-xs font-normal text-muted-foreground">/ {Math.round(d.low)}°</span>
                </div>
                <div className="mt-1 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5"><CloudRain className="h-3 w-3" />{Math.round(d.precipProb)}%</span>
                  {d.uvIndexMax >= 6 && <span className="inline-flex items-center gap-0.5"><Sun className="h-3 w-3" />{Math.round(d.uvIndexMax)}</span>}
                  {d.windMax >= 25 && <span className="inline-flex items-center gap-0.5"><Wind className="h-3 w-3" />{Math.round(d.windMax)}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function labelFor(iso: string, idx: number): string {
  if (idx === 0) return "Today";
  if (idx === 1) return "Tomorrow";
  return new Date(iso).toLocaleDateString(undefined, { weekday: "long" });
}

function plainDayBriefing(
  code: number, precip: number, high: number, low: number, wind: number, uv: number,
): string {
  const info = describeWeather(code, true);
  const bits: string[] = [];

  // Sky/precipitation in plain English
  if (info.sky === "rain") {
    if (precip >= 70) bits.push("Wet through most of the day — bring waterproofs");
    else if (precip >= 40) bits.push("Showers likely — keep a brolly handy");
    else bits.push("Spot of rain possible");
  } else if (info.sky === "snow") {
    bits.push("Snow on the cards — wrap up");
  } else if (info.sky === "cloudy") {
    bits.push(precip >= 30 ? "Mostly grey, chance of a shower" : "Overcast and dry");
  } else if (info.sky === "clear") {
    bits.push(high >= 24 ? "Bright and warm — proper sunshine" : "Clear skies, easy day");
  } else {
    bits.push(info.label);
  }

  // Temperature feel
  if (high < 5) bits.push("biting cold");
  else if (high < 12) bits.push("chilly");
  else if (high >= 28) bits.push("hot");
  else if (high >= 22) bits.push("pleasantly warm");

  if (wind >= 40) bits.push("very windy");
  else if (wind >= 25) bits.push("breezy");

  if (uv >= 8) bits.push("strong sun — sunscreen on");
  else if (uv >= 6) bits.push("UV is high");

  // First letter cap, join with bullets
  return bits.map(b => b.charAt(0).toUpperCase() + b.slice(1)).join(" · ");
}