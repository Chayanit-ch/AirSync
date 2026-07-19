import { TriangleAlert } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";

/**
 * Makes a failed `ensureUserDocument` call visible instead of a silent
 * `console.error` — see `profileCreationError` in AuthContext. Deliberately
 * simple: no auto-retry, no telemetry, just a visible banner + manual retry.
 */
export function ProfileSetupErrorBanner() {
  const { profileCreationError, retryProfileCreation } = useAuth();
  const { t } = useTranslation();

  if (!profileCreationError) return null;

  return (
    <div className="flex items-center justify-between gap-3 bg-red-600 px-4 py-2.5 text-sm text-white">
      <div className="flex min-w-0 items-center gap-2">
        <TriangleAlert size={18} className="shrink-0" />
        <p className="min-w-0">{t("profileSetupError.message")}</p>
      </div>
      <button
        type="button"
        onClick={retryProfileCreation}
        className="shrink-0 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors hover:bg-white/30"
      >
        {t("profileSetupError.retry")}
      </button>
    </div>
  );
}
