import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Location } from "@/lib/types";
import { MapPin } from "lucide-react";

interface Props {
  locations: Location[];
  activeId?: string;
  onSelect?: (id: string) => void;
}

/**
 * Compact OpenStreetMap card showing every saved location as a pin.
 * Uses Leaflet directly (no React wrapper) for a small bundle.
 */
export function LocationsMapCard({ locations, activeId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const points = useMemo(
    () => locations.filter(l => Number.isFinite(l.latitude) && Number.isFinite(l.longitude)),
    [locations]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    }).setView([20, 0], 2);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap, &copy; CARTO",
    }).addTo(map);

    L.control.attribution({ position: "bottomright", prefix: false })
      .addAttribution("OSM · CARTO").addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (!points.length) return;

    const accent = "hsl(var(--primary))";
    const dim = "hsl(var(--muted-foreground))";

    points.forEach(loc => {
      const isActive = loc.id === activeId;
      const color = isActive ? accent : dim;
      const size = isActive ? 30 : 22;
      const html = `
        <div style="position:relative;width:${size}px;height:${size}px;">
          <div style="position:absolute;inset:0;border-radius:9999px;background:${color};opacity:.25;${isActive ? "animation: lmc-pulse 1.8s ease-out infinite;" : ""}"></div>
          <div style="position:absolute;inset:25%;border-radius:9999px;background:${color};box-shadow:0 0 0 2px hsl(var(--background));"></div>
        </div>`;
      const icon = L.divIcon({
        html,
        className: "",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const marker = L.marker([loc.latitude, loc.longitude], { icon, title: loc.customName || loc.name })
        .addTo(map)
        .bindTooltip(loc.customName || loc.name, { direction: "top", offset: [0, -8] });
      if (onSelect) marker.on("click", () => onSelect(loc.id));
      markersRef.current.push(marker);
    });

    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 9, { animate: true });
    } else {
      const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude] as [number, number]));
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 8, animate: true });
    }
  }, [points, activeId, onSelect]);

  if (!points.length) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" /> Your places on the map
      </div>
      <style>{`@keyframes lmc-pulse { 0% { transform: scale(1); opacity: .35; } 100% { transform: scale(2.2); opacity: 0; } }
        .leaflet-container { background: hsl(var(--card)); font-family: inherit; }
        .leaflet-tooltip { background: hsl(var(--popover)); color: hsl(var(--popover-foreground)); border: 1px solid hsl(var(--border)); box-shadow: none; font-size: 11px; }
        .leaflet-tooltip-top:before { border-top-color: hsl(var(--border)); }
        .leaflet-control-attribution { background: hsl(var(--background) / .6) !important; color: hsl(var(--muted-foreground)) !important; font-size: 9px !important; }`}</style>
      <div ref={containerRef} className="h-56 w-full" />
    </div>
  );
}