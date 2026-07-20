import { useEffect, useMemo, useState } from "react";
import type { AreaAirQualitySummary, GeoPoint, MonitoringStation } from "../types";
import { useAllStations } from "./useAllStations";
import { useUserLocation, type UserLocationStatus } from "./useUserLocation";
import {
  DEFAULT_STATION_ID,
  NEARBY_STATION_RANGE_KM,
  getWaqiNearestStation,
  resolveStationReading,
} from "../services/airQuality";
import { dedupeWaqiStations, findNearestStation, haversineDistanceKm } from "../utils/geo";

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
  /** False when this reading is a synthetic placeholder rather than a real Air4Thai/WAQI reading. */
  isLive: boolean;
  /** Distance from the user to `area`, in km — null when not geolocation-based (denied/unsupported fallback). */
  distanceKm: number | null;
  /** True when the nearest real station (Air4Thai or WAQI) is further than a reasonable "nearby" range. */
  outOfRange: boolean;
  locationStatus: UserLocationStatus;
  retryLocation: () => void;
}

/**
 * Drives the Home hero card from the user's real location, in priority order:
 *
 * 1. Nearest currently-reporting Air4Thai station (Haversine over
 *    `useAllStations()`'s nationwide list). Used as-is if within
 *    `NEARBY_STATION_RANGE_KM`.
 * 2. If the nearest Air4Thai station is further than that, WAQI is queried as
 *    a supplemental source (`getWaqiNearestStation`) — Air4Thai remains
 *    authoritative when it has coverage; WAQI only fills the gap when it
 *    doesn't. A WAQI result that's basically the same physical spot as an
 *    Air4Thai station already known (`dedupeWaqiStations`) is discarded
 *    rather than shown as a near-duplicate reading.
 * 3. If WAQI also has nothing, falls back to the distant Air4Thai reading
 *    anyway, flagged `outOfRange` (today's pre-WAQI behavior).
 * 4. Permission denied/unsupported/still resolving falls back to
 *    `DEFAULT_STATION_ID` (still a real station) via the same never-silent
 *    `resolveStationReading` followed-station summaries use, with
 *    `retryLocation` wired to a visible retry control.
 */
export function useNearestStationHero(): NearestStationHeroResult {
  const { stations, isLoading: stationsLoading, isLive: stationsAreLive } = useAllStations();
  const { coords, status, retry } = useUserLocation();

  const nearestAir4Thai = coords ? findNearestStation(stations, coords) : null;
  const needsWaqi = !!nearestAir4Thai && nearestAir4Thai.distanceKm > NEARBY_STATION_RANGE_KM;

  const [waqiStation, setWaqiStation] = useState<MonitoringStation | null>(null);
  const [waqiSettled, setWaqiSettled] = useState(false);

  useEffect(() => {
    if (!needsWaqi || !coords) {
      setWaqiStation(null);
      setWaqiSettled(false);
      return;
    }

    let cancelled = false;
    setWaqiSettled(false);
    const point: GeoPoint = coords;

    getWaqiNearestStation(point).then((station) => {
      if (cancelled) return;
      const deduped = station ? dedupeWaqiStations(stations, [station]) : [];
      setWaqiStation(deduped[0] ?? null);
      setWaqiSettled(true);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsWaqi, coords?.lat, coords?.lng]);

  // Computed unconditionally (not inline in the fallback branch below) and
  // memoized on `stations` so it doesn't re-run — and re-warn via
  // `resolveStationReading`'s console.warn — on every render that merely
  // reaches the permission-denied/unsupported branch; only when `stations`
  // itself actually changes (mock -> live swap).
  const defaultStationFallback = useMemo(
    () => resolveStationReading(DEFAULT_STATION_ID, stations),
    [stations],
  );

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
    if (nearestAir4Thai && !needsWaqi) {
      return {
        area: toAreaSummary(nearestAir4Thai.station),
        isLoading: false,
        isLive: stationsAreLive,
        distanceKm: nearestAir4Thai.distanceKm,
        outOfRange: false,
        locationStatus: status,
        retryLocation: retry,
      };
    }

    if (needsWaqi && !waqiSettled) {
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

    if (waqiStation) {
      return {
        area: toAreaSummary(waqiStation),
        isLoading: false,
        isLive: true,
        distanceKm: haversineDistanceKm(coords, waqiStation.location),
        outOfRange: false,
        locationStatus: status,
        retryLocation: retry,
      };
    }

    if (nearestAir4Thai) {
      // WAQI had nothing nearby either — still show the distant Air4Thai
      // reading rather than nothing, honestly flagged out of range.
      return {
        area: toAreaSummary(nearestAir4Thai.station),
        isLoading: false,
        isLive: stationsAreLive,
        distanceKm: nearestAir4Thai.distanceKm,
        outOfRange: true,
        locationStatus: status,
        retryLocation: retry,
      };
    }
  }

  // Permission denied/unsupported, or (very unlikely) an empty stations list
  // even while granted — fall back to the named default station honestly,
  // via the same never-silent resolver followed-station summaries use.
  return {
    area: toAreaSummary(defaultStationFallback.station),
    isLoading: false,
    isLive: defaultStationFallback.isLive,
    distanceKm: null,
    outOfRange: false,
    locationStatus: status,
    retryLocation: retry,
  };
}
