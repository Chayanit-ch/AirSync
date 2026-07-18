import { ReportForm } from "../components/report/ReportForm";
import { MyReportsSection } from "../components/report/MyReportsSection";
import { useMyReports } from "../hooks/useMyReports";

export function ReportPage() {
  const { reports, isLoading } = useMyReports();

  return (
    <div className="flex flex-col gap-5 p-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">รายงานมลพิษ</h1>
        <p className="mt-1 text-sm text-gray-500">
          ส่งรายงานเหตุการณ์เพื่อช่วยเราตรวจสอบคุณภาพอากาศในพื้นที่ของคุณ
        </p>
      </div>

      <ReportForm />

      <MyReportsSection reports={reports} isLoading={isLoading} />
    </div>
  );
}
