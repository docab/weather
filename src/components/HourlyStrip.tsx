import type { WeatherData } from "@/lib/types";
import { describeWeather } from "@/lib/weatherCodes";
import { CloudRain } from "lucide-react";

export function HourlyStrip({ weather }: { weather: WeatherData }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Next 12 hours</div>
      <div className="-mx-4 overflow-x-auto px-4 pb-1">
        <div className="flex gap-2">
          {weather.hourly.map((h, i) => {
            const info = describeWeather(h.weatherCode, true);
            const date = new Date(h.time);
            const hr = date.toLocaleTimeString("en-GB", { hour: "2-digit", hour12: false }).replace(":00", "");
            return (
              <div key={i} className="flex min-w-[52px] flex-col items-center gap-1 rounded-xl bg-secondary/40 px-2 py-2.5">
                <div className="text-[10px] text-muted-foreground tabular">{i === 0 ? "Now" : `${hr}:00`}</div>
                <div className="text-lg leading-none">{info.icon}</div>
                <div className="text-sm font-semibold tabular">{Math.round(h.feelsLike)}°</div>
                {h.precipProb >= 20 && (
                  <div className="flex items-center gap-0.5 text-[10px] text-primary tabular">
                    <CloudRain className="h-2.5 w-2.5" />
                    {Math.round(h.precipProb)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}