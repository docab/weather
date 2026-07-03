import type { WeatherAlert } from "@/lib/types";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_HSL: Record<WeatherAlert["severity"], string> = {
  yellow: "var(--severity-mod)",
  amber: "var(--severity-high)",
  red: "var(--severity-very-high)",
};
const SEVERITY_TEXT: Record<WeatherAlert["severity"], string> = {
  yellow: "text-severity-mod",
  amber: "text-severity-high",
  red: "text-severity-very-high",
};

export function AlertsList({ alerts }: { alerts: WeatherAlert[] }) {
  if (!alerts.length) return null;
  return (
    <div className="space-y-2">
      {alerts.map(a => {
        const color = SEVERITY_HSL[a.severity];
        const text = SEVERITY_TEXT[a.severity];
        return (
          <div
            key={a.id}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-4 backdrop-blur-md",
              text,
            )}
            style={{
              ["--alert-color" as any]: color,
              borderColor: `hsl(${color} / 0.55)`,
              animation: "fx-alert-pulse 2.6s ease-in-out infinite",
            }}
          >
            <div className="relative flex items-start gap-3">
              <div
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset"
                style={{
                  background: `hsl(${color} / 0.25)`,
                  ['--tw-ring-color' as any]: `hsl(${color} / 0.55)`,
                  animation: "fx-alert-icon 2.6s ease-in-out infinite",
                }}
              >
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold text-foreground">{a.title}</h4>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: `hsl(${color} / 0.25)`, color: `hsl(${color})` }}
                  >
                    {a.severity}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground/85">{a.description}</p>
                <p className="mt-1.5 text-[10px] uppercase tracking-wider text-foreground/60">
                  Issued via national feed · Met Office (UK) / MeteoAlarm / NWS
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}