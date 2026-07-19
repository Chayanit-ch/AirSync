import { CirclePlus, Map } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "../../hooks/useTranslation";

export function QuickActions() {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        to="/map"
        className="bg-brand-600 hover:bg-brand-700 flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white shadow-sm transition-colors"
      >
        <Map size={19} />
        {t("home.mapAction")}
      </Link>
      <Link
        to="/report"
        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
      >
        <CirclePlus size={19} />
        {t("home.reportAction")}
      </Link>
    </div>
  );
}
