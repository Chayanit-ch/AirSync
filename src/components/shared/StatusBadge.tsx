import type { ReportStatus } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";

const STATUS_STYLES: Record<ReportStatus, string> = {
  under_review: "bg-orange-100 text-orange-600",
  pending: "bg-orange-100 text-orange-600",
  in_progress: "bg-blue-100 text-blue-600",
  resolved: "bg-emerald-100 text-emerald-600",
};

export function StatusBadge({ status }: { status: ReportStatus }) {
  const { dict } = useTranslation();

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[status]}`}
    >
      {dict.report.status[status]}
    </span>
  );
}
