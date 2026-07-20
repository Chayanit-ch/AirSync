import { useState } from "react";
import { ReportForm } from "../components/report/ReportForm";
import { MyReportsSection } from "../components/report/MyReportsSection";
import { ReportDetailModal } from "../components/report/ReportDetailModal";
import { useMyReports } from "../hooks/useMyReports";
import { useTranslation } from "../hooks/useTranslation";
import type { Report } from "../types";

export function ReportPage() {
  const { reports, isLoading } = useMyReports();
  const { t } = useTranslation();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  return (
    <div className="flex flex-col gap-5 p-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t("report.pageTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("report.pageSubtitle")}
        </p>
      </div>

      <ReportForm />

      <MyReportsSection reports={reports} isLoading={isLoading} onSelectReport={setSelectedReport} />

      <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  );
}
