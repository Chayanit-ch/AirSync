import { ChevronDown, ChevronUp, Clock, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { MonitoringStation } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";
import { AQI_SEVERITY_META } from "../../utils/aqi";
import { resolveSource } from "../../utils/dataSource";
import type { MapLayerMode } from "./LayerToggle";

/** Downward drag distance (px) past which releasing the handle collapses the sheet to `"peek"`. */
const DRAG_COLLAPSE_THRESHOLD_PX = 60;

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
  // Mobile-only (see the `lg:` split below — desktop's docked panel always
  // shows the full sheet regardless of this). "peek" is a compact summary
  // bar so a collapsed sheet still names the selected station instead of
  // vanishing entirely — see Section 3's "always know which station is
  // selected" requirement.
  const [sheetState, setSheetState] = useState<"expanded" | "peek">("expanded");
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartYRef = useRef<number | null>(null);
  const meta = AQI_SEVERITY_META[station.severity];
  const showAqiPrimary = mode === "aqi";
  const source = resolveSource(station.source);

  // A freshly-selected marker should always open fully expanded, even if
  // the previous station's sheet was left collapsed.
  useEffect(() => {
    setSheetState("expanded");
    setDragOffset(0);
  }, [station.id]);

  const hoursAgo = Math.max(
    1,
    Math.round((Date.now() - new Date(station.lastUpdated).getTime()) / (1000 * 60 * 60)),
  );

  function toggleSheetState() {
    setSheetState((prev) => (prev === "expanded" ? "peek" : "expanded"));
  }

  function handleHandlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (sheetState !== "expanded") return;
    dragStartYRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleHandlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragStartYRef.current === null) return;
    setDragOffset(Math.max(0, e.clientY - dragStartYRef.current));
  }

  function handleHandlePointerUp() {
    if (dragStartYRef.current === null) return;
    dragStartYRef.current = null;
    if (dragOffset > DRAG_COLLAPSE_THRESHOLD_PX) {
      setSheetState("peek");
    }
    setDragOffset(0);
  }

  const primaryMetricLabel = showAqiPrimary ? "AQI" : "PM 2.5";
  const primaryMetricValue = showAqiPrimary
    ? String(station.currentAqi)
    : `${station.currentPm25.toFixed(1)} µg/m³`;

  return (
    <>
      {/* Peek state — mobile only (`lg:hidden`); desktop's docked panel
          ignores `sheetState` entirely via the full sheet's `lg:block`
          below. Tapping restores the full sheet. */}
      <button
        type="button"
        onClick={toggleSheetState}
        aria-label={t("map.expandStationDetails")}
        className={`${sheetState === "peek" ? "flex" : "hidden"} w-full items-center justify-between gap-3 rounded-t-2xl border border-gray-100 bg-white px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`flex shrink-0 items-center justify-center rounded-full p-1.5 ${meta.softBgClass}`}>
            <ShieldCheck size={15} className={meta.textClass} />
          </span>
          <span className="truncate text-sm font-bold text-gray-800">{station.name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`text-sm font-bold ${meta.textClass}`}>{primaryMetricValue}</span>
          <ChevronUp size={16} className="text-gray-400" />
        </div>
      </button>

      {/* Full sheet — bottom sheet on mobile (hidden while peeking, via
          `sheetState`), always shown on desktop's docked right-side panel
          (`lg:block` wins over the mobile `hidden` at the `lg:` breakpoint). */}
      <div
        className={`${sheetState === "peek" ? "hidden" : "block"} h-full overflow-y-auto rounded-t-2xl border border-gray-100 bg-white px-4 pt-2 pb-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:block lg:rounded-none lg:rounded-l-2xl lg:border-r-0 lg:shadow-[-4px_0_20px_rgba(0,0,0,0.08)]`}
        style={
          dragOffset > 0
            ? { transform: `translateY(${dragOffset}px)` }
            : { transform: "translateY(0)", transition: "transform 200ms ease-out" }
        }
      >
        {/* Drag handle — draggable and tappable on mobile to collapse the
            sheet to the peek bar above; purely decorative (no interaction
            target) on the desktop docked panel. */}
        <div
          onClick={toggleSheetState}
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerUp}
          onPointerCancel={handleHandlePointerUp}
          role="button"
          tabIndex={0}
          aria-label={t("map.collapseStationDetails")}
          className="mx-auto mb-2 h-1.5 w-10 touch-none rounded-full bg-gray-200 lg:hidden"
        />

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
              <p className="text-xs text-gray-500">{primaryMetricLabel}</p>
              <p className={`text-lg font-bold ${meta.textClass}`}>{station.currentAqi}</p>
            </div>
          ) : (
            <div className={`rounded-xl border-l-4 p-3 ${meta.softBgClass} ${meta.borderClass}`}>
              <p className="text-xs text-gray-500">{primaryMetricLabel}</p>
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
    </>
  );
}
