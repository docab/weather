import type { Location } from "@/lib/types";
import { Plus, MapPin, Locate, MoreVertical, Pencil, Trash2, ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Props {
  locations: Location[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  canAdd: boolean;
  onRemove?: (id: string) => void;
  onRename?: (id: string, name: string | undefined) => void;
  onReorder?: (id: string, direction: -1 | 1) => void;
  detailed?: boolean;
}

export function LocationTabs({ locations, activeId, onSelect, onAdd, canAdd, onRemove, onRename, onReorder, detailed }: Props) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex gap-1.5">
        {locations.map((loc, i) => {
          const active = loc.id === activeId;
          const canDelete = !loc.isAutoDetected && !!onRemove;
          const canRename = !!onRename;
          const canReorder = !!onReorder && locations.length > 1;
          const display = loc.customName || loc.name;
          const hasMenu = canRename || canDelete || canReorder;
          return (
          <div
              key={loc.id}
              className={cn(
                "group flex shrink-0 items-center gap-1 rounded-full border pl-3.5 pr-1 py-1 text-sm font-medium transition-all animate-fade-in",
                active
                  ? "border-primary/40 bg-primary/15 text-primary shadow-glow"
                  : "border-border bg-card text-muted-foreground hover:bg-card-elevated hover:text-foreground"
              )}
            >
              <button onClick={() => onSelect(loc.id)} className="flex items-center gap-1.5 py-1.5 pr-1">
                {loc.isAutoDetected ? <Locate className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                <span className="leading-tight">{display}</span>
              </button>
              {hasMenu ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`More for ${display}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {canRename && (
                      <DropdownMenuItem onClick={() => {
                        const next = window.prompt(`Rename "${display}" to:`, loc.customName || "");
                        if (next !== null) onRename!(loc.id, next.trim() || undefined);
                      }}>
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
                      </DropdownMenuItem>
                    )}
                    {canReorder && i > 0 && (
                      <DropdownMenuItem onClick={() => onReorder!(loc.id, -1)}>
                        <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Move left
                      </DropdownMenuItem>
                    )}
                    {canReorder && i < locations.length - 1 && (
                      <DropdownMenuItem onClick={() => onReorder!(loc.id, 1)}>
                        <ArrowRight className="mr-2 h-3.5 w-3.5" /> Move right
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onRemove!(loc.id)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="ml-1 w-1" />
              )}
            </div>
          );
        })}
        {canAdd && (
          <button
            onClick={onAdd}
            className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border bg-transparent px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        )}
      </div>
    </div>
  );
}