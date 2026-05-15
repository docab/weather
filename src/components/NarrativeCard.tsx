import type { LocationConditions } from "@/lib/types";
import { Sparkles } from "lucide-react";
import { PerfumeFX, AnimatedUmbrella } from "./fx/WeatherFX";
import { buildPerfumeNotes } from "@/lib/narrative";
import { ClothingIcon } from "./icons/ClothingIcon";
import { PerfumeBottle } from "./icons/PerfumeBottle";

export function NarrativeCard({ conditions }: { conditions: LocationConditions }) {
  const needUmbrella = conditions.weather.precipProb >= 40;
  const notes = buildPerfumeNotes(conditions.weather, conditions.pollen);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card">
      <PerfumeFX notes={notes} />
      <div className="relative mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        How it'll feel
      </div>
      <p className="relative text-lg leading-relaxed text-foreground/95">{conditions.narrative}</p>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
        <Recommendation icon={<ClothingIcon weather={conditions.weather} size={20} />} label="Wear" text={conditions.outfit} />
        <Recommendation
          icon={<AnimatedUmbrella open={needUmbrella} size={22} />}
          label="Umbrella"
          text={conditions.umbrella}
        />
        <Recommendation icon={<PerfumeBottle size={22} />} label="Fragrance" text={conditions.perfume} />
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