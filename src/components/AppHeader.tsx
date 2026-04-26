import { Settings as SettingsIcon, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function AppHeader({ onRefresh, refreshing }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-inset ring-primary/30">
            <span className="text-base">🌿</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">PollenWatch</h1>
            <p className="-mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">UK</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <Button variant="ghost" size="icon" onClick={onRefresh} aria-label="Refresh">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          )}
          <Button asChild variant="ghost" size="icon" aria-label="Settings">
            <Link to="/settings">
              <SettingsIcon className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}