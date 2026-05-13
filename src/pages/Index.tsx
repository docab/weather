import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { LiveBanner } from "@/components/LiveBanner";
import { LocationTabs } from "@/components/LocationTabs";
import { LocationView, LocationViewSkeleton } from "@/components/LocationView";
import { AddLocationDialog } from "@/components/AddLocationDialog";
import { BriefingView } from "@/components/BriefingView";
import { ForecastView } from "@/components/ForecastView";
import { StargazingView } from "@/components/StargazingView";
import { TravelView } from "@/components/TravelView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useConditionsForLocations } from "@/hooks/useConditions";
import { loadLocations, loadPrimaryId, savePrimaryId, saveLocations } from "@/lib/storage";
import type { Location } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { LocateFixed, AlertCircle } from "lucide-react";
import { WeatherFX, AuroraFX, MeteorFX } from "@/components/fx/WeatherFX";
import { activeShowers } from "@/lib/meteor";

const MAX_LOCATIONS = 7;
const MAX_SAVED = 6; // + 1 auto-detected

const Index = () => {
  const geo = useGeolocation();
  const [savedLocations, setSavedLocations] = useState<Location[]>(() => loadLocations());
  const [activeId, setActiveId] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
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

  // Live banner uses the auto-detected (or first) location
  const bannerIdx = geo.location
    ? allLocations.findIndex(l => l.id === geo.location!.id)
    : 0;
  const bannerData = queries[bannerIdx]?.data;

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

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["conditions"] });
  };

  const noLocation = !geo.location && !savedLocations.length;
  const refreshing = queries.some(q => q.isFetching);

  const activeWeather = activeQuery?.data?.weather;
  const meteorActive = activeShowers(new Date()).some(s => s.isPeakingNow);

  return (
    <div className="min-h-screen pb-16">
      <AppHeader onRefresh={refresh} refreshing={refreshing} />

      <main className="mx-auto max-w-2xl px-4 pt-4">
        {bannerData && (
          <div className="mb-4">
            <LiveBanner conditions={bannerData} />
          </div>
        )}

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
          <Tabs defaultValue="today" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-card text-xs">
              <TabsTrigger value="briefing" className="px-1">Now</TabsTrigger>
              <TabsTrigger value="today" className="px-1">Today</TabsTrigger>
              <TabsTrigger value="forecast" className="px-1">7-day</TabsTrigger>
              <TabsTrigger value="stars" className="px-1">Stars</TabsTrigger>
              <TabsTrigger value="travel" className="px-1">Travel</TabsTrigger>
            </TabsList>

            <TabsContent value="briefing" className="mt-4">
              <TabBg fx={activeWeather && <WeatherFX weather={activeWeather} intensity={0.5} />}>
              <BriefingView
                locations={allLocations}
                queries={queries}
                onOpenLocation={(id) => {
                  handleSelect(id);
                  // Switch back to Today tab via DOM (Tabs is uncontrolled here)
                  const todayTab = document.querySelector<HTMLButtonElement>('[role="tab"][value="today"]');
                  todayTab?.click();
                }}
              />
              </TabBg>
            </TabsContent>

            <TabsContent value="today" className="mt-4">
              <TabBg fx={activeWeather && <WeatherFX weather={activeWeather} intensity={0.5} />}>
              <div className="mb-4">
                <LocationTabs
                  locations={allLocations}
                  activeId={activeId}
                  onSelect={handleSelect}
                  onAdd={() => setAddOpen(true)}
                  canAdd={savedLocations.length < MAX_SAVED}
                />
              </div>

              {activeQuery?.isLoading && <LocationViewSkeleton />}
              {activeQuery?.isError && (
                <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
                  Couldn't load conditions. Try again in a moment.
                </div>
              )}
              {activeQuery?.data && <LocationView conditions={activeQuery.data} />}
              </TabBg>
            </TabsContent>

            <TabsContent value="forecast" className="mt-4">
              <TabBg fx={activeWeather && <WeatherFX weather={activeWeather} intensity={0.4} />}>
              <div className="mb-4">
                <LocationTabs
                  locations={allLocations}
                  activeId={activeId}
                  onSelect={handleSelect}
                  onAdd={() => setAddOpen(true)}
                  canAdd={savedLocations.length < MAX_SAVED}
                />
              </div>
              {activeQuery?.isLoading && <LocationViewSkeleton />}
              {activeQuery?.data && <ForecastView conditions={activeQuery.data} />}
              </TabBg>
            </TabsContent>

            <TabsContent value="stars" className="mt-4">
              <TabBg fx={<><AuroraFX /><MeteorFX active={meteorActive} /></>}>
              <div className="mb-4">
                <LocationTabs
                  locations={allLocations}
                  activeId={activeId}
                  onSelect={handleSelect}
                  onAdd={() => setAddOpen(true)}
                  canAdd={savedLocations.length < MAX_SAVED}
                />
              </div>
              {activeQuery?.isLoading && <LocationViewSkeleton />}
              {activeQuery?.data && <StargazingView conditions={activeQuery.data} />}
              </TabBg>
            </TabsContent>

            <TabsContent value="travel" className="mt-4">
              <TabBg fx={activeWeather && <WeatherFX weather={activeWeather} intensity={0.4} />}>
              <TravelView locations={allLocations} queries={queries} />
              </TabBg>
            </TabsContent>
          </Tabs>
        )}

        <p className="mt-8 text-center text-[10px] text-muted-foreground">
          Data: Open-Meteo · postcodes.io · BigDataCloud · European AQI
        </p>
      </main>

      <AddLocationDialog open={addOpen} onOpenChange={setAddOpen} onSelect={addLocation} />
    </div>
  );
};

export default Index;

/** Wraps a tab in an animated, weather-driven backdrop with a translucent
 * black overlay so the underlying content stays legible. */
function TabBg({ fx, children }: { fx: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative -mx-4 overflow-hidden rounded-3xl px-4 py-4">
      <div className="pointer-events-none absolute inset-0">
        {fx}
        <div className="absolute inset-0 bg-background/70" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}