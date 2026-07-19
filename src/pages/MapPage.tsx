import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapSearchBar } from "../components/map/MapSearchBar";
import { LayerToggle, type MapLayerMode } from "../components/map/LayerToggle";
import { MapControls } from "../components/map/MapControls";
import { StationMarkers } from "../components/map/StationMarkers";
import { HeatmapLayer } from "../components/map/HeatmapLayer";
import { StationBottomSheet } from "../components/map/StationBottomSheet";
import { useAllStations } from "../hooks/useAllStations";
import { useUserLocation } from "../hooks/useUserLocation";
import { getWaqiStationsInBounds } from "../services/airQuality";
import { dedupeWaqiStations, findNearestStation } from "../utils/geo";
import { searchStations } from "../utils/stationSearch";
import type { MonitoringStation } from "../types";

/** Fallback center + zoom when location is denied/unsupported/still resolving — Mueang Samut Sakhon, the app's original pilot area. */
const SAMUT_SAKHON_CENTER: [number, number] = [13.5475, 100.2745];
const DEFAULT_ZOOM = 12;
const RECENTER_ZOOM = 13;
const VIEWPORT_CHECK_DEBOUNCE_MS = 500;

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

/**
 * Fills empty regions of the map: whenever the viewport settles (pan/zoom)
 * and none of the already-loaded Air4Thai stations fall inside it, queries
 * WAQI for stations in that viewport as a supplemental source — Air4Thai
 * stays authoritative wherever it has coverage; WAQI only shows up where it
 * doesn't. Debounced so rapid panning doesn't fire a request per frame.
 */
function WaqiViewportSupplement({
  air4thaiStations,
  onWaqiStations,
}: {
  air4thaiStations: MonitoringStation[];
  onWaqiStations: (stations: MonitoringStation[]) => void;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkAndFetch = useCallback(async () => {
    const bounds = map.getBounds();
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const north = bounds.getNorth();
    const east = bounds.getEast();

    const hasAir4ThaiInView = air4thaiStations.some(
      (station) =>
        station.location.lat >= south &&
        station.location.lat <= north &&
        station.location.lng >= west &&
        station.location.lng <= east,
    );

    if (hasAir4ThaiInView) {
      onWaqiStations([]);
      return;
    }

    const waqiStations = await getWaqiStationsInBounds({ south, west, north, east });
    onWaqiStations(dedupeWaqiStations(air4thaiStations, waqiStations));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [air4thaiStations]);

  const scheduleCheck = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void checkAndFetch(), VIEWPORT_CHECK_DEBOUNCE_MS);
  }, [checkAndFetch]);

  const map = useMapEvents({
    moveend: scheduleCheck,
    zoomend: scheduleCheck,
  });

  // Initial viewport (mount) and whenever the Air4Thai station list itself
  // changes (e.g. mock -> live swap) — re-checks without waiting for a pan.
  useEffect(() => {
    scheduleCheck();
  }, [scheduleCheck]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return null;
}

export function MapPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLayer, setActiveLayer] = useState<MapLayerMode>("pm25");
  // Paint mock stations immediately so the map is never empty while the
  // live fetch is in flight, then swap in real nationwide Air4Thai stations
  // once they arrive (or keep mock — already logged via console.warn — if
  // the whole fetch fails).
  const { stations: air4thaiStations, isLoading: stationsLoading } = useAllStations();
  const { coords, status: locationStatus } = useUserLocation();
  const [waqiStations, setWaqiStations] = useState<MonitoringStation[]>([]);

  const stations = useMemo(
    () => [...air4thaiStations, ...waqiStations],
    [air4thaiStations, waqiStations],
  );

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

        <WaqiViewportSupplement
          air4thaiStations={air4thaiStations}
          onWaqiStations={setWaqiStations}
        />

        {/* AQI/PM2.5 both keep markers visible (differently colored/labeled —
            see StationMarkers' `mode` prop); heatmap adds the overlay on top. */}
        {activeLayer === "heatmap" && <HeatmapLayer points={heatmapPoints} />}

        <StationMarkers
          stations={visibleStations}
          selectedId={selectedStation?.id}
          onSelect={setSelectedStation}
          mode={activeLayer}
        />

        <MapControls
          onToggleLayers={() =>
            setActiveLayer((prev) =>
              prev === "pm25" ? "aqi" : prev === "aqi" ? "heatmap" : "pm25",
            )
          }
        />
      </MapContainer>

      {/* Top-left control stack — capped to a sensible width on desktop so it
          doesn't stretch edge-to-edge across a much wider map. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-400 flex flex-col gap-2 p-3 lg:max-w-sm">
        <div className="pointer-events-auto">
          <MapSearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
        <div className="pointer-events-auto">
          <LayerToggle active={activeLayer} onChange={setActiveLayer} />
        </div>
      </div>

      {/* Bottom sheet on mobile; docked right-side panel on desktop (more
          screen space to work with than a phone-width bottom sheet). */}
      {selectedStation && (
        <div className="absolute inset-x-0 bottom-0 z-400 lg:inset-x-auto lg:top-0 lg:right-0 lg:bottom-0 lg:w-96">
          <StationBottomSheet station={selectedStation} />
        </div>
      )}
    </div>
  );
}
