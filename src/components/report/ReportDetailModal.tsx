import { History, MapPin, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Report, StatusHistoryEntry } from "../../types";
import { getReportTypeLabel, subscribeToStatusHistory, updateReportStatus } from "../../services/reports";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { formatLocalizedDate, formatLocalizedTime } from "../../utils/date";
import { StatusBadge } from "../shared/StatusBadge";

interface ReportDetailModalProps {
  /** `null` renders nothing — callers just always mount `<ReportDetailModal report={selectedReport} .../>` without a separate "is open" boolean. */
  report: Report | null;
  onClose: () => void;
}

const STATUS_OPTIONS: Report["status"][] = ["pending", "in_progress", "resolved"];

/**
 * Shared detail view for a single report — reused as-is by the Report page's
 * "My Reports" list, the Profile page's report history, and Home's Community
 * Monitoring table, since all three now read from the same `Report` shape
 * (see `services/reports.ts`). Renders whatever the caller already has in
 * state — never re-fetches the report itself. Status history and (for
 * authority/admin viewers) the status-change control are the exception:
 * those live-subscribe/write here because this is the one place every entry
 * point into a report's detail already funnels through.
 */
export function ReportDetailModal({ report, onClose }: ReportDetailModalProps) {
  const { t, language, dict } = useTranslation();
  const { currentUser, userProfile } = useAuth();
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

  const reportId = report?.id;
  useEffect(() => {
    if (!reportId) return;
    setStatusUpdateError(null);
    return subscribeToStatusHistory(reportId, setHistory);
  }, [reportId]);

  if (!report) return null;

  const canManageStatus = userProfile?.role === "authority" || userProfile?.role === "admin";

  async function handleStatusChange(nextStatus: Report["status"]) {
    if (!currentUser || !report || isUpdatingStatus || nextStatus === report.status) return;
    setIsUpdatingStatus(true);
    setStatusUpdateError(null);
    try {
      await updateReportStatus(report.id, nextStatus, currentUser.uid);
    } catch (error) {
      console.error("Failed to update report status", report.id, error);
      setStatusUpdateError(t("report.statusUpdateError"));
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  const createdAtDate = report.createdAt?.toDate?.() ?? new Date();
  const date = formatLocalizedDate(createdAtDate, language, dict.common.months);
  const time = formatLocalizedTime(createdAtDate, language);
  const title = getReportTypeLabel(report, dict.report.types);

  return (
    <div
      className="fixed inset-0 z-1000 flex items-end justify-center lg:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-detail-title"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl lg:rounded-2xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 id="report-detail-title" className="truncate text-lg font-bold text-gray-900">
              {title}
            </h2>
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

        {canManageStatus && (
          <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <label
              htmlFor="report-status-select"
              className="mb-1.5 block text-xs font-semibold text-gray-500"
            >
              {t("report.changeStatus")}
            </label>
            <select
              id="report-status-select"
              name="report-status"
              value={report.status}
              disabled={isUpdatingStatus}
              onChange={(e) => handleStatusChange(e.target.value as Report["status"])}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-brand-500 disabled:opacity-60"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {dict.report.status[status]}
                </option>
              ))}
            </select>
            {statusUpdateError && (
              <p className="mt-1.5 text-xs text-red-500">{statusUpdateError}</p>
            )}
          </div>
        )}

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

          {history.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs text-gray-400">
                <History size={13} className="shrink-0" />
                {t("report.statusHistoryTitle")}
              </p>
              <ul className="flex flex-col gap-2 border-l-2 border-gray-100 pl-3">
                {history.map((entry) => {
                  const entryDate = entry.updatedAt?.toDate?.() ?? new Date();
                  return (
                    <li key={entry.id} className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={entry.status} />
                        <span className="text-gray-400">
                          {formatLocalizedDate(entryDate, language, dict.common.months)} ·{" "}
                          {formatLocalizedTime(entryDate, language)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-gray-400">
                        {t("report.statusHistoryUpdatedByAuthority")}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
