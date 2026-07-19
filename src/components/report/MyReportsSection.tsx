import type { Report } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";
import { ReportHistoryCard } from "./ReportHistoryCard";

function ReportCardSkeleton() {
  return (
    <div className="h-32 animate-pulse rounded-2xl border border-gray-100 bg-gray-100" />
  );
}

interface MyReportsSectionProps {
  reports: Report[];
  isLoading: boolean;
}

export function MyReportsSection({ reports, isLoading }: MyReportsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">{t("report.myReports")}</h2>
      </div>
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <>
            <ReportCardSkeleton />
            <ReportCardSkeleton />
          </>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center text-sm text-gray-400 shadow-sm">
            {t("report.noReportsYetLong")}
          </div>
        ) : (
          reports.map((report) => (
            <ReportHistoryCard key={report.id} report={report} />
          ))
        )}
      </div>
    </div>
  );
}
