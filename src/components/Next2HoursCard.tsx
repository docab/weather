import { useMemo } from "react";
import type { LocationConditions } from "@/lib/types";
import { describeWeather } from "@/lib/weatherCodes";
import { dayGradient } from "@/lib/dayGradient";
import { Zap, CloudRain, Wind } from "lucide-react";

/**
 * Next 2 hours micro-forecast. Pattern-grouped like the smart alerts,
 * but zoomed in on right-now → 120 minutes ahead.
 */
export function Next2HoursCard({ conditions }: { conditions: LocationConditions }) {
  const w = conditions.weather;
  const [h0, h1, h2] = w.hourly;
  const summary = useMemo(() => buildTwoHourLine(h0, h1, h2), [h0, h1, h2]);
  if (!h0) return null;
  const info = describeWeather(h0.weatherCode, w.isDay);
  const grad = dayGradient(h0.feelsLike, info.sky);

  return (
    <section id="next2" className="relative overflow-hidden rounded-2xl border border-border/40 shadow-card animate-fade-in-up" style={{ backgroundImage: grad }}>
      <div className="pointer-events-none absolute inset-0 bg-background/45 backdrop-blur-[1px]" />
      <div className="relative flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background/70 text-primary backdrop-blur">
          <Zap className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Next 2 hours</div>
          <p className="mt-0.5 text-sm leading-relaxed text-foreground/95">{summary}</p>
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-foreground/80">
            <span className="inline-flex items-center gap-1"><CloudRain className="h-3 w-3" />{Math.round(Math.max(h0.precipProb, h1?.precipProb ?? 0, h2?.precipProb ?? 0))}%</span>
            <span className="inline-flex items-center gap-1"><Wind className="h-3 w-3" />{Math.round(w.windSpeed)} mph</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function buildTwoHourLine(h0?: {feelsLike:number;precipProb:number;precipMm?:number}, h1?: {feelsLike:number;precipProb:number}, h2?: {feelsLike:number;precipProb:number}): string {
  if (!h0) return "—";
  const rainNow = (h0.precipMm ?? 0) > 0.05;
  const rainSoon = [h1, h2].some(h => h && h.precipProb >= 50);
  const dT = h2 ? Math.round(h2.feelsLike - h0.feelsLike) : 0;
  const tempTrend = dT >= 2 ? ` warming ${Math.abs(dT)}°` : dT <= -2 ? ` cooling ${Math.abs(dT)}°` : " holding steady";
  if (rainNow) return `Raining now — likely continuing for the next hour or two,${tempTrend} into ${h2 ? Math.round(h2.feelsLike) : Math.round(h0.feelsLike)}°.`;
  if (rainSoon) return `Dry now but rain building${tempTrend} — brolly within reach for the next 2 hours.`;
  return `Steady around ${Math.round(h0.feelsLike)}°,${tempTrend}. Rain chance stays low (${Math.round(h0.precipProb)}%).`;
}