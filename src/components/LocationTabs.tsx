import type { Location } from "@/lib/types";
import { Plus, MapPin, Locate, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  locations: Location[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  canAdd: boolean;
  onRemove?: (id: string) => void;
}

export function LocationTabs({ locations, activeId, onSelect, onAdd, canAdd, onRemove }: Props) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex gap-2">
        {locations.map(loc => {
          const active = loc.id === activeId;
          const removable = !loc.isAutoDetected && !!onRemove;
          return (
            <div
              key={loc.id}
              className={cn(
                "group flex shrink-0 items-center gap-1 rounded-full border pl-3 pr-1 py-1 text-sm font-medium transition-all",
                active
                  ? "border-primary/40 bg-primary/15 text-primary shadow-glow"
                  : "border-border bg-card text-muted-foreground hover:bg-card-elevated hover:text-foreground"
              )}
            >
              <button onClick={() => onSelect(loc.id)} className="flex items-center gap-2 py-1">
                {loc.isAutoDetected ? <Locate className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                <span>{loc.name}</span>
                {loc.postcode && <span className="text-[10px] opacity-60">{loc.postcode}</span>}
              </button>
              {removable ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove!(loc.id); }}
                  aria-label={`Remove ${loc.name}`}
                  className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/70 hover:bg-destructive/20 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <span className="ml-1 w-1" />
              )}
            </div>
          );
        })}
        {canAdd && (
          <button
            onClick={onAdd}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border bg-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        )}
      </div>
    </div>
  );
}