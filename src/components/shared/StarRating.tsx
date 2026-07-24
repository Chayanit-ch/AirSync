import { Star } from "lucide-react";

interface StarRatingProps {
  /** 0-5, can be fractional (e.g. an average) — only meaningful when `interactive` is false. */
  value: number;
  size?: number;
  /** Renders as a 1-5 click picker instead of a read-only display. */
  interactive?: boolean;
  onChange?: (rating: number) => void;
  disabled?: boolean;
  className?: string;
}

const STAR_INDEXES = [1, 2, 3, 4, 5];

/**
 * Read-only mode fills stars proportionally to `value` (supports fractional
 * averages, e.g. 3.4 renders the 4th star ~40% filled) via a clipped overlay.
 * Interactive mode is a plain 1-5 integer picker — used for both the
 * leaderboard/profile display and the rating submission modal.
 */
export function StarRating({
  value,
  size = 16,
  interactive = false,
  onChange,
  disabled = false,
  className,
}: StarRatingProps) {
  if (interactive) {
    return (
      <div className={`flex items-center gap-1 ${className ?? ""}`}>
        {STAR_INDEXES.map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            aria-pressed={value >= n}
            onClick={() => onChange?.(n)}
            className="disabled:opacity-40"
          >
            <Star
              size={size}
              className={value >= n ? "fill-amber-400 text-amber-400" : "text-gray-300"}
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-0.5 ${className ?? ""}`}>
      {STAR_INDEXES.map((n) => {
        const fillPercent = Math.max(0, Math.min(1, value - (n - 1))) * 100;
        return (
          <span key={n} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute top-0 left-0 text-gray-300" />
            <span
              className="absolute top-0 left-0 overflow-hidden"
              style={{ width: `${fillPercent}%` }}
            >
              <Star size={size} className="fill-amber-400 text-amber-400" />
            </span>
          </span>
        );
      })}
    </div>
  );
}
