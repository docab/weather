import { useState, useMemo } from "react";
import type { LocationConditions, WeatherHour } from "@/lib/types";
import { describeWeather } from "@/lib/weatherCodes";
import { CloudRain, Sun, Wind, ChevronDown, Droplets, Thermometer } from "lucide-react";
import { dayGradient } from "@/lib/dayGradient";
import { cn } from "@/lib/utils";

interface Props {
  conditions: LocationConditions;
}

/**
 * 7-day forecast for the active location, written in plain language.
 */
export function ForecastView({ conditions }: Props) {
  const days = conditions.weather.daily.slice(0, 10);
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <div className="space-y-3 animate-fade-in-up">
      <div className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Next {days.length} days · {conditions.location.name}
      </div>
      <div className="overflow-hidden glass-card shadow-card">
        {days.map((d, i) => {
          const info = describeWeather(d.weatherCode, true);
          const Icon = info.Icon;
          const isOpen = openIdx === i;
          return (
            <div key={d.date} className={i > 0 ? "border-t border-border/60" : ""}>
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : i)}
                style={{ backgroundImage: dayGradient(d.high, info.sky) }}
                className="relative grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-3 text-left transition hover:brightness-110"
                aria-expanded={isOpen}
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
                <ChevronDown className={cn("h-4 w-4 text-foreground/60 transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <DayExpansion day={d.date} conditions={conditions} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Twelve 2-hour bins across the selected day — a compact hourly outlook
 * without wear/fragrance/smart alerts (that's Now-tab territory).
 */
function DayExpansion({ day, conditions }: { day: string; conditions: LocationConditions }) {
  const tz = conditions.weather.timezone;
  const dayHours = useMemo(() => {
    const target = day.slice(0, 10);
    return conditions.weather.hourly.filter(h => {
      const local = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(h.time));
      return local === target;
    });
  }, [day, conditions, tz]);

  if (!dayHours.length) {
    // Fall back to a full-day narrative when hourly data isn't published this
    // far ahead. Pulls temp/precip/wind/UV/pollen from the daily summary.
    const dayEntry = conditions.weather.daily.find(x => x.date.slice(0, 10) === day.slice(0, 10));
    if (!dayEntry) return null;
    return (
      <div className="border-t border-border/40 bg-background/40 p-4 text-xs leading-relaxed text-foreground/85 animate-fade-in-up">
        <p>{longDayNarrative(dayEntry, conditions)}</p>
      </div>
    );
  }

  // 2-hour bins for a tidy 12-slot grid.
  const bins: WeatherHour[][] = [];
  for (let i = 0; i < dayHours.length; i += 2) bins.push(dayHours.slice(i, i + 2));

  const rainTotal = dayHours.reduce((s, h) => s + (h.precipMm ?? 0), 0);
  const peakWind = Math.max(...dayHours.map(h => h.windSpeed ?? 0));
  const avgHum = Math.round(dayHours.reduce((s, h) => s + (h.humidity ?? 0), 0) / dayHours.length);

  return (
    <div className="border-t border-border/40 bg-background/50 p-3 animate-fade-in-up">
      <div className="mb-2 grid grid-cols-3 gap-2 text-[11px]">
        <Metric icon={<Droplets className="h-3 w-3" />} label="Rain total" value={`${rainTotal.toFixed(1)} mm`} />
        <Metric icon={<Wind className="h-3 w-3" />} label="Peak wind" value={`${Math.round(peakWind)} mph`} />
        <Metric icon={<Thermometer className="h-3 w-3" />} label="Humidity" value={`${avgHum}%`} />
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {bins.map((b, i) => {
          const rep = b[0];
          const info = describeWeather(rep.weatherCode, true);
          const HourIcon = info.Icon;
          const label = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz }).format(new Date(rep.time));
          const peakP = Math.max(...b.map(h => h.precipProb));
          const meanT = Math.round(b.reduce((s, h) => s + h.temp, 0) / b.length);
          return (
            <div
              key={i}
              className="rounded-lg p-1.5 text-center"
              style={{ backgroundImage: dayGradient(meanT, info.sky) }}
            >
              <div className="text-[10px] font-semibold text-foreground/85">{label}</div>
              <HourIcon className="mx-auto my-0.5 h-3.5 w-3.5 text-foreground/80" strokeWidth={1.6} />
              <div className="text-[11px] font-bold tabular">{meanT}°</div>
              <div className="text-[9px] text-foreground/70">{Math.round(peakP)}%</div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-foreground/85">
        {focusedOutlook(dayHours)}
      </p>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </div>
      <div className="mt-0.5 text-xs font-bold tabular">{value}</div>
    </div>
  );
}

function focusedOutlook(hours: WeatherHour[]): string {
  const wetHours = hours.filter(h => h.precipProb >= 60);
  const parts: string[] = [];
  if (wetHours.length) {
    const start = new Date(wetHours[0].time).getHours();
    const end = new Date(wetHours[wetHours.length - 1].time).getHours();
    parts.push(`Wettest window ${start}:00–${end}:00`);
  }
  const morningHours = hours.filter(h => { const H = new Date(h.time).getHours(); return H >= 6 && H < 12; });
  const afternoonHours = hours.filter(h => { const H = new Date(h.time).getHours(); return H >= 12 && H < 18; });
  const avg = (xs: WeatherHour[]) => xs.length ? Math.round(xs.reduce((s, h) => s + h.temp, 0) / xs.length) : NaN;
  const morn = avg(morningHours), aft = avg(afternoonHours);
  if (!isNaN(morn) && !isNaN(aft)) parts.push(`Morning ~${morn}°, afternoon peaks ~${aft}°`);
  return parts.join(" · ") + ".";
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