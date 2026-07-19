import type { PollutionReport } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";
import { StatusBadge } from "../shared/StatusBadge";

export function CommunityTable({ reports }: { reports: PollutionReport[] }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <h2 className="px-4 pt-4 font-bold text-gray-800">
        {t("home.communityMonitoring")}
      </h2>
      <table className="mt-2 w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-gray-400">
            <th className="px-4 py-2 font-medium">{t("common.location")}</th>
            <th className="px-2 py-2 font-medium">{t("home.issueFound")}</th>
            <th className="px-4 py-2 text-right font-medium">{t("common.status")}</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id} className="border-t border-gray-50">
              <td className="px-4 py-3 font-medium text-gray-700">
                {report.location.address}
              </td>
              <td className="px-2 py-3 text-gray-500">{report.title}</td>
              <td className="px-4 py-3 text-right">
                <StatusBadge status={report.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
