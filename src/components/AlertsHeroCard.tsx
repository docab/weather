import { useEffect, useMemo, useState } from "react";
import type { LocationConditions, WeatherHour } from "@/lib/types";
import { Zap, CloudRain, Wind, Sun, Thermometer, Umbrella, Droplets, Cloud, Moon } from "lucide-react";

/**
 * Top-of-Now hybrid: **Next 2 Hours** (immediate window) + **Smart Alerts**
 * (big-change windows across the next 24h). Refreshes automatically every
 * 15 min and re-derives whenever the active location changes.
 */
export function AlertsHeroCard({ conditions }: { conditions: LocationConditions }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 15 * 60_000);
    return () => clearInterval(id);
  }, []);

  const w = conditions.weather;
  const tz = w.timezone;
  const now = w.hourly[0];
  const soon = w.hourly.slice(1, 3);
  const nextLine = useMemo(() => buildNextLine(now, soon), [now, soon]);
  const alerts = useMemo(() => buildBigChangeAlerts(conditions), [conditions]);

  if (!now) return null;
  const advice = buildAdvice(conditions, alerts[0]);

  // Spacious frosted banner: trend on top, advice underneath.
  return (
    <section
      className="glass-card flex min-h-[76px] items-center gap-3 overflow-hidden rounded-3xl px-4 py-3 animate-fade-in"
      aria-label="Smart alerts"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
        <Zap className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-foreground">{nextLine}</p>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">{advice}</p>
      </div>
      <span className="shrink-0 self-start text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">2h</span>
    </section>
  );
}

/** One short line of what to actually do about the next two hours. */
function buildAdvice(c: LocationConditions, next?: AlertRow): string {
  const w = c.weather;
  const soon = w.hourly.slice(0, 3);
  const peak = Math.max(...soon.map(h => h.precipProb), 0);
  if (next) return `${next.window} · ${next.text.split(".")[0]}.`;
  if (peak >= 60) return "Take a brolly — rain is likely within the next 2 hours.";
  if (peak >= 30) return "Maybe pocket a brolly; showers are possible.";
  if (w.windSpeed >= 25) return "Blustery out — a hood beats a hat right now.";
  if (w.uvIndex >= 6) return "Strong sun — SPF if you're out for more than 20 minutes.";
  return "No umbrella needed for the next 2 hours.";
}

interface AlertRow { window: string; text: string; icon: React.ReactNode }

function buildNextLine(h0?: WeatherHour, soon?: WeatherHour[]): string {
  if (!h0) return "—";
  const h1 = soon?.[0], h2 = soon?.[1];
  const rainNow = (h0.precipMm ?? 0) > 0.05;
  const rainSoon = [h1, h2].some(h => h && h.precipProb >= 50);
  const dT = h2 ? Math.round(h2.feelsLike - h0.feelsLike) : 0;
  const trend = dT >= 2 ? `warming ${Math.abs(dT)}°` : dT <= -2 ? `cooling ${Math.abs(dT)}°` : "holding steady";
  if (rainNow) return `Raining now — likely continuing an hour or two, ${trend} into ${h2 ? Math.round(h2.feelsLike) : Math.round(h0.feelsLike)}°.`;
  if (rainSoon) return `Dry now but rain building — ${trend}. Brolly within reach.`;
  return `Steady around ${Math.round(h0.feelsLike)}°, ${trend}. Rain chance stays low (${Math.round(h0.precipProb)}%).`;
}

/** Pattern-group the next 24h and emit one alert per meaningful change window. */
function buildBigChangeAlerts(c: LocationConditions): AlertRow[] {
  const w = c.weather;
  const tz = w.timezone;
  const nowMs = Date.now();
  // Future-only, next 12h max
  const hours = w.hourly.filter(h => new Date(h.time).getTime() >= nowMs).slice(0, 12);
  if (hours.length < 3) return [];

  type Sig = "rain-heavy" | "rain" | "hot" | "cold" | "windy" | "muggy" | "calm";
  const sigOf = (h: WeatherHour): Sig => {
    if (h.precipProb >= 70) return "rain-heavy";
    if (h.precipProb >= 40) return "rain";
    if (h.feelsLike >= 28) return "hot";
    if (h.feelsLike <= 3) return "cold";
    if ((h.windSpeed ?? w.windSpeed) >= 22) return "windy";
    if ((h.humidity ?? w.humidity) >= 80 && h.feelsLike >= 20) return "muggy";
    return "calm";
  };

  const clusters: { sig: Sig; hs: WeatherHour[] }[] = [];
  for (const h of hours) {
    const s = sigOf(h);
    const last = clusters[clusters.length - 1];
    if (last && last.sig === s) last.hs.push(h);
    else clusters.push({ sig: s, hs: [h] });
  }

  // Skip the first cluster if it just describes "now" — Next 2 hours already covers it.
  const rest = clusters.slice(clusters[0]?.hs.length && clusters[0].hs.length <= 2 ? 1 : (clusters[0]?.sig === "calm" ? 1 : 0));
  // Drop trailing calm.
  // At most one big-change alert; combined with Next-2h we show 2 total.
  const meaningful = rest.filter(c => c.sig !== "calm").slice(0, 1);

  return meaningful.map((cl): AlertRow => {
    const first = cl.hs[0], last = cl.hs[cl.hs.length - 1];
    const window = fmtRange(first.time, new Date(new Date(last.time).getTime() + 3600_000).toISOString(), tz);
    const feels = cl.hs.map(h => h.feelsLike);
    const minF = Math.round(Math.min(...feels));
    const maxF = Math.round(Math.max(...feels));
    const peakRain = Math.max(...cl.hs.map(h => h.precipProb));
    let text = ""; let icon: React.ReactNode = <Cloud className="h-4 w-4" />;
    switch (cl.sig) {
      case "rain-heavy":
        text = `Heavy rain window — peaking ${Math.round(peakRain)}% chance. Waterproofs, not a brolly. Feels ${minF}–${maxF}°.`;
        icon = <CloudRain className="h-4 w-4" />; break;
      case "rain":
        text = `Showers likely, peaking ${Math.round(peakRain)}%. Keep a brolly close — feels ${minF}–${maxF}°.`;
        icon = <Umbrella className="h-4 w-4" />; break;
      case "hot":
        text = `Heat window — peaks ${maxF}°. Water bottle, shade between 12–3, SPF a must.`;
        icon = <Sun className="h-4 w-4" />; break;
      case "cold":
        text = `Cold snap — dips to ${minF}°. Base layer, gloves, warm-up before exertion.`;
        icon = <Thermometer className="h-4 w-4" />; break;
      case "windy":
        text = `Blustery — wind up. Cheap brollies flip; a hood beats a hat.`;
        icon = <Wind className="h-4 w-4" />; break;
      case "muggy":
        text = `Muggy patch — heavy air at ${minF}–${maxF}°. Linen/cotton, sip water.`;
        icon = <Droplets className="h-4 w-4" />; break;
      default:
        text = `Calm and mild — feels ${minF}–${maxF}°, rain chance ${Math.round(peakRain)}%.`;
        icon = maxF >= 22 ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />;
    }
    return { window, text, icon };
  });
}

function fmtRange(startISO: string, endISO: string, tz: string): string {
  const s = fmtHour(startISO, tz);
  const e = fmtHour(endISO, tz);
  const day = dayTag(startISO, tz);
  return `${s}–${e}`.toUpperCase() + (day ? ` · ${day}` : "");
}

/**
 * Tag a window with the day it lands on so a 2am alert doesn't read as if
 * it's happening this afternoon. Blank for windows later today.
 */
function dayTag(iso: string, tz: string): string {
  const key = (d: Date) => new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: tz }).format(d);
  const target = new Date(iso);
  const now = new Date();
  if (key(target) === key(now)) {
    const hr = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz }).format(target));
    return hr >= 19 ? "Tonight" : "";
  }
  const tomorrow = new Date(now.getTime() + 86_400_000);
  if (key(target) === key(tomorrow)) return "Tomorrow";
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: tz }).format(target);
}
function fmtHour(iso: string, tz: string): string {
  const d = new Date(iso);
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz }).format(d));
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${suffix}`;
}