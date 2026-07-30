import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { OrganizationDirectoryEntry, OrganizationRatingSummary } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { getLevelFromPoints } from "../../utils/gamification";
import { getMyRatingFor, submitRating } from "../../services/organizationRatings";
import { LevelAvatar } from "../profile/LevelAvatar";
import { StarRating } from "../shared/StarRating";

interface OrganizationRatingModalProps {
  /** `null` renders nothing — same "always mounted, gated by prop" pattern as `ReportDetailModal`. */
  organization: OrganizationDirectoryEntry | null;
  summary: OrganizationRatingSummary | undefined;
  onClose: () => void;
  /** Called after a successful submit so the caller can force-refresh this org's cached summary and re-sort the leaderboard. */
  onRated: (orgUid: string) => void;
}

export function OrganizationRatingModal({
  organization,
  summary,
  onClose,
  onRated,
}: OrganizationRatingModalProps) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [myRating, setMyRating] = useState<number | null>(null);
  const [draftRating, setDraftRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const orgUid = organization?.uid;
  useEffect(() => {
    setMyRating(null);
    setDraftRating(0);
    setError(null);
    setJustSubmitted(false);
    if (!orgUid || !currentUser) return;
    let cancelled = false;
    getMyRatingFor(orgUid).then((rating) => {
      if (cancelled) return;
      setMyRating(rating);
      setDraftRating(rating ?? 0);
    });
    return () => {
      cancelled = true;
    };
  }, [orgUid, currentUser]);

  if (!organization) return null;

  const isSelf = currentUser?.uid === organization.uid;
  const level = getLevelFromPoints(organization.points);

  async function handleSubmit() {
    if (!organization || !draftRating || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await submitRating(organization.uid, draftRating);
      setMyRating(draftRating);
      setJustSubmitted(true);
      onRated(organization.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("leaderboard.ratingFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-1000 flex items-end justify-center lg:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="organization-rating-title"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl lg:rounded-2xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <LevelAvatar
              photoURL={organization.photoURL}
              displayName={organization.displayName}
              size="sm"
              level={level}
              userType={organization.userType}
            />
            <h2 id="organization-rating-title" className="truncate text-lg font-bold text-gray-900">
              {organization.displayName}
            </h2>
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

        <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="mb-1 text-xs font-semibold text-gray-500">{t("leaderboard.averageRating")}</p>
          {summary && summary.count > 0 ? (
            <div className="flex items-center gap-2">
              <StarRating value={summary.average} size={18} />
              <span className="text-sm font-semibold text-gray-800">{summary.average.toFixed(1)}</span>
              <span className="text-xs text-gray-400">
                ({t("leaderboard.reviewerCount", { count: summary.count })})
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-400">{t("leaderboard.noRatingsYet")}</p>
          )}
        </div>

        {isSelf ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
            {t(
              organization.userType === "government"
                ? "leaderboard.cannotRateSelfGovernment"
                : "leaderboard.cannotRateSelf",
            )}
          </p>
        ) : !currentUser ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-sm text-gray-600">
              {t(
                organization.userType === "government"
                  ? "leaderboard.loginToRateGovernment"
                  : "leaderboard.loginToRate",
              )}
            </p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="bg-brand-600 hover:bg-brand-700 rounded-xl px-4 py-2 text-sm font-semibold text-white"
            >
              {t("common.login")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-100 p-3">
            <p className="text-sm font-semibold text-gray-700">
              {myRating
                ? t("leaderboard.yourRating")
                : t(
                    organization.userType === "government"
                      ? "leaderboard.rateThisGovernment"
                      : "leaderboard.rateThisOrganization",
                  )}
            </p>
            <StarRating value={draftRating} size={28} interactive onChange={setDraftRating} disabled={isSubmitting} />
            {error && <p className="text-xs font-medium text-red-500">{error}</p>}
            {justSubmitted && !error && (
              <p className="text-xs font-medium text-emerald-600">{t("leaderboard.ratingSubmitted")}</p>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!draftRating || isSubmitting}
              className="bg-brand-600 hover:bg-brand-700 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? t("profile.saving") : t("leaderboard.submitRating")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
