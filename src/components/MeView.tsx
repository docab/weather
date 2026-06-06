import { useMemo, useState } from "react";
import type { LocationConditions } from "@/lib/types";
import {
  ACTIVITY_ICON, ACTIVITY_LABEL, type ActivityKey, type CommuteMode,
  type PersonalPrefs, commuteRiskAt, defaultPersonalPrefs,
  loadPersonalPrefs, savePersonalPrefs, scoreActivity,
} from "@/lib/personal";
import { Slider } from "@/components/ui/slider";
import { Settings2, Sparkles, AlertTriangle, CheckCircle2, Clock, Bike, Car, Bus, Footprints } from "lucide-react";

const ACTS: ActivityKey[] = ["run", "cycle", "walk", "garden", "photo", "dining"];

/**
 * "Me" tab — a personal weather profile stored locally. Translates the
 * active location's forecast into actionable, person-shaped advice:
 * activity windows, commute risk, daily lifestyle score. No accounts,
 * no cloud, no AI calls — everything runs in the browser.
 */
export function MeView({ conditions }: { conditions: LocationConditions | undefined }) {
  const [prefs, setPrefs] = useState<PersonalPrefs>(() => loadPersonalPrefs());
  const [editing, setEditing] = useState(false);

  const update = (p: PersonalPrefs) => { setPrefs(p); savePersonalPrefs(p); };
  const toggleAct = (k: ActivityKey) => {
    const next = prefs.activities.includes(k)
      ? prefs.activities.filter(a => a !== k)
      : [...prefs.activities, k];
    update({ ...prefs, activities: next });
  };

  const results = useMemo(() => {
    if (!conditions) return [];
    return prefs.activities.map(a => scoreActivity(a, conditions.weather, prefs));
  }, [prefs, conditions]);

  const lifestyleScore = useMemo(() => {
    if (!results.length) return null;
    return Math.round(results.reduce((a, r) => a + r.scoreNow, 0) / results.length);
  }, [results]);

  const outRisk = useMemo(() => conditions ? commuteRiskAt(prefs.commuteOut, conditions.weather, prefs) : null, [conditions, prefs]);
  const backRisk = useMemo(() => conditions ? commuteRiskAt(prefs.commuteBack, conditions.weather, prefs) : null, [conditions, prefs]);

  if (!conditions) {
    return <div className="glass-card p-6 text-sm text-muted-foreground">Pick a location first to see your personalised view.</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Greeting + lifestyle score */}
      <div className="glass-card p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your day</div>
            <h2 className="mt-1 text-xl font-bold">
              {prefs.name ? `Hey ${prefs.name},` : "Hey there,"} {lifestyleScore !== null ? lifestyleVerdict(lifestyleScore) : "set a few preferences below."}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Based on {conditions.location.customName || conditions.location.name} · {results.length} activit{results.length === 1 ? "y" : "ies"} you care about.
            </p>
          </div>
          {lifestyleScore !== null && <ScoreRing score={lifestyleScore} />}
        </div>
      </div>

      {/* Activity cards */}
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Activity windows · next 12 hours
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {results.map(r => <ActivityCard key={r.key} r={r} tz={conditions.weather.timezone} />)}
          </div>
        </div>
      )}

      {/* Commute */}
      <div className="glass-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <CommuteIcon mode={prefs.commuteMode} /> Commute outlook
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <RiskRow title={`Out · ${prefs.commuteOut}`} risk={outRisk} />
          <RiskRow title={`Back · ${prefs.commuteBack}`} risk={backRisk} />
        </div>
      </div>

      {/* Preferences */}
      <div className="glass-card p-5 shadow-card">
        <button
          onClick={() => setEditing(e => !e)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Settings2 className="h-4 w-4 text-primary" /> Your preferences
          </div>
          <span className="text-xs text-muted-foreground">{editing ? "Hide" : "Edit"}</span>
        </button>
        {editing && (
          <div className="mt-4 space-y-5 text-sm">
            <Field label="Your name (optional)">
              <input
                value={prefs.name || ""}
                onChange={e => update({ ...prefs, name: e.target.value || undefined })}
                placeholder="e.g. Sam"
                className="w-full rounded-lg border border-border bg-card-elevated px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </Field>

            <Field label="Activities you care about">
              <div className="flex flex-wrap gap-1.5">
                {ACTS.map(k => {
                  const on = prefs.activities.includes(k);
                  return (
                    <button key={k} onClick={() => toggleAct(k)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${on
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
                      <span>{ACTIVITY_ICON[k]}</span>{ACTIVITY_LABEL[k]}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="How you usually get around">
              <div className="flex flex-wrap gap-1.5">
                {(["walk", "cycle", "drive", "transit"] as CommuteMode[]).map(m => (
                  <button key={m} onClick={() => update({ ...prefs, commuteMode: m })}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs capitalize transition-colors ${prefs.commuteMode === m
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
                    <CommuteIcon mode={m} /> {m}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Leave at">
                <input type="time" value={prefs.commuteOut}
                  onChange={e => update({ ...prefs, commuteOut: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card-elevated px-3 py-2 text-sm outline-none focus:border-primary/50" />
              </Field>
              <Field label="Head back at">
                <input type="time" value={prefs.commuteBack}
                  onChange={e => update({ ...prefs, commuteBack: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card-elevated px-3 py-2 text-sm outline-none focus:border-primary/50" />
              </Field>
            </div>

            <Field label={`Temperature sensitivity · ${prefs.tempSensitivity > 0 ? "+" : ""}${prefs.tempSensitivity}°`}>
              <Slider min={-3} max={3} step={1} value={[prefs.tempSensitivity]}
                onValueChange={v => update({ ...prefs, tempSensitivity: v[0] })} />
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>Run cold</span><span>Just right</span><span>Run hot</span>
              </div>
            </Field>

            <Field label={`Wind tolerance · up to ${prefs.windTolerance} mph`}>
              <Slider min={10} max={50} step={5} value={[prefs.windTolerance]}
                onValueChange={v => update({ ...prefs, windTolerance: v[0] })} />
            </Field>

            <Field label={`Rain tolerance · flag above ${prefs.rainTolerance}%`}>
              <Slider min={10} max={90} step={10} value={[prefs.rainTolerance]}
                onValueChange={v => update({ ...prefs, rainTolerance: v[0] })} />
            </Field>

            <button
              onClick={() => update(defaultPersonalPrefs)}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              Reset to defaults
            </button>
          </div>
        )}
      </div>

      <p className="px-2 text-center text-[10px] text-muted-foreground">
        Everything on this tab lives in your browser. No accounts, no tracking.
      </p>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const hue = score >= 75 ? 200 : score >= 50 ? 45 : score >= 30 ? 25 : 8;
  const stroke = `hsl(${hue} 80% 55%)`;
  const c = 2 * Math.PI * 26;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <circle cx="32" cy="32" r="26" fill="none" stroke={stroke} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={c}
          strokeDashoffset={c - (c * score) / 100} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular">{score}</div>
    </div>
  );
}

function ActivityCard({ r, tz }: { r: ReturnType<typeof scoreActivity>; tz: string }) {
  const bestT = r.best && r.best.score > r.scoreNow + 10
    ? new Date(r.best.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz })
    : null;
  const tone = r.scoreNow >= 70 ? "border-primary/40 bg-primary/10"
             : r.scoreNow >= 40 ? "border-border bg-card"
             : "border-destructive/30 bg-destructive/5";
  return (
    <div className={`rounded-2xl border p-3 ${tone} animate-fade-in`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{ACTIVITY_ICON[r.key]}</span>
          <span className="text-sm font-semibold">{ACTIVITY_LABEL[r.key]}</span>
        </div>
        <span className="text-base font-bold tabular">{r.scoreNow}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{r.verdict}</p>
      {bestT && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-primary">
          <Clock className="h-3 w-3" /> Better window around {bestT} (~{r.best!.score})
        </div>
      )}
    </div>
  );
}

function RiskRow({ title, risk }: { title: string; risk: ReturnType<typeof commuteRiskAt> | null }) {
  if (!risk) return null;
  const icon = risk.level === "warn"
    ? <AlertTriangle className="h-4 w-4 text-destructive" />
    : risk.level === "watch"
      ? <AlertTriangle className="h-4 w-4 text-amber-400" />
      : <CheckCircle2 className="h-4 w-4 text-primary" />;
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span>{title}</span>{icon}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{risk.detail}</p>
    </div>
  );
}

function CommuteIcon({ mode }: { mode: CommuteMode }) {
  const cls = "h-4 w-4";
  if (mode === "cycle") return <Bike className={cls} />;
  if (mode === "drive") return <Car className={cls} />;
  if (mode === "transit") return <Bus className={cls} />;
  return <Footprints className={cls} />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function lifestyleVerdict(s: number): string {
  if (s >= 80) return "today's lined up beautifully.";
  if (s >= 65) return "you've got a good day ahead.";
  if (s >= 45) return "today's a mixed bag.";
  if (s >= 25) return "weather's working against you today.";
  return "best to stay cosy indoors.";
}