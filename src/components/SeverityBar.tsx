import type { Severity } from "@/lib/types";
import { severityClasses } from "@/lib/severity";
import { cn } from "@/lib/utils";

interface Props {
  level: Severity;
  // 0..1 fill amount; if not given, derive from severity
  value?: number;
  className?: string;
}

const FALLBACK: Record<Severity, number> = {
  low: 0.25,
  moderate: 0.5,
  high: 0.75,
  "very-high": 1,
};

export function SeverityBar({ level, value, className }: Props) {
  const v = Math.max(0.05, Math.min(1, value ?? FALLBACK[level]));
  const c = severityClasses(level);
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-secondary/60", className)}>
      <div
        className={cn("h-full rounded-full transition-all", c.bar)}
        style={{ width: `${v * 100}%` }}
      />
    </div>
  );
}