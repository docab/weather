import { useEffect, useMemo, useState } from "react";
import type { LocationConditions, WeatherHour } from "@/lib/types";
import { Bell, Zap, CloudRain, Wind, Sun, Thermometer, Umbrella, Droplets, Cloud, Moon } from "lucide-react";
import { describeWeather } from "@/lib/weatherCodes";
import { dayGradient } from "@/lib/dayGradient";

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
  const info = describeWeather(now.weatherCode, w.isDay);
  const grad = dayGradient(now.feelsLike, info.sky);
  const nowLabel = fmtRange(now.time, w.hourly[2]?.time ?? now.time, tz);

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-border/40 shadow-card animate-fade-in-up"
      style={{ backgroundImage: grad }}
    >
      <div className="pointer-events-none absolute inset-0 bg-background/55 backdrop-blur-[1px]" />
      <div className="relative p-5">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Bell className="h-3.5 w-3.5 text-primary" /> Smart alerts
          <span className="ml-auto text-[10px] opacity-70">{conditions.location.customName || conditions.location.name}</span>
        </div>

        {/* NEXT 2 HOURS — pinned first */}
        <div className="flex items-start gap-3 rounded-2xl bg-background/50 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Zap className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              Next 2 hours · {nowLabel}
            </div>
            <p className="mt-0.5 text-sm leading-relaxed text-foreground/95">{nextLine}</p>
            <div className="mt-1.5 flex items-center gap-3 text-[11px] text-foreground/80">
              <span className="inline-flex items-center gap-1"><CloudRain className="h-3 w-3" />{Math.round(Math.max(now.precipProb, soon[0]?.precipProb ?? 0, soon[1]?.precipProb ?? 0))}%</span>
              <span className="inline-flex items-center gap-1"><Wind className="h-3 w-3" />{Math.round(w.windSpeed)} mph</span>
              <span className="inline-flex items-center gap-1"><Thermometer className="h-3 w-3" />{Math.round(now.feelsLike)}° feels</span>
            </div>
          </div>
        </div>

        {/* Big-change alerts across the next 24h */}
        {alerts.length > 0 && (
          <ul className="mt-3 space-y-2">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl bg-background/45 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  {a.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {a.window}
                  </div>
                  <p className="mt-0.5 text-sm leading-snug text-foreground/95">{a.text}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
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
  return `${s}–${e}`.toUpperCase();
}
function fmtHour(iso: string, tz: string): string {
  const d = new Date(iso);
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz }).format(d));
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${suffix}`;
}