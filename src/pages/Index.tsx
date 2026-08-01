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
import { dynamicSkyStyle, describeWeather, gradientInk } from "@/lib/weatherCodes";
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
  const pageBgStyle = activeWeather && skyInfo
    ? dynamicSkyStyle(skyInfo.sky, activeWeather.feelsLike, {
        windSpeed: activeWeather.windSpeed,
        humidity: activeWeather.humidity,
        cloudCover: activeWeather.cloudCover,
        uvIndex: activeWeather.uvIndex,
        isDay: activeWeather.isDay,
      })
    : { background: "hsl(var(--background))" };

  const NowIcon = skyInfo?.Icon ?? Eye;
  const ink = gradientInk(pageBgStyle as React.CSSProperties);
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

  return (
    <div className={`relative min-h-[100dvh] pb-32 ${ink === "dark" ? "ink-dark" : "ink-light"}`}>
      {/* Fixed, page-wide animated sky backdrop driven by the active location.
          The Stars tab swaps in aurora + meteor showers. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={pageBgStyle as React.CSSProperties}>
        {activeTab === "stars"
          ? <><AuroraFX active={meteorActive} /><MeteorFX active={meteorActive} /></>
          : activeWeather && <WeatherFX weather={activeWeather} intensity={1} />}
        {/* Soft veil for legibility — lighter than before so the sky shows through. */}
        {/* Very subtle veil — hero sky bleeds through on every tab. */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/25" />
      </div>

      {showLocationHeader && (
        <div className="sticky top-0 z-30 -mx-4 mb-1 px-4 pt-[calc(env(safe-area-inset-top)+0.15rem)] pb-1.5 backdrop-blur-xl bg-background/20">
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

        <div className="mt-8 space-y-1 text-center text-[10px] text-muted-foreground">
          {activeQuery?.data && (
            <p>
              Station reading {fmtClock(activeQuery.data.weather.observedAt ?? activeQuery.data.fetchedAt, activeQuery.data.weather.timezone)}
              {" · "}app refreshed {relTime(refreshedAt)}
            </p>
          )}
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

function TabBtnUnused({ active, onClick, label, children }: {
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

export default Index;