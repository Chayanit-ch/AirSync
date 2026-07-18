import { useEffect, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapSearchBar } from "../components/map/MapSearchBar";
import { LayerToggle, type MapLayerMode } from "../components/map/LayerToggle";
import { MapControls } from "../components/map/MapControls";
import { StationMarkers } from "../components/map/StationMarkers";
import { HeatmapLayer } from "../components/map/HeatmapLayer";
import { StationBottomSheet } from "../components/map/StationBottomSheet";
import { heatmapPoints, monitoringStations as mockMonitoringStations } from "../data/mockData";
import { getLiveAirQuality } from "../services/airQuality";
import type { MonitoringStation } from "../types";

const SAMUT_SAKHON_CENTER: [number, number] = [13.5475, 100.2745];

export function MapPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLayer, setActiveLayer] = useState<MapLayerMode>("pm25");
  // Paint mock stations immediately so the map is never empty while the
  // live fetch is in flight, then swap in real Air4Thai stations once they
  // arrive (or keep mock — already logged via console.warn — if it fails).
  const [stations, setStations] = useState<MonitoringStation[]>(mockMonitoringStations);
  const [selectedStation, setSelectedStation] = useState<MonitoringStation>(
    mockMonitoringStations[0],
  );

  useEffect(() => {
    let cancelled = false;
    getLiveAirQuality().then(({ stations: liveStations, isLive }) => {
      if (cancelled || !isLive || liveStations.length === 0) return;
      setStations(liveStations);
      setSelectedStation(liveStations[0]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={SAMUT_SAKHON_CENTER}
        zoom={12}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {activeLayer === "heatmap" && <HeatmapLayer points={heatmapPoints} />}

        <StationMarkers
          stations={stations}
          selectedId={selectedStation.id}
          onSelect={setSelectedStation}
        />

        <MapControls
          onToggleLayers={() =>
            setActiveLayer((prev) =>
              prev === "pm25" ? "aqi" : prev === "aqi" ? "heatmap" : "pm25",
            )
          }
        />
      </MapContainer>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-400 flex flex-col gap-2 p-3">
        <div className="pointer-events-auto">
          <MapSearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
        <div className="pointer-events-auto">
          <LayerToggle active={activeLayer} onChange={setActiveLayer} />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-400">
        <StationBottomSheet station={selectedStation} />
      </div>
    </div>
  );
}
