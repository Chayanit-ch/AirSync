import { MapPin, X } from "lucide-react";
import type { Report } from "../../types";
import { getReportTypeLabel } from "../../services/reports";
import { useTranslation } from "../../hooks/useTranslation";
import { formatLocalizedDate, formatLocalizedTime } from "../../utils/date";
import { StatusBadge } from "../shared/StatusBadge";

interface ReportDetailModalProps {
  /** `null` renders nothing — callers just always mount `<ReportDetailModal report={selectedReport} .../>` without a separate "is open" boolean. */
  report: Report | null;
  onClose: () => void;
}

/**
 * Shared detail view for a single report — reused as-is by the Report page's
 * "My Reports" list, the Profile page's report history, and Home's Community
 * Monitoring table, since all three now read from the same `Report` shape
 * (see `services/reports.ts`). Renders whatever the caller already has in
 * state — never re-fetches.
 */
export function ReportDetailModal({ report, onClose }: ReportDetailModalProps) {
  const { t, language, dict } = useTranslation();

  if (!report) return null;

  const createdAtDate = report.createdAt?.toDate?.() ?? new Date();
  const date = formatLocalizedDate(createdAtDate, language, dict.common.months);
  const time = formatLocalizedTime(createdAtDate, language);
  const title = getReportTypeLabel(report, dict.report.types);

  return (
    <div
      className="fixed inset-0 z-1000 flex items-end justify-center lg:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl lg:rounded-2xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-gray-900">{title}</h2>
            <div className="mt-1">
              <StatusBadge status={report.status} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-50"
          >
            <X size={20} />
          </button>
        </div>

        {report.imageUrls.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs text-gray-400">{t("report.photos")}</p>
            <div className="grid grid-cols-3 gap-2">
              {report.imageUrls.map((url, i) => (
                <img
                  key={url}
                  src={url}
                  alt={t("report.attachedImageAlt", { index: i + 1 })}
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400">{t("report.description")}</p>
            <p className="text-gray-700">{report.description}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">{t("report.locationLabel")}</p>
            <p className="flex items-center gap-1 text-gray-700">
              <MapPin size={13} className="shrink-0 text-gray-400" />
              {report.locationLabel}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {t("report.coordinates")}: {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">{t("report.submittedOn")}</p>
            <p className="text-gray-700">
              {date} · {time}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
