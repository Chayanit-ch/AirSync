import { X } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { OrganizationLeaderboardContent } from "./OrganizationLeaderboardContent";

interface OrganizationLeaderboardModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * A true fullscreen dialog (not the bottom-sheet-style `items-end` modals
 * used elsewhere in the app) so the Organization Leaderboard can be reached
 * from the Profile page without a route/URL change, now that its Bottom Nav
 * tab is gone. Wraps `OrganizationLeaderboardContent` unchanged — only the
 * wrapper differs from the standalone `/organizations` page.
 */
export function OrganizationLeaderboardModal({ open, onClose }: OrganizationLeaderboardModalProps) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-1000 flex flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="organization-leaderboard-modal-title"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 p-4">
        <h2 id="organization-leaderboard-modal-title" className="text-lg font-bold text-gray-900">
          {t("leaderboard.pageTitle")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-50"
        >
          <X size={22} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <OrganizationLeaderboardContent />
      </div>
    </div>
  );
}
