import { useTranslation } from "../../hooks/useTranslation";
import { ALL_SOURCES, SOURCE_STYLE } from "../../utils/dataSource";

/**
 * Always-on legend explaining what a marker's border color/dash pattern
 * means (see `StationMarkers`) — transparency for real users, not a debug
 * aid, so it stays in the app permanently (unlike `SourceDebugCounter`).
 */
export function SourceLegend() {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl bg-white/95 px-3 py-2 shadow-md">
      <p className="mb-1 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
        {t("map.legendTitle")}
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {ALL_SOURCES.map((source) => {
          const style = SOURCE_STYLE[source];
          return (
            <div key={source} className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 shrink-0 rounded-full bg-gray-700"
                style={{
                  border: `2px ${style.dashArray ? "dashed" : "solid"} ${style.color}`,
                }}
              />
              <span className="text-[11px] font-medium text-gray-600">
                {t(`map.source.${source}`)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
