import { Bell, CircleAlert, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAirQualityAlerts } from "../hooks/useAirQualityAlerts";
import { useTranslation } from "../hooks/useTranslation";
import { AQI_SEVERITY_META } from "../utils/aqi";
import { getPersonalizedRecommendation, resolveRiskGroup } from "../utils/recommendation";

/**
 * Mounted once, globally, in `PageLayout.tsx` — never inside an individual
 * page — so a severity-worsening alert for a followed area is visible no
 * matter which route the user is currently on. All detection/cooldown/
 * localStorage logic lives in `useAirQualityAlerts`; this component is
 * purely presentational. Also renders the Tier 2 (optional) browser-
 * notification permission prompt, since it lives in the same "notification
 * chrome" slot and the two states are mutually exclusive.
 */
export function AirQualityAlertBanner() {
  const {
    currentAlert,
    dismiss,
    showPermissionPrompt,
    requestNotificationPermission,
    dismissPermissionPrompt,
  } = useAirQualityAlerts();
  const { userProfile } = useAuth();
  const { t, dict } = useTranslation();
  const navigate = useNavigate();

  if (showPermissionPrompt) {
    return (
      <div className="animate-slide-down-in flex items-start gap-3 border-b border-gray-100 bg-white px-4 py-3 shadow-md">
        <span className="bg-brand-50 text-brand-600 flex shrink-0 items-center justify-center rounded-full p-1.5">
          <Bell size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-700">{t("alertBanner.permissionExplanation")}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={requestNotificationPermission}
              className="bg-brand-600 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
            >
              {t("alertBanner.permissionAllow")}
            </button>
            <button
              type="button"
              onClick={dismissPermissionPrompt}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600"
            >
              {t("alertBanner.permissionNotNow")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentAlert) return null;

  const meta = AQI_SEVERITY_META[currentAlert.severity];
  const severityLabel = dict.common.severity[currentAlert.severity];
  const riskGroup = resolveRiskGroup(userProfile?.riskGroup);
  const recommendation = getPersonalizedRecommendation(dict, currentAlert.severity, riskGroup);

  function handleViewDetails() {
    dismiss();
    navigate(`/map?station=${encodeURIComponent(currentAlert.areaId)}`);
  }

  return (
    <div className="animate-slide-down-in relative border-b border-gray-100 bg-white px-4 py-3 shadow-md">
      <div className="flex items-start gap-3">
        <span
          className={`flex shrink-0 items-center justify-center rounded-full p-1.5 ${meta.softBgClass}`}
        >
          <CircleAlert size={16} className={meta.textClass} />
        </span>
        <div className="min-w-0 flex-1 pr-5">
          <p className="text-xs font-semibold text-gray-400">{t("alertBanner.title")}</p>
          <p className="mt-0.5 text-sm font-bold text-gray-800">
            {currentAlert.areaName} · <span className={meta.textClass}>{severityLabel}</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">{recommendation}</p>
          <button
            type="button"
            onClick={handleViewDetails}
            className={`mt-2 rounded-full px-3 py-1.5 text-xs font-semibold text-white ${meta.bgClass}`}
          >
            {t("alertBanner.viewDetails")}
          </button>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("alertBanner.dismiss")}
          className="absolute top-3 right-3 shrink-0 text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
