import type { LocationConditions } from "@/lib/types";
import { AnimatedUmbrella } from "./fx/WeatherFX";
import { ClothingIcon } from "./icons/ClothingIcon";
import { PerfumeBottle } from "./icons/PerfumeBottle";
import { Package, Droplet, Pill, Sparkles, Sun, Shield } from "lucide-react";
import { sweatEstimate } from "@/lib/explainers";
import { loadPersonalPrefs } from "@/lib/personal";

/**
 * Suggestions — everything to grab before heading out. Wear, umbrella,
 * fragrance, water/hydration, antihistamines (if hayfever), plus AI
 * follow-on tips derived from live conditions.
 */
export function SuggestionsCard({ conditions }: { conditions: LocationConditions }) {
  const w = conditions.weather;
  const prefs = loadPersonalPrefs();
  const needUmbrella = w.precipProb >= 40;
  const sweat = sweatEstimate(w.feelsLike, w.humidity);
  const water = waterLine(w.feelsLike, w.humidity);
  const antihist = prefs.health?.includes("hayfever") && conditions.pollen.risk !== "low"
    ? `Pollen is ${conditions.pollen.risk} today — take your antihistamine before heading out.`
    : null;
  const smart = smartTips(conditions);

  return (
    <section id="suggestions" className="glass-card p-5 shadow-card animate-fade-in-up">
      <header className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Package className="h-3.5 w-3.5 text-primary" /> Suggestions
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Row icon={<ClothingIcon weather={w} size={20} />} label="Wear" text={conditions.outfit}
             sub={`Expect ~${sweat.litres}L/hr sweat if active. ${sweat.note}`} />
        <Row icon={<AnimatedUmbrella open={needUmbrella} size={22} />} label="Umbrella" text={conditions.umbrella} />
        <Row icon={<PerfumeBottle size={22} />} label="Fragrance" text={conditions.perfume} />
        <Row icon={<Droplet className="h-5 w-5" />} label="Hydration" text={water} />
        {antihist && <Row icon={<Pill className="h-5 w-5" />} label="Antihistamines" text={antihist} />}
        {w.uvIndex >= 6 && (
          <Row icon={<Sun className="h-5 w-5" />} label="Sun protection"
               text={`UV ${Math.round(w.uvIndex)} — SPF ${w.uvIndex >= 8 ? "50" : "30"}, hat and sunnies for anything over 20 minutes outside.`} />
        )}
        {smart.length > 0 && (
          <div className="sm:col-span-2 rounded-2xl border border-primary/30 bg-primary/10 p-3">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Smart follow-ons
            </div>
            <ul className="space-y-1.5 text-xs leading-relaxed text-foreground/90">
              {smart.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Shield className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function Row({ icon, label, text, sub }: { icon: React.ReactNode; label: string; text: string; sub?: string }) {
  return (
    <div className="flex gap-3 rounded-xl glass-tile p-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground/95">{text}</div>
        {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

function waterLine(feels: number, humidity: number): string {
  if (feels >= 28) return `Carry a full bottle — hot and ${humidity >= 60 ? "muggy" : "dry"}, top up whenever you can.`;
  if (feels >= 22) return `A bottle for anything longer than 30 min out.`;
  if (feels >= 12) return `Normal water intake is fine — a small bottle for exercise.`;
  return `Cold air still dehydrates — sip through the day, warm drinks welcome.`;
}

function smartTips(c: LocationConditions): string[] {
  const w = c.weather;
  const out: string[] = [];
  if (w.windGust >= 40 && w.precipProb >= 40) out.push("Gusts + rain = brolly will flip. Pick a jacket with a proper hood instead.");
  if (w.feelsLike >= 30 && w.humidity >= 60) out.push("Muggy heat — cotton or linen only, avoid synthetic layers that trap sweat.");
  if (w.feelsLike <= 2 && w.windSpeed >= 15) out.push("Wind chill will bite bare skin fast — cover cheeks and hands, not just the coat.");
  if (w.uvIndex >= 7 && w.cloudCover < 30) out.push("UV bounces off pavements too — SPF the tops of your ears and back of neck.");
  if (c.aqi.index >= 60) out.push("Air quality is poor — a light mask if you're cycling or running near traffic.");
  if (w.feelsLike >= 25 && w.uvIndex >= 5) out.push("Keep a spare t-shirt for later — sweat cools you if you're back indoors.");
  return out.slice(0, 4);
}