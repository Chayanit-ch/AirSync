import { useEffect, useState } from "react";
import { ReportForm } from "../components/report/ReportForm";
import { MyReportsSection } from "../components/report/MyReportsSection";
import { useAuth } from "../contexts/AuthContext";
import { subscribeToMyReports } from "../services/reports";
import type { Report } from "../types";

export function ReportPage() {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setReports([]);
      setReportsLoading(false);
      return;
    }

    setReportsLoading(true);
    const unsubscribe = subscribeToMyReports(
      currentUser.uid,
      (nextReports) => {
        setReports(nextReports);
        setReportsLoading(false);
      },
      () => setReportsLoading(false),
    );

    return unsubscribe;
  }, [currentUser]);

  return (
    <div className="flex flex-col gap-5 p-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">รายงานมลพิษ</h1>
        <p className="mt-1 text-sm text-gray-500">
          ส่งรายงานเหตุการณ์เพื่อช่วยเราตรวจสอบคุณภาพอากาศในพื้นที่ของคุณ
        </p>
      </div>

      <ReportForm />

      <MyReportsSection reports={reports} isLoading={reportsLoading} />
    </div>
  );
}
