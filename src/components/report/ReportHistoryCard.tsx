import { Calendar, Clock } from "lucide-react";
import type { Report } from "../../types";
import { getReportTypeLabel } from "../../services/reports";
import { useTranslation } from "../../hooks/useTranslation";
import { formatLocalizedDate, formatLocalizedTime } from "../../utils/date";
import { StatusBadge } from "../shared/StatusBadge";

const STATUS_BORDER: Record<Report["status"], string> = {
  pending: "border-orange-400",
  in_progress: "border-blue-400",
  resolved: "border-emerald-400",
};

export function ReportHistoryCard({
  report,
  onClick,
}: {
  report: Report;
  onClick?: () => void;
}) {
  const { t, language, dict } = useTranslation();
  // `createdAt` reads back as null for a brief moment right after submit,
  // before Firestore resolves the serverTimestamp() — fall back to "now".
  const createdAtDate = report.createdAt?.toDate?.() ?? new Date();
  const date = formatLocalizedDate(createdAtDate, language, dict.common.months);
  const time = formatLocalizedTime(createdAtDate, language);
  const title = getReportTypeLabel(report, dict.report.types);
  const image = report.imageUrls[0];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full overflow-hidden rounded-2xl border border-l-4 border-gray-100 bg-white text-left shadow-sm ${STATUS_BORDER[report.status]}`}
    >
      {image && (
        <div className="relative h-32 w-full">
          <img src={image} alt={title} className="h-full w-full object-cover" />
          <div className="absolute top-2 right-2">
            <StatusBadge status={report.status} />
          </div>
        </div>
      )}
      <div className="p-3">
        {!image && (
          <div className="mb-1.5 flex justify-end">
            <StatusBadge status={report.status} />
          </div>
        )}
        <h3 className="font-bold text-gray-800">{title}</h3>
        <p className="mt-0.5 text-sm text-gray-500">{report.description}</p>
        <p className="mt-1 truncate text-xs text-gray-400">{report.locationLabel}</p>
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar size={13} />
            {date}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={13} />
            {t("report.timeSuffix", { time })}
          </span>
        </div>
      </div>
    </button>
  );
}
