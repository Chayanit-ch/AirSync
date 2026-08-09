import type { AreaAirQualitySummary } from "../../types";
import { useTemperatureFallback } from "../../hooks/useTemperatureFallback";
import { useTranslation } from "../../hooks/useTranslation";
import { AQI_SEVERITY_META } from "../../utils/aqi";
import { AqiFaceIcon } from "../shared/AqiFaceIcon";

/** One component instance per followed area so each can independently run
 * the OpenWeather fallback (`useTemperatureFallback`) — a `.map` over a
 * variable-length `areas` array can't call that hook itself without
 * breaking the Rules of Hooks, but a stable per-`key` child component can. */
function FollowedAreaCard({ area }: { area: AreaAirQualitySummary }) {
  const { t } = useTranslation();
  const meta = AQI_SEVERITY_META[area.severity];
  const temperature = useTemperatureFallback(area.id, area.location ?? null, area.temperature);

  return (
    <div
      className={`flex items-start justify-between gap-2 rounded-xl border-l-4 bg-white p-3 shadow-sm ${meta.borderClass}`}
    >
      <div className="min-w-0">
        <p className="truncate text-xs text-gray-400">{area.areaName}</p>
        <p className={`mt-1 text-lg font-bold ${meta.textClass}`}>AQI {area.avgAqi}</p>
        <p className="text-xs text-gray-500">
          PM2.5 {area.avgPm25.toFixed(1)} µg/m³ ·{" "}
          {temperature != null ? `${temperature} ${t("common.degrees")}` : t("common.noData")}
        </p>
      </div>
      {/* Small full-opacity badge — same "light tint bg + saturated icon"
          treatment as the map's `StationBottomSheet`, not a watermark. */}
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.softBgClass}`}>
        <AqiFaceIcon severity={area.severity} size={18} className={meta.textClass} />
      </span>
    </div>
  );
}

export function FollowedAreasGrid({
  areas,
}: {
  areas: AreaAirQualitySummary[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {areas.map((area) => (
        <FollowedAreaCard key={area.id} area={area} />
      ))}
    </div>
  );
}
