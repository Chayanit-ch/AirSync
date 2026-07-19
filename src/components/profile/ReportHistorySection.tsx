import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import type { Report } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";
import { ProfileReportItem } from "./ProfileReportItem";

function ReportItemSkeleton() {
  return <div className="h-20 animate-pulse rounded-xl bg-gray-100" />;
}

interface ReportHistorySectionProps {
  reports: Report[];
  isLoading: boolean;
}

export function ReportHistorySection({ reports, isLoading }: ReportHistorySectionProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">{t("report.history")}</h2>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <>
            <ReportItemSkeleton />
            <ReportItemSkeleton />
          </>
        ) : reports.length === 0 ? (
          <p className="py-2 text-center text-sm text-gray-400">
            {t("report.noReportsYet")}
          </p>
        ) : (
          reports.map((report) => <ProfileReportItem key={report.id} report={report} />)
        )}
      </div>

      <Link
        to="/report"
        className="bg-brand-600 hover:bg-brand-700 mt-3 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors"
      >
        <Plus size={18} />
        {t("report.createNew")}
      </Link>
    </div>
  );
}
