import { ReportForm } from "../components/report/ReportForm";
import { MyReportsSection } from "../components/report/MyReportsSection";
import { useMyReports } from "../hooks/useMyReports";
import { useTranslation } from "../hooks/useTranslation";

export function ReportPage() {
  const { reports, isLoading } = useMyReports();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-5 p-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t("report.pageTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("report.pageSubtitle")}
        </p>
      </div>

      <ReportForm />

      <MyReportsSection reports={reports} isLoading={isLoading} />
    </div>
  );
}
