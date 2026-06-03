import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/** Get the user's device timezone (best-effort). */
function deviceTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
  catch { return "UTC"; }
}

function formatLocal(tz: string, date: Date): { time: string; date: string; tzName: string } {
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
  const dateStr = date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: tz });
  const tzName = new Intl.DateTimeFormat("en-GB", { timeZone: tz, timeZoneName: "short" })
    .formatToParts(date).find(p => p.type === "timeZoneName")?.value ?? "";
  return { time, date: dateStr, tzName };
}

/**
 * Shows the local time at `timezone`. Renders nothing when the timezone
 * matches the user's device timezone (i.e. same as "here") — we only want
 * it to appear when there's an actual offset worth surfacing.
 */
export function LocalTimeCard({ timezone, placeName }: { timezone: string; placeName: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const here = deviceTz();
  if (!timezone || timezone === "auto" || timezone === here) return null;

  // Also bail if the offset is identical (e.g. Europe/London vs Europe/Guernsey).
  const offsetMinutes = (tz: string) => {
    const s = new Intl.DateTimeFormat("en-GB", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(now).find(p => p.type === "timeZoneName")?.value ?? "";
    const m = /GMT([+-]\d+)(?::(\d+))?/.exec(s);
    if (!m) return 0;
    return parseInt(m[1], 10) * 60 + (m[2] ? parseInt(m[2], 10) : 0);
  };
  if (offsetMinutes(timezone) === offsetMinutes(here)) return null;

  const there = formatLocal(timezone, now);
  const local = formatLocal(here, now);
  return (
    <div className="glass-card flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <Clock className="h-3.5 w-3.5 text-primary" />
        Local time in {placeName}
      </div>
      <div className="text-right leading-tight">
        <div className="tabular text-lg font-bold">{there.time} <span className="text-xs font-medium text-muted-foreground">{there.tzName}</span></div>
        <div className="text-[10px] text-muted-foreground">
          {there.date} · it's {local.time} {local.tzName} where you are
        </div>
      </div>
    </div>
  );
}