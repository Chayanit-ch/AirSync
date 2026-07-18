import { ArrowRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import type { PollutionReport } from "../../types";
import { ProfileReportItem } from "./ProfileReportItem";

export function ReportHistorySection({
  reports,
}: {
  reports: PollutionReport[];
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">ประวัติการรายงาน</h2>
        <button
          type="button"
          className="text-brand-600 flex items-center gap-1 text-sm font-medium"
        >
          ดูทั้งหมด
          <ArrowRight size={15} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {reports.map((report) => (
          <ProfileReportItem key={report.id} report={report} />
        ))}
      </div>

      <Link
        to="/report"
        className="bg-brand-600 hover:bg-brand-700 mt-3 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors"
      >
        <Plus size={18} />
        สร้างรายการใหม่
      </Link>
    </div>
  );
}
