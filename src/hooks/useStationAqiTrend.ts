import { useEffect, useMemo, useState } from "react";
import type { AirQualityRecord, HistoricalAQIData } from "../types";
import { getAreaAirQualityHistory } from "../services/airQuality";
import { bucketAirQualityRecords } from "../utils/airQualityHistory";
import { useTranslation } from "./useTranslation";

export interface UseStationAqiTrendResult {
  data: HistoricalAQIData[];
  isLoading: boolean;
}

/**
 * Bucketed 24-hour AQI trend for a single station, from the same
 * `airQualityRecords` source (via `getAreaAirQualityHistory`) every other
 * historical view in this app already reads — never a separate hardcoded
 * array. Callers must pass the SAME station id the Hero Card is currently
 * showing, so the trend's rightmost point always tracks the same reading —
 * this exact class of bug (two components silently using different data
 * sources for what should be the same station) has recurred before.
 */
export function useStationAqiTrend(stationId: string | null): UseStationAqiTrendResult {
  const { dict, t } = useTranslation();
  const [records, setRecords] = useState<AirQualityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!stationId) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getAreaAirQualityHistory([stationId]).then((result) => {
      if (!cancelled) {
        setRecords(result);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [stationId]);

  const data = useMemo(
    () =>
      bucketAirQualityRecords(records, "hourly", {
        weekdays: dict.common.weekdays,
        months: dict.common.months,
        weekLabel: (n) => t("profile.weekLabel", { n }),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records, dict],
  );

  return { data, isLoading };
}
