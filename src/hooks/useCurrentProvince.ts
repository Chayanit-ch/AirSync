import { useAuth } from "../contexts/AuthContext";
import { resolveStationReading } from "../services/airQuality";
import { findNearestStation } from "../utils/geo";
import { useAllStations } from "./useAllStations";
import { useUserLocation } from "./useUserLocation";

/**
 * Best-effort "what province is this user in right now", in priority order —
 * exactly the two sources named by the provincial-regulations spec:
 *
 * 1. The nearest station to the user's real GPS location (same source of
 *    truth as the Home hero card's `useNearestStationHero`).
 * 2. Their first followed/tracked station's province, when location is
 *    denied/unsupported/still resolving.
 *
 * Returns `null` when neither is available (still loading, or a guest with
 * location denied and no followed areas) — callers must treat `null` as
 * "unknown, don't show anything province-specific yet", not as an error.
 */
export function useCurrentProvince(): string | null {
  const { userProfile } = useAuth();
  const { stations } = useAllStations();
  const { coords, status } = useUserLocation();

  if (status === "granted" && coords) {
    const nearest = findNearestStation(stations, coords);
    if (nearest?.station.province) return nearest.station.province;
  }

  const followedAreaIds = userProfile?.followedAreaIds ?? [];
  if (followedAreaIds.length > 0) {
    const { station, isLive } = resolveStationReading(followedAreaIds[0], stations);
    if (isLive && station.province) return station.province;
  }

  return null;
}
