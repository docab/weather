import type { Severity } from "@/lib/types";
import { severityClasses, severityLabel } from "@/lib/severity";
import { cn } from "@/lib/utils";

interface Props {
  level: Severity;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export function SeverityBadge({ level, label, className, size = "md" }: Props) {
  const c = severityClasses(level);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wider ring-1 ring-inset",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        c.bg,
        c.text,
        c.ring,
        className
      )}
    >
      <span className={cn("inline-block rounded-full", size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2", c.bar)} />
      {label ?? severityLabel[level]}
    </span>
  );
}