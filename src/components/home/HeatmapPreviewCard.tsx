import { Maximize2 } from "lucide-react";
import { Link } from "react-router-dom";
import { monitoringStations } from "../../data/mockData";
import { AQI_SEVERITY_META } from "../../utils/aqi";

const BLOB_POSITIONS = [
  { top: "20%", left: "18%" },
  { top: "55%", left: "65%" },
  { top: "15%", left: "70%" },
  { top: "70%", left: "25%" },
  { top: "40%", left: "45%" },
  { top: "80%", left: "80%" },
];

export function HeatmapPreviewCard() {
  return (
    <Link
      to="/map"
      className="block rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-800">จุดเสี่ยงเกิดมลพิษ</h2>
        <Maximize2 size={18} className="text-gray-400" />
      </div>

      <div className="relative mt-3 h-32 overflow-hidden rounded-xl bg-slate-200">
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(#94a3b8_1px,transparent_1px),linear-gradient(90deg,#94a3b8_1px,transparent_1px)] [bg-size:16px_16px]" />
        {monitoringStations.map((station, i) => {
          const meta = AQI_SEVERITY_META[station.severity];
          const pos = BLOB_POSITIONS[i % BLOB_POSITIONS.length];
          return (
            <div
              key={station.id}
              className={`absolute h-14 w-14 rounded-full opacity-60 blur-xl ${meta.bgClass}`}
              style={{ top: pos.top, left: pos.left }}
            />
          );
        })}
      </div>
    </Link>
  );
}
