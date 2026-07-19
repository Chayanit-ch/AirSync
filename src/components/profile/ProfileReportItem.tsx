import { MapPin } from "lucide-react";
import type { Report, ReportType } from "../../types";
import { getReportTypeLabel } from "../../services/reports";
import { useTranslation } from "../../hooks/useTranslation";
import { formatLocalizedDate } from "../../utils/date";

const INCIDENT_TAG_STYLE: Record<ReportType, string> = {
  burning: "bg-orange-100 text-orange-700",
  smoke_vehicle: "bg-gray-200 text-gray-700",
  factory: "bg-blue-100 text-blue-700",
  construction: "bg-amber-100 text-amber-700",
  garbage_burning: "bg-red-100 text-red-700",
  unknown_smell: "bg-purple-100 text-purple-700",
  other: "bg-slate-200 text-slate-700",
};

const STATUS_DOT_STYLE: Record<Report["status"], string> = {
  pending: "bg-orange-500",
  in_progress: "bg-gray-400",
  resolved: "bg-emerald-500",
};

const STATUS_TEXT_STYLE: Record<Report["status"], string> = {
  pending: "text-orange-600",
  in_progress: "text-gray-500",
  resolved: "text-emerald-600",
};

export function ProfileReportItem({ report }: { report: Report }) {
  const { language, dict } = useTranslation();
  // `createdAt` reads back as null for a brief moment right after submit,
  // before Firestore resolves the serverTimestamp() — fall back to "now".
  const createdAtDate = report.createdAt?.toDate?.() ?? new Date();
  const title = getReportTypeLabel(report, dict.report.types);

  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${INCIDENT_TAG_STYLE[report.type]}`}
        >
          {title}
        </span>
        <span className="text-xs text-gray-400">
          {formatLocalizedDate(createdAtDate, language, dict.common.months)}
        </span>
      </div>
      <p className="mt-2 font-semibold text-gray-800">{title}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
        <MapPin size={12} />
        {report.locationLabel}
      </p>
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT_STYLE[report.status]}`} />
        <span className={`font-medium ${STATUS_TEXT_STYLE[report.status]}`}>
          {dict.report.status[report.status]}
        </span>
      </div>
    </div>
  );
}
