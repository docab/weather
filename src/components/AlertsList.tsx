import type { WeatherAlert } from "@/lib/types";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<WeatherAlert["severity"], string> = {
  yellow: "bg-severity-mod/15 text-severity-mod ring-severity-mod/30",
  amber: "bg-severity-high/15 text-severity-high ring-severity-high/30",
  red: "bg-severity-very-high/15 text-severity-very-high ring-severity-very-high/30",
};

export function AlertsList({ alerts }: { alerts: WeatherAlert[] }) {
  if (!alerts.length) return null;
  return (
    <div className="space-y-2">
      {alerts.map(a => (
        <div key={a.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-start gap-3">
            <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset", SEVERITY_STYLES[a.severity])}>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold">{a.title}</h4>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset", SEVERITY_STYLES[a.severity])}>
                  {a.severity}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}