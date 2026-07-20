import type { AreaAirQualitySummary, MonitoringStation } from "../types";
import { resolveStationReading } from "../services/airQuality";
import { useTranslation } from "./useTranslation";

/**
 * Derives the "followed stations" summary cards for a set of followed
 * `stationID`s directly from the same live `stations` array the Map reads
 * (via `useAllStations()`, passed in by the caller) — never from Firestore
 * history. Followed-area cards on Home/Profile used to read their "current"
 * number from `getAreaAirQualityHistory()` (a Firestore query, or synthetic
 * mock history when Firestore had nothing yet) while the Map read
 * `station.currentAqi`/`currentPm25` straight off the live fetch — two
 * different pipelines for what should be the same number, which is exactly
 * why the two screens could disagree for the same station. `resolveStationReading`
 * (already used by the hero hook) is reused here so a followed station that's
 * temporarily missing from the live batch gets the same honestly-flagged
 * synthetic fallback the hero card would show for it, instead of a third,
 * separate fallback behavior.
 *
 * Not memoized (this used to be a `useMemo`, dropped 2026-07-21): the id/name
 * mixup regression traced back to this trusting `station.name` even when
 * `resolveStationReading` reported `isLive: false` — for an offline followed
 * station, that fallback object's `name` is literally the raw station ID
 * (there's no real name to synthesize a real one from), and nothing here
 * checked `isLive` before rendering it as if it were a place name. Now the
 * offline case renders a translated "station unavailable" label instead.
 * `resolveStationReading` already self-dedupes its console.warn per station
 * per session, so memoizing here for warning-suppression is no longer
 * needed — recomputing this small array every render is cheap.
 */
export function useFollowedAreaSummaries(
  followedAreaIds: string[],
  stations: MonitoringStation[],
): {
  areas: AreaAirQualitySummary[];
} {
  const { t } = useTranslation();

  const areas = followedAreaIds.map((id): AreaAirQualitySummary => {
    const { station, isLive } = resolveStationReading(id, stations);
    return {
      id,
      areaName: isLive ? station.name : t("common.stationUnavailable", { id }),
      avgAqi: station.currentAqi,
      avgPm25: station.currentPm25,
      severity: station.severity,
    };
  });

  return { areas };
}
