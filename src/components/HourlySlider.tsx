import { useMemo, useRef, useState } from "react";
import type { WeatherHour } from "@/lib/types";
import type { LocationConditions } from "@/lib/types";
import { describeWeather } from "@/lib/weatherCodes";
import { dayGradient } from "@/lib/dayGradient";
import { CloudRain, Droplets, Wind, Thermometer, Clock } from "lucide-react";
import { DetailModal, ExplainerBlock } from "./ui/detail-modal";
import { explainPrecipProb, explainWind, explainHumidity, explainTemp } from "@/lib/explainers";

/**
 * Beautiful 24-hour slider with per-hour colouring (temperature + condition),
 * day dividers ("Today" / "Tomorrow · Wed"), and a tap-to-open detail modal
 * per hour.
 *
 * Replaces the older static HourlyStrip.
 */
export function HourlySlider({ conditions }: { conditions: LocationConditions }) {
  const hours = useMemo(() => conditions.weather.hourly.slice(0, 24), [conditions]);
  const tz = conditions.weather.timezone;
  const [selected, setSelected] = useState<WeatherHour | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Detect day boundaries so we can inject "Tomorrow · Wed" markers.
  const dayLabels = useMemo(() => {
    const seen = new Map<string, string>();
    hours.forEach(h => {
      const key = new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: tz }).format(new Date(h.time));
      if (!seen.has(key)) {
        const dt = new Date(h.time);
        const today = new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: tz }).format(new Date());
        const label = key === today
          ? "Today"
          : new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: tz }).format(dt);
        seen.set(key, label);
      }
    });
    return seen;
  }, [hours, tz]);

  return (
    <>
      <section id="hourly" className="glass-card p-4 shadow-card animate-fade-in-up">
        <header className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" /> Next 24 hours
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Tap for details</div>
        </header>
        <div ref={scrollRef} className="-mx-1 flex snap-x snap-mandatory gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {hours.map((h, i) => {
            const info = describeWeather(h.weatherCode, isDayHour(h.time, tz));
            const Icon = info.Icon;
            const grad = dayGradient(h.feelsLike, info.sky);
            const localHour = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz }).format(new Date(h.time));
            const key = new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: tz }).format(new Date(h.time));
            const showDivider = i === 0 || (i > 0 && key !== new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: tz }).format(new Date(hours[i-1].time)));
            return (
              <div key={h.time} className="flex snap-start items-stretch">
                {showDivider && (
                  <div className="flex flex-col items-center justify-center px-2">
                    <div className="rotate-0 whitespace-nowrap rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
                      {dayLabels.get(key)}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setSelected(h)}
                  className="relative flex w-16 flex-col items-center overflow-hidden rounded-2xl border border-border/40 p-2 text-center transition hover:scale-[1.04] hover:shadow-lg animate-fade-in"
                  style={{ backgroundImage: grad }}
                >
                  <div className="pointer-events-none absolute inset-0 bg-background/25" />
                  <div className="relative text-[10px] font-bold uppercase tracking-wider text-foreground/90">{i === 0 ? "Now" : `${localHour}:00`}</div>
                  <Icon className="relative my-1 h-6 w-6 text-foreground/95 drop-shadow" strokeWidth={1.7} />
                  <div className="relative text-sm font-bold tabular text-foreground">{Math.round(h.feelsLike)}°</div>
                  <div className="relative mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-foreground/80">
                    <CloudRain className="h-2.5 w-2.5" />{Math.round(h.precipProb)}%
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? hourTitle(selected, tz) : ""}
        tone={selected ? { backgroundImage: dayGradient(selected.feelsLike, describeWeather(selected.weatherCode, isDayHour(selected.time, tz)).sky) } : undefined}
      >
        {selected && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-foreground/90">
              {describeWeather(selected.weatherCode, isDayHour(selected.time, tz)).label}. Feels {Math.round(selected.feelsLike)}° (actual {Math.round(selected.temp)}°).
            </p>
            <ExplainerBlock {...explainTemp(selected.feelsLike, selected.temp)} value={`${Math.round(selected.feelsLike)}°`} />
            <ExplainerBlock {...explainPrecipProb(selected.precipProb)} value={`${Math.round(selected.precipProb)}%`} />
            {selected.windSpeed != null && (
              <ExplainerBlock {...explainWind(selected.windSpeed)} value={`${Math.round(selected.windSpeed)} mph`} />
            )}
            {selected.humidity != null && (
              <ExplainerBlock {...explainHumidity(selected.humidity, selected.temp)} value={`${Math.round(selected.humidity)}%`} />
            )}
            <div className="rounded-2xl bg-secondary/40 p-3 text-xs text-foreground/85">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Precipitation</span>
                <span className="tabular">{(selected.precipMm ?? 0).toFixed(1)} mm</span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">Cloud cover {Math.round(selected.cloudCover ?? 0)}%</div>
            </div>
          </div>
        )}
      </DetailModal>
    </>
  );
}

function isDayHour(iso: string, tz: string): boolean {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz }).format(new Date(iso)));
  return h >= 6 && h < 20;
}

function hourTitle(h: WeatherHour, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz,
  }).format(new Date(h.time));
}