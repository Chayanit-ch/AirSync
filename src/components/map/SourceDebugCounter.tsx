import { Bug } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import type { DataSource } from "../../types";

interface SourceDebugCounterProps {
  counts: Record<DataSource, number>;
  visible: boolean;
  onToggleVisible: () => void;
}

/**
 * Toggleable per-source station counter for the *current map viewport* —
 * lets anyone verify on the live app, with their own eyes and no DevTools,
 * which source (Air4Thai/WAQI/mock) is actually producing markers in a given
 * area. Added after a WAQI fix was verified via code/API calls alone and
 * then didn't match what a real user saw panning the live map to the same
 * spot — this counter is the thing to trust instead of a verbal claim.
 * Hidden by default so it doesn't clutter the map for ordinary users.
 */
export function SourceDebugCounter({ counts, visible, onToggleVisible }: SourceDebugCounterProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onToggleVisible}
        aria-pressed={visible}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-md ${
          visible ? "bg-gray-900 text-white" : "bg-white text-gray-500"
        }`}
      >
        <Bug size={13} />
        {visible ? t("map.debugToggleHide") : t("map.debugToggleShow")}
      </button>
      {visible && (
        <div className="rounded-xl bg-gray-900/90 px-3 py-2 font-mono text-[11px] text-white shadow-md">
          Air4Thai: {counts.air4thai} | WAQI: {counts.waqi} | Mock: {counts.mock}
        </div>
      )}
    </div>
  );
}
