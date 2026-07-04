import { useEffect, useMemo, useRef, useState } from "react";
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
import { LocateFixed, AlertCircle, Eye, CalendarDays, Sunrise, User, Plane } from "lucide-react";
import { WeatherFX, AuroraFX, MeteorFX } from "@/components/fx/WeatherFX";
import { dynamicSkyStyle, describeWeather } from "@/lib/weatherCodes";
import { activeShowers } from "@/lib/meteor";

const MAX_LOCATIONS = 7;
const MAX_SAVED = 6; // + 1 auto-detected

type TabKey = "briefing" | "today" | "forecast" | "stars" | "travel" | "me";
const TAB_ORDER: TabKey[] = ["briefing", "today", "forecast", "stars", "travel", "me"];

const Index = () => {
  const geo = useGeolocation();
  const [savedLocations, setSavedLocations] = useState<Location[]>(() => loadLocations());
  const [activeId, setActiveId] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const queryClient = useQueryClient();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

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

  const handleSelect = (id: string) => {
    setActiveId(id);
    savePrimaryId(id);
  };

  // Swipe left/right to change tabs
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null || touchStartY.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null; touchStartY.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    const idx = TAB_ORDER.indexOf(activeTab);
    const next = dx < 0 ? Math.min(TAB_ORDER.length - 1, idx + 1) : Math.max(0, idx - 1);
    if (next !== idx) setActiveTab(TAB_ORDER[next]);
  };

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

  return (
    <div className="relative min-h-screen pb-24" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Fixed, page-wide animated sky backdrop driven by the active location.
          The Stars tab swaps in aurora + meteor showers. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={pageBgStyle as React.CSSProperties}>
        {activeTab === "stars"
          ? <><AuroraFX active={meteorActive} /><MeteorFX active={meteorActive} /></>
          : activeWeather && <WeatherFX weather={activeWeather} intensity={1} />}
        {/* Soft veil for legibility — lighter than before so the sky shows through. */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/55 to-background/80" />
      </div>

      <main className="mx-auto max-w-2xl px-4 pt-4">
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
              <BriefingView
                locations={allLocations}
                queries={queries}
                onOpenLocation={(id) => { handleSelect(id); setActiveTab("today"); }}
              />
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

        <p className="mt-8 text-center text-[10px] text-muted-foreground">
          Data: Open-Meteo · postcodes.io · BigDataCloud · European AQI
        </p>
      </main>

      {/* Bottom navigation — icon-first, order per spec. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto grid max-w-2xl grid-cols-6 gap-1 px-2 py-2 text-[10px]">
          <TabBtn active={activeTab === "briefing"} onClick={() => setActiveTab("briefing")} label="Glance">
            <Eye className="h-5 w-5" />
          </TabBtn>
          <TabBtn active={activeTab === "today"} onClick={() => setActiveTab("today")} label="Now">
            <NowIcon className="h-5 w-5" />
          </TabBtn>
          <TabBtn active={activeTab === "forecast"} onClick={() => setActiveTab("forecast")} label="Forecast">
            <CalendarDays className="h-5 w-5" />
          </TabBtn>
          <TabBtn active={activeTab === "stars"} onClick={() => setActiveTab("stars")} label="Sky">
            <Sunrise className="h-5 w-5" />
          </TabBtn>
          <TabBtn active={activeTab === "travel"} onClick={() => setActiveTab("travel")} label="Travel">
            <Plane className="h-5 w-5" />
          </TabBtn>
          <TabBtn active={activeTab === "me"} onClick={() => setActiveTab("me")} label="Me">
            <User className="h-5 w-5" />
          </TabBtn>
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
      className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition ${active
        ? "bg-primary/15 text-primary"
        : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}

export default Index;