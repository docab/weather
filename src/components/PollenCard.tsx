import type { PollenData } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";
import { SeverityBar } from "./SeverityBar";
import { pollenSeverity, severityLabel } from "@/lib/severity";
import { Flower2 } from "lucide-react";

const SPECIES: { key: keyof PollenData["breakdown"]; label: string }[] = [
  { key: "grass", label: "Grass" },
  { key: "birch", label: "Birch" },
  { key: "alder", label: "Alder" },
  { key: "olive", label: "Olive" },
  { key: "mugwort", label: "Mugwort" },
  { key: "ragweed", label: "Ragweed" },
];

export function PollenCard({ pollen }: { pollen: PollenData }) {
  const max = Math.max(1, ...Object.values(pollen.breakdown));
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Flower2 className="h-4 w-4" /> Pollen
        </div>
        <SeverityBadge level={pollen.level} />
      </div>
      <div className="mb-5">
        <div className="flex items-baseline gap-2 tabular">
          <span className="text-4xl font-bold">{Math.round(pollen.total)}</span>
          <span className="text-sm text-muted-foreground">grains/m³</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {pollen.dominantSpecies} dominant · {severityLabel[pollen.level]} for hay fever sufferers
        </p>
      </div>
      <div className="space-y-2.5">
        {SPECIES.map(s => {
          const v = pollen.breakdown[s.key] ?? 0;
          return (
            <div key={s.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="tabular text-foreground/80">{v.toFixed(1)}</span>
              </div>
              <SeverityBar level={pollenSeverity(v)} value={v / max} />
            </div>
          );
        })}
      </div>
    </div>
  );
}