import { useMemo } from "react";
import type { AreaAirQualitySummary, MonitoringStation } from "../types";
import { resolveStationReading } from "../services/airQuality";

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
 */
export function useFollowedAreaSummaries(
  followedAreaIds: string[],
  stations: MonitoringStation[],
): {
  areas: AreaAirQualitySummary[];
} {
  const followedAreaIdsKey = followedAreaIds.join(",");

  const areas = useMemo(
    () =>
      followedAreaIds.map((id): AreaAirQualitySummary => {
        const { station } = resolveStationReading(id, stations);
        return {
          id,
          areaName: station.name,
          avgAqi: station.currentAqi,
          avgPm25: station.currentPm25,
          severity: station.severity,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [followedAreaIdsKey, stations],
  );

  return { areas };
}
