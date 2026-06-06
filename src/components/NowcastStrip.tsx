import { useQuery } from "@tanstack/react-query";
import { CloudRain, Droplet, Umbrella, Sparkles } from "lucide-react";
import { fetchNowcast } from "@/lib/nowcast";
import type { LocationConditions } from "@/lib/types";

/**
 * Two-hour precipitation nowcast. Shows minute-level start/stop times when
 * rain is incoming or clearing, plus a tiny bar-chart of expected mm by
 * 5- or 15-min step, with model confidence.
 */
export function NowcastStrip({ conditions }: { conditions: LocationConditions }) {
  const lat = conditions.weather.latitude;
  const lon = conditions.weather.longitude;
  const q = useQuery({
    queryKey: ["nowcast", lat.toFixed(2), lon.toFixed(2)],
    queryFn: () => fetchNowcast(lat, lon),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  if (q.isLoading) {
    return <div className="h-24 animate-pulse rounded-2xl bg-card/60" />;
  }
  const data = q.data;
  if (!data || !data.points.length) return null;

  const peakMm = Math.max(0.4, ...data.points.map(p => p.mm));
  const wetNow = (data.points[0]?.mm ?? 0) >= 0.05;
  const tz = conditions.weather.timezone;

  let headline: { icon: React.ReactNode; text: string; tone: string };
  if (data.startsInMin !== null) {
    const t = new Date(Date.now() + data.startsInMin * 60_000)
      .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz });
    headline = { icon: <Umbrella className="h-4 w-4" />,
      text: data.startsInMin === 0 ? "Rain starting any moment" :
            `Rain starts ~${t} (${humanise(data.startsInMin)})`,
      tone: "text-primary" };
  } else if (wetNow && data.stopsInMin !== null) {
    const t = new Date(Date.now() + data.stopsInMin * 60_000)
      .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz });
    headline = { icon: <CloudRain className="h-4 w-4" />,
      text: `Rain easing ~${t} (${humanise(data.stopsInMin)})`,
      tone: "text-primary" };
  } else if (wetNow) {
    headline = { icon: <Droplet className="h-4 w-4" />,
      text: "Rain set in for the next couple of hours", tone: "text-primary" };
  } else {
    headline = { icon: <Sparkles className="h-4 w-4" />,
      text: "Staying dry for the next 2 hours", tone: "text-foreground/80" };
  }

  const conf = Math.round(data.confidence * 100);
  const sourceLabel = data.source === "met" ? "MET Norway nowcast" : "Open-Meteo 15-min";

  return (
    <div className="glass-card p-4 shadow-card animate-fade-in">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className={`flex items-center gap-2 text-sm font-semibold ${headline.tone}`}>
          {headline.icon}<span>{headline.text}</span>
        </div>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground" title={sourceLabel}>
          {conf}% conf
        </span>
      </div>
      <div className="flex h-12 items-end gap-[3px]">
        {data.points.map((p, i) => {
          const h = Math.max(2, (p.mm / peakMm) * 100);
          const intense = p.mm >= 0.5;
          return (
            <div key={i} className="flex-1 rounded-sm transition-all"
              style={{
                height: `${h}%`,
                background: p.mm < 0.05
                  ? "hsl(var(--muted) / 0.6)"
                  : intense ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.55)",
              }}
              title={`${new Date(p.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz })} · ${p.mm.toFixed(2)} mm`}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular">
        <span>Now</span>
        <span>+{(data.stepMinutes * data.points.length)}m · {sourceLabel}</span>
      </div>
    </div>
  );
}

function humanise(min: number): string {
  if (min < 1) return "now";
  if (min < 60) return `in ${min} min`;
  const h = Math.floor(min / 60); const m = min % 60;
  return m ? `in ${h}h ${m}m` : `in ${h}h`;
}