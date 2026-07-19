import type { GeoPoint, MonitoringStation } from "../types";

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two points, in kilometers. */
export function haversineDistanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface NearestStationResult {
  station: MonitoringStation;
  distanceKm: number;
}

/** Finds the closest station to `point` out of `stations`, or null if the list is empty. */
export function findNearestStation(
  stations: MonitoringStation[],
  point: GeoPoint,
): NearestStationResult | null {
  let best: NearestStationResult | null = null;

  for (const station of stations) {
    const distanceKm = haversineDistanceKm(point, station.location);
    if (!best || distanceKm < best.distanceKm) {
      best = { station, distanceKm };
    }
  }

  return best;
}

/**
 * Drops any `candidates` station within `thresholdKm` of a station already in
 * `existing` — WAQI sometimes republishes the exact same physical Air4Thai
 * station under its own id, and this app always prefers Air4Thai (the
 * official source) when both cover the same spot, so the WAQI duplicate is
 * hidden rather than shown as a second, stacked marker for one real location.
 */
export function dedupeWaqiStations(
  existing: MonitoringStation[],
  candidates: MonitoringStation[],
  thresholdKm = 1.5,
): MonitoringStation[] {
  return candidates.filter(
    (candidate) =>
      !existing.some((station) => haversineDistanceKm(station.location, candidate.location) <= thresholdKm),
  );
}
