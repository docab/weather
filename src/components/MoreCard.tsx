import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LocationConditions } from "@/lib/types";
import { Layers, Wind, Gauge, Droplets, Eye, Thermometer, ChevronRight, History, Compass } from "lucide-react";
import { DetailModal, ExplainerBlock } from "./ui/detail-modal";
import { explainWind, explainHumidity, explainPressure, explainDewPoint, explainVisibility } from "@/lib/explainers";
import { fetchTodayInHistory } from "@/lib/api";

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
  const dirDeg = w.windDirection;
  const dirCard = dirDeg != null ? compass(dirDeg) : null;

  // Ten-year climate baseline for today's date at this exact spot.
  const history = useQuery({
    queryKey: ["history", Math.round(w.latitude * 100), Math.round(w.longitude * 100), new Date().toDateString()],
    queryFn: () => fetchTodayInHistory(w.latitude, w.longitude),
    staleTime: 1000 * 60 * 60 * 12,
  });

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
        <p className="what-it-is mb-3">
          The numbers behind the forecast — pressure, dew point, visibility and the rest — and what each one actually does to your day.
        </p>
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
          {/* Wind — sustained, gusts and direction, spelled out. */}
          <div className="rounded-2xl bg-secondary/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Wind className="h-3.5 w-3.5" /> Wind
              </div>
              <div className="text-sm font-bold tabular">{Math.round(w.windSpeed)} mph</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-xl bg-white/5 p-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sustained</div>
                <div className="mt-0.5 font-bold tabular">{Math.round(w.windSpeed)} mph</div>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Gusts</div>
                <div className="mt-0.5 font-bold tabular">
                  {w.windGust ? `Up to ${Math.round(w.windGust)} mph` : "—"}
                </div>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Compass className="h-3 w-3" /> Direction
                </div>
                <div className="mt-0.5 font-bold tabular">
                  {dirCard ? `${dirCard} · ${Math.round(dirDeg!)}°` : "—"}
                </div>
              </div>
            </div>
          </div>
          <ExplainerBlock {...explainWind(w.windSpeed, w.windGust)} value={`${Math.round(w.windSpeed)} mph`} />
          <ExplainerBlock {...explainHumidity(w.humidity, w.temp)} value={`${Math.round(w.humidity)}%`} />
          <ExplainerBlock {...explainPressure(w.pressure)} value={`${Math.round(w.pressure ?? 1013)} hPa`} />
          <ExplainerBlock {...explainDewPoint(w.dewPoint)} value={`${Math.round(w.dewPoint ?? 10)}°`} />
          <ExplainerBlock {...explainVisibility(w.visibility)} value={`${((w.visibility ?? 20000) / 1000).toFixed(0)} km`} />
          <div className="rounded-2xl bg-secondary/40 p-3 text-xs">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Day summary</div>
            <p className="text-foreground/85">High {Math.round(today?.high ?? w.temp)}°, low {Math.round(today?.low ?? w.temp)}°. Feels-like averages {Math.round(feelAvg)}° across the next 24 hours. Total rainfall expected: {(today?.precipSum ?? 0).toFixed(1)} mm.</p>
          </div>

          {/* Today in History — 10-year climate baseline for this date. */}
          <div className="rounded-2xl bg-secondary/40 p-3 text-xs">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <History className="h-3.5 w-3.5" /> Today in history
            </div>
            {history.isLoading && <p className="text-foreground/70">Digging through a decade of records…</p>}
            {history.isError && <p className="text-foreground/70">Couldn't reach the climate archive right now.</p>}
            {history.data && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-white/5 p-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{history.data.years}-yr avg</div>
                    <div className="mt-0.5 text-base font-bold tabular">{history.data.avgTemp.toFixed(1)}°</div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Hottest</div>
                    <div className="mt-0.5 text-base font-bold tabular">{history.data.hottest.toFixed(1)}°</div>
                    <div className="text-[10px] text-muted-foreground">{history.data.hottestYear}</div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Coldest</div>
                    <div className="mt-0.5 text-base font-bold tabular">{history.data.coldest.toFixed(1)}°</div>
                    <div className="text-[10px] text-muted-foreground">{history.data.coldestYear}</div>
                  </div>
                </div>
                <p className="mt-2 text-foreground/85">
                  On this date the last {history.data.years} years, it averaged {history.data.avgTemp.toFixed(1)}° with highs near {history.data.avgHigh.toFixed(1)}°.
                  Today's {Math.round(w.temp)}° is {Math.abs(w.temp - history.data.avgTemp) < 1 ? "bang on the norm" : w.temp > history.data.avgTemp ? `${(w.temp - history.data.avgTemp).toFixed(1)}° warmer than usual` : `${(history.data.avgTemp - w.temp).toFixed(1)}° cooler than usual`}.
                </p>
              </>
            )}
          </div>
        </div>
      </DetailModal>
    </>
  );
}

/** Degrees → 16-point compass label. */
function compass(deg: number): string {
  const pts = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return pts[Math.round(((deg % 360) / 22.5)) % 16];
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