import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function deviceTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
  catch { return "UTC"; }
}

function offsetMinutes(tz: string, date: Date): number {
  const s = new Intl.DateTimeFormat("en-GB", { timeZone: tz, timeZoneName: "shortOffset" })
    .formatToParts(date).find(p => p.type === "timeZoneName")?.value ?? "";
  const m = /GMT([+-]\d+)(?::(\d+))?/.exec(s);
  if (!m) return 0;
  const sign = s.includes("-") ? -1 : 1;
  const h = Math.abs(parseInt(m[1], 10));
  const mm = m[2] ? parseInt(m[2], 10) : 0;
  return sign * (h * 60 + mm);
}

function ymd(tz: string, date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: tz });
}

function offsetLabel(min: number): string {
  if (min === 0) return "GMT";
  const sign = min > 0 ? "+" : "−";
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  return m === 0 ? `GMT${sign}${h}` : `GMT${sign}${h}:${String(m).padStart(2, "0")}`;
}

/**
 * Compact local-time chip. Returns null when the location shares the
 * device timezone offset. Shows just `HH:MM GMT+X` plus the date when it
 * falls on a different calendar day from "here".
 */
export function LocalTimeCard({
  timezone, placeName, variant = "card",
}: { timezone: string; placeName: string; variant?: "card" | "inline" }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const here = deviceTz();
  if (!timezone || timezone === "auto" || timezone === here) return null;
  const offHere = offsetMinutes(here, now);
  const offThere = offsetMinutes(timezone, now);
  if (offHere === offThere) return null;

  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone });
  const offLabel = offsetLabel(offThere);

  // Day-shift only when the calendar date differs from "here".
  const dayThere = ymd(timezone, now);
  const dayHere = ymd(here, now);
  let dayChip: string | null = null;
  if (dayThere !== dayHere) {
    const dateLabel = now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: timezone });
    dayChip = dayThere > dayHere ? `${dateLabel} · next day` : `${dateLabel} · prev day`;
  }

  if (variant === "inline") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-2.5 py-0.5 text-[10px] font-semibold text-foreground/80">
        <Clock className="h-3 w-3" />
        <span className="tabular">{time}</span>
        <span className="opacity-70">{offLabel}</span>
        {dayChip && <span className="opacity-70">· {dayChip}</span>}
      </span>
    );
  }

  return (
    <div className="glass-card flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <Clock className="h-3.5 w-3.5 text-primary" /> Local time in {placeName}
      </div>
      <div className="text-right leading-tight">
        <div className="tabular text-lg font-bold">
          {time} <span className="text-xs font-medium text-muted-foreground">{offLabel}</span>
        </div>
        {dayChip && <div className="text-[10px] text-muted-foreground">{dayChip}</div>}
      </div>
    </div>
  );
}