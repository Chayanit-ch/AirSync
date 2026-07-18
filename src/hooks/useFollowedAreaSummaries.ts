import { useEffect, useState } from "react";
import type { AirQualityRecord, AreaAirQualitySummary } from "../types";
import { getAreaAirQualityHistory } from "../services/airQuality";
import { allAreas } from "../data/mockData";
import { getAqiSeverity } from "../utils/aqi";

export const areaNameById = new Map(allAreas.map((area) => [area.id, area.areaName]));

function toLatestSummaries(
  areaIds: string[],
  records: AirQualityRecord[],
): AreaAirQualitySummary[] {
  const latestByArea = new Map<string, AirQualityRecord>();
  for (const record of records) {
    const existing = latestByArea.get(record.areaId);
    if (!existing || record.timestamp > existing.timestamp) {
      latestByArea.set(record.areaId, record);
    }
  }

  return areaIds.flatMap((id) => {
    const latest = latestByArea.get(id);
    if (!latest) return [];
    return [
      {
        id,
        areaName: areaNameById.get(id) ?? id,
        avgAqi: latest.aqi,
        avgPm25: latest.pm25,
        severity: getAqiSeverity(latest.aqi),
      },
    ];
  });
}

/**
 * Derives the "4 area cards" summary for a set of followed area ids, always
 * via `getAreaAirQualityHistory` (the same query Profile's PM2.5 chart uses)
 * so Home and Profile can never disagree on the numbers. Shared instead of
 * duplicated so both pages stay wired to exactly one query.
 */
export function useFollowedAreaSummaries(followedAreaIds: string[]): {
  areas: AreaAirQualitySummary[];
  isLoading: boolean;
} {
  const [areas, setAreas] = useState<AreaAirQualitySummary[]>([]);
  const [isLoading, setIsLoading] = useState(followedAreaIds.length > 0);
  // Firestore snapshots (and the guest default list) can produce a new array
  // reference on every render even when the ids are unchanged — key the
  // effect off the stringified ids so it only refetches when they really change.
  const followedAreaIdsKey = followedAreaIds.join(",");

  useEffect(() => {
    if (followedAreaIds.length === 0) {
      setAreas([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getAreaAirQualityHistory(followedAreaIds).then((records) => {
      if (cancelled) return;
      setAreas(toLatestSummaries(followedAreaIds, records));
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [followedAreaIdsKey]);

  return { areas, isLoading };
}
