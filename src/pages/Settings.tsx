import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Bell, BellOff, Locate, MapPin, Star, StarOff, Trash2, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  loadLocations, loadPrefs, loadPrimaryId, saveLocations, savePrefs, savePrimaryId
} from "@/lib/storage";
import { useGeolocation } from "@/hooks/useGeolocation";
import { AddLocationDialog } from "@/components/AddLocationDialog";
import type { Location, NotificationPrefs, Severity } from "@/lib/types";

export default function Settings() {
  const { toast } = useToast();
  const geo = useGeolocation();
  const [locations, setLocations] = useState<Location[]>(() => loadLocations());
  const [primaryId, setPrimaryId] = useState<string>(() => loadPrimaryId() ?? "");
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => loadPrefs());
  const [addOpen, setAddOpen] = useState(false);

  const allLocations: Location[] = useMemo(() => {
    const list: Location[] = [];
    if (geo.location) list.push(geo.location);
    for (const l of locations) {
      if (!geo.location || l.id !== geo.location.id) list.push(l);
    }
    return list.slice(0, 3);
  }, [geo.location, locations]);

  useEffect(() => { savePrefs(prefs); }, [prefs]);

  const removeLocation = (id: string) => {
    const next = locations.filter(l => l.id !== id);
    setLocations(next);
    saveLocations(next);
    toast({ title: "Location removed" });
  };

  const setPrimary = (id: string) => {
    setPrimaryId(id);
    savePrimaryId(id);
  };

  const addLocation = (loc: Location) => {
    const next = [...locations.filter(l => l.id !== loc.id), loc].slice(-2);
    setLocations(next);
    saveLocations(next);
  };

  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Notifications not supported",
        description: "Your browser doesn't support web notifications.",
        variant: "destructive",
      });
      return;
    }
    const result = await Notification.requestPermission();
    if (result === "granted") {
      setPrefs(p => ({ ...p, enabled: true }));
      new Notification("PollenWatch UK", {
        body: "Notifications enabled — you'll get morning briefings.",
        icon: "/favicon.ico",
      });
    } else {
      toast({
        title: "Notifications blocked",
        description: "Enable them in your browser/iOS settings to receive alerts.",
      });
    }
  };

  const canAddMore = locations.length < 2;

  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back">
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-base font-bold">Settings</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Locations */}
        <Section title="Locations" subtitle="Up to 3 — your current location plus 2 saved">
          <div className="space-y-2">
            {allLocations.map(loc => (
              <div key={loc.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    {loc.isAutoDetected ? <Locate className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="font-medium">{loc.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[loc.postcode, loc.region, loc.isAutoDetected && "Auto-detected"]
                        .filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Set as primary"
                    onClick={() => setPrimary(loc.id)}
                  >
                    {primaryId === loc.id
                      ? <Star className="h-4 w-4 fill-primary text-primary" />
                      : <StarOff className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  {!loc.isAutoDetected && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove"
                      onClick={() => removeLocation(loc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              {!geo.location && (
                <Button variant="secondary" size="sm" onClick={geo.request} disabled={geo.loading}>
                  <Locate className="mr-1.5 h-4 w-4" />
                  {geo.loading ? "Locating…" : "Detect current"}
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAddOpen(true)}
                disabled={!canAddMore}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add location
              </Button>
              {!canAddMore && (
                <span className="self-center text-xs text-muted-foreground">Max reached</span>
              )}
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" subtitle="Daily briefings & threshold-based alerts">
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <Row
              label="Enable notifications"
              hint={prefs.enabled ? "On — alerts will be delivered" : "Off — turn on to receive alerts"}
              icon={prefs.enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              control={
                <Switch
                  checked={prefs.enabled}
                  onCheckedChange={async v => {
                    if (v) await requestNotifications();
                    else setPrefs(p => ({ ...p, enabled: false }));
                  }}
                />
              }
            />
            <Row
              label="Morning briefing"
              hint="A daily summary delivered at this time"
              control={
                <Input
                  type="time"
                  value={prefs.morningTime}
                  onChange={e => setPrefs(p => ({ ...p, morningTime: e.target.value }))}
                  className="w-28"
                />
              }
            />
            <Row
              label="Pollen alerts"
              hint="Heads-up when pollen crosses your threshold"
              control={
                <Switch
                  checked={prefs.pollenAlerts}
                  onCheckedChange={v => setPrefs(p => ({ ...p, pollenAlerts: v }))}
                />
              }
            />
            {prefs.pollenAlerts && (
              <div className="pl-9">
                <Label className="text-xs text-muted-foreground">Alert me when pollen is at least</Label>
                <Select
                  value={prefs.pollenThreshold}
                  onValueChange={(v: Severity) => setPrefs(p => ({ ...p, pollenThreshold: v }))}
                >
                  <SelectTrigger className="mt-1.5 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="very-high">Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Row
              label="Air quality alerts"
              hint="Warn me when AQI is High or above"
              control={
                <Switch
                  checked={prefs.aqiAlerts}
                  onCheckedChange={v => setPrefs(p => ({ ...p, aqiAlerts: v }))}
                />
              }
            />
            <Row
              label="Rain alerts"
              hint="Notify me about rain in the next few hours"
              control={
                <Switch
                  checked={prefs.rainAlerts}
                  onCheckedChange={v => setPrefs(p => ({ ...p, rainAlerts: v }))}
                />
              }
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            On iPhone, install via Safari's <em>Add to Home Screen</em> for push notifications.
          </p>
        </Section>

        <p className="text-center text-[10px] text-muted-foreground">v1.0 · PollenWatch UK</p>
      </main>

      <AddLocationDialog open={addOpen} onOpenChange={setAddOpen} onSelect={addLocation} />
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground/70">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({
  label, hint, icon, control,
}: { label: string; hint?: string; icon?: React.ReactNode; control: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground">{icon}</div>}
        <div className={icon ? "" : "ml-9"}>
          <div className="text-sm font-medium">{label}</div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}