import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

export function HeatmapLayer({
  points,
}: {
  points: [number, number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    const heatLayer = L.heatLayer(points, {
      radius: 40,
      blur: 30,
      maxZoom: 16,
      gradient: {
        0.2: "#22c55e",
        0.4: "#eab308",
        0.6: "#f97316",
        1.0: "#dc2626",
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
}
