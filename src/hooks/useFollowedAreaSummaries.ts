import { useEffect, useMemo, useState } from "react";
import type { AirQualityRecord, AreaAirQualitySummary, MonitoringStation } from "../types";
import { getAreaAirQualityHistory } from "../services/airQuality";
import { getAqiSeverity } from "../utils/aqi";

function toLatestSummaries(
  stationIds: string[],
  records: AirQualityRecord[],
  nameById: Map<string, string>,
): AreaAirQualitySummary[] {
  const latestByStation = new Map<string, AirQualityRecord>();
  for (const record of records) {
    const existing = latestByStation.get(record.areaId);
    if (!existing || record.timestamp > existing.timestamp) {
      latestByStation.set(record.areaId, record);
    }
  }

  return stationIds.flatMap((id) => {
    const latest = latestByStation.get(id);
    if (!latest) return [];
    return [
      {
        id,
        areaName: nameById.get(id) ?? id,
        avgAqi: latest.aqi,
        avgPm25: latest.pm25,
        severity: getAqiSeverity(latest.aqi),
      },
    ];
  });
}

/**
 * Derives the "followed stations" summary cards for a set of followed
 * `stationID`s, always via `getAreaAirQualityHistory` (the same query
 * Profile's PM2.5 chart uses) so Home and Profile can never disagree on the
 * numbers. `stations` should come from a shared `useAllStations()` call at
 * the page level (nationwide, real names) — passed in rather than imported
 * from the old fixed 5-area mock list, since station names are no longer
 * statically known. Name resolution is kept separate from the Firestore
 * fetch (via `useMemo`, not the fetch effect) so a station list that
 * resolves *after* the history query still updates the displayed names
 * instead of being stuck on stale/empty names from the first render.
 */
export function useFollowedAreaSummaries(
  followedAreaIds: string[],
  stations: MonitoringStation[],
): {
  areas: AreaAirQualitySummary[];
  isLoading: boolean;
} {
  const [records, setRecords] = useState<AirQualityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(followedAreaIds.length > 0);
  // Firestore snapshots (and the guest default list) can produce a new array
  // reference on every render even when the ids are unchanged — key the
  // effect off the stringified ids so it only refetches when they really change.
  const followedAreaIdsKey = followedAreaIds.join(",");

  useEffect(() => {
    if (followedAreaIds.length === 0) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getAreaAirQualityHistory(followedAreaIds).then((result) => {
      if (cancelled) return;
      setRecords(result);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followedAreaIdsKey]);

  const nameById = useMemo(
    () => new Map(stations.map((station) => [station.id, station.name])),
    [stations],
  );

  const areas = useMemo(
    () => toLatestSummaries(followedAreaIds, records, nameById),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [followedAreaIdsKey, records, nameById],
  );

  return { areas, isLoading };
}
