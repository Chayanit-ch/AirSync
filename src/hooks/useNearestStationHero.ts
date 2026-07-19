import type { AreaAirQualitySummary, MonitoringStation } from "../types";
import { useAllStations } from "./useAllStations";
import { useUserLocation, type UserLocationStatus } from "./useUserLocation";
import { DEFAULT_STATION_ID, resolveStationReading } from "../services/airQuality";
import { findNearestStation } from "../utils/geo";

/** Beyond this, a station is too far away to honestly call "your area" — show it labeled as the closest available reading instead. */
const NEARBY_RANGE_KM = 25;

function toAreaSummary(station: MonitoringStation): AreaAirQualitySummary {
  const areaName =
    station.district && station.province
      ? `${station.district}, ${station.province}`
      : station.name;

  return {
    id: station.id,
    areaName,
    avgAqi: station.currentAqi,
    avgPm25: station.currentPm25,
    severity: station.severity,
  };
}

export interface NearestStationHeroResult {
  area: AreaAirQualitySummary | null;
  isLoading: boolean;
  /** False when this reading is a synthetic placeholder rather than a real Air4Thai reading. */
  isLive: boolean;
  /** Distance from the user to `area`, in km — null when not geolocation-based (denied/unsupported fallback). */
  distanceKm: number | null;
  /** True when the nearest real station is further than a reasonable "nearby" range. */
  outOfRange: boolean;
  locationStatus: UserLocationStatus;
  retryLocation: () => void;
}

/**
 * Drives the Home hero card from the user's real location: finds the
 * nearest currently-reporting Air4Thai station via the Haversine formula
 * over `useAllStations()`'s nationwide list, replacing the old fixed
 * "Mueang Samut Sakhon" area. Falls back to `DEFAULT_STATION_ID` (still a
 * real station) when location is denied/unsupported/still resolving, with
 * `retryLocation` wired to a visible retry control so denial is never a
 * dead end.
 */
export function useNearestStationHero(): NearestStationHeroResult {
  const { stations, isLoading: stationsLoading, isLive: stationsAreLive } = useAllStations();
  const { coords, status, retry } = useUserLocation();

  if (stationsLoading || status === "locating") {
    return {
      area: null,
      isLoading: true,
      isLive: false,
      distanceKm: null,
      outOfRange: false,
      locationStatus: status,
      retryLocation: retry,
    };
  }

  if (status === "granted" && coords) {
    const nearest = findNearestStation(stations, coords);
    if (nearest) {
      return {
        area: toAreaSummary(nearest.station),
        isLoading: false,
        isLive: stationsAreLive,
        distanceKm: nearest.distanceKm,
        outOfRange: nearest.distanceKm > NEARBY_RANGE_KM,
        locationStatus: status,
        retryLocation: retry,
      };
    }
  }

  // Permission denied/unsupported, or (very unlikely) an empty stations list
  // even while granted — fall back to the named default station honestly,
  // via the same never-silent resolver followed-station summaries use.
  const { station, isLive } = resolveStationReading(DEFAULT_STATION_ID, stations);
  return {
    area: toAreaSummary(station),
    isLoading: false,
    isLive,
    distanceKm: null,
    outOfRange: false,
    locationStatus: status,
    retryLocation: retry,
  };
}
