import { CircleMarker } from "react-leaflet";
import type { MonitoringStation } from "../../types";

const SEVERITY_HEX: Record<MonitoringStation["severity"], string> = {
  good: "#22c55e",
  moderate: "#eab308",
  sensitive: "#f97316",
  unhealthy: "#dc2626",
};

interface StationMarkersProps {
  stations: MonitoringStation[];
  selectedId?: string;
  onSelect: (station: MonitoringStation) => void;
}

export function StationMarkers({
  stations,
  selectedId,
  onSelect,
}: StationMarkersProps) {
  return (
    <>
      {stations.map((station) => {
        const isSelected = station.id === selectedId;
        return (
          <CircleMarker
            key={station.id}
            center={[station.location.lat, station.location.lng]}
            radius={isSelected ? 12 : 9}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: SEVERITY_HEX[station.severity],
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: () => onSelect(station),
            }}
          />
        );
      })}
    </>
  );
}
