import { useState, useMemo } from "react";
import type { LocationConditions, WeatherHour } from "@/lib/types";
import { Sparkles, ChevronRight } from "lucide-react";
import { describeWeather } from "@/lib/weatherCodes";
import { dayGradient } from "@/lib/dayGradient";
import { DetailModal } from "./ui/detail-modal";
import { LocalTimeCard } from "./LocalTimeCard";

/**
 * "How it feels" — focused on the next ~2 hours. Tap for a full-day
 * pattern-grouped breakdown (e.g. "5–7am drizzle · 8am–2pm partly cloudy").
 */
export function HowItFeelsCard({ conditions }: { conditions: LocationConditions }) {
  const [open, setOpen] = useState(false);
  const w = conditions.weather;
  const patterns = useMemo(() => groupPatterns(w.hourly.slice(0, 24), w.timezone), [w]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        id="feels"
        className="glass-card group relative w-full overflow-hidden p-5 text-left shadow-card transition hover:scale-[1.005] animate-fade-in-up"
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="right-now-head flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Right now
          </div>
          <LocalTimeCard
            timezone={w.timezone}
            placeName={conditions.location.customName || conditions.location.name}
            variant="inline"
          />
        </div>
        <p className="what-it-is mb-3">How the air actually feels on your skin right now, and how the rest of the day shapes up.</p>
        <p className="text-lg leading-relaxed text-foreground/95">{conditions.narrative}</p>
        <p className="mt-3 text-sm text-foreground/85">
          <span className="font-semibold text-foreground">Indoors (no AC):</span> {indoorEstimate(w.temp, w.hourly)}
        </p>
        <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
          Full day breakdown <ChevronRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
        </div>
      </button>

      <DetailModal open={open} onClose={() => setOpen(false)} title="How the day will feel">
        <p className="mb-4 text-sm leading-relaxed text-foreground/90">{conditions.narrative}</p>
        <div className="mb-4 rounded-2xl border border-border/50 bg-secondary/40 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Indoor forecast (rooms without AC)
          </div>
          <p className="mt-1 text-sm text-foreground/90">{indoorLongForm(w.temp, w.hourly)}</p>
        </div>
        <div className="space-y-2">
          {patterns.map((p, i) => {
            const info = describeWeather(p.dominantCode, p.isDay);
            const Icon = info.Icon;
            const grad = dayGradient(p.avgFeel, info.sky);
            return (
              <div key={i} className="relative overflow-hidden rounded-2xl border border-border/40 p-3 animate-fade-in-up" style={{ backgroundImage: grad }}>
                <div className="pointer-events-none absolute inset-0 bg-background/55" />
                <div className="relative flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/70 text-primary backdrop-blur">
                    <Icon className="h-5 w-5" strokeWidth={1.6} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-sm font-bold">{p.label}</div>
                      <div className="text-[11px] font-semibold tabular text-foreground/85">{Math.round(p.minFeel)}–{Math.round(p.maxFeel)}°</div>
                    </div>
                    <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{info.label}</div>
                    <p className="mt-1 text-xs leading-relaxed text-foreground/90">{p.advice}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DetailModal>
    </>
  );
}

// (Next 2 hours line removed — that lives in the top AlertsHeroCard now.)

interface Pattern {
  label: string; minFeel: number; maxFeel: number; avgFeel: number;
  dominantCode: number; isDay: boolean; advice: string;
}

/**
 * Group contiguous hours whose weather "character" matches (rainy /
 * cloudy / clear / hot / cold buckets). Yields human-readable pattern
 * chunks like "8am–2pm partly cloudy".
 */
function groupPatterns(hours: WeatherHour[], tz: string): Pattern[] {
  if (!hours.length) return [];
  const buckets: Pattern[] = [];
  let cur: { hs: WeatherHour[]; sig: string } | null = null;
  const sigOf = (h: WeatherHour) => {
    if (h.precipProb >= 60) return "wet";
    if ((h.cloudCover ?? 0) >= 70) return "overcast";
    if ((h.cloudCover ?? 0) >= 30) return "partly";
    return "clear";
  };
  for (const h of hours) {
    const s = sigOf(h);
    if (!cur || cur.sig !== s) {
      if (cur) buckets.push(compact(cur.hs, cur.sig, tz));
      cur = { hs: [h], sig: s };
    } else cur.hs.push(h);
  }
  if (cur) buckets.push(compact(cur.hs, cur.sig, tz));
  return buckets;
}

function compact(hs: WeatherHour[], sig: string, tz: string): Pattern {
  const feels = hs.map(h => h.feelsLike);
  const minFeel = Math.min(...feels), maxFeel = Math.max(...feels);
  const avgFeel = feels.reduce((s, x) => s + x, 0) / feels.length;
  const start = hs[0].time, end = hs[hs.length - 1].time;
  const label = `${localHour(start, tz)}–${localHour(new Date(new Date(end).getTime() + 3600_000).toISOString(), tz)}`;
  // Dominant code = wettest / cloudiest so it doesn't lie visually.
  const dominantCode = hs.reduce((a, x) => x.weatherCode > a.weatherCode ? x : a, hs[0]).weatherCode;
  const isDay = (() => {
    const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz }).format(new Date(hs[0].time)));
    return h >= 6 && h < 20;
  })();
  const advice = adviceFor(sig, avgFeel, hs);
  return { label, minFeel, maxFeel, avgFeel, dominantCode, isDay, advice };
}

function localHour(iso: string, tz: string): string {
  const d = new Date(iso);
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz }).format(d));
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${suffix}`;
}

function adviceFor(sig: string, avg: number, hs: WeatherHour[]): string {
  const peakRain = Math.max(...hs.map(h => h.precipProb));
  if (sig === "wet") return `Wet window — peak ${Math.round(peakRain)}% chance. Brolly essential, waterproof shoes if you can.`;
  if (sig === "overcast") return avg >= 20 ? `Overcast but mild — comfortable, good light for a walk.` : `Grey and cool — layer up, no sun to warm you.`;
  if (sig === "partly") return avg >= 22 ? `Partly cloudy and pleasant — a great window to be outside.` : `Broken cloud, ${Math.round(avg)}° — jumper weather.`;
  return avg >= 26 ? `Clear and hot — SPF, hat, water bottle.` : avg >= 12 ? `Clear and pleasant — one of the best windows of the day.` : `Clear but chilly — coat weather, gloves if you're standing still long.`;
}

/**
 * Indoor temp heuristic for un-air-conditioned rooms. Rooms lag outside
 * by a few °C and hold onto yesterday's warmth — so we use the rolling
 * 24h mean nudged toward today's peak in hot weather.
 */
function indoorRange(currentOutside: number, hours: WeatherHour[]): { low: number; high: number } {
  const window = hours.slice(0, 24);
  if (!window.length) return { low: currentOutside, high: currentOutside };
  const mean = window.reduce((s, h) => s + h.temp, 0) / window.length;
  const peak = Math.max(...window.map(h => h.temp));
  const trough = Math.min(...window.map(h => h.temp));
  // Well-insulated dwellings sit ~2–4°C above the 24h mean in summer
  // and 1–2°C above the daily low in winter.
  const summerBias = Math.max(0, (peak - 22) * 0.25);
  const indoorLow = Math.round(Math.max(trough + 1, mean - 1) - 0.5);
  const indoorHigh = Math.round(mean + 2 + summerBias);
  return { low: indoorLow, high: indoorHigh };
}

function indoorEstimate(currentOutside: number, hours: WeatherHour[]): string {
  const { low, high } = indoorRange(currentOutside, hours);
  if (high >= 28) return `Rooms likely ${low}–${high}° — sticky, especially upstairs. Blinds down, fan on.`;
  if (high >= 25) return `Rooms sit around ${low}–${high}° — warm but bearable. Cross-ventilate at night.`;
  if (high >= 20) return `Comfortable indoors, ${low}–${high}°.`;
  if (high >= 16) return `Cool-ish inside, ${low}–${high}° — cardigan weather at home.`;
  return `Chilly rooms, ${low}–${high}° — heating on if you're sat still.`;
}

function indoorLongForm(currentOutside: number, hours: WeatherHour[]): string {
  const { low, high } = indoorRange(currentOutside, hours);
  const base = `Expect ${low}–${high}° in most rooms today. `;
  if (high >= 30) return base + `Top-floor bedrooms can climb 2–3° hotter than that — close blinds by mid-morning, open windows once outside dips below inside.`;
  if (high >= 26) return base + `South-facing rooms will feel warmest late afternoon. A cross-breeze at dusk drops it fast.`;
  if (high <= 15) return base + `Rooms hold overnight cold — a quick burst of heating in the morning is more efficient than leaving it on low all day.`;
  return base + `Nothing dramatic — the house will feel like the weather looks.`;
}