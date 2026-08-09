import { Check, X } from "lucide-react";
import type { AQISeverityLevel, RiskGroup } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";
import { DAILY_ACTIVITIES, isActivityRecommended } from "../../utils/dailyActivities";

interface DailyActivityChecklistProps {
  severity: AQISeverityLevel;
  /** Already resolved via `resolveRiskGroup()` — see the caller. */
  riskGroup: RiskGroup;
}

export function DailyActivityChecklist({ severity, riskGroup }: DailyActivityChecklistProps) {
  const { t } = useTranslation();

  return (
    <div>
      <p className="text-xs text-gray-400">{t("home.dailyActivitiesTitle")}</p>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {DAILY_ACTIVITIES.map((activity) => {
          const recommended = isActivityRecommended(activity, severity, riskGroup);
          return (
            <li key={activity.id} className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  recommended ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                }`}
              >
                {recommended ? (
                  <Check size={13} strokeWidth={3} />
                ) : (
                  <X size={13} strokeWidth={3} />
                )}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {t(`home.dailyActivities.${activity.id}`)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
