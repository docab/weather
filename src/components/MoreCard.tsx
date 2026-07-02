import { useState } from "react";
import type { LocationConditions } from "@/lib/types";
import { Layers, Wind, Gauge, Droplets, Eye, Thermometer, ChevronRight } from "lucide-react";
import { DetailModal, ExplainerBlock } from "./ui/detail-modal";
import { explainWind, explainHumidity, explainPressure, explainDewPoint, explainVisibility, explainCloudCover } from "@/lib/explainers";

/**
 * "More" card — the technical dashboard. Averages for the day, wind, pressure,
 * dew point, visibility, cloud layers. Every value has a plain-English
 * explainer in the tap-to-open modal.
 */
export function MoreCard({ conditions }: { conditions: LocationConditions }) {
  const [open, setOpen] = useState(false);
  const w = conditions.weather;
  const today = w.daily[0];
  const feelAvg = w.hourly.slice(0, 24).reduce((s, h) => s + h.feelsLike, 0) / Math.max(1, Math.min(24, w.hourly.length));

  return (
    <>
      <button
        id="more"
        onClick={() => setOpen(true)}
        className="glass-card group w-full p-5 text-left shadow-card animate-fade-in-up transition hover:scale-[1.005]"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Layers className="h-3.5 w-3.5 text-primary" /> More
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <MiniTile icon={<Thermometer className="h-3.5 w-3.5" />} label="Day avg" value={`${Math.round(feelAvg)}°`} />
          <MiniTile icon={<Wind className="h-3.5 w-3.5" />} label="Wind" value={`${Math.round(w.windSpeed)}`} unit="mph" />
          <MiniTile icon={<Gauge className="h-3.5 w-3.5" />} label="Pressure" value={`${Math.round(w.pressure ?? 1013)}`} unit="hPa" />
          <MiniTile icon={<Droplets className="h-3.5 w-3.5" />} label="Humidity" value={`${Math.round(w.humidity)}%`} />
          <MiniTile icon={<Thermometer className="h-3.5 w-3.5" />} label="Dew" value={`${Math.round(w.dewPoint ?? 10)}°`} />
          <MiniTile icon={<Eye className="h-3.5 w-3.5" />} label="Visibility" value={((w.visibility ?? 20000) / 1000).toFixed(0)} unit="km" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Tap for what each metric means for you today · high {Math.round(today?.high ?? w.temp)}°, low {Math.round(today?.low ?? w.temp)}°.
        </p>
      </button>

      <DetailModal open={open} onClose={() => setOpen(false)} title="Deeper metrics">
        <div className="space-y-3">
          <ExplainerBlock {...explainWind(w.windSpeed, w.windGust)} value={`${Math.round(w.windSpeed)} mph`} />
          <ExplainerBlock {...explainHumidity(w.humidity, w.temp)} value={`${Math.round(w.humidity)}%`} />
          <ExplainerBlock {...explainPressure(w.pressure)} value={`${Math.round(w.pressure ?? 1013)} hPa`} />
          <ExplainerBlock {...explainDewPoint(w.dewPoint)} value={`${Math.round(w.dewPoint ?? 10)}°`} />
          <ExplainerBlock {...explainVisibility(w.visibility)} value={`${((w.visibility ?? 20000) / 1000).toFixed(0)} km`} />
          <ExplainerBlock {...explainCloudCover(w.cloudCover, w.cloudLow, w.cloudMid, w.cloudHigh)} value={`${Math.round(w.cloudCover)}%`} />
          <div className="rounded-2xl bg-secondary/40 p-3 text-xs">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Day summary</div>
            <p className="text-foreground/85">High {Math.round(today?.high ?? w.temp)}°, low {Math.round(today?.low ?? w.temp)}°. Feels-like averages {Math.round(feelAvg)}° across the next 24 hours. Total rainfall expected: {(today?.precipSum ?? 0).toFixed(1)} mm.</p>
          </div>
        </div>
      </DetailModal>
    </>
  );
}

function MiniTile({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 p-2.5 backdrop-blur">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </div>
      <div className="mt-0.5 text-base font-bold tabular">
        {value}{unit && <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}