import { useEffect, useState } from "react";
import type { LocationConditions, WeatherHour } from "@/lib/types";
import { Bell, Sun, Cloud, CloudRain, CloudSnow, Wind, Thermometer, Moon, Umbrella, Droplets } from "lucide-react";
import { dayGradient } from "@/lib/dayGradient";
import { describeWeather } from "@/lib/weatherCodes";

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
          <li
            key={i}
            className="relative flex items-start gap-3 overflow-hidden rounded-2xl border border-border/60 p-3 animate-fade-in-up"
            style={{ backgroundImage: a.gradient }}
          >
            <div className="pointer-events-none absolute inset-0 bg-background/55" />
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background/70 text-primary backdrop-blur">
              {a.icon}
            </div>
            <div className="relative min-w-0">
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
  gradient: string;
}

function buildAlerts(c: LocationConditions): Alert[] {
  const w = c.weather;
  const tz = w.timezone;
  const hours = w.hourly.slice(0, 30);
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
  const seen = new Set<string>();
  for (const p of periods) {
    const slice = sliceHours(hours, p.from, p.to, tz);
    if (!slice.length) continue;
    const a = describePeriod(p.label, slice, w);
    if (!a) continue;
    // De-dupe by *content* — two different windows with identical advice
    // would just be noise. Skip the later one in that case.
    const fp = a.text.slice(0, 60).toLowerCase();
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push(a);
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

  // Per-period intros keep neighbouring alerts distinct even when the
  // weather is broadly similar across the day.
  const period = periodKey(label);
  const intro = INTRO[period];

  // Colour the row using the same gradient language as the 7-day list,
  // so the user reads temperature/condition at a glance.
  const avgFeel = (minF + maxF) / 2;
  const dominantCode = slice.reduce((acc, h) => h.precipProb > (acc.precipProb ?? 0) ? h : acc, slice[0]).weatherCode;
  const skyInfo = describeWeather(dominantCode, !isOvernight);
  const gradient = dayGradient(avgFeel, skyInfo.sky);

  // Prioritise the most "newsworthy" angle for the period.
  if (heavyRain && heavyRunStart && heavyRunEnd) {
    const start = fmtTime(heavyRunStart.time);
    const end = fmtTime(addHour(heavyRunEnd.time, 1));
    const pk = Math.round(peakRain.precipProb);
    return {
      window: label.toUpperCase(),
      text: `${intro.rainPrefix} ${start}–${end}, peaking at ${pk}% chance. ${rainAnalogy(pk)} ${intro.rainTail}`,
      icon: <CloudRain className="h-4 w-4" />,
      gradient,
    };
  }
  if (anyRain) {
    const pk = Math.round(peakRain.precipProb);
    const at = fmtTime(peakRain.time);
    return {
      window: label.toUpperCase(),
      text: `${intro.showerPrefix} ${at} — ${pk}% chance, feels ${Math.round(peakRain.feelsLike)}°. ${pk >= 60 ? "Worth a proper jacket, not just a thin layer." : "Worth keeping a brolly within reach."}`,
      icon: <Umbrella className="h-4 w-4" />,
      gradient,
    };
  }
  if (cold && isOvernight) {
    return {
      window: label.toUpperCase(),
      text: `Lows around ${minF}° — ${coldAnalogy(minF)}. ${minF <= 2 ? "Bring tender plants in before dusk; expect frost on windscreens by sunrise." : "A car parked out will be cold to the touch in the morning."}`,
      icon: <Moon className="h-4 w-4" />,
      gradient,
    };
  }
  if (cold) {
    return {
      window: label.toUpperCase(),
      text: `${intro.coldPrefix} ${minF}–${maxF}° — ${coldAnalogy(minF)}. Exposed skin will cool fast; layer up and keep stops outside brief.`,
      icon: <Thermometer className="h-4 w-4" />,
      gradient,
    };
  }
  if (hot) {
    return {
      window: label.toUpperCase(),
      text: `${intro.hotPrefix} ${maxF}° — ${hotAnalogy(maxF)}. ${intro.hotTail}`,
      icon: <Sun className="h-4 w-4" />,
      gradient,
    };
  }
  if (windyKick) {
    return {
      window: label.toUpperCase(),
      text: `Winds pushing ${Math.round(w.windSpeed)} mph with gusts to ${Math.round(w.windGust)} mph — cheap umbrellas flip, bin lids travel. A windproof shell beats a brolly today.`,
      icon: <Wind className="h-4 w-4" />,
      gradient,
    };
  }
  if (w.humidity >= 80 && !anyRain) {
    return {
      window: label.toUpperCase(),
      text: `Air's heavy and damp at ${Math.round(w.humidity)}% humidity, feels-like ${minF}–${maxF}°. No rain in the forecast but everything outside will feel clammy — keep a light layer handy.`,
      icon: <Droplets className="h-4 w-4" />,
      gradient,
    };
  }
  // Mild fallback — vary copy per period so they don't blur together.
  return {
    window: label.toUpperCase(),
    text: `${intro.calmPrefix} ${minF}–${maxF}°, rain chance ${Math.round(peakRain.precipProb)}%, wind ${Math.round(w.windSpeed)} mph. ${intro.calmTail}`,
    icon: <Cloud className="h-4 w-4" />,
    gradient,
  };
}

type PeriodKey = "now" | "morning" | "midday" | "afternoon" | "evening" | "tonight";
function periodKey(label: string): PeriodKey {
  if (label.startsWith("Now")) return "now";
  if (label.startsWith("Morning")) return "morning";
  if (label.startsWith("Midday")) return "midday";
  if (label.startsWith("Afternoon")) return "afternoon";
  if (label.startsWith("Evening")) return "evening";
  return "tonight";
}

const INTRO: Record<PeriodKey, {
  rainPrefix: string; rainTail: string;
  showerPrefix: string;
  coldPrefix: string;
  hotPrefix: string; hotTail: string;
  calmPrefix: string; calmTail: string;
}> = {
  now: {
    rainPrefix: "Heavy rain window right now",
    rainTail: "Sort the hood/brolly before stepping out.",
    showerPrefix: "Showers brewing around",
    coldPrefix: "Right now feels-like",
    hotPrefix: "Already up at",
    hotTail: "Grab water before the next thing on your list.",
    calmPrefix: "Quiet right now — feels",
    calmTail: "Good window to crack on with anything outdoors.",
  },
  morning: {
    rainPrefix: "Morning soaking",
    rainTail: "Set off 10–15 min earlier and ditch the suede.",
    showerPrefix: "Morning shower likely around",
    coldPrefix: "Cold start, feels-like",
    hotPrefix: "Mornings warming to",
    hotTail: "Walk on the shaded side of the street.",
    calmPrefix: "Gentle morning — feels",
    calmTail: "Decent window for the school run or a coffee walk.",
  },
  midday: {
    rainPrefix: "Lunchtime downpour",
    rainTail: "Eat in or grab takeaway; al-fresco's a non-starter.",
    showerPrefix: "Lunchtime shower risk around",
    coldPrefix: "Midday isn't warming up — feels",
    hotPrefix: "Peak heat hits",
    hotTail: "Avoid direct sun 12–3; SPF and a hat if you must.",
    calmPrefix: "Easy midday — feels",
    calmTail: "Good slot for a proper outdoor break.",
  },
  afternoon: {
    rainPrefix: "Afternoon rain band",
    rainTail: "Wipers and lights early; plan an extra 10 min back.",
    showerPrefix: "Afternoon shower risk around",
    coldPrefix: "Afternoon stays nippy — feels",
    hotPrefix: "Afternoon climbing to",
    hotTail: "Hydrate before the heat-of-the-day errands.",
    calmPrefix: "Mellow afternoon — feels",
    calmTail: "Errands, park runs, or al-fresco coffee all on.",
  },
  evening: {
    rainPrefix: "Evening rain window",
    rainTail: "Plans outside? Move them under cover.",
    showerPrefix: "Evening shower likely around",
    coldPrefix: "Evening drops to",
    hotPrefix: "Sticky evening still at",
    hotTail: "Windows open, fan on; outdoor dining stays civilised.",
    calmPrefix: "Pleasant evening — feels",
    calmTail: "Dinner outside or a stroll both look on.",
  },
  tonight: {
    rainPrefix: "Overnight rain band",
    rainTail: "Close windows; the wash on the line is toast.",
    showerPrefix: "Overnight shower risk around",
    coldPrefix: "Overnight feels-like",
    hotPrefix: "Muggy night, still at",
    hotTail: "Bedroom fan and a glass of water by the bed.",
    calmPrefix: "Calm night — feels",
    calmTail: "Open the window if you sleep warm.",
  },
};

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