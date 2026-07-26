import { CirclePlus, Map, Trophy } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../../hooks/useTranslation";
import { OrganizationLeaderboardModal } from "../organizations/OrganizationLeaderboardModal";

export function QuickActions() {
  const { t } = useTranslation();
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/map"
          data-tour-id="onboarding-map-action"
          className="bg-brand-600 hover:bg-brand-700 flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white shadow-sm transition-colors"
        >
          <Map size={19} />
          {t("home.mapAction")}
        </Link>
        <Link
          to="/report"
          data-tour-id="onboarding-report-action"
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          <CirclePlus size={19} />
          {t("home.reportAction")}
        </Link>
      </div>
      <button
        type="button"
        onClick={() => setIsLeaderboardOpen(true)}
        className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 font-semibold text-white shadow-sm transition-colors hover:bg-amber-600"
      >
        <Trophy size={19} />
        {t("leaderboard.viewButton")}
      </button>

      <OrganizationLeaderboardModal open={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />
    </div>
  );
}
