import { useEffect, useState } from "react";
import type { AreaAirQualitySummary } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { getLiveAirQuality, type LiveAirQualityResult } from "../services/airQuality";
import { getAqiSeverity } from "../utils/aqi";
import { areaNameById } from "./useFollowedAreaSummaries";

/**
 * Guest/default hero area — "area-mueang" is one of only two app areas with
 * a real nearby Air4Thai station (see `api/air4thai.ts`), and matches the
 * app's "สมุทรสาคร" residential label, so the hero card shows live data for
 * signed-out visitors instead of immediately falling back to mock.
 */
const HERO_GUEST_AREA_ID = "area-mueang";

interface LiveHeroAreaResult {
  area: AreaAirQualitySummary | null;
  isLoading: boolean;
  /** false when the hero is showing mock data — either the whole Air4Thai fetch failed, or this area has no station. */
  isLive: boolean;
}

/**
 * Drives the Home hero card from `/api/air4thai` (always "current live
 * values", per the deployment task) instead of the static mock
 * `featuredArea`. Targets the signed-in user's first followed area, or the
 * guest default otherwise; falls back to whatever area actually has data if
 * that specific one doesn't (which `getLiveAirQuality` already logs loudly).
 */
export function useLiveHeroArea(): LiveHeroAreaResult {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const [result, setResult] = useState<LiveAirQualityResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLiveAirQuality().then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (authLoading || !result) {
    return { area: null, isLoading: true, isLive: false };
  }

  const targetAreaId = currentUser
    ? (userProfile?.followedAreaIds?.[0] ?? HERO_GUEST_AREA_ID)
    : HERO_GUEST_AREA_ID;

  const record =
    result.records.find((r) => r.areaId === targetAreaId) ??
    result.records.find((r) => r.areaId === HERO_GUEST_AREA_ID) ??
    result.records[0];

  if (!record) {
    return { area: null, isLoading: false, isLive: false };
  }

  return {
    area: {
      id: record.areaId,
      areaName: areaNameById.get(record.areaId) ?? record.areaId,
      avgAqi: record.aqi,
      avgPm25: record.pm25,
      severity: getAqiSeverity(record.aqi),
    },
    isLoading: false,
    isLive: record.isLive,
  };
}
