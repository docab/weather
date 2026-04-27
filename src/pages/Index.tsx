import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { LiveBanner } from "@/components/LiveBanner";
import { LocationTabs } from "@/components/LocationTabs";
import { LocationView, LocationViewSkeleton } from "@/components/LocationView";
import { AddLocationDialog } from "@/components/AddLocationDialog";
import { BriefingView } from "@/components/BriefingView";
import { ForecastView } from "@/components/ForecastView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useConditionsForLocations } from "@/hooks/useConditions";
import { loadLocations, loadPrimaryId, savePrimaryId, saveLocations } from "@/lib/storage";
import type { Location } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { LocateFixed, AlertCircle } from "lucide-react";

const MAX_LOCATIONS = 5;
const MAX_SAVED = 4; // + 1 auto-detected

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
            <TabsList className="grid w-full grid-cols-3 bg-card">
              <TabsTrigger value="briefing">Briefing</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="forecast">7-day</TabsTrigger>
            </TabsList>

            <TabsContent value="briefing" className="mt-4">
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
            </TabsContent>

            <TabsContent value="today" className="mt-4">
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
            </TabsContent>

            <TabsContent value="forecast" className="mt-4">
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