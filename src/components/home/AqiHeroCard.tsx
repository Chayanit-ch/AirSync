import { LocateFixed, MapPinOff } from "lucide-react";
import type { AreaAirQualitySummary } from "../../types";
import type { UserLocationStatus } from "../../hooks/useUserLocation";
import { useTranslation } from "../../hooks/useTranslation";
import { AQI_SEVERITY_META } from "../../utils/aqi";

const HERO_GRADIENT: Record<AreaAirQualitySummary["severity"], string> = {
  good: "from-emerald-500 to-emerald-600",
  moderate: "from-amber-500 to-amber-600",
  sensitive: "from-orange-500 to-orange-600",
  unhealthy: "from-red-600 to-red-700",
};

interface AqiHeroCardProps {
  area: AreaAirQualitySummary;
  /** Distance from the user to `area`, in km — null when not geolocation-based. */
  distanceKm?: number | null;
  /** True when the nearest real station is further than a reasonable "nearby" range. */
  outOfRange?: boolean;
  locationStatus?: UserLocationStatus;
  onRetryLocation?: () => void;
}

export function AqiHeroCard({
  area,
  distanceKm = null,
  outOfRange = false,
  locationStatus,
  onRetryLocation,
}: AqiHeroCardProps) {
  const { t, language } = useTranslation();
  const meta = AQI_SEVERITY_META[area.severity];
  const severityLabel = language === "en" ? meta.labelEn : meta.labelTh;
  const recommendation = language === "en" ? meta.recommendationEn : meta.recommendationTh;
  const showLocationRetry =
    (locationStatus === "denied" || locationStatus === "unsupported") && onRetryLocation;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
      <div
        className={`bg-linear-to-br px-5 pt-4 pb-6 text-white ${HERO_GRADIENT[area.severity]}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white/90">
            {t("home.airQualityIndex")}
          </span>
          <span className="rounded-full bg-white/25 px-3 py-1 text-xs font-semibold">
            {area.areaName}
          </span>
        </div>
        <p className="mt-1 text-6xl font-extrabold tracking-tight">
          {area.avgAqi}
        </p>
        <p className="mt-1 text-lg font-semibold">{severityLabel}</p>

        {outOfRange && (
          <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-black/15 px-3 py-2 text-xs text-white/95">
            <MapPinOff size={14} className="mt-0.5 shrink-0" />
            <span>
              {t("home.noNearbyStation")}
              {distanceKm != null &&
                ` (${t("home.approxDistance", { km: distanceKm.toFixed(0) })})`}
            </span>
          </div>
        )}

        {showLocationRetry && (
          <button
            type="button"
            onClick={onRetryLocation}
            className="mt-3 flex items-center gap-1.5 rounded-lg bg-black/15 px-3 py-2 text-xs font-medium text-white/95 transition-colors hover:bg-black/25"
          >
            <LocateFixed size={14} />
            {t("home.useMyLocation")}
          </button>
        )}
      </div>
      <div className="flex divide-x divide-gray-100 bg-white">
        <div className="flex-1 px-4 py-3">
          <p className="text-xs text-gray-400">PM 2.5</p>
          <p className="mt-0.5 text-sm font-bold text-gray-800">
            {area.avgPm25.toFixed(1)} µg/m³
          </p>
        </div>
        <div className="flex-1 px-4 py-3">
          <p className="text-xs text-gray-400">{t("home.recommendation")}</p>
          <p className="mt-0.5 text-sm font-medium text-gray-700">
            {recommendation}
          </p>
        </div>
      </div>
    </div>
  );
}
