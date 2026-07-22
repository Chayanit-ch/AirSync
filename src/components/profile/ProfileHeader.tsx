import { BadgeCheck, Pencil } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { getGuardianLevel, pointsToNextLevel } from "../../utils/gamification";
import type { UserRole } from "../../types";
import { LevelAvatar } from "./LevelAvatar";

interface ProfileHeaderProps {
  displayName: string;
  email: string;
  photoURL?: string | null;
  points: number;
  role: UserRole;
  onLogout: () => void;
}

export function ProfileHeader({
  displayName,
  email,
  photoURL,
  points,
  role,
  onLogout,
}: ProfileHeaderProps) {
  const { t } = useTranslation();
  const isOrg = role === "authority" || role === "admin";
  const level = getGuardianLevel(points);
  const remaining = pointsToNextLevel(points);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm">
      <div className="relative mx-auto w-fit">
        <LevelAvatar photoURL={photoURL} displayName={displayName} size="lg" level={level} role={role} />
        <button
          type="button"
          disabled
          title={t("profile.editPhotoComingSoon")}
          aria-label={t("profile.editPhoto")}
          className="bg-brand-600 absolute -top-1 -right-1 rounded-full p-1.5 text-white shadow disabled:opacity-40"
        >
          <Pencil size={13} />
        </button>
      </div>

      <h2 className="mt-3 text-xl font-bold text-gray-900">{displayName}</h2>
      <p className="text-sm text-gray-400">{email}</p>

      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
        <span className="bg-brand-600 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white">
          <BadgeCheck size={14} />
          {isOrg ? t("profile.airProtectionOrg") : t("profile.guardianLevel", { level })}
        </span>
      </div>

      {!isOrg && (
        <>
          <div className="mt-3 grid grid-cols-2 divide-x divide-gray-100 rounded-xl border border-gray-100 bg-gray-50 py-2.5">
            <div className="text-center">
              <p className="text-xs text-gray-400">{t("profile.currentLevel")}</p>
              <p className="text-lg font-bold text-gray-800">{level}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">{t("profile.totalPoints")}</p>
              <p className="text-lg font-bold text-gray-800">{points}</p>
            </div>
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            {t("profile.pointsToNextLevel", { points: remaining })}
          </p>
        </>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled
          title={t("profile.accountSettingsComingSoon")}
          className="bg-brand-600 hover:bg-brand-700 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("profile.accountSettings")}
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          {t("common.logout")}
        </button>
      </div>
    </div>
  );
}
