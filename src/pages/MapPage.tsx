import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapSearchBar } from "../components/map/MapSearchBar";
import { LayerToggle, type MapLayerMode } from "../components/map/LayerToggle";
import { MapControls } from "../components/map/MapControls";
import { StationMarkers } from "../components/map/StationMarkers";
import { HeatmapLayer } from "../components/map/HeatmapLayer";
import { StationBottomSheet } from "../components/map/StationBottomSheet";
import { useAllStations } from "../hooks/useAllStations";
import { useUserLocation } from "../hooks/useUserLocation";
import { findNearestStation } from "../utils/geo";
import { searchStations } from "../utils/stationSearch";
import type { MonitoringStation } from "../types";

/** Fallback center + zoom when location is denied/unsupported/still resolving — Mueang Samut Sakhon, the app's original pilot area. */
const SAMUT_SAKHON_CENTER: [number, number] = [13.5475, 100.2745];
const DEFAULT_ZOOM = 12;
const RECENTER_ZOOM = 13;

/** Recenters the map once, the first time a granted user location becomes available — never fights the user's own subsequent pan/zoom. */
function RecenterOnLocation({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const [hasRecentered, setHasRecentered] = useState(false);

  useEffect(() => {
    if (hasRecentered) return;
    map.setView([lat, lng], RECENTER_ZOOM);
    setHasRecentered(true);
  }, [lat, lng, hasRecentered, map]);

  return null;
}

export function MapPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLayer, setActiveLayer] = useState<MapLayerMode>("pm25");
  // Paint mock stations immediately so the map is never empty while the
  // live fetch is in flight, then swap in real nationwide Air4Thai stations
  // once they arrive (or keep mock — already logged via console.warn — if
  // the whole fetch fails).
  const { stations, isLoading: stationsLoading } = useAllStations();
  const { coords, status: locationStatus } = useUserLocation();

  const [selectedStation, setSelectedStation] = useState<MonitoringStation | null>(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // Once the live fetch has settled (success or fail), pick a sensible
  // default marker to show in the bottom sheet: nearest-to-user if we have
  // a location, otherwise just the first station — mirrors the Home hero
  // card's "nearest real station" behavior instead of a hard-coded pick.
  useEffect(() => {
    if (hasAutoSelected || stationsLoading || stations.length === 0) return;
    const nearest = coords ? findNearestStation(stations, coords) : null;
    setSelectedStation(nearest ? nearest.station : stations[0]);
    setHasAutoSelected(true);
  }, [hasAutoSelected, stationsLoading, stations, coords]);

  const visibleStations = useMemo(
    () => searchStations(stations, searchQuery),
    [stations, searchQuery],
  );

  const heatmapPoints = useMemo(
    () =>
      stations.map(
        (station): [number, number, number] => [
          station.location.lat,
          station.location.lng,
          Math.min(station.currentAqi / 250, 1),
        ],
      ),
    [stations],
  );

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={SAMUT_SAKHON_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {locationStatus === "granted" && coords && (
          <RecenterOnLocation lat={coords.lat} lng={coords.lng} />
        )}

        {activeLayer === "heatmap" && <HeatmapLayer points={heatmapPoints} />}

        <StationMarkers
          stations={visibleStations}
          selectedId={selectedStation?.id}
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

      {selectedStation && (
        <div className="absolute inset-x-0 bottom-0 z-400">
          <StationBottomSheet station={selectedStation} />
        </div>
      )}
    </div>
  );
}
