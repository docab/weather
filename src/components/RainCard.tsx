import { useState } from "react";
import type { LocationConditions } from "@/lib/types";
import { CloudRain, ChevronRight } from "lucide-react";
import { Rain } from "./fx/WeatherFX";
import { DetailModal, ExplainerBlock } from "./ui/detail-modal";
import { explainPrecipProb, explainCloudCover, rainDescriptor } from "@/lib/explainers";

/**
 * Persistent rain card. Always renders (says "not raining now" when dry),
 * scales the rain animation to real mm/h, and explains every metric.
 */
export function RainCard({ conditions }: { conditions: LocationConditions }) {
  const [open, setOpen] = useState(false);
  const w = conditions.weather;
  const mm = w.precipMm ?? 0;
  const nowRain = mm > 0.05;
  const soon = w.hourly.slice(0, 2).some(h => h.precipProb >= 40 || (h.precipMm ?? 0) > 0.1);
  const peak = w.hourly.slice(0, 12).reduce((a, h) => h.precipProb > a.precipProb ? h : a, w.hourly[0]);

  const placeName = conditions.location.customName || conditions.location.name;
  const areaLine =
    w.precipProb >= 75
      ? `${Math.round(w.precipProb)}% chance means the forecast is highly confident — most of ${placeName} will see rain, including your exact spot most likely.`
      : w.precipProb >= 40
        ? `${Math.round(w.precipProb)}% chance is a mix — the forecast expects rain across roughly half of ${placeName}. Your hyperlocal spot could still stay dry if the band skirts past.`
        : `${Math.round(w.precipProb)}% chance means only patchy showers are possible — most of ${placeName} stays dry.`;

  return (
    <>
      <button
        id="rain"
        onClick={() => setOpen(true)}
        className="glass-card group relative w-full overflow-hidden p-5 text-left shadow-card animate-fade-in-up transition hover:scale-[1.005]"
      >
        {(nowRain || soon) && (
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <Rain
              category={mm >= 4 ? "heavy" : mm >= 1 ? "moderate" : mm > 0 ? "light" : "drizzle"}
              intensity={nowRain ? clampIntensity(mm) : 0.35}
            />
          </div>
        )}
        <div className="relative">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <CloudRain className="h-3.5 w-3.5 text-primary" /> Rain
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
          </div>
          <p className="what-it-is mb-2">
            Whether you'll get wet: how likely rain is, how hard it's falling, and how much of the area it covers.
          </p>
          <div className="flex items-baseline gap-3">
            <div className="text-3xl font-bold tabular">{Math.round(w.precipProb)}%</div>
            <div className="text-sm text-muted-foreground">chance of rain</div>
          </div>
          <p className="mt-1.5 text-sm text-foreground/90">
            {nowRain ? `Raining now — ${rainDescriptor(mm)} (${mm.toFixed(1)} mm/h).` : "Not raining right now."}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <Tile label="Now" value={`${mm.toFixed(1)} mm`} />
            <Tile label="Peak" value={`${Math.round(peak?.precipProb ?? 0)}%`} sub={peak ? fmtTime(peak.time, w.timezone) : "—"} />
            <Tile label="Cloud" value={`${Math.round(w.cloudCover)}%`} />
          </div>
        </div>
      </button>

      <DetailModal open={open} onClose={() => setOpen(false)} title="Rain, in detail">
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-foreground/90">{areaLine}</p>
          <ExplainerBlock {...explainPrecipProb(w.precipProb)} value={`${Math.round(w.precipProb)}%`} />
          <div className="rounded-2xl bg-secondary/40 p-3 text-xs">
            <div className="flex items-center justify-between font-semibold">
              <span className="uppercase tracking-wider text-muted-foreground">How much</span>
              <span className="tabular">{mm.toFixed(1)} mm/h</span>
            </div>
            <p className="mt-1 text-foreground/85">{rainDescriptor(mm)}. Today's total: <span className="font-semibold">{w.rainTotal.toFixed(1)} mm</span>.</p>
          </div>
          <ExplainerBlock {...explainCloudCover(w.cloudCover, w.cloudLow, w.cloudMid, w.cloudHigh)} value={`${Math.round(w.cloudCover)}%`} />
          <div className="rounded-2xl bg-secondary/40 p-3 text-xs">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Next 12 hours</div>
            <div className="grid grid-cols-6 gap-1">
              {w.hourly.slice(0, 12).map(h => (
                <div key={h.time} className="rounded-md bg-background/60 p-1 text-center">
                  <div className="text-[9px] text-muted-foreground">{fmtTime(h.time, w.timezone)}</div>
                  <div className="text-[11px] font-bold tabular">{Math.round(h.precipProb)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DetailModal>
    </>
  );
}

function clampIntensity(mm: number): number {
  // 0.1 → 0.2, 4 → 0.8, 12+ → 1
  return Math.min(1, 0.15 + mm / 15);
}

function fmtTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz }).format(new Date(iso)) + ":00";
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 p-2 backdrop-blur">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-bold tabular">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}