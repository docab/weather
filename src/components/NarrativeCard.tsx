import type { LocationConditions } from "@/lib/types";
import { Sparkles, Shirt, Umbrella } from "lucide-react";

export function NarrativeCard({ conditions }: { conditions: LocationConditions }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        How it'll feel
      </div>
      <p className="text-lg leading-relaxed text-foreground/95">{conditions.narrative}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Recommendation icon={<Shirt className="h-4 w-4" />} label="Wear" text={conditions.outfit} />
        <Recommendation icon={<Umbrella className="h-4 w-4" />} label="Umbrella" text={conditions.umbrella} />
      </div>
    </div>
  );
}

function Recommendation({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-xl bg-secondary/40 p-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground/95">{text}</div>
      </div>
    </div>
  );
}