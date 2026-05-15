import type { AqiData } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";
import { SeverityBar } from "./SeverityBar";
import { aqiLabel } from "@/lib/severity";
import { Wind } from "lucide-react";

export function AqiCard({ aqi }: { aqi: AqiData }) {
  const pollutants = [
    { label: "PM2.5", value: aqi.pm25, unit: "µg/m³", scale: 25 },
    { label: "PM10", value: aqi.pm10, unit: "µg/m³", scale: 50 },
    { label: "NO₂", value: aqi.no2, unit: "µg/m³", scale: 200 },
    { label: "O₃", value: aqi.o3, unit: "µg/m³", scale: 180 },
  ];
  return (
    <div className="glass-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Wind className="h-4 w-4" /> Air Quality
        </div>
        <SeverityBadge level={aqi.level} label={aqiLabel(aqi.index)} />
      </div>
      <div className="mb-5">
        <div className="flex items-baseline gap-2 tabular">
          <span className="text-4xl font-bold">{Math.round(aqi.index)}</span>
          <span className="text-sm text-muted-foreground">EU AQI</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {aqi.dominantPollutant} is the dominant pollutant
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {pollutants.map(p => (
          <div key={p.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{p.label}</span>
              <span className="tabular text-foreground/80">{p.value.toFixed(0)}</span>
            </div>
            <SeverityBar
              level={aqi.level}
              value={Math.min(1, p.value / p.scale)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}