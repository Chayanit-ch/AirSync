import type { OrganizationDirectoryEntry, OrganizationRatingSummary } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";
import { getLevelFromPoints } from "../../utils/gamification";
import { CharacterAvatar } from "../profile/CharacterAvatar";
import { LevelAvatar } from "../profile/LevelAvatar";
import { StarRating } from "../shared/StarRating";

interface OrganizationLeaderboardRowProps {
  rank: number;
  organization: OrganizationDirectoryEntry;
  summary: OrganizationRatingSummary;
  onSelect: () => void;
}

export function OrganizationLeaderboardRow({
  rank,
  organization,
  summary,
  onSelect,
}: OrganizationLeaderboardRowProps) {
  const { t } = useTranslation();
  const level = getLevelFromPoints(organization.points);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-sm transition-colors hover:bg-gray-50"
    >
      <span className="w-6 shrink-0 text-center text-sm font-bold text-gray-400">{rank}</span>
      <LevelAvatar
        photoURL={organization.photoURL}
        displayName={organization.displayName}
        size="sm"
        level={level}
        userType={organization.userType}
      />
      {/*
        Alongside the real-identity avatar above, never replacing it — small
        and unanimated so a whole list of these stays calm. `avatarConfig`
        isn't mirrored into `organizationProfiles` (would need denormalizing
        every viewer's own customization into the public directory doc,
        out of scope here) — `undefined` renders the theme-correct default
        character rather than nothing.
      */}
      <CharacterAvatar
        avatarConfig={undefined}
        userType={organization.userType}
        level={level}
        size={40}
        animate={false}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{organization.displayName}</p>
        {summary.count > 0 ? (
          <div className="mt-0.5 flex items-center gap-1.5">
            <StarRating value={summary.average} size={14} />
            <span className="text-xs font-medium text-gray-500">{summary.average.toFixed(1)}</span>
            <span className="text-xs text-gray-400">
              ({t("leaderboard.reviewerCount", { count: summary.count })})
            </span>
          </div>
        ) : (
          <p className="mt-0.5 text-xs text-gray-400">{t("leaderboard.noRatingsYet")}</p>
        )}
      </div>
    </button>
  );
}
