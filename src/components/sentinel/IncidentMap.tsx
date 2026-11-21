import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export interface MapPoint { id: string; lat: number; lng: number; color: string; label: string; ring?: boolean }

/** Leaflet loaded only in the browser after mount (SSR-safe). */
export function IncidentMap({ points, onSelect, className, center, selectedId }: { points: MapPoint[]; onSelect?: (id: string) => void; className?: string; center?: [number, number]; selectedId?: string | null }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const selRef = useRef(onSelect);
  selRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !el.current || mapRef.current) return;
      const m = L.map(el.current).setView(center ?? [13.065, 80.225], center ? 17 : 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(m);
      mapRef.current = m;
      layerRef.current = L.layerGroup().addTo(m);
      draw(L);
    });
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw(L: typeof import("leaflet")) {
    const g = layerRef.current;
    if (!g) return;
    g.clearLayers();
    const css = getComputedStyle(document.documentElement);
    const resolve = (c: string) => { const m = /^var\((--[\w-]+)\)$/.exec(c); return m?.[1] ? css.getPropertyValue(m[1]).trim() || c : c; };
    for (const p of points) {
      const sel = p.id === selectedId;
      const fill = resolve(p.color);
      L.circleMarker([p.lat, p.lng], { radius: sel ? 22 : 15, stroke: false, fillColor: fill, fillOpacity: sel ? 0.3 : 0.16, interactive: false }).addTo(g);
      const c = L.circleMarker([p.lat, p.lng], { radius: sel ? 10 : 7, color: p.ring ? resolve("var(--primary)") : resolve("var(--background)"), weight: p.ring || sel ? 3 : 2, dashArray: p.ring ? "3 3" : undefined, fillColor: fill, fillOpacity: 1 });
      c.bindTooltip(p.label);
      c.on("click", () => selRef.current?.(p.id));
      c.addTo(g);
    }
  }
  useEffect(() => { void import("leaflet").then((L) => draw(L)); });

  return <div ref={el} className={className} style={{ minHeight: 300 }} />;
}
