import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPinOff } from "lucide-react";
import { MapSearchBar } from "../components/map/MapSearchBar";
import { LayerToggle, type MapLayerMode } from "../components/map/LayerToggle";
import { MapControls } from "../components/map/MapControls";
import { StationMarkers } from "../components/map/StationMarkers";
import { HeatmapLayer } from "../components/map/HeatmapLayer";
import { StationBottomSheet } from "../components/map/StationBottomSheet";
import { SourceLegend } from "../components/map/SourceLegend";
import { SourceDebugCounter } from "../components/map/SourceDebugCounter";
import { useAllStations } from "../hooks/useAllStations";
import { useUserLocation } from "../hooks/useUserLocation";
import { useTranslation } from "../hooks/useTranslation";
import { getWaqiStationsInBounds } from "../services/airQuality";
import { dedupeWaqiStations, findNearestStation } from "../utils/geo";
import { searchStations } from "../utils/stationSearch";
import { resolveSource } from "../utils/dataSource";
import type { DataSource, MonitoringStation } from "../types";

interface ViewportBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

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
 * Fills empty regions of the map: whenever the viewport settles (pan/zoom),
 * queries WAQI for stations in that viewport as a supplemental source, then
 * drops any WAQI station within 1.5km of an Air4Thai station already known
 * (`dedupeWaqiStations`) — Air4Thai stays authoritative wherever it has
 * coverage; WAQI only shows up where it doesn't. Debounced so rapid panning
 * doesn't fire a request per frame.
 *
 * ALWAYS fetches WAQI for the viewport now — this used to skip the WAQI
 * fetch entirely whenever *any* Air4Thai station fell anywhere inside the
 * viewport (`hasAir4ThaiInView`), which was fine at city zoom but broke down
 * at country-wide zoom: with ~140 Air4Thai stations scattered nationwide,
 * virtually every wide viewport contains at least one of them, so WAQI got
 * skipped even for provinces Air4Thai doesn't cover at all (confirmed live:
 * a whole-Thailand viewport showed "WAQI: 0" despite WAQI's own
 * `/map/bounds` endpoint returning 62 real stations, 29 of them >1.5km from
 * any Air4Thai station). WAQI's bounds endpoint has no bbox-size problem —
 * verified directly with a whole-country bounding box (62 stations, ~1.7s,
 * no truncation) — so per-station dedup on every fetch is correct here
 * instead of a coarser viewport-level skip.
 *
 * Skips entirely while `stationsLoading` is true: on mount, `air4thaiStations`
 * is briefly the small 6-station mock fallback before the real ~170-station
 * fetch resolves, and deduping against that stand-in list wastes a
 * guaranteed-redundant WAQI call on every single Map page load (confirmed via
 * live debugging — the mount effect used to fire twice, once per station list).
 */
function WaqiViewportSupplement({
  air4thaiStations,
  stationsLoading,
  onWaqiStations,
  onEmptyViewportChange,
  onBoundsChange,
}: {
  air4thaiStations: MonitoringStation[];
  stationsLoading: boolean;
  onWaqiStations: (stations: MonitoringStation[]) => void;
  onEmptyViewportChange: (isEmpty: boolean) => void;
  /** Reported every time the viewport is (re)checked — powers `SourceDebugCounter` so it updates on the same pan/zoom cadence as the WAQI supplement check itself, no separate map-event listener needed. */
  onBoundsChange: (bounds: ViewportBounds) => void;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkAndFetch = useCallback(async () => {
    const bounds = map.getBounds();
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const north = bounds.getNorth();
    const east = bounds.getEast();
    onBoundsChange({ south, west, north, east });

    if (stationsLoading) return;

    const hasAir4ThaiInView = air4thaiStations.some(
      (station) =>
        station.location.lat >= south &&
        station.location.lat <= north &&
        station.location.lng >= west &&
        station.location.lng <= east,
    );

    const waqiStations = await getWaqiStationsInBounds({ south, west, north, east });
    const deduped = dedupeWaqiStations(air4thaiStations, waqiStations);
    onWaqiStations(deduped);
    onEmptyViewportChange(!hasAir4ThaiInView && deduped.length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [air4thaiStations, stationsLoading]);

  const scheduleCheck = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void checkAndFetch(), VIEWPORT_CHECK_DEBOUNCE_MS);
  }, [checkAndFetch]);

  const map = useMapEvents({
    moveend: scheduleCheck,
    zoomend: scheduleCheck,
  });

  // Initial viewport (mount) and whenever the Air4Thai station list itself
  // changes (mock -> live swap, or once loading finishes) — re-checks
  // without waiting for a pan.
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
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLayer, setActiveLayer] = useState<MapLayerMode>("pm25");
  // Paint mock stations immediately so the map is never empty while the
  // live fetch is in flight, then swap in real nationwide Air4Thai stations
  // once they arrive (or keep mock — already logged via console.warn — if
  // the whole fetch fails).
  const { stations: air4thaiStations, isLoading: stationsLoading } = useAllStations();
  const { coords, status: locationStatus } = useUserLocation();
  const [waqiStations, setWaqiStations] = useState<MonitoringStation[]>([]);
  const [viewportHasNoStations, setViewportHasNoStations] = useState(false);
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null);
  const [showSourceDebugCounter, setShowSourceDebugCounter] = useState(false);

  const stations = useMemo(
    () => [...air4thaiStations, ...waqiStations],
    [air4thaiStations, waqiStations],
  );

  // Per-source station counts inside the *current* viewport — the ground
  // truth for "is WAQI actually showing up here", independent of any prior
  // claim about the code. See SourceDebugCounter.
  const viewportSourceCounts = useMemo(() => {
    const counts: Record<DataSource, number> = { air4thai: 0, waqi: 0, mock: 0 };
    if (!viewportBounds) return counts;
    for (const station of stations) {
      const { lat, lng } = station.location;
      if (
        lat < viewportBounds.south ||
        lat > viewportBounds.north ||
        lng < viewportBounds.west ||
        lng > viewportBounds.east
      ) {
        continue;
      }
      counts[resolveSource(station.source)] += 1;
    }
    return counts;
  }, [stations, viewportBounds]);

  const [selectedStation, setSelectedStation] = useState<MonitoringStation | null>(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [searchParams] = useSearchParams();

  // Once the live fetch has settled (success or fail), pick a sensible
  // default marker to show in the bottom sheet. `?station=<id>` (e.g. from
  // `AirQualityAlertBanner`'s "View details" link) takes priority over the
  // usual nearest-to-user/first-station fallback — mirrors the Home hero
  // card's "nearest real station" behavior otherwise, instead of a
  // hard-coded pick.
  useEffect(() => {
    if (hasAutoSelected || stationsLoading || stations.length === 0) return;
    const requestedId = searchParams.get("station");
    const requested = requestedId ? stations.find((s) => s.id === requestedId) : null;
    if (requested) {
      setSelectedStation(requested);
      setHasAutoSelected(true);
      return;
    }
    const nearest = coords ? findNearestStation(stations, coords) : null;
    setSelectedStation(nearest ? nearest.station : stations[0]);
    setHasAutoSelected(true);
  }, [hasAutoSelected, stationsLoading, stations, coords, searchParams]);

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
          stationsLoading={stationsLoading}
          onWaqiStations={setWaqiStations}
          onEmptyViewportChange={setViewportHasNoStations}
          onBoundsChange={setViewportBounds}
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
        <div className="pointer-events-auto">
          <SourceLegend />
        </div>
        <div className="pointer-events-auto">
          <SourceDebugCounter
            counts={viewportSourceCounts}
            visible={showSourceDebugCounter}
            onToggleVisible={() => setShowSourceDebugCounter((prev) => !prev)}
          />
        </div>
        {viewportHasNoStations && (
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl bg-gray-900/80 px-3 py-2 text-xs font-medium text-white shadow-md">
            <MapPinOff size={14} className="shrink-0" />
            {t("map.noStationsNearby")}
          </div>
        )}
      </div>

      {/* Bottom sheet on mobile; docked right-side panel on desktop (more
          screen space to work with than a phone-width bottom sheet). */}
      {selectedStation && (
        <div className="absolute inset-x-0 bottom-0 z-400 lg:inset-x-auto lg:top-0 lg:right-0 lg:bottom-0 lg:w-96">
          <StationBottomSheet station={selectedStation} mode={activeLayer} />
        </div>
      )}
    </div>
  );
}
