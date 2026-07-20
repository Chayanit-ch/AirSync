import { ChevronDown, ChevronUp, Clock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { MonitoringStation } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";
import { AQI_SEVERITY_META } from "../../utils/aqi";
import { resolveSource } from "../../utils/dataSource";
import type { MapLayerMode } from "./LayerToggle";

export function StationBottomSheet({
  station,
  mode,
}: {
  station: MonitoringStation;
  /** Which metric the Map's layer toggle currently has active — the primary
   * (severity-colored) box below shows AQI in `"aqi"` mode, PM2.5 otherwise
   * (including `"heatmap"`, which doesn't have its own distinct metric). */
  mode: MapLayerMode;
}) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const meta = AQI_SEVERITY_META[station.severity];
  const showAqiPrimary = mode === "aqi";
  const source = resolveSource(station.source);

  const hoursAgo = Math.max(
    1,
    Math.round((Date.now() - new Date(station.lastUpdated).getTime()) / (1000 * 60 * 60)),
  );

  return (
    <div className="h-full overflow-y-auto rounded-t-2xl border border-gray-100 bg-white px-4 pt-2 pb-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:rounded-none lg:rounded-l-2xl lg:border-r-0 lg:shadow-[-4px_0_20px_rgba(0,0,0,0.08)]">
      {/* Drag handle — a bottom-sheet affordance, hidden on the desktop docked panel where it doesn't mean anything. */}
      <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-gray-200 lg:hidden" />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-bold text-gray-800">
            {station.name}
          </h3>
          <p className="truncate text-xs text-gray-400">{station.address}</p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-gray-400">
            {t(`map.sourceDetail.${source}`)}
          </p>
        </div>
        <span
          className={`flex shrink-0 items-center justify-center rounded-full p-1.5 ${meta.softBgClass}`}
        >
          <ShieldCheck size={16} className={meta.textClass} />
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {showAqiPrimary ? (
          <div className={`rounded-xl border-l-4 p-3 ${meta.softBgClass} ${meta.borderClass}`}>
            <p className="text-xs text-gray-500">AQI</p>
            <p className={`text-lg font-bold ${meta.textClass}`}>{station.currentAqi}</p>
          </div>
        ) : (
          <div className={`rounded-xl border-l-4 p-3 ${meta.softBgClass} ${meta.borderClass}`}>
            <p className="text-xs text-gray-500">PM 2.5</p>
            <p className={`text-lg font-bold ${meta.textClass}`}>
              {station.currentPm25.toFixed(1)} µg/m³
            </p>
          </div>
        )}
        {showAqiPrimary ? (
          <div className="rounded-xl bg-gray-100 p-3">
            <p className="text-xs text-gray-500">PM 2.5</p>
            <p className="text-lg font-bold text-gray-700">
              {station.currentPm25.toFixed(1)} µg/m³
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-gray-100 p-3">
            <p className="text-xs text-gray-500">{t("common.temperature")}</p>
            <p className="text-lg font-bold text-gray-700">
              {station.temperature != null
                ? `${station.temperature} ${t("common.degrees")}`
                : t("common.noData")}
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-sm text-brand-600">
        <Clock size={15} />
        <span>{t("map.lastUpdated", { time: t("map.hoursAgo", { hours: hoursAgo }) })}</span>
      </div>

      {isExpanded && (
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-gray-50 p-3 text-sm">
          <div>
            <p className="text-xs text-gray-400">{t("map.province")}</p>
            <p className="font-medium text-gray-700">{station.province || t("common.noData")}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">{t("map.district")}</p>
            <p className="font-medium text-gray-700">{station.district || t("common.noData")}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-400">{t("map.address")}</p>
            <p className="font-medium text-gray-700">{station.address || t("common.noData")}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-400">{t("map.coordinates")}</p>
            <p className="font-medium text-gray-700">
              {station.location.lat.toFixed(4)}, {station.location.lng.toFixed(4)}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-400">{t("map.stationId")}</p>
            <p className="font-medium text-gray-700">{station.id}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-400">{t("map.dataSource")}</p>
            <p className="font-medium text-gray-700">{t(`map.source.${source}`)}</p>
          </div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="border-brand-600 text-brand-600 flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-semibold"
        >
          {t("map.moreDetails")}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <button
          type="button"
          disabled
          title={t("map.forecastComingSoon")}
          className="bg-brand-600 rounded-xl py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("map.viewForecast")}
        </button>
      </div>
    </div>
  );
}
