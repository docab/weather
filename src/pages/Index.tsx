import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LocationView, LocationViewSkeleton } from "@/components/LocationView";
import { AddLocationDialog } from "@/components/AddLocationDialog";
import { BriefingView } from "@/components/BriefingView";
import { ForecastView } from "@/components/ForecastView";
import { StargazingView } from "@/components/StargazingView";
import { TravelView } from "@/components/TravelView";
import { MeView } from "@/components/MeView";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useConditionsForLocations } from "@/hooks/useConditions";
import { loadLocations, loadPrimaryId, savePrimaryId, saveLocations } from "@/lib/storage";
import type { Location } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { LocateFixed, AlertCircle, Eye, CalendarDays, Sunrise, User, Plane, MapPin, ChevronDown, Plus, RotateCw } from "lucide-react";
import { WeatherFX, AuroraFX, MeteorFX } from "@/components/fx/WeatherFX";
import { skyOnlyStyle, sunPhaseOf, describeWeather, gradientInk, thermalTint, scrollTint } from "@/lib/weatherCodes";
import { activeShowers } from "@/lib/meteor";

const MAX_LOCATIONS = 10;
const MAX_SAVED = 9; // + 1 auto-detected = 10 total

type TabKey = "briefing" | "today" | "forecast" | "stars" | "travel" | "me";
const TAB_ORDER: TabKey[] = ["briefing", "today", "forecast", "stars", "travel", "me"];

const Index = () => {
  const geo = useGeolocation();
  const [savedLocations, setSavedLocations] = useState<Location[]>(() => loadLocations());
  const [activeId, setActiveId] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const queryClient = useQueryClient();

  const allLocations: Location[] = useMemo(() => {
    const list: Location[] = [];
    if (geo.location) list.push(geo.location);
    for (const l of savedLocations) {
      if (!geo.location || l.id !== geo.location.id) list.push(l);
    }
    return list.slice(0, MAX_LOCATIONS);
  }, [geo.location, savedLocations]);

  // Initialise active tab
  useEffect(() => {
    if (!allLocations.length) return;
    const primary = loadPrimaryId();
    if (primary && allLocations.some(l => l.id === primary)) {
      setActiveId(primary);
    } else if (!activeId || !allLocations.some(l => l.id === activeId)) {
      setActiveId(allLocations[0].id);
    }
  }, [allLocations, activeId]);

  const queries = useConditionsForLocations(allLocations);
  const activeIdx = allLocations.findIndex(l => l.id === activeId);
  const activeQuery = queries[activeIdx];

  const addLocation = (loc: Location) => {
    const next = [...savedLocations.filter(l => l.id !== loc.id), loc].slice(-MAX_SAVED);
    setSavedLocations(next);
    saveLocations(next);
    setActiveId(loc.id);
    savePrimaryId(loc.id);
  };

  const removeLocation = (id: string) => {
    const next = savedLocations.filter(l => l.id !== id);
    setSavedLocations(next);
    saveLocations(next);
    if (activeId === id && allLocations.length) {
      const remaining = allLocations.find(l => l.id !== id);
      if (remaining) { setActiveId(remaining.id); savePrimaryId(remaining.id); }
    }
  };

  const handleSelect = (id: string) => {
    setActiveId(id);
    savePrimaryId(id);
  };

  // Swipe-to-change-tab intentionally removed — tab content stays fixed to
  // the background. Tabs change only via the bottom navigation.

  const noLocation = !geo.location && !savedLocations.length;

  const activeWeather = activeQuery?.data?.weather;
  const meteorActive = activeShowers(new Date()).some(s => s.isPeakingNow);
  const skyInfo = activeWeather ? describeWeather(activeWeather.weatherCode, activeWeather.isDay) : null;
  // The app canvas is the SAME live sky as the hero — no temperature tint at
  // rest. The thermal tint only fades in once you scroll past the midpoint.
  const pageBgStyle = activeWeather && skyInfo
    ? skyOnlyStyle(skyInfo.sky, {
        cloudCover: activeWeather.cloudCover,
        precipMm: activeWeather.precipMm,
        precipProb: activeWeather.precipProb,
        phase: sunPhaseOf(
          Date.now(),
          activeWeather.daily?.[0]?.sunrise,
          activeWeather.daily?.[0]?.sunset,
          activeWeather.isDay,
        ),
      })
    : skyOnlyStyle("clear", { cloudCover: 5, phase: "day" });

  const NowIcon = skyInfo?.Icon ?? Eye;
  // The page backdrop also carries cloud/rain layers that darken it, so the
  // switch to dark ink only happens on genuinely bright daytime skies.
  const ink = !activeWeather || !activeWeather.isDay
    ? "light"
    : gradientInk(pageBgStyle as React.CSSProperties, 66);
  const activeLocation = allLocations[activeIdx] ?? allLocations[0];
  const showLocationHeader = activeTab !== "briefing" && !!activeLocation;

  // Manual refresh — re-locates and refetches the active location, throttled
  // to once every 60s so a hammered button doesn't spam the upstream API.
  const [refreshedAt, setRefreshedAt] = useState<number>(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      geo.request?.();
      await queryClient.invalidateQueries({ queryKey: ["conditions"] });
      setRefreshedAt(Date.now());
    } finally {
      setRefreshing(false);
    }
  };

  // Auto-refresh when the app comes back to the foreground, but only if the
  // data is older than five minutes.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - refreshedAt < 5 * 60_000) return;
      queryClient.invalidateQueries({ queryKey: ["conditions"] });
      setRefreshedAt(Date.now());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshedAt, queryClient]);

  // Ambient thermal tint for the whole app shell (cards inherit it through
  // --background). The live sky lives inside the hero only.
  const thermal = activeWeather ? thermalTint(activeWeather.feelsLike) : "220 22% 10%";
  // Vivid, saturated version used for the scroll-activated canvas wash.
  const vivid = activeWeather
    ? scrollTint(activeWeather.feelsLike, {
        weatherCode: activeWeather.weatherCode,
        precipMm: activeWeather.precipMm,
        isDay: activeWeather.isDay,
      })
    : thermal;

  // Physical weather effects on the glass cards: frost below zero, a snow cap
  // during snowfall, condensation streaks while it rains.
  const code = activeWeather?.weatherCode ?? 0;
  const snowing = (code >= 71 && code <= 77) || code === 85 || code === 86;
  const raining = !snowing && (((activeWeather?.precipMm ?? 0) > 0.05) ||
    (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95);
  const freezing = (activeWeather?.temp ?? 10) < 0;
  const envClass = [snowing && "env-snow", freezing && "env-frost", raining && "env-rain"]
    .filter(Boolean).join(" ");

  // ------------------------------------------------------------------
  // Scroll-driven temperature tint. At the top of the page the canvas is
  // pure live sky. Once the top edge of the "Right now" card crosses the
  // vertical midpoint of the viewport, the ambient thermal tint fades in.
  // Scrolling back up returns the canvas to pure sky.
  // ------------------------------------------------------------------
  const [tintK, setTintK] = useState(0);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = document.getElementById("feels");
      const mid = window.innerHeight * 0.5;
      if (!el) {
        // No "Right now" card on this tab — fall back to raw scroll depth.
        setTintK(Math.max(0, Math.min(1, window.scrollY / (window.innerHeight * 0.6))));
        return;
      }
      const top = el.getBoundingClientRect().top;
      // 0 while the card sits below the midpoint, 1 once it's 240px above it.
      setTintK(Math.max(0, Math.min(1, (mid - top) / 240)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [activeTab, activeId, activeQuery?.data]);

  return (
    <div
      className={`relative isolate min-h-[100dvh] pb-32 ${ink === "dark" ? "ink-dark" : "ink-light"} ${envClass}`}
      style={{ "--thermal-bg": thermal } as React.CSSProperties}
    >
      {/* Fixed, page-wide animated sky backdrop driven by the active location.
          The Stars tab swaps in aurora + meteor showers. */}
      <div className="pointer-events-none fixed inset-0 -z-[1] overflow-hidden" style={pageBgStyle as React.CSSProperties}>
        {activeTab === "stars"
          ? <><AuroraFX active={meteorActive} /><MeteorFX active={meteorActive} /></>
          : activeWeather && <WeatherFX weather={activeWeather} intensity={1} />}
        {/* Ambient temperature tint — invisible at the top of the page, fades
            in as you scroll past the "Right now" card. */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: `linear-gradient(180deg, hsl(${vivid} / 0.42) 0%, hsl(${vivid} / 0.94) 55%, hsl(${vivid}) 100%)`,
            opacity: tintK,
          }}
        />
        {/* Delicate snowflakes drifting behind the cards. */}
        {snowing && <SnowDrift />}
      </div>

      {showLocationHeader && (
        <div className="sticky top-0 z-30 -mx-4 mb-1 px-4 pt-[calc(env(safe-area-inset-top)+0.15rem)] pb-1.5 [backdrop-filter:blur(16px)_saturate(180%)] [-webkit-backdrop-filter:blur(16px)_saturate(180%)]">
          <div className="mx-auto flex max-w-2xl items-center justify-center gap-2">
            <button
              onClick={() => setActiveTab("briefing")}
              className="flex items-center gap-2 rounded-full glass-pill px-5 py-2.5 text-base font-semibold shadow-card"
              aria-label="Change location"
            >
              <MapPin className="h-4 w-4 text-primary" />
              <span className="max-w-[60vw] truncate">
                {activeLocation.customName || activeLocation.name}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={handleRefresh}
              aria-label="Refresh weather"
              className="flex h-10 w-10 items-center justify-center rounded-full glass-pill shadow-card active:scale-95"
            >
              <RotateCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      )}

      <main className={`mx-auto max-w-2xl px-4 ${showLocationHeader ? "pt-1" : "pt-4 safe-top"}`}>
        {noLocation && (
          <div className="my-8 rounded-2xl border border-border bg-card p-6 text-center shadow-card">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <LocateFixed className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">Where are you?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Allow location access for an instant local briefing — or add a city manually.
            </p>
            {geo.error && (
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" /> {geo.error}
              </p>
            )}
            <div className="mt-4 flex justify-center gap-2">
              <Button onClick={geo.request} disabled={geo.loading}>
                <LocateFixed className="mr-1 h-4 w-4" />
                {geo.loading ? "Locating…" : "Use my location"}
              </Button>
              <Button variant="secondary" onClick={() => setAddOpen(true)}>
                Add manually
              </Button>
            </div>
          </div>
        )}

        {allLocations.length > 0 && (
          <div className="w-full">
            {activeTab === "briefing" && (
              <>
                <BriefingView
                  locations={allLocations}
                  queries={queries}
                  onOpenLocation={(id) => { handleSelect(id); setActiveTab("today"); }}
                  onRemoveLocation={removeLocation}
                />
                {allLocations.length < MAX_LOCATIONS && (
                  <div className="mt-3 flex justify-center">
                    <Button variant="secondary" onClick={() => setAddOpen(true)} className="rounded-full">
                      <Plus className="mr-1 h-4 w-4" /> Add place ({allLocations.length}/{MAX_LOCATIONS})
                    </Button>
                  </div>
                )}
              </>
            )}
            {activeTab === "today" && (
              <>
                {activeQuery?.isLoading && <LocationViewSkeleton />}
                {activeQuery?.isError && (
                  <div className="glass-card border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
                    Weather service is temporarily unavailable (Open‑Meteo upstream error). Retrying automatically — please hang tight.
                  </div>
                )}
                {activeQuery?.data && <LocationView conditions={activeQuery.data} />}
              </>
            )}
            {activeTab === "forecast" && (
              <>
                {activeQuery?.isLoading && <LocationViewSkeleton />}
                {activeQuery?.data && <ForecastView conditions={activeQuery.data} />}
              </>
            )}
            {activeTab === "stars" && (
              <>
                {activeQuery?.isLoading && <LocationViewSkeleton />}
                {activeQuery?.data && <StargazingView conditions={activeQuery.data} />}
              </>
            )}
            {activeTab === "travel" && <TravelView locations={allLocations} queries={queries} />}
            {activeTab === "me" && <MeView conditions={activeQuery?.data} />}
          </div>
        )}

        <div className="mt-8 flex flex-col items-center gap-2 text-center text-[10px] text-muted-foreground">
          {activeQuery?.data && (
            <p>
              Last checked {relTime(refreshedAt)}
              {" · "}weather station updated {relTime(activeQuery.data.weather.observedAt ?? activeQuery.data.fetchedAt)}
              {" ("}{fmtClock(activeQuery.data.weather.observedAt ?? activeQuery.data.fetchedAt, activeQuery.data.weather.timezone)} local{")"}
            </p>
          )}
          <button
            onClick={handleRefresh}
            className="glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-foreground active:scale-95"
          >
            <RotateCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh now"}
          </button>
          <p>Data: Open-Meteo · postcodes.io · BigDataCloud · European AQI</p>
        </div>
      </main>

      {/* Bottom navigation — iOS 26-style floating liquid-glass pill.
          Larger hit targets, lifted off the home-indicator area. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 pointer-events-none"
        aria-label="Primary"
      >
        <div className="pointer-events-auto mx-auto max-w-2xl rounded-[2rem] glass-card px-2 py-2 shadow-2xl">
          <div className="grid grid-cols-6 gap-1">
            <TabBtn active={activeTab === "briefing"} onClick={() => setActiveTab("briefing")} label="Glance">
              <Eye className="h-6 w-6" />
            </TabBtn>
            <TabBtn active={activeTab === "today"} onClick={() => setActiveTab("today")} label="Now">
              <NowIcon className="h-6 w-6" />
            </TabBtn>
            <TabBtn active={activeTab === "forecast"} onClick={() => setActiveTab("forecast")} label="Forecast">
              <CalendarDays className="h-6 w-6" />
            </TabBtn>
            <TabBtn active={activeTab === "stars"} onClick={() => setActiveTab("stars")} label="Sky">
              <Sunrise className="h-6 w-6" />
            </TabBtn>
            <TabBtn active={activeTab === "travel"} onClick={() => setActiveTab("travel")} label="Travel">
              <Plane className="h-6 w-6" />
            </TabBtn>
            <TabBtn active={activeTab === "me"} onClick={() => setActiveTab("me")} label="Me">
              <User className="h-6 w-6" />
            </TabBtn>
          </div>
        </div>
      </nav>

      <AddLocationDialog open={addOpen} onOpenChange={setAddOpen} onSelect={addLocation} />
    </div>
  );
};

function TabBtn({ active, onClick, label, children }: {
  active: boolean; onClick: () => void; label: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl py-2 transition active:scale-95 ${active
        ? "bg-primary/20 text-primary shadow-inner"
        : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
}

/** Slow, delicate snowflakes drifting behind the card stack. */
function SnowDrift() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 46 }).map((_, i) => {
        const size = 2 + ((i * 7) % 5);
        return (
          <span
            key={i}
            className="absolute rounded-full bg-white/85"
            style={{
              left: `${(i * 13.7) % 100}%`,
              top: "-6%",
              width: size,
              height: size,
              boxShadow: "0 0 6px rgba(255,255,255,.8)",
              animation: `fx-snow ${10 + (i % 9)}s linear ${(i % 11) * 0.9}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

function TabBtnLegacy({ active, onClick, label, children }: {
  active: boolean; onClick: () => void; label: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl py-2 transition active:scale-95 ${active
        ? "bg-primary/20 text-primary shadow-inner"
        : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
}

/** Clock reading in the location's own timezone. */
function fmtClock(ms: number, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz,
  }).format(new Date(ms));
}

/** "just now" / "6 min ago" style relative label. */
function relTime(ms: number): string {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h === 1 ? "1 hour ago" : `${h} hours ago`;
}

export default Index;