import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reusable detail sheet: a centered card with a blurred, dimmed backdrop.
 * Dismisses on backdrop tap or Esc. Keep contents scrollable when tall.
 */
export function DetailModal({
  open, onClose, title, children, tone,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  /** Optional inline background (e.g. a weather gradient). */
  tone?: React.CSSProperties;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-background/70 backdrop-blur-xl" />
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-xl overflow-hidden rounded-3xl border border-border/60",
          "shadow-2xl animate-scale-in bg-card"
        )}
        style={tone}
      >
        <div className="pointer-events-none absolute inset-0 bg-background/30" />
        <div className="relative flex items-center justify-between gap-3 border-b border-border/50 px-5 py-3">
          <div className="text-sm font-semibold uppercase tracking-widest text-foreground/85">
            {title}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-background/60 text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative max-h-[75vh] overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Small labelled explainer block for use inside detail modals.
 * Pair with lib/explainers.ts.
 */
export function ExplainerBlock({
  title, what, means, value,
}: {
  title: string; what: string; means: string; value?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-secondary/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
        {value != null && <div className="text-sm font-bold tabular">{value}</div>}
      </div>
      <p className="mt-1.5 text-xs text-foreground/85 leading-relaxed">
        <span className="font-semibold text-foreground">What it is:</span> {what}
      </p>
      <p className="mt-1 text-xs text-foreground/85 leading-relaxed">
        <span className="font-semibold text-foreground">Right now:</span> {means}
      </p>
    </div>
  );
}