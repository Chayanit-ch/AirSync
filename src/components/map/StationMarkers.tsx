import { CircleMarker, Tooltip } from "react-leaflet";
import type { MonitoringStation } from "../../types";
import type { MapLayerMode } from "./LayerToggle";
import { getAqiSeverity, pm25ToAqi } from "../../utils/aqi";
import { SOURCE_STYLE, resolveSource } from "../../utils/dataSource";

const SEVERITY_HEX: Record<MonitoringStation["severity"], string> = {
  good: "#22c55e",
  moderate: "#eab308",
  sensitive: "#f97316",
  unhealthy: "#dc2626",
  veryUnhealthy: "#9333ea",
  hazardous: "#7f1d1d",
};

interface StationMarkersProps {
  stations: MonitoringStation[];
  selectedId?: string;
  onSelect: (station: MonitoringStation) => void;
  /**
   * Which metric drives marker color + label. "aqi" uses the station's own
   * reported AQI (`station.severity`, already `getAqiSeverity(currentAqi)`).
   * "pm25" recomputes severity straight from PM2.5 via this app's own
   * breakpoint table (`pm25ToAqi`) — genuinely can color a station
   * differently than "aqi" mode, since Air4Thai's own reported AQI and this
   * app's simplified PM2.5→AQI curve aren't guaranteed to agree. "heatmap"
   * keeps AQI-based coloring underneath the heatmap overlay (rendered by
   * the caller), matching the pre-existing heatmap-mode look.
   */
  mode: MapLayerMode;
}

export function StationMarkers({
  stations,
  selectedId,
  onSelect,
  mode,
}: StationMarkersProps) {
  return (
    <>
      {stations.map((station) => {
        const isSelected = station.id === selectedId;
        const severity =
          mode === "pm25" ? getAqiSeverity(pm25ToAqi(station.currentPm25)) : station.severity;
        const label =
          mode === "pm25"
            ? `${station.currentPm25.toFixed(1)}`
            : `${station.currentAqi}`;
        // Border color/dash pattern encodes data source (see SourceLegend) —
        // fillColor already encodes severity, so source needed its own
        // visual channel rather than reusing color.
        const sourceStyle = SOURCE_STYLE[resolveSource(station.source)];

        return (
          <CircleMarker
            key={station.id}
            center={[station.location.lat, station.location.lng]}
            radius={isSelected ? 12 : 9}
            pathOptions={{
              color: sourceStyle.color,
              weight: isSelected ? 3 : 2.5,
              dashArray: sourceStyle.dashArray,
              fillColor: SEVERITY_HEX[severity],
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: () => onSelect(station),
            }}
          >
            {/* Hover label (not `permanent`) so 171 nationwide markers don't
                paper the map with always-on numbers — full detail is one
                tap away in the bottom sheet via `onSelect`. */}
            <Tooltip
              direction="top"
              offset={[0, -8]}
              className="rounded-md! border-0  bg-gray-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-none"
            >
              {mode === "pm25" ? `${label} µg/m³` : `AQI ${label}`}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
