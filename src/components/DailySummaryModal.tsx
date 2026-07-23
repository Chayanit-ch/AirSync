import { X } from "lucide-react";
import { useDailySummary } from "../hooks/useDailySummary";
import { useTranslation } from "../hooks/useTranslation";

/**
 * Mounted once, globally, in `PageLayout.tsx` alongside
 * `AirQualityAlertBanner` — a centered one-time daily digest, not a live
 * alert, so it's a modal rather than a banner. All gating/localStorage logic
 * lives in `useDailySummary`; this component is purely presentational.
 */
export function DailySummaryModal() {
  const { summary, dismiss } = useDailySummary();
  const { t } = useTranslation();

  if (!summary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="animate-dropdown-in w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">{t("dailySummary.title")}</h2>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("alertBanner.dismiss")}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {summary.areas.map((area) => (
            <div
              key={area.areaId}
              className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm"
            >
              <span className="text-gray-700">{area.areaName}</span>
              <span className="font-bold text-gray-800">AQI {area.aqi}</span>
            </div>
          ))}
        </div>

        {summary.trend !== "unknown" && (
          <p className="mt-3 text-sm text-gray-600">{t(`dailySummary.trend.${summary.trend}`)}</p>
        )}

        <button
          type="button"
          onClick={dismiss}
          className="bg-brand-600 hover:bg-brand-700 mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-white"
        >
          {t("dailySummary.close")}
        </button>
      </div>
    </div>
  );
}
