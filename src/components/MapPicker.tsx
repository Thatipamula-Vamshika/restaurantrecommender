// Click-to-pick map using Leaflet + OSM tiles. Reverse-geocodes via Nominatim
// in English. Mounted client-only because Leaflet touches `window`.
import { useEffect, useRef, useState } from "react";

type Result = {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  display?: string;
};

export function MapPicker({
  initial,
  onPick,
}: {
  initial?: { lat: number; lng: number };
  onPick: (r: Result) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<string>("Click on the map to pick a place, or drag the marker.");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !ref.current) return;
    let cancelled = false;
    let map: import("leaflet").Map | null = null;
    let marker: import("leaflet").Marker | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      // CSS via CDN (no bundler config needed)
      if (!document.querySelector('link[data-leaflet-css]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.setAttribute("data-leaflet-css", "1");
        document.head.appendChild(link);
      }
      // Default marker icon URLs (Vite breaks the relative ones)
      const icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41], iconAnchor: [12, 41],
      });
      if (cancelled || !ref.current) return;

      const center: [number, number] = initial
        ? [initial.lat, initial.lng]
        : [22.9734, 78.6569]; // India centroid
      map = L.map(ref.current).setView(center, initial ? 12 : 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const placeMarker = (lat: number, lng: number) => {
        if (!map) return;
        if (marker) marker.setLatLng([lat, lng]);
        else {
          marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
          marker.on("dragend", () => {
            const p = marker!.getLatLng();
            void resolve(p.lat, p.lng);
          });
        }
        void resolve(lat, lng);
      };

      const resolve = async (lat: number, lng: number) => {
        setStatus("Looking up address (English)…");
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&accept-language=en&lat=${lat}&lon=${lng}`,
          );
          const d = await res.json();
          const a = d?.address ?? {};
          const city = a.city || a.town || a.village || a.county;
          const state = a.state;
          setStatus(`📍 ${city ?? "Unknown city"}${state ? ", " + state : ""}`);
          onPick({ lat, lng, city, state, display: d?.display_name });
        } catch {
          setStatus("Pinned (offline reverse-geocode failed)");
          onPick({ lat, lng });
        }
      };

      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        placeMarker(e.latlng.lat, e.latlng.lng);
      });

      if (initial) placeMarker(initial.lat, initial.lng);
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [mounted, initial, onPick]);

  return (
    <div className="space-y-2">
      <div ref={ref} className="h-72 w-full overflow-hidden rounded-2xl border border-border bg-muted" />
      <p className="text-xs text-muted-foreground">{status}</p>
    </div>
  );
}
