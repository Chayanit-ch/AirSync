import type { AreaAirQualitySummary } from "../../types";
import { AQI_SEVERITY_META } from "../../utils/aqi";

export function FollowedAreasGrid({
  areas,
}: {
  areas: AreaAirQualitySummary[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {areas.map((area) => {
        const meta = AQI_SEVERITY_META[area.severity];
        return (
          <div
            key={area.id}
            className={`rounded-xl border-l-4 bg-white p-3 shadow-sm ${meta.borderClass}`}
          >
            <p className="truncate text-xs text-gray-400">{area.areaName}</p>
            <p className={`mt-1 text-lg font-bold ${meta.textClass}`}>
              AQI {area.avgAqi}
            </p>
            <p className="text-xs text-gray-500">
              PM2.5 {area.avgPm25.toFixed(1)} µg/m³
            </p>
          </div>
        );
      })}
    </div>
  );
}
