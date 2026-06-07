import { useEffect, useState } from "react";
import type { LocationConditions, WeatherHour } from "@/lib/types";
import { Bell, Sun, Cloud, CloudRain, CloudSnow, Wind, Thermometer, Moon, Umbrella, Droplets } from "lucide-react";

/**
 * Smart Alerts — personalised, time-bucketed observations and warnings
 * drawn from the next 24h of hourly data. Re-renders every 15 minutes so
 * the windows roll forward as the day moves on. Copy uses concrete
 * numbers and analogies — never vague hand-waves like "low single digits".
 */
export function SmartAlertsCard({ conditions }: { conditions: LocationConditions }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 15 * 60_000);
    return () => clearInterval(id);
  }, []);

  const alerts = buildAlerts(conditions);
  if (!alerts.length) return null;

  return (
    <div className="glass-card p-5 shadow-card animate-fade-in">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Bell className="h-3.5 w-3.5 text-primary" /> Smart alerts
      </div>
      <ul className="space-y-3">
        {alerts.map((a, i) => (
          <li key={i} className="flex items-start gap-3 rounded-2xl glass-tile p-3 animate-fade-in-up">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary`}>
              {a.icon}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {a.window}
              </div>
              <p className="mt-0.5 text-sm leading-relaxed text-foreground/95">{a.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Alert {
  window: string;
  text: string;
  icon: React.ReactNode;
}

function buildAlerts(c: LocationConditions): Alert[] {
  const w = c.weather;
  const tz = w.timezone;
  const hours = w.hourly.slice(0, 24);
  if (!hours.length) return [];

  const periods: { label: string; from: number; to: number }[] = [
    { label: "Now", from: 0, to: 3 },
    { label: "Morning (7–10am)", from: hourOf("07", tz), to: hourOf("10", tz) },
    { label: "Midday (11am–2pm)", from: hourOf("11", tz), to: hourOf("14", tz) },
    { label: "Afternoon (3–6pm)", from: hourOf("15", tz), to: hourOf("18", tz) },
    { label: "Evening (7–10pm)", from: hourOf("19", tz), to: hourOf("22", tz) },
    { label: "Tonight (11pm–6am)", from: hourOf("23", tz), to: hourOf("06", tz) + 24 },
  ];

  const out: Alert[] = [];
  for (const p of periods) {
    const slice = sliceHours(hours, p.from, p.to, tz);
    if (!slice.length) continue;
    const a = describePeriod(p.label, slice, w);
    if (a && !out.some(o => o.window === a.window)) out.push(a);
    if (out.length >= 4) break;
  }
  return out.slice(0, 4);
}

/** Hours since "now in tz". A target clock-hour returns the offset from
 *  the current local hour, wrapping forward (so 07 at 09:00 means tomorrow 07). */
function hourOf(hh: string, tz: string): number {
  const target = parseInt(hh, 10);
  const nowHr = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz })
      .format(new Date()).replace(":00", "")
  );
  let diff = target - nowHr;
  if (diff < 0) diff += 24;
  return diff;
}

function sliceHours(hours: WeatherHour[], fromOffset: number, toOffset: number, tz: string): WeatherHour[] {
  const now = Date.now();
  const fromMs = now + fromOffset * 3600_000;
  const toMs = now + toOffset * 3600_000;
  return hours.filter(h => {
    const t = new Date(h.time).getTime();
    return t >= fromMs - 30 * 60_000 && t <= toMs;
  });
}

function describePeriod(label: string, slice: WeatherHour[], w: { windSpeed: number; windGust: number; uvIndex: number; humidity: number }): Alert | null {
  const feels = slice.map(h => h.feelsLike);
  const minF = Math.round(Math.min(...feels));
  const maxF = Math.round(Math.max(...feels));
  const peakRain = slice.reduce((acc, h) => h.precipProb > acc.precipProb ? h : acc, slice[0]);
  const heavyRunStart = slice.find(h => h.precipProb >= 60);
  const heavyRunEnd = [...slice].reverse().find(h => h.precipProb >= 60);
  const anyRain = peakRain.precipProb >= 40;
  const heavyRain = (heavyRunStart && heavyRunEnd);
  const cold = minF <= 5;
  const hot = maxF >= 26;
  const windyKick = w.windSpeed >= 22 || w.windGust >= 35;
  const isOvernight = label.startsWith("Tonight");

  // Prioritise the most "newsworthy" angle for the period.
  if (heavyRain && heavyRunStart && heavyRunEnd) {
    const start = fmtTime(heavyRunStart.time);
    const end = fmtTime(addHour(heavyRunEnd.time, 1));
    const pk = Math.round(peakRain.precipProb);
    return {
      window: label.toUpperCase(),
      text: `Heavy rain window ${start}–${end}, peaking at ${pk}% chance. ${rainAnalogy(pk)} Plan around it — hoods up, wipers ready, extra 10–15 min on the road.`,
      icon: <CloudRain className="h-4 w-4" />,
    };
  }
  if (anyRain) {
    const pk = Math.round(peakRain.precipProb);
    const at = fmtTime(peakRain.time);
    return {
      window: label.toUpperCase(),
      text: `Showers possible around ${at} — ${pk}% chance, feels ${Math.round(peakRain.feelsLike)}°. ${pk >= 60 ? "Worth a proper jacket, not just a thin layer." : "Worth keeping a brolly within reach."}`,
      icon: <Umbrella className="h-4 w-4" />,
    };
  }
  if (cold && isOvernight) {
    return {
      window: label.toUpperCase(),
      text: `Lows around ${minF}° — ${coldAnalogy(minF)}. ${minF <= 2 ? "Bring tender plants in before dusk; expect frost on windscreens by sunrise." : "A car parked out will be cold to the touch in the morning."}`,
      icon: <Moon className="h-4 w-4" />,
    };
  }
  if (cold) {
    return {
      window: label.toUpperCase(),
      text: `Feels-like ${minF}–${maxF}° — ${coldAnalogy(minF)}. Exposed skin will cool fast; layer up and keep stops outside brief.`,
      icon: <Thermometer className="h-4 w-4" />,
    };
  }
  if (hot) {
    return {
      window: label.toUpperCase(),
      text: `Climbing to ${maxF}° — ${hotAnalogy(maxF)}. Carry water, find shade between 12 and 3, and don't trust dashboards as parking spots for chocolate.`,
      icon: <Sun className="h-4 w-4" />,
    };
  }
  if (windyKick) {
    return {
      window: label.toUpperCase(),
      text: `Winds pushing ${Math.round(w.windSpeed)} mph with gusts to ${Math.round(w.windGust)} mph — cheap umbrellas flip, bin lids travel. A windproof shell beats a brolly today.`,
      icon: <Wind className="h-4 w-4" />,
    };
  }
  if (w.humidity >= 80 && !anyRain) {
    return {
      window: label.toUpperCase(),
      text: `Air's heavy and damp at ${Math.round(w.humidity)}% humidity, feels-like ${minF}–${maxF}°. No rain in the forecast but everything outside will feel clammy — keep a light layer handy.`,
      icon: <Droplets className="h-4 w-4" />,
    };
  }
  // Mild fallback — only one per page so don't spam these.
  if (label === "Now") {
    return {
      window: label.toUpperCase(),
      text: `Quiet conditions for the next few hours — feels ${minF}–${maxF}°, light wind, rain chance under ${Math.round(peakRain.precipProb)}%. Good window to get the outdoor stuff done.`,
      icon: <Cloud className="h-4 w-4" />,
    };
  }
  return null;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function addHour(iso: string, h: number): string {
  return new Date(new Date(iso).getTime() + h * 3600_000).toISOString();
}
function coldAnalogy(f: number): string {
  if (f <= -5) return "the kind of cold that stings exposed skin within minutes";
  if (f <= 0) return "frost-on-the-grass cold, breath visible";
  if (f <= 3) return "fridge-shelf cold — gloves not optional";
  if (f <= 6) return "proper winter coat weather";
  return "jacket-and-jumper cool";
}
function hotAnalogy(f: number): string {
  if (f >= 35) return "dangerous, heatwave-level heat";
  if (f >= 30) return "shorts-and-shade hot, tarmac softens";
  if (f >= 26) return "linen-shirt warm, water bottle essential";
  return "comfortably warm";
}
function rainAnalogy(pct: number): string {
  if (pct >= 85) return "Expect a steady, soaking downpour — not drizzle.";
  if (pct >= 70) return "Heavy showers more likely than not.";
  return "Bands of rain rolling through.";
}

export function SnowIcon() { return <CloudSnow className="h-4 w-4" />; }