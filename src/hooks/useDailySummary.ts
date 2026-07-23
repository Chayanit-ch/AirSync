import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getAreaAirQualityHistory } from "../services/airQuality";
import { getBangkokDateKey } from "../services/missions";
import { useAllStations } from "./useAllStations";
import { useFollowedAreaSummaries } from "./useFollowedAreaSummaries";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
/** AQI-point threshold below which two averages are just called "about the same" rather than a fabricated precise trend. */
const SAME_TREND_THRESHOLD = 5;

export interface DailySummaryArea {
  areaId: string;
  areaName: string;
  aqi: number;
}

export type DailySummaryTrend = "worse" | "better" | "same" | "unknown";

export interface DailySummaryData {
  areas: DailySummaryArea[];
  trend: DailySummaryTrend;
}

function storageKey(dateKey: string): string {
  return `daily-summary-shown-${dateKey}`;
}

/**
 * Once-per-Thailand-calendar-day summary of followed areas. Reuses
 * `useFollowedAreaSummaries` (same numbers Home/Profile already show) and
 * `getAreaAirQualityHistory` (same merged real+synthetic source the PM2.5
 * history charts use, including its own `console.warn` when a followed area
 * has no real Firestore history yet — not duplicated here).
 */
export function useDailySummary() {
  const { currentUser, userProfile } = useAuth();
  const { stations, isLoading: stationsLoading } = useAllStations();
  const followedAreaIds = userProfile?.followedAreaIds ?? [];
  const { areas } = useFollowedAreaSummaries(followedAreaIds, stations);
  const dailySummaryEnabled = userProfile?.notificationSettings?.dailySummaryEnabled ?? false;

  const [summary, setSummary] = useState<DailySummaryData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!currentUser || !dailySummaryEnabled || stationsLoading || followedAreaIds.length === 0) {
      return;
    }
    const dateKey = getBangkokDateKey();
    const key = storageKey(dateKey);
    if (window.localStorage.getItem(key)) return; // already shown today

    let cancelled = false;

    async function buildSummary() {
      let trend: DailySummaryTrend = "unknown";
      try {
        const records = await getAreaAirQualityHistory(followedAreaIds);
        const now = Date.now();
        const recentAqis = records
          .filter((r) => now - new Date(r.timestamp).getTime() < ONE_DAY_MS)
          .map((r) => r.aqi);
        const olderAqis = records
          .filter((r) => {
            const age = now - new Date(r.timestamp).getTime();
            return age >= ONE_DAY_MS && age < 2 * ONE_DAY_MS;
          })
          .map((r) => r.aqi);

        if (recentAqis.length > 0 && olderAqis.length > 0) {
          const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
          const diff = avg(recentAqis) - avg(olderAqis);
          trend =
            diff > SAME_TREND_THRESHOLD
              ? "worse"
              : diff < -SAME_TREND_THRESHOLD
                ? "better"
                : "same";
        }
      } catch (error) {
        console.warn(
          "Failed to compute daily summary trend — showing today's readings without a trend line:",
          error,
        );
      }

      if (cancelled) return;
      // Marked immediately, not on dismiss, so a mid-session refresh can't re-trigger it.
      window.localStorage.setItem(key, "true");
      setSummary({
        areas: areas.map((a) => ({ areaId: a.id, areaName: a.areaName, aqi: a.avgAqi })),
        trend,
      });
    }

    buildSummary();
    return () => {
      cancelled = true;
    };
    // Deliberately excludes `areas` — it's recomputed every render from
    // `stations`/`followedAreaIds`, and `useAllStations` only fetches once
    // (no polling), so by the time `stationsLoading` clears it already
    // reflects the loaded data; re-running this whole effect on every
    // `areas` object identity change would defeat the once-per-day gate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, dailySummaryEnabled, stationsLoading, followedAreaIds.join(",")]);

  return {
    summary: dismissed ? null : summary,
    dismiss: () => setDismissed(true),
  };
}
