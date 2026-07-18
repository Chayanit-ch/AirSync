import { Clock, ShieldCheck } from "lucide-react";
import type { MonitoringStation } from "../../types";
import { AQI_SEVERITY_META } from "../../utils/aqi";

function timeAgoTh(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
  return `${hours} ชั่วโมงที่แล้ว`;
}

export function StationBottomSheet({
  station,
}: {
  station: MonitoringStation;
}) {
  const meta = AQI_SEVERITY_META[station.severity];

  return (
    <div className="rounded-t-2xl border border-gray-100 bg-white px-4 pt-2 pb-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-gray-200" />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-bold text-gray-800">
            {station.name}
          </h3>
          <p className="truncate text-xs text-gray-400">{station.address}</p>
        </div>
        <span
          className={`flex shrink-0 items-center justify-center rounded-full p-1.5 ${meta.softBgClass}`}
        >
          <ShieldCheck size={16} className={meta.textClass} />
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className={`rounded-xl border-l-4 p-3 ${meta.softBgClass} ${meta.borderClass}`}>
          <p className="text-xs text-gray-500">PM 2.5</p>
          <p className={`text-lg font-bold ${meta.textClass}`}>
            {station.currentPm25.toFixed(1)} µg/m³
          </p>
        </div>
        <div className="rounded-xl bg-gray-100 p-3">
          <p className="text-xs text-gray-500">อุณหภูมิ</p>
          <p className="text-lg font-bold text-gray-700">
            {station.temperature != null ? `${station.temperature} องศา` : "ไม่มีข้อมูล"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-sm text-brand-600">
        <Clock size={15} />
        <span>อัปเดตล่าสุด {timeAgoTh(station.lastUpdated)}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          className="border-brand-600 text-brand-600 rounded-xl border py-2.5 text-sm font-semibold"
        >
          รายละเอียดเพิ่มเติม
        </button>
        <button
          type="button"
          className="bg-brand-600 rounded-xl py-2.5 text-sm font-semibold text-white"
        >
          ดูพยากรณ์ล่วงหน้า
        </button>
      </div>
    </div>
  );
}
