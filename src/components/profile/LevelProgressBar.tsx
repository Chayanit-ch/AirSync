interface LevelProgressBarProps {
  /** 0-99 — see `getProgressInCurrentLevel`. */
  progress: number;
  size?: "md" | "sm";
}

/** Shared bar so the full Profile-page version and the mini ProfileDropdown version never drift out of sync. */
export function LevelProgressBar({ progress, size = "md" }: LevelProgressBarProps) {
  const heightClass = size === "sm" ? "h-1.5" : "h-2.5";
  return (
    <div className={`w-full overflow-hidden rounded-full bg-gray-100 ${heightClass}`}>
      <div
        className="from-brand-500 h-full rounded-full bg-linear-to-r to-emerald-500 transition-all"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
