import { Settings as SettingsIcon, RefreshCw, CloudSun } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface Props {
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function AppHeader({ onRefresh, refreshing }: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);
  const day = now.toLocaleDateString(undefined, { weekday: "long" });
  const date = now.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/40 to-primary/10 text-primary ring-1 ring-inset ring-primary/30 shadow-glow">
            <CloudSun className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Weatherer</h1>
            <p className="-mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground tabular">
              {day} · {date} · {time}
            </p>
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