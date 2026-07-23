import { LocateFixed, MapPinOff } from "lucide-react";
import type { AreaAirQualitySummary, RiskGroup } from "../../types";
import type { UserLocationStatus } from "../../hooks/useUserLocation";
import { useTranslation } from "../../hooks/useTranslation";
import { getPersonalizedRecommendation, resolveRiskGroup } from "../../utils/recommendation";

const HERO_GRADIENT: Record<AreaAirQualitySummary["severity"], string> = {
  good: "from-emerald-500 to-emerald-600",
  moderate: "from-amber-500 to-amber-600",
  sensitive: "from-orange-500 to-orange-600",
  unhealthy: "from-red-600 to-red-700",
  veryUnhealthy: "from-purple-600 to-purple-700",
  hazardous: "from-red-900 to-red-950",
};

interface AqiHeroCardProps {
  area: AreaAirQualitySummary;
  /** Distance from the user to `area`, in km — null when not geolocation-based. */
  distanceKm?: number | null;
  /** True when the nearest real station is further than a reasonable "nearby" range. */
  outOfRange?: boolean;
  locationStatus?: UserLocationStatus;
  onRetryLocation?: () => void;
  /** The signed-in user's `UserProfile.riskGroup` — undefined for guests or profiles saved before this field existed, treated as `"general"` (see `resolveRiskGroup`). */
  riskGroup?: RiskGroup;
  /** When both are present, these AI-generated sections replace the single rule-based line below — absent/null falls straight back to it (see `useAiAdvice`). */
  aiShortTerm?: string | null;
  aiLongTerm?: string | null;
  onRefreshAdvice?: () => void;
  isRefreshingAdvice?: boolean;
}

export function AqiHeroCard({
  area,
  distanceKm = null,
  outOfRange = false,
  locationStatus,
  onRetryLocation,
  riskGroup,
  aiShortTerm,
  aiLongTerm,
  onRefreshAdvice,
  isRefreshingAdvice = false,
}: AqiHeroCardProps) {
  const { t, dict } = useTranslation();
  const severityLabel = dict.common.severity[area.severity];
  const resolvedRiskGroup = resolveRiskGroup(riskGroup);
  const recommendation = getPersonalizedRecommendation(dict, area.severity, resolvedRiskGroup);
  const showRiskGroupCta = resolvedRiskGroup === "general";
  const isAiGenerated = Boolean(aiShortTerm && aiLongTerm);
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
      <div className="flex flex-col divide-y divide-gray-100 bg-white">
        <div className="px-4 py-3">
          <p className="text-xs text-gray-400">PM 2.5</p>
          <p className="mt-0.5 text-sm font-bold text-gray-800">
            {area.avgPm25.toFixed(1)} µg/m³
          </p>
        </div>
        {/* Full-width, wrapping block — personalized recommendations run
            longer than the old one-liner, so this can no longer share a
            cramped half-width column with the PM2.5 stat. */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">{t("home.recommendation")}</p>
            {isAiGenerated && (
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-600">
                {t("home.aiGeneratedLabel")}
              </span>
            )}
          </div>

          {isAiGenerated ? (
            <>
              <div className="mt-1.5">
                <p className="text-xs font-semibold text-gray-500">{t("home.shortTermAdvice")}</p>
                <p className="mt-0.5 text-sm leading-relaxed font-medium text-wrap text-gray-700">
                  {aiShortTerm}
                </p>
              </div>
              <div className="mt-2.5">
                <p className="text-xs font-semibold text-gray-500">{t("home.longTermAdvice")}</p>
                <p className="mt-0.5 text-sm leading-relaxed font-medium text-wrap text-gray-700">
                  {aiLongTerm}
                </p>
              </div>
              {onRefreshAdvice && (
                <button
                  type="button"
                  onClick={onRefreshAdvice}
                  disabled={isRefreshingAdvice}
                  className="text-brand-600 mt-2.5 text-xs font-semibold disabled:opacity-40"
                >
                  {isRefreshingAdvice ? t("home.refreshingAdvice") : t("home.getNewAdvice")}
                </button>
              )}
            </>
          ) : (
            <p className="mt-0.5 text-sm leading-relaxed font-medium text-wrap text-gray-700">
              {recommendation}
            </p>
          )}

          {showRiskGroupCta && (
            <p className="text-brand-600 mt-2 text-xs font-medium text-wrap">
              {t("home.riskGroupCta")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
