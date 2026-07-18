import { MapPin } from "lucide-react";
import type { PollutionReport } from "../../types";
import { INCIDENT_TYPE_LABELS, REPORT_STATUS_LABELS } from "../../data/mockData";

const INCIDENT_TAG_STYLE: Record<PollutionReport["incidentType"], string> = {
  open_burning: "bg-orange-100 text-orange-700",
  black_smoke_vehicle: "bg-gray-200 text-gray-700",
  industrial_emissions: "bg-blue-100 text-blue-700",
  other: "bg-purple-100 text-purple-700",
};

const STATUS_DOT_STYLE: Record<PollutionReport["status"], string> = {
  under_review: "bg-orange-500",
  in_progress: "bg-gray-400",
  resolved: "bg-emerald-500",
};

const STATUS_TEXT_STYLE: Record<PollutionReport["status"], string> = {
  under_review: "text-orange-600",
  in_progress: "text-gray-500",
  resolved: "text-emerald-600",
};

function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ];
  const beYear = (d.getFullYear() + 543) % 100;
  return `${d.getDate()} ${months[d.getMonth()]} ${beYear}`;
}

export function ProfileReportItem({ report }: { report: PollutionReport }) {
  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${INCIDENT_TAG_STYLE[report.incidentType]}`}
        >
          {INCIDENT_TYPE_LABELS[report.incidentType]}
        </span>
        <span className="text-xs text-gray-400">
          {formatThaiDate(report.reportedDate)}
        </span>
      </div>
      <p className="mt-2 font-semibold text-gray-800">{report.title}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
        <MapPin size={12} />
        {report.location.address}
      </p>
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        <span
          className={`h-2 w-2 rounded-full ${STATUS_DOT_STYLE[report.status]}`}
        />
        <span className={`font-medium ${STATUS_TEXT_STYLE[report.status]}`}>
          {REPORT_STATUS_LABELS[report.status]}
        </span>
      </div>
    </div>
  );
}
