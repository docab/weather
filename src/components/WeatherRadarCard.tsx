import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LocationConditions } from "@/lib/types";
import { Radar, CloudRain, Cloud, Play, Pause } from "lucide-react";

type LayerKey = "rain" | "clouds";

interface RvIndex {
  host: string;
  radar: { past: { time: number; path: string }[]; nowcast: { time: number; path: string }[] };
  satellite: { infrared: { time: number; path: string }[] };
}

/**
 * Weather radar card powered by the free RainViewer API.
 * Supports rain radar (past + nowcast) and satellite cloud cover, with a
 * lightweight playback control. No API key required.
 */
export function WeatherRadarCard({ conditions }: { conditions: LocationConditions }) {
  const lat = conditions.weather.latitude ?? conditions.location.latitude;
  const lon = conditions.weather.longitude ?? conditions.location.longitude;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.TileLayer | null>(null);
  const [layer, setLayer] = useState<LayerKey>("rain");
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [data, setData] = useState<RvIndex | null>(null);

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: true,
      doubleClickZoom: false,
    }).setView([lat, lon], 8);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 12, attribution: "&copy; OSM, &copy; CARTO",
    }).addTo(map);
    L.circleMarker([lat, lon], {
      radius: 6, color: "hsl(var(--primary))", weight: 2,
      fillColor: "hsl(var(--primary))", fillOpacity: 0.9,
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [lat, lon]);

  // Fetch RainViewer index.
  useEffect(() => {
    let cancelled = false;
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then(r => r.json())
      .then((j: RvIndex) => { if (!cancelled) setData(j); })
      .catch(() => { /* offline — silently skip */ });
    return () => { cancelled = true; };
  }, []);

  const frames = useMemo(() => {
    if (!data) return [] as { time: number; path: string }[];
    if (layer === "rain") return [...data.radar.past, ...data.radar.nowcast];
    return data.satellite?.infrared ?? [];
  }, [data, layer]);

  // Reset to "now" when layer/data changes.
  useEffect(() => {
    if (!frames.length) return;
    const nowIdx = layer === "rain"
      ? Math.max(0, (data?.radar.past.length ?? 1) - 1)
      : frames.length - 1;
    setIdx(nowIdx);
  }, [frames, layer, data]);

  // Playback ticker.
  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const id = setInterval(() => setIdx(i => (i + 1) % frames.length), 700);
    return () => clearInterval(id);
  }, [playing, frames.length]);

  // Swap overlay tile layer when frame/layer changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data || !frames.length) return;
    const f = frames[idx];
    if (!f) return;
    const colour = layer === "rain" ? 4 : 0; // 4 = blue→red radar palette; 0 for IR
    const smooth = 1;
    const snow = layer === "rain" ? 1 : 0;
    const url = `${data.host}${f.path}/256/{z}/{x}/{y}/${colour}/${smooth}_${snow}.png`;
    const next = L.tileLayer(url, { opacity: 0.75, maxZoom: 12 });
    next.addTo(map);
    const prev = overlayRef.current;
    overlayRef.current = next;
    // Fade out prev once next loads to avoid flicker.
    next.once("load", () => prev?.remove());
    setTimeout(() => prev?.remove(), 600); // safety
  }, [idx, frames, data, layer]);

  const frameTime = frames[idx]?.time
    ? new Date(frames[idx].time * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "—";
  const isFuture = layer === "rain" && data && idx >= data.radar.past.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card animate-fade-in">
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Radar className="h-3.5 w-3.5 text-primary" /> Radar nearby
        </div>
        <div className="flex items-center gap-1">
          <LayerBtn active={layer === "rain"} onClick={() => setLayer("rain")} icon={<CloudRain className="h-3 w-3" />} label="Rain" />
          <LayerBtn active={layer === "clouds"} onClick={() => setLayer("clouds")} icon={<Cloud className="h-3 w-3" />} label="Clouds" />
        </div>
      </div>
      <div className="relative">
        <div ref={containerRef} className="h-56 w-full" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-background/90 to-transparent px-3 pb-2 pt-6 text-[10px]">
          <button
            onClick={() => setPlaying(p => !p)}
            className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-foreground/15 text-foreground/90 backdrop-blur transition-colors hover:bg-foreground/25"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <div className="tabular text-foreground/80">
            {frameTime}
            {isFuture && <span className="ml-1 rounded-full bg-primary/25 px-1.5 py-0.5 text-[9px] font-semibold text-primary">forecast</span>}
          </div>
          <span className="text-foreground/50">RainViewer · OSM</span>
        </div>
      </div>
    </div>
  );
}

function LayerBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors " +
        (active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:text-foreground")
      }
    >
      {icon}{label}
    </button>
  );
}