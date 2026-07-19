import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import type { AirQualityRecord, HistoricalPeriod } from "../../types";
import { getAreaAirQualityHistory } from "../../services/airQuality";
import { useTranslation } from "../../hooks/useTranslation";
import { bucketAirQualityRecords } from "../../utils/airQualityHistory";

const PERIODS: { id: HistoricalPeriod; key: "periodDaily" | "periodWeekly" | "periodMonthly" }[] = [
  { id: "daily", key: "periodDaily" },
  { id: "weekly", key: "periodWeekly" },
  { id: "monthly", key: "periodMonthly" },
];

export function PM25StatsCard({ followedAreaIds }: { followedAreaIds: string[] }) {
  const { t, dict } = useTranslation();
  const [period, setPeriod] = useState<HistoricalPeriod>("daily");
  const [records, setRecords] = useState<AirQualityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Firestore snapshots produce a new array reference even when the actual
  // ids are unchanged (e.g. a notificationSettings-only update) — key the
  // effect off the stringified ids so it only refetches when they really change.
  const followedAreaIdsKey = followedAreaIds.join(",");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    getAreaAirQualityHistory(followedAreaIds).then((result) => {
      if (!cancelled) {
        setRecords(result);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [followedAreaIdsKey]);

  const data = useMemo(
    () =>
      bucketAirQualityRecords(records, period, {
        weekdays: dict.common.weekdays,
        months: dict.common.months,
        weekLabel: (n) => t("profile.weekLabel", { n }),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records, period, dict],
  );

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            {t("profile.pm25History")}
          </h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {t("profile.pm25HistorySubtitle")}
          </p>
        </div>
        <div className="flex shrink-0 items-center rounded-full border border-gray-200 bg-gray-50 p-0.5 text-xs font-semibold">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`rounded-full px-2.5 py-1 transition-colors ${
                period === p.id
                  ? "bg-brand-100 text-brand-700"
                  : "text-gray-400"
              }`}
            >
              {t(`profile.${p.key}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-40 w-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            {t("common.loading")}
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            {t("home.noFollowedAreas")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip formatter={(value) => [`${value} µg/m³`, "PM2.5"]} />
              <Bar dataKey="pm25" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={entry.label}
                    fill={
                      entry.highlighted
                        ? "#f87171"
                        : index % 2 === 0
                          ? "#bfdbfe"
                          : "#3b82f6"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
